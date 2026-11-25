# Design: Receipt Anchoring (EtchedAnchor)

Updated 2026-11-25 to match `web3/src/EtchedAnchor.sol`.

## Contract
- `anchor(bytes32 head)`: reverts `ZeroHead` for zero, `AlreadyAnchored(head, timestamp)` if the head was anchored before. Stores `{timestamp, anchoredBy}` and emits `Anchored(head, timestamp, sender)`. The first anchoring stands.
- `isAnchored(bytes32) returns (bool)`, `anchorOf(bytes32) returns (timestamp, anchoredBy)`.
- Anyone may anchor. A holder checks `anchoredBy` against the identity's known anchoring address.
- Stores only the 32-byte head. No payloads, receipts or identifiers.

## Head source
3tched's receipt chain produces the head; Subsidiary reads it through a sealed read method (open: which method, hash function and width). `.kiro/hashchain.log` is a Kiro development record and is never anchored.

## Scripts
- `script/Deploy.s.sol`: deploys `EtchedAnchor` and `HireContract`; key from `DEPLOYER_KEY`.
- `script/DemoHire.s.sol`: anchors the work head (if not yet anchored) as part of a demo hire.

## Verification
Holder-side, off-chain: recompute the head from the receipt and its chain path in 3tched's format, then call `isAnchored` / `anchorOf`. Blocked on the receipt and chain-path format.

## Tests (`web3/test/EtchedAnchor.t.sol`)
Anchor and event, zero-head revert, unknown head, first anchoring stands, and two properties fuzzed 512 runs each: any nonzero head anchors exactly once with its sender and time; anchoring one head never anchors another.
