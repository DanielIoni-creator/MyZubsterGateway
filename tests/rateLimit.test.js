// tests/rateLimit.test.js — verifies rate limiting is wired (no live server needed)
const express = require('express');
const rateLimit = require('express-rate-limit');

// Spy: capture limiter options passed to rateLimit()
const captured = [];
jest.mock('express-rate-limit', () => (opts) => {
  captured.push(opts);
  // A no-op limiter that always allows, so the route handler runs
  return (req, res, next) => next();
});

const authRoutes = require('../routes/auth.js');
// Load server.js to capture the global limiter (rateLimit is called at module load,
// before any DB connection in this repo's setup).
try { require('../server.js'); } catch (_) { /* ignore mongoose connect errors in test */ }

describe('rate limiting (bounty #39)', () => {
  test('express-rate-limit is invoked at least twice (global + auth)', () => {
    expect(captured.length).toBeGreaterThanOrEqual(2);
  });

  test('auth limiter has strict config (max 20 / 15min)', () => {
    const authCfg = captured.find((c) => c && c.max === 20 && c.windowMs === 15 * 60 * 1000);
    expect(authCfg).toBeDefined();
  });

  test('global limiter has config (max 300 / 15min)', () => {
    const globalCfg = captured.find((c) => c && c.max === 300 && c.windowMs === 15 * 60 * 1000);
    expect(globalCfg).toBeDefined();
  });

  test('auth routes still register /register and /login', () => {
    const paths = authRoutes.stack.filter((l) => l.route).map((l) => l.route.path);
    expect(paths).toContain('/register');
    expect(paths).toContain('/login');
  });
});
