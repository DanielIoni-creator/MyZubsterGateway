const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Manutenzione',
      'Bellezza',
      'Informatica',
      'Giardinaggio',
      'Pulizie',
      'Insegnamento',
      'Arte',
      'Salute',
      'Altro'
    ]
  },
  zone: {
    type: String,
    required: true
  },
  pricePerHour: {
    type: Number,
    default: 0
  },
  fixedPrice: {
    type: Number,
    default: 0
  },
  pricingType: {
    type: String,
    enum: ['hourly', 'fixed'],
    default: 'hourly'
  },
  availability: {
    type: String,
    default: 'Su appuntamento'
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

SkillSchema.index({ user: 1 });
SkillSchema.index({ category: 1 });
SkillSchema.index({ zone: 1 });
SkillSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Skill', SkillSchema);