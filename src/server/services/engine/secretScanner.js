import { performance } from 'perf_hooks';

/**
 * Secret Detection Patterns
 */
const SECRET_PATTERNS = [
  {
    name: 'OPENAI_KEY',
    category: 'SECRET_LEAK',
    regex: /\b(sk-(?:proj-)?[a-zA-Z0-9_\-]{32,})\b/g,
    tokenPrefix: 'REDACTED_SECRET_OPENAI_KEY'
  },
  {
    name: 'AWS_ACCESS_KEY',
    category: 'SECRET_LEAK',
    regex: /\b((?:AKIA|ASIA)[0-9A-Z]{16})\b/g,
    tokenPrefix: 'REDACTED_SECRET_AWS_KEY'
  },
  {
    name: 'JWT_TOKEN',
    category: 'SECRET_LEAK',
    regex: /\b(eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,})\b/g,
    tokenPrefix: 'REDACTED_SECRET_JWT'
  },
  {
    name: 'GITHUB_PAT',
    category: 'SECRET_LEAK',
    regex: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{60,})\b/g,
    tokenPrefix: 'REDACTED_SECRET_GITHUB_PAT'
  },
  {
    name: 'SLACK_TOKEN',
    category: 'SECRET_LEAK',
    regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g,
    tokenPrefix: 'REDACTED_SECRET_SLACK_TOKEN'
  },
  {
    name: 'BEARER_AUTH',
    category: 'SECRET_LEAK',
    regex: /Bearer\s+([a-zA-Z0-9_\-\.]{25,})/gi,
    tokenPrefix: 'REDACTED_SECRET_BEARER'
  },
  {
    name: 'PRIVATE_KEY',
    category: 'SECRET_LEAK',
    regex: /-----BEGIN\s+(?:[A-Z\s]+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:[A-Z\s]+)?PRIVATE\s+KEY-----/g,
    tokenPrefix: 'REDACTED_SECRET_PRIVATE_KEY'
  }
];

/**
 * Scans text for credentials and secrets, replacing them with deterministic redaction tokens.
 *
 * @param {string} text - Raw input text
 * @returns {object} Scan and sanitization results with timing
 */
export function scanAndScrubSecrets(text) {
  const start = performance.now();
  if (!text || typeof text !== 'string') {
    return {
      detected: false,
      secretsFound: [],
      sanitizedText: text || '',
      latencyMs: +(performance.now() - start).toFixed(3),
      tokenMap: {}
    };
  }

  let sanitizedText = text;
  const secretsFound = [];
  const tokenMap = {};
  let tokenCounter = 1;

  for (const rule of SECRET_PATTERNS) {
    rule.regex.lastIndex = 0;
    let match;
    // For patterns with capture groups (like Bearer), handle full vs captured string
    while ((match = rule.regex.exec(sanitizedText)) !== null) {
      const fullMatch = match[0];
      const sensitivePart = match[1] || fullMatch;
      const placeholder = `[${rule.tokenPrefix}_${tokenCounter++}]`;

      tokenMap[placeholder] = sensitivePart;
      secretsFound.push({
        type: rule.name,
        category: rule.category,
        token: placeholder,
        snippet: sensitivePart.length > 8 
          ? `${sensitivePart.slice(0, 4)}...${sensitivePart.slice(-4)}`
          : '[REDACTED]',
        matchIndex: match.index
      });

      // Replace the sensitive token in sanitizedText
      sanitizedText = sanitizedText.replace(sensitivePart, placeholder);
      rule.regex.lastIndex = 0; // Reset index since string length changed
    }
  }

  const duration = +(performance.now() - start).toFixed(3);

  return {
    detected: secretsFound.length > 0,
    secretsFound,
    sanitizedText,
    latencyMs: duration,
    tokenMap
  };
}
