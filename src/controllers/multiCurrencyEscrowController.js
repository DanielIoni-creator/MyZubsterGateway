const MultiCurrencyEscrow = require('../models/multiCurrencyEscrowModel');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://myzubsterapp.onrender.com';

exports.createEscrow = async (req, res) => {
  try {
    const { jobId, payerId, payeeId, sourceCurrency, sourceAmount, targetCurrency, autoConvert } = req.body;
    if (!jobId || !payerId || !payeeId || !sourceCurrency || !sourceAmount)
      return res.status(400).json({ error: 'jobId, payerId, payeeId, sourceCurrency, and sourceAmount are required' });
    if (!['MYZ', 'XMR'].includes(sourceCurrency))
      return res.status(400).json({ error: 'sourceCurrency must be MYZ or XMR' });
    const e = new MultiCurrencyEscrow({
      escrowId: uuidv4().substring(0, 12),
      jobId, payerId, payeeId, sourceCurrency, sourceAmount,
      targetCurrency: targetCurrency || null,
      autoConvert: autoConvert !== false
    });
    e.addLog('created', payerId, `Multi-currency escrow created: ${sourceAmount} ${sourceCurrency}`);
    await e.save();
    res.status(201).json({ message: 'Escrow created', escrowId: e.escrowId, sourceCurrency: e.sourceCurrency, sourceAmount: e.sourceAmount });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getEscrow = async (req, res) => {
  try {
    const e = await MultiCurrencyEscrow.findOne({ escrowId: req.params.escrowId });
    if (!e) return res.status(404).json({ error: 'Escrow not found' });
    res.json({
      escrowId: e.escrowId, jobId: e.jobId, payerId: e.payerId, payeeId: e.payeeId,
      sourceCurrency: e.sourceCurrency, sourceAmount: e.sourceAmount,
      targetCurrency: e.targetCurrency, targetAmount: e.targetAmount,
      swapRate: e.swapRate, swapExecuted: e.swapExecuted,
      status: e.status, autoConvert: e.autoConvert,
      totalInMYZ: e.getTotalInMYZ(), totalInXMR: e.getTotalInXMR(),
      logs: e.logs.slice(-20),
      createdAt: e.createdAt, fundedAt: e.fundedAt, swappedAt: e.swappedAt,
      releasedAt: e.releasedAt, refundedAt: e.refundedAt
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.fundEscrow = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const e = await MultiCurrencyEscrow.findOne({ escrowId: req.params.escrowId });
    if (!e) return res.status(404).json({ error: 'Escrow not found' });
    if (e.status !== 'created') return res.status(400).json({ error: `Escrow is ${e.status}` });
    if (userId !== e.payerId) return res.status(403).json({ error: 'Only payer can fund' });
    e.status = 'funded';
    e.fundedAt = new Date();
    e.addLog('funded', userId, `Escrow funded with ${e.sourceAmount} ${e.sourceCurrency}`);
    if (e.autoConvert && e.targetCurrency && e.targetCurrency !== e.sourceCurrency) {
      try {
        const rateResp = await axios.get(`${GATEWAY_URL}/api/swap/rate`, {
          params: { from: e.sourceCurrency, to: e.targetCurrency, amount: e.sourceAmount },
          timeout: 10000
        });
        e.swapRate = rateResp.data.rate || rateResp.data.swapRate;
        e.targetAmount = e.sourceAmount * e.swapRate;
        e.swapExecuted = true;
        e.status = 'swapped';
        e.swappedAt = new Date();
        e.addLog('auto-swapped', 'system', `Converted ${e.sourceAmount} ${e.sourceCurrency} to ${e.targetAmount} ${e.targetCurrency} at rate ${e.swapRate}`);
      } catch (swapErr) {
        e.addLog('swap-failed', 'system', `Auto-swap failed: ${swapErr.message}`);
      }
    }
    await e.save();
    res.json({ message: 'Escrow funded', status: e.status, swapExecuted: e.swapExecuted, targetAmount: e.targetAmount });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.executeSwap = async (req, res) => {
  try {
    const { userId } = req.body;
    const e = await MultiCurrencyEscrow.findOne({ escrowId: req.params.escrowId });
    if (!e) return res.status(404).json({ error: 'Escrow not found' });
    if (e.status !== 'funded') return res.status(400).json({ error: `Escrow must be funded (current: ${e.status})` });
    if (!e.targetCurrency) return res.status(400).json({ error: 'No target currency set' });
    const rateResp = await axios.get(`${GATEWAY_URL}/api/swap/rate`, {
      params: { from: e.sourceCurrency, to: e.targetCurrency, amount: e.sourceAmount },
      timeout: 10000
    });
    e.swapRate = rateResp.data.rate || rateResp.data.swapRate;
    e.targetAmount = e.sourceAmount * e.swapRate;
    e.swapExecuted = true;
    e.status = 'swapped';
    e.swappedAt = new Date();
    e.addLog('swapped', userId || 'system', `Converted ${e.sourceAmount} ${e.sourceCurrency} to ${e.targetAmount} ${e.targetCurrency}`);
    await e.save();
    res.json({ message: 'Swap executed', swapRate: e.swapRate, targetAmount: e.targetAmount, status: e.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.releaseEscrow = async (req, res) => {
  try {
    const { userId } = req.body;
    const e = await MultiCurrencyEscrow.findOne({ escrowId: req.params.escrowId });
    if (!e) return res.status(404).json({ error: 'Escrow not found' });
    if (!['funded', 'swapped'].includes(e.status)) return res.status(400).json({ error: `Cannot release from ${e.status}` });
    e.status = 'released';
    e.releasedAt = new Date();
    e.addLog('released', userId || 'admin', `Funds released to payee`);
    await e.save();
    res.json({ message: 'Escrow released', status: e.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.refundEscrow = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const e = await MultiCurrencyEscrow.findOne({ escrowId: req.params.escrowId });
    if (!e) return res.status(404).json({ error: 'Escrow not found' });
    if (['released', 'refunded'].includes(e.status)) return res.status(400).json({ error: `Already ${e.status}` });
    e.status = 'refunded';
    e.refundedAt = new Date();
    e.addLog('refunded', userId || 'admin', reason || 'Funds refunded to payer');
    await e.save();
    res.json({ message: 'Escrow refunded', status: e.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.listEscrows = async (req, res) => {
  try {
    const { status, currency } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (currency) filter.$or = [{ sourceCurrency: currency }, { targetCurrency: currency }];
    const escrows = await MultiCurrencyEscrow.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({
      count: escrows.length,
      escrows: escrows.map(e => ({
        escrowId: e.escrowId, jobId: e.jobId, status: e.status,
        sourceCurrency: e.sourceCurrency, sourceAmount: e.sourceAmount,
        targetCurrency: e.targetCurrency, targetAmount: e.targetAmount,
        swapExecuted: e.swapExecuted, totalInMYZ: e.getTotalInMYZ(),
        createdAt: e.createdAt
      }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getDashboard = async (req, res) => {
  try {
    const all = await MultiCurrencyEscrow.find().sort({ createdAt: -1 }).limit(100);
    const myzEscrows = all.filter(e => e.sourceCurrency === 'MYZ');
    const xmrEscrows = all.filter(e => e.sourceCurrency === 'XMR');
    const swapped = all.filter(e => e.swapExecuted);
    const totalMYZVolume = myzEscrows.reduce((sum, e) => sum + e.sourceAmount, 0);
    const totalXMRVolume = xmrEscrows.reduce((sum, e) => sum + e.sourceAmount, 0);
    const statusCounts = {
      created: all.filter(e => e.status === 'created').length,
      funded: all.filter(e => e.status === 'funded').length,
      swapped: all.filter(e => e.status === 'swapped').length,
      released: all.filter(e => e.status === 'released').length,
      refunded: all.filter(e => e.status === 'refunded').length
    };
    res.json({
      total: all.length,
      myzEscrows: myzEscrows.length,
      xmrEscrows: xmrEscrows.length,
      swapped: swapped.length,
      totalMYZVolume,
      totalXMRVolume,
      statusBreakdown: statusCounts,
      recentEscrows: all.slice(0, 10).map(e => ({
        escrowId: e.escrowId, status: e.status,
        source: `${e.sourceAmount} ${e.sourceCurrency}`,
        target: e.targetAmount ? `${e.targetAmount} ${e.targetCurrency}` : null,
        createdAt: e.createdAt
      }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const total = await MultiCurrencyEscrow.countDocuments();
    const byCurrency = await MultiCurrencyEscrow.aggregate([
      { $group: { _id: '$sourceCurrency', count: { $sum: 1 }, totalAmount: { $sum: '$sourceAmount' } } }
    ]);
    const byStatus = await MultiCurrencyEscrow.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const swapStats = await MultiCurrencyEscrow.aggregate([
      { $group: { _id: '$swapExecuted', count: { $sum: 1 } } }
    ]);
    res.json({ total, byCurrency, byStatus, swapStats });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
