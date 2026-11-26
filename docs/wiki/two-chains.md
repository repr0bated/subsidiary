# Our record and the public record

Topic: how the identity's own chain compares to the public blockchain, and how they connect.
Sources: `docs/wiki/chat-trace.md` (execution tracker), `docs/wiki/backend-source-of-truth.md`, specs `receipt-anchoring` and `service-contract`.
Retrieved: 2026-11-23. Updated 2026-11-26 for the hash change below. The sealed `snowball` methods used for anchoring (`verify_chain`, `query_events`, `search_own_events`) are still present in the live catalog.

Hash function: the receipt chain has used Keccak-256 since odbus-verified `bf3c4a8` (2026-11-25), 64 hex characters, anchored as `bytes32` unchanged. Events with `event_id` below 976 on this host keep MD5 hashes and still verify, but are not collision-resistant, so anchoring them does not give tamper-proof commitment against the host's operator. Clients that check receipts must be built from `bf3c4a8` or later. (Source: project steering, `current-vs-deprecated.md`; not re-derived from backend source.)

| | Our record: 3tched's receipt chain | The public record: the blockchain (anvil now; a public chain later) |
|---|---|---|
| What it records | Every call the identity makes: who, which capability, outcome, payload hash, chain event hash. The ledger also keeps the gRPC payloads, which are vectorized | Only hashes: the anchored chain head, the hire's terms hash, work head, claim and remedy hashes, and party addresses |
| Who writes it | The execution tracker, on every `Runtime::call` | The parties' keys (create, accept, deliver, confirm, claim, resolve) and the anchor |
| Who can read it | The identity and what its grants allow. Private | Anyone. Public |
| How often | Every call | When something is anchored or a hire changes state |
| Content | Full detail, private content filtered by mode | No content at all |
| Cost | Local, free | A transaction per write |
| Trust | Tamper-evident, but held by the identity's host | Tamper-evident and held by no one party: no trusted authority (notary, auditor, platform) is needed |

| Schema | Every receipt and state frame carries the `schema_hash` and `catalog_hash` it ran under; every field and method carries its OSCAL subid | The terms hash commits to the provider method's schema hash and subid; the anchored head commits to everything above |

Schema and compliance:
- The schema is sealed, hashed and OSCAL-tagged from the first field. So our record does not only say what was done; it says under which sealed contract, with which compliance controls attached.
- The terms document names the provider method by subid and schema hash. Anchoring the work head therefore also fixes, in public, that the work ran against that exact schema.
- That makes the pair an immutable audit trail: our record holds the full detail, the public record makes it impossible to change after the fact, and the OSCAL tags make it compliance evidence without a separate audit step.

## Linked in parallel, and searchable (strong point, owner 2026-11-23)
The two records run side by side. Every anchored head on the public record has its matching point in our record, so each public commitment lines up with the exact stretch of private history behind it.

Our record can also be searched by meaning, not only by hash. 3tched vectorizes the hashchain (`chain_vector_projector.rs`, `chain_vectors.rs`), and Cozo holds the edges that link each vector back to its chain event, its actor and its object. So a question like "what did this business do for that client last week?" finds the right entries semantically, and each result can then be checked against the public record by hash. Search gives you the answer; the anchor proves it has not been changed.

This makes our record a verifiable authority. Someone comes with what the public chain says and asks: does your record match, and what else does it say about this? We search our record for the related documents and receipts, answer, and every answer can be checked against the public chain. No outside authority is needed, and ours does not ask to be taken on trust.

Most audit trails are either private and searchable, or public and opaque. This is both, linked: private detail you can search, public proof you can check.

How they connect:
1. The identity works, and every step lands in its receipt chain.
2. The chain's head (one hash covering everything before it) is anchored on the blockchain with `EtchedAnchor`.
3. The hire contract points at that anchored head as the work's proof.
4. A holder takes their receipt and its chain path, recomputes the head, and checks it against the anchor. If it matches, the receipt was part of the chain the identity committed to, at that time, and cannot have been changed since.

Why both:
- The private chain has the detail, so it can prove exactly what happened, but on its own it is the identity vouching for itself.
- The blockchain has no detail, but no one can rewrite it. Anchoring the head ties the two together: the detail stays private, and the commitment is public.

Salesman's version: "That's our record, friend, and here's the public record, side by side. Ask me anything about any deal, I'll find it, and you can check it yourself."
