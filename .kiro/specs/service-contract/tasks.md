# Tasks: Service Contract

- [x] 1. `HireContract.sol` with state, custom errors, events
- [x] 2. Create, accept, cancel with role and status checks
- [x] 3. Deliver against an anchored work head; two-party completion
- [x] 4. Warranty claims and anchored remedies; public provider record
- [x] 5. Foundry tests with fuzzed properties (31 passing, 2026-11-25)
- [x] 6. Deploy and demo-hire scripts for anvil, run end to end
- [x] 7. Holder verifier `web3/script/verify-hire.sh` (cast and jq only): terms hash, completion, work-head anchoring, optional recomputed head. Genuine terms pass; a one-word change fails (2026-11-25)
- [ ] 7a. Recompute the work head from a receipt and its chain path (blocked: no sealed method to read own execution records; chain hash is MD5 today, see PLAN risk)
- [ ] 8. Identity to address mapping and signing (open question 1)
