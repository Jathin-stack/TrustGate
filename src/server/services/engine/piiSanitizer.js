import { performance } from 'perf_hooks';

/**
 * Validates a numeric string against the Luhn algorithm (Mod 10 check)
 * for authentic credit card verification.
 */
export function isValidLuhn(val) {
  const digits = String(val).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_REGEX = /\b(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})\b/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const POTENTIAL_CC_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;

/**
 * Scans text for PII (emails, credit cards with Luhn check, phone numbers, SSNs)
 * and replaces them with deterministic tokens.
 *
 * @param {string} text - Raw input string
 * @returns {object} Sanitized result, detected entities, and latency
 */
export function scanAndScrubPII(text) {
  const start = performance.now();
  if (!text || typeof text !== 'string') {
    return {
      detected: false,
      piiFound: [],
      sanitizedText: text || '',
      latencyMs: +(performance.now() - start).toFixed(3),
      tokenMap: {}
    };
  }

  let sanitizedText = text;
  const piiFound = [];
  const tokenMap = {};

  let emailCounter = 1;
  let ccCounter = 1;
  let phoneCounter = 1;
  let ssnCounter = 1;

  // 1. Credit Cards with Luhn Check
  const ccMatches = sanitizedText.match(POTENTIAL_CC_REGEX) || [];
  for (const rawMatch of ccMatches) {
    const cleanedDigits = rawMatch.replace(/\D/g, '');
    if (isValidLuhn(cleanedDigits)) {
      const placeholder = `[REDACTED_CREDIT_CARD_${ccCounter++}]`;
      const maskedSnippet = `****-****-****-${cleanedDigits.slice(-4)}`;

      tokenMap[placeholder] = rawMatch;
      piiFound.push({
        type: 'CREDIT_CARD',
        category: 'PII_EXPOSURE',
        token: placeholder,
        snippet: maskedSnippet
      });

      sanitizedText = sanitizedText.replace(rawMatch, placeholder);
    }
  }

  // 2. SSN Detection
  EMAIL_REGEX.lastIndex = 0;
  SSN_REGEX.lastIndex = 0;
  let ssnMatch;
  while ((ssnMatch = SSN_REGEX.exec(sanitizedText)) !== null) {
    const rawSSN = ssnMatch[0];
    const placeholder = `[REDACTED_SSN_${ssnCounter++}]`;
    const maskedSnippet = `***-**-${rawSSN.slice(-4)}`;

    tokenMap[placeholder] = rawSSN;
    piiFound.push({
      type: 'SSN',
      category: 'PII_EXPOSURE',
      token: placeholder,
      snippet: maskedSnippet
    });

    sanitizedText = sanitizedText.replace(rawSSN, placeholder);
    SSN_REGEX.lastIndex = 0;
  }

  // 3. Email Detection
  let emailMatch;
  while ((emailMatch = EMAIL_REGEX.exec(sanitizedText)) !== null) {
    const rawEmail = emailMatch[0];
    const placeholder = `[REDACTED_EMAIL_${emailCounter++}]`;
    const parts = rawEmail.split('@');
    const maskedSnippet = `${parts[0].slice(0, 2)}***@${parts[1]}`;

    tokenMap[placeholder] = rawEmail;
    piiFound.push({
      type: 'EMAIL',
      category: 'PII_EXPOSURE',
      token: placeholder,
      snippet: maskedSnippet
    });

    sanitizedText = sanitizedText.replace(rawEmail, placeholder);
    EMAIL_REGEX.lastIndex = 0;
  }

  // 4. Phone Detection
  PHONE_REGEX.lastIndex = 0;
  let phoneMatch;
  while ((phoneMatch = PHONE_REGEX.exec(sanitizedText)) !== null) {
    const rawPhone = phoneMatch[0];
    // Avoid re-matching previously inserted placeholders
    if (rawPhone.includes('[') || rawPhone.includes(']')) continue;

    const placeholder = `[REDACTED_PHONE_${phoneCounter++}]`;
    const digits = rawPhone.replace(/\D/g, '');
    const maskedSnippet = `***-***-${digits.slice(-4)}`;

    tokenMap[placeholder] = rawPhone;
    piiFound.push({
      type: 'PHONE',
      category: 'PII_EXPOSURE',
      token: placeholder,
      snippet: maskedSnippet
    });

    sanitizedText = sanitizedText.replace(rawPhone, placeholder);
    PHONE_REGEX.lastIndex = 0;
  }

  const duration = +(performance.now() - start).toFixed(3);

  return {
    detected: piiFound.length > 0,
    piiFound,
    sanitizedText,
    latencyMs: duration,
    tokenMap
  };
}
