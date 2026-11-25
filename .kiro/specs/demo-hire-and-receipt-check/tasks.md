# Tasks: Demo, hire and receipt check

- [x] 1. One-step setup: `web3/script/demo-setup.sh` starts anvil if needed, runs preflight, deploys, saves addresses (no keys) to `.kiro/state/demo.env` (2026-11-25)
  - _Requirements: 1.1 to 1.3_
- [x] 2a. Receipt to anchored head on the command line: `script/verify-receipt.sh` (2026-11-25)
- [x] 2. Hire and verify on the command line: `script/DemoHire.s.sol` and `script/verify-hire.sh` (genuine terms pass, a one-word change fails)
  - _Requirements: 3.1, 5.1, 6.3_
- [ ] 3. Pitch and hire in the chat canvas (needs the live door, identity bootstrap and the persona)
  - _Requirements: 2, 3_
- [ ] 4. Agent work with receipts (needs the seed networking fix so persona agents reach a model)
  - _Requirements: 4_
- [x] 5. Read the real chain head and anchor it: `web3/script/anchor-head.sh --send` (2026-11-25)
  - _Requirements: 5_
- [ ] 6. On the stand: accountability view with semantic search (`snowball.search_own_events`, found 2026-11-25)
  - _Requirements: 6.1, 6.2_
- [ ] 7. Record the video from a tagged known-good version
