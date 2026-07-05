## 🤝 Contributing

We welcome contributions! 

- 🟣 [**Good First Issues**](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/labels/good%20first%20issue) - Perfect for newcomers
- 🟢 [**Help Wanted**](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/labels/help%20wanted) - Need extra help

Check our [Contributing Guide](CONTRIBUTING.md) to get started!

[![Good First Issues](https://img.shields.io/github/issues/h4x0rmyzubster/MyZubsterh4x0r/good%20first%20issue.svg)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/labels/good%20first%20issue)
[![Help Wanted](https://img.shields.io/github/issues/h4x0rmyzubster/MyZubsterh4x0r/help%20wanted.svg)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/labels/help%20wanted)

# 🧩 MyZubster: Privacy-First Skill Exchange

**MyZubster** is an open-source Android app that connects neighbors to exchange skills and services — from plumbing and hairdressing to tutoring and tech support. With built-in Monero (XMR) payments, optional escrow, and a complete booking system, it’s designed for private, secure, peer-to-peer transactions without intermediaries.

[![License](https://img.shields.io/badge/License-MIT%20%7C%20GPLv3-blue?style=flat)](LICENSE)
[![Android](https://img.shields.io/badge/Platform-Android-brightgreen)](https://developer.android.com/)
[![Kotlin](https://img.shields.io/badge/Kotlin-1.9-purple)](https://kotlinlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/actions)
[![Open Source](h
## 🏷️ Badges

[![GitHub stars](https://img.shields.io/github/stars/h4x0rmyzubster/MyZubsterh4x0r.svg?style=social)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/h4x0rmyzubster/MyZubsterh4x0r.svg?style=social)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/network/members)
[![GitHub issues](https://img.shields.io/github/issues/h4x0rmyzubster/MyZubsterh4x0r.svg)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/h4x0rmyzubster/MyZubsterh4x0r.svg)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/pulls)
[![License](https://img.shields.io/github/license/h4x0rmyzubster/MyZubsterh4x0r.svg)](LICENSE)
[![Contributors](https://img.shields.io/github/contributors/h4x0rmyzubster/MyZubsterh4x0r.svg)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/graphs/contributors)
[![GitHub last commit](https://img.shields.io/github/last-commit/h4x0rmyzubster/MyZubsterh4x0r.svg)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/commits/main)

## 🚀 What is MyZubster?

MyZubster is a hyperlocal skill-sharing platform. It lets people in the same neighborhood offer services, request help, chat, book appointments, send quotes, and pay using Monero — all in a privacy-first, self-hosted environment.

The goal is to empower communities to collaborate directly, bypassing centralized platforms and reducing costs.

---

## ✨ Key Features

### Core Features
- 🔐 **Monero Payments (XMR)** — Non-custodial, private, and secure. Users control their own keys.
- 🧑‍💼 **User Profiles** — Showcase skills you offer and list what you need.
- 💬 **Encrypted Chat** — Communicate safely with neighbors before confirming a transaction.
- 📍 **Location-Based Search** — Find services close to you.
- ⭐ **Reputation System** — Two-way reviews build trust in the community.
- 💰 **Transparent Fee** — A fair 2% platform fee keeps the project sustainable.
- 🛡️ **Recommended VPN Integration** — Works seamlessly with Mullvad VPN for extra privacy.

### Advanced Features (Implemented)
- 📅 **Booking System** — Schedule appointments with calendar and time slot selection.
- 📝 **Quotes & Estimates** — Professionals can send quotes; clients can accept or reject them.
- 📋 **Complete Work History** — Track all completed jobs with detailed information.
- 🛡️ **Optional Escrow** — Funds are locked until work is confirmed, increasing trust.
- 🔔 **Real-time Notifications** — Push notifications for messages, quotes, and payment confirmations.
- 🛠️ **Admin Panel** — Moderation tools for reports, users, skills, and activity logs with role-based access (Admin/Moderator).
- ✅ **Automated Testing** — Unit tests for Kotlin (Android), API tests for Node.js backend, Monero integration tests, and CI/CD with GitHub Actions.
- 🌍 **Internationalization** — Full English UI and documentation, with support for additional languages.
- 🔄 **Dual Licensing** — MIT and GPLv3 licenses for maximum flexibility.

---

## 🏗️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Mobile** | Kotlin, Android SDK, Retrofit, ZXing, Material Design |
| **Backend** | Node.js, Express, MongoDB, JWT, bcrypt |
| **Payments** | Monero Wallet RPC, MoneroPay |
| **Escrow** | Custom escrow service with Monero multisig support |
| **Bookings** | Calendar-based scheduling with time slots |
| **Quotes** | Professional-client estimate system |
| **Push Notifications** | UnifiedPush (ntfy.sh) / Firebase FCM (optional) |
| **AI (optional)** | Groq, Gemini (for skill descriptions) |
| **Testing** | JUnit (Android), Jest (Backend), MongoDB Memory Server |
| **CI/CD** | GitHub Actions (tests & build at every commit) |
| **Admin Panel** | React + Material-UI (optional) |

---

## 📱 Installation Guide

### Prerequisites
- Android Studio (latest)
- Node.js 16+
- MongoDB
- Monero wallet RPC (for testing payments)

### Clone the repository
```bash
git clone https://github.com/h4x0rmyzubster/MyZubsterh4x0r.git
cd MyZubsterh4x0r
Backend Setup
bash

cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, Monero RPC URL, and API keys.
npm start
# The backend will run on http://localhost:3001
Android App

    Open the project in Android Studio.

    Sync Gradle and build the APK.

    Install the APK on your device (or use an emulator).

Run Tests
bash

# Backend tests
cd backend
npm run test

# Android tests (in Android Studio or terminal)
cd MyZubster
./gradlew test

# Run all tests with GitHub Actions (automated on every push)

📅 Booking System

MyZubster includes a complete booking system:
Feature	Description
Calendar View	Select available dates for services
Time Slots	Choose from predefined time slots (09:00-18:00)
Booking Status	Track status: pending, confirmed, in_progress, completed, cancelled
Automatic Scheduling	Prevent double bookings with conflict detection

Flow:

    Client selects a service and views available slots.

    Client chooses a date and time.

    Booking is created with status 'pending'.

    Professional receives notification and can confirm.

📝 Quotes & Estimates System

MyZubster allows professionals to send quotes to clients:
Feature	Description
Send Quote	Professionals can send an amount and description for a service
Accept/Reject	Clients can accept or reject quotes
Automatic Booking Update	Accepted quotes automatically confirm the booking
Quote History	Track all sent and received quotes

Flow:

    Professional sends a quote with amount and description.

    Client receives notification and reviews the quote.

    Client accepts or rejects the quote.

    Booking status updates accordingly.

📋 Work History

MyZubster tracks all completed jobs:
Feature	Description
Complete History	View all completed jobs
Infinite Scroll	Load more history as you scroll
Job Details	See service title, category, professional, amount, and date
Filtering	Filter by category (coming soon)
🛡️ Escrow System

MyZubster includes an optional escrow system for secure transactions:
Status	Description
Pending	Escrow request created, waiting for funding
Funded	Funds locked in escrow, work in progress
Completed	Work completed, waiting for client confirmation
Released	Funds released to the professional
Disputed	Dispute opened, waiting for resolution

Flow:

    Client accepts the quote.

    Funds are locked in escrow.

    Professional completes the work.

    Client confirms completion.

    Funds are released (minus 2% platform fee).

🛠️ Admin Panel

MyZubster includes a complete admin panel for community management:
Feature	Description	Role
Reports	View and manage user reports	Moderator
Users	List, filter, suspend/activate users	Admin
Skills	Approve or reject skill listings	Moderator
Stats	Dashboard with platform statistics	Moderator
Logs	Audit trail of all moderation actions	Admin
🧪 Testing

MyZubster uses a comprehensive testing strategy:
Test Type	Tool	Coverage
Android Unit Tests	JUnit, Mockito	Models, ViewModels, Utils
Backend API Tests	Jest, Supertest	Authentication, Users, Skills, Reviews
Monero Integration Tests	Jest, Supertest	Payment creation, status checks, webhooks
Escrow Tests	Jest, Supertest	Escrow creation, funding, release, disputes
Booking Tests	Jest, Supertest	Booking creation, conflict detection, status updates
Quote Tests	Jest, Supertest	Quote creation, acceptance, rejection
CI/CD	GitHub Actions	Auto-run on every push and PR
🤝 How to Contribute

We welcome contributors of all experience levels!

    Fork the repository.

    Create a feature branch.

    Make your changes and test them.

    Submit a Pull Request with a clear description of your work.

See CONTRIBUTING.md for detailed guidelines.
🛡️ Security & Privacy

    Monero wallets remain non-custodial — private keys never leave the user's device.

    Backend uses environment variables for sensitive data; never commit .env files.

    All communication between client and server is encrypted via HTTPS.

    Push notifications support UnifiedPush (self-hosted ntfy.sh) as an alternative to Firebase.

    Admin Panel uses role-based access control (Admin/Moderator).

    Escrow uses Monero multisig for secure fund locking.

If you find a security issue, please contact the maintainer privately.
📄 License

This project is licensed under either the MIT License or the GNU General Public License v3.0, at your option.

SPDX-License-Identifier: MIT OR GPL-3.0-or-later
🙏 Acknowledgments

    Monero for privacy-first digital cash.

    Mullvad VPN for secure networking.

    UnifiedPush for decentralized push notifications.

    OpenClaw for AI assistance.

    All open-source libraries and contributors who make this project possible.

🚀 Ready to join the community?
Explore the code, report issues, or start contributing today!
text


---

## ✅ Salva e carica su GitHub

```powershell
git add README.md
git commit -m "Aggiornato README in inglese con tutti i nuovi sviluppi: prenotazioni, preventivi, storico lavori, escrow"
git push origin main