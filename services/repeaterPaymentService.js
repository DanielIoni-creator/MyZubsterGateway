// services/repeaterPaymentService.js - x402 Micro-Transactions for Repeaters - Bounty #789
const { lockMYZ, releaseMYZ } = require('../gateway/myz_wallet');
const { lockXMR, releaseXMR } = require('../gateway/xmr_wallet');
const { notifyUser } = require('../notifications');

const PLATFORM_FEE = 0.01; // 1% platform fee
const MIN_PAYOUT_MYZ = 1;
const MIN_PAYOUT_XMR = 0.0001;

class RepeaterPaymentService {
  constructor() {
    this.payments = new Map();
    this.earnings = new Map(); // nodeId -> { total, available, pending }
    this.paymentHistory = [];
  }

  // Registra un nodo per ricevere pagamenti
  registerForPayments(nodeId, walletAddress, currency = 'MYZ') {
    if (!nodeId || !walletAddress) throw new Error('Missing nodeId or walletAddress');
    const earnings = {
      nodeId,
      walletAddress,
      currency,
      totalEarned: 0,
      availableForPayout: 0,
      pendingPayout: 0,
      transactions: 0,
      registeredAt: Date.now()
    };
    this.earnings.set(nodeId, earnings);
    this.logPayment('REGISTERED', { nodeId, currency, walletAddress });
    return earnings;
  }

  // Calcola pagamento per un evento di routing
  async calculatePayment(nodeId, eventType, metadata = {}) {
    const earnings = this.earnings.get(nodeId);
    if (!earnings) throw new Error('Nodo non registrato per pagamenti: ' + nodeId);

    // Tariffe per tipo di evento (in MYZ o equivalente XMR)
    const rates = {
      'message_routed': 0.01,
      'data_cached': 0.005,
      'bandwidth_provided': 0.02,
      'sensor_data_relayed': 0.015,
      'node_discovery': 0.005
    };

    const rate = rates[eventType] || 0.005;
    const amount = rate * (metadata.hops || 1) * (metadata.multiplier || 1);
    const fee = amount * PLATFORM_FEE;
    const netAmount = amount - fee;

    earnings.totalEarned += amount;
    earnings.availableForPayout += netAmount;
    earnings.transactions++;

    const payment = {
      paymentId: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      nodeId,
      eventType,
      amount,
      fee,
      netAmount,
      currency: earnings.currency,
      status: 'calculated',
      createdAt: Date.now(),
      metadata
    };

    this.payments.set(payment.paymentId, payment);
    this.paymentHistory.push(payment);
    if (this.paymentHistory.length > 5000) this.paymentHistory.shift();

    this.logPayment('CALCULATED', { nodeId, eventType, amount, netAmount });
    return payment;
  }

  // Processa payout per un nodo
  async processPayout(nodeId) {
    const earnings = this.earnings.get(nodeId);
    if (!earnings) throw new Error('Nodo non registrato: ' + nodeId);

    const minPayout = earnings.currency === 'MYZ' ? MIN_PAYOUT_MYZ : MIN_PAYOUT_XMR;
    if (earnings.availableForPayout < minPayout) {
      throw new Error('Importo minimo payout non raggiunto: ' + earnings.availableForPayout + ' ' + earnings.currency);
    }

    const amount = earnings.availableForPayout;
    earnings.pendingPayout += amount;
    earnings.availableForPayout = 0;

    try {
      // Esegui il trasferimento via escrow 2-of-3
      let txId;
      if (earnings.currency === 'MYZ') {
        txId = await releaseMYZ(earnings.walletAddress, amount);
      } else if (earnings.currency === 'XMR') {
        txId = await releaseXMR(earnings.walletAddress, amount);
      } else {
        throw new Error('Currency non supportata: ' + earnings.currency);
      }

      earnings.pendingPayout -= amount;

      const payout = {
        payoutId: 'payout_' + Date.now(),
        nodeId,
        amount,
        currency: earnings.currency,
        txId,
        status: 'completed',
        completedAt: Date.now()
      };
      this.paymentHistory.push(payout);

      await notifyUser(nodeId, 'Payout completato: ' + amount + ' ' + earnings.currency);

      this.logPayment('PAYOUT_COMPLETED', { nodeId, amount, currency: earnings.currency, txId });
      return payout;
    } catch (err) {
      earnings.availableForPayout += amount;
      earnings.pendingPayout -= amount;
      throw new Error('Payout fallito: ' + err.message);
    }
  }

  // Ottieni guadagni di un nodo
  getEarnings(nodeId) {
    const earnings = this.earnings.get(nodeId);
    if (!earnings) throw new Error('Nodo non registrato: ' + nodeId);
    return {
      nodeId,
      currency: earnings.currency,
      walletAddress: earnings.walletAddress,
      totalEarned: earnings.totalEarned,
      availableForPayout: earnings.availableForPayout,
      pendingPayout: earnings.pendingPayout,
      transactions: earnings.transactions
    };
  }

  // Dashboard guadagni rete
  getEarningsDashboard() {
    const allEarnings = [...this.earnings.values()];
    const totalEarned = allEarnings.reduce((s, e) => s + e.totalEarned, 0);
    const totalPending = allEarnings.reduce((s, e) => s + e.pendingPayout, 0);
    const totalTransactions = allEarnings.reduce((s, e) => s + e.transactions, 0);

    return {
      totalNodes: allEarnings.length,
      totalEarned,
      totalPending,
      totalTransactions,
      byCurrency: {
        MYZ: allEarnings.filter(e => e.currency === 'MYZ').reduce((s, e) => s + e.totalEarned, 0),
        XMR: allEarnings.filter(e => e.currency === 'XMR').reduce((s, e) => s + e.totalEarned, 0)
      },
      topEarners: allEarnings
        .sort((a, b) => b.totalEarned - a.totalEarned)
        .slice(0, 10)
        .map(e => ({ nodeId: e.nodeId, totalEarned: e.totalEarned, currency: e.currency })),
      timestamp: new Date().toISOString()
    };
  }

  // Storico pagamenti
  getPaymentHistory(limit = 50) {
    return this.paymentHistory.slice(-limit);
  }

  logPayment(event, data) {
    console.log('[RepeaterPayments]', event, JSON.stringify(data));
  }
}

module.exports = new RepeaterPaymentService();
