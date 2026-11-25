---
inclusion: always
---

# Current vs deprecated (3tched)

Models lost track of this at the last hackathon. Check this list before using any backend piece. If something is not listed, verify it in the current source or ask; do not assume an older doc is current.

## Current
- 3tched vs threetched: 3tched is our own code. threetched is the ZeroClaw-derived executable (`/usr/bin/threetched`). Its CLI schema was extracted and sealed into the `threetched` blob, and each CLI command became a method exposed through D-Bus. A call invokes the D-Bus method, and the D-Bus method is a wrapped binary command: it runs the ZeroClaw-derived binary with the method's arguments as its CLI flags. Example: the `agent` method on the `/run/mounts/threetched` view runs `threetched agent --agent <alias>`. The binary runs as a gateway, and that is how models are reached (`gateway` methods); this is current.
- 3tchedFS call files: `operations/<plugin>/<method>/call`. Write the arguments, read the receipt from the same file. The only way to make calls.
- FUSE views on the host: `/run/mounts/3tchedFS` and `/run/mounts/threetched`.
- Execution tracker: every call is a `Runtime::call`, reserved, admitted, receipted and appended to the sled ledger in one commit.
- Chat: `@ai-sdk/svelte` `Chat` in the browser; the Rust responder in `3tched.com/crates/op-chat-interface` inside the container; the `chat_response` plugin for turns (`submit_turn`, `claim_pending_turn`, `generate_pending_turn`, `propose_pending_tool`, `approve_pending_tool`, `consume_pending_tool`, `record_pending_tool`, `respond_to_user`).
- Chat mode: `project.select_context` and `project.get_context`.
- The control-plane chatbot has no execution rights and no internet access. It can only delegate and suggest. Intended production design, not implemented yet: execution is done by other agents approved by two humans (a two-person rule), each under its own grants and receipts. A client may opt out and let the chatbot execute with no approval. Do not present the two-person rule as working.
- Cognitive services (context-aware coding, knowledge base, memory loop, agents) are the `cognitive` plugin, reached through FUSE. They used to be behind MCP; that path is retired.
- Models and providers: `chat_router` is current (owner, 2026-11-23). It is really the provider plugin, but the name stays; do not rename it. Use `ListProviders`, `ListModels` and `SetSelection` (`cap.software.threetched.selection.set@v1`), and its `ui_surfaces` (Chat, Routable Models).
- UI: Svelte 5 only, json-render catalog from the sealed `json_render` blob, `schema_renderer.render_schema`, candidates via `json_render.save_candidate` and `promote_candidate`.
- OSCAL: `x-oscal-subid` on every field, subids on every method, `oscal_subid_registry`.
- Storage: Cozo on RocksDB. No SQLite.
- Btrfs is transport and cache, not backup: send/receive moves prepared filesystems (releases, golden snapshots) and transports vectors into Qdrant, and Btrfs cache subvolumes serve as the caching layer (cache categories, timing and vector/state subvolumes). Do not treat snapshots as backups or as a rollback mechanism for state. Snowball is a session ledger, not a snapshot set.
- Services on the host: runit (`sv`).
- Contracts: Foundry (`forge`, `anvil` 31337, `cast`).

- zcall: the CLI for sealed methods through 3tchedFS (`~/.local/bin/zcall`). `zcall ask "<plain English>"` has JEV turn a natural-language request into a zcall line (it needs `TYPESAFE_API_KEY`, sourced from `~/.bash_secrets` in a subshell; never print it). Use `zcall ask`, `zcall methods <plugin>` and `zcall help <plugin> <method>` to find a method instead of guessing. Shell completion (`eval "$(zcall completion bash)"`) completes plugins, methods, every flag and enum values from the sealed schema. Mutations need `--yes`; ask the owner first. In scripts, hooks, agents and tests, call sealed methods with zcall instead of writing custom call-file or client code.

## Deprecated or retired: do not use
Deprecated means revised and reworked. Remnants of the old versions are still in the source and on the host (for example EMQX). Code or a running service being present does not make it current.

- MCP inside 3tched: the bridge's `/mcp` route, MCP bundles, and MCP as an identity's path (retired 2026-10-28; identities use 3tchedFS call files).
- EMQX and MQTT, including the responder wake and `op-chat-responder`'s MQTT relay.
- The standalone `ChatService` proto in `op-chat-interface` and the Node ChatLink worker per principal.
- s6, `service6`, `systemctl` (a misleading shim on this host).
- Waypipe, `op-gemma`, Factory REST methods, `op-grpc-adapters`, Netmaker.
- `crates/op-web/ui/`, `zeroclaw-gui`, pairing codes, `operation-dashboard-ui-07`.
- `/dev/shm/plugin_schema.dat`, `live-schema.json`, `/dev/shm/opdbus/schemas`.
- `OIB1`, `blob_ref`, `SessionIdentityBlob` (replaced by `SID1` / `SealedId`).
- React, Vue, Angular and any non-Svelte UI framework.
- Ganache, Hardhat.

## Unsure: confirm before relying on it
- Receipt chain hash: Keccak-256 system-wide since odbus-verified `bf3c4a8` (2026-11-25), 64 hex, anchored as `bytes32` unchanged. Events before the switch (`event_id` < 976 on this host) keep MD5 hashes and still verify; do not call receipts for those events collision-resistant. Clients that check receipts must be built from `bf3c4a8` or later (an older `zcall` rejects every receipt).
- External MCP: `op-mcp-door` (spec `mcp-door-adapter`, updated 2026-11-22) is the MCP endpoint for external clients (IDEs, agents) to reach the cognitive tools. MCP Streamable HTTP over TLS, default `127.0.0.1:8091`, endpoints `/mcp/full` and `/mcp/loader`; every tool call becomes one 3tchedFS call file and one receipt. Not installed as a runit service on this host as of 2026-11-23. The `cognitive` plugin alone has 669 methods, too many to list as tools in one client, so clients such as Kiro should use `/mcp/loader` (five meta-tools to search, describe, load and call) rather than `/mcp/full`.
- The 3tched.com model and mode pickers (`ModelPicker.svelte`, `ModeStrip.svelte`, `model-catalog.ts`) predate the separation of threetched and use old capability names. Reference only.
- Agents (ours): sealed in the `cognitive` plugin as `agent_<name>_<operation>` methods: 111 agents, 644 methods (2026-11-23). Advisor operations are `advise`, `analyze`, `consult`, `explain`, `help`, `recommend`, `review`; orchestrators have `list_steps`, `run_workflow`, `validate`. Each agent has its own capability (for example `cognitive.agent.oscal_auditor`). Also `cognitive.specialist`, a persona assembled per call (`cognitive.read`).
- Agents: current and newly built, not deprecated. The combination of our `op-agents` (88+ agents, orchestration) with threetched's agents (`agent`, `agents.*` methods) has not been reviewed by the owner yet. Check how they connect before building on them.
- The exchange point at `/exchange/v1` on the door: exists in source, but calls go through FUSE.
- LXD vs Incus for new containers: Incus runs the current containers; LXD is being prepared.
- Schema-tag routing (`schema_tag_registry`, `routing_decision`): shadow-only, not enforced.
- `plugins/<id>/value.json`: live public-projected state, but only `public_state.paths` are disclosed; plugins with no public policy disclose nothing. Prefer the plugin's read operations.
- `fuse.get_catalog`: the UI's grant-filtered schema source (in source; not yet in the sealed catalog as of 2026-11-24, backend being rebuilt). See `docs/wiki/backend-fuse-ui-feed.md`.
