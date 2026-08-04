const AuditLog = require('../models/AuditLog');

const CRITICAL_ACTIONS = {
  'POST:/buy-myz': 'payment_initiated',
  'POST:/escrow/create': 'escrow_created',
  'POST:/api/rewards/trigger': 'reward_triggered',
  'POST:/api/bounty/create': 'bounty_created',
  'POST:/api/bounty/assign': 'bounty_assigned',
  'POST:/api/bounty/complete': 'bounty_completed',
  'POST:/api/stake/stake': 'stake_created',
  'POST:/api/escrow/house/create': 'house_escrow_created',
};

function auditLogger() {
  return async (req, res, next) => {
    const key = req.method + ':' + req.path;
    const action = CRITICAL_ACTIONS[key];
    if (action) {
      const originalEnd = res.end;
      res.end = async function (...args) {
        try {
          await AuditLog.create({
            userId: (req.body && (req.body.userId || req.body.userTariWallet)) || req.ip || 'anonymous',
            action,
            resource: req.path,
            resourceId: (req.body && (req.body.escrowId || req.body.issueId)) || null,
            ip: req.ip || (req.headers && req.headers['x-forwarded-for']) || 'unknown',
            userAgent: (req.headers && req.headers['user-agent']) || '',
            method: req.method,
            endpoint: req.path,
            statusCode: res.statusCode,
            details: { body: sanitizeBody(req.body || {}), query: req.query || {} },
            metadata: {}
          });
        } catch (err) {
          console.error('Audit log error:', err.message);
        }
        originalEnd.apply(res, args);
      };
    }
    next();
  };
}

async function logAudit(userId, action, resource, resourceId, details = {}) {
  try {
    return await AuditLog.create({ userId, action, resource, resourceId, ip: 'system', method: 'INTERNAL', endpoint: resource, statusCode: 200, details, metadata: {} });
  } catch (err) { return null; }
}

function sanitizeBody(body) {
  if (!body) return {};
  const safe = { ...body };
  delete safe.password; delete safe.token; delete safe.secret; delete safe.privateKey; delete safe.apiKey;
  return safe;
}

module.exports = { auditLogger, logAudit };
