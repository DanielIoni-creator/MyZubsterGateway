// app.js - MyZubster Backend (con RPC reale)
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importa i servizi
const { convertUSDToXMR } = require('./services/exchangeRate');
const { startPaymentMonitor, addOrderToMonitor } = require('./services/paymentMonitor');

// Importa il database
const db = require('./models');

// Importa l'autenticazione
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

// Configurazione Monero
const MONERO_RPC_URL = process.env.MONERO_RPC_URL || 'http://localhost:18083';
const MONERO_NETWORK = process.env.MONERO_NETWORK || 'testnet';
const MONERO_MIN_CONFIRMATIONS = parseInt(process.env.MONERO_MIN_CONFIRMATIONS) || 10;

console.log(`🔒 Monero Network: ${MONERO_NETWORK}`);
console.log(`🔢 Min confirmations: ${MONERO_MIN_CONFIRMATIONS}`);

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug: log dei body ricevuti (solo per richieste non di autenticazione)
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.path.startsWith('/api/auth')) {
    console.log(`📨 Body ricevuto (${req.method} ${req.path}):`, req.body);
  }
  next();
});

// ========== GENERAZIONE SUBADDRESS VIA RPC ==========
async function generateRealSubaddress(label) {
  try {
    const moneroRpcUrl = process.env.MONERO_RPC_URL || 'http://localhost:18083';
    
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
      throw new Error(`RPC Error: ${data.error.message}`);
    }
    
    console.log(`🔑 Subaddress generato via RPC: ${data.result.address} (label: ${label})`);
    return data.result.address;
  } catch (error) {
    console.error('❌ Errore RPC (create_address):', error.message);
    // Fallback a mock se RPC fallisce
    const mockAddress = `MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    console.log(`🧪 [MOCK] Subaddress generato (fallback): ${mockAddress} (label: ${label})`);
    return mockAddress;
  }
}

// ========== ROUTES ==========

// Rotte di autenticazione (PUBBLICHE - non richiedono token)
app.use('/api/auth', authRoutes);

// ============================================
// ROTTE PROTETTE (richiedono token JWT)
// ============================================

// Middleware di autenticazione per TUTTE le rotte /api/orders
app.use('/api/orders', authenticateToken);

// 1. Crea un ordine e genera un subaddress Monero
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'USD', customerEmail } = req.body;

    if (!amount || !customerEmail) {
      return res.status(400).json({ 
        error: 'Campi mancanti: amount, customerEmail' 
      });
    }

    // Ottieni il prossimo addressIndex (in base al numero di ordini)
    const orderCount = await db.Order.count();
    const addressIndex = orderCount + 1;
    const label = `order_${addressIndex}`;

    // 🔑 Genera un subaddress via RPC reale
    const moneroAddress = await generateRealSubaddress(label);
    
    // 💱 Converti l'importo USD in XMR usando il tasso di cambio reale
    const moneroAmount = await convertUSDToXMR(amount);

    // Crea l'ordine nel database
    const newOrder = await db.Order.create({
      amount,
      currency,
      customerEmail,
      moneroAddress,
      moneroAmount,
      addressIndex,
      status: 'pending',
      network: MONERO_NETWORK
    });

    // Aggiungi al monitoraggio
    addOrderToMonitor(newOrder);

    console.log(`📦 Ordine creato: #${newOrder.id}`);
    console.log(`🔑 Subaddress generato: ${moneroAddress}`);
    console.log(`💰 Importo da pagare: ${moneroAmount.toFixed(8)} XMR`);
    console.log(`🌐 Network: ${MONERO_NETWORK}`);

    res.status(201).json(newOrder);

  } catch (error) {
    console.error('❌ Errore creazione ordine:', error);
    res.status(500).json({ 
      error: 'Errore interno del server',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 2. Recupera tutti gli ordini (dal database)
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await db.Order.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    console.error('❌ Errore recupero ordini:', error);
    res.status(500).json({ error: 'Errore recupero ordini' });
  }
});

// 3. Recupera un ordine per ID (dal database)
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await db.Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Ordine non trovato' });
    }
    res.json(order);
  } catch (error) {
    console.error('❌ Errore recupero ordine:', error);
    res.status(500).json({ error: 'Errore recupero ordine' });
  }
});

// 4. Recupera ordini per stato (dal database)
app.get('/api/orders/status/:status', authenticateToken, async (req, res) => {
  try {
    const status = req.params.status;
    const orders = await db.Order.findAll({
      where: { status },
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    console.error('❌ Errore recupero ordini per stato:', error);
    res.status(500).json({ error: 'Errore recupero ordini' });
  }
});

// 5. Health check (PUBBLICA - non richiede autenticazione)
app.get('/api/health', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    const totalOrders = await db.Order.count();
    const pendingOrders = await db.Order.count({ where: { status: 'pending' } });
    const completedOrders = await db.Order.count({ where: { status: 'completed' } });

    // Determina la modalità Monero
    const isRpcEnabled = process.env.MONERO_RPC_URL && process.env.MONERO_RPC_URL.length > 0;
    const mode = isRpcEnabled ? 'RPC (connesso)' : 'MOCK (RPC disabilitato)';

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'MyZubster Backend',
      version: '1.3.0',
      database: 'connected',
      authentication: 'enabled (JWT)',
      monero: {
        mode: mode,
        network: MONERO_NETWORK,
        minConfirmations: MONERO_MIN_CONFIRMATIONS
      },
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Root (PUBBLICA)
app.get('/', (req, res) => {
  res.json({
    message: 'MyZubster Backend API',
    version: '1.3.0',
    authentication: 'JWT required for /api/orders',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (requires token)'
      },
      orders: {
        create: 'POST /api/orders (requires token)',
        list: 'GET /api/orders (requires token)',
        get: 'GET /api/orders/:id (requires token)',
        status: 'GET /api/orders/status/:status (requires token)'
      },
      health: 'GET /api/health (public)'
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

// ========== SYNC DATABASE & START ==========
const startServer = async () => {
  try {
    // Sincronizza i modelli con il database
    await db.sequelize.authenticate();
    console.log('✅ Connessione PostgreSQL stabilita');

    await db.sequelize.sync({ alter: true });
    console.log('📦 Database sincronizzato (tabella orders creata/aggiornata)');

    // Avvia il server
    app.listen(PORT, () => {
      const isRpcEnabled = process.env.MONERO_RPC_URL && process.env.MONERO_RPC_URL.length > 0;
      console.log(`🚀 Server avviato su http://localhost:${PORT}`);
      console.log(`📦 Modalità: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Monero RPC: ${process.env.MONERO_RPC_URL || 'non configurato'}`);
      console.log(`🌐 Monero Network: ${MONERO_NETWORK}`);
      console.log(`🔐 JWT Authentication: ENABLED`);
      console.log(`📊 Fee Service: MOCK (2%)`);
      console.log(`🧪 Monero mode: ${isRpcEnabled ? 'RPC' : 'MOCK'}`);
      
      // Avvia il monitoraggio pagamenti
      startPaymentMonitor();
    });
  } catch (error) {
    console.error('❌ Errore avvio server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;