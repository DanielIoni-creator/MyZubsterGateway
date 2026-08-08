const Escrow = require('../models/escrowModel');
const { v4: uuidv4 } = require('uuid');

exports.createEscrow = async (req, res) => {
  try {
    const { jobId, payerId, payeeId, amount, currency, autoRelease, timeLockHours } = req.body;
    if (!jobId || !payerId || !payeeId || !amount)
      return res.status(400).json({ error: 'jobId, payerId, payeeId, and amount are required' });
    const e = new Escrow({
      escrowId: uuidv4().substring(0, 12),
      jobId, payerId, payeeId, amount,
      currency: currency || 'MYZ',
      autoRelease: autoRelease !== false,
      timeLockHours: timeLockHours || 24,
      status: 'created'
    });
    e.addLog('created', payerId, `Escrow created for job ${jobId}, amount ${amount} ${e.currency}`);
    await e.save();
    res.status(201).json({ message: 'Escrow created', escrowId: e.escrowId, status: e.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getEscrow = async (req, res) => {
  try {
    const e = await Escrow.findOne({ escrowId: req.params.escrowId });
    if (!e) return res.status(404).json({ error: 'Escrow not found' });
    e.checkAutoRelease();
    await e.save();
    res.json({
      escrowId: e.escrowId, jobId: e.jobId, payerId: e.payerId, payeeId: e.payeeId,
      amount: e.amount, currency: e.currency, status: e.status,
      autoRelease: e.autoRelease, verificationStatus: e.verificationStatus,
      releaseConditions: e.releaseConditions, timeLockHours: e.timeLockHours,
      logs: e.logs.slice(-20), createdAt: e.createdAt, fundedAt: e.fundedAt,
      verifiedAt: e.verifiedAt, releasedAt: e.releasedAt, refundedAt: e.refundedAt
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.fundEscrow = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const e = await Escrow.findOne({ escrowId: req.params.escrowId });
    if (!e) return res.status(404).json({ error: 'Escrow not found' });
    if (e.status !== 'created') return res.status(400).json({ error: `Escrow is ${e.status}` });
    if (userId !== e.payerId) return res.status(403).json({ error: 'Only payer can fund' });
    e.status = 'funded';
    e.fundedAt = new Date();
    e.addLog('funded', userId, `Escrow funded with ${e.amount} ${e.currency}`);
    e.checkAutoRelease();
    await e.save();
    res.json({ message: 'Escrow funded', status: e.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.verifyEscrow = async (req, res) => {
  try {
    const { userId, jobCompleted, verificationResult } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const e = await Escrow.findOne({ escrowId: req.params.escrowId });
    if (!e) return res.status(404).json({ error: 'Escrow not found' });
    if (e.status !== 'funded') return res.status(400).json({ error: `Escrow must be funded (current: ${e.status})` });
    if (jobCompleted !== undefined) e.releaseConditions.jobCompleted = jobCompleted;
    if (verificationResult !== undefined) {
      e.verificationStatus = verificationResult ? 'passed' : 'failed';
      e.releaseConditions.verificationPassed = verificationResult;
      e.addLog('verified', userId, `Verification ${verificationResult ? 'passed' : 'failed'}`);
    }
    const elapsed = (Date.now() - e.fundedAt.getTime()) / (60 * 60 * 1000);
    if (elapsed >= e.timeLockHours) e.releaseConditions.timeLockPassed = true;
    e.checkAutoRelease();
    await e.save();
    res.json({ message: 'Verification processed', status: e.status, verificationStatus: e.verificationStatus });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.releaseEscrow = async (req, res) => {
  try {
    const { userId } = req.body;
    const e = await Escrow.findOne({ escrowId: req.params.escrowId });
    if (!e) return res.status(404).json({ error: 'Escrow not found' });
    if (e.status !== 'funded' && e.status !== 'verified') return res.status(400).json({ error: `Cannot release from ${e.status}` });
    e.status = 'released';
    e.releasedAt = new Date();
    e.addLog('released', userId || 'admin', 'Funds released to payee');
    await e.save();
    res.json({ message: 'Escrow released', status: e.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.refundEscrow = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const e = await Escrow.findOne({ escrowId: req.params.escrowId });
    if (!e) return res.status(404).json({ error: 'Escrow not found' });
    if (e.status === 'released' || e.status === 'refunded') return res.status(400).json({ error: `Already ${e.status}` });
    e.status = 'refunded';
    e.refundedAt = new Date();
    e.addLog('refunded', userId || 'admin', reason || 'Funds refunded to payer');
    await e.save();
    res.json({ message: 'Escrow refunded', status: e.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.listEscrows = async (req, res) => {
  try {
    const { status, jobId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (jobId) filter.jobId = jobId;
    const escrows = await Escrow.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ count: escrows.length, escrows: escrows.map(e => ({
      escrowId: e.escrowId, jobId: e.jobId, status: e.status, amount: e.amount,
      currency: e.currency, autoRelease: e.autoRelease, createdAt: e.createdAt
    })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const total = await Escrow.countDocuments();
    const created = await Escrow.countDocuments({ status: 'created' });
    const funded = await Escrow.countDocuments({ status: 'funded' });
    const released = await Escrow.countDocuments({ status: 'released' });
    const refunded = await Escrow.countDocuments({ status: 'refunded' });
    const autoReleased = await Escrow.countDocuments({ status: 'released', autoRelease: true });
    const totalAmount = await Escrow.aggregate([
      { $match: { status: 'released' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    res.json({ total, created, funded, released, refunded, autoReleased, totalReleasedAmount: totalAmount[0]?.total || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
