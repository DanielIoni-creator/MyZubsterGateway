// buy_myz.js – vendita di $MYZ in cambio di XMR
const crypto = require('crypto');

const orders = new Map();

function generateXMRAddress() {
  const id = crypto.randomBytes(16).toString('hex');
  return `monero_${id}_address`;
}

function createOrder(userTariWallet, amountMYZ) {
  const id = crypto.randomBytes(8).toString('hex');
  const xmrAddress = generateXMRAddress();
  const order = {
    id,
    userTariWallet,
    amountMYZ,
    amountXMR: amountMYZ,
    xmrAddress,
    status: 'pending',
    confirmations: 0
  };
  orders.set(id, order);
  return order;
}

function onPaymentReceived(orderId, confirmations) {
  const order = orders.get(orderId);
  if (!order) return;
  order.confirmations = confirmations;
  if (confirmations >= 10 && order.status === 'pending') {
    order.status = 'completed';
    // Qui chiamerai il mint reale su Tari
    console.log(`✅ ${order.amountMYZ} MYZ mintati a ${order.userTariWallet}`);
  }
}

module.exports = { createOrder, onPaymentReceived };
