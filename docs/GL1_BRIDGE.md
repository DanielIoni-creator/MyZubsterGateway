# GL1 cross-border bridge

The GL1 bridge converts between MYZ and configured GL1 assets through expiring quotes and an auditable lock/issue state machine. Source funds are unlocked automatically if destination issuance fails.

## API

- `POST /api/gl1/quotes` accepts `direction`, `amount`, and `gl1Asset`.
- `POST /api/gl1/transfers` accepts the quote, `sender`, `beneficiary`, and an `idempotencyKey`.
- `GET /api/gl1/transfers` and `/api/gl1/transfers/:id` expose status and audit events.

Directions are `MYZ_TO_GL1` and `GL1_TO_MYZ`. Amounts are transported as decimal strings. Idempotency keys must be stable per customer order.

## Configuration

Set `GL1_API_URL` and `GL1_API_TOKEN` for the institutional GL1 endpoint. Set `GL1_SIMULATOR=true` for local integration tests. Production deployments must replace `MyzLedgerSimulator` and the in-memory transfer store with authenticated Tari and durable database adapters before handling funds.

The GL1 client expects `/v1/quotes`, `/v1/locks`, `/v1/mints`, and `/v1/unlocks`. Every successful lock and issuance must return a unique identifier. A simulated identifier is not an on-chain transaction or proof of settlement.

Run the integration suite with `node --test tests/gl1Bridge.test.js`.
