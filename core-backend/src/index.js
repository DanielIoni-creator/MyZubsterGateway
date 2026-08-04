const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Versioning - v1
app.use('/api/v1', require('./api/v1'));

// Payment routes
const paymentRoutes = require('./payment/routes');
app.use('/api/v1/payments', paymentRoutes);

// ============ SWAGGER DOCUMENTATION ============
const { swaggerUi, specs } = require('./api/v1/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
console.log(`📖 API Docs: http://localhost:${PORT}/api-docs`);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    service: 'myzubster-backend'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MyZubster Backend running on port ${PORT}`);
  console.log(`📚 API v1: http://localhost:${PORT}/api/v1`);
  console.log(`💰 Payments: http://localhost:${PORT}/api/v1/payments`);
  console.log(`📖 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
});