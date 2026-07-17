# 🌐 MyZubster – Self-Hosted Monero Payment Gateway & Offshore Ecosystem

**MyZubster** is a complete, self‑hosted ecosystem for accepting Monero (XMR) payments, running a skills marketplace, and managing orders – all without relying on third‑party processors. It’s designed to give you full control over your funds, your data, and your business.

---

## 🎯 What Makes MyZubster Unique?

- 🔒 **Truly Self‑Hosted** – You own the infrastructure. No monthly fees, no middlemen.
- 🌊 **Offshore‑Ready Payment Gateway** – Accept Monero from anywhere, settle instantly, and keep full privacy.
- 🧩 **Modular Architecture** – Core Gateway, Marketplace, and Mobile App work together or independently.
- 💰 **Built‑In Commission System** – Earn from every transaction (set your own fee).
- 📱 **Mobile‑First** – Android app included for buyers and sellers.
- 🔓 **100% Open Source** – Audit, fork, and customise to your needs.

---

## 🔥 How the Offshore Monero Payment Gateway Works

The core of MyZubster is the **offshore payment gateway** – a set of services that turn Monero into a seamless payment method for your marketplace.

### 1️⃣ Unique Subaddresses per Order

Every order receives its own Monero subaddress. This means:

- ✅ **Privacy** – Customers send to a unique address, not your main wallet.
- ✅ **Tracking** – You know exactly which order a payment belongs to.
- ✅ **Compliance** – No need to expose your wallet balance or transaction history.

```javascript
// Example: Subaddress generation via RPC
async function generateSubaddress(label) {
  const response = await fetch(`${MONERO_RPC_URL}/json_rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '0',
      method: 'create_address',
      params: { account_index: 0, label }
    })
  });
  return (await response.json()).result.address;
}
2️⃣ Automatic Payment Monitoring

The gateway scans for incoming payments every 60 seconds using Monero RPC's get_bulk_payments. No manual checks, no polling from your frontend – it just works.

    📡 Always‑On Monitoring – Runs in the background via PM2.

    ⚡ Near‑Real‑Time – Orders update within seconds of confirmation.

    🔐 Confirmation Threshold – You define the minimum confirmations (e.g., 10 for mainnet).

3️⃣ Webhook-Based Order Updates

When a payment is confirmed, the gateway instantly notifies your marketplace via a webhook. This eliminates the need for constant polling and keeps your system responsive.
javascript

// Webhook payload sent to marketplace
{
  orderId: 123,
  status: 'completed',
  txHash: 'abcdef...',
  confirmations: 10,
  amountReceived: 0.00614
}

4️⃣ Exchange Rate Integration

The gateway automatically converts USD amounts to XMR using real‑time exchange rates (configurable). Customers see the exact amount to pay in Monero.
🧩 Ecosystem Components
Component	Description	Tech Stack
Core Gateway (MyZubsterAPP)	Handles RPC, subaddresses, monitoring, webhooks	Node.js, Express, Sequelize
Marketplace (MyZubster-Marketplace)	Skills, users, orders, commissions, admin	Node.js, Express, JWT
Mobile App (MyZubster-App)	Android client for buyers and sellers	React Native, Expo
🚀 Getting Started
Prerequisites

    A VPS (DigitalOcean, Hetzner, Contabo) or local server

    Monero Wallet RPC (testnet or mainnet)

    Node.js 18+, PostgreSQL (or SQLite for development)

Quick Install (All Components)
bash

# Clone the entire ecosystem (or each repo separately)
git clone https://github.com/DanielIoni-creator/MyZubster.git
cd MyZubster

# Install and start the Core Gateway
cd MyZubsterAPP/backend
npm install
cp .env.example .env
node app.js

# In a separate terminal, start the Marketplace
cd ../MyZubster-Marketplace
npm install
cp .env.example .env
node server.js

Configuration Files

Each component has its own .env file. Key variables:

Core Gateway (.env)
env

MONERO_RPC_URL=http://localhost:18083
MONERO_NETWORK=testnet          # or mainnet
MONERO_MIN_CONFIRMATIONS=10
JWT_SECRET=your_jwt_secret
WEBHOOK_URL=http://localhost:4000/api/webhook/order-update
WEBHOOK_SECRET=your_webhook_secret

Marketplace (.env)
env

PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/marketplace
JWT_SECRET=your_marketplace_secret
MYZUBSTER_API_URL=http://localhost:3000/api
MYZUBSTER_API_TOKEN=your_admin_token
WEBHOOK_SECRET=your_webhook_secret

🏗️ Architecture Overview
text

                     ┌─────────────────────────────┐
                     │    Monero Wallet RPC         │
                     │   (testnet/mainnet)          │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │        CORE GATEWAY          │
                     │  - Subaddress Generation     │
                     │  - Payment Monitoring (60s)  │
                     │  - Webhook Sender            │
                     │  - JWT Auth                  │
                     └──────────────┬──────────────┘
                                    │
                                    │   Webhook
                                    ▼
                     ┌─────────────────────────────┐
                     │      MARKETPLACE             │
                     │  - Users / Skills / Orders   │
                     │  - JWT Auth                  │
                     │  - Commission System         │
                     │  - Webhook Receiver          │
                     └──────────────┬──────────────┘
                                    │
                                    │   REST API
                                    ▼
                     ┌─────────────────────────────┐
                     │     MOBILE APP (Android)     │
                     │  - Browse & Buy Skills      │
                     │  - Order Dashboard           │
                     └─────────────────────────────┘

💰 Offshore Payment Flow (Step‑by‑Step)

    Buyer creates an order – The Marketplace requests a subaddress from the Core Gateway.

    Gateway generates a unique subaddress – Returns it to the Marketplace.

    Buyer sends Monero to that subaddress using any Monero wallet.

    Gateway monitors – Every 60 seconds, it checks for incoming transactions.

    Payment detected – The gateway verifies the amount and confirmations.

    Order confirmed – The gateway sends a webhook to the Marketplace.

    Marketplace updates order status – The buyer sees "completed" instantly.

    Funds are available – The seller can withdraw or use them as they wish.

🔐 Security & Privacy

    No Centralised Data – All data stays on your server.

    Encrypted Communication – Webhooks use shared secrets; all traffic can be HTTPS.

    Role‑Based Access – Fine‑grained permissions (user, seller, admin).

    Transaction Privacy – Monero's inherent privacy protects both buyers and sellers.

🛠️ Customisation

    Set Your Own Commission – Modify COMMISSION_PERCENTAGE in the Marketplace .env.

    Change Confirmations – Adjust MONERO_MIN_CONFIRMATIONS in the Core Gateway .env.

    Rebrand – The entire UI (mobile and frontend) is open source – you can change logos, colours, and copy.

    Add New Features – The modular architecture makes it easy to extend.

🤝 Contributing

We welcome contributions! Whether it's bug fixes, new features, or documentation improvements:

    Fork the relevant repository.

    Create a feature branch.

    Submit a pull request.

📄 License

MIT License – Use it, modify it, sell it, or build your own business on top of it.
👨‍💻 About the Author

Daniel Ioni – Full‑Stack Developer & Open Source Advocate

I'm a developer who believes in financial freedom and self‑hosted solutions. I built MyZubster to give everyone the ability to accept Monero without relying on centralised processors.

    🌐 Based in Europe

    💻 Node.js, React, React Native, Android

    🔒 Privacy‑first mindset

Connect with me: GitHub
🌟 Support the Project

    ⭐ Star the repositories.

    🐛 Report issues.

    📝 Write tutorials or blog posts.

    🧑‍💻 Contribute code.

MyZubster – Your gateway to borderless, private, and self‑hosted payments.

Built with ❤️ for the Monero community.