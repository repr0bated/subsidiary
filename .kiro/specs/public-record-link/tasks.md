# Tasks: Public record linked to the 3tched hash chain

- [x] 1. `web3/src/EtchedRecord.sol`: publish, record view, `leafHash`, `nodeHash`, `verifyLeaf`. _Requirements: 2.1-2.3_
- [ ] 2. Foundry tests `web3/test/EtchedRecord.t.sol` (shared vector, reverts, two fuzzed properties). Written and compiled with solc 0.8.28; `forge fmt && forge build && forge test -vv` not yet run (no Foundry where they were written). The same behaviour passed 104 checks in a local EVM against the TypeScript builder (2026-11-28). _Requirements: 2, 5.1_
- [x] 3. `ui/src/lib/web3/disclosure.ts` with tests: split by protection floor, salts, tree, bundle, entry, reveal. Tests ran on Node's own test runner with a small stand-in for vitest (2026-11-28); run `npm --prefix ui test` once to confirm under vitest. _Requirements: 1, 3.2, 5.2, 5.4_
- [x] 4. `ui/src/lib/web3/link.ts` with tests: time bubble, ledger point id, entry hash, check against each side. Same test run as task 3. _Requirements: 4, 5.3_
- [x] 5. `ui/scripts/record.ts` CLI (build, verify, reveal, link, check-link), plain Node 22, no dependency.
- [ ] 6. `web3/script/publish-record.sh`, `verify-record.sh`, `record-lib.sh`, `PublishRecord.s.sol`; e2e-local.sh runs them. Written; not yet run against anvil.
- [ ] 7. Take the entry and link into the hash chain. Blocked: needs a sealed write in 3tched (design.md "Needs from 3tched").
- [ ] 8. Read an entry back from the hash chain for verification. Blocked: needs a sealed read (same gap as receipt-anchoring task 6).
- [ ] 9. Owner decision: the security steering rule "only hashes go on-chain" versus shown fields.
