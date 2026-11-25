# Requirements: Service Contract (hire)

## Introduction
The hire contract records, on-chain and as hashes only, that one identity hired another to do a piece of work, that the work was accepted, which anchored receipt chain proves it, that both sides confirmed completion, and whether the provider stood behind it under warranty. It records delivery, not payment. It is the new element of the submission: transparency and accountability for work done by an identity, checkable by whoever holds the receipt, without seeing inside the identity.

First use: a business identity hires one of 3tched's sealed agents to do a task, for example `cognitive.agent_oscal_auditor_review` reviewing the business's CMS. The agent's work produces receipts in 3tched's own chain; the chain head is anchored through `EtchedAnchor` (spec `receipt-anchoring`); this contract points at that anchored head.

Contracts are Foundry only (`forge`, `anvil` on 31337, `cast`, `forge script`).

## Glossary
- **Client**: the hiring identity's address.
- **Provider**: the hired identity's address (an agent or another identity).
- **Terms document**: off-chain canonical JSON describing the work: the task, the provider method's subid, its `schema_hash` and the `catalog_hash` it runs under, inputs by hash, any SOP reference, and the warranty period. Never on-chain; only its hash is.
- **Terms hash**: `bytes32` hash of the terms document.
- **Work head**: `bytes32` head of 3tched's receipt chain after the work, anchored in `EtchedAnchor`.
- **Holder**: whoever holds a receipt and wants to check it.

## Requirements

### Requirement 1: Create
**User story:** As a client identity, I want to record a hire with its terms, without putting the terms on-chain.
1. WHEN a client creates a hire with a provider address and a terms hash, THE contract SHALL store the client, the provider, the terms hash and the status `Created`, and SHALL emit `HireCreated(hireId, client, provider, termsHash)`.
2. THE contract SHALL NOT store or emit the terms document or any part of it.
3. IF the terms hash is zero, the provider is the zero address, or the provider equals the client, THEN THE contract SHALL revert with a custom error.

### Requirement 2: Accept
1. WHEN the provider accepts a `Created` hire, THE contract SHALL set the status to `Accepted`, record the block timestamp, and emit `HireAccepted(hireId, timestamp)`.
2. IF anyone other than the provider tries to accept, THEN THE contract SHALL revert.
3. IF the hire is not `Created`, THEN THE contract SHALL revert on accept.

### Requirement 3: Cancel
1. WHEN the client cancels a hire that is still `Created`, THE contract SHALL set the status to `Cancelled` and emit `HireCancelled(hireId)`.
2. IF the hire was already accepted, THEN THE contract SHALL revert on cancel.

### Requirement 4: Work evidence
**User story:** As a client, I want the hire to point at the anchored proof of the work.
1. WHEN the provider submits a work head for an `Accepted` hire, THE contract SHALL check that the work head is anchored in `EtchedAnchor`, store it, set the status to `Delivered`, and emit `WorkDelivered(hireId, workHead)`.
2. IF the work head is zero or not anchored, THEN THE contract SHALL revert.
3. THE contract SHALL store only the work head hash, never receipts, payloads or chain contents.

### Requirement 5: Completion
1. WHEN both client and provider have confirmed a `Delivered` hire, THE contract SHALL set the status to `Completed` and emit `HireCompleted(hireId, termsHash, workHead)`.
2. IF a non-party confirms, or a party confirms twice, THEN THE contract SHALL revert.
3. IF the hire is not `Delivered`, THEN THE contract SHALL revert on confirm.

### Requirement 5a: Warranty
**User story:** As a client, I want the provider to stand behind the work after delivery, in public.
1. WHEN a client creates a hire, THE contract SHALL record a warranty period (in seconds, possibly zero) as part of the hire.
2. WHEN the client files a claim on a `Completed` hire within the warranty period, with a claim hash (the hash of an off-chain claim document that cites the disputed receipt), THE contract SHALL record it as open and emit `WarrantyClaimed(hireId, claimId, claimHash)`.
3. WHEN the provider resolves an open claim with a remedy head that is anchored in `EtchedAnchor`, THE contract SHALL mark the claim resolved and emit `WarrantyResolved(hireId, claimId, remedyHead)`.
4. IF a claim is filed after the warranty period, by a non-client, or with a zero hash, THEN THE contract SHALL revert.
5. IF a remedy head is zero or not anchored, or is submitted by anyone other than the provider, THEN THE contract SHALL revert.
6. THE contract SHALL keep public counts per provider address of hires completed, claims filed and claims resolved, so anyone can see a provider's record.
7. THE contract SHALL NOT decide disputes; it records claims and remedies. Open claims stay visible.

### Requirement 6: Holder verification
**User story:** As a holder, I want to check a receipt myself, without trusting either party.
1. THE system SHALL provide an off-chain verifier that, given the terms document, a receipt and its chain path, recomputes the terms hash and the chain head and compares them with the hire's `termsHash` and anchored `workHead`.
2. WHEN either does not match, THE verifier SHALL report which one failed.
3. THE verifier SHALL run on the holder's side and SHALL need no access to the identity's internals.

### Requirement 6a: Transparency
1. Every state change of a hire (created, accepted, cancelled, delivered, confirmed, completed, claimed, resolved) SHALL emit an event, so a hire's full history can be rebuilt from events alone.
2. THE contract SHALL expose read functions for a hire's status, hashes, timestamps, warranty end and claims.
3. THE contract SHALL NOT handle payment (owner decision, 2026-11-23: delivery only for now).

### Requirement 6b: Schema and compliance
1. THE terms document SHALL name the provider method by its OSCAL subid and its sealed `schema_hash`, and SHALL include the `catalog_hash`, so the terms hash commits to the exact sealed schema the work runs under.
2. THE verifier SHALL report the schema hash and the OSCAL subids recorded in the receipts it checks, so a holder can see which compliance controls the work ran under.
3. IF a receipt's schema hash differs from the one named in the terms, THEN THE verifier SHALL report it.

### Requirement 7: Privacy
1. THE contract SHALL put only hashes and party addresses on-chain: no payloads, tenant data, identity IDs, principal IDs or session IDs.
2. Party addresses SHALL NOT be derived from or publicly linked to 3tched identity IDs.
3. Documents whose hash goes on-chain (the terms document, claim documents) SHALL NOT contain PII or IP addresses, and SHALL include a random salt kept by the parties, so their hashes cannot be reversed by guessing.
4. THE verifier SHALL NOT need PII to check a receipt against the public record. PII SHALL be verifiable only against 3tched's hashchain, by a party authorized to see it, and SHALL never appear in public-facing documents.
5. THE contract and its documents SHALL respect the schema's privacy markings (`x-opdbus-private`, `x-secret`, protection floors): no field marked private or secret may appear in a document whose hash is published.

### Requirement 8: Keys and networks
1. Keys SHALL come from the environment (`/etc/op-dbus/secrets`), never from the repository, scripts or logs.
2. Development SHALL use anvil on chain 31337. Deployment elsewhere (for example Base Sepolia, 84532) SHALL need an explicit owner decision.

### Requirement 9: Tooling and tests
1. THE contract SHALL use Solidity ^0.8, custom errors, and NatSpec on public functions.
2. Foundry tests SHALL cover every status transition, every revert, every event, and fuzz the caller addresses and hash inputs (property-based tests: no transition is reachable out of order; no non-party can change a hire).
3. A `forge script` SHALL deploy to anvil and run one full hire end to end.

## Open questions
1. How an identity gets its address and who signs its transactions: an identity key from the `keypair` plugin, a host-held key per identity, or a host plugin method that submits on the identity's behalf. Keys never in the container image or repo.
2. Hash alignment: 3tched's chain head width and function versus the `bytes32` stored here; whether the head is stored as-is or re-hashed with `keccak256`.
3. Canonical JSON rules for the terms document, so client, provider and holder compute the same terms hash.
4. Whether an SOP (`threetched` `sop.*`) is the terms document, with `sop.approve` as acceptance.
5. Which sealed method returns the work head after the provider's work.
