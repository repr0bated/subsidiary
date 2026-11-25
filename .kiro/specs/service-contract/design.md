# Design: Service Contract (HireContract)

Updated 2026-11-25 to match `web3/src/HireContract.sol`.

## State
`Hire { client, provider, termsHash, workHead, warrantyPeriod, createdAt, acceptedAt, deliveredAt, completedAt, status, clientConfirmed, providerConfirmed }`, `Claim { claimHash, remedyHead, filedAt, resolvedAt }`, `Record { completed, claimsFiled, claimsResolved }` per provider. Status: None, Created, Accepted, Cancelled, Delivered, Completed.

## Functions
| Function | Who | From status | Effect |
|---|---|---|---|
| `createHire(provider, termsHash, warrantyPeriod)` | client | | Created; rejects zero provider, self-hire, zero terms |
| `accept(id)` | provider | Created | Accepted, timestamped |
| `cancel(id)` | client | Created | Cancelled |
| `deliver(id, workHead)` | provider | Accepted | Delivered; `workHead` must be nonzero and anchored in `EtchedAnchor` |
| `confirm(id)` | client or provider, once each | Delivered | when both: Completed, provider record +1 |
| `fileClaim(id, claimHash)` | client | Completed, within warranty | claim recorded, provider claims filed +1 |
| `resolveClaim(id, claimId, remedyHead)` | provider | open claim | `remedyHead` must be anchored; claims resolved +1 |
Reads: `getHire`, `warrantyEnd`, `claimCount`, `getClaim`, `providerRecord`, `hireCount`.

## Events
`HireCreated`, `HireAccepted`, `HireCancelled`, `WorkDelivered`, `CompletionConfirmed`, `HireCompleted(id, termsHash, workHead)`, `WarrantyClaimed`, `WarrantyResolved`. Every state change emits one, so a hire's history can be rebuilt from events.

## Not in the contract
Payment (owner decision: delivery only). Terms, claims and deliverables: off-chain, hashed, salted, no personal data. Dispute judgement: the contract only records claims and remedies.

## Tests (`web3/test/HireContract.t.sol`, 31 passing)
Every transition, every revert, the main events, and five properties fuzzed 512 runs each: non-provider cannot accept; non-party cannot confirm; delivery succeeds exactly when the head is anchored; a claim is accepted exactly inside the warranty window; terms and warranty round-trip.

## End-to-end
`script/DemoHire.s.sol` runs create, accept, anchor, deliver and both confirms on anvil; verified 2026-11-25 (status Completed, provider record 1 completed).
