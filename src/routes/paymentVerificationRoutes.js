const express = require('express');
const router = express.Router();
const pvc = require('../controllers/paymentVerificationController');
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

router.post('/', auth, pvc.createVerification);
router.get('/', pvc.listVerifications);
router.get('/stats', auth, admin, pvc.getStats);
router.get('/:verificationId', pvc.getVerification);
router.post('/:verificationId/confirmations', auth, pvc.updateConfirmations);
router.post('/:verificationId/anomaly-check', auth, pvc.runAnomalyCheck);
router.get('/:verificationId/report', pvc.getReport);

module.exports = router;
