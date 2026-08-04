// server.js - PULITO e FUNZIONANTE (senza web3, senza models)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Importa i servizi (se hai già un servizio Monero)
// const moneroService = require('./services/MoneroService');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Applica bodyParser.json() SOLO alle rotte /api (esclude /ws)
app.use('/api', bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ========== DATI IN MEMORIA (per test) ==========
let orders = [];
let orderIdCounter = 1;

// ========== ROUTES ==========

// 1. Crea un ordine e genera un subaddress Monero
app.post('/api/orders', async (req, res) => {
  try {
    const { amount, currency, customerEmail } = req.body;

    if (!amount || !currency || !customerEmail) {
      return res.status(400).json({ error: 'Campi mancanti: amount, currency, customerEmail' });
    }

    // 🔑 Genera un nuovo subaddress via RPC Monero
    const moneroRpcUrl = process.env.MONERO_RPC_URL || 'http://localhost:18083';
    const label = `order_${orderIdCounter}`;

    const response = await fetch(`${moneroRpcUrl}/json_rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '0',
        method: 'create_address',
        params: {
          account_index: 0,
          label: label
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('❌ Errore RPC Monero:', data.error);
      return res.status(500).json({ error: 'Errore nella generazione del subaddress', details: data.error });
    }

    const moneroAddress = data.result.address;
    const moneroAmount = amount * 0.001; // esempio: converti in XMR (da aggiustare)

    // Salva l'ordine in memoria
    const newOrder = {
      id: orderIdCounter++,
      amount,
      currency,
      customerEmail,
      moneroAddress,
      moneroAmount,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    orders.push(newOrder);

    console.log(`📦 Ordine creato: ${newOrder.id}`);
    console.log(`🔑 Subaddress generato: ${moneroAddress}`);

    res.status(201).json(newOrder);

  } catch (error) {
    console.error('❌ Errore creazione ordine:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// 2. Recupera tutti gli ordini
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// 3. Recupera un ordine per ID
app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) {
    return res.status(404).json({ error: 'Ordine non trovato' });
  }
  res.json(order);
});

// 4. Health check
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MyZubster Backend',
    database: 'in-memory (test)',
    monero: {
      rpc: process.env.MONERO_RPC_URL,
      network: process.env.MONERO_NETWORK
    }
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'MyZubster Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      orders: '/api/orders'
    }
  });
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
  console.error('❌ Errore server:', err.stack);
  res.status(500).json({
    error: 'Errore interno del server',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}`);
  console.log(`📦 Modalità: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Monero RPC: ${process.env.MONERO_RPC_URL || 'non configurato'}`);
  console.log(`📊 Fee Service: MOCK (2%)`);
  console.log(`👥 Ordini in memoria: ${orders.length}`);
});