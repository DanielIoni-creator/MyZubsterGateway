# Backend di MyZubster

Server Node.js/Express per le API MyZubster, incluso un gateway Monero self-hosted ispirato a Monero Merchant/MoneroPay. L'entrypoint predefinito `src/index.js` salva le richieste di pagamento in MongoDB e usa un provider Monero reale (`monero-wallet-rpc` oppure MoneroPay), non indirizzi simulati.

## Pagamenti Monero

Endpoint REST disponibili:

- `POST /api/payment/create` — riceve `amount`/`amountXmr`, `description`, `sellerId`, crea un `paymentId`, chiama `createPaymentTransaction(amount, sellerId)` per generare un indirizzo one-shot e salva una transazione `pending` in MongoDB.
- `GET /api/payment/status/:paymentId` — chiama `checkPaymentStatus(paymentId)`, verifica importo ricevuto/conferme sulla blockchain Monero e aggiorna MongoDB (`pending`, `detected`, `confirmed`, `failed`).
- `POST /api/payment/webhook` — riceve conferme da MoneroPay/worker, aggiorna MongoDB e invia una callback opzionale all'app.

Il client Android riceve solo `address`, `amountXmr`, `uri` e stato: nessuna chiave privata viene inviata al dispositivo.

## Configurazione

Copia `.env.example` in `.env` e imposta almeno una modalità:

1. **Consigliata: MoneroPay self-hosted**
   - `MONEROPAY_URL=http://127.0.0.1:5000`
   - `MONERO_NODE_URL=http://127.0.0.1:18081/json_rpc`

2. **Fallback: monero-wallet-rpc**
   - lascia vuoto `MONEROPAY_URL`
   - `MONERO_WALLET_RPC_URL=http://127.0.0.1:18083/json_rpc`
   - per la stagenet locale configurata in OpenClaw: `MONERO_WALLET_RPC_URL=http://127.0.0.1:38082/json_rpc`
   - `MONERO_NODE_URL=http://127.0.0.1:18081/json_rpc`

Variabili supportate:

- `MONERO_NODE_URL` — nodo monerod pubblico o proprio per contesto/health check.
- `MONERO_WALLET_RPC_URL` — wallet RPC merchant/view-only per creare subaddress e controllare pagamenti.
- `MONEROPAY_URL` — istanza MoneroPay self-hosted.
- `MONERO_RPC_USERNAME` / `MONERO_RPC_PASSWORD` — Basic Auth se richiesta.
- `MONERO_CONFIRMATIONS_DEFAULT` — `0` per velocità, `10` per massima sicurezza.
- `MONGODB_URI` / `MONGODB_DB` — database per persistere le richieste in `monero_payments`.
- `MONERO_PAYMENT_STORE` — file JSON locale per `npm run start:json-store`.
- `PAYMENT_WEBHOOK_SECRET` — segreto opzionale per `POST /api/payment/webhook`.
- `PAYMENT_STATUS_CALLBACK_URL` — callback server/app opzionale invocata quando il webhook aggiorna un pagamento.
- `PAYMENT_PLATFORM_FEE_RATE` — percentuale trattenuta dalla piattaforma; default `0.02`, cioè 2%.
- `PLATFORM_FEE_WALLET_ADDRESS` — wallet Monero del creatore/piattaforma che riceve la commissione. Tienilo nel `.env` del server, non nell'APK Android.

## Commissione piattaforma

Il backend calcola automaticamente la commissione piattaforma quando crea un pagamento:

- `feeAmount` = importo totale × `PAYMENT_PLATFORM_FEE_RATE`
- `netAmount` = importo totale - `feeAmount`

Quando un pagamento passa a `confirmed`, se `PLATFORM_FEE_WALLET_ADDRESS` è configurato e il provider è `wallet-rpc`, il backend prova a inviare automaticamente la commissione al wallet piattaforma e salva `platformFeeStatus`, `platformFeeTxId`, `platformFeeSentAt` o `platformFeeError` nella transazione.

Nota: il payout automatico della fee richiede un wallet RPC capace di inviare transazioni. Non mettere mai wallet/chiavi nell'app Android: l'app deve parlare solo con il backend.

## Avvio

```bash
npm install
npm start
```

Controllo sintassi:

```bash
npm run check
```

## Esempio

```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amountXmr":"0.05","description":"Lezione MyZubster","confirmations":0}'
```

Per pagamenti ad alto rischio passa `"confirmations":10` o imposta `MONERO_CONFIRMATIONS_DEFAULT=10`.

Se vuoi usare il vecchio prototipo con store JSON locale invece di MongoDB:

```bash
npm run start:json-store
```
