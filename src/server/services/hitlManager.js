import crypto from 'crypto';
import { sseHub } from './sseHub.js';

class HITLManager {
  constructor() {
    this.pendingRequests = new Map(); // id -> { id, toolName, parameters, riskScore, violations, resolve, timer }
  }

  /**
   * Dispatches a Human-in-the-Loop approval request and awaits resolution
   *
   * @param {object} params
   * @param {string} params.clientId
   * @param {string} params.sessionId
   * @param {string} params.toolName
   * @param {object} params.parameters
   * @param {number} params.riskScore
   * @param {Array<object>} params.violations
   * @param {number} [timeoutMs=20000]
   * @returns {Promise<{ approved: boolean, reason: string, decidedBy: string }>}
   */
  requestApproval({ clientId, sessionId, toolName, parameters, riskScore, violations, timeoutMs = 20000 }) {
    const approvalId = `hitl_${crypto.randomUUID().slice(0, 8)}`;

    return new Promise((resolve) => {
      const approvalRecord = {
        id: approvalId,
        client_id: clientId,
        session_id: sessionId,
        tool_name: toolName,
        parameters,
        risk_score: riskScore,
        violations: violations || [],
        status: 'PENDING',
        created_at: new Date().toISOString(),
        timeout_ms: timeoutMs
      };

      // Set timeout timer
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(approvalId)) {
          this.pendingRequests.delete(approvalId);
          sseHub.broadcast('approval_resolved', {
            id: approvalId,
            status: 'EXPIRED',
            decision: 'REJECTED_TIMEOUT'
          });
          resolve({
            approved: false,
            reason: 'Human approval request timed out (20s). Deterministic policy enforced.',
            decidedBy: 'SYSTEM_TIMEOUT'
          });
        }
      }, timeoutMs);

      this.pendingRequests.set(approvalId, {
        record: approvalRecord,
        resolve,
        timer
      });

      // Broadcast to live control plane dashboard
      sseHub.broadcast('approval_request', approvalRecord);
    });
  }

  /**
   * Resolves a pending HITL approval request
   *
   * @param {string} approvalId 
   * @param {'APPROVE' | 'REJECT'} decision 
   * @param {string} [decidedBy='Dashboard Admin']
   * @returns {boolean} Whether approval was successfully matched
   */
  resolveApproval(approvalId, decision, decidedBy = 'Dashboard Admin') {
    const item = this.pendingRequests.get(approvalId);
    if (!item) return false;

    clearTimeout(item.timer);
    this.pendingRequests.delete(approvalId);

    const isApproved = decision === 'APPROVE';

    sseHub.broadcast('approval_resolved', {
      id: approvalId,
      status: isApproved ? 'APPROVED' : 'REJECTED',
      decided_by: decidedBy,
      resolved_at: new Date().toISOString()
    });

    item.resolve({
      approved: isApproved,
      reason: isApproved ? 'Operator manual override granted.' : 'Operator rejected tool execution.',
      decidedBy
    });

    return true;
  }

  getPendingList() {
    return Array.from(this.pendingRequests.values()).map(item => item.record);
  }
}

export const hitlManager = new HITLManager();
