# Monero Wallet Setup Guide

> **Goal:** Set up a Monero (XMR) wallet so you can receive bounty payouts from MyZubster.
>
> 📌 **Screenshots in this guide are illustrative representations** of the wallet interfaces (Cake Wallet & Monero GUI). They show what each screen looks like so you can follow along. You can replace them with real screenshots of your own device at any time.

## Why you need a Monero wallet

MyZubster pays contributor rewards to the Monero address you register in the public registry. On the backend, the gateway uses `gateway/xmr_wallet.js` over Monero wallet RPC to monitor, release, and refund payouts. No wallet → no address → no payout.

## 1. Choose a wallet

| Wallet | Platform | Best for |
|--------|----------|----------|
| **Cake Wallet** | iOS / Android | Beginners, mobile, supports XMR out of the box |
| **Monero GUI** | Windows / macOS / Linux | Desktop, full control, remote or local node |
| **Feather Wallet** | Windows / macOS / Linux | Lightweight desktop, no blockchain download |
| **Monerujo / Stack** | Android | Mobile, advanced users |

Most contributors use **Cake Wallet** (easiest) or **Monero GUI** (desktop). See `images/monero/wallet-types.svg`.

## 2. Install

### Cake Wallet (mobile)
1. Open the **App Store** (iOS) or **Google Play** (Android).
2. Search **Cake Wallet**.
3. Tap **Install / Get**.

See `images/monero/install-cake.svg`.

### Monero GUI (desktop)
1. Go to the official site `https://www.getmonero.org/downloads/` (always use the official source).
2. Pick your OS: **Windows / macOS / Linux**.
3. Download and run the installer.

See `images/monero/install-gui.svg`.

## 3. Create a new wallet

1. Open the app → choose **Create a new wallet** (choose **Restore** only if you already have a 25-word seed).
2. Give it a name (e.g. `myzubster`).
3. Tap **Create**.

Your wallet now generates a **25-word mnemonic seed** — this is the master key to your funds.

See `images/monero/create-wallet.svg`.

## 4. Back up your seed phrase 🔐

This is the single most important step.

1. Write down all **25 words**, in order, on paper (not a screenshot, not cloud storage).
2. **Never** share the seed with anyone — not even MyZubster staff.
3. Store it offline (a safe or locked drawer).
4. Confirm you have saved it to continue.

See `images/monero/backup-seed.svg`.

> ⚠️ If you lose your seed, your funds are **gone forever**. There is no recovery, no support ticket that can restore it.

## 5. Receive XMR (get your address)

1. Open the **Receive** tab.
2. Copy your **XMR address** (starts with `4` or `8`, ~95 characters) or scan the QR code.
3. Keep this address handy.

See `images/monero/receive-xmr.svg`.

### Register your address with MyZubster

To actually get paid, your XMR address must be in the **public registry**:

- If you have contributed before, your address is likely already saved (the maintainer confirms saved addresses from prior work).
- Otherwise, open an issue or comment your address so it can be added to the registry.
- One address per contributor is enough — you can reuse it for every bounty.

## 6. Send XMR

1. Open the **Send** tab.
2. Paste the recipient **address** and enter the **amount**.
3. Review the network fee, then tap **Send**.

See `images/monero/send-xmr.svg`.

## 7. View transactions

Open the **History / Transactions** tab to see incoming payouts, outgoing sends, confirmation counts, and block height.

See `images/monero/transactions.svg`.

## Security checklist ✅

- [ ] Seed written on paper and stored offline
- [ ] Seed never typed into any website
- [ ] Wallet app downloaded from the official source only
- [ ] XMR address registered in the MyZubster registry
- [ ] Tested with a tiny amount before any large transfer

## FAQ

**Q: Which wallet should I pick?**
A: Cake Wallet if you are on a phone; Monero GUI if you want desktop control.

**Q: Do I need to download the whole blockchain?**
A: No — Cake Wallet and Monero GUI use remote nodes by default, so there is nothing to sync manually.

**Q: Is my address private?**
A: Your XMR address is public by design (it is needed to receive funds), but it does not reveal your identity or your seed.

---

*Contributor guide for issue #151 — community contribution (no XMR bounty). Screenshots are illustrative mockups.*
