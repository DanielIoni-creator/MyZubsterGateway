# Documentazione Completa del Progetto - MyZubsterGateway

Benvenuti nella documentazione ufficiale di **MyZubsterGateway**. Questo progetto è il cuore del backend per l'ecosistema MyZubster, gestendo API fondamentali, integrazioni blockchain, simulazioni e contratti di garanzia (escrow).

## Panoramica dell'Architettura

MyZubsterGateway è un'applicazione Node.js costruita con Express, collegata a un database MongoDB. Il sistema è progettato per servire un'applicazione frontend (Single Page Application) e per gestire numerose logiche di business backend.

### Struttura Principale

- **`server.js`**: Il punto di ingresso principale dell'applicazione. Configura le rotte, la connessione a MongoDB e serve i file statici del frontend se presenti.
- **Rotte API (`/api/*`)**:
  - `/buy-myz`: Endpoint per l'acquisto di token MYZ con Monero (XMR).
  - `/api/rewards`: Gestisce i premi e le ricompense degli utenti.
  - `/api/bounty`: Sistema di gestione delle taglie (bounties) e task.
  - `/api/stake`: Gestione dello staking e della reputazione degli utenti (`stake_reputation.js`).
  - `/api/escrow/house`: Gestione specifica per gli escrow immobiliari (`escrow_immobiliare.js`).
  - `/api/robot/*`: Suite di API per i moduli "robot" (gestione codice, loghi, assistenza animali).
- **Frontend SPA**: L'applicazione è configurata per servire la build di un frontend dalla cartella `frontend/dist`.

## Moduli Principali

### 1. Sistema Escrow (Contratti di Garanzia)
Il progetto include diversi moduli per la gestione sicura delle transazioni:
- `escrow.js`: Modulo base per i contratti di garanzia.
- `escrow_simulator.js`: Simulatore per testare i flussi escrow senza blockchain reale.
- `escrow_immobiliare.js`: Specializzazione per il mercato immobiliare.
- `escrow_robot.js`: Flussi automatizzati o gestiti da intelligenza artificiale.

Le funzionalità principali (come `createEscrow`, `lockFunds`, `submitProof`, `release`, `dispute`) garantiscono che i fondi vengano sbloccati solo al verificarsi di determinate condizioni, risolvendo eventuali dispute in modo sicuro.

### 2. Moduli Robot
Il sistema integra funzionalità automatizzate o IA-driven:
- `robot_brain.js`: Logica centrale del robot.
- `robot_code.js` / `robot_code_persistent.js`: Generazione e memorizzazione di frammenti di codice.
- `robot_logo.js` / `robot_logo_mock.js`: Generazione di asset visivi e loghi.
- `robot_animal_assistance.js`: Logica per servizi legati all'assistenza degli animali (adozioni, cure, ecc.).

### 3. Simulatore di Token e Acquisti
- `buy_myz.js`: Elaborazione degli acquisti MYZ utilizzando crypto (XMR).
- `token_simulator.js`: Simula funzioni on-chain (come il minting) per il testing locale.

## Configurazione e Installazione

### Prerequisiti
- Node.js (v14+)
- MongoDB in esecuzione locale o remota.

### Variabili d'Ambiente
Crea un file `.env` basato su `.env.example`. Le chiavi principali includono:
- `MONGODB_URI`: Stringa di connessione a MongoDB.
- `TELEGRAM_BOT_TOKEN`: Token per abilitare le notifiche del bot Telegram (`telegram_bot.js`).
- `GITHUB_TOKEN`: Per integrazioni GitHub.
- `OPENAI_API_KEY`: Per le funzionalità AI nel modulo Robot.

### Avvio
1. Installa le dipendenze: `npm install`
2. Avvia il server di sviluppo: `npm start`
3. Per il frontend (se presente), naviga in `frontend/` ed esegui `npm install && npm run build`.

## Test
Il progetto utilizza un framework di test nativo o basato su Jest/Mocha (i test risiedono nella cartella `tests/`).
Esegui i test con: `npm test`
