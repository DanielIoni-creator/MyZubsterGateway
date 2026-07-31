/**
 * Escrow Gateway Service — Coordinates escrow flow between wallet, AI, and marketplace.
 * 
 * Manages order states: pending → funded → completed/disputed → released/refunded
 * Communicates with multisig wallet and AI agent for signing decisions.
 */

const Escrow = require('../models/Escrow');
const Order = require('../models/Order');
const AiAgentDecision = require('../models/AiAgentDecision');
const logger = require('winston');

// ── State Machine ──────────────────────────────────────────────
const VALID_TRANSITIONS = {
  'pending':   ['funded', 'cancelled'],
  'funded':    ['completed', 'disputed'],
  'completed': ['released'],
  'disputed':  ['refunded', 'released', 'escalated'],
  'escalated': ['released', 'refunded'],
  'released':  [],
  'refunded':  [],
  'cancelled': []
};

function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from] && VALID_TRANSITIONS[from].includes(to);
}

// ── Create Escrow-Enabled Order ────────────────────────────────

/**
 * Create a new escrow order.
 * @param {Object} params - { orderId, buyerId, sellerId, amount, currency, releaseCondition }
 * @returns {Promise<Object>} Created escrow record
 */
async function createEscrowOrder(params) {
  const { orderId, buyerId, sellerId, amount, currency = 'XMR', releaseCondition = 'delivery_confirmed' } = params;

  if (!orderId || !buyerId || !sellerId || !amount) {
    throw new Error('Missing required fields: orderId, buyerId, sellerId, amount');
  }

  // Check if escrow already exists for this order
  const existing = await Escrow.findOne({ orderId });
  if (existing) {
    throw new Error(`Escrow already exists for order ${orderId}`);
  }

  const escrow = new Escrow({
    orderId,
    buyerId,
    sellerId,
    amount,
    currency,
    releaseCondition,
    status: 'pending',
    aiAgentDecision: 'pending'
  });

  await escrow.save();
  logger.info(`Escrow created: ${escrow._id} for order ${orderId}, amount=${amount} ${currency}`);

  return escrow;
}

// ── Fund Escrow ────────────────────────────────────────────────

/**
 * Mark escrow as funded after buyer deposits to multisig wallet.
 * @param {string} escrowId 
 * @param {string} moneroTxid - Monero transaction ID for funding payment
 * @returns {Promise<Object>} Updated escrow
 */
async function fundEscrow(escrowId, moneroTxid) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');
  
  if (!isValidTransition(escrow.status, 'funded')) {
    throw new Error(`Cannot transition from ${escrow.status} to funded`);
  }

  escrow.status = 'funded';
  escrow.moneroTxid = moneroTxid || escrow.moneroTxid;
  await escrow.save();

  logger.info(`Escrow ${escrowId} funded. TXID: ${escrow.moneroTxid}`);
  return escrow;
}

// ── Complete Escrow ────────────────────────────────────────────

/**
 * Mark escrow as completed (work delivered, awaiting release).
 * @param {string} escrowId
 * @param {Object} completionData - { deliveryProofUrl, notes }
 * @returns {Promise<Object>} Updated escrow
 */
async function completeEscrow(escrowId, completionData = {}) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  if (!isValidTransition(escrow.status, 'completed')) {
    throw new Error(`Cannot transition from ${escrow.status} to completed`);
  }

  escrow.status = 'completed';
  escrow.aiDecision = { ...completionData, completedAt: new Date() };
  await escrow.save();

  logger.info(`Escrow ${escrowId} completed. Awaiting AI agent sign-off.`);
  return escrow;
}

// ── Dispute Escrow ─────────────────────────────────────────────

/**
 * Mark escrow as disputed. Triggers AI agent review.
 * @param {string} escrowId
 * @param {string} disputeReason
 * @returns {Promise<Object>} Updated escrow
 */
async function disputeEscrow(escrowId, disputeReason) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  if (!isValidTransition(escrow.status, 'disputed')) {
    throw new Error(`Cannot transition from ${escrow.status} to disputed`);
  }

  escrow.status = 'disputed';
  escrow.disputedAt = new Date();
  escrow.aiDecision = { disputeReason, disputedAt: new Date() };
  await escrow.save();

  logger.info(`Escrow ${escrowId} disputed: ${disputeReason}`);
  return escrow;
}

// ── Release Funds ──────────────────────────────────────────────

/**
 * Release funds to seller. Requires 2/3 signatures (buyer + AI, or seller + AI, etc.)
 * @param {string} escrowId
 * @param {Array} signatures - Array of { signer, signatureHash }
 * @returns {Promise<Object>} Updated escrow
 */
async function releaseFunds(escrowId, signatures = []) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  if (!isValidTransition(escrow.status, 'released')) {
    throw new Error(`Cannot transition from ${escrow.status} to released`);
  }

  // Require at least 2 signatures for 2/3 multisig
  if (signatures.length < 2) {
    throw new Error('Insufficient signatures: 2 of 3 required for fund release');
  }

  escrow.status = 'released';
  escrow.resolvedAt = new Date();
  escrow.aiDecision = {
    ...escrow.aiDecision,
    releasedAt: new Date(),
    signatures
  };
  await escrow.save();

  logger.info(`Escrow ${escrowId} released with ${signatures.length} signatures.`);
  return escrow;
}

// ── Refund ─────────────────────────────────────────────────────

/**
 * Refund funds to buyer (dispute resolved in buyer's favor).
 * @param {string} escrowId
 * @param {Array} signatures
 * @returns {Promise<Object>} Updated escrow
 */
async function refundEscrow(escrowId, signatures = []) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  if (!isValidTransition(escrow.status, 'refunded')) {
    throw new Error(`Cannot transition from ${escrow.status} to refunded`);
  }

  if (signatures.length < 2) {
    throw new Error('Insufficient signatures: 2 of 3 required for refund');
  }

  escrow.status = 'refunded';
  escrow.resolvedAt = new Date();
  escrow.aiDecision = {
    ...escrow.aiDecision,
    refundedAt: new Date(),
    signatures
  };
  await escrow.save();

  logger.info(`Escrow ${escrowId} refunded with ${signatures.length} signatures.`);
  return escrow;
}

// ── Escalate ───────────────────────────────────────────────────

/**
 * Escalate disputed escrow to manual review.
 * @param {string} escrowId
 * @returns {Promise<Object>} Updated escrow
 */
async function escalateEscrow(escrowId) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  if (!isValidTransition(escrow.status, 'escalated')) {
    throw new Error(`Cannot transition from ${escrow.status} to escalated`);
  }

  escrow.status = 'escalated';
  await escrow.save();

  logger.info(`Escrow ${escrowId} escalated for manual review.`);
  return escrow;
}

// ── Get Escrow Status ──────────────────────────────────────────

/**
 * Get full escrow status including AI agent decision.
 * @param {string} escrowId
 * @returns {Promise<Object>} Escrow with AI decision history
 */
async function getEscrowStatus(escrowId) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  const aiDecisions = await AiAgentDecision
    .find({ escrowId })
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    escrow,
    aiDecisions,
    validTransitions: VALID_TRANSITIONS[escrow.status] || []
  };
}

// ── List Escrows by User ───────────────────────────────────────

/**
 * List escrows for a buyer or seller.
 * @param {string} userId
 * @param {Object} filters - { status, limit, offset }
 * @returns {Promise<Array>}
 */
async function listEscrowsByUser(userId, filters = {}) {
  const query = {
    $or: [{ buyerId: userId }, { sellerId: userId }]
  };
  if (filters.status) query.status = filters.status;

  const limit = parseInt(filters.limit) || 50;
  const offset = parseInt(filters.offset) || 0;

  const escrows = await Escrow
    .find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return escrows;
}

module.exports = {
  createEscrowOrder,
  fundEscrow,
  completeEscrow,
  disputeEscrow,
  releaseFunds,
  refundEscrow,
  escalateEscrow,
  getEscrowStatus,
  listEscrowsByUser,
  isValidTransition,
  VALID_TRANSITIONS
};
