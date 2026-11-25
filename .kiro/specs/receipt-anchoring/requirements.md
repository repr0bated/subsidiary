# Requirements: Receipt Anchoring (EtchedAnchor)

## Introduction
3tched already keeps a private, hash-linked receipt chain: every call goes through the execution tracker and leaves a receipt. This spec anchors that chain's head on-chain so anyone holding a receipt can check it against a public anchor. Only hashes leave the machine. Subsidiary does not make receipts or keep its own chain; it reads the head 3tched produces and anchors it.

The local `.kiro/hashchain.log` written by `.kiro/scripts/receipt.sh` is a record of Kiro tool use during development, not 3tched's receipt chain, and is never anchored.

## Requirements

### Requirement 1: Read the head
1. WHEN an anchor is requested, THE system SHALL read the current chain head from 3tched through a sealed read method on the identity's mount.
2. THE system SHALL NOT compute, copy or keep its own version of 3tched's chain.

### Requirement 2: Anchor
1. WHEN the owner confirms, THE system SHALL submit the head hash to `EtchedAnchor.anchor(bytes32 head)`.
2. WHEN anchoring succeeds, THE contract SHALL emit `Anchored(head, timestamp, sender)`.
3. IF the head is zero, THEN THE contract SHALL revert with a custom error.
4. THE contract SHALL accept only a head hash: no payloads, receipts, identifiers or tenant data.
5. `isAnchored(bytes32 head)` SHALL return whether a head was anchored, and when.

### Requirement 3: Holder verification
1. WHEN a holder presents a receipt and its chain path, THE verifier SHALL recompute the head and check it with `isAnchored`.
2. IF the recomputed head is not anchored, THEN THE verifier SHALL report verification failure.
3. THE verifier SHALL be a pure function run by the holder, against 3tched's real receipt format.

### Requirement 4: Tooling and tests
1. Foundry only; anvil (31337) for development; keys from the environment, never in scripts.
2. Tests SHALL cover anchoring, the event, the zero-hash revert, `isAnchored` for known and unknown heads, and fuzz the head input.
3. A `forge script` SHALL anchor a head given in an environment variable.

### Requirement 5: First anchoring is kept
1. WHEN a head is anchored for the first time, THE contract SHALL record the block timestamp and the sender for that head.
2. WHEN a head that is already anchored is submitted again, THE contract SHALL revert with the custom error `AlreadyAnchored(head, timestamp)` and leave the first record unchanged.
3. WHEN `anchorOf(bytes32 head)` is called, THE contract SHALL return the first anchoring's timestamp and sender, or zero values if the head was never anchored.
4. WHEN `isAnchored(bytes32 head)` is called for a head that was never anchored, THE contract SHALL return false.
## Open questions
1. Resolved 2026-11-25: the head is the newest event's `event_hash` from `snowball.query_events`, after `snowball.verify_chain` reports valid. It is anchored as bytes32, left-padded with zeros. Hash function (2026-11-25): Keccak-256, 64 hex, since odbus-verified `bf3c4a8`; the head fills `bytes32` with no padding. Events before the switch keep MD5 hashes. Canonical form: keys sorted recursively, whole-number floats as integers, compact JSON (`canonicalize_json`), then hashed.
2. Anchoring frequency: per hire, per session end, or on demand.
3. The receipt and chain-path format the verifier reads.
