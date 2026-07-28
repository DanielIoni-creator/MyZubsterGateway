const axios = require('axios');
const { Order } = require('../models');

const MONERO_RPC_URL = process.env.MONERO_RPC_URL || 'http://localhost:18083';
const MONERO_MIN_CONFIRMATIONS = Number.parseInt(process.env.MONERO_MIN_CONFIRMATIONS || '10', 10);

const getPayments = async () => {
  const response = await axios.post(`${MONERO_RPC_URL}/json_rpc`, {
    jsonrpc: '2.0',
    id: '0',
    method: 'get_bulk_payments',
    params: {
      min_block_height: 0,
      payment_ids: []
    }
  });

  return response.data?.result?.payments || [];
};

const checkPendingOrders = async () => {
  const pendingOrders = await Order.findAll({ where: { status: 'pending' } });

  if (pendingOrders.length === 0) {
    return;
  }

  const payments = await getPayments();

  for (const order of pendingOrders) {
    const payment = payments.find((candidate) => candidate.address === order.moneroAddress);
    if (!payment) {
      continue;
    }

    const amountReceived = payment.amount / 1e12;
    const confirmations = payment.confirmations || 0;

    if (amountReceived >= order.moneroAmount && confirmations >= MONERO_MIN_CONFIRMATIONS) {
      order.status = 'completed';
      order.confirmations = confirmations;
      order.amountReceived = amountReceived;
      order.txHash = payment.tx_hash || null;
      await order.save();
    }
  }
};

module.exports = {
  checkPendingOrders
};
