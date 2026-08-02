# syntax=docker/dockerfile:1.7

###############################################################################
# STAGE 1 — Build the React + Vite application
###############################################################################
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the source
COPY . .

# ── Build-time environment variables ────────────────────────────────────────
# Vite inlines these at build time. Override with --build-arg or compose args.
ARG VITE_API_URL
ARG VITE_GATEWAY_URL
ARG VITE_BACKEND_URL
ARG VITE_MONERO_ADDRESS
ARG VITE_ENV=production
ARG VITE_VERSION=1.0.0

ENV VITE_API_URL=$VITE_API_URL \
    VITE_GATEWAY_URL=$VITE_GATEWAY_URL \
    VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_MONERO_ADDRESS=$VITE_MONERO_ADDRESS \
    VITE_ENV=$VITE_ENV \
    VITE_VERSION=$VITE_VERSION

# Build the static bundle
RUN npm run build

###############################################################################
# STAGE 2 — Minimal nginx runtime (static hosting)
###############################################################################
FROM nginx:1.27-alpine

# SPA-friendly nginx config: gzip, caching, history fallback, health endpoint,
# access/error logs to stdout/stderr so `docker logs` works.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Metadata
LABEL org.opencontainers.image.title="myzubster-frontend" \
      org.opencontainers.image.description="Production-ready frontend container for MyZubster" \
      org.opencontainers.image.version="${VITE_VERSION}" \
      org.opencontainers.image.source="https://github.com/MyZubster-Ecosystem/MyZubsterGateway"

EXPOSE 80

# Health check — requires wget (available in busybox on nginx:alpine)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

# Run nginx in the foreground so the container stays alive
CMD ["nginx", "-g", "daemon off;"]
