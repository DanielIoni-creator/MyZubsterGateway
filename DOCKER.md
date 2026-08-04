# Docker Compose - MyZubster Gateway

Avvia tutto con 

## Servizi
- **gateway** (10000): Node.js Express server
- **mongodb** (27017): Database
- **tari-wallet-stub** (18143): Wallet Tari (MYZ) stub
- **monero-wallet-stub** (18083): Wallet Monero (XMR) stub
- **frontend** (3000): Frontend (profilo opzionale)

## Avvio


## Comandi


## Variabili (.env.docker)
- GATEWAY_PORT=10000
- NODE_ENV=development
- XMR_WALLET_PORT=18083
- TARI_WALLET_PORT=18143
- FRONTEND_PORT=3000

## Note
- Wallet stub per sviluppo (no transazioni reali)
- MongoDB dati persistenti in volume 
- Codice montato come volume per hot-reload
