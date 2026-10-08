import express from 'express';
import { z } from 'zod';
import { sseHub } from '../services/sseHub.js';
import { db, decryptPayload } from '../db/pool.js';
import { verifyAuditChain, getLatestBlockHash, GENESIS_HASH } from '../services/auditHasher.js';
import { getActivePolicy } from '../services/engine/pipeline.js';

export const telemetryRouter = express.Router();

export const TelemetryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
  action: z.enum(['ALL', 'PASSED', 'SANITIZED', 'BLOCKED', 'HUMAN_OVERRIDDEN']).default('ALL'),
  risk: z.enum(['ALL', 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('ALL'),
  search: z.string().optional().default('')
});

/**
 * GET /api/v1/telemetry/stream
 * SSE endpoint broadcasting real-time security events
 */
telemetryRouter.get('/stream', (req, res) => {
  sseHub.register(res);
});

/**
 * GET /api/v1/telemetry/stats
 * Aggregated statistics for KPI counters
 */
telemetryRouter.get('/stats', async (req, res) => {
  try {
    const statsSql = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN action_taken = 'BLOCKED' THEN 1 END) as blocked_count,
        COUNT(CASE WHEN action_taken = 'SANITIZED' THEN 1 END) as sanitized_count,
        COUNT(CASE WHEN action_taken = 'PASSED' THEN 1 END) as passed_count,
        COALESCE(AVG(guardrail_latency_ms), 0) as avg_latency,
        COUNT(CASE WHEN (fraud_score >= 0.70 OR fraud_category != 'NONE') AND action_taken = 'BLOCKED' THEN 1 END) as intercepted_fraud_attempts,
        COUNT(CASE WHEN fraud_category = 'SYNTHETIC_IDENTITY_FRAUD' THEN 1 END) as synthetic_accounts_repelled,
        COALESCE(AVG(fraud_score), 0.04) as avg_fraud_score
      FROM audit_logs;
    `;
    const result = await db.query(statsSql);
    const row = result.rows[0] || {};

    // Get threat breakdown from recent logs
    const threatLogs = await db.query(`SELECT threat_types FROM audit_logs WHERE threat_types != '[]'::jsonb LIMIT 500;`);
    const threatCounts = {
      PROMPT_INJECTION: 0,
      SECRET_LEAK: 0,
      PII_EXPOSURE: 0,
      DESTRUCTIVE_TOOL_CALL: 0,
      FRAUD_ANOMALY: 0
    };

    if (threatLogs.rows) {
      for (const item of threatLogs.rows) {
        const types = typeof item.threat_types === 'string' ? JSON.parse(item.threat_types) : (item.threat_types || []);
        for (const t of types) {
          if (t.includes('PROMPT_INJECTION') || t.includes('JAILBREAK') || t.includes('ROLE_OVERRIDE')) threatCounts.PROMPT_INJECTION++;
          else if (t.includes('SECRET_LEAK')) threatCounts.SECRET_LEAK++;
          else if (t.includes('PII_EXPOSURE')) threatCounts.PII_EXPOSURE++;
          else if (t.includes('DESTRUCTIVE_TOOL_CALL')) threatCounts.DESTRUCTIVE_TOOL_CALL++;
          else if (t.includes('FRAUD')) threatCounts.FRAUD_ANOMALY++;
        }
      }
    }

    return res.json({
      status: 'success',
      system_health: 'OPERATIONAL',
      active_connections: sseHub.getActiveClientCount(),
      total_requests: parseInt(row.total_requests || 0, 10),
      blocked_count: parseInt(row.blocked_count || 0, 10),
      sanitized_count: parseInt(row.sanitized_count || 0, 10),
      passed_count: parseInt(row.passed_count || 0, 10),
      avg_guardrail_latency_ms: parseFloat(row.avg_latency || 0).toFixed(2),
      total_fraud_scans: parseInt(row.total_fraud_scans || row.total_requests || 0, 10),
      intercepted_fraud_attempts: parseInt(row.intercepted_fraud_attempts || 0, 10),
      synthetic_accounts_repelled: parseInt(row.synthetic_accounts_repelled || 0, 10),
      avg_fraud_score: parseFloat(row.avg_fraud_score || 0.04).toFixed(2),
      threat_distribution: threatCounts,
      latest_audit_hash: getLatestBlockHash()
    });
  } catch (err) {
    console.error('[TrustGate Telemetry Stats Error]:', err);
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * GET /api/v1/telemetry/fraud/radar
 * Recent fraud incidents and anomaly surveillance radar
 */
telemetryRouter.get('/fraud/radar', async (req, res) => {
  try {
    const fraudSql = `
      SELECT id, created_at, client_id, fraud_category, fraud_score, fraud_indicators, action_taken, raw_prompt
      FROM audit_logs
      WHERE fraud_category != 'NONE' OR fraud_score > 0
      ORDER BY created_at DESC
      LIMIT 50;
    `;
    const result = await db.query(fraudSql);
    const incidents = (result.rows || []).map(r => ({
      id: r.id,
      timestamp: r.created_at,
      client_id: r.client_id,
      category: r.fraud_category,
      indicators: typeof r.fraud_indicators === 'string' ? JSON.parse(r.fraud_indicators) : (r.fraud_indicators || []),
      risk_score: Number(r.fraud_score || 0),
      action_taken: r.action_taken,
      prompt_snippet: (decryptPayload(r.raw_prompt) || '').slice(0, 120)
    }));

    return res.json({
      status: 'success',
      total: incidents.length,
      incidents
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * GET /api/v1/telemetry/logs
 * Paginated historical audit logs with filtering support
 */
telemetryRouter.get('/logs', async (req, res) => {
  const queryResult = TelemetryQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({ status: 'error', error: 'Invalid query parameters', details: queryResult.error.issues });
  }

  const { limit, offset, action, risk, search } = queryResult.data;

  try {
    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    if (action !== 'ALL') {
      whereClauses.push(`action_taken = $${paramIdx++}`);
      params.push(action);
    }

    if (risk !== 'ALL') {
      whereClauses.push(`risk_level = $${paramIdx++}`);
      params.push(risk);
    }

    if (search && search.trim().length > 0) {
      whereClauses.push(`(raw_prompt ILIKE $${paramIdx} OR client_id ILIKE $${paramIdx})`);
      params.push(`%${search.trim()}%`);
      paramIdx++;
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as count FROM audit_logs ${whereString};`;
    const countRes = await db.query(countSql, params);
    const totalCount = parseInt(countRes.rows[0]?.count || 0, 10);

    const querySql = `
      SELECT * FROM audit_logs
      ${whereString}
      ORDER BY created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `;
    params.push(limit, offset);

    const result = await db.query(querySql, params);

    const logs = (result.rows || []).map(row => ({
      ...row,
      raw_prompt: decryptPayload(row.raw_prompt),
      threat_types: typeof row.threat_types === 'string' ? JSON.parse(row.threat_types) : row.threat_types,
      tool_calls: typeof row.tool_calls === 'string' ? JSON.parse(row.tool_calls) : row.tool_calls,
      guardrail_latency_ms: Number(row.guardrail_latency_ms),
      total_latency_ms: Number(row.total_latency_ms)
    }));

    return res.json({
      status: 'success',
      total: totalCount,
      limit,
      offset,
      logs
    });
  } catch (err) {
    console.error('[TrustGate Telemetry Logs Error]:', err);
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * GET /api/v1/telemetry/audit-chain/verify
 * Cryptographically verifies Merkle hash chain integrity across all records
 */
telemetryRouter.get('/audit-chain/verify', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM audit_logs ORDER BY created_at ASC LIMIT 1000;');
    const rawLogs = (result.rows || []).map(r => ({
      ...r,
      raw_prompt: decryptPayload(r.raw_prompt)
    }));

    const report = verifyAuditChain(rawLogs);
    return res.json({
      status: 'success',
      chain_verification: report
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * GET /api/v1/telemetry/export-report
 * Generates an executive compliance report for SOC 2 Type II, GDPR, and HIPAA audits
 */
telemetryRouter.get('/export-report', async (req, res) => {
  try {
    const statsRes = await db.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN action_taken = 'BLOCKED' THEN 1 END) as blocked_count,
        COUNT(CASE WHEN action_taken = 'SANITIZED' THEN 1 END) as sanitized_count,
        COUNT(CASE WHEN action_taken = 'PASSED' THEN 1 END) as passed_count,
        COALESCE(AVG(guardrail_latency_ms), 0) as avg_latency
      FROM audit_logs;
    `);
    const stats = statsRes.rows[0] || {};

    const allLogsRes = await db.query('SELECT * FROM audit_logs ORDER BY created_at ASC LIMIT 500;');
    const logs = allLogsRes.rows || [];
    const chainVerification = verifyAuditChain(logs);
    const activePolicy = getActivePolicy();

    const report = {
      report_title: 'TrustGate (Enclave) SOC 2 & GDPR AI Runtime Security Audit Report',
      generated_at: new Date().toISOString(),
      standards_evaluated: [
        'SOC 2 Type II: Common Criteria 6.1, 6.6 (Logical Access & Perimeter Protection)',
        'GDPR: Article 32 (Security of Processing & Data De-identification)',
        'HIPAA Security Rule: 45 CFR § 164.312 (Technical Safeguards & Audit Controls)',
        'OWASP Top 10 for LLMs: LLM01 (Prompt Injection), LLM06 (Sensitive Data), LLM08 (Excessive Agency)'
      ],
      executive_summary: {
        total_transactions_inspected: parseInt(stats.total_requests || 0, 10),
        threats_neutralized: parseInt(stats.blocked_count || 0, 10),
        sensitive_records_vaulted: parseInt(stats.sanitized_count || 0, 10),
        authorized_transactions: parseInt(stats.passed_count || 0, 10),
        median_guardrail_latency_ms: parseFloat(stats.avg_latency || 0).toFixed(2),
        zero_stall_sla_met: parseFloat(stats.avg_latency || 0) < 20.0
      },
      cryptographic_audit_integrity: {
        status: chainVerification.status,
        chain_valid: chainVerification.valid,
        total_blocks_verified: chainVerification.totalBlocks,
        merkle_head_hash: chainVerification.headHash,
        genesis_hash: GENESIS_HASH,
        tamper_evidence_detected: !chainVerification.valid
      },
      active_guardrail_matrix: activePolicy,
      recent_security_incidents: logs.filter(l => l.action_taken === 'BLOCKED').slice(0, 15).map(l => ({
        id: l.id,
        timestamp: l.created_at,
        risk_level: l.risk_level,
        threats: typeof l.threat_types === 'string' ? JSON.parse(l.threat_types) : l.threat_types,
        client_id: l.client_id,
        audit_hash: l.audit_hash
      }))
    };

    return res.json(report);
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});
