/**
 * Compliance Profiles & One-Click Policy Presets for Enterprise Deployments
 */
export const COMPLIANCE_PROFILES = {
  HEALTHCARE_HIPAA: {
    id: 'hipaa',
    name: 'Strict Healthcare (HIPAA)',
    description: 'Zero-tolerance patient PII cloaking, aggressive medical record identification, and restricted telemetry storage.',
    policy: {
      pii_redaction_enabled: true,
      secret_scanner_enabled: true,
      injection_guard_enabled: true,
      tool_firewall_enabled: true,
      injection_confidence_threshold: 0.65,
      blocked_sql_keywords: ['DROP', 'TRUNCATE', 'DELETE', 'ALTER', 'GRANT', 'REVOKE', 'MERGE'],
      blocked_shell_commands: ['rm', 'sh', 'bash', 'curl', 'wget', 'nc', 'python', 'perl', 'socat']
    }
  },
  FINTECH_PCI_DSS: {
    id: 'pci_dss',
    name: 'FinTech & Banking (PCI-DSS)',
    description: 'Luhn-enforced credit card masking, credential leak prevention, and financial ledger write blocking.',
    policy: {
      pii_redaction_enabled: true,
      secret_scanner_enabled: true,
      injection_guard_enabled: true,
      tool_firewall_enabled: true,
      injection_confidence_threshold: 0.70,
      blocked_sql_keywords: ['DROP', 'TRUNCATE', 'DELETE', 'ALTER', 'GRANT', 'REVOKE'],
      blocked_shell_commands: ['rm', 'sh', 'bash', 'curl', 'wget', 'nc', 'sudo', 'su', 'ncat']
    }
  },
  AGENT_SANDBOX: {
    id: 'agent_sandbox',
    name: 'Autonomous Code Agent (Strict Sandbox)',
    description: 'Total lockdown on autonomous agents invoking terminal tools, destructive SQL, or file system modifications.',
    policy: {
      pii_redaction_enabled: true,
      secret_scanner_enabled: true,
      injection_guard_enabled: true,
      tool_firewall_enabled: true,
      injection_confidence_threshold: 0.60,
      blocked_sql_keywords: ['DROP', 'TRUNCATE', 'DELETE', 'ALTER', 'CREATE', 'RENAME'],
      blocked_shell_commands: ['rm', 'sh', 'bash', 'curl', 'wget', 'nc', 'chmod', 'chown', 'sudo', 'kill', 'pkill', 'mkfs', 'dd']
    }
  },
  ENTERPRISE_DEFAULT: {
    id: 'enterprise_default',
    name: 'Balanced Enterprise Production Posture',
    description: 'Optimized high-throughput configuration with balanced sensitivity (threshold: 0.75) and standard tool guards.',
    policy: {
      pii_redaction_enabled: true,
      secret_scanner_enabled: true,
      injection_guard_enabled: true,
      tool_firewall_enabled: true,
      injection_confidence_threshold: 0.75,
      blocked_sql_keywords: ['DROP', 'TRUNCATE', 'DELETE', 'ALTER'],
      blocked_shell_commands: ['rm', 'sh', 'bash', 'curl', 'wget', 'nc']
    }
  }
};
