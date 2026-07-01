# 🧩 MyZubster

Skill exchange with neighbors, simple chat, and payments using Monero.

**App Version:** 0.2.0
**GitHub Release:** v1.0.0-beta
**Last Updated:** 2026-06-29

## What is MyZubster?

MyZubster is an open-source Android application designed for exchanging skills and services among local neighbors: repairs, lessons, practical help, digital support, and much more.

The app allows users to publish their skills, search for local services, chat with other users, and manage payments via Monero, keeping sensitive logic securely handled on the backend. The goal is to create a small, simple, and privacy-friendly local marketplace where people can help each other and receive compensation directly.

[⬇️ Download APK](link-to-download) | [🚀 v1.0.0-beta Release Page](link-to-release)

*If you are reading an older version of the README and the APK asset has not yet been published, please treat the badge as a placeholder for the GitHub release.*

## ✨ Key Features

🔐 **Authentication & User Profile** — Basic user accounts, device token registration, and profiles containing name/nickname, area, bio, skills, and optional Monero wallet.
🛠️ **Local Skills & Services** — Publish, search, and view skills offered by people in your vicinity, with prices listed in Euros.
📄 **Service Detail View** — A dedicated skill page with a description, price, seller information, and associated actions.
💬 **Integrated Chat** — Conversation functionality between client and seller, with the ability to request payment directly from the chat flow.
🪙 **Monero Payments** — Server-side checkout using one-shot addresses (QR/URI), confirmation tracking, and configurable platform commissions.
⭐ **Reviews & Reputation** — Ratings and reviews associated with users and services.
🔔 **Push Notifications** — Support for Firebase Cloud Messaging for messages and payment confirmations when configured.
🛡️ **Privacy-First Design** — Wallets, credentials, and keys remain strictly server-side; the APK should never contain sensitive secrets.
📣 **Sponsor Banners** — Pre-set spaces reserved for partners like Mullvad VPN and SimpleSwap.io.

## ⚙️ Technology Stack

*   **Kotlin / Android:** Native mobile app development.
*   **Android Studio / Gradle:** Development and APK build tooling.
*   **Node.js / Express:** RESTful backend framework.
*   **MongoDB / Mongoose:** Data persistence for users, messages, reviews, and transactions.
*   **Monero / monero-wallet-rpc / MoneroPay:** Privacy-friendly payments managed server-side.
*   **Firebase Cloud Messaging (FCM):** Push notification handling.
*   **Retrofit / OkHttp:** HTTP communication from the Android app.
*   **ZXing:** QR code support for payments.

## 🖼️ Screenshots / Demo

*Placeholder for future images.*

Home / Search Profile Monero Payment Screenshot Coming Soon Screenshot Coming Soon

*(Suggested paths: docs/screenshots/home.png, docs/screenshots/profile.png, docs/screenshots/payment.png)*

## 🚀 Installation and Setup

### 1. Clone the Repository
```bash
git clone https://github.com/h4x0rmyzubster/MyZubsterh4x0r.git
cd MyZubsterh4x0r
