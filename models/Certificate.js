const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  plantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plant',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  certificateId: {
    type: String,
    required: true,
    unique: true
  },
  metadata: {
    species: String,
    commonName: String,
    gps: { lat: Number, lng: Number },
    age: Number,
    size: String,
    registrationDate: Date,
    moneroAddress: String
  },
  blockchainTxId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'minted', 'transferred', 'burned'],
    default: 'pending'
  },
  transferHistory: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    txId: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

certificateSchema.index({ certificateId: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
