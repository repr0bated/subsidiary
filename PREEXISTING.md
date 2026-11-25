# Pre-existing vs new work

Personal project by Jeremy Hobson (GitHub: repr0bated), Apache-2.0, Copyright 2026 Jeremy Hobson. Built on earlier work of mine, disclosed here.

## Pre-existing (3tched / odbus-verified)
The whole backend and the container are pre-existing. Only the UI, the contracts and the `.kiro/` setup are new.
- 3tched backend: schema, grants and capabilities (host antix1)
- Backend channel: the FUSE call-file interface and the live schema exposed through FUSE
- Per-tenant storage: Cozo with RocksDB on host ext4, one database per tenant
- Container: provisioning, spec, mounts and runtime (LXD or Incus, runit services)
- The 3tched architecture diagrams, "One system. Connected by design." and "An identity, embodied.", and their vocabulary (3tched.com kit assets)
- Hashchain: `crates/op-state-store/src/event_chain.rs`
- Chain vectorization: `crates/op-grpc-bridge/src/chain_vector_projector.rs` and `crates/op-cognitive/src/chain_vectors.rs`

## New for the Kiroween hackathon
- Svelte sealed-surface GUI (`ui/`). It renders from schema; the chatbot only renders and never executes. It reaches the pre-existing backend only through FUSE call files.
- Receipt-anchoring contract `EtchedAnchor`
- Service/hire contract (written by Jeremy in Kiro)
- The `.kiro/` setup: steering, specs, hooks, agents, scripts, including the idle-triggered crew runs
- Business container provisioning flow: the "spawn subsidiary" and "issue grant" methods and the path from an accepted hire contract to a provisioned tenant container. The existing container provisioning and runtime listed above stay pre-existing; only this flow is new. Confirm the exact boundary before submitting.
- Demo wiring: the fictional example tenants and their schemas, and the demo flow that connects the UI, the contracts and the existing backend

Everything must merge back cleanly into 3tched afterward.

## Notes
- This list is not final. Add any other pre-existing code or work to it as it turns up, before submitting.
- Businesses in the demo are fictional example tenants generated as sample use cases. The first two (cold-chain food logistics, public library circulation) and their container configuration schemas were generated with ChatGPT on 2026-11-21. They are AI-generated sample material, not Kiro output.
- Only hashes of 3tched's own hashchain (and its vectorization) are anchored on-chain. Receipt verification is by the receipt holder.
- Chain tooling is Foundry (anvil on 31337).
