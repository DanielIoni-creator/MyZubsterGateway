/**
 * Monero Escrow 2-of-3 Smart Contract
 * 
 * Multi-signature escrow for the MyZubster marketplace.
 * 3 parties: Buyer, Seller, Arbitrator
 * Any 2-of-3 signatures required to release funds.
 * 
 * Bounty #883 — 500 MYZ
 */

const crypto = require('crypto');

// In-memory store (use MongoDB in production)
const escrows = new Map();

class MoneroEscrow2of3 {
  /**
   * Create a new 2-of-3 escrow contract
   * @param {Object} params
   * @param {string} params.id - Unique escrow ID
   * @param {string} params.buyer - Buyer address/public key
   * @param {string} params.seller - Seller address/public key
   * @param {string} params.arbitrator - Arbitrator address/public key
   * @param {number} params.amount - Amount in MYZ
   * @param {string} params.description - Transaction description
   * @param {number} params.timeoutHours - Auto-refund timeout in hours
   * @returns {Object} Created escrow contract
   */
  static create({ id, buyer, seller, arbitrator, amount, description, timeoutHours = 72 }) {
    if (!id || !buyer || !seller || !arbitrator || !amount || amount <= 0) {
      throw new Error('Missing required fields: id, buyer, seller, arbitrator, amount');
    }
    if (buyer === seller || buyer === arbitrator || seller === arbitrator) {
      throw new Error('All three parties must be distinct');
    }
    if (escrows.has(id)) {
      throw new Error('Escrow with this ID already exists');
    }

    const escrow = {
      id,
      buyer,
      seller,
      arbitrator,
      amount,
      description: description || '',
      status: 'CREATED',        // CREATED → FUNDED → RELEASED | REFUNDED | DISPUTED → RESOLVED
      signatures: {
        buyer: false,
        seller: false,
        arbitrator: false
      },
      resolutionSignatures: {
        buyer: false,
        seller: false,
        arbitrator: false
      },
      disputeReason: null,
      disputeOpenedBy: null,
      disputeOpenedAt: null,
      resolution: null,         // 'release_to_seller' | 'refund_to_buyer' | 'split'
      splitRatio: null,         // { buyer: 0.5, seller: 0.5 }
      createdAt: new Date().toISOString(),
      fundedAt: null,
      releasedAt: null,
      refundedAt: null,
      resolvedAt: null,
      timeoutHours,
      expiresAt: null
    };

    escrows.set(id, escrow);
    return { ...escrow };
  }

  /**
   * Buyer funds the escrow (locks MYZ)
   * @param {string} id - Escrow ID
   * @param {string} caller - Must be the buyer
   * @returns {Object} Updated escrow
   */
  static fund(id, caller) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'CREATED') throw new Error('Escrow is not in CREATED state');
    if (caller !== escrow.buyer) throw new Error('Only the buyer can fund the escrow');

    escrow.status = 'FUNDED';
    escrow.fundedAt = new Date().toISOString();
    escrow.expiresAt = new Date(Date.now() + escrow.timeoutHours * 3600000).toISOString();
    return { ...escrow };
  }

  /**
   * Sign to release funds to seller
   * Requires 2-of-3 signatures (any combination of buyer, seller, arbitrator)
   * @param {string} id - Escrow ID
   * @param {string} caller - Signing party
   * @returns {Object} Updated escrow with release info if threshold met
   */
  static signRelease(id, caller) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'FUNDED') throw new Error('Escrow is not in FUNDED state');
    if (escrow.status === 'DISPUTED') throw new Error('Escrow is in dispute — use resolveDispute instead');
    
    if (caller !== escrow.buyer && caller !== escrow.seller && caller !== escrow.arbitrator) {
      throw new Error('Caller is not a party to this escrow');
    }
    if (escrow.signatures[caller]) {
      throw new Error('Party has already signed');
    }

    escrow.signatures[caller] = true;
    const sigCount = Object.values(escrow.signatures).filter(Boolean).length;

    const result = { ...escrow, signaturesCollected: sigCount, thresholdMet: sigCount >= 2 };

    if (sigCount >= 2) {
      escrow.status = 'RELEASED';
      escrow.releasedAt = new Date().toISOString();
      result.fundsReleased = true;
      result.releasedTo = escrow.seller;
    }

    return result;
  }

  /**
   * Request a refund back to buyer (requires 2-of-3 signatures)
   * @param {string} id - Escrow ID
   * @param {string} caller - Signing party
   * @returns {Object} Updated escrow
   */
  static signRefund(id, caller) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'FUNDED') throw new Error('Escrow is not in FUNDED state');
    
    if (caller !== escrow.buyer && caller !== escrow.seller && caller !== escrow.arbitrator) {
      throw new Error('Caller is not a party to this escrow');
    }

    // Refund uses the same signature map but different resolution
    escrow.signatures[caller] = true;
    const sigCount = Object.values(escrow.signatures).filter(Boolean).length;

    const result = { ...escrow, signaturesCollected: sigCount, thresholdMet: sigCount >= 2 };

    if (sigCount >= 2) {
      escrow.status = 'REFUNDED';
      escrow.refundedAt = new Date().toISOString();
      result.fundsRefunded = true;
      result.refundedTo = escrow.buyer;
    }

    return result;
  }

  /**
   * Open a dispute
   * @param {string} id - Escrow ID
   * @param {string} caller - Party opening the dispute
   * @param {string} reason - Reason for dispute
   * @returns {Object} Updated escrow
   */
  static openDispute(id, caller, reason) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'FUNDED') throw new Error('Escrow is not in FUNDED state');
    if (escrow.status === 'DISPUTED') throw new Error('Escrow is already in dispute');
    
    if (caller !== escrow.buyer && caller !== escrow.seller) {
      throw new Error('Only buyer or seller can open a dispute');
    }

    escrow.status = 'DISPUTED';
    escrow.disputeReason = reason;
    escrow.disputeOpenedBy = caller;
    escrow.disputeOpenedAt = new Date().toISOString();
    
    // Reset signatures for dispute resolution
    escrow.resolutionSignatures = { buyer: false, seller: false, arbitrator: false };

    return { ...escrow };
  }

  /**
   * Arbitrator resolves dispute with 2-of-3 resolution signatures
   * @param {string} id - Escrow ID
   * @param {string} caller - Signing party
   * @param {string} resolution - 'release_to_seller' | 'refund_to_buyer' | 'split'
   * @param {Object} splitRatio - { buyer: 0.5, seller: 0.5 } for split resolution
   * @returns {Object} Updated escrow
   */
  static resolveDispute(id, caller, resolution, splitRatio = null) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'DISPUTED') throw new Error('Escrow is not in DISPUTED state');
    
    if (caller !== escrow.buyer && caller !== escrow.seller && caller !== escrow.arbitrator) {
      throw new Error('Caller is not a party to this escrow');
    }
    if (!['release_to_seller', 'refund_to_buyer', 'split'].includes(resolution)) {
      throw new Error('Invalid resolution type');
    }
    if (resolution === 'split' && !splitRatio) {
      throw new Error('splitRatio required for split resolution');
    }

    // Set resolution on first sign
    if (!escrow.resolution) {
      escrow.resolution = resolution;
      if (resolution === 'split') {
        escrow.splitRatio = splitRatio;
      }
    }

    escrow.resolutionSignatures[caller] = true;
    const sigCount = Object.values(escrow.resolutionSignatures).filter(Boolean).length;

    const result = { ...escrow, resolutionSignaturesCollected: sigCount, thresholdMet: sigCount >= 2 };

    if (sigCount >= 2) {
      escrow.status = 'RESOLVED';
      escrow.resolvedAt = new Date().toISOString();
      result.resolved = true;
      result.resolution = escrow.resolution;
      if (escrow.resolution === 'split') {
        result.splitRatio = escrow.splitRatio;
      }
    }

    return result;
  }

  /**
   * Auto-refund if escrow has expired (timeout reached)
   * @param {string} id - Escrow ID
   * @returns {Object} Updated escrow or error
   */
  static autoRefund(id) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'FUNDED') throw new Error('Escrow is not in FUNDED state');
    if (!escrow.expiresAt) throw new Error('No expiry set');

    const now = new Date();
    if (now < new Date(escrow.expiresAt)) {
      throw new Error('Timeout has not expired yet');
    }

    escrow.status = 'REFUNDED';
    escrow.refundedAt = now.toISOString();
    return { ...escrow, autoRefunded: true, refundedTo: escrow.buyer };
  }

  /**
   * Get escrow details
   * @param {string} id - Escrow ID
   * @returns {Object} Escrow contract
   */
  static get(id) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    return { ...escrow };
  }

  /**
   * List all escrows (with optional filters)
   * @param {Object} filters - { status, party }
   * @returns {Array} List of escrows
   */
  static list(filters = {}) {
    let result = Array.from(escrows.values());
    
    if (filters.status) {
      result = result.filter(e => e.status === filters.status);
    }
    if (filters.party) {
      result = result.filter(e => 
        e.buyer === filters.party || 
        e.seller === filters.party || 
        e.arbitrator === filters.party
      );
    }
    
    return result.map(e => ({ ...e }));
  }

  /**
   * Get statistics about escrows
   * @returns {Object} Escrow statistics
   */
  static stats() {
    const all = Array.from(escrows.values());
    const byStatus = {};
    for (const e of all) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    }
    const totalLocked = all
      .filter(e => e.status === 'FUNDED' || e.status === 'DISPUTED')
      .reduce((sum, e) => sum + e.amount, 0);
    
    return {
      total: all.length,
      byStatus,
      totalLockedMYZ: totalLocked,
      activeDisputes: byStatus['DISPUTED'] || 0
    };
  }

  /**
   * Clear all escrows (for testing)
   */
  static _reset() {
    escrows.clear();
  }
}

module.exports = MoneroEscrow2of3;
