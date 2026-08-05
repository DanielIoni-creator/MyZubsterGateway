// gateway/payment_processor.js – Sistema di elaborazione pagamenti MYZ/XMR
// Mock: genera wallet temporanei e simula transazioni
const crypto = require('crypto');

// Wallet temporanei in memoria (in produzione andrebbero su DB o wallet RPC)
const tempWallets = new Map();

/**
 * Genera un indirizzo wallet temporaneo per un cliente
 * @param {string} currency - 'MYZ' o 'XMR'
 * @param {object} options - { clientId, robotId, amount, escrowId }
 * @returns {object} { address, paymentId, expiresAt }
 */
function generatePaymentAddress(currency, options = {}) {
  const prefix = currency === 'MYZ' ? 'myz' : 'xmr';
  const paymentId = `${prefix}_${crypto.randomBytes(12).toString('hex')}_${Date.now()}`;
  const address = `${prefix}_addr_${crypto.randomBytes(16).toString('hex')}`;

  const wallet = {
    paymentId,
    address,
    currency,
    clientId: options.clientId || null,
    robotId: options.robotId || null,
    amount: options.amount || 0,
    escrowId: options.escrowId || null,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ore
    receivedAmount: 0,
    txHashes: []
  };

  tempWallets.set(paymentId, wallet);
  console.log(`🆕 [PAYMENT] Wallet ${currency} generato: ${address} (paymentId: ${paymentId})`);

  return {
    address,
    paymentId,
    currency,
    expiresAt: wallet.expiresAt,
    amount: wallet.amount
  };
}

/**
 * Simula la ricezione di un pagamento su un wallet temporaneo
 * @param {string} paymentId
 * @param {number} amount - importo ricevuto
 * @returns {object} { confirmed, txHash }
 */
function simulatePaymentReceived(paymentId, amount) {
  const wallet = tempWallets.get(paymentId);
  if (!wallet) {
    throw new Error(`Wallet non trovato: ${paymentId}`);
  }

  const txHash = `tx_${crypto.randomBytes(16).toString('hex')}`;
  wallet.receivedAmount += amount;
  wallet.txHashes.push(txHash);

  if (wallet.receivedAmount >= wallet.amount) {
    wallet.status = 'confirmed';
  }

  console.log(`✅ [PAYMENT] Ricevuto ${amount} ${wallet.currency} su ${paymentId} (tx: ${txHash})`);

  return {
    confirmed: wallet.status === 'confirmed',
    txHash,
    receivedAmount: wallet.receivedAmount,
    expectedAmount: wallet.amount,
    currency: wallet.currency
  };
}

/**
 * Blocca fondi in escrow (simulato)
 * @param {string} paymentId
 * @returns {object} { escrowId, status }
 */
function lockInEscrow(paymentId) {
  const wallet = tempWallets.get(paymentId);
  if (!wallet) {
    throw new Error(`Wallet non trovato: ${paymentId}`);
  }
  if (wallet.status !== 'confirmed') {
    throw new Error(`Pagamento non ancora confermato: ${paymentId}`);
  }

  wallet.status = 'in_escrow';
  wallet.escrowLockedAt = new Date();
  console.log(`🔒 [ESCROW] Fondi bloccati per ${paymentId} (${wallet.amount} ${wallet.currency})`);

  return {
    escrowId: wallet.escrowId || paymentId,
    status: 'in_escrow',
    amount: wallet.amount,
    currency: wallet.currency
  };
}

/**
 * Rilascia fondi dall'escrow al venditore/robot
 * @param {string} paymentId
 * @returns {object} { releaseTx, status }
 */
function releaseFromEscrow(paymentId) {
  const wallet = tempWallets.get(paymentId);
  if (!wallet) {
    throw new Error(`Wallet non trovato: ${paymentId}`);
  }
  if (wallet.status !== 'in_escrow') {
    throw new Error(`Fondi non in escrow: ${paymentId}`);
  }

  wallet.status = 'released';
  wallet.releasedAt = new Date();
  const releaseTx = `release_${crypto.randomBytes(12).toString('hex')}`;
  console.log(`💰 [ESCROW] Fondi rilasciati per ${paymentId}: ${wallet.amount} ${wallet.currency} (tx: ${releaseTx})`);

  return {
    releaseTx,
    status: 'released',
    amount: wallet.amount,
    currency: wallet.currency
  };
}

/**
 * Rimborsa fondi al cliente
 * @param {string} paymentId
 * @param {number} amount - importo da rimborsare (default: tutto)
 * @returns {object} { refundTx, status, refundedAmount }
 */
function refundPayment(paymentId, amount = null) {
  const wallet = tempWallets.get(paymentId);
  if (!wallet) {
    throw new Error(`Wallet non trovato: ${paymentId}`);
  }

  const refundAmount = amount || wallet.amount;
  wallet.status = 'refunded';
  wallet.refundedAt = new Date();
  wallet.refundAmount = refundAmount;
  const refundTx = `refund_${crypto.randomBytes(12).toString('hex')}`;
  console.log(`↩️ [REFUND] Rimborsati ${refundAmount} ${wallet.currency} per ${paymentId} (tx: ${refundTx})`);

  return {
    refundTx,
    status: 'refunded',
    refundedAmount: refundAmount,
    currency: wallet.currency
  };
}

/**
 * Ottiene lo stato di un wallet/pagamento
 * @param {string} paymentId
 * @returns {object|null}
 */
function getPaymentStatus(paymentId) {
  const wallet = tempWallets.get(paymentId);
  if (!wallet) return null;

  return {
    paymentId: wallet.paymentId,
    address: wallet.address,
    currency: wallet.currency,
    amount: wallet.amount,
    receivedAmount: wallet.receivedAmount,
    status: wallet.status,
    clientId: wallet.clientId,
    robotId: wallet.robotId,
    escrowId: wallet.escrowId,
    createdAt: wallet.createdAt,
    expiresAt: wallet.expiresAt,
    txHashes: wallet.txHashes
  };
}

/**
 * Elenca tutti i wallet/pagamenti attivi
 * @returns {array}
 */
function listAllPayments() {
  const result = [];
  for (const [id, w] of tempWallets) {
    result.push({
      paymentId: id,
      address: w.address,
      currency: w.currency,
      amount: w.amount,
      receivedAmount: w.receivedAmount,
      status: w.status,
      clientId: w.clientId,
      robotId: w.robotId,
      createdAt: w.createdAt
    });
  }
  return result;
}

/**
 * Pulisce wallet scaduti
 */
function cleanupExpired() {
  const now = new Date();
  let cleaned = 0;
  for (const [id, w] of tempWallets) {
    if (w.expiresAt < now && w.status === 'pending') {
      w.status = 'expired';
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`🧹 [CLEANUP] ${cleaned} wallet scaduti marcati`);
  return cleaned;
}

// Pulisci ogni ora
setInterval(cleanupExpired, 60 * 60 * 1000);

module.exports = {
  generatePaymentAddress,
  simulatePaymentReceived,
  lockInEscrow,
  releaseFromEscrow,
  refundPayment,
  getPaymentStatus,
  listAllPayments,
  cleanupExpired
};
