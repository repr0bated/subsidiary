# Requirements Document

## Introduction

Receipt anchoring is the Subsidiary's Web3 piece and is **new hackathon
work**, built with Kiro. Its purpose is **accountability and transparency
without disclosure**: the head of 3tched's existing, private, local hashchain
(the event chain that records every admitted mutation) is anchored
periodically on a public chain as a hash commitment, so that what the local
chain says can later be compared against what was publicly committed. A
mismatch is tamper evidence.

What is public and what is not:

- **Public chain: commitments only.** The new Solidity contract
  `EtchedAnchor` stores hashes — the hashchain head commitment, plus the
  catalog hash and schema hash in force — and nothing else.
- **Local data and the hashchain stay private.** Event payloads, identities,
  arguments, results and the chain itself are never published, to protect
  the IP and data they contain.
- **Receipts are the verifiable artifact.** A receipt, carrying its own
  hashes and an inclusion proof up to an anchored head, is given to
  authorized parties. The party holding a receipt can check it against the
  public anchor without access to the rest of the chain.

Toolchain: Foundry — `forge` for build and tests (including fuzz), `anvil`
for the local chain (chain id 31337), `cast` for on-chain reads during
verification, `forge script` for deployment. Local Anvil first, then Base
Sepolia (84532).

In scope: EtchedAnchor, the periodic anchorer, receipt inclusion proofs, the
receipt verifier, the operator-side head comparison.

Out of scope: the existing hashchain and its vectorization, admission,
grants and receipt generation (pre-existing 3tched backend; see
PREEXISTING.md); the GUI (spec `sealed-surface-gui`), which only displays
anchoring status. No mainnet, no tokens, no publication of chain contents.

## Requirements

### Requirement 1 — Periodic anchoring of the hashchain head

**User Story:** As the operator, I want the head of the local 3tched
hashchain committed on a public chain at regular intervals, so that the local
history cannot later be rewritten without detection.

#### Acceptance Criteria

1. WHILE the anchorer is running THE SYSTEM SHALL anchor the current hashchain head at a configured interval.
2. WHEN the head has not advanced since the last anchor THEN THE SYSTEM SHALL NOT submit a new anchor.
3. WHEN an anchor is submitted THEN THE SYSTEM SHALL record in EtchedAnchor the head commitment, the head's sequence number, the catalog hash and the schema hash in force at that head.
4. THE SYSTEM SHALL take the head from the existing hashchain as committed by the backend and SHALL NOT recompute, reorder, backfill or synthesize events.
5. THE EtchedAnchor CONTRACT SHALL accept anchors only from the configured anchoring key and only with a strictly increasing sequence number.

### Requirement 2 — Commitments only on the public chain

**User Story:** As the owner, I want only hashes on the public chain, so that
accountability does not expose the IP or data in the local chain.

#### Acceptance Criteria

1. THE SYSTEM SHALL put only hash values and sequence numbers on-chain.
2. THE SYSTEM SHALL NOT put event payloads, arguments, results, identity identifiers, capability names or plaintext of any kind on-chain.
3. THE SYSTEM SHALL NOT publish the local hashchain, its events or its vectors anywhere as part of anchoring.
4. THE SYSTEM SHALL read the anchoring signing key only from the platform's secrets location and SHALL NOT log it.

### Requirement 3 — Receipts as the verifiable artifact

**User Story:** As an authorized party holding a receipt, I want the receipt
to carry what I need to check it against the public anchor, so that I can
verify it without access to the private chain.

#### Acceptance Criteria

1. WHEN an anchor covering a receipt's event is confirmed THEN THE SYSTEM SHALL issue an anchored receipt containing the event hash, the catalog hash, the schema hash, an inclusion proof from the event to the anchored head, and the anchor's chain id, contract address and transaction hash.
2. THE inclusion proof SHALL reveal only hashes, never other events' contents.
3. THE SYSTEM SHALL issue anchored receipts only for events the backend actually committed; refusals, validation failures and calls with an unknown outcome SHALL NOT produce anchored receipts.
4. THE SYSTEM SHALL deliver anchored receipts only to parties authorized by the backend's existing grants.

### Requirement 4 — Verification by the receipt holder

**User Story:** As an authorized party holding a receipt, I want to check it
against the public anchor, so that I know the action it describes is part of
the history that was publicly committed.

#### Acceptance Criteria

1. WHEN given an anchored receipt and a chain RPC URL THEN THE SYSTEM SHALL recompute the head from the receipt's event hash and inclusion proof and read the anchored record with `cast`.
2. WHEN the recomputed head, catalog hash and schema hash equal the anchored record THEN THE SYSTEM SHALL report the receipt as verified with the anchor's block timestamp.
3. IF any of them differs THEN THE SYSTEM SHALL report tamper evidence naming the field that differs.
4. THE SYSTEM SHALL perform receipt verification using only the receipt and the public chain.

### Requirement 5 — Operator-side head comparison

**User Story:** As the operator, I want to compare the local hashchain head
against the anchored history, so that any rewrite of the local chain is
detected.

#### Acceptance Criteria

1. WHEN the comparison runs THEN THE SYSTEM SHALL recompute the head of the local hashchain at each anchored sequence number and compare it to the anchored commitment.
2. IF any recomputed head differs from its anchor THEN THE SYSTEM SHALL report tamper evidence with the first differing sequence number.
3. IF the local chain is shorter than the latest anchored sequence number THEN THE SYSTEM SHALL report tamper evidence.
4. THE comparison SHALL run locally and SHALL NOT publish chain contents.

### Requirement 6 — Networks and toolchain

**User Story:** As the operator, I want to anchor on a local chain first and
then a public testnet, so that the flow is reproducible locally and the
commitments are public on Base Sepolia.

#### Acceptance Criteria

1. WHERE the configured chain id is 31337 THE SYSTEM SHALL anchor to a local Anvil chain.
2. WHERE the configured chain id is 84532 THE SYSTEM SHALL anchor to Base Sepolia.
3. IF the configured chain id is neither THEN THE SYSTEM SHALL refuse to start.
4. THE SYSTEM SHALL build and test EtchedAnchor with `forge` (including fuzz tests) and deploy it with `forge script`.

### Requirement 7 — Failure handling

**User Story:** As the operator, I want anchoring failures to be visible and
retried safely, so that gaps in the public record are not silent.

#### Acceptance Criteria

1. IF an anchoring transaction fails THEN THE SYSTEM SHALL record the failure reason and retry at the next interval.
2. WHEN retrying THEN THE SYSTEM SHALL NOT create a second on-chain record for a sequence number already anchored.
3. WHEN the GUI asks for a receipt's status THEN THE SYSTEM SHALL return one of: pending, anchored, failed.
