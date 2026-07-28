# 🚀 MyZubsterGateway

**MyZubsterGateway** est le backend open-source de **MyZubster** – une plateforme axée sur la confidentialité, auto-hébergée pour l'échange de compétences et de services avec **paiements en Monero (XMR)**, **service onion Tor** et une architecture entièrement décentralisée.

Construit avec Node.js, Express, MongoDB, Nginx et Cloudflare.

---

## 🔗 Site et Communauté

| Plateforme | Lien |
| :--- | :--- |
| **🌐 Site Clearnet** | [https://myzubster.com](https://myzubster.com) |
| **🧅 Onion Tor** | `http://olqcnbdlt35k2stmmwvzhvuetu2fc4us2jnn5wg6y6wlcddihfmdomid.onion` |
| **📦 GitHub** | [https://github.com/DanielIoni-creator/MyZubsterGateway](https://github.com/DanielIoni-creator/MyZubsterGateway) |
| **📝 Dev.to** | [https://dev.to/danielioni](https://dev.to/danielioni) |
| **💼 LinkedIn** | [https://linkedin.com/in/danielioni](https://linkedin.com/in/danielioni) |
| **🐦 Twitter / X** | [https://twitter.com/DanielIoni](https://twitter.com/DanielIoni) |

---

## 📖 En Savoir Plus

| Article | Lien |
| :--- | :--- |
| **Vision** – *MyZubster: la plateforme open-source qui pourrait changer l'ère financière* | [Lire](https://dev.to/danielioni/myzubster-the-open-source-platform-that-could-change-the-financial-era-5hlp) |
| **Guide de déploiement** – *De zéro à la production: déployer une app Node.js avec Nginx, Cloudflare, systemd et Tor* | [Lire](https://dev.to/danielioni/from-zero-to-production-deploying-a-nodejs-app-with-nginx-cloudflare-systemd-and-tor-596l) |
| **Expérience** – *La longue nuit du déploiement: comment nous avons dompté DNS, Nginx, Tor et un firewall rebelle* | [Lire](https://dev.to/danielioni/the-long-night-of-deployment-how-we-tamed-dns-nginx-tor-and-a-rebel-firewall-...) |
| **Intégration Monero** – *Intégrer les paiements Monero dans une app Node.js: guide complet* | [Lire](https://dev.to/danielioni/integrating-monero-payments-into-a-nodejs-app-a-complete-guide-...) |
| **Migration Seraphis** – *La migration Seraphis de Monero et FCMP++: plongée technique* | [Lire](https://dev.to/danielioni/moneros-seraphis-migration-fcmp-a-technical-deep-dive-4ih) |
| **État du projet** – *MyZubster: l'état actuel du projet* | [Lire](https://dev.to/danielioni/myzubster-the-current-state-of-the-project-...) |

---

## ✨ Fonctionnalités

- **🔐 Paiements Monero (XMR)** – Privés, intraçables et résistants à la censure.
- **🧅 Service onion Tor** – Accès anonyme à la plateforme.
- **💻 Auto-hébergé** – Contrôle total de vos données et de votre infrastructure.
- **⚡ Node.js + Express** – Backend rapide, scalable et moderne.
- **📦 MongoDB** – Base de données flexible et fiable.
- **🛡️ Nginx + Let's Encrypt** – Reverse proxy sécurisé avec SSL.
- **🌐 Cloudflare DNS** – Gestion DNS rapide et sécurisée.
- **🔁 systemd** – Démarrage automatique et reprise après crash.

---

## 🧰 Stack Technique

| Couche | Technologie |
| :--- | :--- |
| **Backend** | Node.js + Express |
| **Base de données** | MongoDB |
| **Reverse Proxy** | Nginx + Let's Encrypt |
| **DNS** | Cloudflare |
| **Gestion des processus** | systemd |
| **Confidentialité** | Service onion Tor |
| **Paiements** | Monero (XMR) – testnet / mainnet |
| **Frontend** | React + Vite + Tailwind |
| **Version Control** | Git + GitHub (SSH) |

---

## 📦 Installation et Configuration

### Prérequis

- VPS Ubuntu 20.04 / 22.04
- Node.js 20+
- MongoDB
- Nginx
- Outils CLI Monero (pour le wallet RPC)
- Tor (optionnel, pour le service onion)

### Clonez le dépôt

```bash
git clone https://github.com/DanielIoni-creator/MyZubsterGateway.git
cd MyZubsterGateway
Installez les dépendances
bash

npm install

Configurez l'environnement
bash

cp .env.example .env
nano .env

Définissez l'URI MongoDB, le secret JWT, l'URL RPC Monero et les autres variables.
Démarrez le serveur
bash

node server.js

Production (systemd)
bash

sudo cp myzubster-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable myzubster-gateway
sudo systemctl start myzubster-gateway

🔐 Intégration Monero
Configuration du Wallet RPC

    Téléchargez les outils CLI Monero:
    bash

    wget https://downloads.getmonero.org/cli/linux64 -O monero-linux64.tar.bz2
    tar -xjf monero-linux64.tar.bz2
    mv monero-x86_64-linux-gnu-v* monero
    cd monero

    Créez un wallet (testnet):
    bash

    ./monero-wallet-cli --generate-new-wallet /root/monero-wallet/myzubster-wallet \
      --password MyStrongPassword123 \
      --testnet \
      --daemon-address testnet.community:28081

    Démarrez le wallet RPC:
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

    Mettez à jour .env:
    text

    MONERO_RPC_URL=http://127.0.0.1:18083/json_rpc
    MONERO_WALLET_ADDRESS=YOUR_PRIMARY_ADDRESS
    MONERO_NETWORK=testnet
    PAYMENT_MODE=monero

🌐 Architecture de Déploiement
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

🤝 Contributions

Les contributions sont les bienvenues ! Ouvrez une issue ou soumettez une pull request.

    Forkez le dépôt

    Créez votre branche (git checkout -b feature/AmazingFeature)

    Commitez vos changements (git commit -m 'Ajouter AmazingFeature')

    Pushez sur la branche (git push origin feature/AmazingFeature)

    Ouvrez une Pull Request

📄 Licence

Ce projet est sous licence GPLv3 – consultez le fichier LICENSE pour plus de détails.
💬 Connectez-vous avec moi

    Site: https://myzubster.com

    Tor: http://olqcnbdlt35k2stmmwvzhvuetu2fc4us2jnn5wg6y6wlcddihfmdomid.onion

    GitHub: https://github.com/DanielIoni-creator

    Dev.to: https://dev.to/danielioni

    LinkedIn: https://linkedin.com/in/danielioni

    Twitter: https://twitter.com/DanielIoni

⭐ Support

Si vous aimez ce projet, laissez une étoile ⭐ sur GitHub et partagez-le !

Construit avec ❤️ pour la confidentialité, la liberté et la décentralisation.
