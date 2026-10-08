import express from 'express';
import { z } from 'zod';
import { db } from '../db/pool.js';
import { getActivePolicy, setCachedPolicy, refreshPolicyCache } from '../services/engine/pipeline.js';
import { COMPLIANCE_PROFILES } from '../services/engine/policyPresets.js';
import { sseHub } from '../services/sseHub.js';

export const policiesRouter = express.Router();

export const PolicyUpdateSchema = z.object({
  pii_redaction_enabled: z.boolean(),
  secret_scanner_enabled: z.boolean(),
  injection_guard_enabled: z.boolean(),
  tool_firewall_enabled: z.boolean(),
  fraud_detection_enabled: z.boolean().optional().default(true),
  fraud_risk_threshold: z.number().min(0.0).max(1.0).optional().default(0.70),
  two_way_cloaking_enabled: z.boolean().optional().default(true),
  hitl_approval_enabled: z.boolean().optional().default(false),
  injection_confidence_threshold: z.number().min(0.0).max(1.0),
  blocked_sql_keywords: z.array(z.string()),
  blocked_shell_commands: z.array(z.string())
});

/**
 * GET /api/v1/policies/profiles
 * Returns pre-configured compliance profiles
 */
policiesRouter.get('/profiles', (req, res) => {
  return res.json({
    status: 'success',
    profiles: COMPLIANCE_PROFILES
  });
});

/**
 * GET /api/v1/policies
 * Retrieves current active security policies
 */
policiesRouter.get('/', async (req, res) => {
  try {
    const policy = getActivePolicy();
    return res.json({
      status: 'success',
      policy
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * PUT /api/v1/policies
 * Updates active security policies, refreshing DB and in-memory engine cache
 */
policiesRouter.put('/', async (req, res) => {
  const parseResult = PolicyUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid policy payload',
      details: parseResult.error.issues
    });
  }

  const data = parseResult.data;

  try {
    const updateSql = `
      UPDATE security_policies
      SET 
        pii_redaction_enabled = $1,
        secret_scanner_enabled = $2,
        injection_guard_enabled = $3,
        tool_firewall_enabled = $4,
        injection_confidence_threshold = $5,
        blocked_sql_keywords = $6,
        blocked_shell_commands = $7,
        fraud_detection_enabled = $8,
        fraud_risk_threshold = $9,
        two_way_cloaking_enabled = $10,
        hitl_approval_enabled = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 'default'
      RETURNING *;
    `;

    const result = await db.query(updateSql, [
      data.pii_redaction_enabled,
      data.secret_scanner_enabled,
      data.injection_guard_enabled,
      data.tool_firewall_enabled,
      data.injection_confidence_threshold,
      JSON.stringify(data.blocked_sql_keywords),
      JSON.stringify(data.blocked_shell_commands),
      data.fraud_detection_enabled,
      data.fraud_risk_threshold,
      data.two_way_cloaking_enabled,
      data.hitl_approval_enabled
    ]);

    // Update in-memory cache
    setCachedPolicy(data);

    // Broadcast policy change notification via SSE
    sseHub.broadcast('policy_updated', {
      policy: data,
      updated_at: new Date().toISOString()
    });

    return res.json({
      status: 'success',
      message: 'Security policy updated successfully',
      policy: getActivePolicy()
    });
  } catch (err) {
    console.error('[TrustGate Policy Update Error]:', err);
    return res.status(500).json({ status: 'error', error: err.message });
  }
});
