const crypto = require('crypto');

function redactSensitiveOrderData(order = {}) {
  return {
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    shippingAddress: order.shippingAddress,
    paymentDetails: order.paymentDetails,
    notes: order.notes
  };
}

function fingerprintKey(armoredKey) {
  return crypto.createHash('sha256').update(armoredKey).digest('hex');
}

module.exports = {
  redactSensitiveOrderData,
  fingerprintKey
};
