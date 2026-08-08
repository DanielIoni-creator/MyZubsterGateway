const express = require('express');
const router = express.Router();

const subscriptions = [];

const PLANS = [
  { id: 'plan_basic', name: 'Basic Gateway Node', priceMYZ: 100, interval: 'monthly' },
  { id: 'plan_pro', name: 'Pro Relay Node', priceMYZ: 300, interval: 'monthly' },
  { id: 'plan_enterprise', name: 'Enterprise Mesh Cluster', priceMYZ: 700, interval: 'monthly' },
];

// GET /api/subscriptions/plans - List subscription plans
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

// POST /api/subscriptions/create - Create subscription
router.post('/create', (req, res) => {
  const { planId, userId, paymentMethod } = req.body;

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) {
    return res.status(400).json({ error: 'Invalid subscription planId' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const sub = {
    id: `sub_${Date.now()}`,
    planId: plan.id,
    planName: plan.name,
    userId,
    priceMYZ: plan.priceMYZ,
    paymentMethod: paymentMethod || 'MYZ',
    status: 'ACTIVE',
    autoRenew: true,
    nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };

  subscriptions.push(sub);
  res.status(201).json({ success: true, subscription: sub });
});

// POST /api/subscriptions/:id/renew - Auto-renew subscription
router.post('/:id/renew', (req, res) => {
  const { id } = req.params;
  const sub = subscriptions.find((s) => s.id === id);

  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  if (sub.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'Only active subscriptions can be renewed' });
  }

  sub.nextRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  res.json({ success: true, message: 'Subscription auto-renewed successfully', subscription: sub });
});

// POST /api/subscriptions/:id/cancel - Cancel subscription
router.post('/:id/cancel', (req, res) => {
  const { id } = req.params;
  const sub = subscriptions.find((s) => s.id === id);

  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  sub.status = 'CANCELLED';
  sub.autoRenew = false;
  res.json({ success: true, message: 'Subscription cancelled', subscription: sub });
});

// GET /api/subscriptions/dashboard - Subscription dashboard
router.get('/dashboard', (req, res) => {
  const activeCount = subscriptions.filter((s) => s.status === 'ACTIVE').length;
  const totalMYZRevenue = subscriptions.reduce((sum, s) => sum + s.priceMYZ, 0);

  res.json({
    totalSubscriptions: subscriptions.length,
    activeCount,
    totalMYZRevenue,
    plansAvailable: PLANS.length,
    subscriptions,
  });
});

module.exports = router;
