// test_email_url_fraud.js - Automated Verification of Email & Phishing URL Fraud Detectors
const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== STARTING EMAIL & URL FRAUD RADAR TESTS ===\n');

  let passed = 0;
  let total = 0;

  // Test 1: Email Phishing Detection
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/fraud/email/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: 'security-alert@paypal-account-verify.xyz',
        subject: 'URGENT: Unauthorized wire transaction detected — Confirm identity',
        body: 'Dear customer, an unauthorized transfer was detected. Log in within 15 minutes or your account will be permanently closed.',
        rawHeaders: 'Received-SPF: fail; DKIM=fail (d=badactor.xyz); DMARC=fail'
      })
    });

    const data = await res.json();
    console.log('[TEST 1] Email Fraud - Brand Typosquat & Coercive Phishing');
    console.log(`  HTTP: ${res.status}`);
    console.log(`  isFraud: ${data.report?.isFraud}`);
    console.log(`  Risk Score: ${data.report?.riskScore}`);
    console.log(`  Risk Level: ${data.report?.riskLevel}`);
    console.log(`  Flags: ${data.report?.flags?.map(f => f.vector).join(', ')}`);

    if (res.status === 200 && data.report?.isFraud === true && data.report?.riskScore >= 0.75) {
      console.log('  ✅ PASSED: Correctly identified as CRITICAL email phishing fraud\n');
      passed++;
    } else {
      console.error('  ❌ FAILED\n');
    }
  } catch (err) {
    console.error(`  ❌ ERROR: ${err.message}\n`);
  }

  // Test 2: Clean Enterprise Email
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/fraud/email/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: 'billing@stripe.com',
        subject: 'Your monthly invoice receipt #INV-2026-8812',
        body: 'Hi Jathin, your monthly invoice for October 2026 is ready. You can review your transaction history in the Stripe Dashboard anytime.',
        rawHeaders: 'Received-SPF: pass (stripe.com); DKIM=pass (stripe.com); DMARC=pass'
      })
    });

    const data = await res.json();
    console.log('[TEST 2] Email Fraud - Legitimate Enterprise Communication');
    console.log(`  HTTP: ${res.status}`);
    console.log(`  isFraud: ${data.report?.isFraud}`);
    console.log(`  Risk Score: ${data.report?.riskScore}`);
    console.log(`  Category: ${data.report?.category}`);

    if (res.status === 200 && data.report?.isFraud === false && data.report?.riskScore < 0.20) {
      console.log('  ✅ PASSED: Correctly verified as clean enterprise email\n');
      passed++;
    } else {
      console.error('  ❌ FAILED\n');
    }
  } catch (err) {
    console.error(`  ❌ ERROR: ${err.message}\n`);
  }

  // Test 3: Malicious Phishing URL with IP obfuscation and @ delimiter
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/fraud/url/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'http://192.168.1.104/login-chase-portal.com@auth-verify.xyz/account/login.php'
      })
    });

    const data = await res.json();
    console.log('[TEST 3] URL Fraud - IP Obfuscation + @ Delimiter + Abuse TLD');
    console.log(`  HTTP: ${res.status}`);
    console.log(`  isFraud: ${data.report?.isFraud}`);
    console.log(`  Risk Score: ${data.report?.riskScore}`);
    console.log(`  Risk Level: ${data.report?.riskLevel}`);
    console.log(`  Flags: ${data.report?.flags?.map(f => f.vector).join(', ')}`);

    if (res.status === 200 && data.report?.isFraud === true && data.report?.riskScore >= 0.75) {
      console.log('  ✅ PASSED: Correctly identified as CRITICAL phishing URL\n');
      passed++;
    } else {
      console.error('  ❌ FAILED\n');
    }
  } catch (err) {
    console.error(`  ❌ ERROR: ${err.message}\n`);
  }

  // Test 4: Clean HTTPS Destination
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/fraud/url/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://github.com/security/advisories/dashboard'
      })
    });

    const data = await res.json();
    console.log('[TEST 4] URL Fraud - Legitimate Clean Authority');
    console.log(`  HTTP: ${res.status}`);
    console.log(`  isFraud: ${data.report?.isFraud}`);
    console.log(`  Risk Score: ${data.report?.riskScore}`);

    if (res.status === 200 && data.report?.isFraud === false && data.report?.riskScore < 0.10) {
      console.log('  ✅ PASSED: Correctly verified as clean destination\n');
      passed++;
    } else {
      console.error('  ❌ FAILED\n');
    }
  } catch (err) {
    console.error(`  ❌ ERROR: ${err.message}\n`);
  }

  console.log(`=== SUMMARY: ${passed}/${total} TESTS PASSED ===`);
  if (passed === total) {
    console.log('🎉 ALL EMAIL & URL FRAUD DETECTION TESTS PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runTests();
