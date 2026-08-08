/**
 * EVA IONI - Gateway API
 * Riceve dati dai sensori Arduino e li inoltra a MyZubster
 */

const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3002;

app.use(express.json());

// Endpoint per ricevere dati da Arduino
app.post('/api/sensors', async (req, res) => {
  const { gardenId, ph, ec, temperature, humidity, timestamp } = req.body;
  
  if (!gardenId || ph === undefined) {
    return res.status(400).json({ 
      error: 'gardenId and ph are required' 
    });
  }

  console.log(`📡 Ricevuti dati da ${gardenId}:`, {
    ph, ec, temperature, humidity
  });

  try {
    // Inoltra a MyZubster Marketplace
    const response = await axios.post(
      'http://localhost:4000/api/sensors/data',
      req.body,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    res.json({
      success: true,
      message: 'Dati inoltrati a MyZubster',
      data: response.data
    });
  } catch (error) {
    console.error('❌ Errore inoltro:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'EVA IONI Gateway',
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`🚪 EVA IONI Gateway avviato su porta ${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/api/sensors`);
  console.log(`🔍 Health: http://localhost:${PORT}/health`);
});

// ============================================================
// PAGAMENTI MONERO - INTEGRAZIONE CON MYZUBSTER
// ============================================================

const axios = require('axios');
const MONERO_GATEWAY = process.env.MONERO_GATEWAY || 'http://localhost:3003';

// Crea un pagamento per un ordine
app.post('/api/payments/create', async (req, res) => {
  try {
    const { amount, description, metadata } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required and must be > 0'
      });
    }

    const response = await axios.post(
      `${MONERO_GATEWAY}/api/payments`,
      { amount, description, metadata }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verifica un pagamento
app.post('/api/payments/verify/:id', async (req, res) => {
  try {
    const response = await axios.post(
      `${MONERO_GATEWAY}/api/payments/${req.params.id}/verify`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ottieni lo stato di un pagamento
app.get('/api/payments/status/:id', async (req, res) => {
  try {
    const response = await axios.get(
      `${MONERO_GATEWAY}/api/payments/${req.params.id}`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crea un pagamento per EVA IONI Robot
app.post('/api/payments/robot', async (req, res) => {
  try {
    const { gardenId, duration, wallet } = req.body;
    
    if (!gardenId || !duration) {
      return res.status(400).json({
        success: false,
        error: 'gardenId and duration are required'
      });
    }

    const amount = 0.05 * duration; // 0.05 XMR per giorno
    const description = `EVA IONI Robot - Garden ${gardenId} - ${duration} days`;

    const response = await axios.post(
      `${MONERO_GATEWAY}/api/payments`,
      {
        amount,
        description,
        metadata: {
          gardenId,
          duration,
          wallet,
          type: 'robot_rental'
        }
      }
    );

    res.json({
      success: true,
      data: {
        payment: response.data.data,
        amount: amount,
        duration: duration,
        gardenId: gardenId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
