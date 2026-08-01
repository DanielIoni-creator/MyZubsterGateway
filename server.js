require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();

// ===== MIDDLEWARE =====
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== DATABASE =====
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

// ===== SWAGGER UI =====
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'MyZubsterGateway API Docs',
}));

// ===== ROUTES =====

// Health check
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MyZubsterGateway is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Token routes
const tokenRoutes = require('./routes/tokens');
app.use('/api/tokens', tokenRoutes);

// User routes
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Order routes
const orderRoutes = require('./routes/orders');
app.use('/api/orders', orderRoutes);

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Garden sensor routes
const gardenRoutes = require('./routes/garden');
app.use('/api/garden', gardenRoutes);

// Webhook verification routes
const webhookRoutes = require('./routes/webhook');
app.use('/api/webhook', webhookRoutes);

// Webhook outgoing routes
const webhooksRoutes = require('./routes/webhooks');
app.use('/api/webhooks', webhooksRoutes);

// Activity audit log routes
const activityRoutes = require('./routes/activity');
app.use('/api/activity', activityRoutes);
app.use('/api/admin/activity', activityRoutes.adminRouter);

// Marketplace routes
const marketplaceRoutes = require('./routes/marketplace');
app.use('/api/marketplace', marketplaceRoutes);

// Offer routes
const offerRoutes = require('./routes/offers');
app.use('/api/offers', offerRoutes);

// AI routes
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);

// Booking routes
const bookingRoutes = require('./routes/bookings');
app.use('/api/bookings', bookingRoutes);

// Escrow routes
const escrowRoutes = require('./routes/escrow');
app.use('/api/escrow', escrowRoutes);

// Governance routes
const governanceRoutes = require('./routes/governance');
app.use('/api/governance', governanceRoutes);

// Onion routes
const onionRoutes = require('./routes/onion');
app.use('/api/onion', onionRoutes);

// OSINT routes
const osintRoutes = require('./routes/osint');
app.use('/api/osint', osintRoutes);

// Payment routes
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

// Reputation routes
const reputationRoutes = require('./routes/reputation');
app.use('/api/reputation', reputationRoutes);

// Request routes
const requestRoutes = require('./routes/requests');
app.use('/api/requests', requestRoutes);

// Review routes
const reviewRoutes = require('./routes/reviews');
app.use('/api/reviews', reviewRoutes);

// Scanner routes
const scannerRoutes = require('./routes/scanner');
app.use('/api/scanner', scannerRoutes);

// Skill routes
const skillRoutes = require('./routes/skills');
app.use('/api/skills', skillRoutes);

// Tari blockchain routes
const tariRoutes = require('./routes/tari');
app.use('/api/tari', tariRoutes);

// Transaction routes
const transactionRoutes = require('./routes/transactions');
app.use('/api/transactions', transactionRoutes);

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const message = err.message || 'Internal server error';
  res.status(err.status || 500).json({
    success: false,
    message
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log(`API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
