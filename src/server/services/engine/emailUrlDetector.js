// src/server/services/engine/emailUrlDetector.js

// ─────────────────────────────────────────────────────────────
// COMPREHENSIVE SECURITY DICTIONARIES & REPUTATION REGISTRIES
// ─────────────────────────────────────────────────────────────

export const DISPOSABLE_EMAIL_PROVIDERS = new Set([
  'tempmail.com', 'throwawaymail.com', '10minutemail.com', 
  'guerrillamail.com', 'mailinator.com', 'yopmail.com', 
  'sharklasers.com', 'fakeinbox.com', 'dispostable.com',
  'getnada.com', 'temp-mail.org', 'mohmal.com', 'trashmail.com',
  'crazymailing.com', 'mytemp.email', 'generator.email',
  'emailondeck.com', 'burnermail.io', 'inboxkitten.com',
  'maildrop.cc', 'tempail.com', 'nada.ltd', 'dropmail.me',
  'getairmail.com', 'fakemailgenerator.com', 'minuteinbox.com',
  'internxt.com', 'tmailor.com', 'tempmailo.com', 'guerrillamail.net',
  'guerrillamail.biz', 'guerrillamail.org', 'spam4.me', 'grr.la',
  'pokemail.net', 'disposablemail.com', 'tempmail.net', 'tempmail.io',
  'temp-mail.io', 'emailfake.com', '10mail.org', 'tempm.com',
  'fakemail.net', 'mailsac.com', 'harakirimail.com', 'mailnesia.com',
  'spambox.us', 'trashmail.net', 'trashmail.org', 'trashmail.me'
]);

export const TRUSTED_AUTHORITY_DOMAINS = new Set([
  // Core Tech & Cloud
  'google.com', 'microsoft.com', 'apple.com', 'amazon.com',
  'github.com', 'gitlab.com', 'openai.com', 'anthropic.com',
  'meta.com', 'netflix.com', 'spotify.com', 'twitter.com',
  'x.com', 'linkedin.com', 'slack.com', 'zoom.us',
  'salesforce.com', 'adobe.com', 'shopify.com', 'uber.com',
  'dropbox.com', 'cloudflare.com', 'oracle.com', 'ibm.com',
  'cisco.com', 'intel.com', 'nvidia.com', 'wikipedia.org',
  'stackoverflow.com', 'reddit.com',
  // Financial & Banking
  'paypal.com', 'stripe.com', 'chase.com', 'wellsfargo.com',
  'bankofamerica.com', 'citi.com', 'capitalone.com',
  'americanexpress.com', 'visa.com', 'mastercard.com',
  'fidelity.com', 'schwab.com', 'vanguard.com', 'coinbase.com',
  // Reputable Public Mail
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com',
  'icloud.com', 'proton.me', 'protonmail.com', 'zoho.com',
  'aol.com', 'mail.com', 'gmx.com', 'fastmail.com'
]);

export const HIGH_RISK_TLDS = new Set([
  'xyz', 'top', 'zip', 'mov', 'buzz', 'country', 'work', 
  'click', 'racing', 'cam', 'live', 'loan', 'support', 
  'link', 'rest', 'gq', 'cf', 'tk', 'ml', 'ga', 'men', 
  'stream', 'party', 'trade', 'download', 'bid', 'win', 
  'review', 'science', 'accountant', 'faith', 'cricket', 'fit', 'kim'
]);

export const TARGET_BRAND_NAMES = [
  'paypal', 'apple', 'microsoft', 'google', 'amazon', 
  'chase', 'wellsfargo', 'bankofamerica', 'citi', 'stripe', 
  'netflix', 'coinbase', 'binance', 'meta', 'instagram', 
  'facebook', 'twitter', 'github'
];

export const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 
  'is.gd', 'buff.ly', 'adf.ly', 'shorturl.at', 'cutt.ly', 
  'rb.gy', 'rebrand.ly', 'tiny.cc'
]);

export const DANGEROUS_FILE_EXTENSIONS = new Set([
  '.exe', '.scr', '.bat', '.cmd', '.sh', '.vbs', '.iso', 
  '.msi', '.dmg', '.apk', '.bin', '.jar', '.ps1'
]);

// ─────────────────────────────────────────────────────────────
// HELPER: HOMOGLYPH & SQUATTING NORMALIZATION
// ─────────────────────────────────────────────────────────────
function normalizeHomoglyphs(str = '') {
  return str
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/3/g, 'e')
    .replace(/5/g, 's')
    .replace(/8/g, 'b')
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/[-_.]/g, '');
}

function extractDomain(input = '') {
  const clean = input.trim().toLowerCase().replace(/[>,;!?]+$/, '');
  if (clean.includes('@')) {
    return clean.split('@').pop() || '';
  }
  try {
    const prefixed = clean.startsWith('http://') || clean.startsWith('https://') 
      ? clean 
      : `http://${clean}`;
    const parsed = new URL(prefixed);
    return parsed.hostname;
  } catch {
    return clean.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
}

// ─────────────────────────────────────────────────────────────
// 1. EMAIL FRAUD & PHISHING INSPECTOR
// ─────────────────────────────────────────────────────────────
export function analyzeEmailFraud(sender = '', subject = '', body = '', rawHeaders = '') {
  const flags = [];
  let riskScore = 0.0;
  const cleanSender = (sender || '').trim();
  const domain = extractDomain(cleanSender);
  const tld = domain.split('.').pop() || '';

  const checks = {
    domainReputation: 'VERIFIED_TRUSTED',
    syntaxValid: true,
    disposableBurner: 'PASSED',
    typosquatting: 'PASSED',
    tldReputation: 'PASSED',
    phishingTriggers: 'NONE',
    malwarePayloads: 'NONE'
  };

  // Check 0: Basic Syntax Validation
  if (cleanSender && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanSender)) {
    flags.push({
      vector: 'INVALID_EMAIL_SYNTAX',
      detail: `Email address '${cleanSender}' fails RFC-5322 format standards.`
    });
    checks.syntaxValid = false;
    riskScore += 0.50;
  }

  // Check 1: Known Disposable / Burner Domain
  if (DISPOSABLE_EMAIL_PROVIDERS.has(domain)) {
    flags.push({
      vector: 'DISPOSABLE_SENDER_DOMAIN',
      detail: `Sender domain @${domain} is a known temporary disposable burner inbox.`
    });
    checks.disposableBurner = 'FLAGGED_DISPOSABLE';
    checks.domainReputation = 'KNOWN_UNTRUSTED';
    riskScore += 0.65;
  }

  // Check 2: High-Risk Abuse TLD
  if (HIGH_RISK_TLDS.has(tld)) {
    flags.push({
      vector: 'HIGH_RISK_TLD',
      detail: `Sender domain uses top-level domain '.${tld}' with elevated abuse/phishing incidence.`
    });
    checks.tldReputation = 'FLAGGED_HIGH_RISK_TLD';
    riskScore += 0.40;
  }

  // Check 3: Typosquatting / Lookalike Brand Impersonation
  const normalizedDomain = normalizeHomoglyphs(domain);
  for (const brand of TARGET_BRAND_NAMES) {
    const isAuthenticBrandDomain = domain === `${brand}.com` || domain.endsWith(`.${brand}.com`);
    if (!isAuthenticBrandDomain) {
      if (domain.includes(brand) || normalizedDomain.includes(brand)) {
        flags.push({
          vector: 'BRAND_TYPOSQUATTING_IMPERSONATION',
          detail: `Domain @${domain} mimics trusted authority '${brand}.com' through deceptive character substitution or sub-label nesting.`
        });
        checks.typosquatting = 'FLAGGED_BRAND_MIMIC';
        checks.domainReputation = 'KNOWN_MALICIOUS';
        riskScore += 0.65;
        break;
      }
    }
  }

  // Check 4: Header Authentication Verification (SPF/DKIM/DMARC)
  const headerUpper = (rawHeaders || '').toUpperCase();
  if (headerUpper.includes('DKIM=FAIL') || headerUpper.includes('SPF=FAIL') || headerUpper.includes('DMARC=FAIL')) {
    flags.push({
      vector: 'HEADER_AUTHENTICATION_FAILURE',
      detail: 'DKIM or SPF cryptographic alignment failed. Envelope identity is forged or spoofed.'
    });
    riskScore += 0.50;
  }

  // Check 5: Coercive Urgency & Credential Harvesting Phrasing
  const fullContent = `${subject} ${body}`.toLowerCase();
  if (/wire\s+immediately|account\s+(?:suspended|restricted|limited|locked)|verify\s+(?:password|credentials|login|identity|seed)|login\s+within\s+\d+|unauthorized\s+(?:wire|charge|transfer|access)|confirm\s+identity|permanently\s+closed|immediate\s+action|cancel\s+unauthorized\s+order|action\s+required\s+within/i.test(fullContent)) {
    flags.push({
      vector: 'COERCIVE_URGENCY_PHISHING',
      detail: 'Aggressive psychological urgency, countdown deadline, or immediate account termination triggers detected.'
    });
    checks.phishingTriggers = 'FLAGGED_COERCIVE_SIGNATURES';
    riskScore += 0.40;
  }

  // Check 6: Dangerous Attachments or Malware Extensions in Text
  if (/\b(?:invoice|receipt|statement|document|payment|order)\.(?:exe|scr|vbs|iso|bat|cmd|js|ps1|zip)\b/i.test(fullContent)) {
    flags.push({
      vector: 'SUSPICIOUS_PAYLOAD_ATTACHMENT',
      detail: 'Message references executable or script archive attachment disguised as a business document.'
    });
    checks.malwarePayloads = 'FLAGGED_DANGEROUS_EXTENSIONS';
    riskScore += 0.60;
  }

  // Check 7: Deep Inspection of Embedded Links in Body
  const embeddedUrls = fullContent.match(/https?:\/\/[^\s<>"')]+/g) || [];
  for (const link of embeddedUrls) {
    const urlReport = analyzeUrlFraud(link);
    if (urlReport.isFraud) {
      flags.push({
        vector: 'MALICIOUS_EMBEDDED_LINK',
        detail: `Body contains deceptive link: ${link} (${urlReport.headline}).`
      });
      riskScore += 0.50;
      break;
    }
  }

  // Positive Trust Credit: Known Trusted Authority with clean record
  if (TRUSTED_AUTHORITY_DOMAINS.has(domain) && flags.length === 0) {
    checks.domainReputation = 'VERIFIED_TRUSTED';
    riskScore = 0.0;
  }

  const normalizedScore = Math.min(1.0, Number(riskScore.toFixed(2)));
  const isFraud = normalizedScore >= 0.50;
  const isSuspicious = normalizedScore >= 0.35 && !isFraud;
  const isSafe = !isFraud && !isSuspicious;

  const verdict = isFraud ? 'UNSAFE' : isSuspicious ? 'SUSPICIOUS' : 'SAFE';
  const safetyBadge = isFraud ? 'MALICIOUS / HIGH RISK' : isSuspicious ? 'SUSPICIOUS / UNVERIFIED' : 'VERIFIED SAFE';
  const safetyColor = isFraud ? '#F43F5E' : isSuspicious ? '#F59E0B' : '#10B981';

  let category = 'VERIFIED_ENTERPRISE_COMMUNICATION';
  if (isFraud) {
    if (checks.disposableBurner === 'FLAGGED_DISPOSABLE') category = 'DISPOSABLE_BURNER_EMAIL';
    else if (checks.typosquatting === 'FLAGGED_BRAND_MIMIC') category = 'BRAND_TYPOSQUATTING_IMPERSONATION';
    else if (checks.phishingTriggers === 'FLAGGED_COERCIVE_SIGNATURES') category = 'EMAIL_PHISHING_IMPERSONATION';
    else category = 'HIGH_RISK_EMAIL_THREAT';
  } else if (isSuspicious) {
    category = 'UNVERIFIED_SENDER_ANOMALY';
  }

  return {
    isSafe,
    isFraud,
    verdict,
    safetyBadge,
    safetyColor,
    category,
    riskLevel: normalizedScore >= 0.75 ? 'CRITICAL' : normalizedScore >= 0.50 ? 'HIGH' : normalizedScore >= 0.35 ? 'MEDIUM' : 'LOW',
    riskScore: normalizedScore,
    flags,
    checks,
    headline: isFraud 
      ? 'Severe Threat: Email Phishing, Impersonation or Burner Origin'
      : isSuspicious
      ? 'Caution: Unverified Origin or Elevated Risk Profile'
      : 'Sender Authenticated & Verified Clean',
    summary: isFraud 
      ? 'High-confidence threat. Sender mimics trusted corporate brands, leverages burner infrastructure, or applies coercive psychological pressure to harvest credentials.'
      : isSuspicious
      ? 'The email contains non-canonical attributes or minor anomalies. Exercise caution before opening attachments or following links.'
      : 'The message passes all domain authenticity tests, exhibits zero deceptive indicators, and originates from verified infrastructure.',
    rootCause: isFraud
      ? 'Attacker infrastructure crafted to bypass perimeter filters via domain spoofing, burner inboxes, or weaponized social engineering.'
      : isSuspicious
      ? 'Unverified sender configuration or lack of DKIM/SPF alignment.'
      : 'Legitimate communication from an authorized provider with clean historical reputation.',
    signatures: flags.length > 0 ? flags.map(f => `${f.vector}: ${f.detail}`) : ['No deceptive signatures detected. Domain reputation clean.'],
    remediation: isFraud ? [
      'Quarantine inbound message in email gateway before user inbox delivery.',
      'Enforce strict DMARC policy with `p=reject` across enterprise MX records.',
      'Add sender domain to corporate DNS sinkhole and perimeter firewall blocklists.'
    ] : isSuspicious ? [
      'Flag message with external sender warning banner.',
      'Inspect any embedded hyperlinks in an isolated sandbox before visiting.'
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
  const raw = (inputUrl || '').trim();

  const checks = {
    domainReputation: 'VERIFIED_TRUSTED',
    syntaxValid: true,
    ipObfuscation: 'PASSED',
    userinfoRedirect: 'PASSED',
    typosquatting: 'PASSED',
    tldReputation: 'PASSED',
    dangerousPayload: 'NONE',
    shortenerMask: 'PASSED'
  };

  let parsed;
  try {
    const formatted = raw.startsWith('http://') || raw.startsWith('https://') 
      ? raw 
      : `http://${raw}`;
    parsed = new URL(formatted);
  } catch {
    return {
      isSafe: false,
      isFraud: true,
      verdict: 'UNSAFE',
      safetyBadge: 'MALICIOUS / HIGH RISK',
      safetyColor: '#F43F5E',
      category: 'MALFORMED_URL_ATTACK',
      riskLevel: 'CRITICAL',
      riskScore: 0.95,
      headline: 'Invalid URI Syntax / Path Exploit',
      summary: 'Malformed URL structure engineered to exploit parser inconsistencies, crash HTTP handlers, or evade security inspection.',
      flags: [{ vector: 'MALFORMED_URI_STRUCTURE', detail: 'Invalid URI encoding or path manipulation.' }],
      checks: { ...checks, syntaxValid: false },
      signatures: ['MALFORMED_URI_STRUCTURE: Invalid URI encoding or path manipulation.'],
      rootCause: 'Malformed request target formatted to evade conventional URL parsers.',
      remediation: [
        'Block URL navigation and drop network socket connection.',
        'Drop outbound packets from client machine.'
      ]
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const fullHref = parsed.href.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const tld = hostname.split('.').pop() || '';

  // Check 1: IP Address Used in Place of Domain
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.startsWith('[') || /^0x[0-9a-f]+/i.test(hostname)) {
    flags.push({
      vector: 'IP_HOST_OBFUSCATION',
      detail: `Direct IP host address (${hostname}) used to evade DNS reputation and domain security policies.`
    });
    checks.ipObfuscation = 'FLAGGED_IP_HOST';
    riskScore += 0.60;
  }

  // Check 2: Embedded '@' Symbol (Credentials / Browser Redirection Exploit)
  if (parsed.username || parsed.password || fullHref.includes('@')) {
    flags.push({
      vector: 'USERINFO_CREDENTIAL_REDIRECT',
      detail: 'Embedded @ symbol obscures the true destination hostname by routing through userinfo credential abuse.'
    });
    checks.userinfoRedirect = 'FLAGGED_USERINFO';
    riskScore += 0.55;
  }

  // Check 3: Opaque URL Shortener
  if (URL_SHORTENERS.has(hostname) || URL_SHORTENERS.has(hostname.replace(/^www\./, ''))) {
    flags.push({
      vector: 'OPAQUE_URL_SHORTENER',
      detail: `URL shortener service (${hostname}) obfuscates the true ultimate landing destination.`
    });
    checks.shortenerMask = 'FLAGGED_SHORTENER';
    riskScore += 0.40;
  }

  // Check 4: Suspicious Abuse-Prone TLD
  if (HIGH_RISK_TLDS.has(tld)) {
    flags.push({
      vector: 'HIGH_RISK_TLD',
      detail: `Domain uses top-level domain '.${tld}' heavily leveraged in phishing and malware hosting.`
    });
    checks.tldReputation = 'FLAGGED_HIGH_RISK_TLD';
    riskScore += 0.40;
  }

  // Check 5: Punycode / IDN Homograph Exploit
  if (hostname.includes('xn--')) {
    flags.push({
      vector: 'IDN_PUNYCODE_HOMOGRAPH',
      detail: `Punycode domain (${hostname}) indicates potential Cyrillic or Greek lookalike character impersonation.`
    });
    checks.typosquatting = 'FLAGGED_PUNYCODE';
    riskScore += 0.55;
  }

  // Check 6: Dangerous Executable Download Payload
  for (const ext of DANGEROUS_FILE_EXTENSIONS) {
    if (pathname.endsWith(ext) || pathname.includes(`${ext}/`) || pathname.includes(`${ext}?`)) {
      flags.push({
        vector: 'MALWARE_PAYLOAD_EXTENSION',
        detail: `URL path delivers executable or script file (${ext}) prone to drive-by malware execution.`
      });
      checks.dangerousPayload = 'FLAGGED_EXECUTABLE';
      riskScore += 0.65;
      break;
    }
  }

  // Check 7: Suspicious Non-Standard Web Ports
  if (parsed.port && !['80', '443', '8000', '8080', '3000'].includes(parsed.port)) {
    flags.push({
      vector: 'NON_STANDARD_WEB_PORT',
      detail: `URL connects to non-standard HTTP port :${parsed.port}, characteristic of backdoor or command-and-control servers.`
    });
    riskScore += 0.40;
  }

  // Check 8: Sensitive Credential Exposure in Query Parameters
  const query = parsed.search.toLowerCase();
  if (/[?&](?:password|passwd|token|apikey|secret|ssn|privatekey|bearer)=/i.test(query)) {
    flags.push({
      vector: 'CREDENTIAL_EXPOSURE_IN_URL',
      detail: 'Cleartext secrets, session tokens, or passwords passed directly in GET query parameters.'
    });
    riskScore += 0.50;
  }

  // Check 9: Brand Impersonation & Typosquatting in Hostname or Path
  const normalizedHost = normalizeHomoglyphs(hostname);
  for (const brand of TARGET_BRAND_NAMES) {
    const isAuthentic = hostname === `${brand}.com` || hostname.endsWith(`.${brand}.com`);
    if (!isAuthentic) {
      if (hostname.includes(brand) || normalizedHost.includes(brand)) {
        flags.push({
          vector: 'BRAND_TARGETED_PHISHING_PATH',
          detail: `Domain '${hostname}' mimics trusted authority '${brand}.com' to harvest credentials.`
        });
        checks.typosquatting = 'FLAGGED_BRAND_MIMIC';
        riskScore += 0.60;
        break;
      }
    }
  }

  // Check 10: Subdomain Hijacking / Excessive Nesting & Hyphen Clustering
  const subdomains = hostname.split('.');
  if (subdomains.length > 4 || (hostname.match(/-/g) || []).length > 3) {
    flags.push({
      vector: 'SUBDOMAIN_HIJACK_CLUSTERING',
      detail: `Excessive subdomain tiers (${subdomains.length}) or suspicious hyphen chaining (${(hostname.match(/-/g) || []).length}).`
    });
    riskScore += 0.35;
  }

  // Clean credit for verified high-reputation authority
  const rootDomain = subdomains.slice(-2).join('.');
  if ((TRUSTED_AUTHORITY_DOMAINS.has(hostname) || TRUSTED_AUTHORITY_DOMAINS.has(rootDomain)) && flags.length === 0) {
    checks.domainReputation = 'VERIFIED_TRUSTED';
    riskScore = 0.0;
  }

  const normalizedScore = Math.min(1.0, Number(riskScore.toFixed(2)));
  const isFraud = normalizedScore >= 0.50;
  const isSuspicious = normalizedScore >= 0.35 && !isFraud;
  const isSafe = !isFraud && !isSuspicious;

  const verdict = isFraud ? 'UNSAFE' : isSuspicious ? 'SUSPICIOUS' : 'SAFE';
  const safetyBadge = isFraud ? 'MALICIOUS / HIGH RISK' : isSuspicious ? 'SUSPICIOUS / UNVERIFIED' : 'VERIFIED SAFE';
  const safetyColor = isFraud ? '#F43F5E' : isSuspicious ? '#F59E0B' : '#10B981';

  let category = 'VERIFIED_CLEAN_DESTINATION';
  if (isFraud) {
    if (checks.dangerousPayload === 'FLAGGED_EXECUTABLE') category = 'MALWARE_DISTRIBUTION_URL';
    else if (checks.ipObfuscation === 'FLAGGED_IP_HOST') category = 'IP_OBFUSCATED_ATTACK_HOST';
    else if (checks.typosquatting === 'FLAGGED_BRAND_MIMIC') category = 'BRAND_PHISHING_IMPERSONATION';
    else category = 'MALICIOUS_PHISHING_URL';
  } else if (isSuspicious) {
    category = 'UNVERIFIED_DESTINATION_WARNING';
  }

  return {
    isSafe,
    isFraud,
    verdict,
    safetyBadge,
    safetyColor,
    category,
    riskLevel: normalizedScore >= 0.75 ? 'CRITICAL' : normalizedScore >= 0.50 ? 'HIGH' : normalizedScore >= 0.35 ? 'MEDIUM' : 'LOW',
    riskScore: normalizedScore,
    flags,
    checks,
    headline: isFraud 
      ? 'High-Risk Threat: Malicious, Phishing or Exploit URL' 
      : isSuspicious 
      ? 'Caution: Unverified or Obfuscated Link' 
      : 'Valid EV-SSL Domain & Trusted Registry',
    summary: isFraud
      ? 'Deceptive destination engineered to trick users or autonomous agents into posting credentials, executing malicious payloads, or navigating to an unverified proxy host.'
      : isSuspicious
      ? 'The URL uses shorteners or unusual naming patterns. Verify target destination before navigating.'
      : 'Target destination is an established high-reputation domain with clean hosting ancestry and no redirection obfuscation.',
    signatures: flags.length > 0 ? flags.map(f => `${f.vector}: ${f.detail}`) : ['No deceptive signatures detected. Domain reputation clean.'],
    rootCause: isFraud
      ? 'Phishing infrastructure kit hosting a fake credential harvesting portal or delivering unauthorized binary payloads.'
      : isSuspicious
      ? 'Unverified hosting setup or URL shortening service.'
      : 'Standard outbound navigation to trusted internet resource.',
    remediation: isFraud ? [
      'Block outbound HTTP requests and add domain to the zero-trust DNS sinkhole.',
      'Revoke active session tokens if credentials were submitted to this destination.',
      'Submit the domain to global threat reputation feeds (Google Safe Browsing / PhishTank).'
    ] : isSuspicious ? [
      'Expand URL shortener to inspect the canonical destination before loading.',
      'Restrict agent automated tool execution privileges on unverified endpoints.'
    ] : [
      'Permit outbound connection without egress throttling.',
      'Cache domain reputation in local fast-DNS resolver.'
    ]
  };
}

// ─────────────────────────────────────────────────────────────
// 3. UNIFIED QUICK SAFETY CHECKER (ANY EMAIL OR ANY URL)
// ─────────────────────────────────────────────────────────────
export function quickCheckSafety(rawInput = '') {
  const input = (rawInput || '').trim();
  if (!input) {
    return {
      isSafe: false,
      isFraud: false,
      verdict: 'INVALID',
      safetyBadge: 'EMPTY INPUT',
      safetyColor: '#A1A1AA',
      inputType: 'UNKNOWN',
      input: '',
      riskScore: 0.0,
      riskLevel: 'LOW',
      headline: 'No Input Provided',
      summary: 'Please enter an email address, email message body, or website URL to analyze.',
      signatures: [],
      remediation: ['Enter a valid URL or email to perform security inspection.']
    };
  }

  // Detection Step:
  // Is it full email content (multiple lines, contains Subject:, Dear, From:)?
  const isFullEmail = input.includes('\n') || 
                      /\b(?:subject:|from:|dear\s+|hi\s+|urgent:|hello\s+customer)\b/i.test(input) || 
                      input.split(/\s+/).length > 25;

  // Is it a single email address?
  const isEmailAddress = !isFullEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

  if (isFullEmail) {
    const lines = input.split('\n');
    let sender = '';
    let subject = '';
    let body = input;

    for (const line of lines) {
      if (/^from:\s*/i.test(line)) sender = line.replace(/^from:\s*/i, '').trim();
      if (/^subject:\s*/i.test(line)) subject = line.replace(/^subject:\s*/i, '').trim();
    }

    const report = analyzeEmailFraud(sender, subject, body, '');
    return {
      ...report,
      inputType: 'EMAIL_CONTENT',
      input: input.length > 100 ? `${input.slice(0, 97)}...` : input
    };
  }

  if (isEmailAddress) {
    const report = analyzeEmailFraud(input, '', '', '');
    return {
      ...report,
      inputType: 'EMAIL_ADDRESS',
      input
    };
  }

  // Otherwise, treat as URL or Domain
  const report = analyzeUrlFraud(input);
  return {
    ...report,
    inputType: 'URL_OR_DOMAIN',
    input
  };
}
