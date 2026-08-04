# FCMP++ wallet support

`gateway/xmr_wallet.js` uses Monero wallet RPC for escrow subaddresses,
transaction monitoring, releases, and refunds. Incoming transfers are
classified as RingCT or FCMP++ from wallet RPC metadata and use independent
confirmation targets.

## Configuration

```dotenv
XMR_WALLET_URL=http://127.0.0.1:18083
XMR_REQUIRED_CONFIRMATIONS=10
XMR_FCMP_PLUS_PLUS_ENABLED=false
XMR_FCMP_REQUIRED_CONFIRMATIONS=10
```

`XMR_WALLET_URL` can be a wallet RPC base URL or its `/json_rpc` endpoint.
Enable `XMR_FCMP_PLUS_PLUS_ENABLED` when the connected wallet supports FCMP++.

## Monitoring

- `getTransferStatus(txid, expectedAmount)` monitors a known transaction.
- `getLockStatus(userId)` monitors the subaddress created by `lockXMR`.
- Pool, pending, underpaid, and insufficiently confirmed transfers remain pending.
- Failed and double-spend-seen transfers are reported as failed.
- `getWalletCapabilities()` reports wallet version, height, protocol support,
  and both confirmation policies.

FCMP++ detection accepts forward-compatible fields including `protocol`,
`proof_type`, `tx_type`, `transaction_type`, and boolean FCMP markers.
