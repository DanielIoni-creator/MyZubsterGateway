const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/disputeController');
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
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

router.post('/', auth, disputeController.createDispute);
router.get('/', disputeController.listDisputes);
router.get('/stats', auth, admin, disputeController.getStats);
router.get('/:disputeId', disputeController.getDispute);
router.post('/:disputeId/evidence', disputeController.submitEvidence);
router.post('/:disputeId/voting', auth, disputeController.startVoting);
router.post('/:disputeId/vote', disputeController.castVote);
router.post('/:disputeId/resolve', auth, admin, disputeController.resolveDispute);

module.exports = router;
