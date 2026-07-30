const express = require('express');
const router = express.Router();
const multisigService = require('../../services/monero-multisig');
const MultisigWallet = require('../../models/MultisigWallet');

// POST /api/multisig/create - create multisig for order
router.post('/create', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const existing = await MultisigWallet.findOne({ orderId });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Multisig wallet already created for this order' });
    }

    const buyerKeys = await multisigService.generateKeys();
    const sellerKeys = await multisigService.generateKeys();
    const agentKeys = await multisigService.generateKeys();

    const { address } = await multisigService.createOrder(buyerKeys.wallet, sellerKeys.wallet, agentKeys.wallet);

    const multisig = await MultisigWallet.create({
      orderId,
      multisigAddress: address,
      buyerPublicKey: buyerKeys.address,
      sellerPublicKey: sellerKeys.address,
      agentPublicKey: agentKeys.address
    });

    res.status(201).json({
      success: true,
      data: {
        multisigAddress: address,
        threshold: 2,
        totalSigners: 3,
        buyerPublicKey: buyerKeys.address,
        sellerPublicKey: sellerKeys.address,
        agentPublicKey: agentKeys.address
      }
    });
  } catch (error) {
    console.error('[Multisig Create Error]', error);
    res.status(500).json({ success: false, error: 'Failed to create multisig wallet' });
  }
});

// POST /api/multisig/sign - prepare signature
router.post('/sign', async (req, res) => {
  try {
    const { orderId, signerRole, destinationAddress, amount } = req.body;

    if (!orderId || !signerRole || !destinationAddress || !amount) {
      return res.status(400).json({ success: false, error: 'orderId, signerRole, destinationAddress, and amount are required' });
    }

    const validRoles = ['buyer', 'seller', 'agent'];
    if (!validRoles.includes(signerRole)) {
      return res.status(400).json({ success: false, error: 'signerRole must be buyer, seller, or agent' });
    }

    const multisig = await MultisigWallet.findOne({ orderId });
    if (!multisig) {
      return res.status(404).json({ success: false, error: 'Multisig wallet not found for this order' });
    }

    const signature = await multisigService.prepareSignatures(orderId, signerRole);

    res.json({
      success: true,
      data: {
        signature,
        signerRole,
        orderId
      }
    });
  } catch (error) {
    console.error('[Multisig Sign Error]', error);
    res.status(500).json({ success: false, error: 'Failed to prepare signature' });
  }
});

// POST /api/multisig/submit - submit transaction
router.post('/submit', async (req, res) => {
  try {
    const { orderId, signatures } = req.body;

    if (!orderId || !signatures || !Array.isArray(signatures)) {
      return res.status(400).json({ success: false, error: 'orderId and signatures array are required' });
    }

    const multisig = await MultisigWallet.findOne({ orderId });
    if (!multisig) {
      return res.status(404).json({ success: false, error: 'Multisig wallet not found for this order' });
    }

    const result = await multisigService.submitMultisigTx(orderId, signatures);

    if (result.status === 'FUNDS_RELEASED') {
      multisig.status = 'released';
      multisig.releasedAt = new Date();
      await multisig.save();
    } else if (result.status === 'REFUNDED') {
      multisig.status = 'refunded';
      await multisig.save();
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Multisig Submit Error]', error);
    res.status(500).json({ success: false, error: 'Failed to submit multisig transaction' });
  }
});

module.exports = router;
