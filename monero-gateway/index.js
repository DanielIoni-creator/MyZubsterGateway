const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3004;

app.use(cors());
app.use(express.json());

const payments = new Map();

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Monero Gateway', version: '1.0.0' });
});

// Balance
app.get('/api/wallet/balance', (req, res) => {
  res.json({ success: true, data: { balance: 0.5, currency: 'XMR' } });
});

// Create payment
app.post('/api/payments', (req, res) => {
  const { amount, description } = req.body;
  if (!amount) return res.status(400).json({ error: 'Amount required' });
  
  const id = uuidv4();
  const payment = {
    id,
    amount,
    description: description || 'EVA IONI',
    status: 'pending',
    address: '83vZt8bKc5qXyHZKwj2Qq3Yp',
    createdAt: new Date().toISOString()
  };
  payments.set(id, payment);
  res.json({ success: true, data: payment });
});

// Get payment
app.get('/api/payments/:id', (req, res) => {
  const p = payments.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, data: p });
});

// Verify payment
app.post('/api/payments/:id/verify', (req, res) => {
  const p = payments.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.status = 'confirmed';
  p.confirmedAt = new Date().toISOString();
  payments.set(req.params.id, p);
  res.json({ success: true, data: p });
});

// Stats
app.get('/api/payments/stats', (req, res) => {
  const all = Array.from(payments.values());
  const confirmed = all.filter(p => p.status === 'confirmed');
  res.json({
    success: true,
    data: {
      total: all.length,
      pending: all.filter(p => p.status === 'pending').length,
      confirmed: confirmed.length,
      totalAmount: confirmed.reduce((s, p) => s + p.amount, 0),
      currency: 'XMR'
    }
  });
});

app.listen(PORT, () => {
  console.log('💰 Monero Gateway running on port 3004');
});
