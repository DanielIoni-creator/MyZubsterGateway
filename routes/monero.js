const express = require('express');
const router = express.Router();
const MoneroService = require('../services/monero');

// Inizializza il servizio Monero
const moneroService = new MoneroService({});
moneroService.connect().catch(console.error);

// Genera un subaddress per un ordine
router.post('/generate-address', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const result = await moneroService.generateSubaddress(orderId);
    res.json(result);
  } catch (error) {
    console.error('Error generating subaddress:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Controlla il saldo di un indirizzo
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

// Crea una transazione
router.post('/create-transaction', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount } = req.body;
    if (!fromAddress || !toAddress || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await moneroService.createTransaction(fromAddress, toAddress, amount);
    res.json(result);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Verifica lo stato di una transazione
router.get('/transaction-status/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    if (!txHash) {
      return res.status(400).json({ success: false, message: 'txHash is required' });
    }

    const result = await moneroService.checkTransactionStatus(txHash);
    res.json(result);
  } catch (error) {
    console.error('Error checking transaction:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Ottieni il saldo del wallet principale
router.get('/main-balance', async (req, res) => {
  try {
    const result = await moneroService.getMainWalletBalance();
    res.json(result);
  } catch (error) {
    console.error('Error getting main wallet balance:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Crea una transazione multisig
router.post('/create-multisig', async (req, res) => {
  try {
    const { participants, amount } = req.body;
    if (!participants || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await moneroService.createMultisigTransaction(participants, amount);
    res.json(result);
  } catch (error) {
    console.error('Error creating multisig transaction:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;

// GET /status - Stato del wallet Monero
router.get('/status', async (req, res) => {
  try {
    // Qui puoi aggiungere logica reale per controllare lo stato del wallet
    res.json({
      status: 'connected',
      timestamp: new Date().toISOString(),
      network: process.env.MONERO_NETWORK || 'testnet'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /status - Stato del wallet Monero
router.get("/status", async (req, res) => {
  try {
    res.json({
      status: "connected",
      timestamp: new Date().toISOString(),
      network: process.env.MONERO_NETWORK || "testnet"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
