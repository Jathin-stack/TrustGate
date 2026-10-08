import express from 'express';
import { z } from 'zod';
import { executeInspectionPipeline } from '../services/engine/pipeline.js';
import { hitlManager } from '../services/hitlManager.js';
import { config } from '../config.js';
import { supabase } from '../../supabaseClient.js';
import crypto from 'crypto';

// In-memory pointer for the previous hash in the Merkle chain
let lastBlockHash = '0000000000000000000000000000000000000000000000000000000000000000';

export async function logTransactionToSupabase({
  clientId,
  actionTaken,
  riskLevel,
  threats,
  rawPrompt,
  sanitizedPrompt,
  latencyMs
}) {
  // Generate incremental SHA-256 block hash
  const timestamp = new Date().toISOString();
  const blockPayload = `${lastBlockHash}|${clientId}|${timestamp}|${actionTaken}|${sanitizedPrompt}`;
  const currentBlockHash = crypto.createHash('sha256').update(blockPayload).digest('hex');

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([
        {
          client_id: clientId || 'default_agent',
          action_taken: actionTaken,
          risk_level: riskLevel,
          threat_types: threats,
          raw_prompt: rawPrompt,
          sanitized_prompt: sanitizedPrompt,
          guardrail_latency_ms: latencyMs,
          audit_hash: currentBlockHash,
          prev_audit_hash: lastBlockHash,
          created_at: timestamp
        }
      ])
      .select();

  if (error) {
    console.error('Failed to log to Supabase:', error.message);
  } else {
    lastBlockHash = currentBlockHash; // Advance chain pointer
  }

  return data;
  } catch (err) {
    console.error('Supabase log error:', err.message);
    return null;
  }
}

export const gatewayRouter = express.Router();

export const GatewayChatRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty').max(32000, 'Prompt exceeds maximum length'),
  client_id: z.string().default('client_default'),
  session_id: z.string().optional(),
  tool_calls: z.array(z.object({
    name: z.string(),
    parameters: z.record(z.any()).optional().default({})
  })).optional().default([]),
  mock_upstream: z.boolean().optional().default(false),
  two_way_cloaking: z.boolean().optional().default(true),
  require_hitl: z.boolean().optional().default(false),
  stream: z.boolean().optional().default(false)
});

// In-Memory Token Bucket Rate Limiter
const rateLimitBuckets = new Map();
const RATE_LIMIT_CAPACITY = config.DEFAULT_CLIENT_RATE_LIMIT || 100;
const REFILL_INTERVAL_MS = 60000;

function checkRateLimit(clientId) {
  const now = Date.now();
  let bucket = rateLimitBuckets.get(clientId);

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_CAPACITY, lastRefill: now };
    rateLimitBuckets.set(clientId, bucket);
  } else {
    const elapsed = now - bucket.lastRefill;
    if (elapsed > REFILL_INTERVAL_MS) {
      bucket.tokens = RATE_LIMIT_CAPACITY;
      bucket.lastRefill = now;
    }
  }

  if (bucket.tokens <= 0) {
    return false;
  }

  bucket.tokens -= 1;
  return true;
}

/**
 * POST /api/v1/gateway/chat or /api/v1/gateway/inspect
 * Primary zero-trust reverse proxy ingestion endpoint.
 */
gatewayRouter.post(['/chat', '/inspect'], async (req, res) => {
  const parseResult = GatewayChatRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid request payload',
      details: parseResult.error.issues
    });
  }

  const { prompt, client_id, session_id, tool_calls, mock_upstream, two_way_cloaking, require_hitl } = parseResult.data;

  // Rate Limiting Check
  if (!checkRateLimit(client_id)) {
    return res.status(429).json({
      status: 'rate_limited',
      error: 'Too Many Requests',
      message: `Rate limit of ${RATE_LIMIT_CAPACITY} req/min exceeded for client '${client_id}'.`
    });
  }

  try {
    const result = await executeInspectionPipeline({
      prompt,
      client_id,
      session_id,
      tool_calls,
      mock_upstream,
      two_way_cloaking,
      require_hitl
    });

    // Write Audit Logs Directly to Supabase in the Backend (Step 4)
    logTransactionToSupabase({
      clientId: client_id,
      actionTaken: result.httpCode === 403 ? 'BLOCKED' : (result.status === 'SANITIZED' ? 'SANITIZED' : 'PASSED'),
      riskLevel: result.risk_level || 'LOW',
      threats: result.threats || [],
      rawPrompt: prompt,
      sanitizedPrompt: result.sanitized || prompt,
      latencyMs: result.telemetry?.guardrail_latency_ms || 0.22
    }).catch(err => console.error('[Supabase Audit Log Error]:', err.message));

    if (result.httpCode === 403) {
      return res.status(403).json({
        status: result.status,
        reason: result.reason,
        threats: result.threats,
        risk_level: result.risk_level,
        fraud: result.fraud,
        telemetry: result.telemetry
      });
    }

    return res.status(200).json({
      status: result.status,
      sanitized: result.sanitized,
      two_way_cloaked: result.two_way_cloaked,
      response: result.response,
      model_raw_response: result.model_raw_response,
      tool_calls: result.tool_calls,
      fraud: result.fraud,
      telemetry: result.telemetry
    });
  } catch (err) {
    console.error('[TrustGate Gateway Error]:', err);
    return res.status(500).json({
      status: 'error',
      error: 'Internal Gateway Security Error',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/gateway/approve
 * Human-in-the-Loop decision submission
 */
gatewayRouter.post('/approve', (req, res) => {
  const { approval_id, decision, decided_by } = req.body;
  if (!approval_id || !['APPROVE', 'REJECT'].includes(decision)) {
    return res.status(400).json({ status: 'error', message: 'approval_id and decision ("APPROVE"|"REJECT") required.' });
  }

  const success = hitlManager.resolveApproval(approval_id, decision, decided_by || 'Dashboard Operator');
  if (!success) {
    return res.status(404).json({ status: 'error', message: 'Approval request not found or already resolved/expired.' });
  }

  return res.json({ status: 'success', message: `Approval ${decision} recorded for request ${approval_id}.` });
});

/**
 * GET /api/v1/gateway/pending-approvals
 * Lists any current pending approvals
 */
gatewayRouter.get('/pending-approvals', (req, res) => {
  return res.json({ status: 'success', pending: hitlManager.getPendingList() });
});
