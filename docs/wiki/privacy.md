# Privacy: PII and IP, in the schema and on the public record

Topic: how 3tched's schema marks private data, how that ties to compliance, and what may never reach the public record.
Sources: live sealed schemas in `/run/mounts/3tchedFS/plugins/*/schema.json`; `odbus-verified` `crates/op-plugins/src/state_plugins/oscal_field_classification.rs`, `chat_response.rs`, `privacy_routes.rs`, `op-grpc-bridge/src/chat_mode_policy.rs`; `op-core/src/projection_shm.rs`.
Retrieved: 2026-11-23

## Privacy is in the schema
- Fields are marked in the sealed schema itself. Counted across the live catalog: `x-opdbus-private` appears 103 times (for example `chat_response`, `cognitive`, `ctl_plane_chatbot`, `workflows` content fields), and fields such as `sensitive`, `pii_flagged`, `sensitivity`, `sensitive_fields` and `privacy_policy` appear in plugin schemas.
- `x-secret: true` marks secrets.
- OSCAL field classification (`oscal_field_classification.rs`) reads those annotations from the schema, never from runtime values, and assigns each field a protection floor: `none`, `private` or `secret`. Field classes and their meaning come only from the reviewed OSCAL vocabulary; each class has a `minimum_protection`.
- The classification is never a disclosure permit. Disclosure is decided separately by each plugin's state-exposure policy, which is why private state arrives in feeds as withheld.
- Raw state files in shared memory are root-only; location does not authorize disclosure.

Separate from the contracts: for people using 3tched, private (Personal mode) chat is never vectorized and never reaches the sled ledger; it stays in the container's own RocksDB. That is a chat and user matter, not part of deliverables or the public record.

So a business generated from the template inherits its privacy markings with its fields, the same way it inherits OSCAL subids.

## A dial, from Snowden to Big Brother (owner, 2026-11-23)
The same system runs anywhere on a range, set by the client:
- Snowden end: no personal information at all. No email, no name; the identity is only a WireGuard key (`identity_sled` records carry a `wireguard_pubkey`). The record still proves what the identity did, without saying who is behind it.
- Big Brother end: every move tracked, attributed and searchable.
- Anything between, for example approvals on or off (the two-person rule a client may opt out of).
The setting is the client's choice, and the choice itself belongs on the record. Accountability works at every point on the dial: even with no personal information, the receipts and the public record still prove what happened and that it was not changed.

## Compliance
- Each field and method's OSCAL subid maps it to controls, including privacy controls. The verifier can report the subids in the receipts it checks, so a holder sees which controls applied (service-contract Requirement 6b).
- Sealed agents cover privacy review directly: `gdpr_counsel`, `policy_enforcer`, `oscal_auditor`, `fedramp`, `stig_auditor`.

## IP addresses
- Network addresses are personal data under GDPR. 3tched treats them as such: `privacy_routes` holds per-user route objects keyed by WireGuard identity with an `assigned_ip`, and 3tched began as a privacy network (WireGuard, Xray, OpenFlow obfuscation).
- IP addresses never go on the public record, not even hashed.

## Intellectual property
- The terms document and the deliverable stay off-chain. Only their hashes go on the public record.
- That gives timestamped proof that a given piece of work existed and was delivered, without disclosing it. The holder can prove it later by showing the document and its hash.

## PII: hidden in public, verifiable on the hashchain (owner, 2026-11-23)
Personal information is never revealed on public-facing documents or on-chain. It can still be verified on the hashchain (our record): the receipt chain covers it, so an authorized party can confirm a personal detail against our record without it ever being published. The public record only proves that our record has not changed.

## The public record: what may never go there
- No PII, no IP addresses, no identity, principal or session IDs, no payloads, no tenant data.
- Hashes of low-entropy personal values (an email, an IP address, a name) can be reversed by guessing. So documents whose hashes go on-chain (terms, claims) must not contain PII, and must include a random salt so their hash cannot be guessed. The salt stays with the parties.
- Party addresses must not be derived from or linked to identity IDs.
