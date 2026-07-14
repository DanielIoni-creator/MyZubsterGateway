// services/paymentService.js
const { Order } = require('../models');
const moneroService = require('./moneroService');

class PaymentService {
  constructor() {
    this.confirmationDelay = parseInt(process.env.MOCK_PAYMENT_DELAY) || 3000;
    this.payments = new Map();
    this.monitorJobs = new Map();
    this.maxConfirmations = 10;
    this.pollingInterval = 10000;
    this.maxAttempts = 60;
    
    console.log('[Payment] ⚙️ Servizio pagamenti avviato');
    console.log(`[Payment] 💰 Modalità: ${process.env.USE_REAL_MONERO === 'true' ? 'Monero Reale' : 'Mock'}`);
  }

  // ========== CREA PAGAMENTO ==========
  async createPayment(orderId, amount, currency = 'XMR') {
    if (process.env.USE_REAL_MONERO !== 'true') {
      return this._createMockPayment(orderId, amount, currency);
    }

    try {
      const label = `Ordine ${orderId}`;
      const subaddress = await moneroService.createSubaddress(label);
      
      const payment = {
        id: `monero_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        orderId,
        amount,
        currency,
        status: 'pending',
        createdAt: new Date().toISOString(),
        address: subaddress.address,
        addressIndex: subaddress.addressIndex,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${subaddress.address}`,
        memo: `Pagamento ordine ${orderId}`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        isMonero: true,
        confirmations: 0,
        maxConfirmations: this.maxConfirmations
      };

      this.payments.set(payment.id, payment);
      
      // Avvia monitoraggio
      this._startPaymentMonitoring(orderId, subaddress.addressIndex, payment.id);
      
      console.log(`[Payment] 💰 Pagamento Monero creato: ${payment.id}`);
      console.log(`[Payment] 📍 Subaddress: ${subaddress.address} (indice ${subaddress.addressIndex})`);
      
      return payment;
    } catch (error) {
      console.error('[Payment] ❌ Errore creazione pagamento Monero:', error.message);
      return this._createMockPayment(orderId, amount, currency);
    }
  }

  // ========== CONFERMA PAGAMENTO ==========
  async confirmPayment(paymentId) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('Pagamento non trovato');
    }

    if (payment.status === 'pending') {
      payment.status = 'confirmed';
      payment.confirmedAt = new Date().toISOString();
      console.log(`[Payment] ✅ Pagamento CONFERMATO: ${paymentId}`);
      await this._onPaymentConfirmed(payment);
    }

    return payment;
  }

  // ========== STATO PAGAMENTO ==========
  async getPaymentStatus(paymentId) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('Pagamento non trovato');
    }
    return { ...payment };
  }

  // ========== GENERA SUBADDRESS ==========
  async generatePaymentAddress(orderId) {
    try {
      const label = `Ordine ${orderId}`;
      return await moneroService.createSubaddress(label);
    } catch (error) {
      console.error('[Payment] ❌ Errore generazione subaddress:', error.message);
      throw error;
    }
  }

  // ========== MONITORAGGIO PAGAMENTI ==========
  async _startPaymentMonitoring(orderId, addressIndex, paymentId) {
    console.log(`[Payment] 🔍 Avvio monitoraggio pagamento per ordine ${orderId}...`);
    
    const onProgress = (data) => {
      console.log(`[Payment] 📊 Conferme: ${data.confirmations}/${data.maxConfirmations} (${Math.round(data.progress)}%)`);
    };

    moneroService.monitorPayment(orderId, addressIndex, onProgress)
      .then(result => {
        console.log(`[Payment] ✅ Pagamento completato per ordine ${orderId}`);
        console.log(`[Payment] 📊 Importo: ${result.payment.amount / 1e12} XMR`);
        console.log(`[Payment] 💰 Fee (2%): ${result.payment.fee / 1e12} XMR`);
        console.log(`[Payment] 💎 Netto: ${result.payment.netAmount / 1e12} XMR`);
        if (result.payment.transferred) {
          console.log(`[Payment] 📤 Netto trasferito al wallet GUI`);
        }
        
        const payment = this.payments.get(paymentId);
        if (payment) {
          payment.txid = result.payment.txid;
          payment.confirmations = result.payment.confirmations;
          payment.fee = result.payment.fee;
          payment.netAmount = result.payment.netAmount;
          payment.transferred = result.payment.transferred;
          payment.transferTxid = result.payment.transferTxid;
        }
        
        this.confirmPayment(paymentId).catch(err => {
          console.error('[Payment] ❌ Errore conferma:', err.message);
        });
      })
      .catch(error => {
        if (error.message.includes('Timeout')) {
          console.log(`[Payment] ⏰ Timeout monitoraggio per ordine ${orderId}`);
        } else {
          console.error(`[Payment] ❌ Errore monitoraggio ordine ${orderId}:`, error.message);
        }
      });
  }

  // ========== MOCK PAYMENT ==========
  async _createMockPayment(orderId, amount, currency = 'XMR') {
    const paymentId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let address = '4';
    for (let i = 0; i < 95; i++) {
      address += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const payment = {
      id: paymentId,
      orderId,
      amount: parseFloat(amount.toFixed(6)),
      currency,
      status: 'pending',
      createdAt: new Date().toISOString(),
      address,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${paymentId}`,
      memo: `Pagamento ordine ${orderId}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      isMonero: false
    };

    this.payments.set(paymentId, payment);
    console.log(`[Mock] 💰 Pagamento creato: ${paymentId}`);

    setTimeout(() => {
      this.confirmPayment(paymentId).catch(err =>
        console.error(`[Mock] ❌ Errore conferma:`, err.message)
      );
    }, this.confirmationDelay);

    return payment;
  }

  // ========== AGGIORNA ORDINE ==========
  async _onPaymentConfirmed(payment) {
    try {
      const order = await Order.findById(payment.orderId);
      if (!order) {
        console.warn(`[Payment] ⚠️ Ordine ${payment.orderId} non trovato`);
        return;
      }

      if (order.status !== 'pending') {
        console.warn(`[Payment] ⚠️ Ordine ${payment.orderId} già in stato: ${order.status}`);
        return;
      }

      order.status = 'paid';
      order.paymentStatus = 'confirmed';
      order.paymentDetails = {
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        confirmedAt: payment.confirmedAt || new Date().toISOString(),
        address: payment.address,
        addressIndex: payment.addressIndex,
        isMonero: payment.isMonero || false,
        confirmations: payment.confirmations || 0
      };
      
      if (payment.isMonero) {
        order.paymentDetails.fee = payment.fee || 0;
        order.paymentDetails.netAmount = payment.netAmount || 0;
        order.paymentDetails.txid = payment.txid;
        order.paymentDetails.feePercent = 2;
        if (payment.transferred) {
          order.paymentDetails.transferredToMain = true;
          order.paymentDetails.transferTxid = payment.transferTxid;
        }
      }
      
      order.updatedAt = new Date();
      await order.save();
      
      console.log(`[Payment] 📦 Ordine ${payment.orderId} aggiornato a "paid"`);
    } catch (error) {
      console.error(`[Payment] ❌ Errore aggiornamento ordine:`, error.message);
    }
  }

  // ========== TEST CONNESSIONE ==========
  async testMoneroConnection() {
    try {
      const address = await moneroService.getWalletAddress();
      return { connected: true, address };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  // ========== SETTINGS ==========
  setConfirmationDelay(delayMs) {
    this.confirmationDelay = delayMs;
  }

  clearPayments() {
    this.payments = new Map();
  }
}

module.exports = new PaymentService();