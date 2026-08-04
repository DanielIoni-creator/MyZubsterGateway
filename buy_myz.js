const { mint } = require('./token_simulator');
const crypto = require('crypto');

// Database simulato degli ordini
const orders = new Map();

// Genera un indirizzo XMR fittizio (per test)
function generateXMRAddress() {
    const id = crypto.randomBytes(16).toString('hex');
    return `monero_${id}_address`;
}

// Crea un ordine
function createOrder(userTariWallet, amountMYZ) {
    const id = crypto.randomBytes(8).toString('hex');
    const xmrAddress = generateXMRAddress();
    const order = {
        id,
        userTariWallet,
        amountMYZ,
        amountXMR: amountMYZ, // 1:1
        xmrAddress,
        status: 'pending',
        createdAt: Date.now(),
        confirmations: 0
    };
    orders.set(id, order);
    console.log(`Ordine creato: ${id}, XMR address: ${xmrAddress}`);
    return order;
}

// Simula la ricezione del pagamento (webhook)
function onPaymentReceived(orderId, confirmations) {
    const order = orders.get(orderId);
    if (!order) return;
    order.confirmations = confirmations;
    if (confirmations >= 10 && order.status === 'pending') {
        order.status = 'completed';
        // Minta i MYZ all'utente
        mint(order.userTariWallet, order.amountMYZ * 1000000); // 6 decimali
        console.log(`✅ ${order.amountMYZ} MYZ mintati a ${order.userTariWallet}`);
    }
}

// Endpoint Express (da integrare nel server)
// app.post('/buy-myz', async (req, res) => {
//   const { userTariWallet, amountMYZ } = req.body;
//   const order = createOrder(userTariWallet, amountMYZ);
//   res.json({ orderId: order.id, xmrAddress: order.xmrAddress, amountXMR: order.amountXMR });
// });

module.exports = { createOrder, onPaymentReceived };
