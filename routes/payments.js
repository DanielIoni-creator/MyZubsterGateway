const express = require('express');
const router = express.Router();
const MoneroService = require('../services/monero');

const moneroService = new MoneroService({});
moneroService.connect().catch(console.error);

// Crea un nuovo ordine di pagamento
router.post('/create-order', async (req, res) => {
  try {
    const { orderId, amount, description } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'orderId and amount are required' 
      });
    }

    const result = await moneroService.createPaymentOrder(orderId, amount, description);
    res.json(result);
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Verifica lo stato di un pagamento
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await moneroService.verifyPayment(orderId);
    res.json(result);
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Verifica il saldo di un indirizzo
router.post('/check-balance', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ success: false, message: 'address is required' });
    }

    const result = await moneroService.checkBalance(address);
    res.json(result);
  } catch (error) {
    console.error('Error checking balance:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
