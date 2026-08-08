const mongoose = require('mongoose');
const verificationSchema = new mongoose.Schema({
  verificationId: {type: String, required: true, unique: true, index: true},
  txHash: {type: String, required: true},
  blockchain: {type: String, enum: ['monero','tari','base','ethereum'], required: true},
  amount: {type: Number, required: true},
  currency: {type: String, default: 'MYZ'},
  senderAddress: {type: String, default: null},
  receiverAddress: {type: String, default: null},
  blockHeight: {type: Number, default: null},
  confirmations: {type: Number, default: 0},
  requiredConfirmations: {type: Number, default: 10},
  status: {type: String, enum: ['pending','confirming','verified','failed','anomaly'], default: 'pending'},
  anomalies: [{type: {type: String, enum: ['double_spend','unusual_amount','unusual_frequency','unknown_sender','high_risk']}, description: String, severity: {type: String, enum: ['low','medium','high']}, detectedAt: {type: Date, default: Date.now}}],
  report: {type: String, default: null},
  verifiedAt: {type: Date, default: null},
  createdAt: {type: Date, default: Date.now}
});
verificationSchema.methods.checkConfirmations = function() {
  if (this.status === 'confirming' && this.confirmations >= this.requiredConfirmations) {
    this.status = 'verified';
    this.verifiedAt = new Date();
    this.report = `Transaction ${this.txHash} verified with ${this.confirmations} confirmations on ${this.blockchain}`;
  }
  return this;
};
verificationSchema.methods.detectAnomalies = function(recentTransactions) {
  const detected = [];
  if (recentTransactions.filter(t => t.txHash === this.txHash).length > 1) {
    detected.push({type: 'double_spend', description: 'Duplicate transaction hash detected', severity: 'high'});
  }
  if (this.amount > 10000) {
    detected.push({type: 'unusual_amount', description: `Large transaction amount: ${this.amount} ${this.currency}`, severity: 'medium'});
  }
  if (recentTransactions.filter(t => t.senderAddress === this.senderAddress && (Date.now() - new Date(t.createdAt).getTime()) < 60000).length > 10) {
    detected.push({type: 'unusual_frequency', description: 'High frequency transactions from same sender', severity: 'medium'});
  }
  this.anomalies = detected;
  if (detected.some(a => a.severity === 'high')) {
    this.status = 'anomaly';
  }
  return this;
};
verificationSchema.methods.generateReport = function() {
  let report = `Payment Verification Report\n`;
  report += `=============================\n`;
  report += `Verification ID: ${this.verificationId}\n`;
  report += `Transaction Hash: ${this.txHash}\n`;
  report += `Blockchain: ${this.blockchain}\n`;
  report += `Amount: ${this.amount} ${this.currency}\n`;
  report += `Block Height: ${this.blockHeight || 'N/A'}\n`;
  report += `Confirmations: ${this.confirmations}/${this.requiredConfirmations}\n`;
  report += `Status: ${this.status}\n`;
  report += `Anomalies: ${this.anomalies.length}\n`;
  this.anomalies.forEach(a => { report += `  - [${a.severity.toUpperCase()}] ${a.type}: ${a.description}\n`; });
  report += `Created: ${this.createdAt}\n`;
  report += `Verified: ${this.verifiedAt || 'N/A'}\n`;
  this.report = report;
  return report;
};
module.exports = mongoose.model('PaymentVerification', verificationSchema);
