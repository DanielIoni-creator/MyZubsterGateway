// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const Webhook = require('../models/Webhook');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { authorizeAdmin, logAdminAction } = require('../middleware/admin');

// Applica autenticazione e autorizzazione a tutte le route admin
router.use(authenticate);
router.use(authorizeAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Ordini
router.get('/orders', adminController.getAllOrders);
router.put('/orders/:orderId', logAdminAction('Aggiornamento ordine'), adminController.updateOrder);
router.delete('/orders/:orderId', logAdminAction('Eliminazione ordine'), adminController.deleteOrder);

// Utenti
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/promote', logAdminAction('Promozione utente'), adminController.promoteUser);

// ============================================
// WEBHOOK MANAGEMENT API (#21)
// ============================================

// POST /api/admin/webhooks — Create a webhook
router.post('/webhooks', async (req, res) => {
  try {
    const { url, events, secret, active } = req.body;

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'URL and an array of events are required.' });
    }

    const generatedSecret = secret || crypto.randomBytes(24).toString('hex');

    const webhook = new Webhook({
      url,
      events,
      secret: generatedSecret,
      active: active !== undefined ? active : true
    });

    await webhook.save();
    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/webhooks — List webhooks
router.get('/webhooks', async (req, res) => {
  try {
    const webhooks = await Webhook.find().sort({ createdAt: -1 });
    res.json({ success: true, count: webhooks.length, data: webhooks });
  } catch (error) {
    console.error('Error listing webhooks:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/webhooks/:id — Update a webhook
router.put('/webhooks/:id', async (req, res) => {
  try {
    const { url, events, secret, active } = req.body;
    const updateData = {};

    if (url) updateData.url = url;
    if (events) updateData.events = events;
    if (secret) updateData.secret = secret;
    if (active !== undefined) updateData.active = active;

    const webhook = await Webhook.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ success: true, data: webhook });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/webhooks/:id — Delete a webhook
router.delete('/webhooks/:id', async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;