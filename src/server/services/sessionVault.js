/**
 * In-Memory Session Vault for Two-Way Reversible PII & Secret Cloaking.
 * Allows models to reason on tokenized entities without ever receiving raw PII,
 * and re-hydrates the response before returning it to the authorized client.
 */
class SessionVault {
  constructor() {
    this.vault = new Map(); // sessionId -> { tokenMap: { token: originalValue }, createdAt }
    this.TTL_MS = 3600000; // 1 hour TTL

    // Periodic cleanup of expired session vaults
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Registers a token mapping for a given session
   * @param {string} sessionId 
   * @param {Record<string, string>} tokenMap 
   */
  storeTokens(sessionId, tokenMap) {
    if (!sessionId || !tokenMap || Object.keys(tokenMap).length === 0) return;
    
    const existing = this.vault.get(sessionId) || { tokenMap: {}, createdAt: Date.now() };
    this.vault.set(sessionId, {
      tokenMap: { ...existing.tokenMap, ...tokenMap },
      createdAt: Date.now()
    });
  }

  /**
   * Retrieves token mapping for a session
   * @param {string} sessionId 
   * @returns {Record<string, string>}
   */
  getTokens(sessionId) {
    if (!sessionId) return {};
    const item = this.vault.get(sessionId);
    return item ? item.tokenMap : {};
  }

  /**
   * Re-hydrates a sanitized upstream model completion back into original text
   * using the stored session token mapping.
   *
   * @param {string} responseText - Model output containing [REDACTED_...] tokens
   * @param {string} sessionId - Session tracking ID
   * @param {Record<string, string>} [ephemeralTokenMap] - Optional immediate request token map
   * @returns {{ rehydratedText: string, restoredCount: number }}
   */
  deAnonymize(responseText, sessionId, ephemeralTokenMap = {}) {
    if (!responseText || typeof responseText !== 'string') {
      return { rehydratedText: responseText || '', restoredCount: 0 };
    }

    const sessionTokens = this.getTokens(sessionId);
    const combinedTokens = { ...sessionTokens, ...ephemeralTokenMap };

    let rehydratedText = responseText;
    let restoredCount = 0;

    for (const [token, originalVal] of Object.entries(combinedTokens)) {
      if (rehydratedText.includes(token)) {
        // Replace all occurrences of this token
        rehydratedText = rehydratedText.replaceAll(token, originalVal);
        restoredCount++;
      }
    }

    return {
      rehydratedText,
      restoredCount
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [sessionId, data] of this.vault.entries()) {
      if (now - data.createdAt > this.TTL_MS) {
        this.vault.delete(sessionId);
      }
    }
  }

  getVaultSize() {
    return this.vault.size;
  }
}

export const sessionVault = new SessionVault();
