require('dotenv').config();
const express = require('express');
<<<<<<< HEAD
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { authenticate } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const offerRoutes = require('./routes/offers');
const skillRoutes = require('./routes/skills');
const webhookRoutes = require('./routes/webhooks');
const plantRoutes = require('./routes/plants');
const certificateRoutes = require("./routes/certificates");
=======
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
>>>>>>> main

const app = express();
const PORT = process.env.PORT || 3001;

<<<<<<< HEAD
// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'MyZubster Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      orders: '/api/orders',
      payments: '/api/payments',
      users: '/api/users',
      offers: '/api/offers',
      skills: '/api/skills',
      webhooks: '/api/webhooks',
      plants: '/api/plants'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MyZubster Gateway',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', authenticate, orderRoutes);
app.use('/api/payments', authenticate, paymentRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/offers', authenticate, offerRoutes);
app.use('/api/skills', authenticate, skillRoutes);
app.use('/api/webhooks', authenticate, webhookRoutes);
app.use('/api/plants', authenticate, plantRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
=======
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
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

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

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
>>>>>>> main
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
<<<<<<< HEAD
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tokenization', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected');
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

=======
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

>>>>>>> main
module.exports = app;
