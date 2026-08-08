# Monero payment gateway (BENZINA-XMR)

Takes XMR at the pump: one subaddress per order, confirmation-gated settlement, and no credentials in logs.

## Why not extend `services/xmrService.js`

That module cannot work as a gateway, for four reasons worth stating plainly:

1. **`generatePaymentAddress()` returns one static address for every customer.** With a shared address there is no way to tell whose payment arrived — two customers paying the same amount are indistinguishable. Attribution has to come from the address itself.
2. **`get_transaction` is not a Monero RPC method.** The daemon exposes `get_transactions` (plural, `txs_hashes`); the wallet exposes `get_transfer_by_txid`. The call is also aimed at port 18081 — the daemon — while reading `tx.amount`, a wallet-level field.
3. **`verified: amount >= expectedAmount` ignores confirmations entirely.** A zero-confirmation transaction would pass. At a fuel pump that means dispensing against a reversible payment.
4. **No authentication.** `monero-wallet-rpc` is normally behind digest auth.

So this is a separate service. `xmrService.js` is untouched, and nothing currently using it changes.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/xmr-gateway/health` | Wallet reachability and chain height |
| `POST` | `/api/xmr-gateway/invoices` | Create an invoice — returns a dedicated subaddress |
| `GET` | `/api/xmr-gateway/invoices/:orderId` | Current state |
| `POST` | `/api/xmr-gateway/invoices/:orderId/check` | Re-read the chain for this invoice |
| `POST` | `/api/xmr-gateway/sweep` | Advance every open invoice |
| `POST` | `/api/xmr-gateway/validate-address` | Ask the wallet whether an address is real |
| `GET` | `/api/xmr-gateway/summary` | Counts by state and settled total |

## Invoice states

```
AWAITING_PAYMENT ──▶ PARTIALLY_PAID ──▶ CONFIRMING ──▶ PAID
        │
        └── ttl elapsed, nothing received ──▶ EXPIRED
```

**Fuel is dispensed on `PAID` only**, which requires `XMR_MIN_CONFIRMATIONS` (default 10). When an invoice is paid by several transfers, the **least-confirmed** one gates it: enough money that is only one block deep is not yet money.

**A partial payment keeps the invoice open** rather than expiring it, so the customer can top up instead of losing what they already sent. Only an invoice with nothing received can expire.

**An overpayment settles** and is recorded as an `OVERPAID` event. **A transfer flagged `double_spend_seen` is ignored** and does not count toward the total.

## Money is never a float

Amounts are parsed into atomic piconero as `BigInt` and only formatted for display. A double cannot hold 12 decimals without drift, and a gateway that is off by a rounding error is a gateway that loses money in one direction and overcharges in the other. `0.1 + 0.2` reports exactly `0.3`, and there is a test for it. Atomic values cross the API and the database as **strings** for the same reason.

Rejected at the door: negative amounts, zero, more than 12 decimal places, exponent notation, and anything non-numeric.

## Security

- **Digest auth** via `MONERO_RPC_USER` / `MONERO_RPC_PASSWORD`.
- **Credentials are scrubbed from errors.** The RPC password lives in the axios config, which axios copies into its error objects — so every error is passed through `redact()` before it can reach a log line or an HTTP response. There is a test asserting the password never appears in a thrown error.
- **Addresses are validated by the wallet**, not by a regex in our code.
- **Invoices expire**, so a stale address is not left indefinitely associated with an open order.
- Confirmation gating is the anti-double-spend measure; `double_spend_seen` transfers are dropped outright.

## Configuration

| Variable | Default | Effect |
| --- | --- | --- |
| `MONERO_WALLET_RPC_URL` | *(unset)* | monero-wallet-rpc endpoint. Unset means simulation mode. |
| `MONERO_RPC_USER` / `MONERO_RPC_PASSWORD` | *(unset)* | Digest auth |
| `XMR_MIN_CONFIRMATIONS` | `10` | Blocks before `PAID` |

With `MONERO_WALLET_RPC_URL` unset the routes run against an in-memory wallet and report `"simulated": true`. A simulated `PAID` is not a real payment — do not wire a pump to it.

## Tests

```
node --test tests/moneroGateway.test.js
```

22 passing — exact atomic conversion and every rejected amount form, one subaddress per invoice, idempotent creation, zero-confirmation never settling, the least-confirmed transfer gating a multi-transfer invoice, top-up after partial payment, overpayment, double-spend rejection, cross-invoice isolation, ttl expiry sparing partially paid invoices, sweep skipping settled invoices, wallet-side address validation, and the password never leaking into an error.
