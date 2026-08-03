# 🌱 MyZubster Gateway — Documentazione Ufficiale del Progetto

Benvenuti nella documentazione ufficiale di **MyZubster Gateway**, il microservizio backend centrale dell'ecosistema open-source MyZubster per lo scambio di semi, il monitoraggio della telemetria agricola e la gestione dei pagamenti escrow in Monero (XMR).

---

## 📐 Architettura Generale

MyZubster Gateway è sviluppato in **Node.js / Express** e fornisce API REST per la gestione di:
- **Seed Exchange Export:** Esportazione di annunci di semi in formato CSV e GeoJSON.
- **Monero Multisig AI Agent:** Coordinamento di pagamenti escrow multisig con agente IA come terzo firmatario.
- **Monero Escrow Gateway:** Gestione di ordini, blocchi di fondi e firme di sblocco.
- **Wallet RPC Suite:** API di stato del portafoglio Monero, sincronizzazione dei blocchi e bilancio.

```
+-----------------------------------------------------------------------+
|                         MyZubster Web / App                          |
+-----------------------------------------------------------------------+
                                   | REST API / JSON
                                   v
+-----------------------------------------------------------------------+
|                         MyZubster Gateway                             |
|  [routes/seedExchangeExport.js]   [services/moneroMultisigAgent.js]   |
|  [routes/moneroWalletApi.js]      [services/moneroEscrowGateway.js]  |
+-----------------------------------------------------------------------+
                                   | Monero RPC / Wallet
                                   v
+-----------------------------------------------------------------------+
|                         Monero Blockchain (XMR)                      |
+-----------------------------------------------------------------------+
```

---

## 🚀 Guida all'Installazione e Configurazione

### 1. Prerequisiti
- **Node.js:** v18.0.0 o superiore
- **npm:** v9.0.0 o superiore
- **Monero Daemon / Wallet RPC:** Opzionale (in modalità sandbox, il servizio utilizza simulazioni locali)

### 2. Clonazione e Installazione
```bash
git clone https://github.com/MyZubster-Ecosystem/MyZubsterGateway.git
cd MyZubsterGateway
npm install
```

### 3. Variabili d'Ambiente (`.env`)
Crea un file `.env` nella radice del progetto con le seguenti variabili:
```env
PORT=3000
NODE_ENV=production
XMR_WALLET_RPC_URL=http://127.0.0.1:18083
XMR_WALLET_RPC_USER=myzubster
XMR_WALLET_RPC_PASS=securepassword
```

### 4. Avvio del Server
```bash
# Modalità Sviluppo
npm run dev

# Modalità Produzione
npm start
```

---

## 📡 Riferimento API Endpoint

### 🌾 1. Seed Exchange Export API
* `GET /api/export/csv` — Esporta tutti i semi in formato CSV.
* `GET /api/export/geojson` — Esporta le coordinate geografiche degli annunci in formato GeoJSON standard.

### 💰 2. Monero Wallet RPC API
* `GET /api/xmr/wallet/status` — Restituisce lo stato del portafoglio, bilancio confermato e non confermato.
* `POST /api/xmr/wallet/create-address` — Genera una nuova sotto-chiave di pagamento.

### 🛡️ 3. Monero Escrow Gateway API
* `POST /api/xmr/escrow/create` — Inizializza un contratto escrow tra acquirente e venditore.
* `POST /api/xmr/escrow/release` — Esegue la firma multisig dell'agente IA per rilasciare i fondi al venditore.

---

## 🛠️ Testing e Verifica

Il progetto include suite di test automatici trasversali:
```bash
npm test
```

---

## 📜 Licenza
Questo progetto è distribuito sotto licenza **MIT + Apache 2.0 Open Source**.
