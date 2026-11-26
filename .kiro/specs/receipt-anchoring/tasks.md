# Tasks: Receipt Anchoring

- [x] 1. `EtchedAnchor.sol`: anchor, events, zero-head and re-anchor reverts, `isAnchored`, `anchorOf`
- [x] 2. Foundry tests including fuzzed properties (6 tests passing, 2026-11-25)
- [x] 3. Deploy script for anvil (`script/Deploy.s.sol`), run against anvil 31337
- [x] 4. Read the chain head from 3tched: `snowball.verify_chain` (backend re-checks every hash and link) then `snowball.query_events` paged to the newest event; anchored with `web3/script/anchor-head.sh --send` (key via `AnchorHead.s.sol`, never on a command line). Real head anchored on anvil 2026-11-25
- [x] 5. Holder verifier `web3/script/verify-receipt.sh`: receipt event and hash, prev_hash links to an anchored head, backend verify_chain over the range, anchor time and anchorer. Real receipt 860 verified against anchored head 936 on 2026-11-25; a wrong hash fails
- [x] 7. Invariant tests (property-based, stateful) in `web3/test/EtchedAnchor.invariant.t.sol`: a handler anchors bounded random heads from several senders, including repeats and the zero head, with a ghost set. Invariants `ZeroHeadNeverAnchored` (2.3), `AnchorRecordsNeverChange` (5.1, 5.2) and `IsAnchoredMatchesGhostSet` (2.5, 5.3, 5.4). Done by the idle worker in `3141316` (2026-11-26); `forge test` 39 passed. _Requirements: 2.3, 2.5, 4.2, 5.1-5.4_
- [~] 6. (deferred 2026-11-25) Recompute an event hash from its full canonical payload. No sealed method returns the payload (`query_events` and `search_own_events` return hashes and summaries). The holder check stays as task 5: links to an anchored head plus backend `verify_chain`. Reopen when 3tched exposes a sealed read of the full canonical event.
