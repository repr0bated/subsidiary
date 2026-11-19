# Requirements Document

## Introduction

Receipt anchoring is the Subsidiary's Web3 piece. For each receipt the 3tched
backend returns for an admitted call, it records the hash of the live sealed
catalog and the hash of the method's live sealed schema on-chain, and links
the on-chain record to the receipt through an append-only index in the
platform's live `etched.index-entry/1` format. An independent verifier lets
anyone check a receipt against the chain without trusting the operator.

The chain is the timestamp, not the trust: admission by the backend is the
trust, the sealed blob is the law. Only real receipts are anchored; nothing
is reconstructed or backfilled.

In scope: anchor contract, anchorer, index, verifier, Ganache (chain id 1337)
then Base Sepolia (84532).

Out of scope: admission, grants and receipt generation (pre-existing
backend); the GUI (spec `sealed-surface-gui`), which only displays anchoring
status. No mainnet, no tokens.

## Requirements

### Requirement 1 — Anchor only real receipts

**User Story:** As a verifier, I want only receipts the backend actually
issued to be anchored, so that the chain never records invented provenance.

#### Acceptance Criteria

1. WHEN the backend returns a receipt for an admitted call THEN THE SYSTEM SHALL queue that receipt for anchoring.
2. IF a receipt cannot be matched to a backend-issued operation THEN THE SYSTEM SHALL NOT anchor it.
3. THE SYSTEM SHALL NOT anchor refusals, validation failures, or calls whose outcome is unknown.
4. THE SYSTEM SHALL NOT backfill or synthesize receipts for past actions.

### Requirement 2 — Catalog hash and schema hash

**User Story:** As a verifier, I want each anchor to bind the receipt to the
exact sealed catalog and method schema in force, so that I can prove what law
the action ran under.

#### Acceptance Criteria

1. WHEN a receipt is anchored THEN THE SYSTEM SHALL compute the catalog hash from the live sealed catalog at the time of the call.
2. WHEN a receipt is anchored THEN THE SYSTEM SHALL compute the schema hash from the live sealed schema of the called method.
3. THE SYSTEM SHALL record the catalog hash, schema hash and receipt hash together in one on-chain record.
4. IF the live catalog changed between the call and anchoring THEN THE SYSTEM SHALL use the hashes captured at call time and SHALL NOT recompute from the newer catalog.

### Requirement 3 — Append-only index

**User Story:** As a verifier, I want an append-only, hash-linked index of
anchors per identity, so that I can detect gaps and reordering.

#### Acceptance Criteria

1. WHEN an anchor is confirmed THEN THE SYSTEM SHALL append an index entry in the platform's live `etched.index-entry/1` format.
2. THE SYSTEM SHALL link each entry to the previous one by hash, with seq 0 linking to the all-zero hash.
3. IF an index write would change an existing entry THEN THE SYSTEM SHALL refuse the write.

### Requirement 4 — Independent verification

**User Story:** As anyone with a receipt, I want to verify it on-chain
without trusting the operator, so that the receipt means something.

#### Acceptance Criteria

1. WHEN given a receipt and chain RPC URL THEN THE SYSTEM SHALL report whether a matching on-chain record exists and its block timestamp.
2. WHEN the receipt, catalog hash or schema hash does not match the on-chain record THEN THE SYSTEM SHALL report a mismatch naming the field.
3. THE SYSTEM SHALL perform verification using only the receipt, the public chain and the public contract address.

### Requirement 5 — Networks

**User Story:** As the operator, I want to anchor on a local chain first and
then a public testnet, so that the demo is reproducible and publicly
checkable.

#### Acceptance Criteria

1. WHERE the configured chain id is 1337 THE SYSTEM SHALL anchor to a local Ganache chain.
2. WHERE the configured chain id is 84532 THE SYSTEM SHALL anchor to Base Sepolia.
3. IF the configured chain id is neither THEN THE SYSTEM SHALL refuse to start.
4. THE SYSTEM SHALL read the signing key only from the platform's secrets location and SHALL NOT log it.

### Requirement 6 — Failure handling

**User Story:** As the operator, I want anchoring failures to be visible and
retried safely, so that receipts are not silently left unanchored.

#### Acceptance Criteria

1. IF an anchoring transaction fails THEN THE SYSTEM SHALL keep the receipt queued and record the failure reason.
2. WHEN retrying THEN THE SYSTEM SHALL NOT create a second on-chain record for a receipt already anchored.
3. WHEN the GUI asks for a receipt's status THEN THE SYSTEM SHALL return one of: queued, submitted, confirmed, failed.
