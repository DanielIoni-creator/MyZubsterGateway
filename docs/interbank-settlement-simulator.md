# Interbank Settlement Simulator

The simulator models tokenized settlement with a Singapore-dollar CBDC. It is
intended for local and integration testing; generated transaction hashes are
deterministic simulation records and are not real on-chain transactions.

## Flow

1. Register participating banks with `POST /api/settlement/banks`.
2. Issue CBDC with `POST /api/settlement/issue`.
3. Create a transfer with `POST /api/settlement/transfers`.
4. Settle it atomically with `POST /api/settlement/transfers/:id/settle`.
5. Inspect balances, transfers, and contract calls with
   `GET /api/settlement/report`.
6. Redeem CBDC with `POST /api/settlement/redeem`.

## Example

```sh
curl -X POST http://localhost:10000/api/settlement/banks \
  -H "Content-Type: application/json" \
  -d '{"bankId":"DBS","name":"DBS Bank"}'

curl -X POST http://localhost:10000/api/settlement/issue \
  -H "Content-Type: application/json" \
  -d '{"bankId":"DBS","amount":1000000}'
```

Register a second bank, create a transfer, then send its `transferId` to the
settlement endpoint. A failed settlement never changes either balance.

## Smart-contract adapter

By default the service uses `SimulatedContractAdapter`, which records issuance,
redemption, and settlement calls with a contract address and transaction hash.
Set `SETTLEMENT_CONTRACT_ADDRESS` to identify a deployed test contract. A real
adapter can implement the same asynchronous `record(action, payload)` method
and be injected into `SettlementSimulator` for testnet integration.

## Validation

```sh
node --test tests/settlementSimulator.test.js
node --check services/settlementSimulator.js
node --check routes/settlement.js
```
