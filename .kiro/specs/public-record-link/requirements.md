# Requirements: Public record linked to the 3tched hash chain

## Introduction
A record starts on the public chain, for transparency, and is verified by 3tched's hash chain (owner, 2026-11-28: "the public is what you are trying to verify ... you would have public put on hash"). The public chain carries what may be shown; the hash chain carries the whole record, so intellectual property and personal information never leave it. The two are tied by one root and by every id that names the record, inside one time bubble (owner: "link the vector ID, all those IDs in a synchronized time bubble").

This complements receipt-anchoring (hash-chain heads anchored on the public chain): a record goes public first, is taken into the hash chain, and the next anchored head then covers that too.

## Requirements

### Requirement 1: What shows publicly
1. THE split SHALL follow 3tched's own field classification (`oscal_subid_registry.assess_fields`, `protection_floor` per field): `none` is shown, `private` is redacted (name and salted leaf hash only), `secret` is withheld (inside the root only, counted, not named).
2. A field with no classification SHALL be withheld.
3. Redacted and withheld values SHALL be salted with 32 random bytes per field, so a leaf cannot be guessed back from a short value.

### Requirement 2: Publish on the public chain
1. `EtchedRecord.publish(root, bundle)` SHALL store the root, keccak256 of the bundle, publisher, block time and block number, and emit the bundle.
2. IF the root is zero or the bundle empty THEN it SHALL revert; a root already published SHALL revert with `AlreadyPublished(root, id)` and the first record stands.
3. The contract SHALL expose `leafHash`, `nodeHash` and `verifyLeaf` so anyone can check a field with the chain alone.

### Requirement 3: Take it into the hash chain
1. THE full record with every salt (the entry) SHALL be recorded in 3tched's hash chain, never on the public chain.
2. THE entry SHALL rebuild the public root, and the bundle SHALL show exactly what the entry's classes allow.

### Requirement 4: Link the ids in a time bubble
1. THE link SHALL hold the public ids (chain id, contract, record id, root, tx hash, block number, block hash, block time), the hash-chain event (id, hash, time), the vector id, and keccak256 of the entry.
2. THE bubble SHALL open at the block time (less a small clock skew) and close a fixed number of seconds later (default 300); the hash-chain event SHALL fall inside it.
3. THE vector id SHALL be derived from the event hash exactly as op-cognitive's `ledger_point_id`, not looked up.

### Requirement 5: Verify
1. Anyone with the public chain SHALL be able to check the bundle hash, the root, and every shown or redacted field.
2. Anyone holding the entry SHALL be able to check every field, withheld ones included, against the public root.
3. With read access to the identity's hash chain, a verifier SHALL read the linked event back and check its id, hash and time against the link.
4. A single field SHALL be revealable to one party, with its proof, without touching the public chain.

## Open questions
1. Which sealed method records the entry and link in the hash chain (Requirement 3.1). None exists today; see design.md "Needs from 3tched".
2. Which sealed read returns an entry, so a verifier can compare it with the public record (same gap as receipt-anchoring task 6).
3. The rule in `.kiro/steering/security.md` says only hashes go on-chain. Shown fields are values. The owner decides whether that rule now reads "only hashes and fields classified `none`".
4. Classification is per top-level field. Nested fields would need the record flattened along the classification's selectors.
