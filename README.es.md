

\---



\### 📝 `README.es.md` e `README.fr.md`



(Struttura identica, tradotti in spagnolo e francese – disponibili su richiesta)



\---



\## 📁 2. REPOSITORY: `MyZubsterGateway` (`gateway/`)



\### 📝 `README.md` (Technical – Gateway)



```markdown

\# 🔒 MyZubster – Core Monero Gateway



Self-hosted Monero payment gateway with unique subaddress generation, automatic payment monitoring, and webhook integration.



\---



\## 🎯 Overview



MyZubster Gateway is the heart of the MyZubster ecosystem. It handles all Monero interactions, including:



\- \*\*Subaddress Generation\*\* – Unique addresses per order for privacy and tracking

\- \*\*Payment Monitoring\*\* – Automatic scanning of pending orders every 60 seconds

\- \*\*Webhook Notifications\*\* – Real-time updates to your marketplace

\- \*\*JWT Authentication\*\* – Secure API access



\---



\## 🔧 How the Gateway Works



\### 1. Subaddress Generation



When your application needs a new payment address for an order, it calls the gateway. The gateway communicates with the Monero wallet RPC to generate a \*\*unique subaddress\*\* for that specific order.



```javascript

async function generateSubaddress(label) {

&#x20; const response = await fetch(`${MONERO\_RPC\_URL}/json\_rpc`, {

&#x20;   method: 'POST',

&#x20;   headers: { 'Content-Type': 'application/json' },

&#x20;   body: JSON.stringify({

&#x20;     jsonrpc: '2.0',

&#x20;     id: '0',

&#x20;     method: 'create\_address',

&#x20;     params: { account\_index: 0, label: label }

&#x20;   })

&#x20; });

&#x20; const data = await response.json();

&#x20; return data.result.address;

}

2\. Payment Monitoring



The gateway continuously monitors the blockchain for incoming payments using Monero RPC's get\_bulk\_payments method. This is done at a set interval (default: 60 seconds).

3\. Webhook Notifications



When a payment is confirmed (with the required number of confirmations), the gateway sends a webhook to your application.



Example Webhook Payload:

json



{

&#x20; "orderId": 123,

&#x20; "status": "completed",

&#x20; "txHash": "abcdef...",

&#x20; "confirmations": 10,

&#x20; "amountReceived": 0.00614

}

4\. JWT Authentication



All API endpoints are secured with JWT (JSON Web Tokens).

📡 API Endpoints

Method	Endpoint	Description

POST	/api/auth/login	Login \& get JWT token

POST	/api/orders	Create order (generates subaddress)

GET	/api/orders	List all orders

GET	/api/orders/:id	Get order details

GET	/api/health	Health check

🚀 Quick Start

Prerequisites



&#x20;   Node.js 18+



&#x20;   Monero Wallet RPC (testnet or mainnet)



&#x20;   PostgreSQL or SQLite

nstallation

bash



git clone https://github.com/DanielIoni-creator/MyZubsterGateway.git

cd MyZubsterGateway

npm install

cp .env.example .env

\# Edit .env with your configuration

node app.js

Environment Variables

env



PORT=3000

NODE\_ENV=production

MONERO\_RPC\_URL=http://localhost:18083

MONERO\_NETWORK=testnet

MONERO\_MIN\_CONFIRMATIONS=10

JWT\_SECRET=your\_jwt\_secret

WEBHOOK\_URL=http://your-app.com/api/webhook/order-update

WEBHOOK\_SECRET=your\_webhook\_secret

📁 Project Structure

text



MyZubsterGateway/

├── app.js                 # Entry point

├── models/               # Database models

│   └── Order.js

├── services/             # Business logic

│   ├── exchangeRate.js   # USD → XMR conversion

│   └── paymentMonitor.js # RPC monitoring \& webhooks

├── routes/               # API routes

│   ├── auth.js

│   └── orders.js

└── middleware/           # JWT authentication

&#x20;   └── auth.js

📄 License



MIT License

🔗 Related Projects




&#x20;   MyZubster-Marketplace – Marketplace Backend



&#x20;   MyZubster-App – Android Mobile App


Built with ❤️ for the Monero community.
Follow the development of MyZubster and connect with me on social media:

- 📖 **Blog & Articles**: [DEV.to - Daniel Ioni](https://dev.to/danielioni)
- 🐦 **X (Twitter)**: [@myzubster](https://x.com/myzubster)
- 💼 **LinkedIn**: [Daniel Ioni](https://www.linkedin.com/in/daniel-ioni-62b2b9423/)
- 🐙 **GitHub**: [DanielIoni-creator](https://github.com/DanielIoni-creator)
- 🎵 **TikTok**: [@h4x0r_23](https://www.tiktok.com/@h4x0r_23)

**Stay updated on the journey!** 🚀



