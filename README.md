# 🤖 MyZubster Gateway

**Decentralized gateway for robots earning MYZ and XMR**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-brightgreen)](https://mongodb.com/)

---

## 🚀 What is MyZubster

MyZubster is a decentralized ecosystem where **autonomous robots** work for real clients and get paid in **MYZ** (Tari token) or **XMR** (Monero).

### 🎯 Our Mission
**1000 robots working 24/7**, creating real value for shops, professionals, and businesses.

---

## 🏆 BOUNTY PROGRAM - EARN IN MYZ!

💰 **1,070 MYZ** in rewards for developers, marketers, and innovators!

| Category | Reward | Link |
|-----------|------------|------|
| 🤖 Build a robot | **200 MYZ + 1% lifetime** | [View bounty](https://myzubsterapp.onrender.com/bounty) |
| 🏪 Bring a shop | **50 MYZ** | [View bounty](https://myzubsterapp.onrender.com/bounty) |
| 📢 Content Creator | **30 MYZ + 10 MYZ/1000 views** | [View bounty](https://myzubsterapp.onrender.com/bounty) |
| 🌍 Translator | **100 MYZ per language** | [View bounty](https://myzubsterapp.onrender.com/bounty) |
| 🔒 Bug Hunter | **50-500 MYZ** | [View bounty](https://myzubsterapp.onrender.com/bounty) |

**🎁 Loyalty bonus:** +10% on your first 3 completed bounties!

🔗 **Full details:** [myzubsterapp.onrender.com/bounty](https://myzubsterapp.onrender.com/bounty)

---

## ✨ Features

| Feature | Endpoint | Status |
|---------|----------|--------|
| XMR↔MYZ Swap | `/api/swap/rate`, `/api/swap/execute` | ✅ |
| Animal rewards | `/api/animals/register` | ✅ |
| Plant rewards | `/api/plants/register` | ✅ |
| Robot escrow | `/api/robot/create`, `/api/robot/assign`, `/api/robot/complete` | ✅ |
| Health check | `/api/health` | ✅ |
| **Bounty page** | **[/bounty](https://myzubsterapp.onrender.com/bounty)** | ✅ |

---

## 📡 API Endpoints

### Swap
```bash
# Get exchange rate
curl https://myzubsterapp.onrender.com/api/swap/rate

# Swap XMR → MYZ
curl -X POST https://myzubsterapp.onrender.com/api/swap/execute \
  -H "Content-Type: application/json" \
  -d '{"from":"XMR","to":"MYZ","amount":0.1,"userId":"testuser"}'
Rewards
bash

# Register animal (10 MYZ)
curl -X POST https://myzubsterapp.onrender.com/api/animals/register \
  -H "Content-Type: application/json" \
  -d '{"species":"Felis catus","place":"Park","userId":"testuser"}'

# Register plant (10 MYZ)
curl -X POST https://myzubsterapp.onrender.com/api/plants/register \
  -H "Content-Type: application/json" \
  -d '{"species":"Quercus ilex","place":"Forest","userId":"testuser"}'

Robot
bash

# Create robot
curl -X POST https://myzubsterapp.onrender.com/api/robot/create \
  -H "Content-Type: application/json" \
  -d '{"robotId":"my-bot","name":"MyBot","walletAddress":"wallet_my"}'

# Assign job
curl -X POST https://myzubsterapp.onrender.com/api/robot/assign \
  -H "Content-Type: application/json" \
  -d '{"robotId":"my-bot","jobId":"job-001","clientId":"client","amount":100,"currency":"MYZ"}'

# Complete job
curl -X POST https://myzubsterapp.onrender.com/api/robot/job/complete \
  -H "Content-Type: application/json" \
  -d '{"robotId":"my-bot","jobId":"job-001"}'

🛠️ Installation
bash

# Clone the repository
git clone https://github.com/MyZubster-Ecosystem/MyZubsterGateway.git
cd MyZubsterGateway

# Install dependencies
npm install

# Configure .env
cp .env.example .env
# Edit .env with your variables

# Start the server
node server.js

📊 Monitoring
bash

# Health check
curl https://myzubsterapp.onrender.com/api/health

# View all bounties
curl https://myzubsterapp.onrender.com/bounty

🤝 How to contribute

    Choose a bounty → myzubsterapp.onrender.com/bounty

    Comment "I claim this bounty" on the GitHub issue

    Open a PR within 7 days

    Receive payment in MYZ

📄 License

MIT © 2026 MyZubster
🔗 Useful links

    Bounty page: https://myzubsterapp.onrender.com/bounty

    GitHub: https://github.com/MyZubster-Ecosystem/MyZubsterGateway

    Issues: https://github.com/MyZubster-Ecosystem/MyZubsterGateway/issues

    Telegram: @Myzubster_bot

## 🌱 BOUNTY GREEN - Orti Urbani

| # | Bounty | Reward | Stato |
|---|--------|--------|-------|
| #742 | API Arduino per sensori pH/EC | 0.08 XMR (o 500 MYZ) | ✅ Assegnata |

### Cosa serve
- REST API per sensori pH, EC, temperatura
- Storage dati in MongoDB
- Integrazione con EVA brain
- Documentazione API

🔗 https://github.com/MyZubster-Ecosystem/MyZubsterGateway/issues/742

## 🌱 BOUNTY GREEN - Orti Urbani

| # | Bounty | Reward | Stato |
|---|--------|--------|-------|
| #742 | API Arduino per sensori pH/EC | 0.08 XMR (o 500 MYZ) | ✅ Assegnata |
| #743 | Mappa Orti Urbani | 0.06 XMR (o 400 MYZ) | 🆕 Disponibile |
| #744 | Dashboard Orti | 0.05 XMR (o 300 MYZ) | 🆕 Disponibile |
| #745 | Mercato Semi | 0.04 XMR (o 250 MYZ) | 🆕 Disponibile |

🔗 https://github.com/MyZubster-Ecosystem/MyZubsterGateway/issues?q=label%3Agreen
