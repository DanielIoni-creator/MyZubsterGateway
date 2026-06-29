# 🧩 MyZubster

**Scambia competenze con i vicini, chatta in modo semplice e paga con Monero.**

[![APK Download](https://img.shields.io/badge/APK-download-v1.0.0--beta-orange?style=for-the-badge&logo=android)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/releases/download/v1.0.0-beta/myzubster-reviews-test-debug.apk)
[![Release](https://img.shields.io/badge/release-v1.0.0--beta-blue?style=for-the-badge&logo=github)](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/releases/tag/v1.0.0-beta)
[![License](https://img.shields.io/badge/license-Apache%202.0-green?style=for-the-badge)](#licenza)
[![Build](https://img.shields.io/badge/build-Android%20%2B%20Node.js-success?style=for-the-badge)](#installazione-e-avvio)

**Versione app:** 0.2.0  
**Release GitHub:** v1.0.0-beta  
**Ultimo aggiornamento:** 2026-06-29

## Cos'è MyZubster?

MyZubster è un'app Android open-source per lo **scambio di competenze e servizi tra persone vicine**: riparazioni, lezioni, aiuto pratico, supporto digitale e molto altro.  
L'app permette di pubblicare competenze, cercare servizi locali, chattare con altri utenti e gestire pagamenti tramite **Monero**, mantenendo la logica sensibile lato backend.

L'obiettivo è creare un piccolo marketplace locale, semplice e privacy-friendly, dove le persone possano aiutarsi e ricevere compensi in modo diretto.

## Download APK

Scarica la beta pubblicata su GitHub Releases:

- [📦 Scarica MyZubster v1.0.0-beta APK](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/releases/download/v1.0.0-beta/myzubster-reviews-test-debug.apk)
- [🚀 Pagina release v1.0.0-beta](https://github.com/h4x0rmyzubster/MyZubsterh4x0r/releases/tag/v1.0.0-beta)

> Se stai leggendo una versione futura del README e l'asset APK non è ancora stato pubblicato, il badge resta un placeholder pronto per la release GitHub.

## ✨ Caratteristiche principali

- 🔐 **Autenticazione e profilo utente** — base utenti, registrazione token dispositivo e profilo con nome/nickname, zona, bio, competenze e wallet Monero opzionale.
- 🛠️ **Competenze e servizi locali** — pubblica, cerca e visualizza competenze offerte da persone vicine, con prezzi in euro.
- 📄 **Dettaglio servizio** — scheda competenza con descrizione, prezzo, informazioni venditore e azioni collegate.
- 💬 **Chat integrata** — conversazione tra cliente e venditore, con possibilità di richiedere un pagamento dal flusso chat.
- 🪙 **Pagamenti Monero** — checkout server-side con indirizzi one-shot, QR/URI, tracking conferme e commissione piattaforma configurabile.
- ⭐ **Recensioni e reputazione** — rating e recensioni collegati agli utenti e ai servizi.
- 🔔 **Notifiche push** — supporto Firebase Cloud Messaging per messaggi e conferme pagamento, quando configurato.
- 🛡️ **Privacy-first** — wallet, credenziali e chiavi restano lato server; l'APK non deve contenere segreti.
- 📣 **Banner sponsor** — spazi già predisposti per partner come Mullvad VPN e SimpleSwap.io.

## 🧰 Tecnologie utilizzate

- **Kotlin / Android** — app mobile nativa.
- **Android Studio / Gradle** — sviluppo e build APK.
- **Node.js / Express** — backend REST.
- **MongoDB / Mongoose** — persistenza dati per utenti, messaggi, recensioni e transazioni.
- **Monero / monero-wallet-rpc / MoneroPay** — pagamenti privacy-friendly gestiti server-side.
- **Firebase Cloud Messaging** — notifiche push.
- **Retrofit / OkHttp** — comunicazione HTTP dall'app Android.
- **ZXing** — supporto QR code per pagamenti.

## 📸 Screenshot / Demo

> Placeholder per immagini future.

| Home / Ricerca | Profilo | Pagamento Monero |
| --- | --- | --- |
| _Screenshot in arrivo_ | _Screenshot in arrivo_ | _Screenshot in arrivo_ |

Suggerimento per il futuro:

```text
docs/screenshots/home.png
docs/screenshots/profile.png
docs/screenshots/payment.png
```

## 🚀 Installazione e avvio

### 1. Clonare il repository

```bash
git clone https://github.com/h4x0rmyzubster/MyZubsterh4x0r.git
cd MyZubsterh4x0r
```

Se stai lavorando sulla struttura locale attuale:

```powershell
cd C:\Users\user\Desktop\MyZubster\MyZubster
```

### 2. Configurare il backend

Entra nella cartella backend:

```bash
cd backend
```

Installa le dipendenze:

```bash
npm install
```

Crea il file `.env` partendo dall'esempio:

```bash
cp .env.example .env
```

Su Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configura almeno queste variabili:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/myzubster
MONERO_WALLET_RPC_URL=http://127.0.0.1:38082/json_rpc
MONERO_NODE_URL=http://127.0.0.1:18081/json_rpc
PAYMENT_PLATFORM_FEE_RATE=0.02
PLATFORM_FEE_WALLET_ADDRESS=
FIREBASE_SERVICE_ACCOUNT_PATH=
FIREBASE_SERVICE_ACCOUNT_JSON=
```

Controlla la sintassi:

```bash
npm run check
```

Avvia il backend:

```bash
npm start
```

Il backend parte di default su:

```text
http://localhost:3000
```

> Importante: non committare mai `.env`, wallet reali, seed phrase, token o credenziali RPC.

### 3. Aprire l'app Android

1. Apri **Android Studio**.
2. Seleziona **Open**.
3. Apri la root del progetto MyZubster.
4. Attendi la sincronizzazione Gradle.

Controlla l'URL API in `app/build.gradle`:

```gradle
buildConfigField 'String', 'API_BASE_URL', '"http://10.0.2.2:3000"'
```

- Usa `10.0.2.2` con l'emulatore Android.
- Usa l'IP LAN del PC se installi l'app su un telefono fisico.

### 4. Collegare dispositivo o usare emulatore

**Emulatore Android:**

1. Apri Device Manager in Android Studio.
2. Crea o avvia un dispositivo virtuale.
3. Premi Run sull'app.

**Telefono fisico Android:**

1. Abilita **Opzioni sviluppatore**.
2. Abilita **Debug USB**.
3. Collega il telefono via USB.
4. Autorizza il PC sul telefono.
5. Verifica con:

```bash
adb devices
```

### 5. Compilare APK manualmente

Da root progetto:

```bash
./gradlew assembleDebug
```

Su Windows:

```powershell
.\gradlew.bat assembleDebug
```

APK generato:

```text
app/build/outputs/apk/debug/app-debug.apk
```

Installazione via ADB:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 🤝 Come contribuire

MyZubster è un progetto **open-source**: contributi, bug report, idee e miglioramenti sono benvenuti.

- Guida rapida: [CONTRIBUTING.md](CONTRIBUTING.md)
- Guida estesa: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- Strategia marketing/social: [docs/social-media-strategy.md](docs/social-media-strategy.md)

In breve:

1. Fai fork del repository.
2. Crea un branch dedicato.
3. Fai commit chiari e piccoli.
4. Esegui i check backend/app.
5. Apri una Pull Request spiegando cosa cambia e come hai testato.

## 🔐 Note di sicurezza

- Non mettere wallet reali o chiavi private nell'app Android.
- Non committare `.env`, service account Firebase, token API o credenziali RPC.
- I pagamenti Monero devono restare gestiti lato backend.
- Se trovi un problema di sicurezza, non aprire una Issue pubblica con dettagli sensibili: contatta prima il maintainer.

## 📜 Licenza

Questo progetto è distribuito con licenza **Apache License 2.0**.

```text
Copyright 2026 MyZubster
Licensed under the Apache License, Version 2.0
```

## 🙏 Ringraziamenti

Grazie ai progetti e alle librerie open-source che rendono possibile MyZubster:

- Android, Kotlin e Gradle
- Node.js ed Express
- MongoDB e Mongoose
- Monero, monero-wallet-rpc e MoneroPay
- Firebase Cloud Messaging
- Retrofit, OkHttp e ZXing
- GitHub e GitHub Releases

E grazie a chi testerà, segnalerà bug, proporrà idee e contribuirà a far crescere MyZubster. 🚀
