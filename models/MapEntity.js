// models/MapEntity.js
const mongoose = require('mongoose');

const ProvenanceRecordSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  transactionHash: {
    type: String,
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { _id: true });

const MapEntitySchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    enum: ['plant', 'animal', 'person']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  species: {
    type: String,
    trim: true,
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provenanceHistory: [ProvenanceRecordSchema],
  escrowId: {
    type: String,
    default: null
  },
  externalSource: {
    type: String,
    enum: ['gbif', 'inaturalist', 'manual', null],
    default: 'manual'
  },
  externalId: {
    type: String,
    default: null
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Index for geospatial queries
MapEntitySchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });
MapEntitySchema.index({ entityType: 1 });
MapEntitySchema.index({ owner: 1 });

module.exports = mongoose.model('MapEntity', MapEntitySchema);
