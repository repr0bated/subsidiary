# Tasks: Receipt Anchoring

- [x] 1. `EtchedAnchor.sol`: anchor, events, zero-head and re-anchor reverts, `isAnchored`, `anchorOf`
- [x] 2. Foundry tests including fuzzed properties (6 tests passing, 2026-11-25)
- [x] 3. Deploy script for anvil (`script/Deploy.s.sol`), run against anvil 31337
- [x] 4. Read the chain head from 3tched: `snowball.verify_chain` (backend re-checks every hash and link) then `snowball.query_events` paged to the newest event; anchored with `web3/script/anchor-head.sh --send` (key via `AnchorHead.s.sol`, never on a command line). Real head anchored on anvil 2026-11-25
- [ ] 5. Holder verifier against 3tched's real receipt and chain-path format (blocked: format)
