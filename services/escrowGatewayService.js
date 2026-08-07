const Escrow = require('../models/Escrow');
const logger = require('winston');

const VALID_TRANSITIONS = {
  pending: ['funded', 'cancelled'],
  funded: ['completed', 'disputed'],
  completed: [],
  disputed: ['refunded', 'completed', 'escalated'],
  escalated: ['refunded', 'completed'],
  refunded: [],
  cancelled: [],
};

function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from] && VALID_TRANSITIONS[from].includes(to);
}

function addTimelineEntry(escrow, status, actor, note = '') {
  escrow.timeline.push({ status, actor, note, timestamp: new Date() });
}

async function createEscrowOrder({
  orderId,
  buyerId,
  sellerId,
  amount,
  currency = 'XMR',
  description = '',
}) {
  if (!orderId || !buyerId || !sellerId || amount === undefined) {
    throw new Error('Missing required fields: orderId, buyerId, sellerId, amount');
  }

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
    description,
    status: 'pending',
  });

  addTimelineEntry(escrow, 'pending', 'system', 'Escrow created');
  await escrow.save();
  logger.info(`Escrow created: ${escrow._id} for order ${orderId}, amount=${amount} ${currency}`);
  return escrow;
}

async function fundEscrow(escrowId, moneroTxid = '') {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  if (!isValidTransition(escrow.status, 'funded')) {
    throw new Error(`Cannot transition from ${escrow.status} to funded`);
  }

  escrow.status = 'funded';
  escrow.moneroTxid = moneroTxid || escrow.moneroTxid;
  addTimelineEntry(escrow, 'funded', 'buyer', `Funded with TXID: ${escrow.moneroTxid}`);
  await escrow.save();

  logger.info(`Escrow ${escrowId} funded. TXID: ${escrow.moneroTxid}`);
  return escrow;
}

async function completeEscrow(escrowId) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  if (!isValidTransition(escrow.status, 'completed')) {
    throw new Error(`Cannot transition from ${escrow.status} to completed`);
  }

  escrow.status = 'completed';
  escrow.completedAt = new Date();
  addTimelineEntry(escrow, 'completed', 'seller', 'Work delivered, awaiting release');
  await escrow.save();

  logger.info(`Escrow ${escrowId} completed`);
  return escrow;
}

async function disputeEscrow(escrowId, raisedBy, reason, evidence = []) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  if (!isValidTransition(escrow.status, 'disputed')) {
    throw new Error(`Cannot transition from ${escrow.status} to disputed`);
  }

  escrow.status = 'disputed';
  escrow.disputeInfo = {
    raisedBy,
    reason,
    evidence,
    aiAnalysis: '',
    aiDecision: null,
    resolvedBy: '',
    resolvedAt: null,
  };
  addTimelineEntry(escrow, 'disputed', raisedBy, reason);
  await escrow.save();

  logger.info(`Escrow ${escrowId} disputed by ${raisedBy}: ${reason}`);
  return escrow;
}

async function resolveDispute(escrowId, decision, resolvedBy, aiAnalysis = '') {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow || !escrow.disputeInfo) {
    throw new Error('Escrow not found or not disputed');
  }

  const targetStatus = decision === 'refund_buyer' ? 'refunded' : 'completed';
  if (!isValidTransition(escrow.status, targetStatus)) {
    throw new Error(`Cannot transition from ${escrow.status} to ${targetStatus}`);
  }

  escrow.status = targetStatus;
  escrow.disputeInfo.aiAnalysis = aiAnalysis;
  escrow.disputeInfo.aiDecision = decision;
  escrow.disputeInfo.resolvedBy = resolvedBy;
  escrow.disputeInfo.resolvedAt = new Date();
  addTimelineEntry(escrow, targetStatus, resolvedBy, `Dispute resolved: ${decision}`);
  await escrow.save();

  logger.info(`Escrow ${escrowId} dispute resolved: ${decision}`);
  return escrow;
}

async function refundEscrow(escrowId, refundType = 'manual') {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  const allowed = ['funded', 'disputed', 'escalated'];
  if (!allowed.includes(escrow.status)) {
    throw new Error(`Cannot refund from status: ${escrow.status}`);
  }

  escrow.status = 'refunded';
  addTimelineEntry(escrow, 'refunded', refundType === 'ai' ? 'ai-agent' : 'admin', `Refunded via ${refundType}`);
  await escrow.save();

  logger.info(`Escrow ${escrowId} refunded`);
  return escrow;
}

async function cancelEscrow(escrowId) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  if (!isValidTransition(escrow.status, 'cancelled')) {
    throw new Error(`Cannot transition from ${escrow.status} to cancelled`);
  }

  escrow.status = 'cancelled';
  addTimelineEntry(escrow, 'cancelled', 'buyer', 'Escrow cancelled before funding');
  await escrow.save();

  logger.info(`Escrow ${escrowId} cancelled`);
  return escrow;
}

async function getEscrowStats() {
  const stats = await Escrow.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  const total = await Escrow.countDocuments();
  const totalAmount = await Escrow.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return {
    total,
    totalAmount: totalAmount[0]?.total || 0,
    byStatus: stats.reduce((acc, s) => ({ ...acc, [s._id]: { count: s.count, totalAmount: s.totalAmount } }), {}),
  };
}

module.exports = {
  createEscrowOrder,
  fundEscrow,
  completeEscrow,
  disputeEscrow,
  resolveDispute,
  refundEscrow,
  cancelEscrow,
  getEscrowStats,
};
