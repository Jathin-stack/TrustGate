import { performance } from 'perf_hooks';

const DEFAULT_BLOCKED_SQL = ['DROP', 'TRUNCATE', 'DELETE', 'ALTER'];
const DEFAULT_BLOCKED_SHELL = ['rm', 'sh', 'bash', 'curl', 'wget', 'nc'];

const DANGEROUS_FILE_PATHS = [
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\.ssh\//i,
  /id_rsa/i,
  /\.env\b/i,
  /(?:\.\.\/|\.\.\\){2,}/, // directory traversal
  /windows[\\\/]system32/i
];

/**
 * Inspects agent tool calls against deterministic security guardrails.
 *
 * @param {Array<object>} toolCalls - Array of { name, parameters }
 * @param {object} policy - Active policy with blocked SQL keywords & shell commands
 * @returns {object} Validation result with violations and timing
 */
export function inspectToolCalls(toolCalls = [], policy = {}) {
  const start = performance.now();

  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return {
      blocked: false,
      violations: [],
      sanitizedToolCalls: [],
      latencyMs: +(performance.now() - start).toFixed(3)
    };
  }

  const blockedSql = policy.blocked_sql_keywords || DEFAULT_BLOCKED_SQL;
  const blockedShell = policy.blocked_shell_commands || DEFAULT_BLOCKED_SHELL;
  const violations = [];

  for (const call of toolCalls) {
    const toolName = (call.name || call.function?.name || '').toLowerCase();
    const params = call.parameters || call.args || (call.function && call.function.arguments) || {};
    
    // Parse arguments if stringified JSON
    let parsedParams = params;
    if (typeof params === 'string') {
      try {
        parsedParams = JSON.parse(params);
      } catch {
        parsedParams = { raw: params };
      }
    }

    // Recursively check all parameter string values
    const inspectValue = (keyPath, val) => {
      if (!val) return;

      if (typeof val === 'string') {
        const valUpper = val.toUpperCase();
        const valLower = val.toLowerCase();

        // 1. SQL Tool Invocations
        if (toolName.includes('sql') || toolName.includes('query') || toolName.includes('database') || keyPath.toLowerCase().includes('sql') || keyPath.toLowerCase().includes('query')) {
          for (const kw of blockedSql) {
            const regex = new RegExp(`\\b${kw}\\b`, 'i');
            if (regex.test(val)) {
              violations.push({
                tool: toolName,
                parameter: keyPath,
                value: val.slice(0, 80),
                reason: `Blocked destructive SQL keyword: [${kw}] detected in ${keyPath}`,
                riskLevel: 'CRITICAL',
                category: 'DESTRUCTIVE_TOOL_CALL'
              });
            }
          }
        }

        // 2. Shell Command Invocations
        if (toolName.includes('bash') || toolName.includes('sh') || toolName.includes('exec') || toolName.includes('command') || toolName.includes('terminal') || keyPath.toLowerCase().includes('command') || keyPath.toLowerCase().includes('cmd')) {
          // Check blocked commands
          for (const cmd of blockedShell) {
            const cmdRegex = new RegExp(`(?:^|[;&|\\s])${cmd}(?:\\s|$|[;&|])`, 'i');
            if (cmdRegex.test(valLower)) {
              violations.push({
                tool: toolName,
                parameter: keyPath,
                value: val.slice(0, 80),
                reason: `Blocked dangerous shell executable: [${cmd}] detected in ${keyPath}`,
                riskLevel: 'CRITICAL',
                category: 'DESTRUCTIVE_TOOL_CALL'
              });
            }
          }

          // Check command injection chaining operators
          if (/(?:rm\s+-rf|rmdir\s+\/s|mkfs|:\(\)\{:\|:&\};:)/i.test(valLower)) {
            violations.push({
              tool: toolName,
              parameter: keyPath,
              value: val.slice(0, 80),
              reason: `Catastrophic filesystem destruction command detected in ${keyPath}`,
              riskLevel: 'CRITICAL',
              category: 'DESTRUCTIVE_TOOL_CALL'
            });
          }
        }

        // 3. File System & Path Traversal Guards
        for (const pathPattern of DANGEROUS_FILE_PATHS) {
          if (pathPattern.test(val)) {
            violations.push({
              tool: toolName,
              parameter: keyPath,
              value: val.slice(0, 80),
              reason: `Restricted filesystem path or traversal attack pattern detected in ${keyPath}`,
              riskLevel: 'HIGH',
              category: 'DESTRUCTIVE_TOOL_CALL'
            });
            break;
          }
        }
      } else if (typeof val === 'object') {
        for (const [subKey, subVal] of Object.entries(val)) {
          inspectValue(`${keyPath}.${subKey}`, subVal);
        }
      }
    };

    if (typeof parsedParams === 'object') {
      for (const [key, val] of Object.entries(parsedParams)) {
        inspectValue(key, val);
      }
    }
  }

  const duration = +(performance.now() - start).toFixed(3);

  return {
    blocked: violations.length > 0,
    violations,
    sanitizedToolCalls: violations.length === 0 ? toolCalls : [],
    latencyMs: duration
  };
}
