> **Part of the [MyZubster ecosystem](https://github.com/MyZubster-Ecosystem)**

> **Part of the [MyZubster ecosystem](https://github.com/MyZubster-Ecosystem)**

# 🌐 MyZubster Gateway

**Backend API for MyZubster - Monero Payment Gateway & Animal Registry**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Monero](https://img.shields.io/badge/Powered%20by-Monero-orange)](https://www.getmonero.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-brightgreen)](https://mongodb.com/)

---

## 📌 What is MyZubster Gateway?

MyZubster Gateway is a **lightweight, privacy-first payment processor** built for the Monero (XMR) network. It enables decentralized, low-fee transactions with built-in support for webhooks, order management, and merchant dashboards.

**Perfect for:**
- 🛒 E-commerce platforms
- 🎫 Ticketing and event systems
- 🖥️ SaaS subscriptions
- 🌿 Environmental and conservation projects
- 🐾 Animal and plant registries

---

## ⚠️ IMPORTANT: Payment Policy

**This gateway accepts MONERO (XMR) ONLY.**

| Accepted | Rejected |
|----------|----------|
| ✅ Monero (XMR) | ❌ USDC, USDT, ETH, BTC |
| ✅ Privacy & anonymity | ❌ PayPal, bank transfers |
| ✅ Micro-transactions (€0.10) | ❌ Fiat currencies |

### Why Monero?

| Feature | Monero (XMR) |
|---------|--------------|
| 🔒 Privacy | No KYC required |
| 💰 Low Fees | Micro-transactions (€0.10) possible |
| 🌍 Global | Anyone can participate from anywhere |
| 🌿 Sustainable | 5% of fees go to conservation projects |

---

## 📊 Fee Structure

**Registration is FREE.**

MyZubster is an open-source, community-driven project. All registrations (animals, plants) are free.

### How the Platform is Funded

The platform is sustained through:
- 💰 **Donations** – Voluntary contributions from the community
- 🚀 **Premium Services** – Optional paid features (certificates, analytics)
- 🤝 **Sponsors & Grants** – Corporate sponsorships and open source grants

### Fund Allocation

| Destination | Percentage |
|-------------|------------|
| Bounties | 90% |
| Infrastructure | 5% |
| Conservation | 5% |

### Donate to Support MyZubster

If you believe in this project, you can support us with a donation in Monero (XMR):

**Wallet:** `45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe`

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **MongoDB** 6+
- **Monero node** (local or remote)

### Installation

```bash
# 1. Clone the repository
git clone git@github.com:MyZubster-Ecosystem/MyZubsterGateway.git
cd MyZubsterGateway

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings

# 4. Start the server
npm startConfiguration

Create a .env file with:
bash

# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/myzubster

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Monero
MONERO_RPC_URL=http://localhost:18081
MONERO_WALLET_RPC_URL=http://localhost:18082

📡 API Endpoints
Public Endpoints
Method	Endpoint	Description
GET	/api/health	Health check
POST	/api/auth/register	User registration
POST	/api/auth/login	User login
POST	/api/auth/refresh	Refresh JWT token
Protected Endpoints (JWT required)
Method	Endpoint	Description
GET	/api/users/profile	Get user profile
PUT	/api/users/profile	Update user profile
Orders
Method	Endpoint	Description
POST	/api/orders	Create order
GET	/api/orders	List orders
GET	/api/orders/:id	Get order details
PUT	/api/orders/:id/status	Update order status
Payments
Method	Endpoint	Description
POST	/api/payments/process	Process payment
GET	/api/payments/status/:id	Check payment status
Webhooks
Method	Endpoint	Description
POST	/api/webhooks	Register webhook
GET	/api/webhooks	List webhooks
PUT	/api/webhooks/:id	Update webhook
DELETE	/api/webhooks/:id	Delete webhook
Animals
Method	Endpoint	Description
POST	/api/animals/register	Register an animal
GET	/api/animals	List animals
GET	/api/animals/:id	Get animal details
POST	/api/animals/:id/verify	Verify an animal
Plants
Method	Endpoint	Description
POST	/api/plants/register	Register a plant
GET	/api/plants	List plants
GET	/api/plants/:id	Get plant details
POST	/api/plants/:id/verify	Verify a plant
🔐 Security
Authentication

    JWT-based authentication with refresh token rotation

    Role-based access control (RBAC) for admin endpoints

    Brute-force protection via BruteForceAI module

    Rate limiting on all API endpoints (100 requests per minute per IP)

Data Protection

    PGP encryption for sensitive order data

    HTTPS/TLS 1.3 required in production

    No PII or KYC data stored (privacy-first design)

    Environment variables for all secrets (no hardcoded credentials)

Blockchain Integration

    Monero RPC with secure authentication

    Transaction verification with double-spend protection

    Wallet address validation (Monero addresses only, starting with 4 or 8)

Webhooks

    HMAC-SHA256 signatures for webhook payloads

    Retry logic with exponential backoff

    IP whitelisting for webhook endpoints (optional)

Infrastructure

    Docker containers with minimal attack surface

    Security headers configured in Nginx

    Automatic security updates via dependabot

    Tor onion service for privacy-preserving access (optional)

🛠️ Technology Stack
Layer	Technology
Backend	Node.js + Express
Database	MongoDB + Mongoose
Blockchain	Monero (XMR) RPC
Authentication	JWT + bcrypt
Security	Helmet, CORS, Rate Limiting
Testing	Jest + Supertest
Deployment	Docker + Vercel
📂 Repository Structure
text

MyZubsterGateway/
├── src/
│   ├── api/           # API routes
│   ├── controllers/   # Business logic
│   ├── models/        # Database models
│   ├── services/      # External services
│   └── utils/         # Utilities
├── tests/             # Unit and integration tests
├── docs/              # Documentation
├── security/          # Security tools
├── .env.example       # Environment variables template
├── server.js          # Entry point
└── package.json       # Dependencies

🔗 Related Projects
Project	Description	Link
Animal Registry	Documentation for animal registration	GitHub
Plant Map	Global map for plant registration	GitHub
Animal Map	Interactive map for animal registry	GitHub
📚 Documentation

    API Reference – Complete API documentation

    Security Policy – Security guidelines

    Contribution Guide – How to contribute

    Fund Transparency – All transactions are public

🤝 How to Contribute

We welcome contributions! Open issues are available with 💰 bounties.
Bounty Program
Tier	XMR	Tasks
Spicciolo	0.0005	Typo fix, docs
Spiccioletto	0.001	Small fixes
Spicciona	0.003	Unit tests
SuperSpiccio	0.01	Features
Premium	0.06	Complex features
How to Claim

    Browse issues with 💰 label

    Comment "I'll take this!"

    Open a PR with your Monero address

    Get paid in XMR!

📄 License

MIT – Free for everyone to use and modify.
💚 Built with ❤️ for animals and plants by MyZubster-Ecosystem

🌐 GitHub: @MyZubster-Ecosystem
🌟 Let's Build a Decentralized Ecosystem Together!

Every contribution counts. Join us in building a transparent, privacy-first platform for the world.

# MyZubster-Ecosystem

## 🌐 Ecosystem Hub

**MyZubster Ecosystem**: https://github.com/MyZubster-Ecosystem

## 🌐 Ecosystem Hub

**MyZubster Ecosystem**: https://github.com/MyZubster-Ecosystem


## 💬 Community

- **Telegram**: [@MyZubster_bot](https://t.me/MyZubster_bot) – for updates, support, and discussions.


## 🌐 Connect with Us

- **Telegram**: [@MyZubster_bot](https://t.me/MyZubster_bot) – updates, support, and discussions
- **Twitter / X**: [@DanielIoni](https://twitter.com/DanielIoni) – project announcements and thoughts
- **TikTok**: [@danielioni](https://tiktok.com/@danielioni) – behind the scenes and project updates
- **Instagram**: [@danielioni](https://instagram.com/danielioni) – visuals and community stories
- **dev.to**: [Daniel Ioni](https://dev.to/danielioni) – technical articles and project updates


## 💬 Community

- **Telegram Channel**: [@myzubster](https://t.me/myzubster) – follow for updates, news, and discussions about the MyZubster ecosystem.
