# Tasks: Service Contract

- [x] 1. `HireContract.sol` with state, custom errors, events
- [x] 2. Create, accept, cancel with role and status checks
- [x] 3. Deliver against an anchored work head; two-party completion
- [x] 4. Warranty claims and anchored remedies; public provider record
- [x] 5. Foundry tests with fuzzed properties (31 passing, 2026-11-25)
- [x] 6. Deploy and demo-hire scripts for anvil, run end to end
- [x] 7. Holder verifier `web3/script/verify-hire.sh` (cast and jq only): terms hash, completion, work-head anchoring, optional recomputed head. Genuine terms pass; a one-word change fails (2026-11-25)
- [x] 7a. A receipt's path to the anchored work head is checked by `web3/script/verify-receipt.sh` (links, backend verify_chain, anchor). Full payload recompute is receipt-anchoring task 6
- [ ] 8. Identity to address mapping and signing (open question 1)
- [x] 9. Invariant tests (property-based, stateful) in `web3/test/HireContract.invariant.t.sol`: a handler with client and provider actors drives every hire and claim call with bounded inputs and ghost state. Invariants `StatusFollowsAllowedTransitions` (2.1, 2.3, 3.1, 3.2, 4.1, 5.1, 5.3), `CreationFieldsNeverChange` (1.1, 5a.1), `DeliveredWorkIsAnchored` (4.1, 4.2), `CompletionNeedsBothConfirmations` (5.1), `ClaimsOnlyOnCompletedAndRemediesAnchored` (5a.2, 5a.3, 5a.5) and `ProviderRecordMatchesGhostCounts` (5a.6). Done by the idle worker in `8552ffc` (2026-11-26); `forge test` 39 passed; coverage 100% lines on both contracts (`0f2d083`). _Requirements: 1.1, 2-5, 5a_
