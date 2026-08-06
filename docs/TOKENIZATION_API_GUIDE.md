# Tokenisation API Integration Guide

The contract at [`docs/openapi/tokenization.json`](openapi/tokenization.json)
covers tokenised assets, wallet compliance, transaction screening, and
institutional delivery-versus-payment settlement.

It is contract-first. An operation marked `x-implementation-status:
contract-first` must not be treated as deployed until its gateway module ships.

## Request rules

- Send `Authorization: Bearer <token>` for every operation.
- Send a unique `Idempotency-Key` for writes.
- Encode financial amounts as decimal strings, not JSON floating-point numbers.
- Store request, transaction, screening, and settlement IDs for reconciliation.
- A simulated or pending transaction hash is not proof of final settlement.

## Bank integration

1. Complete institutional onboarding and bind each approved wallet.
2. Register the asset and retain its `assetId`.
3. Read participant eligibility and screen the proposed transaction.
4. Create a settlement only after an `ALLOW` decision.
5. Poll until `SETTLED`; HTTP 202 means accepted, not final.
6. Reconcile both asset and cash transaction references.

```sh
curl -X POST https://myzubsterapp.onrender.com/api/institutional/settlements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: trade-2026-0042-v1" \
  -H "Content-Type: application/json" \
  -d '{"assetId":"asset_01","assetAmount":"25000.00","sellerWalletId":"wallet_bank_01","buyerWalletId":"wallet_fund_01","cashCurrency":"SGD-CBDC","cashAmount":"2497500.00","reference":"trade-2026-0042"}'
```

## Fund integration

Maintain a stable mapping between investor records, fund accounts, and wallet
IDs. Refresh KYC/KYB before `verifiedUntil`, screen subscriptions, transfers,
and redemptions, and stop when a decision is `REVIEW` or `BLOCK`.

```json
{
  "success": true,
  "data": {
    "screeningId": "screen_01",
    "decision": "ALLOW",
    "reasons": [],
    "expiresAt": "2026-08-06T05:00:00Z"
  }
}
```

## State models

```text
Asset:      DRAFT -> ACTIVE -> SUSPENDED -> ACTIVE
                              -> REDEEMED
Settlement: PENDING -> LOCKED -> SETTLED
                    -> FAILED / CANCELLED
```

## Errors and retries

```json
{
  "success": false,
  "error": {
    "code": "COMPLIANCE_REJECTED",
    "message": "Recipient wallet is not eligible",
    "requestId": "req_01",
    "details": {}
  }
}
```

| Status | Client action |
|---|---|
| 400 | Correct the request; do not retry unchanged. |
| 401/403 | Refresh credentials or resolve eligibility. |
| 404 | Verify environment and resource ID. |
| 409 | Read the existing resource or use a new idempotency key. |
| 422 | Resolve balance, lifecycle, or business-rule failure. |
| 429 | Back off using server retry guidance. |
| 5xx | Retry with backoff and the same idempotency key. |

## FAQ

### Are these endpoints live?

Not necessarily. Check `x-implementation-status` and the deployment release.

### Why are amounts strings?

Decimal strings avoid floating-point loss in ledgers and smart contracts.

### Does a transaction hash prove payment?

No. Verify it on the canonical network and wait for required finality. Values
such as `tx_sim` are simulation records only.

### What happens when screening returns REVIEW?

Do not submit the transaction. Route it through the institution's compliance
process and create a new screening after resolution.

### Can a write be retried?

Yes, with the same idempotency key and identical payload. A different payload
must use a new key.

### How should institutions reconcile settlement?

Match internal reference, settlement ID, both transaction hashes, quantities,
participants, and timestamps. Escalate partial or mismatched states.

## Troubleshooting

1. Confirm the base URL and release support the operation.
2. Validate the request against the OpenAPI document.
3. Check token expiry, scopes, and wallet binding.
4. Check asset state, eligibility, screening expiry, and balances.
5. Search logs by `requestId`, then transaction or settlement ID.
6. Retry transient failures with the original idempotency key.
7. Never substitute a simulated hash for a failed real-network transaction.
