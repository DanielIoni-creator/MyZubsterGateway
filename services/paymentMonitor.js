const axios = require('axios');
const { Order } = require('../models');

if (typeof Order.findAll !== 'function') {
  Order.findAll = function findAll(query) {
    return this.find(query.where || query);
  };
}

async function checkPendingOrders() {
  const pendingOrders = await Order.findAll({ where: { status: 'pending' } });

  for (const order of pendingOrders) {
    const response = await axios.post(process.env.MONERO_RPC_URL || 'http://localhost:18082/json_rpc', {
      jsonrpc: '2.0',
      id: '0',
      method: 'get_payments',
      params: {
        payment_id: order.paymentId,
        min_block_height: 0
      }
    });

    const payments = response.data?.result?.payments || [];
    const matchingPayment = payments.find(payment => payment.address === order.moneroAddress);

    if (!matchingPayment) {
      continue;
    }

    order.status = 'completed';
    order.paymentStatus = 'confirmed';
    order.paymentDetails = {
      txHash: matchingPayment.tx_hash,
      confirmations: matchingPayment.confirmations,
      amount: matchingPayment.amount
    };
    await order.save();
  }
}

module.exports = {
  checkPendingOrders
};
