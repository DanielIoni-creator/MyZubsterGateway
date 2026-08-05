const mongoose = require('mongoose');

/**
 * AuditLog - Bounty B14 (#279)
 *
 * Traccia immutabile delle azioni critiche del gateway: pagamenti, escrow,
 * robot, bounty, backup, stake e rewards.
 */
const AuditLogSchema = new mongoose.Schema({
  // Azione in forma `dominio.operazione`, es. `escrow.create`, `payment.buy_myz`.
  action: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ['payment', 'escrow', 'robot', 'bounty', 'backup', 'stake', 'reward', 'webhook', 'admin', 'other'],
    default: 'other',
    index: true
  },
  // Chi ha compiuto l'azione. Non sempre disponibile: le route del gateway non
  // sono autenticate, quindi si ricava dal payload (clientId, userId, buyer...).
  userId: { type: String, default: null, index: true },
  resourceType: { type: String, default: null },
  resourceId: { type: String, default: null, index: true },

  method: { type: String, default: null },
  path: { type: String, default: null },
  statusCode: { type: Number, default: null },
  status: { type: String, enum: ['success', 'failure'], default: 'success', index: true },

  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  durationMs: { type: Number, default: null },

  // Payload della richiesta ripulito dai segreti.
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  error: { type: String, default: null },

  createdAt: { type: Date, default: Date.now, index: true }
});

// Indici composti per le query più frequenti dell'API /api/audit.
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ category: 1, createdAt: -1 });

// Retention opzionale: con AUDIT_LOG_TTL_DAYS impostato, MongoDB elimina da solo
// le voci più vecchie. Senza la variabile i log restano per sempre.
const ttlDays = parseInt(process.env.AUDIT_LOG_TTL_DAYS, 10);
if (Number.isFinite(ttlDays) && ttlDays > 0) {
  AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: ttlDays * 24 * 3600 });
}

module.exports = mongoose.model('AuditLog', AuditLogSchema);
