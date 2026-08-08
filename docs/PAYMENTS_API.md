# Payments API

Create payments, track their status, query history, and receive signed webhooks when the status changes. Payments are stored in MongoDB when the gateway has a live connection and in memory otherwise, so the API also works in local runs without a database.

## API

- `POST /api/payments` creates a payment. Accepts `userId`, `amount`, `currency`, and optionally `reference`, `callbackUrl`, `metadata`. Returns `201` with the payment.
- `GET /api/payments/:id` returns the current status, `txId`, and confirmation count.
- `GET /api/payments` returns history. Filters: `userId`, `status`, `currency`, `from`, `to`. Pagination: `limit` (default 50, max 200) and `offset`.
- `POST /api/payments/:id/status` moves a payment to a new `status`, optionally recording `txId`, `confirmations`, and `reason`.
- `GET /api/payments/:id/deliveries` returns the webhook delivery log for a payment.

Currencies are `MYZ` and `XMR`. Amounts must be positive.

## Idempotency

Send an `Idempotency-Key` header (or `idempotencyKey` in the body) on `POST /api/payments`. A repeated key returns the original payment instead of creating a second one, so a retried request cannot double-charge.

## Status machine

```
PENDING ──▶ CONFIRMING ──▶ COMPLETED
   │             └────────▶ FAILED
   ├──▶ COMPLETED / FAILED / CANCELLED / EXPIRED
```

`COMPLETED`, `FAILED`, `CANCELLED`, and `EXPIRED` are terminal. Any other move is rejected with `409`, and every accepted move appends to the payment's `audit` array with a timestamp.

## Webhooks

Set `callbackUrl` at creation and the gateway POSTs on every status change. The response to that create call contains `webhookSecret` — it is returned **once** and never again, so store it then.

Each delivery carries:

| Header | Meaning |
| --- | --- |
| `x-myz-event` | e.g. `payment.completed` |
| `x-myz-timestamp` | delivery time, milliseconds since epoch |
| `x-myz-signature` | `sha256=<hex>` |

The signature is `HMAC-SHA256(secret, "<timestamp>.<raw body>")`. The timestamp is inside the signed string, so a captured delivery cannot be replayed later. Verify against the **raw** body before parsing it:

```js
const { verifyWebhook } = require('./services/paymentService');

const ok = verifyWebhook(
  secret,
  req.get('x-myz-timestamp'),
  rawBody,
  req.get('x-myz-signature'),
);
```

`verifyWebhook` compares in constant time and rejects timestamps outside a five-minute window (`toleranceMs` to override).

Failed deliveries are retried three times with exponential backoff (500ms, 1s, 2s). Delivery is best-effort: a webhook that never lands is recorded in `deliveries` but never rolls back the status change, because the ledger — not the receiver — is the source of truth.

## Tests

```
node --test tests/payments.test.js
```

Covers validation, idempotency, the status machine, signature verification, replay and tamper rejection, retry behaviour, and history filtering.
