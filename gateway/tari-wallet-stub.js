// Tari wallet stub - Mock RPC for MYZ wallet operations
const express = require("express");
const app = express();
app.use(express.json());

const PORT = process.env.WALLET_PORT || 18143;
let balance = 1000000;

app.get("/health", (req, res) => { res.json({ status: "ok", wallet: "tari", balance }); });
app.post("/lock", (req, res) => { const { userId, amount } = req.body; const txId = "tx_" + Date.now(); balance -= amount; res.json({ success: true, txId, locked: amount }); });
app.post("/release", (req, res) => { const { userId, amount } = req.body; const txId = "tx_release_" + Date.now(); res.json({ success: true, txId }); });
app.post("/refund", (req, res) => { const { userId, amount } = req.body; const txId = "tx_refund_" + Date.now(); balance += amount; res.json({ success: true, txId, balance }); });
app.get("/balance", (req, res) => { res.json({ balance, currency: "MYZ" }); });
app.listen(PORT, () => { console.log("Tari wallet stub on port " + PORT); });
