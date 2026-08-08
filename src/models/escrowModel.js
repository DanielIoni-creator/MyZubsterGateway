const mongoose = require('mongoose');
const escrowSchema = new mongoose.Schema({
  escrowId: {type: String, required: true, unique: true, index: true},
  jobId: {type: String, required: true},
  payerId: {type: String, required: true},
  payeeId: {type: String, required: true},
  amount: {type: Number, required: true},
  currency: {type: String, default: 'MYZ'},
  status: {type: String, enum: ['created','funded','verified','released','refunded','disputed'], default: 'created'},
  autoRelease: {type: Boolean, default: true},
  verificationStatus: {type: String, enum: ['pending','passed','failed',null], default: null},
  releaseConditions: {
    jobCompleted: {type: Boolean, default: false},
    verificationPassed: {type: Boolean, default: false},
    timeLockPassed: {type: Boolean, default: false}
  },
  timeLockHours: {type: Number, default: 24},
  logs: [{action: String, actor: String, timestamp: {type: Date, default: Date.now}, details: String}],
  createdAt: {type: Date, default: Date.now},
  fundedAt: {type: Date, default: null},
  verifiedAt: {type: Date, default: null},
  releasedAt: {type: Date, default: null},
  refundedAt: {type: Date, default: null}
});
escrowSchema.methods.addLog = function(action, actor, details) {
  this.logs.push({action, actor, details});
  return this;
};
escrowSchema.methods.checkAutoRelease = function() {
  if (this.status === 'funded' && this.autoRelease) {
    if (this.releaseConditions.jobCompleted && this.releaseConditions.verificationPassed) {
      this.status = 'verified'; this.verificationStatus = 'passed'; this.verifiedAt = new Date();
      this.addLog('auto-verified', 'system', 'Job completed and verification passed');
      this.status = 'released'; this.releasedAt = new Date();
      this.addLog('auto-released', 'system', 'Funds auto-released to payee');
    }
    if (this.releaseConditions.timeLockPassed) {
      this.status = 'released'; this.releasedAt = new Date();
      this.addLog('auto-released', 'system', 'Funds auto-released after time lock');
    }
  }
  if (this.status === 'funded' && this.verificationStatus === 'failed') {
    this.status = 'refunded'; this.refundedAt = new Date();
    this.addLog('auto-refunded', 'system', 'Funds refunded due to verification failure');
  }
  return this;
};
module.exports = mongoose.model('Escrow', escrowSchema);
