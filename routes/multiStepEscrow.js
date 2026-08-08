const express = require('express');
const router = express.Router();

const multiStepEscrows = [];

// POST /api/multistep-escrow/create-milestones - Create multi-step milestone escrow
router.post('/create-milestones', (req, res) => {
  const { title, totalAmount, milestones } = req.body;

  if (!title || !totalAmount || !milestones || !Array.isArray(milestones)) {
    return res.status(400).json({ error: 'title, totalAmount, and milestones array are required' });
  }

  const formattedMilestones = milestones.map((m, idx) => ({
    stepIndex: idx + 1,
    title: m.title || `Milestone ${idx + 1}`,
    amount: m.amount || Math.round(totalAmount / milestones.length),
    status: 'PENDING',
  }));

  const escrow = {
    id: `mse_${Date.now()}`,
    title,
    totalAmount,
    milestones: formattedMilestones,
    releasedAmount: 0,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  multiStepEscrows.push(escrow);
  res.status(201).json({ success: true, escrow });
});

// POST /api/multistep-escrow/:id/verify-step - Intermediate step verification
router.post('/:id/verify-step', (req, res) => {
  const { id } = req.params;
  const { stepIndex, proofUrl } = req.body;

  const escrow = multiStepEscrows.find((e) => e.id === id);
  if (!escrow) {
    return res.status(404).json({ error: 'Multi-step escrow not found' });
  }

  const milestone = escrow.milestones.find((m) => m.stepIndex === stepIndex);
  if (!milestone) {
    return res.status(404).json({ error: 'Milestone step not found' });
  }

  milestone.status = 'VERIFIED';
  milestone.proofUrl = proofUrl || '';
  res.json({ success: true, message: `Step ${stepIndex} verified`, milestone });
});

// POST /api/multistep-escrow/:id/release-step - Gradual milestone release
router.post('/:id/release-step', (req, res) => {
  const { id } = req.params;
  const { stepIndex } = req.body;

  const escrow = multiStepEscrows.find((e) => e.id === id);
  if (!escrow) {
    return res.status(404).json({ error: 'Multi-step escrow not found' });
  }

  const milestone = escrow.milestones.find((m) => m.stepIndex === stepIndex);
  if (!milestone) {
    return res.status(404).json({ error: 'Milestone step not found' });
  }

  if (milestone.status === 'RELEASED') {
    return res.status(400).json({ error: 'Milestone step already released' });
  }

  milestone.status = 'RELEASED';
  escrow.releasedAmount += milestone.amount;

  if (escrow.milestones.every((m) => m.status === 'RELEASED')) {
    escrow.status = 'COMPLETED';
  }

  res.json({ success: true, releasedMilestone: milestone, escrow });
});

// GET /api/multistep-escrow/dashboard - Multi-step milestone dashboard
router.get('/dashboard', (req, res) => {
  res.json({
    totalMultiStepEscrows: multiStepEscrows.length,
    activeCount: multiStepEscrows.filter((e) => e.status === 'ACTIVE').length,
    completedCount: multiStepEscrows.filter((e) => e.status === 'COMPLETED').length,
    recentEscrows: multiStepEscrows.slice(-5).reverse(),
  });
});

module.exports = router;
