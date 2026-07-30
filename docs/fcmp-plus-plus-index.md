# FCMP++ Documentation Index for MyZubster

Issue #56 -- `[RESEARCH] FCMP++ Integration for MyZubster` (reward 0.01 XMR).

This index ties together the FCMP++ research deliverables for issue #56 and maps
each requested deliverable to the file that satisfies it. Everything below is
**research and documentation only**; no live node, wallet, key, seed, signature,
or broadcast was used or generated.

## Deliverable mapping (issue #56)

| Issue #56 deliverable | Where it is satisfied |
|---|---|
| 1. Research FCMP++ -- understand how it works | `fcmp-plus-plus-research.md` sections 1-5 |
| "  -- identify benefits for MyZubster | `fcmp-plus-plus-research.md` section 7 |
| "  -- document integration requirements | `fcmp-plus-plus-research.md` section 8 |
| 2. Test on Testnet -- set up a node, test, verify | Deferred to `fcmp-plus-plus-testnet-guide.md` (future-run manual; FCMP++ not activated on any network today, see research section 9) |
| 3. Documentation -- write an integration guide | `fcmp-plus-plus-testnet-guide.md` |
| "  -- update MyZubster documentation | This index file |
| "  -- share findings with the community | Pull request body for issue #56 |

## Files in this delivery

- `docs/fcmp-plus-plus-research.md` -- FCMP++ background, mechanism (curve trees /
  Seraphis), comparison to ring signatures, benefits for MyZubster, integration
  requirements, honest current-status, open questions, references.
- `docs/fcmp-plus-plus-testnet-guide.md` -- testnet integration manual written as
  a future-run checklist (it is intentionally *not* a log of a run that
  happened, because FCMP++ is not activated on testnet/stagenet/mainnet yet).
- `docs/fcmp-plus-plus-index.md` -- this file.
- `tools/verify-fcmp-docs.js` -- standalone Node verifier (no dependencies) that
  asserts the docs above contain the required sections, meet word-count
  thresholds, reference issue #56, and contain no mainnet key / seed material.
  Run with `node tools/verify-fcmp-docs.js`; exit 0 means pass.

## How to verify this delivery

```
node tools/verify-fcmp-docs.js
```

Expected output: a `PASS` summary and exit code `0`.

## Honest status note

FCMP++ is under active development in `seraphis-migration` and is **not**
activated on mainnet, stagenet, or testnet. No claim of a live testnet run is
made, because none is currently possible. The testnet deliverable is therefore
delivered as the manual to follow the moment an upstream activation exists,
which is the only honest way to fulfil it today.

## References

- Issue #56 -- https://github.com/MyZubster-Ecosystem/MyZubsterGateway/issues/56
- Monero Research Lab -- https://github.com/monero-project/research-lab
- FCMP++ / Seraphis development -- https://github.com/seraphis-migration
- Monero RPC documentation -- https://docs.getmonero.org/rpc/

---

AI-assisted drafting disclosed in the pull request. No real wallets, seeds,
keys, or transactions were used or generated for this documentation.
