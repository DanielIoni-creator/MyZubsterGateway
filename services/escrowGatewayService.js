const EscrowOrder = require('../models/EscrowOrder');
const { STATE_TRANSITIONS } = require('../models/EscrowOrder');

/**
 * Escrow Gateway Service
 *
 * Coordinates orders between wallet, AI agents, and marketplace.
 * Uses MongoDB for persistence with version-based concurrency.
 * Emits event hooks for external integrations (#64/#65 compatible).
 */

// ─── Event hook registry ─────────────────────────────────────────────────────

const eventHandlers = [];

/**
 * Register an event handler that is called on every escrow event.
 * @param {Function} handler - async (eventName, order, extra) => void
 * @returns {Function} unsubscribe function
 */
function onEvent(handler) {
  eventHandlers.push(handler);
  return () => {
    const idx = eventHandlers.indexOf(handler);
    if (idx !== -1) eventHandlers.splice(idx, 1);
  };
}

async function emitEvent(eventName, order, extra = {}) {
  for (const handler of eventHandlers) {
    try {
      await handler(eventName, order, extra);
    } catch (err) {
      console.error(`[EscrowGateway] Event handler error (${eventName}):`, err.message);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeError(message, code = 'ESCROW_ERROR', status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

// ─── Core Service Methods ────────────────────────────────────────────────────

/**
 * Create a new escrow order.
 *
 * @param {string} buyerId  - MongoDB ObjectId of the buyer
 * @param {string} sellerId - MongoDB ObjectId of the seller
 * @param {number} amount   - Amount to be held in escrow
 * @param {Object} [options]
 * @param {string} [options.currency]  - Currency (default 'XMR')
 * @param {string} [options.multisigAddress] - Multisig wallet address
 * @param {string} [options.description] - Order description
 * @returns {Promise<Object>} The created EscrowOrder document
 */
async function createOrder(buyerId, sellerId, amount, options = {}) {
  if (!buyerId || !sellerId) {
    throw makeError('buyerId and sellerId are required', 'VALIDATION_ERROR');
  }
  if (amount == null || amount <= 0) {
    throw makeError('amount must be a positive number', 'VALIDATION_ERROR');
  }
  if (buyerId.toString() === sellerId.toString()) {
    throw makeError('Buyer and seller must be different users', 'VALIDATION_ERROR');
  }

  const orderId = EscrowOrder.generateOrderId();

  const order = new EscrowOrder({
    orderId,
    buyerId,
    sellerId,
    amount,
    currency: options.currency || 'XMR',
    multisigAddress: options.multisigAddress || '',
    description: options.description || '',
    status: 'pending',
    version: 0,
    timeline: [
      {
        status: 'pending',
        actor: 'system',
        note: 'Order created',
        timestamp: new Date(),
      },
    ],
  });

  await order.save();
  await emitEvent('order.created', order);
  return order;
}

/**
 * Mark an order as funded once funds are detected in the multisig address.
 *
 * @param {string} orderId - The EscrowOrder's orderId field (e.g. "ESC-XXXX-XXXX")
 * @param {Object} [options]
 * @param {string} [options.moneroTxid] - Monero transaction ID
 * @param {string} [options.actor] - Who performed this action (default 'system')
 * @returns {Promise<Object>} Updated order
 */
async function fundOrder(orderId, options = {}) {
  const order = await EscrowOrder.findOne({ orderId });
  if (!order) {
    throw makeError(`Order ${orderId} not found`, 'NOT_FOUND', 404);
  }

  const actor = options.actor || 'system';
  order.transitionTo('funded', actor, 'Funds detected in multisig wallet');

  if (options.moneroTxid) {
    order.moneroTxid = options.moneroTxid;
  }

  order.version += 1;
  await order.save();
  await emitEvent('order.funded', order, { moneroTxid: options.moneroTxid });
  return order;
}

/**
 * Mark an order as completed (buyer confirms satisfaction).
 *
 * @param {string} orderId
 * @param {Object} [options]
 * @param {string} [options.actor] - Defaults to 'buyer'
 * @param {string} [options.note]
 * @returns {Promise<Object>} Updated order
 */
async function completeOrder(orderId, options = {}) {
  const order = await EscrowOrder.findOne({ orderId });
  if (!order) {
    throw makeError(`Order ${orderId} not found`, 'NOT_FOUND', 404);
  }

  const actor = options.actor || 'buyer';
  order.transitionTo('completed', actor, options.note || 'Buyer confirmed completion');

  order.completedAt = new Date();
  order.version += 1;
  await order.save();
  await emitEvent('order.completed', order);
  return order;
}

/**
 * Raise a dispute on an order.
 *
 * @param {string} orderId
 * @param {string} reason  - Reason for the dispute
 * @param {Object} [options]
 * @param {string} [options.actor] - 'buyer' or 'seller'
 * @param {Array}  [options.evidence] - [{description, url}]
 * @returns {Promise<Object>} Updated order
 */
async function disputeOrder(orderId, reason, options = {}) {
  if (!reason || !reason.trim()) {
    throw makeError('Dispute reason is required', 'VALIDATION_ERROR');
  }

  const order = await EscrowOrder.findOne({ orderId });
  if (!order) {
    throw makeError(`Order ${orderId} not found`, 'NOT_FOUND', 404);
  }

  const actor = options.actor || 'buyer';
  order.transitionTo('disputed', actor, `Dispute raised: ${reason}`);

  order.disputeInfo = {
    raisedBy: actor,
    reason,
    evidence: (options.evidence || []).map((e) => ({
      description: e.description || '',
      uploadedBy: actor,
      url: e.url || '',
      createdAt: new Date(),
    })),
    aiAnalysis: '',
    aiDecision: null,
    resolvedBy: '',
    resolvedAt: null,
  };

  order.version += 1;
  await order.save();
  await emitEvent('order.disputed', order, { reason });
  return order;
}

/**
 * Resolve a dispute (AI-assisted or manual).
 *
 * @param {string} orderId
 * @param {'refund_buyer' | 'release_seller' | 'manual_review'} decision
 * @param {Object} [options]
 * @param {string} [options.resolvedBy] - Who resolved it (e.g. 'ai', 'admin')
 * @param {string} [options.aiAnalysis] - AI analysis text
 * @param {string} [options.note]
 * @returns {Promise<Object>} Updated order
 */
async function resolveDispute(orderId, decision, options = {}) {
  const validDecisions = ['refund_buyer', 'release_seller', 'manual_review'];
  if (!validDecisions.includes(decision)) {
    throw makeError(
      `Invalid decision "${decision}". Must be one of: ${validDecisions.join(', ')}`,
      'VALIDATION_ERROR'
    );
  }

  const order = await EscrowOrder.findOne({ orderId });
  if (!order) {
    throw makeError(`Order ${orderId} not found`, 'NOT_FOUND', 404);
  }

  if (order.status !== 'disputed' && order.status !== 'escalated') {
    throw makeError(
      `Cannot resolve dispute when status is "${order.status}". Must be "disputed" or "escalated".`,
      'INVALID_TRANSITION'
    );
  }

  // Update dispute info
  if (!order.disputeInfo) {
    order.disputeInfo = {
      raisedBy: '',
      reason: '',
      evidence: [],
      aiAnalysis: '',
      aiDecision: null,
      resolvedBy: '',
      resolvedAt: null,
    };
  }

  order.disputeInfo.aiDecision = decision;
  order.disputeInfo.aiAnalysis = options.aiAnalysis || order.disputeInfo.aiAnalysis || '';
  order.disputeInfo.resolvedBy = options.resolvedBy || 'admin';
  order.disputeInfo.resolvedAt = new Date();

  // Apply the resolution
  if (decision === 'refund_buyer') {
    order.transitionTo('refunded', options.resolvedBy || 'admin', options.note || 'Dispute resolved: refund buyer');
  } else if (decision === 'release_seller') {
    order.transitionTo('completed', options.resolvedBy || 'admin', options.note || 'Dispute resolved: release to seller');
    order.completedAt = new Date();
  } else {
    // manual_review: escalate
    if (order.status !== 'escalated') {
      order.status = 'escalated';
      order.timeline.push({
        status: 'escalated',
        actor: options.resolvedBy || 'admin',
        note: 'Escalated for manual review',
        timestamp: new Date(),
      });
    }
  }

  order.version += 1;
  await order.save();
  await emitEvent('order.dispute_resolved', order, { decision });
  return order;
}

/**
 * Issue a refund on an order (only possible from disputed/escalated).
 *
 * @param {string} orderId
 * @param {Object} [options]
 * @param {string} [options.actor]
 * @param {string} [options.note]
 * @returns {Promise<Object>} Updated order
 */
async function refundOrder(orderId, options = {}) {
  const order = await EscrowOrder.findOne({ orderId });
  if (!order) {
    throw makeError(`Order ${orderId} not found`, 'NOT_FOUND', 404);
  }

  const actor = options.actor || 'seller';
  order.transitionTo('refunded', actor, options.note || 'Order refunded');

  order.version += 1;
  await order.save();
  await emitEvent('order.refunded', order);
  return order;
}

/**
 * Cancel a pending order.
 *
 * @param {string} orderId
 * @param {Object} [options]
 * @returns {Promise<Object>} Updated order
 */
async function cancelOrder(orderId, options = {}) {
  const order = await EscrowOrder.findOne({ orderId });
  if (!order) {
    throw makeError(`Order ${orderId} not found`, 'NOT_FOUND', 404);
  }

  const actor = options.actor || 'system';
  order.transitionTo('cancelled', actor, options.note || 'Order cancelled');

  order.version += 1;
  await order.save();
  await emitEvent('order.cancelled', order);
  return order;
}

/**
 * Get order history with optional filters and pagination.
 *
 * @param {Object} filters
 * @param {string} [filters.buyerId]
 * @param {string} [filters.sellerId]
 * @param {string} [filters.status]
 * @param {number} [page=1]
 * @param {number} [limit=20]
 * @returns {Promise<{data: Array, pagination: Object}>}
 */
async function getOrderHistory(filters = {}, page = 1, limit = 20) {
  const query = {};

  if (filters.buyerId) query.buyerId = filters.buyerId;
  if (filters.sellerId) query.sellerId = filters.sellerId;
  if (filters.status) {
    const validStatuses = Object.keys(STATE_TRANSITIONS);
    if (validStatuses.includes(filters.status)) {
      query.status = filters.status;
    }
  }
  if (filters.search && filters.search.trim()) {
    const regex = new RegExp(escapeRegex(filters.search.trim()), 'i');
    query.$or = [{ orderId: regex }, { description: regex }];
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [data, total] = await Promise.all([
    EscrowOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('buyerId', '_id username')
      .populate('sellerId', '_id username'),
    EscrowOrder.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / safeLimit);

  return {
    data,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  };
}

/**
 * Get order statistics.
 *
 * @param {Object} [filters]
 * @param {string} [filters.buyerId]
 * @param {string} [filters.sellerId]
 * @returns {Promise<Object>} Stats object
 */
async function getOrderStats(filters = {}) {
  const match = {};
  if (filters.buyerId) match.buyerId = filters.buyerId;
  if (filters.sellerId) match.sellerId = filters.sellerId;

  const stats = await EscrowOrder.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  const result = {
    total: 0,
    totalAmount: 0,
    byStatus: {},
  };

  for (const s of stats) {
    result.byStatus[s._id] = {
      count: s.count,
      totalAmount: s.totalAmount,
    };
    result.total += s.count;
    result.totalAmount += s.totalAmount;
  }

  // Ensure all statuses have entries
  for (const status of Object.keys(STATE_TRANSITIONS)) {
    if (!result.byStatus[status]) {
      result.byStatus[status] = { count: 0, totalAmount: 0 };
    }
  }

  return result;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  // Core methods
  createOrder,
  fundOrder,
  completeOrder,
  disputeOrder,
  resolveDispute,
  refundOrder,
  cancelOrder,
  getOrderHistory,
  getOrderStats,

  // Event hooks
  onEvent,

  // Exported for testing
  STATE_TRANSITIONS,
};
