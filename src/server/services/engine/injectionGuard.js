import { performance } from 'perf_hooks';
import { runSemanticSecurityCheck, ai } from '../gemini.js';

// Pre-compiled heuristic rules for ultra-low latency detection (< 2ms)
const INJECTION_HEURISTICS = [
  {
    type: 'ROLE_OVERRIDE',
    weight: 0.85,
    regex: /(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|prior|above|system)\s+(?:instructions|prompts|rules|commands|directives)/i,
    description: 'Direct command to disregard system instructions'
  },
  {
    type: 'JAILBREAK',
    weight: 0.95,
    regex: /\b(?:dan\s+mode|do\s+anything\s+now|jailbreak(?:ed)?|developer\s+mode\s+enabled|always\s+say\s+yes|unfiltered\s+mode|unrestricted\s+mode)\b/i,
    description: 'Known DAN / jailbreak persona bypass invocation'
  },
  {
    type: 'ROLE_OVERRIDE',
    weight: 0.80,
    regex: /(?:you\s+are\s+no\s+longer|from\s+now\s+on\s+you\s+are|act\s+as\s+an\s+unfiltered|pretend\s+you\s+have\s+no\s+rules|roleplay\s+as\s+an\s+evil)/i,
    description: 'Adversarial persona hijacking'
  },
  {
    type: 'DELIMITER_COLLISION',
    weight: 0.90,
    regex: /(?:<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<<SYS>>|<\/SYS>>|---BEGIN SYSTEM---|---END SYSTEM---|<system>|<\/system>)/i,
    description: 'Model prompt delimiter injection / token collision'
  },
  {
    type: 'DATA_EXTRACTION',
    weight: 0.85,
    regex: /(?:repeat|print|reveal|output|display|show|leak)\s+(?:the\s+)?(?:system\s+prompt|initial\s+instructions|system\s+instructions|core\s+prompt|hidden\s+rules)/i,
    description: 'System prompt extraction or leakage attempt'
  },
  {
    type: 'DATA_EXTRACTION',
    weight: 0.80,
    regex: /!\[.*?\]\(https?:\/\/[^\s)]+\?(?:data|leak|token|secret|q)=.*?\)/i,
    description: 'Markdown image exfiltration payload'
  },
  {
    type: 'OBFUSCATION_EVASION',
    weight: 0.75,
    regex: /(?:decode\s+(?:the\s+following\s+)?(?:base64|rot13|hex)|atob\(|eval\(Buffer\.from)/i,
    description: 'Encoded payload unpacking / obfuscation execution'
  }
];

/**
 * Evaluates an inbound prompt for injection attacks, jailbreaks, and adversarial exploits.
 * Combines fast deterministic heuristic analysis (< 20ms) with optional semantic LLM verification.
 *
 * @param {string} promptText - The prompt to inspect
 * @param {number} confidenceThreshold - Policy threshold (0.0 - 1.0)
 * @param {boolean} enableSemanticCheck - Whether to query Gemini for ambiguous cases
 * @returns {Promise<object>} Inspection verdict and telemetry
 */
export async function evaluatePromptSecurity(promptText, confidenceThreshold = 0.75, enableSemanticCheck = true) {
  const start = performance.now();

  if (!promptText || typeof promptText !== 'string') {
    return {
      detected: false,
      threatTypes: [],
      confidence: 0,
      riskLevel: 'INFO',
      reasoning: 'Empty or non-string input.',
      latencyMs: +(performance.now() - start).toFixed(3),
      method: 'HEURISTIC'
    };
  }

  const matchedThreats = [];
  let maxWeight = 0;
  const detectedTypes = new Set();

  for (const rule of INJECTION_HEURISTICS) {
    if (rule.regex.test(promptText)) {
      matchedThreats.push(rule.description);
      detectedTypes.add(rule.type);
      if (rule.weight > maxWeight) {
        maxWeight = rule.weight;
      }
    }
  }

  // Fast-path deterministic evaluation
  if (maxWeight >= confidenceThreshold) {
    const riskLevel = maxWeight >= 0.85 ? 'CRITICAL' : 'HIGH';
    const duration = +(performance.now() - start).toFixed(3);

    return {
      detected: true,
      threatTypes: Array.from(detectedTypes),
      confidence: +maxWeight.toFixed(2),
      riskLevel,
      reasoning: `Deterministic heuristic match: ${matchedThreats.join('; ')}`,
      latencyMs: duration,
      method: 'HEURISTIC_DETERMINISTIC'
    };
  }

  // Intermediate suspicion: If score is borderline (e.g. 0.35 - 0.74) and semantic check is permitted & available
  const isSuspicious = maxWeight >= 0.35 || /system|bypass|admin|root|jailbreak|unrestricted/i.test(promptText);

  if (isSuspicious && enableSemanticCheck && ai) {
    try {
      const semanticResult = await runSemanticSecurityCheck(promptText);
      const duration = +(performance.now() - start).toFixed(3);

      const finalScore = Math.max(maxWeight, semanticResult.confidence_score || 0);
      const isBreached = semanticResult.threat_detected && (finalScore >= confidenceThreshold);

      return {
        detected: isBreached,
        threatTypes: isBreached ? (semanticResult.threat_types || ['PROMPT_INJECTION']) : [],
        confidence: +finalScore.toFixed(2),
        riskLevel: isBreached ? (semanticResult.risk_level || 'HIGH') : 'LOW',
        reasoning: semanticResult.reasoning || 'Semantic kernel validation.',
        latencyMs: duration,
        method: 'SEMANTIC_GEMINI_AI'
      };
    } catch (err) {
      // Graceful fallback to heuristic evaluation if API timed out or errored
      const duration = +(performance.now() - start).toFixed(3);
      const isBreached = maxWeight >= confidenceThreshold;

      return {
        detected: isBreached,
        threatTypes: isBreached ? Array.from(detectedTypes) : [],
        confidence: +maxWeight.toFixed(2),
        riskLevel: isBreached ? 'HIGH' : 'LOW',
        reasoning: `Heuristic evaluation fallback (${err.message}): ${matchedThreats.join('; ') || 'No critical patterns'}`,
        latencyMs: duration,
        method: 'HEURISTIC_FALLBACK'
      };
    }
  }

  // Clean prompt passed all heuristic gates
  const duration = +(performance.now() - start).toFixed(3);
  return {
    detected: false,
    threatTypes: [],
    confidence: +maxWeight.toFixed(2),
    riskLevel: 'LOW',
    reasoning: 'Input passed all local heuristic and zero-trust safety checks.',
    latencyMs: duration,
    method: 'HEURISTIC_CLEAR'
  };
}
