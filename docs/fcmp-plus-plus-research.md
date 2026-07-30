# FCMP++ Integration Research for MyZubster

Issue #56 — `[RESEARCH] FCMP++ Integration for MyZubster`

Status: **Research / documentation only.** FCMP++ is still under development
upstream and has not been activated on mainnet, stagenet, or testnet. This
document analyses the technology, the benefits for MyZubster, and the
preconditions for a production integration. It deliberately does **not**
propose a live testnet run, because that is not safely possible yet (see
*Current Status* and `fcmp-plus-plus-testnet-guide.md`).

## 1. Executive Summary

FCMP++ (Full-Chain Membership Proofs Plus) is the next-generation transaction
privacy mechanism proposed for Monero. It is intended to replace the current
ring signatures + key images model that RingCT has used since 2017. Where a
ring signature proves an input spends one of `N` decoy outputs (today `N = 16`),
an FCMP++ proof proves membership against the *entire eligible output set of
the chain*, removing the dependency on decoy selection and the analytic
weaknesses that follow from it.

For MyZubster -- a privacy-first Monero payment gateway -- FCMP++ materially
raises the bar for transaction privacy, eliminates a class of deanonymisation
attacks that ring signatures are exposed to, and removes the ceiling that decoy
supply places on effective privacy in young / low-volume chains. Delivering it
requires a Seraphis wallet-protocol migration, consensus-rule changes in
`monerod`, and a wallet/RPC layer update; none of that is in scope for the
research issue itself.

## 2. Background: How Monero Hides Senders Today

Monero transactions today combine three primitives:

1. **Ring signatures** -- each input is signed together with `N - 1` decoy
   "one-time" outputs (OTOs) plausibly drawn from the chain, so an observer
   cannot tell which output is actually spent. The current protocol caps the
   ring at 16 (with a growing fraction forced to 16 over time).
2. **Key images** -- a per-input cryptographic tag that reveals whether the
   same output is double-spent, without identifying which output it was.
3. **RingCT** (Ring Confidential Transactions) -- Pedersen commitments hide
   amounts while proving inputs balance with outputs.

This construction has held up cryptographically, but its *privacy* depends
heavily on the ring size `N` and on how decoys are selected.

## 3. Limitations of the Ring-Signature Model

- **Decoy dependence.** A real spent output is hidden inside `N` candidates.
   Statistical work over the years (Mosser et al. 2017-2018, and later
   "chain-reaction"/EABE-style analyses) showed that cleverly picked decoys can
   still leak which output is the true one when the decoy distribution does not
   match the real spend distribution.
- **Decoy exhaustion.** On young or low-activity chains, or for outputs older
   than the bulk of the chain, there may not be enough eligible decoys to fill a
   size-16 ring. Privacy degrades silently.
- **Output-age analysis.** Because decoys are sampled by output age, the *age*
   of the true output leaks through the age distribution of the ring.
- **Chain relation / "DAG" analysis.** Reusing an output as a decoy in a later
   transaction, combined with timing and amount hints, has been used to prune
   candidate sets.
- **No forward secrecy on membership.** New analytic techniques discovered
   against old rings can retroactively reduce the privacy of transactions
   already on-chain; the ring size is fixed at confirmation time.

None of this means Monero is "broken", but it explains why the community has
invested several years into a successor that is structurally robust to these
attacks rather than relying on a tuned decoy sampler.

## 4. What FCMP++ Is

FCMP++ removes the per-transaction ring entirely. Instead of signing a
size-`N` ring, the wallet proves three things cryptographically:

1. **Full-chain membership** -- the input commits to spending an output that
   genuinely belongs to the *whole* eligible output set of the chain (every
   spendable OTO), not a small subset. An attacker trying to rule out
   candidates must therefore rule out the entire chain.
2. **No inflation** -- the proof ties inputs to outputs without allowing a
   forged amount or an extra input to sneak in.
3. **Unlinkability of the key image** -- the double-spend identifier remains
   computationally unlinkable to the real output, as with key images today.

The "Plus Plus" denotes that the construction additionally proves
ownership/spend-authority and output reference binding in the same proof object,
rather than bolting them on with a separate signature.

## 5. How FCMP++ Works (Sketch)

An FCMP++ proof is built on **curve trees**, a recursive hash/Merkle-like
structure composed of Pedersen commitments over two alternating EC curves. In
simplified terms:

1. **Tree of eligible outputs.** The eligible output set is arranged into a
   curve-tree of commitments whose leaves are spendable OTOs. Membership in the
   full set is expressed as a path from a leaf to the public root.
2. **Recursive membership proof.** For a leaf `L` claimed to be in the set,
   the prover shows a valid path `L -> ... -> root`, each hop being a
   zero-knowledge relation on the commitments. The proof size and verification
   cost scale **logarithmically** with the number of eligible outputs, so a set
   of tens of millions remains practical.
3. **Amount / ownership binding.** The same proof machinery binds the leaf to
   a commitment-to-amount and to the wallet's spend key, so verifying the proof
   also confirms balance and spend-authority without a separate ring signature.
4. **Key-image analogue.** A separate, unlinkable tag (derived under Seraphis)
   serves as the double-spend token, stored and checked by the node.

FCMP++ is implemented on top of the **Seraphis** wallet abstraction (the
wallet-protocol rewrite kept in `seraphis-migration`). Seraphis redefines the
wallet's view of outputs as "enotes" and separates spend/ledger logic so that
the membership proof can be swapped without rewriting the whole wallet. In other
words, FCMP++ does not land as a patch to ring signatures; it lands once the
wallet has already moved to the Seraphis model.

## 6. FCMP++ vs Ring Signatures

| Property | Ring signatures (RingCT, today) | FCMP++ (proposed) |
|---|---|---|
| Membership set | `N` decoys per input (`N` <= 16) | All eligible OTOs on-chain |
| Privacy vs membership set | `O(N)` candidates to rule out | `O(chain)` candidates to rule out |
| Proof size | small, constant per ring | logarithmic in chain size |
| Verification cost | constant per input, small | logarithmic in chain size, still fast |
| Decoy selection | required, protocol-tuned | not required |
| Decoy exhaustion risk | present on young/large-age outputs | absent |
| Output-age leakage | present (decoys sampled by age) | absent |
| Chain-reaction pruning | a known attack surface | eliminated by full-chain membership |
| Wallet model | existing wallet2 | requires Seraphis wallet migration |
| Activation | live since 2017 | not yet activated anywhere |

## 7. Benefits for MyZubster

MyZubster positions itself explicitly as a privacy-first, Monero-only payment
gateway ("No KYC", micro-transaction friendly, conservation-funded). FCMP++
reinforces every one of those positioning points:

- **Stronger payment privacy for marketplace trades.** Order payments,
  refunds, and skill-purchase flows compose into a graph that ring-signature
  chain analysis can attempt to cluster. With FCMP++ the membership set is the
  whole chain, so clustering by ring prunes is not possible.
- **Decoy-independence on a young chain.** MyZubster's own on-chain volume is
  modest; transactions that would otherwise fall back to smaller rings benefit
  most from full-chain membership.
- **Future-proofing against new ring attacks.** Because the ring is no longer
  the privacy boundary, analytic improvements against ring selection do not
  retroactively weaken historical MyZubster payments.
- **Trust and positioning.** Being able to document FCMP++ readiness lets the
  project state -- accurately -- that its privacy roadmap tracks the strongest
  proposed upgrade to Monero's transaction model, which matters for users who
  choose Monero specifically for privacy.
- **Lower long-term tuning burden.** Removing the decoy sampler removes a
  recurring source of parameter debates and a class of future consensus tweaks
  the gateway would otherwise have to track.

## 8. Integration Requirements

FCMP++ cannot be delivered by editing one module in MyZubsterGateway. It is a
stack-wide change with hard prerequisites:

1. **Seraphis wallet-protocol migration.** The wallet layer that produces and
   scans enotes must move to the Seraphis model before FCMP++ proof generation
   is possible. This is the bulk of the effort and is upstream work coordinated
   in `seraphis-migration`.
2. **Node / consensus changes in `monerod`.** Verifying FCMP++ transactions is
   a consensus-rule change; it requires a network upgrade (hard fork) across
   mainnet, stagenet, and testnet, with the activation height coordinated.
3. **Wallet + RPC surface.** `wallet2` / `monero-wallet-rpc` must expose the
   new proof construction and an "eligible output set" query so the wallet can
   build curve-tree proofs. MyZubster's `moneroClient.js` / payment services
   would consume that RPC once available.
4. **Stagenet and testnet validation first.** Per Monero's own deployment
   model, new consensus rules are exercised on stagenet/testnet long before
   mainnet. The accompanying `fcmp-plus-plus-testnet-guide.md` documents that
   path; it is intentionally written as a future-run manual, because FCMP++ is
   not activated on any network today.
5. **Gateway-side adapters.** No code path in MyZubsterGateway needs to invent
   cryptography; it will need (a) a feature flag so FCMP++ transactions are
   treated correctly, (b) updated RPC payloads in `services/moneroService.js`
   / `core-backend/src/payment/moneroClient.js`, and (c) documentation in the
   API docs. None of this is part of this research issue; it belongs to the
   downstream implementation issue (#57).

## 9. Current Status (Honest)

- FCMP++ is under active development in the `seraphis-migration` repository.
- It is **not** merged into `monero-project/monero`.
- It is **not** activated on mainnet, stagenet, or testnet. There is no
  `monerod` release you can run that validates FCMP++ transactions yet.
- Consequently a "Test on Testnet" goal cannot be honestly executed today:
  there is no node to point at. This research issue explicitly scopes itself to
  research + documentation, and the testnet guide is written as the manual to
  follow the moment a stagenet/testnet activation exists.

This document therefore satisfies the *Research* and *Documentation*
deliverables of issue #56 and defers the *testnet run* deliverable to the guide,
which is executable when the upstream activation lands.

## 10. Open Questions

- Final curve-tree parameters (number of leaves per node, curve alternation
  schedule) are still being chosen upstream; gateway code must not hard-code
  them.
- The exact RPC method names for "fetch eligible output set" and "submit FCMP++
  transaction" are not yet frozen in `monero-wallet-rpc`.
- Seraphis redefines the key-image equivalent; existing double-spend tracking
  in the gateway will need to migrate to the new tag derivation.
- Migration of historical RingCT outputs into the Seraphis/FCMP++ world is a
  separate, wallet-side concern (spend compatibility).

## 11. References

- Monero Research Lab -- https://github.com/monero-project/research-lab
- FCMP++ / Seraphis development -- https://github.com/seraphis-migration
- Monero RPC documentation -- https://docs.getmonero.org/rpc/
- Issue #56 claim -- this pull request posts the required claim comment

---

Authored as part of issue #56 research. AI-assisted drafting disclosed in the
pull request. No live nodes, wallets, keys, or transactions were touched.
