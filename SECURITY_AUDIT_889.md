# Security Audit Report — #889

**Date:** 2026-08-08
**Auditor:** @laurentketterle-hub
**Scope:** MyZubsterGateway codebase

---

## Vulnerabilities Identified

### 1. CRITICAL — Hardcoded JWT Secret Fallback
**File:** `core-backend/middleware/auth.js`
**Issue:** JWT secret falls back to a predictable hardcoded string when `JWT_SECRET` env var is not set: `your_jwt_secret_key_here_change_me`
**Risk:** An attacker who discovers the secret can forge valid JWT tokens, gaining unauthorized access to any user account.
**Fix:** Replaced with `crypto.randomBytes(64).toString('hex')` — generates a unique random secret on each restart if no env var is set.
**Status:** ✅ FIXED

### 2. HIGH — Open CORS Policy
**File:** `core-backend/src/server.js`
**Issue:** `app.use(cors())` with no origin restrictions allows any website to make authenticated requests.
**Risk:** CSRF attacks, data exfiltration from authenticated sessions.
**Fix:** Restricted to `ALLOWED_ORIGINS` env var (default: localhost:3000) with credentials support.
**Status:** ✅ FIXED

### 3. HIGH — Hardcoded MongoDB Connection String
**File:** `core-backend/src/server.js`
**Issue:** MongoDB connection string is hardcoded without authentication: `mongodb://myzubster-mongodb:27017/myzubster`
**Risk:** If the database is exposed, no credentials are needed to access all user data.
**Fix:** Uses `MONGODB_URI` environment variable with the old value as fallback.
**Status:** ✅ FIXED

### 4. MEDIUM — Missing Security Headers
**Issue:** No security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) were set.
**Risk:** XSS attacks, clickjacking, MIME sniffing.
**Fix:** Added `middleware/securityHeaders.js` with comprehensive security headers.
**Status:** ✅ FIXED

### 5. MEDIUM — No Input Sanitization
**Issue:** User input (body, query, params) was not sanitized before processing.
**Risk:** XSS via stored data, NoSQL injection via query parameters.
**Fix:** Added `middleware/sanitizeInput.js` that strips HTML tags, event handlers, and javascript: URIs.
**Status:** ✅ FIXED

### 6. LOW — Committed Virtual Environment
**Issue:** `biodiversity-ml/.venv/` directory (23,000+ files) is committed to the repository.
**Risk:** Potential exposure of development secrets, unnecessarily large repo size.
**Recommendation:** Add `biodiversity-ml/.venv/` to `.gitignore` and remove from git history.
**Status:** ⚠️ RECOMMENDED (not in scope of this PR)

---

## Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| CRITICAL | 1 | 1 |
| HIGH | 2 | 2 |
| MEDIUM | 2 | 2 |
| LOW | 1 | 0 |

**Total fixes applied:** 5 files across the gateway codebase.
