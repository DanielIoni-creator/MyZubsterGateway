# FCMP++ Testnet Integration Guide for MyZubster

Issue #56 -- testnet integration deliverable. Companion to
`fcmp-plus-plus-research.md`.

## 0. Read this first

This guide is an **execution manual for a future run**, not a log of a run that
happened. As of writing, FCMP++ is still under development in
`seraphis-migration` and is **not activated on testnet, stagenet, or mainnet**.
There is no `monerod` binary that validates FCMP++ transactions yet. Running the
steps below is therefore impossible until an upstream testnet activation is
announced.

Filing this as "research / documentation only" rather than performing a fake
testnet run is deliberate: the issue itself warns
`FCMP++ is still in development. This is a research task, not a production
implementation.`, and MyZubster's own policy forbids touching real or testnet
signing/broadcast when a deterministic result cannot be produced. This file is
the checklist you execute the day a testnet activation exists.

## 1. Scope and Preconditions

| Item | Requirement |
|---|---|
| Upstream | An announced FCMP++ testnet/stagenet activation in `seraphis-migration`, merged into a `monero-project/monero` branch with an activation height |
| Network | testnet (first) or stagenet, never mainnet for this guide |
| Node | A build of `monerod` from the FCMP++-enabled branch |
| Wallet | A Seraphis-capable `monero-wallet-rpc` build (same branch) |
| Funding | A testnet/stagenet faucet (zero-value coins only) |
| Secrets | No mainnet keys, seeds, or testnet seeds with real value are needed |
| MyZubster role | Read-only verifier for this guide; integration code belongs to issue #57 |

Stop and re-check if any of these is not satisfied. Do not improvise a
mainnet run, do not mix a real wallet seed, and do not broadcast toward
mainnet.

## 2. Prepare an isolated testnet node

1. Build the FCMP++-enabled `monerod` from the announced branch. Do not run a
   release build that lacks the consensus rule.
2. Run it on testnet with an isolated data dir:

```
monerod --testnet \
  --data-dir /var/lib/monero/testnet-fcmppp \
  --rpc-bind-ip 127.0.0.1 --rpc-bind-port 28081 \
  --confirm-external-bind false --no-igd \
  --detach
```

3. Wait for the node to sync to the activation height. Use:

```
monerod --testnet --rpc-bind-port 28081 print_status
```

Verify `FCMP++ consensus` is reported active at or after the activation height
before continuing.

## 3. Run a Seraphis-capable wallet on testnet

1. Start a wallet RPC bound to localhost, on testnet, with a throwaway
   view-only wallet created from a fresh seed:

```
monero-wallet-rpc --testnet \
  --daemon-address 127.0.0.1:28081 \
  --rpc-bind-port 28088 \
  --wallet-dir /tmp/myz-fcmppp-testnet \
  --disable-rpc-login
```

2. Create a throwaway wallet through the RPC (fresh seed, never reused, never
   funded with anything of value):

```json
{"method":"create_wallet","params":{"filename":"fcmppp_test","password":"x"}}
```

3. Open the wallet and refresh. No view keys may leave this test environment.

## 4. Fund the testnet wallet from a faucet

Use only a Monero testnet faucet (well-known testnet faucets exist for the
public testnet; ask in the Monero community if the faucet for the FCMP++ testnet
differs). Send a small amount of testnet XMR to your wallet. **Never** send real
XMR, never import a real seed, never reuse an address from any other chain.

## 5. Fetch the eligible output set

Once funded and refreshed, query the eligible output set through the FCMP++
aware RPC method (exact method name will be frozen at activation time; use the
documented endpoint, do not hard-code a guessed name). The guide intentionally
uses a placeholder below until the upstream RPC name is final:

```json
{"method":"<fcmp_get_eligible_set>","params":{...}}
```

Sanity-check:
- The returned set references the full eligible output range, not a ring of
  ~16 decoys.
- The set's Merkle/curve-tree root matches the node's current footer.

## 6. Create and submit an FCMP++ transaction

1. Build an FCMP++ proof transaction through the Seraphis wallet flow:

```json
{"method":"transfer","params":{"destinations":[{"amount":100000000,
  "address":"<testnet destination>"}],"fcmp_plus_plus":true}}
```

   (Use the actual documented parameter name at activation; the
   `fcmp_plus_plus` flag here is a placeholder for whatever the wallet exposes.)
2. Submit, then capture the resulting transaction hash.
3. Poll the daemon until the transaction is in a block:

```
monerod --testnet --rpc-bind-port 28081 print_tx <txid>
```

Record: txid, block height, transaction structure (input reference: full-chain
set, not a 16-ring).

## 7. Verify privacy improvements

These are **structural verifications**, not a full deanonymisation attempt
(a full break is out of scope for a research guide and not deterministically
possible either way):

- **Membership proves full-chain**: the spent input's proof references the
  global eligible set root, not a per-ring set of 16. Confirm via the node's
  `get_tx` / `fcmp_*` inspection RPC.
- **No decoys selected**: there is no per-transaction `rings` / ring members
  field; membership is via the curve-tree path.
- **Amount hidden**: `decode_outputs` (read-only, testnet only) shows Pedersen
  commitments, not plaintext amounts.
- **Double-spend tag**: the Seraphis key-image analogue is present, distinct,
  and spends the output only once.
- **Sanity**: re-broadcasting the same raw transaction is rejected.

Do not attempt to deanonymise other users; the goal is to confirm the
construction, not to break it.

## 8. MyZubster gateway read-only checks

MyZubster integration code belongs to issue #57 and is **not** part of this
guide. For this research issue, only do read-only checks against the gateway's
payment service to confirm no testnet traffic leaks into any mainnet
configuration:

- Ensure `MONERO_NETWORK=testnet` (or its stagenet equivalent) is set in the
  test environment and that `services/moneroService.js` and
  `core-backend/src/payment/moneroClient.js` point at `127.0.0.1:28081`, not a
  production daemon.
- Confirm no logs write seeds, spend keys, or private view keys (they must
  never).

## 9. Rollback and cleanup

1. Stop `monero-wallet-rpc` and `monerod`.
2. Delete the throwaway wallet directory and the isolated data dir:

```
rm -rf /tmp/myz-fcmppp-testnet /var/lib/monero/testnet-fcmppp
```

3. Run on mainnet only after a full mainnet activation, with the production
   implementation from issue #57, not this guide.

## 10. Known gaps (stated honestly)

- The exact RPC names for eligible-set fetch and FCMP++ submit are not frozen
  upstream; substitute the final names at activation time.
- The `fcmp_plus_plus` transfer flag name above is a placeholder.
- Faucet availability for a future FCMP++-enabled testnet is not guaranteed.

## 11. References

- FCMP++ derivation -- https://github.com/seraphis-migration
- Monero Research Lab -- https://github.com/monero-project/research-lab
- Monero RPC -- https://docs.getmonero.org/rpc/
- Companion research -- `fcmp-plus-plus-research.md`

---

AI-assisted drafting disclosed in the pull request. No real seeds, mainnet
keys, or live wallets were used or generated for this guide.
