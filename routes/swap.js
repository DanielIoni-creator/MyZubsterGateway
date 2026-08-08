// routes/swap.js – Swap XMR ↔ MYZ
const express = require('express');
const router = express.Router();

// Tasso di cambio (simulato, in produzione prendi da un exchange)
const EXCHANGE_RATE = {
  XMR_TO_MYZ: 12000, // 1 XMR = 12000 MYZ
  MYZ_TO_XMR: 1 / 12000
};

// GET /api/swap/rate – Ottieni il tasso di cambio
router.get('/rate', (req, res) => {
  res.json({
    success: true,
    rates: {
      XMR_TO_MYZ: EXCHANGE_RATE.XMR_TO_MYZ,
      MYZ_TO_XMR: EXCHANGE_RATE.MYZ_TO_XMR,
      updatedAt: new Date().toISOString()
    }
  });
});

// POST /api/swap/execute – Esegui lo swap
router.post('/execute', async (req, res) => {
  try {
    const { from, to, amount, userId } = req.body;
    
    if (!from || !to || !amount || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (from === to) {
      return res.status(400).json({ error: 'Same currency' });
    }
    
    let result;
    if (from === 'XMR' && to === 'MYZ') {
      const myzAmount = amount * EXCHANGE_RATE.XMR_TO_MYZ;
      result = { from: 'XMR', to: 'MYZ', fromAmount: amount, toAmount: myzAmount };
    } else if (from === 'MYZ' && to === 'XMR') {
      const xmrAmount = amount * EXCHANGE_RATE.MYZ_TO_XMR;
      result = { from: 'MYZ', to: 'XMR', fromAmount: amount, toAmount: xmrAmount };
    } else {
      return res.status(400).json({ error: 'Unsupported currency pair' });
    }
    
    // Qui puoi aggiungere la logica per trasferire i fondi
    // In produzione: chiama i wallet RPC
    
    res.json({
      success: true,
      data: {
        ...result,
        rate: result.fromAmount / result.toAmount,
        userId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
