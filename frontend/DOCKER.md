# MyZubster Frontend — Docker Deployment

Production-ready Dockerfile for the React + Vite frontend.

## Features

- **Multi-stage build** — `node:20-alpine` builds the bundle, `nginx:1.27-alpine` serves it. Final image is ~25 MB, no node_modules, no build toolchain.
- **Layer caching** — `package.json` + `package-lock.json` are copied and installed before the rest of the source, so dependency layers are reused across builds.
- **Environment variables** — Vite build args (`VITE_*`) are inlined at build time (see table below).
- **Health checks** — `/healthz` endpoint + Docker `HEALTHCHECK` instruction.
- **Logging** — nginx access/error logs go to stdout/stderr, so `docker logs` works out of the box.
- **Optimization** — gzip compression, immutable caching for hashed assets, SPA history fallback.

## Build

```bash
cd frontend

# Minimal build (uses .env.production for VITE_* values)
docker build -t myzubster-frontend .

# With explicit build args
docker build -t myzubster-frontend \
  --build-arg VITE_API_URL=https://api.myzubster.example \
  --build-arg VITE_GATEWAY_URL=https://api.myzubster.example \
  --build-arg VITE_BACKEND_URL=https://backend.myzubster.example \
  --build-arg VITE_ENV=production \
  --build-arg VITE_VERSION=1.2.0 \
  .
```

## Run

```bash
docker run -d --name myzubster-frontend -p 3000:80 myzubster-frontend
# → http://localhost:3000
# → health:  http://localhost:3000/healthz  (returns "ok")
```

## Docker Compose

Add this service to `docker-compose.yml`:

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:
      VITE_API_URL: ${VITE_API_URL:-http://localhost:10001}
      VITE_GATEWAY_URL: ${VITE_GATEWAY_URL:-http://localhost:10001}
      VITE_BACKEND_URL: ${VITE_BACKEND_URL:-http://localhost:3010}
      VITE_ENV: ${VITE_ENV:-production}
  container_name: myzubster-frontend
  restart: unless-stopped
  ports:
    - "3000:80"
  networks:
    - myzubster-network
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://127.0.0.1/healthz"]
    interval: 30s
    timeout: 5s
    retries: 3
```

## Environment Variables

| Variable           | Build arg        | Description                        |
|--------------------|------------------|------------------------------------|
| `VITE_API_URL`     | `VITE_API_URL`   | Gateway API base URL               |
| `VITE_GATEWAY_URL` | `VITE_GATEWAY_URL` | Monero gateway URL               |
| `VITE_BACKEND_URL` | `VITE_BACKEND_URL` | Backend API URL                  |
| `VITE_MONERO_ADDRESS` | `VITE_MONERO_ADDRESS` | Default Monero payout address |
| `VITE_ENV`         | `VITE_ENV`       | `production` / `staging` / ...     |
| `VITE_VERSION`     | `VITE_VERSION`   | App version shown in UI            |

> ⚠️ Vite inlines `VITE_*` variables at **build time** — changing them requires a rebuild. If you need runtime configuration, inject them at the nginx level instead (e.g. an `/config.js` endpoint).

## Files

```
frontend/
├── Dockerfile      # Multi-stage build (node build → nginx runtime)
├── nginx.conf      # SPA config: gzip, caching, health, logging
├── .dockerignore   # Keeps build context small
└── DOCKER.md       # This document
```
