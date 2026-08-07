# MyZubster Gateway API tutorial

This guide is a runnable path through the API exposed by `server.js`. Start
the gateway locally, open `http://localhost:10000/docs`, and use **Try it
out** on any operation. The interactive page loads the same `openapi.yaml`
served by the gateway, so examples stay aligned with the route surface.

## 1. Start the gateway safely

1. Copy `.env.example` to `.env` and set a local MongoDB URL.
2. Set `MONERO_RPC_URL` only to a node you control or are explicitly allowed
   to use. Never put a wallet seed, private key, or RPC credential in this
   documentation.
3. Install dependencies and start the server:

```bash
npm install
npm start
```

The default port is `10000`; override it with `PORT` when necessary.

## 2. Check the service and sensor flow

```bash
curl http://localhost:10000/api/health

curl -X POST http://localhost:10000/api/sensors/data \
  -H 'Content-Type: application/json' \
  -d '{"gardenId":"garden-demo","ph":6.4,"ec":1.2,"temperature":24.1,"humidity":58}'

curl http://localhost:10000/api/sensors/garden/garden-demo/latest
```

Sensor payloads require `gardenId` and `ph`; `ec`, temperature, humidity and
timestamp are optional. The history and statistics endpoints accept a garden
ID and read from MongoDB.

## 3. Monero payment integration

The gateway exposes three read/write-safe building blocks:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/xmr/rate` | Read the configured XMR/MYZ reference rate. |
| `GET` | `/api/xmr/address` | Return the configured receiving address. |
| `POST` | `/api/xmr/verify` | Verify a transaction amount through the configured RPC node. |

Verify a transaction without sending funds:

```bash
curl -X POST http://localhost:10000/api/xmr/verify \
  -H 'Content-Type: application/json' \
  -d '{"txId":"<transaction-id>","expectedAmount":0.05}'
```

The verification response contains `verified`, `amount`, `txId` and a
timestamp. A receiving address is public information, but RPC credentials and
wallet secrets are not; keep those in environment variables outside the
repository. Always verify the amount and confirmations in the node you own or
are authorized to operate before releasing a reward.

## 4. Garden and robot examples

Register a plant, then read the collection:

```bash
curl -X POST http://localhost:10000/api/plants/register \
  -H 'Content-Type: application/json' \
  -d '{"species":"Ocimum basilicum","place":"garden-demo","userId":"demo-user","description":"Basil"}'

curl http://localhost:10000/api/plants
```

Create a robot and inspect aggregate statistics:

```bash
curl -X POST http://localhost:10000/api/robot/create \
  -H 'Content-Type: application/json' \
  -d '{"robotId":"eva-demo","name":"EVA Demo","walletAddress":"<public-address>"}'

curl 'http://localhost:10000/api/robot/stats?refresh=true'
```

The OpenAPI document contains the complete mounted route list, request fields,
response envelopes and error status codes. Use the interactive page for
parameter validation and request replay rather than copying a fictitious
production URL.
