const express = require('express');
const router = express.Router();
const MoneroEscrow2of3 = require('../escrow_2of3');

/**
 * @route   POST /api/escrow-2of3/create
 * @desc    Create a new 2-of-3 escrow contract
 * @access  Authenticated
 */
router.post('/create', (req, res) => {
  try {
    const { id, buyer, seller, arbitrator, amount, description, timeoutHours } = req.body;
    const escrow = MoneroEscrow2of3.create({ id, buyer, seller, arbitrator, amount, description, timeoutHours });
    res.status(201).json({ success: true, data: escrow });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/escrow-2of3/fund
 * @desc    Buyer funds the escrow (locks MYZ)
 * @access  Authenticated
 */
router.post('/fund', (req, res) => {
  try {
    const { id, caller } = req.body;
    const escrow = MoneroEscrow2of3.fund(id, caller);
    res.json({ success: true, data: escrow });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/escrow-2of3/sign-release
 * @desc    Sign to release funds to seller (2-of-3 required)
 * @access  Authenticated
 */
router.post('/sign-release', (req, res) => {
  try {
    const { id, caller } = req.body;
    const result = MoneroEscrow2of3.signRelease(id, caller);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/escrow-2of3/sign-refund
 * @desc    Sign to refund back to buyer (2-of-3 required)
 * @access  Authenticated
 */
router.post('/sign-refund', (req, res) => {
  try {
    const { id, caller } = req.body;
    const result = MoneroEscrow2of3.signRefund(id, caller);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/escrow-2of3/dispute
 * @desc    Open a dispute
 * @access  Authenticated
 */
router.post('/dispute', (req, res) => {
  try {
    const { id, caller, reason } = req.body;
    const escrow = MoneroEscrow2of3.openDispute(id, caller, reason);
    res.json({ success: true, data: escrow });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/escrow-2of3/resolve
 * @desc    Resolve a dispute (2-of-3 resolution signatures required)
 * @access  Authenticated
 */
router.post('/resolve', (req, res) => {
  try {
    const { id, caller, resolution, splitRatio } = req.body;
    const result = MoneroEscrow2of3.resolveDispute(id, caller, resolution, splitRatio);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/escrow-2of3/auto-refund
 * @desc    Trigger auto-refund if timeout expired
 * @access  Public
 */
router.post('/auto-refund', (req, res) => {
  try {
    const { id } = req.body;
    const result = MoneroEscrow2of3.autoRefund(id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * @route   GET /api/escrow-2of3/:id
 * @desc    Get escrow details by ID
 * @access  Public
 */
router.get('/:id', (req, res) => {
  try {
    const escrow = MoneroEscrow2of3.get(req.params.id);
    res.json({ success: true, data: escrow });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

/**
 * @route   GET /api/escrow-2of3
 * @desc    List all escrows with optional filters
 * @access  Public
 * @query   status - Filter by status
 * @query   party - Filter by party address
 */
router.get('/', (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.party) filters.party = req.query.party;
    const list = MoneroEscrow2of3.list(filters);
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * @route   GET /api/escrow-2of3/stats/overview
 * @desc    Get escrow statistics
 * @access  Public
 */
router.get('/stats/overview', (req, res) => {
  try {
    const stats = MoneroEscrow2of3.stats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
