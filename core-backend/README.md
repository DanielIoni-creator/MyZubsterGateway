# MyZubster 🛒🔒

**Self-hosted Monero payment gateway with subaddresses**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Monero](https://img.shields.io/badge/Monero-0.18.x-orange.svg)](https://www.getmonero.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![Docker Pulls](https://img.shields.io/docker/pulls/myzubster/myzubster.svg)](https://hub.docker.com/r/myzubster/myzubster)
[![Status](https://img.shields.io/badge/status-production-green.svg)]()

---

## 📦 Docker Hub

The official Docker image is available on Docker Hub:

```bash
docker pull myzubster/myzubster:latest

Run with Docker Compose:
bash

git clone https://github.com/DanielIoni-creator/MyZubsterAPP.git
cd MyZubsterAPP/backend
docker-compose up -d

📖 What is MyZubster?

MyZubster is a self-hosted Monero payment gateway that generates unique subaddresses for each order. It's designed to be integrated into e-commerce platforms, SaaS apps, or any web application that wants to accept Monero (XMR) payments without relying on third-party services.

Key features:

    ✅ Self-hosted — no third-party services, full control

    ✅ Unique subaddresses — each order gets its own Monero address

    ✅ Real-time exchange rate — XMR/USD via CoinGecko API

    ✅ Automatic payment monitoring — checks for incoming payments every 60 seconds

    ✅ REST API — simple integration with any frontend

    ✅ PostgreSQL persistence — orders survive server restarts

    ✅ Docker ready — one-command deployment

    ✅ Mainnet ready — tested and ready for production

    ✅ Open source — MIT license

🐳 Quick Start with Docker (Recommended)

The easiest way to run MyZubster is with Docker Compose.
Prerequisites

    Docker and Docker Compose installed

    Monero Wallet RPC running on your host (for testnet)

1️⃣ Start Monero Wallet RPC (on host)
bash

monero-wallet-rpc --wallet-file fee_wallet --password myzubster --rpc-bind-port 18083 --testnet --disable-rpc-login

2️⃣ Clone and start
bash

git clone https://github.com/DanielIoni-creator/MyZubsterAPP.git
cd MyZubsterAPP/backend

# Create .env from example
cp .env.example .env

# Start with Docker Compose
docker-compose up -d

3️⃣ The API is now available at
text

http://localhost:3000

4️⃣ Create a test order
bash

curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"amount":0.01,"currency":"USD","customerEmail":"test@example.com"}'

5️⃣ Check order status
bash

curl http://localhost:3000/api/orders/1

6️⃣ Stop the containers
bash

docker-compose down

🚀 Manual Setup (without Docker)
Prerequisites

    Node.js (v16+)

    PostgreSQL (v13+)

    Monero Wallet RPC

    npm or yarn

1️⃣ Clone the repository
bash

git clone https://github.com/DanielIoni-creator/MyZubsterAPP.git
cd MyZubsterAPP/backend

2️⃣ Install dependencies
bash

npm install

3️⃣ Configure environment variables

Create a .env file from the example:
bash

cp .env.example .env

Edit .env with your settings:
env

# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/myzubster

# Monero RPC
MONERO_RPC_URL=http://localhost:18083
MONERO_NETWORK=testnet
MONERO_MIN_CONFIRMATIONS=10
MONERO_WALLET_PASSWORD=your_password

# Security
JWT_SECRET=your_jwt_secret_key

4️⃣ Start the Monero Wallet RPC
bash

monero-wallet-rpc --wallet-file your_wallet --password your_password --rpc-bind-port 18083 --testnet --disable-rpc-login

5️⃣ Start the backend
bash

npm start

The server will start on http://localhost:3000
🔧 API Endpoints
Create an Order
http

POST /api/orders
Content-Type: application/json

{
  "amount": 0.01,
  "currency": "USD",
  "customerEmail": "customer@example.com"
}

Response:
json

{
  "id": 1,
  "amount": 0.01,
  "currency": "USD",
  "customerEmail": "customer@example.com",
  "moneroAddress": "B... (unique subaddress)",
  "moneroAmount": 0.00003005,
  "addressIndex": 1,
  "network": "testnet",
  "status": "pending",
  "createdAt": "2026-07-16T..."
}

Get All Orders
http

GET /api/orders

Get Order by ID
http

GET /api/orders/:id

Get Orders by Status
http

GET /api/orders/status/:status

Example: GET /api/orders/status/pending
Health Check
http

GET /api/health

Response:
json

{
  "status": "ok",
  "timestamp": "2026-07-16T...",
  "service": "MyZubster Backend",
  "version": "1.2.0",
  "database": "connected",
  "monero": {
    "rpc": "http://localhost:18083",
    "network": "testnet",
    "minConfirmations": 10
  },
  "stats": {
    "totalOrders": 5,
    "pendingOrders": 3,
    "completedOrders": 2
  }
}

📊 Payment Flow

    Customer places an order → Backend generates a unique Monero subaddress

    Customer sends Monero to the subaddress

    Payment Monitor (runs every 60 seconds) checks get_transfers for incoming payments

    Status updates to completed when payment reaches minimum confirmations (10 by default)

    Customer sees the updated status via the API

🔒 Mainnet Configuration

To use MyZubster on Monero mainnet:
1️⃣ Update your .env file:
env

MONERO_NETWORK=mainnet
MONERO_MIN_CONFIRMATIONS=10

2️⃣ Make sure your wallet has mainnet XMR
3️⃣ Start monero-wallet-rpc on mainnet:
bash

monero-wallet-rpc --wallet-file your_wallet --password your_password --rpc-bind-port 18083 --disable-rpc-login

4️⃣ Restart the backend:
bash

docker-compose restart backend

⚠️ Important Notes for Mainnet

    Minimum confirmations: Set MONERO_MIN_CONFIRMATIONS to at least 10 to prevent double-spending attacks

    Test with small amounts first: Test with 0.001 XMR before processing larger payments

    Monitor transactions: Check the logs regularly (docker-compose logs -f backend)

    Network switch: The backend will automatically detect the network from MONERO_NETWORK

🛠️ Tech Stack
Component	Technology
Backend	Node.js + Express
Database	PostgreSQL (via Sequelize ORM)
Wallet RPC	monero-wallet-rpc
Exchange Rate	CoinGecko API
Monitoring	node-cron (every 60 seconds)
Authentication	JWT (optional)
Containerization	Docker + Docker Compose
📁 Project Structure
text

backend/
├── app.js                 # Main application entry point
├── Dockerfile             # Docker image definition
├── docker-compose.yml     # Docker Compose configuration
├── .dockerignore          # Files excluded from Docker image
├── models/
│   └── index.js           # Sequelize models
├── services/
│   ├── exchangeRate.js    # XMR/USD exchange rate
│   └── paymentMonitor.js  # Payment monitoring (cron job)
└── .env.example           # Environment variables template

🧪 Testing with Testnet
1️⃣ Get testnet Monero from faucet

    https://cypherfaucet.com/xmr-testnet

    https://faucet.xmr.pt/

2️⃣ Create an order via API
bash

curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"amount":0.01,"currency":"USD","customerEmail":"test@example.com"}'

3️⃣ Send testnet XMR to the generated subaddress
bash

monero-wallet-cli --testnet --wallet-file fee_wallet
transfer <subaddress> <amount>

4️⃣ Wait 60 seconds for the monitor to detect the payment
5️⃣ Check order status
bash

curl http://localhost:3000/api/orders/1

🐳 Docker Commands
bash

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (delete data)
docker-compose down -v

🤝 Contributing

Contributions are welcome! Feel free to:

    🐛 Report bugs

    💡 Suggest features

    🔧 Submit pull requests

📄 License

This project is licensed under the MIT License — see the LICENSE file for details.
🌟 Support

If you find this project useful, please give it a ⭐ on GitHub!
🔗 Links

    GitHub: https://github.com/DanielIoni-creator/MyZubsterAPP

    Docker Hub: https://hub.docker.com/r/myzubster/myzubster

    Author: DanielIoni-creator

Built with ❤️ for the Monero community