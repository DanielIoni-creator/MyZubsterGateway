const mongoose = require('mongoose');

const escrowSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  robotId: { type: String, required: true },
  clientAddress: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'disputed', 'released'], default: 'pending' },
  jobDescription: { type: String },
  gpsData: [{ lat: Number, lng: Number, timestamp: Date }],
  photos: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  releasedAt: { type: Date }
}, { collection: 'escrows' });

module.exports = mongoose.model('Escrow', escrowSchema);
