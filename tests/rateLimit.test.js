// tests/rateLimit.test.js — verifies rate limiting is wired (no live server needed)
const fs = require('fs');
const path = require('path');
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

// Verify the GLOBAL limiter in server.js without requiring it (avoids model pollution).
// server.js applies `app.use(globalLimiter)` right after defining it; we assert the
// config string is present in source so the test stays isolated from mongoose models.
const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const hasGlobalLimiter = /rateLimit\(\{\s*windowMs:\s*15 \* 60 \* 1000[\s\S]*?max:\s*300/.test(serverSrc);

describe('rate limiting (bounty #39)', () => {
  test('express-rate-limit is invoked for auth (and global in server.js)', () => {
    // auth limiter captured by requiring auth.js; global verified via source
    expect(captured.length).toBeGreaterThanOrEqual(1);
    expect(hasGlobalLimiter).toBe(true);
  });

  test('auth limiter has strict config (max 20 / 15min)', () => {
    const authCfg = captured.find((c) => c && c.max === 20 && c.windowMs === 15 * 60 * 1000);
    expect(authCfg).toBeDefined();
  });

  test('auth routes still register /register and /login', () => {
    const paths = authRoutes.stack.filter((l) => l.route).map((l) => l.route.path);
    expect(paths).toContain('/register');
    expect(paths).toContain('/login');
  });
});
