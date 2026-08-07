# Dispute resolution

Settles contested escrow jobs through evidence, a mediator vote, and deadlines that guarantee a verdict.

## The property that matters

A dispute system fails the party who is **in the right**. If the process can stall, their money stays frozen and the other side wins by simply not participating. So every stage here has a deadline, and `tick()` resolves anything that runs out of time. A dispute cannot sit open indefinitely.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/disputes` | Open a dispute against a job |
| `POST` | `/api/disputes/:id/evidence` | Submit evidence (parties only) |
| `POST` | `/api/disputes/:id/mediators` | Fix the mediator panel |
| `POST` | `/api/disputes/:id/votes` | Cast a mediator vote |
| `POST` | `/api/disputes/tick` | Advance everything that is due |
| `GET` | `/api/disputes/:id` | Full state, evidence, votes, audit trail |
| `GET` | `/api/disputes/job/:jobId` | Every dispute on a job |
| `GET` | `/api/disputes/summary` | Docket counts by state and outcome |

## Lifecycle

```
EVIDENCE ──window closes, respondent answered, panel ready──▶ VOTING ──▶ RESOLVED
    │                                                             │
    └── respondent never answered ──▶ RESOLVED (REFUND)           └── deadline, no majority ──▶ RESOLVED (REFUND)
```

Outcomes are `RELEASE`, `REFUND` or `SPLIT`.

## Design decisions worth knowing

**Assigning mediators does not start the vote.** The parties keep their full evidence window even once a panel is lined up; `tick()` opens voting when the window closes. Otherwise whoever assigns mediators could cut short the other side's chance to answer.

**A party can never mediate their own dispute.** Attempting it is rejected by name, not silently filtered.

**Voting resolves as soon as the result is mathematically certain.** Once no distribution of the outstanding votes could overturn the leader, the verdict lands. Waiting for stragglers when the outcome is already decided just keeps the funds frozen — with a three-person panel, two matching votes end it.

**A silent respondent forfeits.** If the evidence window closes and the respondent never submitted anything, the claimant wins by default. Ignoring a dispute must not be a viable strategy.

**No majority means refund, not payout.** If the voting deadline passes below quorum, or with a tie, the money goes back to the client. Paying out a contested job on an inconclusive vote is the worse error: the client loses money they might be owed, whereas a refund only costs the robot work it could not get the panel to endorse.

**The verdict survives a downstream failure.** `onResolved` notifies the escrow. If that call throws, the resolution still stands and the failure is logged as `ESCROW_NOTIFY_FAILED` — losing a decided verdict because a callback timed out would be worse than a retryable notification.

## Wiring to the escrow

`services/escrowAutomationService.js` routes a failed verification to `DISPUTED`. Point this service back at it:

```js
const disputes = new DisputeService({
  onResolved: ({ jobId, outcome }) =>
    escrow.resolve({ jobId, outcome: outcome === 'RELEASE' ? 'RELEASE' : 'REFUND' }),
});
```

## Configuration

| Option | Default |
| --- | --- |
| `evidenceWindowHours` | `72` |
| `votingWindowHours` | `72` |
| `quorum` | `2` — minimum votes for a verdict to count |

Storage is MongoDB when a connection is live, memory otherwise.

## Tests

```
node --test tests/disputes.test.js
```

17 passing — evidence access control, panel conflict-of-interest, the evidence window surviving early mediator assignment, early resolution on an unbeatable lead, holding when the lead is still reachable, silent-respondent forfeit, sub-quorum and tied fallbacks, verdict survival when the escrow callback throws, tick idempotency, and the docket summary.
