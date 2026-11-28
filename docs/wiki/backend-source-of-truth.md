# Principle: the 3tched backend is the single source of truth

Topic: what Subsidiary must use from the backend and must not reimplement.
Source: project owner, 2026-11-19. Re-checked 2026-11-26 against the live view and the steering files. Detail of backend internals is not in this repo; items marked VERIFY need the 3tched owner.

## Rule
Use the full backend: grants, capabilities, agents, the live schema, the execution tracker and the hashchain. Reach all of it through the bridge and FUSE call files. Subsidiary adds the sealed surface, the contracts, and the Kiro setup. It does not keep its own copy or its own version of any backend concept.

## What the backend owns
- Identity, grants and capabilities. Admission (identity AND grants AND sealed) is decided by the backend. The UI shows the result and never decides.
- Agents. Anything an agent does is run and tracked by the backend.
- Schema. One live source, read through FUSE. No copy in the repo, none in the UI. Compile output (see chat-as-canvas-route.md) is derived from it and must not become a second source.
- Receipts. Confirmed 2026-11-26 (steering, "Current vs deprecated"): every call is a `Runtime::call`, reserved, admitted, receipted and appended to the sled ledger in one commit. The chain hash is Keccak-256 from event 976 on this host (older events keep MD5).
- The linkage layer, which has three parts (interpreted from a voice-typed note; VERIFY each):
  1. The hashchain (`event_chain.rs`): tamper-evident record of events. Heads are read through a sealed method or the bridge feed.
  2. The chain vectors in Qdrant (`chain_vector_projector.rs`, `chain_vectors.rs`): embeddings of the chain's events, for semantic recall.
  3. The links in Cozo (edges) that tie each vector back to the chain through identifiers such as the vector ID and the actor ID, and likely others. The full list of keys and edge names exists in the backend and is not copied here; read it through FUSE.
  So a hashchain entry, its vector and its actor are connected by those keys. This is the path accountability can follow: an anchored head, the entries behind it, who acted, and what was embedded.
  Subsidiary anchors only hashes of the first. It may ask the backend about the others, never query them directly.
- Identity ledger (from a voice-typed note; VERIFY terms). Every identity has its own ledger of everything it does, connected to that identity. The container is an identity, so the Subsidiary container has its own ledger and its own Qdrant collection. Ledger entries are vectorized into Qdrant with their payload, user and timestamps, and any other information that passes through. The ledger was called a "snowball ledger"; the exact name and meaning are not confirmed.
- Payloads are vectorized too, not only the event metadata. The vectors cover the whole of the activity in an action.
- Terms (from the project owner): in 3tched, what is traditionally called a session (one bounded interaction, like a chat) is called an episode. A 3tched session is the lifetime of the container/account. Use "episode" for the first and "session" only for the second. Kiro and the AI SDK use "session" in the traditional sense (for example Kiro's Session Start hook), so map those to episodes when writing about 3tched and say which meaning is intended.
- Field names: `session_id` and `application_session_id`. Both are part of the identity record that 3tched already keeps in its identity store (sled). The backend assigns and tracks them; the UI does not mint or store its own. The UI only carries `application_session_id` (what the prose calls an episode) to group one canvas's messages and views. Receipts, anchoring and the verifier do not key on it. Likely mapping, not confirmed: `session_id` is the container/account lifetime. VERIFY. (Checked 2026-11-26: `session_id` is a required string in the sealed `identity_sled` schema, described as "Session the event belongs to". `application_session_id` appears in no sealed schema in the live view, and nothing in this repo uses it, so the UI cannot rely on it yet.) Use the field names exactly in specs and code, and "episode" only in prose.
- The full set of linkage keys and fields is already defined in the backend and is comprehensive. Subsidiary does not define or copy it. Read it through FUSE when the spec needs it, in line with "live schema, no copies".
- Storage. One Cozo/RocksDB database per tenant, opened by the backend from the mounts.
- Knowledge base retrieval and any model, including embeddings. Subsidiary's knowledge base lives in its own Qdrant collection, separate from the chain vectors, managed by the backend.

## What Subsidiary owns
- The contracts: EtchedAnchor and the hire/service contract (the latter written by the project owner).
- The web3 side: the blockchain setup (Foundry, anvil, later a public chain), deployment and scripts.
- The linkage: the path from a backend receipt or chain head to an on-chain anchor, and back to the receipt holder's check. The backend produces the hashes; Subsidiary connects them to the chain.
- Accountability: the hire terms, receipts tied to anchored heads, and the holder's ability to verify.
- Delivery: the sealed Svelte surface that delivers the service to the tenant (chat as canvas, compiled catalog, bindings), and the demo and submission.
- The Kiro configuration: steering, specs, hooks, powers.

Subsidiary does not own how receipts are made, what grants allow, or what the schema is. It links to them.

## Consequences for work already written
- `.kiro/scripts/receipt.sh` and the local `.kiro/hashchain.log` are not the real receipt path. They invent a second hashchain. Remove or replace. (2026-11-26: `receipt.sh` is still present, and it still writes a local sha256 chain. `.kiro/scripts` is outside the worker's edit scope, so the owner decides.)
- The receipt verifier idea must be built against the backend's real receipt format, not this script.
- The `receipt-anchoring`, `tenant-storage` and `sealed-surface-gui` specs describe parts the backend already does. They need rewriting to say what Subsidiary asks of the backend instead of how it is done.
- Hooks that talk about grants or receipts should call the backend (through the door or FUSE), not stand in for it.

## Open items for the 3tched owner
- Method names to spawn a subsidiary and to issue a grant.
- Which call file returns the current chain head, and its hash width and canonical JSON. (Answered for the chain head: `snowball.verify_chain` then `snowball.query_events`, see receipt-anchoring task 4; hash is Keccak-256, 64 hex, from event 976. The canonical event JSON is still not exposed, receipt-anchoring task 6.)
- How the execution tracker exposes receipts.
- What the backend returns to the UI per request.
