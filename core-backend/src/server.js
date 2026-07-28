const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect('mongodb://myzubster-mongodb:27017/myzubster', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connesso a MongoDB'))
.catch(err => console.error('❌ Errore MongoDB:', err));

// Schema Token
const TokenSchema = new mongoose.Schema({
  name: String,
  symbol: String,
  totalSupply: Number,
  assetValue: Number,
  tokenPrice: Number,
  contractAddress: String,
  blockchain: String,
  assetType: String,
  assetDescription: String,
  assetLocation: String,
  issuer: String,
  status: String,
  owner: String, // Nuovo campo per il proprietario del token
  createdAt: Date,
  updatedAt: Date
});

const Token = mongoose.model('Token', TokenSchema);

// ============================================================
// API ROUTES
// ============================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'MyZubsterGateway'
  });
});

// GET /api/tokens - Lista tutti i token
app.get('/api/tokens', async (req, res) => {
  try {
    const tokens = await Token.find({}).sort({ createdAt: -1 });
    res.json(tokens);
  } catch (error) {
    console.error('❌ Errore nel recupero dei token:', error);
    res.status(500).json({ error: 'Errore nel recupero dei token' });
  }
});

// GET /api/tokens/:id - Dettaglio token
app.get('/api/tokens/:id', async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ error: 'Token non trovato' });
    }
    res.json(token);
  } catch (error) {
    console.error('❌ Errore nel recupero del token:', error);
    res.status(500).json({ error: 'Errore nel recupero del token' });
  }
});

// ============================================================
// NUOVO ENDPOINT: GET /api/tokens/balance/:walletAddress
// ============================================================
app.get('/api/tokens/balance/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Verifica che l'indirizzo wallet sia valido
    if (!walletAddress || walletAddress.length < 10) {
      return res.status(400).json({ error: 'Wallet address non valido' });
    }

    // Cerca tutti i token posseduti da questo wallet
    const tokens = await Token.find({ owner: walletAddress });
    
    // Calcola il saldo totale
    const totalBalance = tokens.reduce((total, token) => total + token.totalSupply, 0);
    
    res.json({
      walletAddress,
      tokens: tokens.map(t => ({
        symbol: t.symbol,
        name: t.name,
        balance: t.totalSupply,
        value: t.assetValue,
        location: t.assetLocation
      })),
      totalBalance: totalBalance,
      tokenCount: tokens.length
    });
  } catch (error) {
    console.error('❌ Errore nel recupero del saldo:', error);
    res.status(500).json({ error: 'Errore nel recupero del saldo del wallet' });
  }
});

// POST /api/tokens - Crea nuovo token
app.post('/api/tokens', async (req, res) => {
  try {
    const tokenData = {
      ...req.body,
      owner: req.body.owner || '6a5f742332b226d34448d39c',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const token = new Token(tokenData);
    await token.save();
    res.status(201).json(token);
  } catch (error) {
    console.error('❌ Errore nella creazione del token:', error);
    res.status(500).json({ error: 'Errore nella creazione del token' });
  }
});

// DELETE /api/tokens/:id - Elimina token
app.delete('/api/tokens/:id', async (req, res) => {
  try {
    const token = await Token.findByIdAndDelete(req.params.id);
    if (!token) {
      return res.status(404).json({ error: 'Token non trovato' });
    }
    res.json({ message: 'Token eliminato con successo' });
  } catch (error) {
    console.error('❌ Errore nella eliminazione del token:', error);
    res.status(500).json({ error: 'Errore nella eliminazione del token' });
  }
});

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 - Not Found
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Tokens: http://localhost:${PORT}/api/tokens`);
  console.log(`💳 Balance: http://localhost:${PORT}/api/tokens/balance/:walletAddress`);
});

module.exports = app;
