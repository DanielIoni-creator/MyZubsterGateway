# 🌍 MyZubster Gateway

**Monero (XMR) Payment Gateway - Privacy-First, Decentralized Payments**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Monero](https://img.shields.io/badge/Powered%20by-Monero-orange)](https://www.getmonero.org/)

---

## 📌 What is MyZubster Gateway?

MyZubster Gateway is a **lightweight, privacy-first payment processor** built for the Monero (XMR) network. It enables decentralized, low-fee transactions with built-in support for webhooks, order management, and merchant dashboards.

**Perfect for:**
- 🛒 E-commerce platforms
- 🎫 Ticketing and event systems
- 🖥️ SaaS subscriptions
- 🌿 Environmental and conservation projects

---

## ⚠️ IMPORTANT: Payment Policy

**This gateway accepts MONERO (XMR) ONLY.**

| Accepted | Rejected |
|----------|----------|
| ✅ Monero (XMR) | ❌ USDC, USDT, ETH, BTC |
| ✅ Privacy & anonymity | ❌ PayPal, bank transfers |
| ✅ Micro-transactions | ❌ Fiat currencies |

### Why Monero?

🔒 **Privacy** - No KYC required  
💰 **Low Fees** - Micro-transactions (€0.10) possible  
🌍 **Global** - Anyone can participate from anywhere  
🌿 **Sustainable** - 5% of fees go to conservation projects  

---

## 📊 Fee Structure

| Fee Type | Percentage | Destination |
|----------|------------|-------------|
| **Creator Fee** | 2% | Platform development |
| **Conservation Fund** | 5% | Environmental projects |
| **Operations** | 93% | Infrastructure, hosting, support |

**Creator Wallet:**45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Monero node (local or remote)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/DanielIoni-creator/MyZubsterGateway.git
cd MyZubsterGateway

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings

# 4. Start the server
npm start
Configuration

Create a .env file with:
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
Endpoint	Method	Description
/api/health	GET	Health check
/api/auth/register	POST	User registration
/api/auth/login	POST	User login
/api/orders	POST	Create order
/api/orders	GET	List orders
/api/orders/:id	GET	Get order details
/api/payments/process	POST	Process payment
/api/webhooks	POST	Register webhook
/api/webhooks/:id	DELETE	Delete webhook
🔐 Security

    JWT authentication for protected endpoints

    HMAC-SHA256 webhook signatures

    Rate limiting on all API endpoints

    Input validation and sanitization

    No KYC or personal data storage

    TLS/HTTPS required in production

🔗 Webhooks

Webhooks allow you to receive real-time notifications for order events:
javascript

{
  "url": "https://your-app.com/webhook",
  "events": ["order.created", "order.paid", "order.completed"],
  "secret": "your-webhook-secret"
}

All webhook payloads are signed with HMAC-SHA256 using your secret.
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

📁 Repository Structure
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
├── security/          # Security tools (BruteForceAI, onionscan)
├── .env.example       # Environment variables template
├── server.js          # Entry point
└── package.json       # Dependencies

🛠️ Technology Stack
Layer	Technology
Backend	Node.js + Express
Database	MongoDB + Mongoose
Blockchain	Monero (XMR) RPC
Auth	JWT + bcrypt
Testing	Jest + Supertest
Deployment	Docker + Vercel
📜 License

MIT - Free for everyone to use and modify.
💚 Thank You

Thank you to everyone who has contributed to this project.

🌱 Built with ❤️ for privacy and decentralization by DanielIoni-creator
