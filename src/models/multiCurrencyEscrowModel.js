const mongoose = require('mongoose');
const mcEscrowSchema = new mongoose.Schema({
  escrowId: {type: String, required: true, unique: true, index: true},
  jobId: {type: String, required: true},
  payerId: {type: String, required: true},
  payeeId: {type: String, required: true},
  sourceCurrency: {type: String, enum: ['MYZ','XMR'], required: true},
  sourceAmount: {type: Number, required: true},
  targetCurrency: {type: String, enum: ['MYZ','XMR'], default: null},
  targetAmount: {type: Number, default: null},
  swapRate: {type: Number, default: null},
  swapExecuted: {type: Boolean, default: false},
  status: {type: String, enum: ['created','funded','swapped','released','refunded'], default: 'created'},
  autoConvert: {type: Boolean, default: true},
  logs: [{action: String, actor: String, timestamp: {type: Date, default: Date.now}, details: String}],
  createdAt: {type: Date, default: Date.now},
  fundedAt: {type: Date, default: null},
  swappedAt: {type: Date, default: null},
  releasedAt: {type: Date, default: null},
  refundedAt: {type: Date, default: null}
});
mcEscrowSchema.methods.addLog = function(action, actor, details) {
  this.logs.push({action, actor, details});
  return this;
};
mcEscrowSchema.methods.getTotalInMYZ = function() {
  if (this.sourceCurrency === 'MYZ') return this.sourceAmount;
  if (this.swapRate) return this.sourceAmount * this.swapRate;
  return null;
};
mcEscrowSchema.methods.getTotalInXMR = function() {
  if (this.sourceCurrency === 'XMR') return this.sourceAmount;
  if (this.swapRate && this.swapRate > 0) return this.sourceAmount / this.swapRate;
  return null;
};
module.exports = mongoose.model('MultiCurrencyEscrow', mcEscrowSchema);
