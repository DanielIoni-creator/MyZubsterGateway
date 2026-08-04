// services/paymentMonitor.js
const { Order } = require('../models');
const axios = require('axios');

const MONERO_RPC_URL = process.env.MONERO_RPC_URL || 'http://localhost:18083';
const MONERO_MIN_CONFIRMATIONS = parseInt(process.env.MONERO_MIN_CONFIRMATIONS) || 10;
const CHECK_INTERVAL = process.env.PAYMENT_CHECK_INTERVAL || 60000; // 60 secondi

let isMonitoring = false;
let monitorInterval = null;

// ===== FUNZIONE WEBHOOK =====
async function sendWebhook(orderId, status, txHash, confirmations, amountReceived) {
  const webhookUrl = process.env.WEBHOOK_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    console.log('⚠️ Webhook non configurato, salto notifica.');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret
      },
      body: JSON.stringify({
        orderId,
        status,
        txHash,
        confirmations,
        amountReceived
      })
    });

    if (response.ok) {
      console.log(`✅ Webhook inviato per ordine ${orderId}`);
    } else {
      console.error(`❌ Webhook fallito (${response.status}):`, await response.text());
    }
  } catch (error) {
    console.error('❌ Errore invio webhook:', error.message);
  }
}

// ===== CHIAMA RPC PER OTTENERE I PAGAMENTI =====
async function getPayments(minHeight = 0) {
  try {
    const response = await axios.post(`${MONERO_RPC_URL}/json_rpc`, {
      jsonrpc: '2.0',
      id: '0',
      method: 'get_bulk_payments',
      params: {
        min_block_height: minHeight,
        payment_ids: [] // Recupera tutti i pagamenti
      }
    });
    return response.data.result.payments || [];
  } catch (error) {
    console.error('❌ Errore RPC get_bulk_payments:', error.message);
    return [];
  }
}

// ===== VERIFICA GLI ORDINI IN SOSPESO =====
async function checkPendingOrders() {
  try {
    const pendingOrders = await Order.findAll({
      where: { status: 'pending' }
    });

    if (pendingOrders.length === 0) {
      return;
    }

    console.log(`🔍 [Monitor] Controllo ${pendingOrders.length} pagamenti in sospeso...`);

    // Ottieni l'ultimo blocco per il minHeight
    let minHeight = 0;
    for (const order of pendingOrders) {
      if (order.createdAt) {
        // In pratica potremmo usare un valore fisso, ma meglio usare l'ultimo blocco noto
      }
    }

    const payments = await getPayments(0);

    for (const order of pendingOrders) {
      // Cerca pagamenti verso l'indirizzo dell'ordine
      const matchingPayments = payments.filter(p => p.address === order.moneroAddress);

      if (matchingPayments.length > 0) {
        // Prendi il primo pagamento (o somma se multipli)
        const payment = matchingPayments[0];
        const amountReceived = payment.amount / 1e12; // Converti da piconero a XMR
        const confirmations = payment.confirmations || 0;

        console.log(`🔍 [Monitor] Transazione su ordine #${order.id}: ${amountReceived} XMR, conferme: ${confirmations}`);

        // Se l'importo ricevuto è >= l'importo richiesto E conferme sufficienti
        if (amountReceived >= order.moneroAmount && confirmations >= MONERO_MIN_CONFIRMATIONS) {
          // Aggiorna l'ordine a completed
          order.status = 'completed';
          order.confirmations = confirmations;
          order.amountReceived = amountReceived;
          order.txHash = payment.tx_hash || null;
          await order.save();

          console.log(`✅ [Monitor] PAGAMENTO CONFERMATO per ordine #${order.id} (${confirmations} conferme)`);
          console.log(`   📦 Richiesto: ${order.moneroAmount} XMR, Ricevuto: ${amountReceived} XMR`);
          console.log(`   🔗 TxID: ${payment.tx_hash}`);

          // 👇 WEBHOOK: notifica al marketplace
          await sendWebhook(
            order.id,
            'completed',
            payment.tx_hash || null,
            confirmations,
            amountReceived
          );

        } else if (amountReceived >= order.moneroAmount && confirmations < MONERO_MIN_CONFIRMATIONS) {
          console.log(`⏳ [Monitor] Pagamento rilevato per ordine #${order.id}, ma conferme insufficienti (${confirmations}/${MONERO_MIN_CONFIRMATIONS})`);
        } else if (amountReceived < order.moneroAmount) {
          console.log(`⚠️ [Monitor] Pagamento PARZIALE per ordine #${order.id}: ${amountReceived} XMR (richiesto: ${order.moneroAmount} XMR)`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Errore nel monitoraggio pagamenti:', error.message);
  }
}

// ===== AVVIA IL MONITORAGGIO =====
function startPaymentMonitor() {
  if (isMonitoring) {
    console.log('⚠️ Monitoraggio già avviato.');
    return;
  }

  console.log(`🔄 [Monitor] Avviato controllo pagamenti ogni ${CHECK_INTERVAL / 1000} secondi...`);
  isMonitoring = true;

  // Esegui subito il primo controllo
  checkPendingOrders();

  // Poi avvia l'intervallo
  monitorInterval = setInterval(checkPendingOrders, CHECK_INTERVAL);
}

// ===== AGGIUNGI UN ORDINE AL MONITORAGGIO (richiamato alla creazione) =====
function addOrderToMonitor(order) {
  console.log(`📦 [Monitor] Ordine #${order.id} aggiunto al monitoraggio (${order.moneroAmount} XMR)`);
  // Se il monitor non è partito, avvialo
  if (!isMonitoring) {
    startPaymentMonitor();
  }
}

// ===== FERMA IL MONITORAGGIO =====
function stopPaymentMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    isMonitoring = false;
    console.log('⏹️ [Monitor] Monitoraggio fermato.');
  }
}

module.exports = {
  startPaymentMonitor,
  stopPaymentMonitor,
  addOrderToMonitor,
  checkPendingOrders
};