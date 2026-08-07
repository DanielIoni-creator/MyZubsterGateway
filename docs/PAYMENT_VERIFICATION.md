# Automated payment verification

Checks payments against the chain instead of trusting what the sender claims: reads confirmations from `monero-wallet-rpc`, settles a payment once it is deep enough, and flags anything that does not add up.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/verification/verify` | Check one payment now |
| `POST` | `/api/verification/sweep` | Check a batch, skipping already-settled ones |
| `GET` | `/api/verification/:paymentId` | Latest verdict, confirmations and history |
| `GET` | `/api/verification/anomalies` | Every record carrying at least one anomaly |
| `GET` | `/api/verification/report` | Aggregate counts, anomaly breakdown, confirmed value |

A subject is `{ paymentId, txId, expectedAmount, expectedAddress, currency, createdAt }`.

## Verdicts

- **PENDING** — the transaction is on-chain but below `XMR_MIN_CONFIRMATIONS` (default 10), or too young to worry about being missing yet.
- **CONFIRMED** — deep enough, right address, right amount.
- **REJECTED** — a blocking anomaly was found. Never auto-recovers; a human decides what to do.

## Anomalies

| Code | Meaning | Blocks settlement |
| --- | --- | --- |
| `TX_NOT_FOUND` | Never appeared on-chain within the grace window (default 1h) | yes |
| `UNDERPAID` | On-chain amount is short | yes |
| `OVERPAID` | On-chain amount exceeds the invoice | **no** |
| `ADDRESS_MISMATCH` | Paid to an address we did not issue | yes |
| `DOUBLE_SPEND_SEEN` | The daemon flagged a double spend | yes |
| `REORG_SUSPECTED` | Confirmations moved backwards | yes |
| `TXID_REUSED` | The same transaction is already credited to another payment | yes |

Three of these deserve a word on *why*:

**Overpayment does not block.** Holding a customer's order hostage because they sent too much punishes them for our accounting convenience. It is recorded, reported, and settled.

**Confirmations moving backwards is treated as a reorg.** On a healthy chain the count only grows. A drop means the block was orphaned and the payment is no longer settled — silently keeping the old `CONFIRMED` would mean shipping goods against money that no longer exists.

**A reused txid is refused.** Without this check, replaying one transaction hash against several invoices would credit each of them.

## Missing transactions

A transaction can legitimately be absent for a short while after broadcast, so absence alone is not an anomaly. Only a subject older than `missingTxGraceMs` (default one hour) that still has nothing on-chain is rejected.

## Sweeping

`sweep(subjects)` is built for a scheduler: subjects that already reached `CONFIRMED` or `REJECTED` are skipped, so a timer can re-run it over the same list without reopening settled payments or hammering the daemon. A chain lookup that throws is contained to its own subject and reported as `ERROR` — one unreachable daemon call does not abort the batch.

## Configuration

| Variable | Default | Effect |
| --- | --- | --- |
| `XMR_WALLET_URL` | *(unset)* | monero-wallet-rpc endpoint. Unset means simulation mode. |
| `XMR_MIN_CONFIRMATIONS` | `10` | Blocks required before `CONFIRMED` |

With `XMR_WALLET_URL` unset the routes run against an in-memory `SimulatedChain` and report `"simulated": true` in every response, so the endpoints work locally without a daemon. A simulated verdict is not proof of settlement.

Storage is MongoDB when a connection is live and memory otherwise.

## Tests

```
node --test tests/paymentVerification.test.js
```

15 passing — the confirmation threshold, each anomaly above, the grace window for missing transactions, reorg detection across two observations, terminal verdicts surviving a later chain change, per-subject error isolation during a sweep, and report aggregation.
