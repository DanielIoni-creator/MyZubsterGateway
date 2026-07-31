# FCMP++ Wallet Support

MyZubsterGateway accepts current RingCT wallet transfers and can now track
future FCMP++ wallet RPC transfer records without changing marketplace payment
flows.

## Configuration

Set these values for the wallet RPC process:

```dotenv
MONERO_RPC_URL=http://monero:18081
MONERO_NETWORK=mainnet
MONERO_REQUIRED_CONFIRMATIONS=10
MONERO_FCMP_PLUS_PLUS_ENABLED=false
MONERO_FCMP_REQUIRED_CONFIRMATIONS=10
```

- `MONERO_RPC_URL` may point at a wallet RPC base URL or a `/json_rpc` URL.
- `MONERO_REQUIRED_CONFIRMATIONS` is used for existing RingCT transfers.
- `MONERO_FCMP_PLUS_PLUS_ENABLED` advertises FCMP++ readiness in wallet
  capability checks.
- `MONERO_FCMP_REQUIRED_CONFIRMATIONS` lets operators raise or lower the
  confirmation threshold used for transfers reported as `fcmp++`.

## Monitoring Behavior

The wallet monitor requests incoming, pool, pending, and failed transfers from
the wallet RPC. Each transfer is normalized before status updates:

- pool or pending transfers remain `pending`
- underpaid transfers remain `pending`
- transfers below the configured confirmation target remain `pending`
- failed or double-spend-seen transfers become `failed`
- transfers that meet amount and confirmation requirements become `confirmed`

FCMP++ detection is intentionally forward-compatible. It recognizes RPC fields
such as `protocol`, `proof_type`, `tx_type`, `transaction_type`, or boolean
FCMP markers when wallet RPC starts exposing them.

## Webhook Payloads

Confirmed payment webhooks include confirmation metadata so downstream services
can audit how the wallet classified the payment:

```json
{
  "status": "confirmed",
  "txHash": "transaction-hash",
  "protocol": "fcmp++",
  "confirmations": 15,
  "requiredConfirmations": 15
}
```

## Capability Check

`moneroService.getWalletCapabilities()` calls `get_version` and `get_height`
on wallet RPC and returns the configured protocol list. This can be exposed by
an admin route later without changing the payment monitor.
