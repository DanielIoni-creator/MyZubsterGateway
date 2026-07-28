const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get current user profile
router.get('/profile', authenticate, userController.getProfile);

// Update user profile
router.put('/profile', authenticate, userController.updateProfile);

// Get all users (admin only)
router.get('/', authenticate, isAdmin, userController.getAllUsers);

// Get user by ID (admin only)
router.get('/:id', authenticate, isAdmin, userController.getUserById);

// Update user role (admin only)
router.patch('/:id/role', authenticate, isAdmin, userController.updateUserRole);

// Delete user (admin only)
router.delete('/:id', authenticate, isAdmin, userController.deleteUser);

// Get user's orders
router.get('/:id/orders', authenticate, isAdmin, userController.getUserOrders);

module.exports = router;
