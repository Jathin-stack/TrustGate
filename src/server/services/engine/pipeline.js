import { performance } from 'perf_hooks';
import { db, encryptPayload } from '../../db/pool.js';
import { scanAndScrubSecrets } from './secretScanner.js';
import { scanAndScrubPII } from './piiSanitizer.js';
import { evaluatePromptSecurity } from './injectionGuard.js';
import { inspectToolCalls } from './toolFirewall.js';
import { evaluateFraudRisk } from './fraudDetector.js';
import { forwardToUpstreamModel } from '../gemini.js';
import { sseHub } from '../sseHub.js';
import { sessionVault } from '../sessionVault.js';
import { hitlManager } from '../hitlManager.js';

// In-memory cached active policy
let cachedPolicy = {
  id: 'default',
  pii_redaction_enabled: true,
  secret_scanner_enabled: true,
  injection_guard_enabled: true,
  tool_firewall_enabled: true,
  fraud_detection_enabled: true,
  fraud_risk_threshold: 0.70,
  two_way_cloaking_enabled: true,
  hitl_approval_enabled: false,
  injection_confidence_threshold: 0.75,
  blocked_sql_keywords: ['DROP', 'TRUNCATE', 'DELETE', 'ALTER'],
  blocked_shell_commands: ['rm', 'sh', 'bash', 'curl', 'wget', 'nc']
};

/**
 * Loads or refreshes the policy from the database
 */
export async function refreshPolicyCache() {
  try {
    const res = await db.query('SELECT * FROM security_policies WHERE id = $1 LIMIT 1', ['default']);
    if (res.rows && res.rows[0]) {
      const row = res.rows[0];
      cachedPolicy = {
        id: row.id,
        pii_redaction_enabled: Boolean(row.pii_redaction_enabled),
        secret_scanner_enabled: Boolean(row.secret_scanner_enabled),
        injection_guard_enabled: Boolean(row.injection_guard_enabled),
        tool_firewall_enabled: Boolean(row.tool_firewall_enabled),
        fraud_detection_enabled: row.fraud_detection_enabled !== undefined ? Boolean(row.fraud_detection_enabled) : true,
        fraud_risk_threshold: row.fraud_risk_threshold !== undefined ? Number(row.fraud_risk_threshold) : 0.70,
        two_way_cloaking_enabled: row.two_way_cloaking_enabled !== undefined ? Boolean(row.two_way_cloaking_enabled) : true,
        hitl_approval_enabled: Boolean(row.hitl_approval_enabled),
        injection_confidence_threshold: Number(row.injection_confidence_threshold) || 0.75,
        blocked_sql_keywords: typeof row.blocked_sql_keywords === 'string' 
          ? JSON.parse(row.blocked_sql_keywords) 
          : (row.blocked_sql_keywords || ['DROP', 'TRUNCATE', 'DELETE', 'ALTER']),
        blocked_shell_commands: typeof row.blocked_shell_commands === 'string'
          ? JSON.parse(row.blocked_shell_commands)
          : (row.blocked_shell_commands || ['rm', 'sh', 'bash', 'curl', 'wget', 'nc'])
      };
    }
  } catch (err) {
    console.warn('[TrustGate Pipeline] Policy refresh warning:', err.message);
  }
  return cachedPolicy;
}

export function getActivePolicy() {
  return cachedPolicy;
}

export function setCachedPolicy(newPolicy) {
  cachedPolicy = { ...cachedPolicy, ...newPolicy };
}

/**
 * Core Zero-Trust Runtime Inspection Pipeline
 * Synchronously executes tiered inspection, two-way reversible PII vaulting,
 * deterministic tool sandboxing, HITL approvals, and audit chaining.
 */
export async function executeInspectionPipeline({
  prompt,
  client_id = 'client_default',
  session_id = null,
  tool_calls = [],
  mock_upstream = false,
  two_way_cloaking = true,
  require_hitl = false
}) {
  const pipelineStart = performance.now();
  const effectiveSessionId = session_id || `sess_${client_id}_${Date.now()}`;
  const rawPrompt = prompt;
  let sanitizedPrompt = prompt;

  const threatsDetected = [];
  let riskLevel = 'INFO';
  let isBlocked = false;
  let blockReason = '';
  let wasSanitized = false;
  let humanOverridden = false;

  const pipelineSteps = [];
  const activeTokenMap = {};

  // Step 1: Layer 1 - Sub-2ms Secret Detection & Entropy Scanning
  let secretLatency = 0;
  if (cachedPolicy.secret_scanner_enabled) {
    const secretResult = scanAndScrubSecrets(sanitizedPrompt);
    secretLatency = secretResult.latencyMs;
    sanitizedPrompt = secretResult.sanitizedText;

    if (secretResult.detected) {
      wasSanitized = true;
      Object.assign(activeTokenMap, secretResult.tokenMap);
      for (const s of secretResult.secretsFound) {
        threatsDetected.push(`SECRET_LEAK:${s.type}`);
      }
      riskLevel = 'HIGH';
    }

    pipelineSteps.push({
      step: 'SECRET_SCANNER',
      tier: 'Layer 1: Deterministic (< 2ms)',
      status: secretResult.detected ? 'SANITIZED' : 'PASSED',
      latencyMs: secretLatency,
      details: secretResult.detected ? `${secretResult.secretsFound.length} secrets cloaked` : 'Clean'
    });
  }

  // Step 2: Layer 1 - PII Cloaking Engine & Luhn Card Validation
  let piiLatency = 0;
  if (cachedPolicy.pii_redaction_enabled) {
    const piiResult = scanAndScrubPII(sanitizedPrompt);
    piiLatency = piiResult.latencyMs;
    sanitizedPrompt = piiResult.sanitizedText;

    if (piiResult.detected) {
      wasSanitized = true;
      Object.assign(activeTokenMap, piiResult.tokenMap);
      for (const p of piiResult.piiFound) {
        threatsDetected.push(`PII_EXPOSURE:${p.type}`);
      }
      if (riskLevel !== 'HIGH' && riskLevel !== 'CRITICAL') {
        riskLevel = 'MEDIUM';
      }
    }

    pipelineSteps.push({
      step: 'PII_CLOAKING',
      tier: 'Layer 1: Deterministic (< 2ms)',
      status: piiResult.detected ? 'SANITIZED' : 'PASSED',
      latencyMs: piiLatency,
      details: piiResult.detected ? `${piiResult.piiFound.length} PII tokens cloaked (Session Vaulted)` : 'Clean'
    });
  }

  // Store cloaked tokens in Session Vault for reversible de-anonymization
  if (wasSanitized && Object.keys(activeTokenMap).length > 0) {
    sessionVault.storeTokens(effectiveSessionId, activeTokenMap);
  }

  // Step 3: Layer 2 - Hybrid Prompt Injection & Jailbreak Guard
  let injectionLatency = 0;
  if (cachedPolicy.injection_guard_enabled) {
    const injectionResult = await evaluatePromptSecurity(
      rawPrompt,
      cachedPolicy.injection_confidence_threshold,
      true
    );
    injectionLatency = injectionResult.latencyMs;

    if (injectionResult.detected) {
      isBlocked = true;
      riskLevel = injectionResult.riskLevel || 'CRITICAL';
      blockReason = injectionResult.reasoning;
      for (const t of injectionResult.threatTypes) {
        threatsDetected.push(`PROMPT_INJECTION:${t}`);
      }
    }

    pipelineSteps.push({
      step: 'INJECTION_GUARD',
      tier: injectionResult.method?.includes('SEMANTIC') ? 'Layer 2: Gemini 2.5 Flash' : 'Layer 1: Deterministic Heuristic',
      status: injectionResult.detected ? 'BLOCKED' : 'PASSED',
      latencyMs: injectionLatency,
      details: injectionResult.detected ? `Violation: ${injectionResult.threatTypes.join(', ')}` : 'Secure'
    });
  }

  // Step 4: Layer 1 - Deterministic Tool-Call Guardrail Firewall + HITL Intercept
  let toolLatency = 0;
  let evaluatedToolCalls = tool_calls || [];
  if (cachedPolicy.tool_firewall_enabled && evaluatedToolCalls.length > 0) {
    const toolResult = inspectToolCalls(evaluatedToolCalls, cachedPolicy);
    toolLatency = toolResult.latencyMs;

    if (toolResult.blocked) {
      riskLevel = 'CRITICAL';
      const violStrings = toolResult.violations.map(v => v.reason).join(' | ');
      for (const v of toolResult.violations) {
        threatsDetected.push(`DESTRUCTIVE_TOOL_CALL:${v.tool}`);
      }

      // Check if Human-in-the-Loop (HITL) approval should be requested
      const shouldTriggerHITL = require_hitl || cachedPolicy.hitl_approval_enabled;
      if (shouldTriggerHITL) {
        const hitlResolution = await hitlManager.requestApproval({
          clientId: client_id,
          sessionId: effectiveSessionId,
          toolName: evaluatedToolCalls[0]?.name || 'unknown_tool',
          parameters: evaluatedToolCalls[0]?.parameters || {},
          riskScore: 0.95,
          violations: toolResult.violations,
          timeoutMs: 15000 // 15 second interactive window
        });

        if (hitlResolution.approved) {
          isBlocked = false;
          humanOverridden = true;
          pipelineSteps.push({
            step: 'TOOL_FIREWALL',
            tier: 'Layer 3: Human-in-the-Loop (HITL)',
            status: 'OVERRIDDEN_BY_OPERATOR',
            latencyMs: toolLatency,
            details: 'Dangerous tool call manually authorized by operator.'
          });
        } else {
          isBlocked = true;
          blockReason = `HITL Rejected: ${hitlResolution.reason}`;
          pipelineSteps.push({
            step: 'TOOL_FIREWALL',
            tier: 'Layer 3: Human-in-the-Loop (HITL)',
            status: 'BLOCKED',
            latencyMs: toolLatency,
            details: blockReason
          });
        }
      } else {
        isBlocked = true;
        blockReason = blockReason ? `${blockReason}; ${violStrings}` : violStrings;
        pipelineSteps.push({
          step: 'TOOL_FIREWALL',
          tier: 'Layer 1: Deterministic Policy',
          status: 'BLOCKED',
          latencyMs: toolLatency,
          details: `${toolResult.violations.length} destructive tool intents blocked`
        });
      }
    } else {
      pipelineSteps.push({
        step: 'TOOL_FIREWALL',
        tier: 'Layer 1: Deterministic Policy',
        status: 'PASSED',
        latencyMs: toolLatency,
        details: 'Allowed'
      });
    }
  }

  // Step 5: Modular Fraud Detection & Behavioral Anomaly Subsystem (fraudDetector.js)
  let fraudLatency = 0;
  let fraudResult = { isBlocked: false, fraudScore: 0.0, detectedFrauds: [], primaryCategory: 'NONE', fraudAction: 'CLEAN', latencyMs: 0 };
  if (cachedPolicy.fraud_detection_enabled) {
    fraudResult = evaluateFraudRisk(
      rawPrompt,
      evaluatedToolCalls,
      client_id,
      cachedPolicy
    );
    fraudLatency = fraudResult.latencyMs;

    if (fraudResult.isBlocked) {
      isBlocked = true;
      riskLevel = 'CRITICAL';
      const fraudReasons = fraudResult.detectedFrauds.map(f => f.description).join('; ');
      blockReason = blockReason ? `${blockReason}; ${fraudReasons}` : fraudReasons;
    } else if (fraudResult.detectedFrauds.length > 0) {
      if (riskLevel !== 'CRITICAL') {
        riskLevel = 'HIGH';
      }
    }

    for (const f of fraudResult.detectedFrauds) {
      threatsDetected.push(`FRAUD:${f.category}:${f.code}`);
    }

    pipelineSteps.push({
      step: 'FRAUD_DETECTOR',
      tier: 'Layer 1: Behavioral Anomaly Radar (< 1ms)',
      status: fraudResult.isBlocked ? 'BLOCKED' : (fraudResult.detectedFrauds.length > 0 ? 'FLAGGED_ANOMALY' : 'PASSED'),
      latencyMs: fraudLatency,
      details: fraudResult.detectedFrauds.length > 0
        ? `${fraudResult.detectedFrauds.length} fraud signatures (Risk: ${fraudResult.fraudScore})`
        : `Risk Score: ${fraudResult.fraudScore} (Clean)`
    });
  }

  const guardrailLatency = +(secretLatency + piiLatency + injectionLatency + toolLatency + fraudLatency).toFixed(2);

  // Decision & Upstream Dispatch
  let upstreamResponse = null;
  let rehydratedResponse = null;
  let modelRawResponse = null;
  let upstreamInferenceLatency = 0;
  let actionTaken = 'PASSED';

  if (isBlocked) {
    actionTaken = 'BLOCKED';
  } else {
    actionTaken = humanOverridden ? 'HUMAN_OVERRIDDEN' : (wasSanitized ? 'SANITIZED' : 'PASSED');

    // Dispatch sanitized prompt to upstream model
    const upstreamStart = performance.now();
    try {
      const rawModelCompletion = await forwardToUpstreamModel(sanitizedPrompt, mock_upstream);
      upstreamInferenceLatency = +(performance.now() - upstreamStart).toFixed(2);
      
      // Sanitize model output to ensure zero outbound PII/secret leaks
      let cleanOutbound = rawModelCompletion;
      if (cachedPolicy.secret_scanner_enabled) {
        const secOut = scanAndScrubSecrets(cleanOutbound);
        cleanOutbound = secOut.sanitizedText;
      }
      if (cachedPolicy.pii_redaction_enabled) {
        const piiOut = scanAndScrubPII(cleanOutbound);
        cleanOutbound = piiOut.sanitizedText;
      }

      modelRawResponse = cleanOutbound;

      // Two-Way Reversible Cloaking: De-anonymize tokens for authorized client
      if (two_way_cloaking && wasSanitized) {
        const deAnonResult = sessionVault.deAnonymize(cleanOutbound, effectiveSessionId, activeTokenMap);
        rehydratedResponse = deAnonResult.rehydratedText;
        upstreamResponse = rehydratedResponse;
      } else {
        upstreamResponse = cleanOutbound;
        rehydratedResponse = cleanOutbound;
      }
    } catch (err) {
      upstreamResponse = `[Gateway Upstream Error] Failed to communicate with model: ${err.message}`;
      rehydratedResponse = upstreamResponse;
    }
  }

  const totalLatency = +(performance.now() - pipelineStart).toFixed(2);

  // Compute live latency overhead percentage
  const overheadPercentage = upstreamInferenceLatency > 0 
    ? +((guardrailLatency / (guardrailLatency + upstreamInferenceLatency)) * 100).toFixed(1)
    : 100;

  // Audit Logging (with optional AES encryption of raw payload & Merkle hash)
  const storedRawPrompt = encryptPayload(rawPrompt);
  let auditLogRecord = null;

  try {
    const insertSql = `
      INSERT INTO audit_logs (
        client_id, session_id, action_taken, risk_level, threat_types,
        raw_prompt, sanitized_prompt, upstream_response, tool_calls,
        guardrail_latency_ms, total_latency_ms,
        fraud_score, fraud_category, fraud_indicators
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const result = await db.query(insertSql, [
      client_id,
      effectiveSessionId,
      actionTaken,
      riskLevel,
      JSON.stringify(threatsDetected),
      storedRawPrompt,
      sanitizedPrompt,
      upstreamResponse,
      JSON.stringify(evaluatedToolCalls),
      guardrailLatency,
      totalLatency,
      fraudResult.fraudScore,
      fraudResult.primaryCategory,
      JSON.stringify(fraudResult.detectedFrauds)
    ]);

    if (result.rows && result.rows[0]) {
      auditLogRecord = result.rows[0];
    }
  } catch (err) {
    console.error('[TrustGate AuditLog] Failed to persist audit log:', err.message);
  }

  // Real-Time Broadcast to SSE Control Plane
  const telemetryEvent = {
    id: auditLogRecord?.id || String(Date.now()),
    timestamp: new Date().toISOString(),
    client_id,
    session_id: effectiveSessionId,
    action_taken: actionTaken,
    risk_level: riskLevel,
    threat_types: threatsDetected,
    raw_prompt: rawPrompt,
    sanitized_prompt: sanitizedPrompt,
    model_raw_response: modelRawResponse,
    upstream_response: upstreamResponse,
    tool_calls: evaluatedToolCalls,
    guardrail_latency_ms: guardrailLatency,
    upstream_inference_latency_ms: upstreamInferenceLatency,
    total_latency_ms: totalLatency,
    overhead_percentage: overheadPercentage,
    two_way_cloaked: wasSanitized && two_way_cloaking,
    audit_hash: auditLogRecord?.audit_hash,
    prev_audit_hash: auditLogRecord?.prev_audit_hash,
    fraud_score: fraudResult.fraudScore,
    fraud_category: fraudResult.primaryCategory,
    fraud_indicators: fraudResult.detectedFrauds,
    fraud_action: fraudResult.fraudAction,
    steps: pipelineSteps
  };

  sseHub.broadcast('telemetry', telemetryEvent);

  // Return Gateway Response
  if (isBlocked) {
    return {
      status: 'blocked',
      httpCode: 403,
      reason: blockReason || 'Security guardrail violation triggered.',
      threats: threatsDetected,
      risk_level: riskLevel,
      fraud: {
        score: fraudResult.fraudScore,
        category: fraudResult.primaryCategory,
        action: fraudResult.fraudAction,
        indicators: fraudResult.detectedFrauds
      },
      telemetry: {
        guardrail_latency_ms: guardrailLatency,
        total_latency_ms: totalLatency,
        steps: pipelineSteps
      }
    };
  }

  return {
    status: 'success',
    httpCode: 200,
    sanitized: wasSanitized,
    two_way_cloaked: wasSanitized && two_way_cloaking,
    response: upstreamResponse,
    model_raw_response: modelRawResponse,
    tool_calls: evaluatedToolCalls,
    fraud: {
      score: fraudResult.fraudScore,
      category: fraudResult.primaryCategory,
      action: fraudResult.fraudAction,
      indicators: fraudResult.detectedFrauds
    },
    telemetry: {
      guardrail_latency_ms: guardrailLatency,
      upstream_inference_latency_ms: upstreamInferenceLatency,
      total_latency_ms: totalLatency,
      overhead_percentage: overheadPercentage,
      risk_level: riskLevel,
      threats_detected: threatsDetected,
      audit_hash: auditLogRecord?.audit_hash,
      steps: pipelineSteps
    }
  };
}
