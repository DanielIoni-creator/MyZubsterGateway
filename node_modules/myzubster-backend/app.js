// =============================================
// MYZUBSTER - BACKEND SERVER
// Con Fee Decentralizzata Integrata
// =============================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Carica variabili d'ambiente
dotenv.config();

// Importa servizi
const FeeService = require('./services/FeeService');

// Importa routes
const feeRoutes = require('./routes/feeRoutes');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const skillRoutes = require('./routes/skills');
const reviewRoutes = require('./routes/reviews');
const notificationRoutes = require('./routes/notifications');

// =============================================
// CONFIGURAZIONE EXPRESS
// =============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// =============================================
// ROUTES
// =============================================

// 1. ROUTE PER LA FEE DECENTRALIZZATA
app.use('/api/fee', feeRoutes);

// 2. ROUTE PER AUTENTICAZIONE
app.use('/api/auth', authRoutes);

// 3. ROUTE PER PRENOTAZIONI
app.use('/api/bookings', bookingRoutes);

// 4. ROUTE PER PAGAMENTI
app.use('/api/payments', paymentRoutes);

// 5. ROUTE PER UTENTI
app.use('/api/users', userRoutes);

// 6. ROUTE PER SKILL
app.use('/api/skills', skillRoutes);

// 7. ROUTE PER RECENSIONI
app.use('/api/reviews', reviewRoutes);

// 8. ROUTE PER NOTIFICHE
app.use('/api/notifications', notificationRoutes);

// 9. ENDPOINT PER PAGAMENTO CON FEE DECENTRALIZZATA
app.post('/api/payment/process', async (req, res) => {
    try {
        const { 
            bookingId, 
            amount, 
            userAddress, 
            userVolume = 0,
            professionalAddress 
        } = req.body;

        // Validazione
        if (!bookingId || !amount || !userAddress) {
            return res.status(400).json({
                success: false,
                error: 'Mancano campi obbligatori: bookingId, amount, userAddress'
            });
        }

        // 1. Calcola la fee usando il modello affine
        const feeInfo = await FeeService.calculateAffineFee(amount, userVolume);
        
        // 2. Calcola distribuzione della fee
        const distribution = await FeeService.calculateDistribution(feeInfo.totalFee);
        
        // 3. Calcola importo netto per il professionista
        const netAmount = amount - (feeInfo.totalFee / 100);

        // 4. Ottieni configurazione fee corrente
        const feeConfig = await FeeService.getCurrentFeeConfig();

        // 5. Crea transazione (simulata per ora)
        const paymentResult = {
            txHash: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            address: `4A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6A7B8C9D0E`,
            amount: netAmount,
            fee: feeInfo.totalFee / 100
        };

        // 6. Rispondi al client
        res.json({
            success: true,
            data: {
                bookingId,
                amount,
                netAmount: netAmount.toFixed(2),
                feeInfo,
                distribution,
                feeConfig,
                txHash: paymentResult.txHash,
                moneroAddress: paymentResult.address,
                status: 'pending',
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Errore processamento pagamento:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Errore durante il processamento del pagamento'
        });
    }
});

// =============================================
// HEALTH CHECK
// =============================================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: {
            feeDecentralization: true,
            governance: true,
            moneroIntegration: process.env.MONERO_RPC_URL ? true : false
        }
    });
});

// =============================================
// ERROR HANDLING
// =============================================

// 404 - Not Found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint non trovato'
    });
});

// Error handler globale
app.use((err, req, res, next) => {
    console.error('Errore globale:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Errore interno del server' 
            : err.message
    });
});

// =============================================
// AVVIO DEL SERVER
// =============================================

const startServer = async () => {
    try {
        // Inizializza servizi
        console.log('🚀 Avvio server MyZubster...');
        
        console.log('⚖️ Inizializzazione Fee Service...');
        const config = await FeeService.getCurrentFeeConfig();
        if (config) {
            console.log('✅ Fee config caricata:', {
                baseFee: config.baseFee / 100,
                variableRate: config.variableRate / 100,
                discountThreshold: config.discountThreshold,
                discountRate: config.discountRate / 100
            });
        } else {
            console.log('⚠️ Fee config non disponibile (contratto non reachable)');
        }

        // Avvia server
        app.listen(PORT, () => {
            console.log(`✅ Server avviato su http://localhost:${PORT}`);
            console.log(`📊 Dashboard Fee: http://localhost:${PORT}/api/fee/config`);
            console.log(`❤️ Health check: http://localhost:${PORT}/health`);
            console.log(`🔗 CORS abilitato per: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
        });

        // Avvia monitoraggio fee in tempo reale (opzionale)
        if (process.env.ENABLE_FEE_MONITORING === 'true') {
            await FeeService.monitorFeeChanges();
            console.log('👁️ Monitoraggio fee attivo');
        }

    } catch (error) {
        console.error('❌ Errore durante l\'avvio:', error);
        process.exit(1);
    }
};

// Gestione chiusura graceful
process.on('SIGINT', async () => {
    console.log('\n👋 Chiusura server...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n👋 Chiusura server...');
    process.exit(0);
});

// =============================================
// AVVIA IL SERVER
// =============================================

startServer();

// =============================================
// EXPORT PER TEST
// =============================================

module.exports = app;