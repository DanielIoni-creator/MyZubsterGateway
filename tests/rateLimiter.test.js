const { describe, it } = require('node:test');
const assert = require('node:assert');
const { rateLimiter, getRateLimitStats, resetRateLimit } = require('../middleware/rateLimiter');

describe('Rate Limiter Middleware', () => {
  it('should allow requests within limit', async () => {
    const limiter = rateLimiter({ windowMs: 60000, max: 5 });

    for (let i = 0; i < 5; i++) {
      const req = { ip: '127.0.0.1', headers: {}, connection: { remoteAddress: '127.0.0.1' }, originalUrl: '/test' };
      const res = { setHeader: () => {}, status: () => ({ json: () => {} }) };
      let nextCalled = false;
      await new Promise(resolve => {
        limiter(req, res, () => { nextCalled = true; resolve(); });
      });
      assert.strictEqual(nextCalled, true, `Request ${i + 1} should pass`);
    }
  });

  it('should block requests exceeding limit', async () => {
    const limiter = rateLimiter({ windowMs: 60000, max: 2 });
    const req = { ip: '192.168.1.1', headers: {}, connection: { remoteAddress: '192.168.1.1' }, originalUrl: '/test' };

    // Pass 2 requests
    for (let i = 0; i < 2; i++) {
      const res = { setHeader: () => {} };
      await new Promise(resolve => limiter(req, res, resolve));
    }

    // 3rd should fail
    let statusCode = null;
    let responseBody = null;
    const res = {
      setHeader: () => {},
      status: (code) => { statusCode = code; return { json: (body) => { responseBody = body; } }; }
    };
    await new Promise(resolve => limiter(req, res, resolve));
    assert.strictEqual(statusCode, 429);
    assert.strictEqual(responseBody.error, 'Too Many Requests');
  });

  it('should set rate limit headers', async () => {
    const limiter = rateLimiter({ windowMs: 60000, max: 10 });
    const headers = {};
    const req = { ip: '10.0.0.1', headers: {}, connection: {}, originalUrl: '/api/test' };
    const res = {
      setHeader: (name, value) => { headers[name] = value; }
    };
    await new Promise(resolve => limiter(req, res, resolve));
    assert.ok(headers['X-RateLimit-Limit'] !== undefined);
    assert.ok(headers['X-RateLimit-Remaining'] !== undefined);
    assert.ok(headers['X-RateLimit-Reset'] !== undefined);
  });

  it('should track per-endpoint limits', async () => {
    const limiter = rateLimiter({ windowMs: 60000, max: 3, keyBy: 'ip+endpoint' });
    const ip = '172.16.0.1';

    const makeReq = (url) => {
      const req = { ip, headers: {}, connection: {}, originalUrl: url };
      const res = { setHeader: () => {} };
      return new Promise(resolve => limiter(req, res, resolve));
    };

    // Hit different endpoints
    await makeReq('/api/a');
    await makeReq('/api/a');
    await makeReq('/api/b');
    await makeReq('/api/b');

    const stats = getRateLimitStats();
    const endpointKeys = stats.entries.filter(e => e.key.startsWith(ip));
    assert.ok(endpointKeys.length >= 2, 'Should track multiple endpoints');
  });
});
