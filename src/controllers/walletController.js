const Wallet = require('../models/walletModel');
const { v4: uuidv4 } = require('uuid');

exports.getWallet = async (req, res) => {
  try {
    const w = await Wallet.getOrCreate(req.params.userId);
    w.checkAlerts();
    await w.save();
    res.json({userId: w.userId, balanceMYZ: w.balanceMYZ, balanceXMR: w.balanceXMR, pendingMYZ: w.pendingMYZ, addresses: w.addresses, transactionCount: w.transactions.length, unreadAlerts: w.alerts.filter(a => !a.read).length});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getTransactions = async (req, res) => {
  try {
    const { status, currency, type } = req.query;
    const w = await Wallet.getOrCreate(req.params.userId);
    let txs = w.transactions;
    if (status) txs = txs.filter(t => t.status === status);
    if (currency) txs = txs.filter(t => t.currency === currency);
    if (type) txs = txs.filter(t => t.type === type);
    res.json({count: txs.length, transactions: txs.slice(-100).reverse()});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deposit = async (req, res) => {
  try {
    const { userId, amount, currency, txHash } = req.body;
    if (!userId || !amount || !currency) return res.status(400).json({ error: 'userId, amount, and currency are required' });
    const w = await Wallet.getOrCreate(userId);
    const tx = w.addTransaction('deposit', amount, currency, null, `Deposit: ${txHash || 'manual'}`);
    await w.save();
    res.json({message: 'Deposit successful', txId: tx.txId, newBalance: w.getBalance(currency)});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.withdraw = async (req, res) => {
  try {
    const { userId, amount, currency, address } = req.body;
    if (!userId || !amount || !currency) return res.status(400).json({ error: 'userId, amount, and currency are required' });
    const w = await Wallet.getOrCreate(userId);
    if (w.getBalance(currency) < amount) return res.status(400).json({ error: 'Insufficient balance' });
    const tx = w.addTransaction('withdraw', amount, currency, address, `Withdrawal to ${address}`);
    await w.save();
    res.json({message: 'Withdrawal successful', txId: tx.txId, newBalance: w.getBalance(currency)});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.transfer = async (req, res) => {
  try {
    const { senderId, receiverId, amount, currency } = req.body;
    if (!senderId || !receiverId || !amount || !currency) return res.status(400).json({ error: 'senderId, receiverId, amount, and currency are required' });
    const sender = await Wallet.getOrCreate(senderId);
    const receiver = await Wallet.getOrCreate(receiverId);
    if (sender.getBalance(currency) < amount) return res.status(400).json({ error: 'Insufficient balance' });
    sender.addTransaction('transfer', amount, currency, receiverId, `Transfer to ${receiverId}`);
    receiver.addTransaction('transfer', amount, currency, senderId, `Transfer from ${senderId}`);
    await sender.save(); await receiver.save();
    res.json({message: 'Transfer successful', senderBalance: sender.getBalance(currency), receiverBalance: receiver.getBalance(currency)});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getPaymentDashboard = async (req, res) => {
  try {
    const w = await Wallet.getOrCreate(req.params.userId);
    const txs = w.transactions;
    const inflow = txs.filter(t => t.type==='deposit'||t.type==='reward'||t.type==='refund').reduce((s,t)=>s+t.amount,0);
    const outflow = txs.filter(t => t.type==='withdraw'||t.type==='payment'||t.type==='transfer').reduce((s,t)=>s+t.amount,0);
    const byType = {};
    txs.forEach(t => { byType[t.type] = (byType[t.type]||0) + t.amount; });
    const byCurrency = {MYZ: txs.filter(t=>t.currency==='MYZ').reduce((s,t)=>s+t.amount,0), XMR: txs.filter(t=>t.currency==='XMR').reduce((s,t)=>s+t.amount,0)};
    res.json({userId: w.userId, balanceMYZ: w.balanceMYZ, balanceXMR: w.balanceXMR, totalInflow: inflow, totalOutflow: outflow, netFlow: inflow-outflow, byType, byCurrency, transactionCount: txs.length});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getPaymentTrends = async (req, res) => {
  try {
    const w = await Wallet.getOrCreate(req.params.userId);
    const txs = w.transactions;
    const monthlyMap = {};
    txs.forEach(t => {
      const month = new Date(t.timestamp).toISOString().slice(0,7);
      if (!monthlyMap[month]) monthlyMap[month] = {month, inflow: 0, outflow: 0, net: 0};
      if (t.type==='deposit'||t.type==='reward'||t.type==='refund') monthlyMap[month].inflow += t.amount;
      else monthlyMap[month].outflow += t.amount;
      monthlyMap[month].net = monthlyMap[month].inflow - monthlyMap[month].outflow;
    });
    res.json({trends: Object.values(monthlyMap).sort((a,b)=>a.month.localeCompare(b.month)).slice(-12)});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getAlerts = async (req, res) => {
  try {
    const w = await Wallet.getOrCreate(req.params.userId);
    w.checkAlerts();
    await w.save();
    const unread = w.alerts.filter(a => !a.read);
    res.json({totalAlerts: w.alerts.length, unreadAlerts: unread.length, alerts: w.alerts.slice(-20).reverse()});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.markAlertRead = async (req, res) => {
  try {
    const w = await Wallet.getOrCreate(req.params.userId);
    const alert = w.alerts.id(req.params.alertId);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    alert.read = true;
    await w.save();
    res.json({message: 'Alert marked as read'});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const total = await Wallet.countDocuments();
    const totalMYZ = await Wallet.aggregate([{$group: {_id: null, total: {$sum: '$balanceMYZ'}}}]);
    const totalXMR = await Wallet.aggregate([{$group: {_id: null, total: {$sum: '$balanceXMR'}}}]);
    const allWallets = await Wallet.find({});
    const allTxs = allWallets.flatMap(w => w.transactions);
    res.json({totalWallets: total, totalMYZInCirculation: totalMYZ[0]?.total||0, totalXMRInCirculation: totalXMR[0]?.total||0, totalTransactions: allTxs.length});
  } catch (e) { res.status(500).json({ error: e.message }); }
};
