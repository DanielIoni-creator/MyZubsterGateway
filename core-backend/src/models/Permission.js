const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  resource: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  collection: 'permissions',
  versionKey: false
});

// Index composto: unico per resource+action
permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

// Static: trova o crea un permesso
permissionSchema.statics.findOrCreate = async function(name, resource, action, description = '') {
  let perm = await this.findOne({ resource, action });
  if (!perm) {
    perm = await this.create({ name, resource, action, description });
  }
  return perm;
};

module.exports = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);
