const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.GATEWAY_PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

const API_VERSION = 'v1';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

app.use(`/api/${API_VERSION}`, createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    [`^/api/${API_VERSION}`]: `/api/${API_VERSION}`
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err);
    res.status(500).json({ success: false, error: 'Gateway error' });
  }
}));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    version: '1.0.0',
    backend: BACKEND_URL,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚪 API Gateway running on port ${PORT}`);
  console.log(`🔗 Backend: ${BACKEND_URL}`);
  console.log(`📡 API: http://localhost:${PORT}/api/${API_VERSION}`);
});