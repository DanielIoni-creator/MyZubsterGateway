const mongoose = require('mongoose');
const disputeSchema = new mongoose.Schema({
  disputeId: {type: String, required: true, unique: true, index: true},
  initiatorId: {type: String, required: true},
  respondentId: {type: String, required: true},
  escrowId: {type: String, required: true},
  reason: {type: String, required: true},
  status: {type: String, enum: ['open','mediation','voting','resolved','cancelled'], default: 'open'},
  initiatorEvidence: {type: String, default: null},
  respondentEvidence: {type: String, default: null},
  votes: [{voterId: String, vote: {type: String, enum: ['initiator','respondent']}, timestamp: {type: Date, default: Date.now}}],
  resolution: {type: String, default: null},
  resolvedBy: {type: String, enum: ['vote','admin','timeout',null], default: null},
  createdAt: {type: Date, default: Date.now},
  mediationDeadline: {type: Date, default: null},
  votingDeadline: {type: Date, default: null},
  resolvedAt: {type: Date, default: null}
});
disputeSchema.methods.checkAutoResolve = function() {
  if (this.status === 'mediation' && this.mediationDeadline && new Date() > this.mediationDeadline) {
    if (this.initiatorEvidence && !this.respondentEvidence) { this.status='resolved'; this.resolution='initiator'; this.resolvedBy='timeout'; this.resolvedAt=new Date(); }
    else if (!this.initiatorEvidence && this.respondentEvidence) { this.status='resolved'; this.resolution='respondent'; this.resolvedBy='timeout'; this.resolvedAt=new Date(); }
    else { this.status='voting'; this.votingDeadline=new Date(Date.now()+48*60*60*1000); }
  }
  if (this.status === 'voting' && this.votingDeadline && new Date() > this.votingDeadline) {
    const i=this.votes.filter(v=>v.vote==='initiator').length, r=this.votes.filter(v=>v.vote==='respondent').length;
    this.status='resolved'; this.resolution=i>r?'initiator':'respondent'; this.resolvedBy='timeout'; this.resolvedAt=new Date();
  }
  return this;
};
module.exports = mongoose.model('Dispute', disputeSchema);
