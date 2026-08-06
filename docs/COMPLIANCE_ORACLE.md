# Compliance Oracle

The compliance oracle aggregates sanctions, KYC and transaction-limit feeds, creates a deterministic snapshot root, and publishes it through a configurable relay to `ComplianceOracle.sol`.

## Configuration

| Variable | Purpose |
| --- | --- |
| `COMPLIANCE_SANCTIONS_URL` | JSON feed containing a `sanctions` address array |
| `COMPLIANCE_KYC_URL` | JSON feed containing a `wallets` array |
| `COMPLIANCE_LIMITS_URL` | JSON feed containing `transactionLimit` |
| `COMPLIANCE_ORACLE_RELAY_URL` | Authenticated relay that submits the snapshot on-chain |
| `COMPLIANCE_ORACLE_RELAY_TOKEN` | Bearer token for the relay |
| `COMPLIANCE_REFRESH_MS` | Refresh interval; defaults to 15 minutes |

Feed payloads may include all three fields. Wallet records use `{ "address", "kycApproved", "validUntil" }`. Amounts are decimal strings to avoid floating-point conversion.

## API

- `GET /api/compliance-oracle/status` returns freshness, root and publication status.
- `GET /api/compliance-oracle/snapshot` returns the latest normalized snapshot.
- `POST /api/compliance-oracle/refresh` triggers an immediate refresh.
- `GET /api/compliance-oracle/verify/:address?amount=100` verifies a wallet and amount.

The service rejects partial refreshes when any configured source fails. With no relay URL it runs in dry-run mode; a dry-run root is not an on-chain transaction and must never be presented as payment or settlement proof.

## Smart-contract integration

Deploy `gateway/contracts/ComplianceOracle.sol`, retain the deployer as the authorized oracle owner, and configure the relay to call `publishSnapshot` and `updateWallet`. Consumer contracts can call `verify(wallet, amount)` and receive an approval flag plus a stable rejection reason.

Run the integration tests with:

```bash
node --test tests/complianceOracle.test.js
```
