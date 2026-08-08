// routes/xmr.js - Route per pagamenti XMR
const express = require('express');
const router = express.Router();
const xmrService = require('../services/xmrService');

// Ottieni tasso di cambio
router.get('/rate', async (req, res) => {
  try {
    const rate = await xmrService.getExchangeRate();
    res.json({
      success: true,
      data: rate
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verifica pagamento
router.post('/verify', async (req, res) => {
  try {
    const { txId, expectedAmount } = req.body;
    const result = await xmrService.verifyPayment(txId, expectedAmount);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Genera indirizzo di pagamento
router.get('/address', async (req, res) => {
  try {
    const address = await xmrService.generatePaymentAddress();
    res.json({
      success: true,
      data: { address }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
