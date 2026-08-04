# 🚀 MyZubsterGateway

**MyZubsterGateway** è il backend open-source di **MyZubster** – una piattaforma privacy-first, self-hosted per lo scambio di competenze e servizi con **pagamenti in Monero (XMR)**, **servizio onion Tor** e architettura completamente decentralizzata.

Realizzato con Node.js, Express, MongoDB, Nginx e Cloudflare.

---

## 🔗 Sito e Community

| Piattaforma | Link |
| :--- | :--- |
| **🌐 Sito Clearnet** | [https://myzubster.com](https://myzubster.com) |
| **🧅 Onion Tor** | `http://olqcnbdlt35k2stmmwvzhvuetu2fc4us2jnn5wg6y6wlcddihfmdomid.onion` |
| **📦 GitHub** | [https://github.com/DanielIoni-creator/MyZubsterGateway](https://github.com/DanielIoni-creator/MyZubsterGateway) |
| **📝 Dev.to** | [https://dev.to/danielioni](https://dev.to/danielioni) |
| **💼 LinkedIn** | [https://linkedin.com/in/danielioni](https://linkedin.com/in/danielioni) |
| **🐦 Twitter / X** | [https://twitter.com/DanielIoni](https://twitter.com/DanielIoni) |

---

## 📖 Approfondimenti

| Articolo | Link |
| :--- | :--- |
| **Visione** – *MyZubster: la piattaforma open-source che potrebbe cambiare l'era finanziaria* | [Leggi](https://dev.to/danielioni/myzubster-the-open-source-platform-that-could-change-the-financial-era-5hlp) |
| **Guida al Deploy** – *Da zero alla produzione: deploy di un'app Node.js con Nginx, Cloudflare, systemd e Tor* | [Leggi](https://dev.to/danielioni/from-zero-to-production-deploying-a-nodejs-app-with-nginx-cloudflare-systemd-and-tor-596l) |
| **Esperienza** – *La lunga notte del deploy: come abbiamo domato DNS, Nginx, Tor e un firewall ribelle* | [Leggi](https://dev.to/danielioni/the-long-night-of-deployment-how-we-tamed-dns-nginx-tor-and-a-rebel-firewall-...) |
| **Integrazione Monero** – *Integrare pagamenti Monero in un'app Node.js: guida completa* | [Leggi](https://dev.to/danielioni/integrating-monero-payments-into-a-nodejs-app-a-complete-guide-...) |
| **Migrazione Seraphis** – *La migrazione Seraphis di Monero e FCMP++: approfondimento tecnico* | [Leggi](https://dev.to/danielioni/moneros-seraphis-migration-fcmp-a-technical-deep-dive-4ih) |
| **Stato del progetto** – *MyZubster: lo stato attuale del progetto* | [Leggi](https://dev.to/danielioni/myzubster-the-current-state-of-the-project-...) |

---

## ✨ Funzionalità

- **🔐 Pagamenti Monero (XMR)** – Privati, non tracciabili e resistenti alla censura.
- **🧅 Servizio onion Tor** – Accesso anonimo alla piattaforma.
- **💻 Self-Hosted** – Controllo totale dei dati e dell'infrastruttura.
- **⚡ Node.js + Express** – Backend veloce, scalabile e moderno.
- **📦 MongoDB** – Database flessibile e affidabile.
- **🛡️ Nginx + Let's Encrypt** – Reverse proxy sicuro con SSL.
- **🌐 Cloudflare DNS** – Gestione DNS veloce e sicura.
- **🔁 systemd** – Avvio automatico e ripristino in caso di crash.

---

## 🧰 Stack Tecnologico

| Livello | Tecnologia |
| :--- | :--- |
| **Backend** | Node.js + Express |
| **Database** | MongoDB |
| **Reverse Proxy** | Nginx + Let's Encrypt |
| **DNS** | Cloudflare |
| **Gestione Processi** | systemd |
| **Privacy** | Servizio onion Tor |
| **Pagamenti** | Monero (XMR) – testnet / mainnet |
| **Frontend** | React + Vite + Tailwind |
| **Version Control** | Git + GitHub (SSH) |

---

## 📦 Installazione e Configurazione

### Prerequisiti

- VPS Ubuntu 20.04 / 22.04
- Node.js 20+
- MongoDB
- Nginx
- Strumenti CLI Monero (per il wallet RPC)
- Tor (opzionale, per il servizio onion)

### Clona il repository

```bash
git clone https://github.com/DanielIoni-creator/MyZubsterGateway.git
cd MyZubsterGateway
Installa le dipendenze
bash

npm install

Configura l'ambiente
bash

cp .env.example .env
nano .env

Imposta l'URI di MongoDB, il secret JWT, l'URL RPC di Monero e le altre variabili.
Avvia il server
bash

node server.js

Produzione (systemd)
bash

sudo cp myzubster-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable myzubster-gateway
sudo systemctl start myzubster-gateway

🔐 Integrazione Monero
Configurazione Wallet RPC

    Scarica gli strumenti CLI Monero:
    bash

    wget https://downloads.getmonero.org/cli/linux64 -O monero-linux64.tar.bz2
    tar -xjf monero-linux64.tar.bz2
    mv monero-x86_64-linux-gnu-v* monero
    cd monero

    Crea un wallet (testnet):
    bash

    ./monero-wallet-cli --generate-new-wallet /root/monero-wallet/myzubster-wallet \
      --password MyStrongPassword123 \
      --testnet \
      --daemon-address testnet.community:28081

    Avvia il wallet RPC:
    bash

    nohup ./monero-wallet-rpc \
      --wallet-file /root/monero-wallet/myzubster-wallet \
      --password MyStrongPassword123 \
      --rpc-bind-port 18083 \
      --daemon-address testnet.community:28081 \
      --testnet \
      --disable-rpc-login \
      --log-level 0 \
      > /root/monero-wallet-rpc.log 2>&1 &

    Aggiorna .env:
    text

    MONERO_RPC_URL=http://127.0.0.1:18083/json_rpc
    MONERO_WALLET_ADDRESS=YOUR_PRIMARY_ADDRESS
    MONERO_NETWORK=testnet
    PAYMENT_MODE=monero

🌐 Architettura di Deploy
text

┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │    (DNS + SSL)  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Nginx (Port 80/443) │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Node.js App    │
                    │  (Port 3000)    │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   MongoDB       │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Monero Wallet  │
                    │  RPC (18083)    │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Tor Onion      │
                    │  Service        │
                    └─────────────────┘

🤝 Contributi

I contributi sono benvenuti! Apri una issue o invia una pull request.

    Fai il fork del repository

    Crea il tuo branch (git checkout -b feature/AmazingFeature)

    Fai il commit delle tue modifiche (git commit -m 'Aggiungi AmazingFeature')

    Pusha sul branch (git push origin feature/AmazingFeature)

    Apri una Pull Request

📄 Licenza

Questo progetto è rilasciato sotto licenza GPLv3 – vedi il file LICENSE per i dettagli.
💬 Connettiti con me

    Sito: https://myzubster.com

    Tor: http://olqcnbdlt35k2stmmwvzhvuetu2fc4us2jnn5wg6y6wlcddihfmdomid.onion

    GitHub: https://github.com/DanielIoni-creator

    Dev.to: https://dev.to/danielioni

    LinkedIn: https://linkedin.com/in/danielioni

    Twitter: https://twitter.com/DanielIoni

⭐ Supporto

Se ti piace questo progetto, lascia una stella ⭐ su GitHub e condividilo con altri!

Costruito con ❤️ per la privacy, la libertà e la decentralizzazione.
