# Escrow automation

Drives a job escrow from locked funds to payout or refund without anyone pressing a button, and records every step.

## Why this sits alongside `escrow_robot.js`

The existing flow schedules the payout with `setTimeout(() => autoRelease(jobId), 48h)`. That timer lives only in the running process: **restart the gateway and the release is gone**, leaving the funds locked with nothing left to free them. The 24-hour `deadline` field is written at creation and then never read, so a robot that simply never delivers leaves the client's money locked forever — `refundMYZ` / `refundXMR` are imported but never called.

Here every deadline is a stored timestamp and `tick()` re-derives what is due. A restart costs nothing. There is a test that opens an escrow with one service instance, marks delivery with a second, and ticks with a third — a `setTimeout`-based flow cannot survive that.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/escrow-automation` | Open an escrow and lock the funds |
| `POST` | `/api/escrow-automation/:jobId/delivered` | Record delivery, start the dispute window |
| `POST` | `/api/escrow-automation/:jobId/dispute` | Freeze the escrow |
| `POST` | `/api/escrow-automation/:jobId/resolve` | Human decision: `RELEASE` or `REFUND` |
| `POST` | `/api/escrow-automation/tick` | Advance everything that is due |
| `GET` | `/api/escrow-automation/:jobId` | Current state |
| `GET` | `/api/escrow-automation/:jobId/log` | Full audit trail |
| `GET` | `/api/escrow-automation/summary` | Counts by state and value still in escrow |

## Lifecycle

```
LOCKED ──delivered──▶ DELIVERED ──window elapsed + verified──▶ PAYING_OUT ──▶ RELEASED
   │                      │
   │ delivery deadline    └── verification failed ──▶ DISPUTED ──resolve──▶ RELEASED | REFUNDED
   └──────────────────────────▶ REFUNDED
```

`tick()` is idempotent and safe on a timer: terminal escrows are skipped, and disputed ones are never advanced automatically — a dispute is a request for a human, so the machine stops.

## The payout is resumable

Releasing means two transfers: the robot's net amount, then the platform fee. If the second one fails, the escrow stays in `PAYING_OUT` with the first leg recorded in `payouts`. The next tick retries **only the outstanding leg**, so a wallet blip cannot pay the robot twice. A test asserts the robot leg is sent exactly once across a failure and a retry.

A refund that fails is logged as `REFUND_FAILED` and the state is left alone, rather than marking the escrow settled when the money never moved.

## Verification

Before releasing, `tick()` runs a verifier. The default check is "delivery was recorded". Inject a stricter one — for example the on-chain check from `/api/verification` — and a failure routes the escrow to `DISPUTED` instead of paying out:

```js
new EscrowAutomationService({
  wallet,
  verifier: async (escrow) =>
    escrow.proof ? { ok: true } : { ok: false, reason: 'no proof attached' },
});
```

## Audit log

Every transition appends to `events[]` with a timestamp: `LOCKED`, `DELIVERED`, `VERIFIED` / `VERIFICATION_FAILED`, `PAYOUT_STARTED`, `PAYOUT_LEG_SENT`, `PAYOUT_LEG_FAILED`, `RELEASED`, `REFUNDED`, `REFUND_FAILED`, `DISPUTED`, `DISPUTE_RESOLVED`, `TICK_ERROR`. Nothing is overwritten, so "why did this job pay out" is always answerable after the fact.

## Configuration

| Option | Default |
| --- | --- |
| `feePercent` | `0.02` |
| `jobTimeoutHours` | `24` |
| `disputeWindowHours` | `48` |

Wallet access goes through an adapter over the existing `myz_wallet` / `xmr_wallet` modules, so this inherits whatever those do — including the fact that they are still mocks until a real Tari/Monero wallet is configured. Storage is MongoDB when a connection is live, memory otherwise.

## Tests

```
node --test tests/escrowAutomation.test.js
```

15 passing — fee split, idempotent open, the dispute window boundary, timeout refund, restart survival across three service instances, resumable payout without double-sending, disputes blocking automation, verifier rejection, tick idempotency, failed refunds, and the audit trail.
