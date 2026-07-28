// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorizeAdmin, logAdminAction } = require('../middleware/admin');

// Applica autenticazione e autorizzazione a tutte le route admin
router.use(authenticate);
router.use(authorizeAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Aggregated stats (bounty #32)
router.get('/stats', adminController.getStats);

// Ordini
router.get('/orders', adminController.getAllOrders);
router.put('/orders/:orderId', logAdminAction('Aggiornamento ordine'), adminController.updateOrder);
router.delete('/orders/:orderId', logAdminAction('Eliminazione ordine'), adminController.deleteOrder);

// Utenti
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/promote', logAdminAction('Promozione utente'), adminController.promoteUser);

module.exports = router;