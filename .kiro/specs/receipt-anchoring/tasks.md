# Tasks: Receipt Anchoring

- [x] 1. `EtchedAnchor.sol`: anchor, events, zero-head and re-anchor reverts, `isAnchored`, `anchorOf`
- [x] 2. Foundry tests including fuzzed properties (6 tests passing, 2026-11-25)
- [x] 3. Deploy script for anvil (`script/Deploy.s.sol`), run against anvil 31337
- [x] 4. Read the chain head from 3tched: `snowball.verify_chain` (backend re-checks every hash and link) then `snowball.query_events` paged to the newest event; anchored with `web3/script/anchor-head.sh --send` (key via `AnchorHead.s.sol`, never on a command line). Real head anchored on anvil 2026-11-25
- [x] 5. Holder verifier `web3/script/verify-receipt.sh`: receipt event and hash, prev_hash links to an anchored head, backend verify_chain over the range, anchor time and anchorer. Real receipt 860 verified against anchored head 936 on 2026-11-25; a wrong hash fails
- [ ] 6. Recompute an event hash from its full canonical payload (query_events does not return the payload; and the hash is MD5 until 3tched changes it)
