const express = require('express');
const { createOrder, onPaymentReceived } = require('./buy_myz');
const { createEscrow, lockFunds, submitProof, release, dispute, getEscrow } = require('./escrow_simulator');
const { mint, balance } = require('./token_simulator');

const app = express();
app.use(express.json());

// 1. Acquista MYZ con XMR (simulato)
app.post('/buy-myz', (req, res) => {
    const { userTariWallet, amountMYZ } = req.body;
    const order = createOrder(userTariWallet, amountMYZ);
    onPaymentReceived(order.id, 10);
    res.json({ orderId: order.id, xmrAddress: order.xmrAddress, amountXMR: order.amountXMR, status: 'pending' });
});

// 2. Crea escrow
app.post('/escrow/create', (req, res) => {
    const { escrowId, buyer, seller, amount } = req.body;
    try {
        const id = createEscrow(escrowId, buyer, seller, amount);
        res.json({ escrowId: id, status: 'created' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 3. Blocca fondi nell'escrow
app.post('/escrow/lock', (req, res) => {
    const { escrowId, payer, amount } = req.body;
    try {
        lockFunds(escrowId, payer, amount);
        res.json({ escrowId, status: 'locked' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 4. Invia prova
app.post('/escrow/proof', (req, res) => {
    const { escrowId, proofHash } = req.body;
    try {
        submitProof(escrowId, proofHash);
        res.json({ escrowId, status: 'proof_submitted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 5. Rilascia fondi
app.post('/escrow/release', (req, res) => {
    const { escrowId, caller } = req.body;
    try {
        release(escrowId, caller);
        res.json({ escrowId, status: 'released' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 6. Disputa
app.post('/escrow/dispute', (req, res) => {
    const { escrowId, caller } = req.body;
    try {
        dispute(escrowId, caller);
        res.json({ escrowId, status: 'disputed' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 7. Saldo di un wallet
app.get('/balance/:address', (req, res) => {
    const address = req.params.address;
    res.json({ address, balance: balance(address) });
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`🚀 Gateway API running on port ${PORT}`);
});
