<<<<<<< HEAD
# 🚀 MyZubster Gateway

**Monero Payment Engine for the MyZubster Ecosystem**

---

## 📌 What is MyZubster Gateway?

MyZubster Gateway is the **payment engine** for the MyZubster ecosystem. It handles all interactions with the Monero blockchain:

- ✅ Generates unique **subaddresses** for each order
- ✅ **Monitors** the blockchain for incoming payments in real-time
- ✅ Sends **webhooks** to the Marketplace when payments are confirmed
- ✅ Manages **transaction history** and payment status

---

## 🧩 Architecture

┌─────────────────────────────────────────────────────────────────┐
│ MyZubster Gateway │
├─────────────────────────────────────────────────────────────────┤
│ │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│ │ Express │────▶│ MongoDB │────▶│ Monero RPC │ │
│ │ Server │ │ (Database) │ │ Client │ │
│ └─────────────┘ └─────────────┘ └─────────────────┘ │
│ │
│ ▼ ▼ │
│ ┌──────────────────┐ ┌──────────────────┐ │
│ │ Webhooks ──────┼──▶│ Marketplace │ │
│ │ (Payment Conf) │ │ (port 4000) │ │
│ └──────────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
text


---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Server** | Node.js + Express | RESTful API server |
| **Database** | MongoDB | Store payments and transactions |
| **Monero Client** | monero-javascript | Interact with Monero blockchain |
| **Webhooks** | Axios | Notify Marketplace of payment confirmations |
| **Security** | Helmet, CORS, JWT | API authentication and security |

---

## 🚀 Installation

### Prerequisites

- Node.js v18+
- MongoDB v6+
- Monero node (stagenet for testing)

### Clone and Install

```bash
git clone https://github.com/DanielIoni-creator/MyZubsterGateway.git
cd MyZubsterGateway
npm install

Configure Environment
bash

cp .env.example .env
nano .env

Example .env file:
env

# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/myzubster

# Monero RPC
MONERO_RPC_URL=http://localhost:18081
MONERO_RPC_USERNAME=
MONERO_RPC_PASSWORD=
MONERO_NETWORK=testnet

# JWT
JWT_SECRET=your_jwt_secret

# Webhook
WEBHOOK_URL=http://localhost:4000/webhook/order-update
WEBHOOK_SECRET=your_webhook_secret

# Logging
LOG_LEVEL=info

▶️ Running the Gateway
bash

npm run start

Expected output:
text

🚀 Server avviato sulla porta 3000
✅ Connesso a MongoDB
📦 Database: mongodb://localhost:27017/myzubster

🧪 Test Endpoints
Health Check
bash

curl http://localhost:3000/api/health

Response:
json

{"status":"OK","message":"MyZubster Gateway is running!","timestamp":"..."}

Initiate Payment (Mock)
bash

curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test-123","amount":150,"currency":"USD"}'

🔗 Webhook Integration

The Gateway sends webhooks to the Marketplace when a payment is confirmed.

Webhook payload:
json

{
  "orderId": "test-123",
  "txHash": "tx_123456789",
  "status": "confirmed",
  "amount": 150,
  "timestamp": "2026-07-21T..."
}

📚 API Endpoints
Method	Endpoint	Description
GET	/api/health	Health check
POST	/api/payments/initiate	Create a new payment
GET	/api/payments/status/:id	Check payment status
POST	/api/payments/webhook	Webhook receiver (mock)
🔐 Security Best Practices
Practice	Implementation
JWT Authentication	All API endpoints require a valid JWT token
Webhook Signing	HMAC-SHA256 signature verification
Rate Limiting	Prevent DoS attacks
Environment Variables	No hardcoded secrets
HTTPS	Use TLS in production
🐛 Troubleshooting
"Cannot connect to MongoDB"
bash

# Check if MongoDB is running
docker ps | grep mongodb
# or
ps aux | grep mongod

# Start MongoDB
docker start mongodb

"Cannot connect to Monero RPC"
bash

# Check if Monero node is running
curl http://localhost:18081/get_info

# Start Monero node (testnet)
monerod --testnet --rpc-bind-port 18081

"Webhook delivery failed"
bash

# Check if Marketplace is running
curl http://localhost:4000/health

📄 License

This project is licensed under the MIT License.
🌐 Connect with Me

📖 Blog & Articles: DEV.to - Daniel Ioni
🐦 X (Twitter): @myzubster
💼 LinkedIn: Daniel Ioni
🐙 GitHub: DanielIoni-creator
🧅 Tor: http://olqcnbdlt35k2stmmwvzhvuetu2fc4us2jnn5wg6y6wlcddihfmdomid.onion

Built with ❤️ for privacy, freedom, and decentralization.

## 📊 Badges

![GitHub last commit](https://img.shields.io/github/last-commit/DanielIoni-creator/MyZubsterGateway)
![GitHub issues](https://img.shields.io/github/issues/DanielIoni-creator/MyZubsterGateway)
![GitHub pull requests](https://img.shields.io/github/issues-pr/DanielIoni-creator/MyZubsterGateway)
![GitHub](https://img.shields.io/github/license/DanielIoni-creator/MyZubsterGateway)
=======
**Monero (XMR) Only Payment Gateway**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Monero](https://img.shields.io/badge/Powered%20by-Monero-orange)](https://www.getmonero.org/)

---

## ⚠️ IMPORTANT: Payment Policy

**This gateway accepts MONERO (XMR) ONLY.**

- ✅ **Accepted:** Monero (XMR)
- ❌ **Rejected:** USDC, USDT, ETH, BTC, BNB, SOL, or any other cryptocurrency
- ❌ **Rejected:** PayPal, bank transfer, or any fiat currency

### Why Monero?

| Feature | Monero | Others |
|---------|--------|--------|
| Privacy | ✅ Complete | ❌ Public |
| Low Fees | ✅ Micro-fees | ❌ High fees |
| Decentralized | ✅ Fully | ❌ Centralized |
| Global Access | ✅ Worldwide | ❌ Restricted |

---

## 💰 Creator Wallet

The 2% creator fee is sent to:

45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe
text


**Verify:** https://xmrchain.net/address/45M4DW1ug8bdQowWpxucTpgsfjLbVxbYaAra79VewmBobuuhgqTjyD4R3DzpqLM2veiphcB16n24qN1QbLg3y2PYGK3Qkoe

---

## 📊 Fee Structure

| Fee Type | Percentage | Destination |
|----------|------------|-------------|
| **Creator Fee** | **2%** | MyZubster platform creator |
| **Conservation Fund** | **5%** | Environmental projects |
| **Operations** | **93%** | Infrastructure, development |

---

## 🚀 Getting Started

### For Contributors

1. **Find an issue** with 💰 label
2. **Claim it** by commenting "I'll take this!"
3. **Complete the task** and open a PR
4. **Include your Monero address** in PR description
5. **Get paid** in XMR within 24 hours

### For Users

1. **Register a plant** on MyZubster
2. **Pay the registration fee** in XMR
3. **Plant appears** on the global map
4. **Earn rewards** in XMR

---

## 🔒 Privacy First

- No KYC required
- No personal data stored
- Payments are private by default
- Your identity remains anonymous

---

## 🤝 Contribute

We welcome:
- 🌳 Plant registrations
- 👨‍💻 Code contributions (bounties in XMR)
- 💰 Donations to conservation fund (in XMR)
- 🗺️ Mapping assistance

---

## 📄 License

MIT - Free for everyone to use.

---

**Built with ❤️ for the planet by DanielIoni-creator**
>>>>>>> pr52-pgp
