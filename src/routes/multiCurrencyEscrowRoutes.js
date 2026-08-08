const express = require('express');
const router = express.Router();
const mcEscrowController = require('../controllers/multiCurrencyEscrowController');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const admin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
  next();
};

router.post('/', auth, mcEscrowController.createEscrow);
router.get('/', mcEscrowController.listEscrows);
router.get('/dashboard', mcEscrowController.getDashboard);
router.get('/stats', auth, admin, mcEscrowController.getStats);
router.get('/:escrowId', mcEscrowController.getEscrow);
router.post('/:escrowId/fund', auth, mcEscrowController.fundEscrow);
router.post('/:escrowId/swap', auth, mcEscrowController.executeSwap);
router.post('/:escrowId/release', auth, mcEscrowController.releaseEscrow);
router.post('/:escrowId/refund', auth, admin, mcEscrowController.refundEscrow);

module.exports = router;
