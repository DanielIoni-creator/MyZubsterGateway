const express = require('express');
const router = express.Router();

// GET /api/verification
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Verification endpoint',
    verifications: []
  });
});

// POST /api/verification
router.post('/', (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Verification request created',
    verification: {
      id: 'ver_1',
      status: 'pending',
      userId: req.body.userId || 'unknown',
      timestamp: new Date().toISOString()
    }
  });
});

// GET /api/verification/:id
router.get('/:id', (req, res) => {
  res.json({
    success: true,
    verification: {
      id: req.params.id,
      status: 'completed',
      verified: true,
      timestamp: new Date().toISOString()
    }
  });
});

// PUT /api/verification/:id
router.put('/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Verification updated',
    verification: {
      id: req.params.id,
      status: 'verified',
      updatedAt: new Date().toISOString()
    }
  });
});

module.exports = router;
