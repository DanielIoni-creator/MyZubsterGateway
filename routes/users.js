const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);
router.get('/', authenticate, isAdmin, userController.getAllUsers);
router.get('/:id', authenticate, isAdmin, userController.getUserById);
router.patch('/:id/role', authenticate, isAdmin, userController.updateUserRole);
router.delete('/:id', authenticate, isAdmin, userController.deleteUser);
router.get('/:id/orders', authenticate, isAdmin, userController.getUserOrders);

module.exports = router;
