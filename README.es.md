# 🚀 MyZubsterGateway

**MyZubsterGateway** es el backend open-source de **MyZubster** – una plataforma centrada en la privacidad, autoalojada para el intercambio de habilidades y servicios con **pagos en Monero (XMR)**, **servicio onion Tor** y una arquitectura completamente descentralizada.

Construido con Node.js, Express, MongoDB, Nginx y Cloudflare.

---

## 🔗 Sitio y Comunidad

| Plataforma | Enlace |
| :--- | :--- |
| **🌐 Sitio Clearnet** | [https://myzubster.com](https://myzubster.com) |
| **🧅 Onion Tor** | `http://olqcnbdlt35k2stmmwvzhvuetu2fc4us2jnn5wg6y6wlcddihfmdomid.onion` |
| **📦 GitHub** | [https://github.com/DanielIoni-creator/MyZubsterGateway](https://github.com/DanielIoni-creator/MyZubsterGateway) |
| **📝 Dev.to** | [https://dev.to/danielioni](https://dev.to/danielioni) |
| **💼 LinkedIn** | [https://linkedin.com/in/danielioni](https://linkedin.com/in/danielioni) |
| **🐦 Twitter / X** | [https://twitter.com/DanielIoni](https://twitter.com/DanielIoni) |

---

## 📖 Lectura Adicional

| Artículo | Enlace |
| :--- | :--- |
| **Visión** – *MyZubster: la plataforma open-source que podría cambiar la era financiera* | [Leer](https://dev.to/danielioni/myzubster-the-open-source-platform-that-could-change-the-financial-era-5hlp) |
| **Guía de despliegue** – *De cero a producción: desplegar una app Node.js con Nginx, Cloudflare, systemd y Tor* | [Leer](https://dev.to/danielioni/from-zero-to-production-deploying-a-nodejs-app-with-nginx-cloudflare-systemd-and-tor-596l) |
| **Experiencia** – *La larga noche del despliegue: cómo domamos DNS, Nginx, Tor y un firewall rebelde* | [Leer](https://dev.to/danielioni/the-long-night-of-deployment-how-we-tamed-dns-nginx-tor-and-a-rebel-firewall-...) |
| **Integración Monero** – *Integrar pagos Monero en una app Node.js: guía completa* | [Leer](https://dev.to/danielioni/integrating-monero-payments-into-a-nodejs-app-a-complete-guide-...) |
| **Migración Seraphis** – *La migración Seraphis de Monero y FCMP++: inmersión técnica* | [Leer](https://dev.to/danielioni/moneros-seraphis-migration-fcmp-a-technical-deep-dive-4ih) |
| **Estado del proyecto** – *MyZubster: el estado actual del proyecto* | [Leer](https://dev.to/danielioni/myzubster-the-current-state-of-the-project-...) |

---

## ✨ Características

- **🔐 Pagos Monero (XMR)** – Privados, no rastreables y resistentes a la censura.
- **🧅 Servicio onion Tor** – Acceso anónimo a la plataforma.
- **💻 Autoalojado** – Control total de tus datos e infraestructura.
- **⚡ Node.js + Express** – Backend rápido, escalable y moderno.
- **📦 MongoDB** – Base de datos flexible y fiable.
- **🛡️ Nginx + Let's Encrypt** – Proxy inverso seguro con SSL.
- **🌐 Cloudflare DNS** – Gestión DNS rápida y segura.
- **🔁 systemd** – Inicio automático y recuperación ante caídas.

---

## 🧰 Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Backend** | Node.js + Express |
| **Base de datos** | MongoDB |
| **Proxy Inverso** | Nginx + Let's Encrypt |
| **DNS** | Cloudflare |
| **Gestión de Procesos** | systemd |
| **Privacidad** | Servicio onion Tor |
| **Pagos** | Monero (XMR) – testnet / mainnet |
| **Frontend** | React + Vite + Tailwind |
| **Control de Versiones** | Git + GitHub (SSH) |

---

## 📦 Instalación y Configuración

### Prerrequisitos

- VPS Ubuntu 20.04 / 22.04
- Node.js 20+
- MongoDB
- Nginx
- Herramientas CLI Monero (para el wallet RPC)
- Tor (opcional, para el servicio onion)

### Clona el repositorio

```bash
git clone https://github.com/DanielIoni-creator/MyZubsterGateway.git
cd MyZubsterGateway
Instala las dependencias
bash

npm install

Configura el entorno
bash

cp .env.example .env
nano .env

Configura la URI de MongoDB, el secreto JWT, la URL RPC de Monero y otras variables.
Inicia el servidor
bash

node server.js

Producción (systemd)
bash

sudo cp myzubster-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable myzubster-gateway
sudo systemctl start myzubster-gateway

🔐 Integración Monero
Configuración del Wallet RPC

    Descarga las herramientas CLI Monero:
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

    Inicia el wallet RPC:
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

    Actualiza .env:
    text

    MONERO_RPC_URL=http://127.0.0.1:18083/json_rpc
    MONERO_WALLET_ADDRESS=YOUR_PRIMARY_ADDRESS
    MONERO_NETWORK=testnet
    PAYMENT_MODE=monero

🌐 Arquitectura de Despliegue
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

🤝 Contribuciones

¡Las contribuciones son bienvenidas! Abre un issue o envía un pull request.

    Haz un fork del repositorio

    Crea tu rama (git checkout -b feature/AmazingFeature)

    Haz commit de tus cambios (git commit -m 'Añadir AmazingFeature')

    Haz push a la rama (git push origin feature/AmazingFeature)

    Abre un Pull Request

📄 Licencia

Este proyecto está bajo la licencia GPLv3 – consulta el archivo LICENSE para más detalles.
💬 Conéctate conmigo

    Sitio: https://myzubster.com

    Tor: http://olqcnbdlt35k2stmmwvzhvuetu2fc4us2jnn5wg6y6wlcddihfmdomid.onion

    GitHub: https://github.com/DanielIoni-creator

    Dev.to: https://dev.to/danielioni

    LinkedIn: https://linkedin.com/in/danielioni

    Twitter: https://twitter.com/DanielIoni

⭐ Apoyo

Si te gusta este proyecto, ¡deja una estrella ⭐ en GitHub y compártelo con otros!

Construido con ❤️ para la privacidad, la libertad y la descentralización.
