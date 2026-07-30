require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();

// ===== MIDDLEWARE =====
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const activityLogger = require('./middleware/activityLogger');
app.use(activityLogger());

// ===== DATABASE =====
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

// ===== ROUTES =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MyZubster Gateway is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Auth routes
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

// Token routes
const tokenRoutes = require('./src/routes/tokens');
app.use('/api/tokens', tokenRoutes);

// Order routes
const orderRoutes = require('./src/routes/orders');
app.use('/api/orders', orderRoutes);

// Admin routes
const adminRoutes = require('./src/routes/admin');
app.use('/api/admin', adminRoutes);

// Monero routes
const moneroRoutes = require('./src/routes/monero');
app.use('/api/monero', moneroRoutes);

// User routes
const userRoutes = require('./src/routes/users');
app.use('/api/users', userRoutes);

// Webhook verification routes
const webhookRoutes = require('./routes/webhook');
app.use('/api/webhook', webhookRoutes);

// Activity audit log routes
const activityRoutes = require('./routes/activity');
app.use('/api/activity', activityRoutes);
app.use('/api/admin/activity', activityRoutes.adminRouter);

// AI Multisig routes
const aiMultisigRoutes = require('./src/routes/ai-multisig');
app.use('/api/ai-multisig', aiMultisigRoutes);

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
