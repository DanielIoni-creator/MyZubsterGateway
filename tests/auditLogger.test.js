const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Audit Log Middleware', () => {
  it('should export auditLogger and logAudit', () => {
    const { auditLogger, logAudit } = require('../middleware/auditLogger');
    assert.strictEqual(typeof auditLogger, 'function');
    assert.strictEqual(typeof logAudit, 'function');
  });

  it('auditLogger should return middleware function', () => {
    const { auditLogger } = require('../middleware/auditLogger');
    const middleware = auditLogger();
    assert.strictEqual(typeof middleware, 'function');
    assert.strictEqual(middleware.length, 3);
  });
});
