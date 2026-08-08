# MyZubsterGateway — Architecture Guide

## Overview

MyZubsterGateway is a Node.js/Express REST API gateway serving as the backend
for the MyZubster ecosystem. It follows a layered MVC architecture with
MongoDB persistence and JWT-based authentication.

## System Layers

```
Client (Web/Mobile/CLI)
        │
        ▼
┌───────────────────┐
│   Express Router   │ ← CORS, Helmet, Rate Limiting
├───────────────────┤
│   Controllers      │ ← Request validation, auth checks
├───────────────────┤
│   Models (Mongoose)│ ← Schema validation, business logic
├───────────────────┤
│   MongoDB          │ ← Document storage
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Agents           │ ← Telegram bot, Bounty auto-claim
├───────────────────┤
│   External APIs    │ ← Payment gateways, Tari network
└───────────────────┘
```

## Directory Structure

```
MyZubsterGateway/
├── src/
│   ├── controllers/    # Route handlers (auth, users, orders, bounties)
│   ├── models/         # Mongoose schemas (User, Order, Bounty)
│   ├── routes/         # Express route definitions
│   ├── agents/         # Autonomous agent workers
│   ├── telegram/       # Telegram bot integration
│   └── server.js       # Entry point — Express app bootstrap
├── docs/               # Documentation
├── public/             # Static assets
└── package.json
```

## Request Flow

1. **Inbound**: Request hits Express middleware chain (helmet → cors → rate-limit → morgan)
2. **Auth**: JWT extracted from `Authorization: Bearer` header, verified against secret
3. **Routing**: Express router dispatches to controller based on path
4. **Validation**: Controller validates input against schema
5. **Business Logic**: Model methods execute database operations
6. **Response**: JSON payload with standard envelope `{ data, page, total }`

## Database Schema

- **User**: `{ username, email, passwordHash, role, wallet, createdAt }`
- **Order**: `{ userId, type, amount, status, bountyRef, createdAt }`
- **Bounty**: `{ issueUrl, repo, amount, currency, status, claimedBy }`

## Security Model

- Passwords hashed with bcryptjs (12 salt rounds)
- JWT with 24h expiry, refresh token rotation
- Helmet headers for XSS, CSP, HSTS
- Rate limiting: 100 req/15min per IP
- Input sanitization via express-validator

## Concurrency & Scaling

- Single-process Express server with async/await
- MongoDB connection pooling (mongoose defaults: 100 connections)
- Stateless JWT auth allows horizontal scaling behind load balancer
- Recommended: PM2 cluster mode for multi-core utilization
