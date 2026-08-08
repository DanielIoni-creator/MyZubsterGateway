# MyZubsterGateway — Developer Guide

## Prerequisites

- Node.js ≥ 18.0.0
- MongoDB ≥ 6.0 (local or Atlas)
- Git
- npm or yarn

## Quick Start

```bash
git clone https://github.com/MyZubster-Ecosystem/MyZubsterGateway.git
cd MyZubsterGateway
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP server port |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | HMAC key for JWT signing |
| `JWT_EXPIRY` | No | `24h` | Token lifetime |
| `RATE_LIMIT_WINDOW` | No | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `TELEGRAM_BOT_TOKEN` | No | — | Telegram bot API token |
| `TARI_RPC_URL` | No | — | Tari network RPC endpoint |
| `BOUNTY_AUTO_CLAIM` | No | `false` | Enable auto-claim agent |

## Development Workflow

### Running Tests

```bash
npm test                 # Full suite with coverage
npm run test:watch       # Watch mode for TDD
npx jest path/to/test    # Single test file
```

### Linting & Formatting

```bash
npm run lint             # ESLint check
npm run format           # Prettier auto-format
```

### API Testing with cURL

```bash
# Health check
curl http://localhost:3000/api/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"dev","email":"dev@test.com","password":"test123"}'

# Login (save the token)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"test123"}' | jq -r '.token')

# Authenticated request
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/users
```

## Project Conventions

### File Naming
- Controllers: `kebab-case.controller.js`
- Models: `PascalCase.js`
- Routes: `kebab-case.routes.js`
- Tests: `*.test.js` alongside source

### Commit Messages
Follow Conventional Commits: `type(scope): description`
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` code restructuring
- `test:` test additions

### Error Handling
All controllers use try/catch with a centralized error handler:
```js
try {
  const result = await service.doSomething();
  res.json({ data: result });
} catch (err) {
  next(err); // Passes to Express error middleware
}
```

## Adding a New Endpoint

1. Define the Mongoose model in `src/models/` (if new entity)
2. Create controller in `src/controllers/`
3. Register routes in `src/routes/`
4. Add tests in `*.test.js`
5. Update API reference in `docs/API_REFERENCE.md`

## Debugging

```bash
# Enable debug logs
DEBUG=myzubster:* npm run dev

# Node.js inspector
node --inspect server.js
# Then open chrome://inspect in Chrome
```
