import { db, isFallbackDb } from './pool.js';

export async function runDatabaseMigrations() {
  if (isFallbackDb()) {
    console.log('[TrustGate Migrations] Schema active in in-memory datastore.');
    return;
  }

  const migrationSql = `
    CREATE TABLE IF NOT EXISTS security_policies (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
        pii_redaction_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        secret_scanner_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        injection_guard_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        tool_firewall_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        fraud_detection_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        fraud_risk_threshold NUMERIC(3, 2) NOT NULL DEFAULT 0.70,
        injection_confidence_threshold NUMERIC(3, 2) NOT NULL DEFAULT 0.75,
        blocked_sql_keywords JSONB NOT NULL DEFAULT '["DROP", "TRUNCATE", "DELETE", "ALTER"]'::jsonb,
        blocked_shell_commands JSONB NOT NULL DEFAULT '["rm", "sh", "bash", "curl", "wget", "nc"]'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR(128) NOT NULL,
        session_id VARCHAR(128),
        action_taken VARCHAR(32) NOT NULL,
        risk_level VARCHAR(16) NOT NULL,
        threat_types JSONB NOT NULL DEFAULT '[]'::jsonb,
        raw_prompt TEXT NOT NULL,
        sanitized_prompt TEXT NOT NULL,
        upstream_response TEXT,
        tool_calls JSONB DEFAULT '[]'::jsonb,
        guardrail_latency_ms NUMERIC(6, 2) NOT NULL,
        total_latency_ms NUMERIC(6, 2) NOT NULL,
        fraud_score NUMERIC(3, 2) DEFAULT 0.00,
        fraud_category VARCHAR(64) DEFAULT 'NONE',
        fraud_indicators JSONB DEFAULT '[]'::jsonb,
        audit_hash VARCHAR(64),
        prev_audit_hash VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Safe column additions for existing deployments
    ALTER TABLE audit_logs 
    ADD COLUMN IF NOT EXISTS fraud_score NUMERIC(3, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS fraud_category VARCHAR(64) DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS fraud_indicators JSONB DEFAULT '[]'::jsonb;

    ALTER TABLE security_policies
    ADD COLUMN IF NOT EXISTS fraud_detection_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS fraud_risk_threshold NUMERIC(3, 2) NOT NULL DEFAULT 0.70;

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_taken);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_risk ON audit_logs(risk_level);

    INSERT INTO security_policies (id, pii_redaction_enabled, secret_scanner_enabled, injection_guard_enabled, tool_firewall_enabled, injection_confidence_threshold)
    VALUES ('default', TRUE, TRUE, TRUE, TRUE, 0.75)
    ON CONFLICT (id) DO NOTHING;
  `;

  try {
    await db.query(migrationSql);
    console.log('[TrustGate Migrations] Database tables and indices successfully initialized.');
  } catch (err) {
    console.error('[TrustGate Migrations] Error executing schema initialization:', err.message);
  }
}
