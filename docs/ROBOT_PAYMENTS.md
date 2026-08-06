# MYZ/XMR robot payments

The robot payment API creates a unique wallet address for every order, waits for chain confirmations, holds funds in escrow, and releases or refunds them after the service outcome is known.

## Wallet configuration

| Variable | Description |
| --- | --- |
| `TARI_WALLET_URL` / `TARI_WALLET_TOKEN` | MYZ/Tari wallet RPC bridge |
| `MONERO_WALLET_URL` / `MONERO_WALLET_TOKEN` | Monero wallet RPC bridge |
| `MYZ_WEBHOOK_SECRET` / `XMR_WEBHOOK_SECRET` | HMAC secrets for confirmation webhooks |

Wallet bridges implement `POST /addresses` and `POST /refunds`. They must keep private spend keys outside the gateway process. Production deployments should replace the in-memory store with a durable database-backed implementation of the same `save/get/list` interface.

## Flow

1. `POST /api/robot-payments` with `customerId`, `robotId`, `asset`, `amount`, and `refundAddress`.
2. Send funds to the returned `paymentAddress`.
3. The wallet bridge posts a signed confirmation to `/api/robot-payments/webhooks/MYZ` or `/XMR`.
4. MYZ enters escrow after 3 confirmations; XMR enters escrow after 10.
5. `POST /:id/release`, `/:id/dispute`, or `/:id/refund` completes the escrow flow.

Webhook bodies contain `paymentId`, `transactionHash`, `confirmations`, and `amount`. The `x-webhook-signature` header is `sha256=` plus the hex HMAC-SHA256 of the raw JSON body.

The dashboard is available at `/payments-dashboard.html`. Simulated hashes, API records and escrow states are not proof of an on-chain transfer or payment.

Run integration tests with `node --test tests/robotPayments.test.js`.
