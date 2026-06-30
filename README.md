# 🧩 MyZubster

**MyZubster** is an open-source Android app that connects neighbors to exchange skills and services — from plumbing and hairdressing to tutoring and tech support. With built-in Monero (XMR) payments, it’s designed for private, peer-to-peer transactions without intermediaries.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Android](https://img.shields.io/badge/Platform-Android-brightgreen)](https://developer.android.com/)
[![Kotlin](https://img.shields.io/badge/Kotlin-1.9-purple)](https://kotlinlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

---

## 🚀 What is MyZubster?

MyZubster is a hyperlocal skill-sharing platform. It lets people in the same neighborhood offer services, request help, chat, and pay using Monero — all in a privacy-first, self-hosted environment.

The goal is to empower communities to collaborate directly, bypassing centralized platforms and reducing costs.

---

## ✨ Key Features

- 🔐 **Monero Payments (XMR)** — Non-custodial, private, and secure. Users control their own keys.
- 🧑‍💼 **User Profiles** — Showcase skills you offer and list what you need.
- 💬 **Encrypted Chat** — Communicate safely with neighbors before confirming a transaction.
- 📍 **Location-Based Search** — Find services close to you.
- ⭐ **Reputation System** — Two-way reviews build trust in the community.
- 🛡️ **Recommended VPN Integration** — Works seamlessly with Mullvad VPN for extra privacy.
- ⛏️ **Optional Monero Mining** — Help secure the Monero network while your phone charges.
- 💰 **Transparent Fee** — A fair 2% platform fee keeps the project sustainable.

---

## 🏗️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Mobile** | Kotlin, Android SDK, Retrofit, ZXing |
| **Backend** | Node.js, Express, MongoDB |
| **Payments** | Monero Wallet RPC, MoneroPay |
| **Push Notifications** | Firebase Cloud Messaging |
| **AI (optional)** | Groq, Gemini (for skill descriptions) |

---

## 📱 Installation Guide

### Prerequisites
- Android Studio (latest)
- Node.js 16+
- MongoDB
Backend Setup
bash

cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, Monero RPC URL, and API keys.
npm start
- Monero wallet RPC (for testing)

### Clone the repository
```bash
git clone https://github.com/h4x0rmyzubster/myzubster.git
cd myzubster
Android App

    Open the project in Android Studio.

    Sync Gradle and build the APK.

    Install the APK on your device (or use an emulator).

🤝 How to Contribute

We welcome contributors of all experience levels!

    Fork the repository.

    Create a feature branch.

    Make your changes and test them.

    Submit a Pull Request with a clear description of your work.

See CONTRIBUTING.md for detailed guidelines.
🛡️ Security & Privacy

    Monero wallets remain non-custodial — private keys never leave the user’s device.

    Backend uses environment variables for sensitive data; never commit .env files.

    All communication between client and server is encrypted via HTTPS.

If you find a security issue, please contact the maintainer privately.
📄 License

This project is licensed under the Apache License 2.0. See the LICENSE file for details.
🙏 Acknowledgments

    Monero for privacy-first digital cash.

    Mullvad VPN for secure networking.

    All open-source libraries and contributors who make this project possible.

🚀 Ready to join the community?
Explore the code, report issues, or start contributing today!
