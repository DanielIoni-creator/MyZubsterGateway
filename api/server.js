// api/server.js — Vercel serverless wrapper for MyZubster Gateway
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster';
if (mongoose.connection.readyState === 0 && MONGODB_URI !== 'mongodb://localhost:27017/myzubster') {
  mongoose.connect(MONGODB_URI).catch(() => {});
}

// Routes
try { app.use('/api/robot', require('../routes/robot')); } catch(e) {}
try { app.use('/api/robot', require('../routes/robotSchedule')); } catch(e) {}
try { app.use('/api/robot', require('../routes/robotReputation')); } catch(e) {}
try { app.use('/api/robot', require('../routes/robotCodeReview')); } catch(e) {}
try { app.use('/api/robot', require('../routes/robotSimulator')); } catch(e) {}
try { app.use('/api/robot', require('../routes/robotLogoAdvanced')); } catch(e) {}
try { app.use('/api/robot', require('../routes/robotEscrow')); } catch(e) {}
try { app.use('/api/robot', require('../routes/robotCode')); } catch(e) {}
try { app.use('/api', require('../routes/rewards')); } catch(e) {}
try { app.use('/api', require('../routes/bounty')); } catch(e) {}
try { app.use('/api', require('../routes/webhook')); } catch(e) {}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

module.exports = app;
