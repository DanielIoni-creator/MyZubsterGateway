
---

### 🇮🇹 `README.it.md` (Italiano)

```markdown
# 🌐 MyZubster – Gateway di Pagamento Monero Self-Hosted & Ecosistema Offshore

**MyZubster** è un ecosistema completo e self-hosted per accettare pagamenti in Monero (XMR), gestire un marketplace di competenze e ordinare servizi – tutto senza intermediari. Progettato per darti il pieno controllo sui tuoi fondi, i tuoi dati e la tua attività.

---

## 🎯 Cosa Rende MyZubster Unico?

- 🔒 **Veramente Self-Hosted** – Possiedi l'infrastruttura. Nessun costo mensile, nessun intermediario.
- 🌊 **Gateway Offshore** – Accetta Monero da qualsiasi parte del mondo, regola istantaneamente e mantieni la privacy.
- 🧩 **Architettura Modulare** – Core Gateway, Marketplace e App Mobile funzionano insieme o separatamente.
- 💰 **Sistema di Commissioni Integrato** – Guadagna su ogni transazione (imposta la tua percentuale).
- 📱 **Mobile-First** – App Android inclusa per acquirenti e venditori.
- 🔓 **100% Open Source** – Controlla, fork e personalizza secondo le tue esigenze.

---

## 🔥 Come Funziona il Gateway Offshore di Pagamento Monero

Il cuore di MyZubster è il **gateway offshore** – un insieme di servizi che trasformano Monero in un metodo di pagamento senza soluzione di continuità per il tuo marketplace.

### 1️⃣ Subaddress Unici per Ogni Ordine

Ogni ordine riceve il proprio subaddress Monero. Questo significa:

- ✅ **Privacy** – I clienti inviano a un indirizzo unico, non al tuo wallet principale.
- ✅ **Tracciabilità** – Sai esattamente a quale ordine appartiene un pagamento.
- ✅ **Conformità** – Nessuna esposizione del saldo o della cronologia delle transazioni.

### 2️⃣ Monitoraggio Automatico dei Pagamenti

Il gateway scansiona i pagamenti in arrivo ogni 60 secondi tramite `get_bulk_payments` di Monero RPC. Nessun controllo manuale, nessun polling dal frontend – funziona da solo.

- 📡 **Monitoraggio Sempre Attivo** – Eseguito in background tramite PM2.
- ⚡ **Quasi in Tempo Reale** – Gli ordini si aggiornano in pochi secondi dalla conferma.
- 🔐 **Soglia di Conferme** – Definisci tu il numero minimo di conferme (es. 10 per mainnet).

### 3️⃣ Aggiornamenti degli Ordini via Webhook

Quando un pagamento viene confermato, il gateway notifica istantaneamente il tuo marketplace tramite un webhook. Questo elimina la necessità di polling continui e mantiene il sistema reattivo.

### 4️⃣ Integrazione del Tasso di Cambio

Il gateway converte automaticamente gli importi in USD in XMR utilizzando tassi di cambio in tempo reale (configurabili). I clienti vedono l'importo esatto da pagare in Monero.

---

## 🧩 Componenti dell'Ecosistema

| Componente | Descrizione | Stack Tecnologico |
|-----------|-------------|-------------------|
| **Core Gateway** (`MyZubsterAPP`) | RPC, subaddress, monitoraggio, webhook | Node.js, Express, Sequelize |
| **Marketplace** (`MyZubster-Marketplace`) | Competenze, utenti, ordini, commissioni | Node.js, Express, JWT |
| **App Mobile** (`MyZubster-App`) | Client Android per acquirenti/venditori | React Native, Expo |

---

## 🚀 Guida Rapida

### Prerequisiti

- Un VPS (DigitalOcean, Hetzner, Contabo) o server locale
- Monero Wallet RPC (testnet o mainnet)
- Node.js 18+, PostgreSQL (o SQLite per sviluppo)

### Installazione Rapida (Tutti i Componenti)

```bash
git clone https://github.com/DanielIoni-creator/MyZubster.git
cd MyZubster

# Core Gateway
cd MyZubsterAPP/backend
npm install
cp .env.example .env
node app.js

# Marketplace (in un altro terminale)
cd ../MyZubster-Marketplace
npm install
cp .env.example .env
node server.js
🏗️ Panoramica dell'Architettura
text

                     ┌─────────────────────────────┐
                     │    Monero Wallet RPC         │
                     │   (testnet/mainnet)          │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │        CORE GATEWAY          │
                     │  - Generazione Subaddress    │
                     │  - Monitoraggio Pagamenti    │
                     │  - Invio Webhook             │
                     │  - Autenticazione JWT        │
                     └──────────────┬──────────────┘
                                    │
                                    │   Webhook
                                    ▼
                     ┌─────────────────────────────┐
                     │      MARKETPLACE             │
                     │  - Utenti / Competenze / Ordini│
                     │  - JWT Auth                  │
                     │  - Commissioni               │
                     │  - Ricezione Webhook         │
                     └──────────────┬──────────────┘
                                    │
                                    │   REST API
                                    ▼
                     ┌─────────────────────────────┐
                     │     APP MOBILE (Android)     │
                     │  - Naviga e acquista         │
                     │  - Dashboard ordini          │
                     └─────────────────────────────┘

💰 Flusso del Pagamento Offshore (Passo Passo)

    L'acquirente crea un ordine – Il Marketplace richiede un subaddress al Core Gateway.

    Il Gateway genera un subaddress unico – Lo restituisce al Marketplace.

    L'acquirente invia Monero a quell'indirizzo.

    Il Gateway monitora ogni 60 secondi.

    Pagamento rilevato – Verifica l'importo e le conferme.

    Ordine confermato – Il Gateway invia un webhook al Marketplace.

    Il Marketplace aggiorna lo stato – L'acquirente vede "completato".

    I fondi sono disponibili – Il venditore può ritirarli.

🔐 Sicurezza e Privacy

    Nessun Dato Centralizzato – Tutti i dati rimangono sul tuo server.

    Comunicazione Cifrata – I webhook usano segreti condivisi; tutto il traffico può essere HTTPS.

    Accesso Basato su Ruoli – Permessi granulari (utente, venditore, admin).

    Privacy delle Transazioni – La privacy intrinseca di Monero protegge acquirenti e venditori.

🛠️ Personalizzazione

    Imposta la Tua Commissione – Modifica COMMISSION_PERCENTAGE nel .env del Marketplace.

    Cambia le Conferme – Regola MONERO_MIN_CONFIRMATIONS nel .env del Core Gateway.

    Rebranding – L'intera UI è open source – puoi cambiare loghi, colori e testi.

    Aggiungi Nuove Funzionalità – L'architettura modulare rende facile estendere.

🤝 Contribuire

I contributi sono benvenuti! Bug fix, nuove funzionalità o miglioramenti alla documentazione:

    Fai il fork del repository.

    Crea un branch per la feature.


📄 Licenza

MIT License
👨‍💻 L'Autore

Daniel Ioni – Sviluppatore Full-Stack & Appassionato Open Source

Sono uno sviluppatore che crede nella libertà finanziaria e nelle soluzioni self-hosted. Ho costruito MyZubster per dare a tutti la possibilità di accettare Monero senza intermediari.

    🌐 Basato in Europa

    💻 Node.js, React, React Native, Android

    🔒 Privacy-first

🌟 Supporta il Progetto

    ⭐ Stellina ai re
    🐛 Segnala problemi.pository.

    📝 Scrivi tutorial o post.

    🧑‍💻 Contribuisci con codice.

MyZubster – Il tuo gateway per pagamenti senza confini, privati e self-hosted.

Realizzato con ❤️ per la community Monero.