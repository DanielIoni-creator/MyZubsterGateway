// services/escrowDashboardService.js - Gestione dashboard escrow
const Escrow = require('../models/Escrow');

class EscrowDashboardService {
  async listEscrows({ status, buyer, seller, page = 1, limit = 20 }) {
    const filter = {};
    if (status) filter.status = status;
    if (buyer) filter.buyerId = buyer;
    if (seller) filter.sellerId = seller;

    const total = await Escrow.countDocuments(filter);
    const escrows = await Escrow.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('buyerId', 'username')
      .populate('sellerId', 'username');

    return {
      escrows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getEscrowDetail(escrowId) {
    return await Escrow.findById(escrowId)
      .populate('buyerId', 'username email')
      .populate('sellerId', 'username email');
  }

  async getStats() {
    const [total, byStatus, totalVolume] = await Promise.all([
      Escrow.countDocuments(),
      Escrow.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, volume: { $sum: '$amount' } } }
      ]),
      Escrow.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const statusMap = {};
    for (const s of byStatus) {
      statusMap[s._id] = { count: s.count, volume: s.volume };
    }

    return {
      total,
      totalCompletedVolume: totalVolume[0]?.total || 0,
      byStatus: statusMap,
      activeCount: (statusMap['pending']?.count || 0) + (statusMap['active']?.count || 0),
      disputedCount: statusMap['disputed']?.count || 0,
      completedCount: statusMap['completed']?.count || 0
    };
  }

  async releaseEscrow(escrowId, userId) {
    const escrow = await Escrow.findById(escrowId);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'active') throw new Error(`Cannot release escrow in status: ${escrow.status}`);
    if (escrow.buyerId.toString() !== userId) throw new Error('Only buyer can release funds');

    escrow.status = 'completed';
    escrow.completedAt = new Date();
    escrow.releasedBy = userId;
    await escrow.save();

    return { escrowId: escrow._id, status: escrow.status, message: 'Funds released to seller' };
  }

  async refundEscrow(escrowId, userId) {
    const escrow = await Escrow.findById(escrowId);
    if (!escrow) throw new Error('Escrow not found');
    if (!['active', 'pending'].includes(escrow.status)) throw new Error(`Cannot refund escrow in status: ${escrow.status}`);
    if (escrow.buyerId.toString() !== userId && escrow.sellerId.toString() !== userId) {
      throw new Error('Only buyer or seller can request refund');
    }

    escrow.status = 'refunded';
    escrow.refundedAt = new Date();
    escrow.refundedBy = userId;
    await escrow.save();

    return { escrowId: escrow._id, status: escrow.status, message: 'Funds refunded to buyer' };
  }

  async openDispute(escrowId, userId, reason) {
    const escrow = await Escrow.findById(escrowId);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'active') throw new Error(`Cannot dispute escrow in status: ${escrow.status}`);

    escrow.status = 'disputed';
    escrow.dispute = {
      openedBy: userId,
      reason: reason || 'No reason provided',
      openedAt: new Date()
    };
    await escrow.save();

    return { escrowId: escrow._id, status: escrow.status, message: 'Dispute opened' };
  }

  async getTimeline(escrowId) {
    const escrow = await Escrow.findById(escrowId);
    if (!escrow) throw new Error('Escrow not found');

    return {
      escrowId: escrow._id,
      events: [
        { type: 'created', timestamp: escrow.createdAt, data: { amount: escrow.amount, currency: escrow.currency } },
        ...(escrow.activatedAt ? [{ type: 'activated', timestamp: escrow.activatedAt }] : []),
        ...(escrow.completedAt ? [{ type: 'completed', timestamp: escrow.completedAt, releasedBy: escrow.releasedBy }] : []),
        ...(escrow.refundedAt ? [{ type: 'refunded', timestamp: escrow.refundedAt }] : []),
        ...(escrow.dispute ? [{ type: 'disputed', timestamp: escrow.dispute.openedAt, reason: escrow.dispute.reason }] : [])
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    };
  }

  async generateReport({ from, to, format = 'json' }) {
    const filter = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const escrows = await Escrow.find(filter).sort({ createdAt: -1 });
    const totalAmount = escrows.reduce((sum, e) => sum + (e.amount || 0), 0);
    const statusCounts = {};
    for (const e of escrows) {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    }

    return {
      period: { from: from || 'beginning', to: to || 'now' },
      summary: {
        totalEscrows: escrows.length,
        totalAmount,
        statusCounts,
        avgAmount: escrows.length ? totalAmount / escrows.length : 0
      },
      format
    };
  }
}

module.exports = new EscrowDashboardService();
