# syntax=docker/dockerfile:1

# ============================================================
#  MyZubster Frontend - Production-ready multi-stage Dockerfile
#  Stack: React 19 + Vite 8  ->  served by nginx:1.27-alpine
#  Issue: #214 - [DevOps] Dockerfile per il frontend
# ============================================================

# ------------------------------------------------------------
# Stage 1 - build
# Install deps and produce the static bundle in /app/dist
# ------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# ---- Build-time configuration (baked into the client bundle) ----
# The app reads import.meta.env.VITE_API_URL (see src/utils/axiosConfig.js).
# Pass them at build time, e.g.:
#   docker build --build-arg VITE_API_URL=https://api.myzubster.example .
# Leaving VITE_API_URL empty falls back to "/api" (serve behind a reverse
# proxy that forwards /api to the backend, or set the real backend origin).
ARG VITE_API_URL=/api
ARG VITE_GATEWAY_URL=
ARG VITE_BACKEND_URL=
ARG VITE_MONERO_ADDRESS=
ARG VITE_ENV=production
ARG VITE_VERSION=1.0.0

# Install dependencies.
# NOTE: the committed package-lock.json is currently out of sync with
# package.json (it is missing tailwindcss, a transitive dependency of the
# @tailwindcss/* plugins), so `npm ci` would fail. We use `npm install`,
# which reconciles the lockfile and installs successfully. Once
# package-lock.json is regenerated (`npm install` locally and committed)
# you can switch this back to `npm ci` for fully reproducible builds.
COPY package.json package-lock.json ./
RUN npm install

# Copy sources, then write a .env so Vite exposes the VITE_* vars to the bundle
COPY . .
RUN printf 'VITE_API_URL=%s\nVITE_GATEWAY_URL=%s\nVITE_BACKEND_URL=%s\nVITE_MONERO_ADDRESS=%s\nVITE_ENV=%s\nVITE_VERSION=%s\n' \
    "$VITE_API_URL" "$VITE_GATEWAY_URL" "$VITE_BACKEND_URL" "$VITE_MONERO_ADDRESS" "$VITE_ENV" "$VITE_VERSION" > .env

# Build the optimized production bundle
RUN npm run build

# ------------------------------------------------------------
# Stage 2 - runtime
# Lean nginx image that only serves the static assets
# ------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# nginx config (SPA fallback, gzip, security headers, /healthz, logs to stdout)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Health check: probes the /healthz endpoint exposed by nginx
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
