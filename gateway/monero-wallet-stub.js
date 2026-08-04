// Monero wallet stub - Mock JSON-RPC
const express = require("express");
const app = express();
app.use(express.json());
const PORT = process.env.WALLET_PORT || 18083;
let balance = 100000000000000;

app.post("/json_rpc", (req, res) => {
  const { method, params } = req.body;
  switch (method) {
    case "get_balance":
      res.json({ jsonrpc: "2.0", id: req.body.id, result: { balance, unlocked_balance: balance } });
      break;
    case "transfer": {
      const txId = "xmr_tx_" + Date.now();
      const amt = (params && params.destinations && params.destinations[0] && params.destinations[0].amount) || 0;
      balance -= amt;
      res.json({ jsonrpc: "2.0", id: req.body.id, result: { tx_hash: txId, amount: amt, fee: 0 } });
      break;
    }
    case "lock_xmr": {
      const uid = (params && params.userId) || "unknown";
      const amt = (params && params.amount) || 0;
      const txId = "xmr_lock_" + Date.now();
      balance -= amt;
      res.json({ jsonrpc: "2.0", id: req.body.id, result: { success: true, txId, locked: amt } });
      break;
    }
    case "release_xmr": {
      const uid = (params && params.userId) || "unknown";
      const amt = (params && params.amount) || 0;
      const txId = "xmr_release_" + Date.now();
      res.json({ jsonrpc: "2.0", id: req.body.id, result: { success: true, txId } });
      break;
    }
    default:
      res.json({ jsonrpc: "2.0", id: req.body.id, result: { status: "ok", message: "stub: " + method + " not implemented" } });
  }
});

app.get("/health", (req, res) => { res.json({ status: "ok", wallet: "monero", balance }); });
app.listen(PORT, () => { console.log("Monero wallet stub on port " + PORT); });
