import crypto from 'crypto';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

let latestBlockHash = GENESIS_HASH;

/**
 * Computes an immutable cryptographic block hash chaining back to the previous log entry.
 *
 * @param {object} logRecord
 * @param {string} [prevHash]
 * @returns {{ auditHash: string, prevAuditHash: string }}
 */
export function computeBlockHash(logRecord, prevHash = null) {
  const previous = prevHash || latestBlockHash;
  
  const payload = [
    previous,
    logRecord.id || '',
    logRecord.created_at || new Date().toISOString(),
    logRecord.client_id || '',
    logRecord.action_taken || '',
    logRecord.risk_level || '',
    logRecord.raw_prompt || '',
    logRecord.sanitized_prompt || ''
  ].join('|');

  const currentHash = crypto.createHash('sha256').update(payload).digest('hex');
  latestBlockHash = currentHash;

  return {
    auditHash: currentHash,
    prevAuditHash: previous
  };
}

export function getLatestBlockHash() {
  return latestBlockHash;
}

export function setLatestBlockHash(hash) {
  latestBlockHash = hash;
}

/**
 * Verifies the integrity of a series of audit log records against the cryptographic chain.
 *
 * @param {Array<object>} logs - Ordered from oldest to newest
 * @returns {object} Integrity verification report
 */
export function verifyAuditChain(logs = []) {
  if (!logs || logs.length === 0) {
    return {
      valid: true,
      totalBlocks: 0,
      headHash: GENESIS_HASH,
      genesisHash: GENESIS_HASH,
      verifiedAt: new Date().toISOString(),
      status: 'EMPTY_CHAIN',
      message: 'No audit records in chain yet.'
    };
  }

  // Sort chronologically (oldest first)
  const sorted = [...logs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  let expectedPrev = GENESIS_HASH;
  let corruptedBlock = null;

  for (let i = 0; i < sorted.length; i++) {
    const block = sorted[i];

    // Check link to previous hash
    if (block.prev_audit_hash && block.prev_audit_hash !== expectedPrev && i !== 0) {
      corruptedBlock = {
        index: i,
        id: block.id,
        reason: 'Broken chain pointer: prev_audit_hash mismatch',
        expected: expectedPrev,
        found: block.prev_audit_hash
      };
      break;
    }

    // Recompute block hash
    const payload = [
      block.prev_audit_hash || expectedPrev,
      block.id || '',
      block.created_at || '',
      block.client_id || '',
      block.action_taken || '',
      block.risk_level || '',
      block.raw_prompt || '',
      block.sanitized_prompt || ''
    ].join('|');

    const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');

    if (block.audit_hash && block.audit_hash !== calculatedHash) {
      corruptedBlock = {
        index: i,
        id: block.id,
        reason: 'Tampered payload: Hash mismatch detected',
        expected: block.audit_hash,
        calculated: calculatedHash
      };
      break;
    }

    expectedPrev = block.audit_hash || calculatedHash;
  }

  const isValid = corruptedBlock === null;

  return {
    valid: isValid,
    totalBlocks: sorted.length,
    headHash: sorted[sorted.length - 1].audit_hash || expectedPrev,
    genesisHash: GENESIS_HASH,
    verifiedAt: new Date().toISOString(),
    status: isValid ? 'CHAIN_VERIFIED_AUTHENTIC' : 'INTEGRITY_VIOLATION_DETECTED',
    message: isValid 
      ? `Cryptographic chain 100% intact. ${sorted.length}/${sorted.length} blocks verified without tampering.`
      : `Integrity breach detected at block #${corruptedBlock.index} (ID: ${corruptedBlock.id}): ${corruptedBlock.reason}`,
    corruptedBlock
  };
}
