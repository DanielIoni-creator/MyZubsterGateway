# Monero Escrow 2-of-3 Smart Contract — API Documentation

> Bounty #883 — Implement Escrow Smart Contract 2-of-3  
> Reward: 500 MYZ | Priority: High

## Overview

The Monero Escrow 2-of-3 smart contract enables secure, trustless transactions on the MyZubster marketplace. It uses a 2-of-3 multi-signature scheme where any two of three parties (Buyer, Seller, Arbitrator) must agree to release or refund funds.

## Architecture

```
┌─────────┐     ┌──────────┐     ┌───────────┐
│  Buyer  │     │  Seller  │     │ Arbitrator│
└────┬────┘     └────┬─────┘     └─────┬─────┘
     │               │                │
     └───────────────┼────────────────┘
                     │
              ┌──────▼──────┐
              │ 2-of-3      │
              │ Multisig    │
              │ Escrow      │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │   Monero    │
              │   Network   │
              └─────────────┘
```

## State Machine

```
CREATED ──fund()──▶ FUNDED ──signRelease(x2)──▶ RELEASED
                      │
                      ├──signRefund(x2)──▶ REFUNDED
                      │
                      ├──autoRefund()───▶ REFUNDED
                      │
                      └──openDispute()──▶ DISPUTED ──resolveDispute(x2)──▶ RESOLVED
```

## API Endpoints

### Create Escrow
**POST** `/api/escrow-2of3/create`
```json
{
  "id": "escrow_001",
  "buyer": "buyer_wallet",
  "seller": "seller_wallet",
  "arbitrator": "arbitrator_wallet",
  "amount": 500,
  "description": "Transaction for item X",
  "timeoutHours": 72
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "escrow_001",
    "status": "CREATED",
    "amount": 500,
    "timeoutHours": 72
  }
}
```

### Fund Escrow
**POST** `/api/escrow-2of3/fund`
```json
{ "id": "escrow_001", "caller": "buyer_wallet" }
```

### Sign Release (2-of-3)
**POST** `/api/escrow-2of3/sign-release`
```json
{ "id": "escrow_001", "caller": "seller_wallet" }
```
- Requires 2-of-3 signatures from {buyer, seller, arbitrator}
- Funds released to seller when threshold met

### Sign Refund (2-of-3)
**POST** `/api/escrow-2of3/sign-refund`
```json
{ "id": "escrow_001", "caller": "buyer_wallet" }
```

### Open Dispute
**POST** `/api/escrow-2of3/dispute`
```json
{ "id": "escrow_001", "caller": "buyer_wallet", "reason": "Item not as described" }
```

### Resolve Dispute
**POST** `/api/escrow-2of3/resolve`
```json
{
  "id": "escrow_001",
  "caller": "arbitrator_wallet",
  "resolution": "split",
  "splitRatio": { "buyer": 0.5, "seller": 0.5 }
}
```
Resolution types: `release_to_seller`, `refund_to_buyer`, `split`

### Auto-Refund
**POST** `/api/escrow-2of3/auto-refund`
```json
{ "id": "escrow_001" }
```

### Get Escrow
**GET** `/api/escrow-2of3/:id`

### List Escrows
**GET** `/api/escrow-2of3?status=FUNDED&party=buyer_wallet`

### Statistics
**GET** `/api/escrow-2of3/stats/overview`

## Security

- All three parties must be distinct
- Only the buyer can fund the escrow
- 2-of-3 signatures required for any fund movement
- Timeout-based auto-refund protects buyer
- Dispute resolution requires 2-of-3 again (arbitrator + one party)
- Split resolution with configurable ratios

## Integration

The module integrates with the MyZubster Gateway:
- Monero blockchain for actual fund locking/release
- JWT authentication for all endpoints
- MongoDB for persistent escrow storage (in-memory for prototype)

## Testing

```bash
npm test -- escrow2of3
```

Coverage: 20+ test cases covering creation, funding, release, refund, dispute, resolution, and edge cases.
