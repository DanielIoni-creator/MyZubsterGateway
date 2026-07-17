<<<<<<< HEAD
# MyZubster Marketplace 🛒

**Skills Marketplace built on MyZubster (Monero payment gateway)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Monero](https://img.shields.io/badge/Monero-0.18.x-orange.svg)](https://www.getmonero.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![Status](https://img.shields.io/badge/status-demo-orange.svg)]()

---

## 📖 What is this?

This is a **demonstration fork** of [MyZubster](https://github.com/DanielIoni-creator/MyZubsterAPP), configured as a **skills marketplace**. It shows how to integrate MyZubster as a payment gateway into a real-world application.

**🔗 Core repository:** [DanielIoni-creator/MyZubsterAPP](https://github.com/DanielIoni-creator/MyZubsterAPP)

---

## 🧩 Architecture
MyZubster-Marketplace (Fork)
├── core-backend/ # MyZubster (payment gateway module)
│ ├── app.js
│ ├── models/
│ ├── routes/
│ └── services/
│
├── models/ # Marketplace models (User, Skill, ServiceOrder)
├── routes/ # Marketplace API routes
├── middleware/ # JWT authentication
├── server.js # Entry point
├── package.json
├── .env.example
└── README.md
text


The **core-backend** folder contains the original MyZubster code, which acts as a payment gateway. The marketplace code lives in the root folder and communicates with the core via its REST API.
=======
# MyZubster 🛒🔒

**Self-hosted Monero Payment Gateway + Open Source Skills Marketplace**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Monero](https://img.shields.io/badge/Monero-0.18.x-orange.svg)](https://www.getmonero.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![Status](https://img.shields.io/badge/status-production-green.svg)]()

---

## 🎯 What is MyZubster?

MyZubster is a **self-hosted Monero payment gateway** designed to be modular, extensible, and easily integrable into any application.

The architecture consists of three layers:
┌─────────────────────────────────────────────────────────────────┐
│ MYZUBSTER ECOSYSTEM │
├─────────────────────────────────────────────────────────────────┤
│ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏦 MYZUBSTER CORE │ │
│ │ Self-hosted Monero Payment Gateway │ │
│ │ - Subaddress generation │ │
│ │ - Transaction monitoring │ │
│ │ - Real-time exchange rates │ │
│ │ - JWT Authentication │ │
│ │ - PostgreSQL persistence │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ▲ │
│ │ │
│ ┌───────────────────────────┴───────────────────────────┐ │
│ │ 📱 NEIGHBORHOOD SKILLS APP │ │
│ │ Local skills marketplace │ │
│ │ - User registration │ │
│ │ - Skill listing │ │
│ │ - Monero payments │ │
│ │ - Seller dashboard │ │
│ └─────────────────────────────────────────────────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────┘
text


---

## 📖 Open Source Projects

### 1️⃣ MyZubster (Core Gateway)

**Repository:** [DanielIoni-creator/MyZubsterAPP](https://github.com/DanielIoni-creator/MyZubsterAPP)

The heart of the system. A self-hosted Monero payment gateway that:
- Generates **unique subaddresses** for each transaction
- Automatically monitors payments (cron job every 60 seconds)
- Calculates **real-time XMR/USD exchange rates**
- Offers **REST API with JWT authentication**
- Persists data to **PostgreSQL**
- Is **Dockerized** for easy deployment

**Use MyZubster if you:**
- Want to accept Monero payments
- Have an e-commerce, SaaS, or any app that needs payments
- Want a self-hosted system with no third-party dependencies

---

### 2️⃣ MyZubster-Marketplace (Example App)

**Repository:** [DanielIoni-creator/MyZubster-Marketplace](https://github.com/DanielIoni-creator/MyZubster-Marketplace)

A **demonstration fork** showing how to integrate MyZubster into a real-world application: a **skills marketplace** (inspired by a "neighborhood skills" system).

**Features:**
- 👤 **Users** (registration, login, JWT)
- 🛠️ **Skills** (publishing, search, filters)
- 💰 **Monero payments** via MyZubster
- 📦 **Orders** with status tracking
- 🔍 **Real-time payment verification**
- 👨‍💼 **Seller dashboard** (profile, skills, earnings)

**This fork is ideal for:**
- Understanding how to integrate MyZubster into an app
- Using as a template for your own project
- Contributing to marketplace development

---

## 🌍 The "Neighborhood Skills" Project

This project was born with the goal of creating a **local skills ecosystem** where people can:

- **Offer** their skills (repairs, lessons, consulting, manual work)
- **Purchase** skills from other community members
- **Pay in Monero** privately and decentralized
- **Build** a network of trust and local collaboration

The "Neighborhood Skills" app is the primary use case demonstrating how Monero technology and MyZubster's modular architecture can support local economies.
>>>>>>> upstream/main

---

## 🚀 Quick Start

<<<<<<< HEAD
### Prerequisites
- Docker (for PostgreSQL and MyZubster core)
- Node.js (v16+)
- PostgreSQL (or use the Docker container)

### 1️⃣ Start MyZubster Core (Payment Gateway)

```bash
cd core-backend
docker-compose up -d

This starts:

    PostgreSQL on port 5432

    MyZubster API on port 3000

2️⃣ Configure Environment
bash

cp .env.example .env

Edit .env with your values:
env

# Server
PORT=4000
NODE_ENV=development

# Database (use the same PostgreSQL as core or a separate one)
DATABASE_URL=postgresql://postgres:password@localhost:5432/marketplace

# JWT
JWT_SECRET=your_secret_key_here

# MyZubster Core API (used for payments)
MYZUBSTER_API_URL=http://localhost:3000
MYZUBSTER_API_TOKEN=your_jwt_token_from_core

3️⃣ Get a JWT Token from MyZubster Core
bash

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@myzubster.com","password":"admin123"}'

Copy the token from the response and paste it as MYZUBSTER_API_TOKEN in your .env.
4️⃣ Start the Marketplace
bash

npm install
npm start

The marketplace API will be available at http://localhost:4000.
📋 API Endpoints
Method	Endpoint	Description	Auth
POST	/api/users/register	Register a new user	❌
POST	/api/users/login	Login & get JWT token	❌
POST	/api/users/become-seller	Become a seller	✅ JWT
POST	/api/skills	Publish a skill	✅ JWT (seller only)
GET	/api/skills	List all skills	❌
GET	/api/skills/:id	Get skill details	❌
POST	/api/orders	Purchase a skill (creates payment)	✅ JWT
GET	/api/orders/my-orders	List user's orders	✅ JWT
GET	/api/orders/:id/payment-status	Check payment status	✅ JWT
GET	/api/health	Health check	❌
🔄 Payment Flow

    Buyer creates an order → Marketplace calls MyZubster API

    MyZubster generates a Monero subaddress and returns it

    Buyer sends Monero to the subaddress

    MyZubster monitors the payment (cron job every 60s)

    Marketplace checks payment status via API

    Order status updates to paid when confirmed

🧪 Testing
Create a seller
bash

# 1. Register a user
curl -X POST http://localhost:4000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@example.com","password":"123","username":"seller","fullName":"Seller"}'

# 2. Login
curl -X POST http://localhost:4000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@example.com","password":"123"}'

# 3. Become a seller
curl -X POST http://localhost:4000/api/users/become-seller \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"moneroAddress":"your_xmr_address"}'

Publish a skill
bash

curl -X POST http://localhost:4000/api/skills \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Web Development","description":"Full stack web development","category":"programming","price":100}'

Purchase a skill (as a buyer)
bash

# 1. Register a buyer
curl -X POST http://localhost:4000/api/users/register \
  -d '{"email":"buyer@example.com","password":"123","username":"buyer","fullName":"Buyer"}'

# 2. Login as buyer
curl -X POST http://localhost:4000/api/users/login \
  -d '{"email":"buyer@example.com","password":"123"}'

# 3. Create order (replace skillId with actual ID)
curl -X POST http://localhost:4000/api/orders \
  -H "Authorization: Bearer <buyer_token>" \
  -H "Content-Type: application/json" \
  -d '{"skillId":1,"requirements":"I need a website"}'

🔧 Customization

This fork is meant to be customized. Here are common modifications:
Modification	File(s)
Add new skill categories	models/Skill.js
Change order status flow	routes/orders.js
Add reviews	Create models/Review.js & routes/reviews.js
Add notifications	services/email.js or webhooks
Change currency	.env → CURRENCY=USD
🔄 Keeping Upstream Updates

To sync with the original MyZubster core:
bash

# Add the original repository as upstream (if not already)
git remote add upstream https://github.com/DanielIoni-creator/MyZubsterAPP.git

# Fetch and merge changes
git fetch upstream
git merge upstream/main

📄 License

This fork inherits the licenses from MyZubster:

    MIT for the core and marketplace code

    GPLv3 for the full-stack application

See the LICENSE files in the root directory.
🤝 Contributing

Contributions are welcome! Feel free to:

    Fork this repository

    Create a branch for your feature

    Submit a pull request

🔗 Links

    MyZubster Core: https://github.com/DanielIoni-creator/MyZubsterAPP

    This Fork: https://github.com/DanielIoni-creator/MyZubster-Marketplace

    Docker Hub: https://hub.docker.com/r/myzubster/myzubster

Built with ❤️ for the Monero community and local economies 🏘️
=======
### 1️⃣ Start MyZubster (Payment Gateway)

```bash
git clone https://github.com/DanielIoni-creator/MyZubsterAPP.git
cd MyZubsterAPP/backend
docker-compose up -d

2️⃣ Start the Marketplace (Fork)
bash

git clone https://github.com/DanielIoni-creator/MyZubster-Marketplace.git
cd MyZubster-Marketplace
npm install
npm start

3️⃣ Configure the Marketplace

Create a .env file:
bash

cp .env.example .env

Edit with your values:
env

DATABASE_URL=postgresql://postgres:password@localhost:5432/marketplace
MYZUBSTER_API_URL=http://localhost:3000
MYZUBSTER_API_TOKEN=your_jwt_token

📋 Repository Structure
text

MyZubster (Monorepo)
├── backend/                    # MyZubster Core (payment gateway)
│   ├── app.js
│   ├── models/
│   ├── routes/
│   └── services/
│
├── marketplace/                # Example app (fork)
│   ├── server.js
│   ├── models/ (User, Skill, ServiceOrder)
│   ├── routes/ (users, skills, orders)
│   └── middleware/ (JWT auth)
│
├── web-dashboard/              # Admin dashboard
├── mobile/                     # Android app (React Native)
└── docs/                       # Documentation

🔧 Customization
How to adapt the marketplace to your needs
Modification	Location
Add new skill categories	models/Skill.js
Modify order flow	routes/orders.js
Add reviews	Create models/Review.js and routes/reviews.js
Change default currency	.env → CURRENCY=USD
Add email notifications	services/email.js
🤝 Contributing

Contributions are welcome! Here's how you can help:

    Fork the repository

    Create a branch for your feature (git checkout -b feature/amazing-feature)

    Commit your changes (git commit -m 'Add amazing feature')

    Push to the branch (git push origin feature/amazing-feature)

    Open a Pull Request

📄 Licenses

This project uses a dual licensing model:

    MIT License for the core gateway and marketplace (maximum integration freedom)

    GNU GPLv3 for the Android app and full-stack application (protecting software freedom)

See LICENSE-MIT and LICENSE-GPLv3 for details.
🌟 Support

If you find this project useful, please give it a ⭐ on GitHub!
🔗 Useful Links
Resource	Link
MyZubster (Core)	https://github.com/DanielIoni-creator/MyZubsterAPP
MyZubster-Marketplace	https://github.com/DanielIoni-creator/MyZubster-Marketplace
Docker Hub	https://hub.docker.com/r/myzubster/myzubster
Author	DanielIoni-creator

Built with ❤️ for the Monero community and local neighborhood economies 🏘️
>>>>>>> upstream/main
