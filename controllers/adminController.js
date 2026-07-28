// controllers/adminController.js
const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');

/**
 * GET /api/admin/stats
 * Aggregated statistics for the admin dashboard.
 * Protected by authenticate + authorizeAdmin (see routes/admin.js).
 */
async function getStats(req, res) {
  try {
    const [
      totalUsers,
      totalOrders,
      pendingOrders,
      recentOrders,
      revenueAgg,
      activeUsersLast24h,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.find().sort({ createdAt: -1 }).limit(10).lean(),
      Transaction.aggregate([
        { $match: { type: { $in: ['pagamento', 'fee'] }, status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    const totalRevenue = revenueAgg.length ? revenueAgg[0].total : 0;

    return res.json({
      totalUsers,
      totalOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      pendingOrders,
      recentOrders,
      activeUsersLast24h,
    });
  } catch (error) {
    console.error('getStats error:', error);
    return res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
}

/**
 * GET /api/admin/dashboard
 * Existing admin dashboard stats (kept for backward compatibility with routes/admin.js).
 */
async function getDashboardStats(req, res) {
  try {
    const [totalUsers, totalOrders, pendingOrders] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
    ]);
    return res.json({ totalUsers, totalOrders, pendingOrders });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
}

module.exports = { getStats, getDashboardStats, getAllOrders, updateOrder, deleteOrder, getAllUsers, promoteUser };

// --- Stubs for routes referenced by routes/admin.js (kept minimal/safe) ---
async function getAllOrders(req, res) {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ error: 'Errore nel recupero ordini' });
  }
}
async function updateOrder(req, res) {
  try {
    const order = await Order.findByIdAndUpdate(req.params.orderId, req.body, { new: true });
    if (!order) return res.status(404).json({ error: 'Ordine non trovato' });
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ error: 'Errore aggiornamento ordine' });
  }
}
async function deleteOrder(req, res) {
  try {
    const order = await Order.findByIdAndDelete(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Ordine non trovato' });
    return res.json({ message: 'Ordine eliminato' });
  } catch (error) {
    return res.status(500).json({ error: 'Errore eliminazione ordine' });
  }
}
async function getAllUsers(req, res) {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Errore nel recupero utenti' });
  }
}
async function promoteUser(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role: 'admin' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Errore promozione utente' });
  }
}
