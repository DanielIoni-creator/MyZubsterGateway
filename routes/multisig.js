const express = require('express');

const router = express.Router();
const moneroMultisigService = require('../services/moneroMultisigService');
const { MoneroMultisigError } = require('../services/moneroMultisigService');

/**
 * Wrap an async route handler to forward errors to Express error middleware.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/* ────────────── Orders ────────────── */

/**
 * POST /api/multisig/orders
 * Create a new multisig order.
 * Body: { participants: string[], requiredSignatures?: number, amount?: string,
 *         destinationAddress?: string, networkType?: string }
 */
router.post(
  '/orders',
  asyncHandler(async (req, res) => {
    const { participants, requiredSignatures, amount, destinationAddress, networkType } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least 2 participants are required' },
      });
    }

    const result = await moneroMultisigService.createOrder({
      participants,
      requiredSignatures: requiredSignatures || 2,
      amount: amount || '0',
      destinationAddress: destinationAddress || null,
      networkType: networkType || 'testnet',
    });

    res.status(201).json({ success: true, data: result });
  }),
);

/**
 * GET /api/multisig/orders
 * List multisig orders. Supports ?status= & ?networkType= filtering.
 */
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.currentStatus = req.query.status;
    if (req.query.networkType) filter.networkType = req.query.networkType;

    const orders = await moneroMultisigService.listOrders(filter);
    res.json({ success: true, data: orders, count: orders.length });
  }),
);

/**
 * GET /api/multisig/orders/:orderId
 * Get a single order by its orderId.
 */
router.get(
  '/orders/:orderId',
  asyncHandler(async (req, res) => {
    const order = await moneroMultisigService.getOrder(req.params.orderId);
    res.json({ success: true, data: order });
  }),
);

/* ────────────── Wallets ────────────── */

/**
 * POST /api/multisig/orders/:orderId/wallet
 * Generate a personal Monero wallet for a participant in the order.
 */
router.post(
  '/orders/:orderId/wallet',
  asyncHandler(async (req, res) => {
    const { networkType, userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userId is required' },
      });
    }

    // Verify participant exists
    const order = await moneroMultisigService.getOrder(req.params.orderId);
    if (!order.hasParticipant(userId)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'User is not a participant of this order' },
      });
    }

    const wallet = await moneroMultisigService.generateWallet(
      networkType || order.networkType || 'testnet',
      `Order ${order.orderId} - ${userId}`,
    );

    res.status(201).json({ success: true, data: wallet });
  }),
);

/* ────────────── Multisig Setup ────────────── */

/**
 * POST /api/multisig/orders/:orderId/setup
 * Initialise the 2/3 multisig wallet for the order.
 */
router.post(
  '/orders/:orderId/setup',
  asyncHandler(async (req, res) => {
    const result = await moneroMultisigService.setupMultisig(req.params.orderId);
    res.json({ success: true, data: result });
  }),
);

/* ────────────── Signing ────────────── */

/**
 * POST /api/multisig/orders/:orderId/sign
 * Sign the multisig transaction as a participant.
 * Body: { participantId: string }
 */
router.post(
  '/orders/:orderId/sign',
  asyncHandler(async (req, res) => {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'participantId is required' },
      });
    }

    const result = await moneroMultisigService.signTx(req.params.orderId, participantId);
    res.json({ success: true, data: result });
  }),
);

/* ────────────── Submit ────────────── */

/**
 * POST /api/multisig/orders/:orderId/submit
 * Submit the fully-signed transaction to the network.
 */
router.post(
  '/orders/:orderId/submit',
  asyncHandler(async (req, res) => {
    const result = await moneroMultisigService.submitTx(req.params.orderId);
    res.json({ success: true, data: result });
  }),
);

/* ────────────── Release & Refund ────────────── */

/**
 * POST /api/multisig/orders/:orderId/release
 * Release funds to the destination address after on-chain confirmation.
 */
router.post(
  '/orders/:orderId/release',
  asyncHandler(async (req, res) => {
    const result = await moneroMultisigService.releaseFunds(req.params.orderId);
    res.json({ success: true, data: result });
  }),
);

/**
 * POST /api/multisig/orders/:orderId/refund
 * Refund the order (only allowed from certain states).
 */
router.post(
  '/orders/:orderId/refund',
  asyncHandler(async (req, res) => {
    const result = await moneroMultisigService.refund(req.params.orderId);
    res.json({ success: true, data: result });
  }),
);

/* ────────────── Wallet Query ────────────── */

/**
 * GET /api/multisig/wallets
 * List stored wallets. Supports ?isMultisig= & ?networkType= filtering.
 */
router.get(
  '/wallets',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.isMultisig !== undefined) filter.isMultisig = req.query.isMultisig === 'true';
    if (req.query.networkType) filter.networkType = req.query.networkType;

    const wallets = await moneroMultisigService.getWallets(filter);
    res.json({ success: true, data: wallets, count: wallets.length });
  }),
);

/* ────────────── Error Handler ────────────── */

/**
 * In-route error handler for MoneroMultisigError instances.
 * Other errors are forwarded to the app-level error middleware.
 */
router.use((err, req, res, next) => {
  if (err instanceof MoneroMultisigError) {
    const statusCode = err.code === 'ORDER_NOT_FOUND' ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      error: {
        code: err.code || 'MULTISIG_ERROR',
        message: err.message,
      },
    });
  }
  next(err);
});

module.exports = router;
