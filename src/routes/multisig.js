/**
 * 2/3 Multisig Wallet REST API routes.
 * Endpoints for key generation, multisig setup, signing, and transaction management.
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const multisig = require('../../services/multisigWallet');
const logger = require('winston');

// ── POST: Generate keys for a new participant ──────────────────
router.post('/generate-keys', auth, async (req, res) => {
  try {
    const keys = multisig.generateParticipantKeys();
    return res.json({
      success: true,
      data: {
        publicKey: keys.publicKey,
        address: keys.address
        // privateKey returned to caller only — never stored server-side
      }
    });
  } catch (err) {
    logger.error('Generate keys error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST: Initiate multisig setup ──────────────────────────────
router.post('/setup/initiate', auth, async (req, res) => {
  try {
    const { buyerKeys, sellerKeys, aiAgentKeys } = req.body;
    if (!buyerKeys || !sellerKeys || !aiAgentKeys) {
      return res.status(400).json({
        success: false,
        error: 'Missing required keys: buyerKeys, sellerKeys, aiAgentKeys'
      });
    }

    const setup = await multisig.initiateMultisigSetup({
      buyer: buyerKeys,
      seller: sellerKeys,
      aiAgent: aiAgentKeys
    });

    return res.status(201).json({ success: true, data: setup });
  } catch (err) {
    logger.error('Multisig setup error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST: Exchange keys and finalize ───────────────────────────
router.post('/setup/finalize', auth, async (req, res) => {
  try {
    const { walletId, participantMultisigInfos } = req.body;
    if (!walletId || !participantMultisigInfos || participantMultisigInfos.length !== 3) {
      return res.status(400).json({
        success: false,
        error: 'Need walletId and exactly 3 participantMultisigInfos'
      });
    }

    const wallet = await multisig.exchangeKeysAndFinalize(walletId, participantMultisigInfos);
    return res.json({ success: true, data: wallet });
  } catch (err) {
    logger.error('Multisig finalize error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST: Sign a transaction ───────────────────────────────────
router.post('/sign', auth, async (req, res) => {
  try {
    const { txData, privateKey } = req.body;
    if (!txData || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing txData or privateKey'
      });
    }

    const signature = multisig.signTransaction(txData, privateKey);
    return res.json({ success: true, data: signature });
  } catch (err) {
    logger.error('Sign transaction error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST: Combine signatures and broadcast ─────────────────────
router.post('/release', auth, async (req, res) => {
  try {
    const { multisigAddress, destination, amount, partialSignatures } = req.body;
    if (!multisigAddress || !destination || !amount || !partialSignatures) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: multisigAddress, destination, amount, partialSignatures'
      });
    }

    // Create the transaction
    const txData = multisig.createReleaseTransaction(multisigAddress, destination, amount);

    // Combine signatures
    const combinedTx = multisig.combineSignatures(txData, partialSignatures, 2);

    // Broadcast
    const result = await multisig.broadcastTransaction(combinedTx);

    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Release funds error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST: Refund ───────────────────────────────────────────────
router.post('/refund', auth, async (req, res) => {
  try {
    const { multisigAddress, buyerAddress, amount, partialSignatures } = req.body;
    if (!multisigAddress || !buyerAddress || !amount || !partialSignatures) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: multisigAddress, buyerAddress, amount, partialSignatures'
      });
    }

    const txData = multisig.createRefundTransaction(multisigAddress, buyerAddress, amount);
    const combinedTx = multisig.combineSignatures(txData, partialSignatures, 2);
    const result = await multisig.broadcastTransaction(combinedTx);

    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Refund error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
