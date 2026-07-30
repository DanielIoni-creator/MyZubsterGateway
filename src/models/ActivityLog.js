const mongoose = require('mongoose');

/**
 * ActivityLog model for tracking user actions
 * Used for audit trails, security monitoring, and user activity history
 */
const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'register',
      'order_create', 'order_update', 'order_cancel',
      'payment_initiate', 'payment_complete', 'payment_fail',
      'webhook_receive', 'webhook_process',
      'profile_update', 'password_change',
      'admin_verify_transaction', 'admin_request_refund',
      'api_key_generate', 'api_key_revoke',
      'escrow_create', 'escrow_release', 'escrow_dispute',
    ],
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel',
  },
  targetModel: {
    type: String,
    enum: ['Transaction', 'Order', 'Escrow', 'User'],
  },
  ip: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 90 * 24 * 60 * 60, // Auto-delete after 90 days
  },
});

// Compound index for efficient user activity queries
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

/**
 * Static method to log an activity
 */
activityLogSchema.statics.log = async function({ userId, action, targetId, targetModel, ip, userAgent, metadata, status }) {
  try {
    const entry = await this.create({
      userId,
      action,
      targetId,
      targetModel,
      ip: ip || '',
      userAgent: userAgent || '',
      metadata: metadata || {},
      status: status || 'success',
    });
    return entry;
  } catch (error) {
    console.error('ActivityLog error:', error);
    // Don't throw — logging failures shouldn't break the main flow
    return null;
  }
};

/**
 * Instance method to get formatted timestamp
 */
activityLogSchema.methods.getFormattedDate = function() {
  return this.createdAt.toISOString();
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
