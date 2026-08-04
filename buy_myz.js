const crypto = require('crypto');
const orders = new Map();

function createOrder(userTariWallet, amountMYZ) {
  const id = crypto.randomBytes(8).toString('hex');
  const xmrAddress = `xmr_${id}`;
  const order = { id, userTariWallet, amountMYZ, amountXMR: amountMYZ, xmrAddress, status: 'pending' };
  orders.set(id, order);
  return order;
}

function onPaymentReceived(orderId, confirmations) {
  const order = orders.get(orderId);
  if (order) order.status = 'confirmed';
}

module.exports = { createOrder, onPaymentReceived };
