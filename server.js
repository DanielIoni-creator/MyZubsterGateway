const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://myzubster-mongodb:27017/myzubster';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ---- Routes ----
const moneroRoutes = require('./routes/monero');
const webhookRoutes = require('./routes/webhooks');
const bountyRoutes = require('./routes/bountyRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const authRoutes = require('./routes/authRoutes');
const animalRoutes = require('./routes/animalRoutes');
const plantRoutes = require('./routes/plantRoutes');

app.use('/api/monero', moneroRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/bounties', bountyRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/plants', plantRoutes);

// ---- Health Check ----
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Error Handling ----
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ---- Start Server ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
