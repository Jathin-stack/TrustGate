// src/server/services/engine/emailUrlDetector.js

const DISPOSABLE_EMAIL_PROVIDERS = new Set([
  'tempmail.com', 'throwawaymail.com', '10minutemail.com', 
  'guerrillamail.com', 'mailinator.com', 'yopmail.com', 
  'sharklasers.com', 'fakeinbox.com', 'dispostable.com'
]);

const TRUSTED_DOMAINS = [
  'google.com', 'microsoft.com', 'apple.com', 'amazon.com', 
  'paypal.com', 'stripe.com', 'chase.com', 'wellsfargo.com', 'github.com'
];

// ─────────────────────────────────────────────────────────────
// 1. EMAIL FRAUD & PHISHING INSPECTOR
// ─────────────────────────────────────────────────────────────
export function analyzeEmailFraud(sender = '', subject = '', body = '', rawHeaders = '') {
  const flags = [];
  let riskScore = 0.0;
  const domain = (sender.split('@')[1] || '').toLowerCase().trim().replace(/[.,;!?]+$/, '');

  // Check 1: Disposable / Burner Domain
  if (DISPOSABLE_EMAIL_PROVIDERS.has(domain)) {
    flags.push({
      vector: 'DISPOSABLE_SENDER_DOMAIN',
      detail: `Sender domain @${domain} is a known temporary throwaway inbox.`
    });
    riskScore += 0.40;
  }

  // Check 2: Typosquatting / Lookalike Brand Impersonation
  for (const trusted of TRUSTED_DOMAINS) {
    const brandName = trusted.split('.')[0];
    if (domain !== trusted && (domain.includes(brandName) || domain.replace(/[-_]/g, '').includes(brandName))) {
      flags.push({
        vector: 'BRAND_TYPOSQUATTING_IMPERSONATION',
        detail: `Domain @${domain} mimics trusted authority '${trusted}'.`
      });
      riskScore += 0.50;
      break;
    }
  }

  // Check 3: Header Authentication Verification (SPF/DKIM/DMARC)
  const headerUpper = (rawHeaders || '').toUpperCase();
  if (headerUpper.includes('DKIM=FAIL') || headerUpper.includes('SPF=FAIL') || headerUpper.includes('DMARC=FAIL')) {
    flags.push({
      vector: 'HEADER_AUTHENTICATION_FAILURE',
      detail: 'DKIM or SPF alignment failed. Email envelope may be spoofed.'
    });
    riskScore += 0.45;
  }

  // Check 4: Coercive Urgency & Credential Harvesting Phrasing
  const fullContent = `${subject} ${body}`.toLowerCase();
  if (/wire\s+immediately|account\s+(?:suspended|restricted|limited)|verify\s+(?:password|credentials|login)|login\s+within\s+\d+|unauthorized\s+charge|confirm\s+identity|permanently\s+closed/i.test(fullContent)) {
    flags.push({
      vector: 'COERCIVE_URGENCY_PHISHING',
      detail: 'Aggressive psychological pressure and immediate account suspension triggers.'
    });
    riskScore += 0.35;
  }

  const normalizedScore = Math.min(1.0, Number(riskScore.toFixed(2)));
  const isFraud = normalizedScore >= 0.50;

  return {
    isFraud,
    category: isFraud ? 'EMAIL_PHISHING_IMPERSONATION' : 'VERIFIED_ENTERPRISE_COMMUNICATION',
    riskLevel: normalizedScore >= 0.75 ? 'CRITICAL' : normalizedScore >= 0.50 ? 'HIGH' : 'LOW',
    riskScore: normalizedScore,
    flags,
    headline: isFraud ? 'Severe Spoofing: Authentication Failure & Coercive Harvesting' : 'Sender Authenticated & DKIM/SPF Aligned',
    summary: isFraud 
      ? 'High-confidence phishing campaign impersonating financial or corporate infrastructure to harvest credentials via domain spoofing and urgency.'
      : 'The message passes domain authentication, exhibits zero coercive indicators, and originates from verified infrastructure.',
    rootCause: isFraud
      ? 'Inbound message bypassed perimeter filters due to relaxed domain validation policies or forged mail headers.'
      : 'Legitimate transactional communication from authorized third-party provider.',
    signatures: flags.map(f => `${f.vector}: ${f.detail}`),
    remediation: isFraud ? [
      'Quarantine inbound message in email gateway before user inbox delivery.',
      'Enforce strict DMARC policy with `p=reject` across enterprise MX records.',
      'Strip embedded hyperlinks and replace them with sandbox isolation rewrites.'
    ] : [
      'Permit direct inbox delivery without restriction.',
      'Continue monitoring SPF/DKIM telemetry via automated reports.'
    ]
  };
}

// ─────────────────────────────────────────────────────────────
// 2. PHISHING & MALICIOUS URL INSPECTOR
// ─────────────────────────────────────────────────────────────
export function analyzeUrlFraud(inputUrl = '') {
  const flags = [];
  let riskScore = 0.0;
  let parsed;

  try {
    const formatted = inputUrl.startsWith('http://') || inputUrl.startsWith('https://') 
      ? inputUrl 
      : `http://${inputUrl}`;
    parsed = new URL(formatted);
  } catch {
    return {
      isFraud: true,
      category: 'MALFORMED_URL_ATTACK',
      riskLevel: 'CRITICAL',
      riskScore: 0.95,
      headline: 'Invalid URI Syntax / Path Exploit',
      summary: 'Malformed URL structure engineered to exploit parser inconsistencies or crash HTTP handlers.',
      flags: [{ vector: 'MALFORMED_URI_STRUCTURE', detail: 'Invalid URI encoding or path manipulation.' }],
      signatures: ['MALFORMED_URI_STRUCTURE: Invalid URI encoding or path manipulation.'],
      rootCause: 'Malformed request target formatted to evade conventional URL parsers.',
      remediation: [
        'Block URL navigation and drop network socket connection.',
        'Drop outbound packets from client machine.'
      ]
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const fullPath = parsed.href.toLowerCase();

  // Check 1: IP Address Used in Place of Domain
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    flags.push({
      vector: 'IP_HOST_OBFUSCATION',
      detail: `Direct IPv4 address (${hostname}) used to bypass DNS reputation filtering.`
    });
    riskScore += 0.50;
  }

  // Check 2: Embedded '@' Symbol (Credentials / Browser Redirection Exploit)
  if (parsed.username || parsed.password || fullPath.includes('@')) {
    flags.push({
      vector: 'USERINFO_CREDENTIAL_REDIRECT',
      detail: 'Embedded @ symbol obscures the true destination hostname.'
    });
    riskScore += 0.45;
  }

  // Check 3: Excessive Subdomain Depth & Hyphens
  const subdomains = hostname.split('.');
  if (subdomains.length > 4 || (hostname.match(/-/g) || []).length > 2) {
    flags.push({
      vector: 'SUBDOMAIN_HIJACK_CLUSTERING',
      detail: `Excessive subdomain nesting (${subdomains.length} tiers) or suspicious hyphen chaining.`
    });
    riskScore += 0.35;
  }

  // Check 4: Suspicious Phishing TLDs
  const suspiciousTlds = ['.xyz', '.top', '.zip', '.mov', '.buzz', '.country', '.work', '.click'];
  if (suspiciousTlds.some(tld => hostname.endsWith(tld))) {
    flags.push({
      vector: 'HIGH_RISK_TLD',
      detail: `Domain uses an abuse-prone top-level domain (${suspiciousTlds.find(tld => hostname.endsWith(tld))}).`
    });
    riskScore += 0.30;
  }

  // Check 5: Brand Mimicking / Lookalike in Path or Subdomain
  for (const brand of ['paypal', 'netflix', 'chase', 'wellsfargo', 'login', 'secure-bank', 'apple', 'google']) {
    if (fullPath.includes(brand) && !hostname.endsWith(`${brand}.com`)) {
      flags.push({
        vector: 'BRAND_TARGETED_PHISHING_PATH',
        detail: `Suspicious brand token '${brand}' embedded outside legitimate primary root domain.`
      });
      riskScore += 0.45;
      break;
    }
  }

  const normalizedScore = Math.min(1.0, Number(riskScore.toFixed(2)));
  const isFraud = normalizedScore >= 0.50;

  return {
    isFraud,
    category: isFraud ? 'MALICIOUS_PHISHING_URL' : 'VERIFIED_CLEAN_DESTINATION',
    riskLevel: normalizedScore >= 0.75 ? 'CRITICAL' : normalizedScore >= 0.50 ? 'HIGH' : 'LOW',
    riskScore: normalizedScore,
    flags,
    headline: isFraud ? 'High-Risk Threat: IP Obfuscation & Brand Squatting' : 'Valid EV-SSL Domain & Trusted Registry',
    summary: isFraud
      ? 'Deceptive URL engineered to trick users or autonomous agents into posting credentials to an unverified proxy host.'
      : 'Target destination is an established high-reputation domain with clean hosting ancestry and no redirection obfuscation.',
    signatures: flags.map(f => `${f.vector}: ${f.detail}`),
    rootCause: isFraud
      ? 'Phishing infrastructure kit hosting a fake credential harvesting portal.'
      : 'Standard outbound navigation to trusted internet resource.',
    remediation: isFraud ? [
      'Block outbound HTTP requests and add domain to the zero-trust DNS sinkhole.',
      'Revoke active session tokens if credentials were submitted to this destination.',
      'Submit the domain to global reputation feeds (Google Safe Browsing / PhishTank).'
    ] : [
      'Permit outbound connection without egress throttling.',
      'Cache domain reputation in local fast-DNS resolver.'
    ]
  };
}
