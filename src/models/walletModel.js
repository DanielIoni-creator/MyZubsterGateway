const mongoose = require('mongoose');
const walletSchema = new mongoose.Schema({
  userId: {type: String, required: true, unique: true, index: true},
  balanceMYZ: {type: Number, default: 0},
  balanceXMR: {type: Number, default: 0},
  pendingMYZ: {type: Number, default: 0},
  addresses: {myz: {type: String, default: null}, xmr: {type: String, default: null}},
  transactions: [{
    txId: {type: String, required: true},
    type: {type: String, enum: ['deposit','withdraw','transfer','payment','reward','refund'], required: true},
    amount: {type: Number, required: true},
    currency: {type: String, enum: ['MYZ','XMR'], required: true},
    status: {type: String, enum: ['pending','confirmed','failed'], default: 'pending'},
    counterparty: {type: String, default: null},
    description: {type: String, default: ''},
    timestamp: {type: Date, default: Date.now}
  }],
  paymentTrends: {monthly: [{month: String, inflow: Number, outflow: Number, net: Number}]},
  alerts: [{alertId: String, type: {type: String, enum: ['low_balance','large_transaction','failed_payment','unusual_activity']}, message: String, severity: {type: String, enum: ['low','medium','high']}, read: {type: Boolean, default: false}, timestamp: {type: Date, default: Date.now}}],
  createdAt: {type: Date, default: Date.now},
  updatedAt: {type: Date, default: Date.now}
});
walletSchema.methods.getBalance = function(currency) { return currency === 'MYZ' ? this.balanceMYZ : this.balanceXMR; };
walletSchema.methods.addTransaction = function(type, amount, currency, counterparty, description) {
  const tx = {txId: Date.now().toString(36)+Math.random().toString(36).slice(2,8), type, amount, currency, counterparty, description, status: 'confirmed'};
  this.transactions.push(tx);
  if (type === 'deposit' || type === 'reward') { if (currency==='MYZ') this.balanceMYZ+=amount; else this.balanceXMR+=amount; }
  else if (type === 'withdraw' || type === 'payment' || type === 'transfer') { if (currency==='MYZ') this.balanceMYZ-=amount; else this.balanceXMR-=amount; }
  this.updatedAt = Date.now();
  return tx;
};
walletSchema.methods.checkAlerts = function() {
  if (this.balanceMYZ < 10) this.alerts.push({alertId: Date.now().toString(36), type: 'low_balance', message: `Low MYZ balance: ${this.balanceMYZ}`, severity: 'medium'});
  const recentLarge = this.transactions.filter(t => t.amount > 1000 && (Date.now()-new Date(t.timestamp).getTime())<3600000);
  recentLarge.forEach(t => this.alerts.push({alertId: Date.now().toString(36)+Math.random().toString(36).slice(2,4), type: 'large_transaction', message: `Large transaction: ${t.amount} ${t.currency}`, severity: 'medium'}));
  const failed = this.transactions.filter(t => t.status === 'failed' && (Date.now()-new Date(t.timestamp).getTime())<3600000);
  failed.forEach(t => this.alerts.push({alertId: Date.now().toString(36)+Math.random().toString(36).slice(2,4), type: 'failed_payment', message: `Failed payment: ${t.amount} ${t.currency}`, severity: 'high'}));
  return this;
};
walletSchema.statics.getOrCreate = async function(userId) {
  let w = await this.findOne({userId});
  if (!w) { w = new this({userId}); await w.save(); }
  return w;
};
module.exports = mongoose.model('Wallet', walletSchema);
