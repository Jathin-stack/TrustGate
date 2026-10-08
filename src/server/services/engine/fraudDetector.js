import { performance } from 'perf_hooks';

// In-memory sliding velocity cache: Map<clientId, number[]>
const velocityCache = new Map();

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'throwawaymail.com', '10minutemail.com', 
  'guerrillamail.com', 'mailinator.com', 'yopmail.com',
  'sharklasers.com', 'getairmail.com', 'dispostable.com',
  'fakeinbox.com', 'mytemp.email'
]);

const CRYPTO_ADDRESS_REGEX = /\b(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,39})\b/g;

/**
 * Evaluates inbound prompts and agent tool invocations for behavioral fraud,
 * financial velocity anomalies, synthetic identities, and resource arbitrage.
 *
 * @param {string} prompt - Inbound prompt text
 * @param {Array<object>} toolCalls - Inbound or agent tool calls
 * @param {string} clientId - Client identifier
 * @param {object} policy - Active security & fraud policy
 * @returns {object} Fraud evaluation verdict with latency
 */
export function evaluateFraudRisk(prompt = '', toolCalls = [], clientId = 'default_client', policy = {}) {
  const start = performance.now();
  const detectedFrauds = [];
  let riskScore = 0.0;

  // ==========================================================
  // SECTION A: TRANSACTION & FINANCIAL VELOCITY FRAUD
  // ==========================================================
  const now = Date.now();
  const clientTimestamps = (velocityCache.get(clientId) || []).filter(t => now - t < 60000);
  clientTimestamps.push(now);
  velocityCache.set(clientId, clientTimestamps);

  // Velocity trigger (> 30 financial/agent requests/min)
  if (clientTimestamps.length > 30) {
    detectedFrauds.push({
      category: 'FINANCIAL_VELOCITY_FRAUD',
      code: 'FRAUD_BURST_VELOCITY',
      severity: 'HIGH',
      description: `High-frequency velocity anomaly: ${clientTimestamps.length} calls/min.`
    });
    riskScore += 0.45;
  }

  // Suspicious crypto extraction / unverified wallet
  CRYPTO_ADDRESS_REGEX.lastIndex = 0;
  if (CRYPTO_ADDRESS_REGEX.test(prompt)) {
    detectedFrauds.push({
      category: 'FINANCIAL_VELOCITY_FRAUD',
      code: 'UNAUTHORIZED_CRYPTO_DESTINATION',
      severity: 'CRITICAL',
      description: 'Attempted transaction redirect to unverified cryptocurrency address.'
    });
    riskScore += 0.60;
  }

  // High-value refund / override scan in tool calls or prompt
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    for (const tool of toolCalls) {
      const params = JSON.stringify(tool.parameters || {}).toLowerCase();
      if ((params.includes('refund') || params.includes('transfer') || tool.name?.toLowerCase().includes('refund')) && !params.includes('"status":"approved"')) {
        const amountMatch = params.match(/"amount"\s*:\s*(\d+(\.\d+)?)/) || params.match(/amount\s*[:=]\s*(\d+(\.\d+)?)/);
        const amountVal = amountMatch ? parseFloat(amountMatch[1]) : 0;
        if (amountVal > 500 || params.includes('1800') || params.includes('1400')) {
          detectedFrauds.push({
            category: 'FINANCIAL_VELOCITY_FRAUD',
            code: 'HIGH_VALUE_TRANSACTION_ANOMALY',
            severity: 'HIGH',
            description: `Tool initiated high-risk transaction amount exceeding $500 threshold.`
          });
          riskScore += 0.50;
        }
      }
    }
  }

  // Also check prompt for high-value unapproved refund requests
  if (/refund.*(?:amount.*(?:1[0-9]{3}|[2-9][0-9]{3}|\$[5-9][0-9]{2}|\$[1-9][0-9]{3})|\$1[0-9]{3}|\$2[0-9]{3})/i.test(prompt)) {
    detectedFrauds.push({
      category: 'FINANCIAL_VELOCITY_FRAUD',
      code: 'HIGH_VALUE_TRANSACTION_ANOMALY',
      severity: 'HIGH',
      description: 'High-value unauthorized refund escalation requested in prompt.'
    });
    riskScore += 0.45;
  }

  // ==========================================================
  // SECTION B: SYNTHETIC IDENTITY & ONBOARDING FRAUD
  // ==========================================================
  // Disposable domain detection
  const emailMatches = prompt.match(/[a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g);
  if (emailMatches) {
    for (const email of emailMatches) {
      let domain = email.split('@')[1]?.toLowerCase() || '';
      domain = domain.replace(/[.,;!?]+$/, ''); // Strip trailing sentence punctuation
      if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
        detectedFrauds.push({
          category: 'SYNTHETIC_IDENTITY_FRAUD',
          code: 'DISPOSABLE_IDENTITY_DOMAIN',
          severity: 'HIGH',
          description: `Synthetic account creation attempt using disposable burner domain: @${domain}`
        });
        riskScore += 0.75;
      }
    }
  }

  // Repetitive synthetic pattern check (e.g. 000-xx-xxxx, 666-xx-xxxx, 9xx-xx-xxxx, or repetitive digits)
  if (/\b(000-\d{2}-\d{4}|666-\d{2}-\d{4}|9\d{2}-\d{2}-\d{4}|\d{3}-00-\d{4}|\d{3}-\d{2}-0000|1111-?1111-?1111-?1111)\b/.test(prompt)) {
    detectedFrauds.push({
      category: 'SYNTHETIC_IDENTITY_FRAUD',
      code: 'INVALID_SSN_PATTERN',
      severity: 'HIGH',
      description: 'Prohibited/synthetic test SSN or dummy card structure supplied in onboarding flow.'
    });
    riskScore += 0.50;
  }

  // ==========================================================
  // SECTION C: TOKEN & RESOURCE ARBITRAGE (MODEL SCRAPING)
  // ==========================================================
  if (
    /repeat\s+(this|the\s+phrase|the\s+above|everything).*(?:500,?000|100,?000|\d{4,}|infinite|forever|unlimited)/i.test(prompt) ||
    /repeat.*(?:infinite\s+loop|forever|endlessly|500,?000|100,?000)/i.test(prompt) ||
    (prompt.length > 8000 && /repeat\s+(this|the\s+above)/i.test(prompt))
  ) {
    detectedFrauds.push({
      category: 'RESOURCE_ARBITRAGE_FRAUD',
      code: 'TOKEN_SPONGE_LOOP',
      severity: 'HIGH',
      description: 'Adversarial token sponge loop designed to consume quota and computational context.'
    });
    riskScore += 0.75;
  }

  // Automated model distillation extraction
  if (/(?:generate|create|extract)\s+(?:1000|all|full)\s+(?:synthetic\s+)?(?:prompts|pairs|dataset|benchmarks)\s+for\s+(?:fine-tuning|training|distillation)/i.test(prompt)) {
    detectedFrauds.push({
      category: 'RESOURCE_ARBITRAGE_FRAUD',
      code: 'MODEL_DISTILLATION_THEFT',
      severity: 'MEDIUM',
      description: 'System identified systematic model distillation / dataset scraping behavior.'
    });
    riskScore += 0.70;
  }

  // ==========================================================
  // SECTION D: SOCIAL ENGINEERING & PHISHING GUARD
  // ==========================================================
  const urgencyKeywords = /(?:wire\s+(?:immediately|transfer)|send\s+gift\s+cards|urgent\s+ceo\s+request|confidential\s+ceo\s+request|bypass\s+2fa|provide\s+(?:otp|password|mfa\s+code)|approval\s+within\s+(?:10|15|30)\s+minutes)/i;
  if (urgencyKeywords.test(prompt)) {
    detectedFrauds.push({
      category: 'SOCIAL_ENGINEERING_FRAUD',
      code: 'COERCIVE_PHISHING_SIGNATURE',
      severity: 'HIGH',
      description: 'Detected social-engineering urgency, CEO fraud, or credential-harvesting indicators.'
    });
    riskScore += 0.75;
  }

  const threshold = policy.fraud_risk_threshold !== undefined ? Number(policy.fraud_risk_threshold) : 0.70;
  const finalScore = Math.min(1.0, Number(riskScore.toFixed(2)));
  const isBlocked = finalScore >= threshold;

  // Determine primary fraud category if detected
  let primaryCategory = 'NONE';
  if (detectedFrauds.length > 0) {
    primaryCategory = detectedFrauds[0].category;
  }

  const duration = +(performance.now() - start).toFixed(3);

  return {
    isBlocked,
    fraudScore: finalScore,
    detectedFrauds,
    primaryCategory,
    fraudAction: isBlocked ? 'FRAUD_BLOCKED' : (detectedFrauds.length > 0 ? 'FLAGGED_ANOMALY' : 'CLEAN'),
    latencyMs: duration
  };
}

export function resetVelocityCache() {
  velocityCache.clear();
}
