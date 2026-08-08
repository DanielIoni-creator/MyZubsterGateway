const express = require('express');
const router = express.Router();
const escrowController = require('../controllers/escrowController');
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

router.post('/', auth, escrowController.createEscrow);
router.get('/', escrowController.listEscrows);
router.get('/stats', auth, admin, escrowController.getStats);
router.get('/:escrowId', escrowController.getEscrow);
router.post('/:escrowId/fund', auth, escrowController.fundEscrow);
router.post('/:escrowId/verify', auth, escrowController.verifyEscrow);
router.post('/:escrowId/release', auth, escrowController.releaseEscrow);
router.post('/:escrowId/refund', auth, admin, escrowController.refundEscrow);

module.exports = router;
