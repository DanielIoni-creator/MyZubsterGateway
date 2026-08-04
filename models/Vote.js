const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
  voter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vote: { type: String, enum: ['for', 'against', 'abstain'], required: true },
  votingPower: { type: Number, required: true }, // Numero di token al momento del voto
  tokenId: { type: String, default: null }, // NFT di reputazione associato
  txid: { type: String, default: null }, // Transazione on-chain (opzionale)
  createdAt: { type: Date, default: Date.now },
});

// Indice unico per evitare doppio voto
VoteSchema.index({ proposal: 1, voter: 1 }, { unique: true });
VoteSchema.index({ proposal: 1, vote: 1 });

module.exports = mongoose.model('Vote', VoteSchema);
