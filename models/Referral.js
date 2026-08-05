const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  ownerId: { type: String, required: true },
  referralCode: { type: String, required: true, unique: true },
  uses: { type: Number, default: 0 },
  rewardsEarned: { type: Number, default: 0 }
});
module.exports = mongoose.model('Referral', schema);
