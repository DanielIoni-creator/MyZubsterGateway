const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Importa le route
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const skillRoutes = require('./routes/skillRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const bookingHistoryRoutes = require('./routes/bookingHistoryRoutes'); // 👈 NUOVA ROUTE
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const escrowRoutes = require('./routes/escrowRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Carica le variabili d'ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve file statici (se necessario)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/bookings', bookingHistoryRoutes); // 👈 NUOVA ROUTE PER LO STORICO
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/chats', chatRoutes);

// ==================== ROUTE DI TEST ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// ==================== GESTIONE ERRORI 404 ====================
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint non trovato' 
  });
});

// ==================== GESTIONE ERRORI GLOBALE ====================
app.use((err, req, res, next) => {
  console.error('Errore del server:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Errore interno del server' 
  });
});

// ==================== CONNESSIONE AL DATABASE ====================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connesso a MongoDB');
  // Avvia il server solo dopo la connessione al database
  app.listen(PORT, () => {
    console.log(`🚀 Server avviato sulla porta ${PORT}`);
    console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
})
.catch((err) => {
  console.error('❌ Errore di connessione a MongoDB:', err);
  process.exit(1);
});

// Gestione segnali di terminazione
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('🛑 Connessione MongoDB chiusa');
    process.exit(0);
  });
});

module.exports = app;