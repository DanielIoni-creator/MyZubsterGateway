const mongoose = require('mongoose');

const robotSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  owner: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['lawn_mower', 'irrigation', 'delivery', 'drone'], 
    default: 'lawn_mower' 
  },
  skills: [{
    name: String,
    price: Number,
    category: String,
    description: String
  }],
  reputation: { 
    type: Number, 
    default: 100 
  },
  jobsCompleted: { 
    type: Number, 
    default: 0 
  },
  walletAddress: { 
    type: String, 
    required: true 
  },
  batteryLevel: { 
    type: Number, 
    default: 100 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastSeen: { 
    type: Date, 
    default: Date.now 
  },
  location: {
    lat: Number,
    lng: Number
  },
  referrer: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  collection: 'robots' // Forza il nome della collection
});

module.exports = mongoose.model('Robot', robotSchema);
