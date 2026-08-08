const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  description: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'roles',
  versionKey: false
});

// Index
roleSchema.index({ name: 1 });

// Static: trova ruolo per nome con permissions popolate
roleSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toLowerCase() }).populate('permissions');
};

// Instance: verifica se il ruolo ha un permesso specifico
roleSchema.methods.hasPermission = function(resource, action) {
  if (!this.permissions || this.permissions.length === 0) return false;

  // Se le permissions sono popolate (oggetti), controlla direttamente
  return this.permissions.some(p => {
    // Supporta sia oggetti popolati che ObjectId
    const permResource = typeof p === 'object' ? p.resource : null;
    const permAction = typeof p === 'object' ? p.action : null;
    return permResource === resource && permAction === action;
  });
};

module.exports = mongoose.models.Role || mongoose.model('Role', roleSchema);
