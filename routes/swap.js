const express = require('express');
const router = express.Router();
const Swap = require('../models/Swap');

// Fee percentage from env or default 2%
const FEE_PERCENT = parseFloat(process.env.MYZ_FEE_PERCENT) || 2;

// Simulated exchange rate (in prod: fetch from DEX/oracle)
const BASE_RATE_MYZ_TO_XMR = 0.01; // 1 MYZ = 0.01 XMR

async function getCurrentRate(type) {
  // In production, fetch from Tari DEX / Monero oracle
  if (type === 'MYZ_TO_XMR') return BASE_RATE_MYZ_TO_XMR;
  return 1 / BASE_RATE_MYZ_TO_XMR; // XMR_TO_MYZ
}

function calculateFee(amount, rate) {
  const value = amount * rate;
  return value * (FEE_PERCENT / 100);
}

// GET /api/swap/quote - Get swap price quote
router.get('/quote', async (req, res) => {
  try {
    const { type = 'MYZ_TO_XMR', amount = 1 } = req.query;
    if (!['MYZ_TO_XMR', 'XMR_TO_MYZ'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Use MYZ_TO_XMR or XMR_TO_MYZ' });
    }

    const rate = await getCurrentRate(type);
    const fee = calculateFee(parseFloat(amount), rate);
    const amountTo = type === 'MYZ_TO_XMR'
      ? parseFloat(amount) * rate - fee
      : parseFloat(amount) * rate - fee;

    res.json({
      success: true,
      data: {
        type,
        amountFrom: parseFloat(amount),
        amountTo: Math.round(amountTo * 1e8) / 1e8,
        rate,
        fee: Math.round(fee * 1e8) / 1e8,
        feePercent: FEE_PERCENT,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/swap/execute - Execute a swap
router.post('/execute', async (req, res) => {
  try {
    const { userId, type, amount } = req.body;
    if (!userId || !type || !amount) {
      return res.status(400).json({ error: 'userId, type, and amount are required' });
    }
    if (!['MYZ_TO_XMR', 'XMR_TO_MYZ'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Use MYZ_TO_XMR or XMR_TO_MYZ' });
    }
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Check daily cap
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dailyTotal = await Swap.aggregate([
      { '': { userId, createdAt: { '': dayStart }, status: { '': 'failed' } } },
      { '': { _id: null, total: { '': '' } } }
    ]);
    const dailyCap = parseFloat(process.env.DAILY_CAP) || 50;
    if (dailyTotal.length > 0 && dailyTotal[0].total + parseFloat(amount) > dailyCap) {
      return res.status(400).json({ error: 'Daily swap cap exceeded', cap: dailyCap, current: dailyTotal[0].total });
    }

    const rate = await getCurrentRate(type);
    const fee = calculateFee(parseFloat(amount), rate);
    const amountTo = type === 'MYZ_TO_XMR'
      ? parseFloat(amount) * rate - fee
      : parseFloat(amount) * rate - fee;

    const swap = new Swap({
      userId,
      type,
      amountFrom: parseFloat(amount),
      amountTo: Math.round(amountTo * 1e8) / 1e8,
      rate,
      fee: Math.round(fee * 1e8) / 1e8,
      feePercent: FEE_PERCENT,
      status: 'processing',
      txIdFrom: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      txIdTo: 'tx_' + (Date.now() + 1) + '_' + Math.random().toString(36).substr(2, 9),
    });

    await swap.save();

    // Mark as completed after simulated processing
    swap.status = 'completed';
    swap.completedAt = new Date();
    await swap.save();

    res.json({
      success: true,
      data: {
        swapId: swap._id,
        type: swap.type,
        amountFrom: swap.amountFrom,
        amountTo: swap.amountTo,
        rate: swap.rate,
        fee: swap.fee,
        txIdFrom: swap.txIdFrom,
        txIdTo: swap.txIdTo,
        status: swap.status,
        completedAt: swap.completedAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/swap/history - Get swap history for user
router.get('/history', async (req, res) => {
  try {
    const { userId, limit = 20, page = 1 } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [swaps, total] = await Promise.all([
      Swap.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Swap.countDocuments({ userId })
    ]);

    res.json({
      success: true,
      data: swaps,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/swap/rate - Get current exchange rate
router.get('/rate', async (req, res) => {
  try {
    const myzToXmr = await getCurrentRate('MYZ_TO_XMR');
    const xmrToMyz = await getCurrentRate('XMR_TO_MYZ');
    res.json({
      success: true,
      data: {
        MYZ_TO_XMR: myzToXmr,
        XMR_TO_MYZ: xmrToMyz,
        feePercent: FEE_PERCENT,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
