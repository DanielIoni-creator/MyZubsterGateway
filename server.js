const express = require('express');
const mongoose = require('mongoose');
const { createOrder, onPaymentReceived } = require('./buy_myz');
const { createEscrow, lockFunds, submitProof, release, dispute, getEscrow } = require('./escrow_simulator');
const { mint, balance } = require('./token_simulator');
const { assignReward } = require('./services/rewardService');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.post('/buy-myz', (req, res) => {
  const { userTariWallet, amountMYZ } = req.body;
  const order = createOrder(userTariWallet, amountMYZ);
  onPaymentReceived(order.id, 10);
  res.json({ orderId: order.id, xmrAddress: order.xmrAddress, amountXMR: order.amountXMR, status: 'pending' });
});

app.post('/escrow/create', (req, res) => {
  const { escrowId, buyer, seller, amount } = req.body;
  try {
    const id = createEscrow(escrowId, buyer, seller, amount);
    res.json({ escrowId: id, status: 'created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ROUTE PER BOUNTY, STAKE, ESCROW IMMOBILIARE, REWARDS
app.use('/api/bounty', require('./routes/bounty'));
app.use('/api/stake', require('./routes/stake'));
app.use('/api/escrow/house', require('./routes/escrowHouse'));
app.use('/api/rewards', require('./routes/rewards'));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MyZubster Gateway is running!', timestamp: new Date().toISOString(), version: '1.0.0' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Gateway running on http://localhost:${PORT}`);
});
