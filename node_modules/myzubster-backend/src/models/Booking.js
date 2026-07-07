const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookingSchema = new Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  completedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Middleware per save
bookingSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Middleware per findOneAndUpdate
bookingSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update && update.status === 'completed' && !update.completedAt) {
    update.completedAt = new Date();
  }
  next();
});

// Metodi di utilità
bookingSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

bookingSchema.methods.isCancelled = function() {
  return this.status === 'cancelled';
};

bookingSchema.methods.isInProgress = function() {
  return this.status === 'in_progress';
};

bookingSchema.methods.getFormattedStatus = function() {
  const statusMap = {
    'pending': 'In attesa',
    'confirmed': 'Confermata',
    'in_progress': 'In corso',
    'completed': 'Completata',
    'cancelled': 'Cancellata'
  };
  return statusMap[this.status] || this.status;
};

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);