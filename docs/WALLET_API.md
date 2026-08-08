# Wallet API

Programmatic access to MYZ and XMR balances, the transaction ledger, transfers between users, and a time-bucketed statement. Backed by MongoDB when the gateway has a live connection and by memory otherwise, so the API also works in local runs without a database.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/wallet/:userId/balance` | Per-currency `available` / `pending` / `locked` / `posted` |
| `GET` | `/api/wallet/:userId/transactions` | Ledger entries — filter by `currency`, `type`, `state`, `from`, `to`; `format=csv` to export |
| `GET` | `/api/wallet/:userId/history` | Bucketed statement — `interval=day\|week\|month` |
| `POST` | `/api/wallet/transfers` | Move funds between users |
| `GET` | `/api/wallet/transfers/:transferId` | Both legs of one transfer |
| `POST` | `/api/wallet/deposits` | Credit an account |
| `POST` | `/api/wallet/withdrawals` | Debit an account |

Currencies are `MYZ` and `XMR`. Amounts must be positive.

## Why a double-entry ledger

Balances are **derived**, never stored. Every movement writes a matching debit and credit sharing one `transferId`, and `GET /balance` sums the entries on demand:

```
available = Σ(POSTED credits − POSTED debits) − Σ(LOCKED holds)
pending   = Σ(PENDING credits − PENDING debits)
```

A stored balance field can drift out of sync with its own history after a crash or a partial write, and once it does there is no way to tell which number is right. A derived balance cannot disagree with the ledger, because it *is* the ledger. The test suite asserts this invariant directly.

Sums are rounded to 12 decimals (XMR's precision) so repeated fractional additions do not accumulate float error — `0.1 + 0.2` reports `0.3`, not `0.30000000000000004`.

## Safety properties

**No overdrafts.** A transfer checks the sender's available balance first and refuses with `409` if it is short. Nothing is written on a rejected transfer — not even the debit leg.

**No double-spends on retry.** Send an `Idempotency-Key` header (or `idempotencyKey` in the body). A repeated key returns the original transfer rather than moving the money twice, so a client retrying after a timeout is safe.

**No concurrent overdraw.** Balance-check and ledger-append are serialised, so two simultaneous transfers cannot both observe the same balance and both succeed. This guard is in-process; a multi-instance deployment relies on the MongoDB transaction in `MongoLedgerStore` to carry the same guarantee, and that is where to look first when scaling out.

**Atomic legs.** Both entries of a transfer are appended together. A crash between them would leave money created or destroyed, so the store writes all-or-nothing.

## Tests

```
node --test tests/wallet.test.js
```

16 passing — balance derivation against raw entries, overdraft rejection leaving no trace, idempotent replay, concurrent-transfer serialisation, currency isolation, float-drift resistance, filtering and pagination, history bucketing with a closing balance that reconciles against `/balance`, and CSV escaping.
