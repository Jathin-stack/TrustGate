// test_quick_check.js - Automated Verification of Unified Email & URL Safety Checker
const BASE_URL = 'http://localhost:5000';

const TEST_CASES = [
  // ── Emails ──
  {
    name: 'Safe Corporate Email (Apple)',
    input: 'developer@apple.com',
    expectedSafe: true,
    expectedVerdict: 'SAFE'
  },
  {
    name: 'Safe Public Mail (Gmail)',
    input: 'jathin.dev@gmail.com',
    expectedSafe: true,
    expectedVerdict: 'SAFE'
  },
  {
    name: 'Disposable Burner Email (tempmail)',
    input: 'fraudster@tempmail.com',
    expectedSafe: false,
    expectedVerdict: 'UNSAFE'
  },
  {
    name: 'Disposable Burner Email (guerrillamail)',
    input: 'attacker@guerrillamail.com',
    expectedSafe: false,
    expectedVerdict: 'UNSAFE'
  },
  {
    name: 'Homoglyph Phishing Email (paypa1)',
    input: 'support@paypa1-security.xyz',
    expectedSafe: false,
    expectedVerdict: 'UNSAFE'
  },
  {
    name: 'Full Phishing Email Message',
    input: 'From: alert@paypal-verify.xyz\nSubject: URGENT: Account Suspended\nDear user, your wire transfer of $2,400 failed. Verify your password within 15 minutes: http://192.168.1.1/login.php',
    expectedSafe: false,
    expectedVerdict: 'UNSAFE'
  },

  // ── URLs ──
  {
    name: 'Safe Authority URL (Google)',
    input: 'https://google.com',
    expectedSafe: true,
    expectedVerdict: 'SAFE'
  },
  {
    name: 'Safe Repository URL (GitHub)',
    input: 'https://github.com/Jathin-stack/TrustGate',
    expectedSafe: true,
    expectedVerdict: 'SAFE'
  },
  {
    name: 'Safe Domain without scheme (stripe.com)',
    input: 'stripe.com/docs/api',
    expectedSafe: true,
    expectedVerdict: 'SAFE'
  },
  {
    name: 'Malicious IP Host Obfuscation',
    input: 'http://192.168.1.104/login.php',
    expectedSafe: false,
    expectedVerdict: 'UNSAFE'
  },
  {
    name: 'Phishing Brand Mimicry & Abuse TLD',
    input: 'https://paypal-account-verify.xyz/account/login',
    expectedSafe: false,
    expectedVerdict: 'UNSAFE'
  },
  {
    name: 'Malware Drive-By Executable Download',
    input: 'https://free-installer-tools.net/antivirus_update.exe',
    expectedSafe: false,
    expectedVerdict: 'UNSAFE'
  },
  {
    name: 'Opaque URL Shortener (bit.ly)',
    input: 'https://bit.ly/secure-login-3819',
    expectedSafe: false,
    expectedVerdict: 'SUSPICIOUS'
  }
];

async function runTests() {
  console.log('================================================================');
  console.log('🛡️  TRUSTGATE UNIFIED EMAIL & URL SAFETY CHECKER VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  for (const tc of TEST_CASES) {
    total++;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/fraud/quick-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: tc.input })
      });

      const data = await res.json();
      const report = data.report;

      const verdictMatches = report.verdict === tc.expectedVerdict;
      const safeMatches = report.isSafe === tc.expectedSafe;

      console.log(`[TEST ${total}] ${tc.name}`);
      console.log(`  Input: ${tc.input.length > 50 ? tc.input.slice(0, 47) + '...' : tc.input}`);
      console.log(`  Input Type: ${report.inputType}`);
      console.log(`  Verdict: ${report.verdict} (Badge: ${report.safetyBadge})`);
      console.log(`  Risk Score: ${report.riskScore} (${report.riskLevel})`);
      console.log(`  Category: ${report.category}`);
      console.log(`  Signatures: ${report.signatures?.join('; ') || 'None'}`);

      if (verdictMatches && safeMatches) {
        console.log(`  ✅ PASSED: Accurately determined as ${report.verdict}\n`);
        passed++;
      } else {
        console.error(`  ❌ FAILED: Expected ${tc.expectedVerdict} (isSafe: ${tc.expectedSafe}), got ${report.verdict} (isSafe: ${report.isSafe})\n`);
      }
    } catch (err) {
      console.error(`  ❌ ERROR for ${tc.name}: ${err.message}\n`);
    }
  }

  console.log('================================================================');
  console.log(`=== SUMMARY: ${passed}/${total} SAFETY CHECKS PASSED ===`);
  if (passed === total) {
    console.log('🎉 ALL EMAIL & URL SAFETY DECISION CHECKS VERIFIED 100%!');
  } else {
    process.exit(1);
  }
}

runTests();
