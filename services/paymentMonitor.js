<<<<<<< HEAD
const MoneroTransaction = require('../models/MoneroTransaction');
const moneroService = require('./moneroService');
const WebhookService = require('./webhookService');

const checkInterval = 30000; // 30 secondi
let monitoringInterval = null;

const startMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  console.log('🚀 [PaymentMonitor] Avviato (intervallo: 30000ms)');
  monitoringInterval = setInterval(async () => {
    await checkPendingTransactions();
  }, checkInterval);
  checkPendingTransactions();
};

const stopMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('⏹️ [PaymentMonitor] Fermato');
  }
};

const checkPendingTransactions = async () => {
  try {
    console.log('[PaymentMonitor] 🔍 Scansione pagamenti in corso...');
    const pending = await MoneroTransaction.find({
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });
    console.log(`[PaymentMonitor] Trovati ${pending.length} pagamenti da verificare.`);
    
    for (const tx of pending) {
      try {
        const result = await moneroService.checkPayment(tx._id);
        
        if (result.status === 'confirmed') {
          console.log(`✅ [PaymentMonitor] Pagamento confermato per transazione ${tx._id}`);
          
          // INVIO WEBHOOK CON RETRY
          if (tx.webhookUrl) {
            const webhookResult = await WebhookService.sendWebhookAsync(
              tx.webhookUrl,
              {
                orderId: tx.orderId || tx._id,
                transactionId: tx._id,
                amount: tx.amount,
                status: 'confirmed',
                txHash: result.txHash,
                timestamp: new Date().toISOString()
              }
            );
            
            if (webhookResult.success) {
              console.log(`✅ [PaymentMonitor] Webhook inviato per transazione ${tx._id}`);
              await MoneroTransaction.findByIdAndUpdate(tx._id, { 
                webhookSent: true,
                webhookAttempts: 1
              });
            } else if (webhookResult.permanentlyFailed) {
              console.error(`🚨 [PaymentMonitor] Webhook fallito permanentemente per ${tx._id}`);
              await MoneroTransaction.findByIdAndUpdate(tx._id, { 
                webhookFailed: true,
                webhookError: webhookResult.error
              });
            }
          }
        }
      } catch (err) {
        console.error(`❌ [PaymentMonitor] Errore per transazione ${tx._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ [PaymentMonitor] Errore nella scansione:', err.message);
  }
};

module.exports = { startMonitoring, stopMonitoring, checkPendingTransactions };
=======
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
>>>>>>> pr52-pgp
