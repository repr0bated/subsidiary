# Design: Chat Canvas UI

> Check against `docs/wiki/backend-fuse-ui-feed.md` (2026-11-24): the backend serves the UI through `container_ui.rs` on the TLS door, gives schema through `fuse.get_catalog`, and gives state through per-plugin read methods. The in-container adapter below overlaps with that path; owner to decide before implementation.

## Overview

The UI is a Svelte 5 static build served, together with a small Rust adapter, from inside the Subsidiary container. The browser never talks to the backend, the FUSE mount, or 3tched directly. It talks over gRPC-Web, on loopback, to the adapter. The adapter is the only process that writes 3tchedFS call files. It runs as the container's own identity (the container is the identity), holds no state of its own, and maps each gRPC-Web request to one FUSE call-file round trip or one plugin feed subscription.

```
browser (host)                 container                              container's own mount
┌─────────────┐  gRPC-Web      ┌───────────────────────┐  call file   ┌──────────────────────┐
│ Svelte UI   │ ───loopback──▶ │ adapter (tonic+tonic-  │ ───write/───▶│ /run/mounts/3tchedFS  │
│ @ai-sdk/    │ ◀──LXD proxy── │ web, systemd unit)     │ ◀──read──────│ /run/mounts/threetchedFS│
│ svelte Chat │                │ serves static UI files │              └──────────────────────┘
└─────────────┘                └───────────────────────┘
```

This design covers only what the prerequisite in requirements.md allows: the shell (chat, model/mode picker, navigation menu), the browser-to-adapter-to-FUSE transport, and rendering from schema/state frames. It does not render any view as carrying accurate tenant data until the owner's state fix lands (see Testing Strategy and Open Items). Accountability-view semantics (Requirement 6c), candidates (Requirement 7) and the Lichtenstein styling (Requirement 8) are designed at the schema/transport level only; their data-bearing behavior is deferred to later tasks, clearly marked.

## Architecture

### Process placement (owner decision, not revisited here)

- **Host**: builds everything. rustc/cargo 1.100 builds the adapter as a normal dynamically linked release binary (host and container share glibc 2.43, so the binary runs unmodified in the container). Node 22.23.5 via `fnm` builds the static Svelte bundle (`vite build`). Foundry/anvil are unrelated to this spec's runtime path and used only for the existing web3 work.
- **Build output handoff**: one read-only LXD disk device exposes the adapter binary and the static UI build directory to the container. The host home directory, which holds secrets, is never mounted. The container's isolated idmap means host-owned files appear as `nobody` inside the container; read-only consumption needs no matching UID.
- **Container**: runs the adapter as a systemd unit (systemd is PID 1 in this container, per owner approval). The adapter binds `127.0.0.1:<port>` inside the container, serves the static UI files from the same origin (removing any CORS concern), and exposes the gRPC-Web endpoint from the same listener (tonic-web layered over the same tonic service, or a second same-origin path — see Components).
- **Host-to-container reachability**: an LXD proxy device forwards a host loopback port to the container's loopback port. The browser (on the host, or wherever the user's browser runs against this host) reaches `127.0.0.1:<host-port>`, which the proxy relays into the container. Any host process can reach that forwarded port (noted risk). A Unix-socket proxy device with file permissions is offered as a hardening alternative; **owner decides**, not resolved by this design (Open Items).
- **Identity**: the adapter makes every FUSE call as the container's own identity, from the container's own mount (`/run/mounts/3tchedFS`, `/run/mounts/threetchedFS`), matching Requirement 1 and the tech.md rule that the container does not hold or run as an identity — it is the identity.

### Why an adapter instead of FUSE-from-browser

The browser cannot open a FUSE mount. Requirement 9.2 (edited) authorizes exactly this shape: browser reaches only a local adapter over gRPC-Web; the adapter reaches the backend only through FUSE call files and the FUSE mount, and holds no logic or state of its own. "No logic or state" is read here as: the adapter does not decide grants, does not cache schema or committed state beyond what is needed to relay one in-flight RPC, and does not retry or paper over outcomes.

### Why gRPC-Web and not plain gRPC or REST

gRPC-Web is the browser-safe subset (unary and server streaming only; no client or bidi streaming) and lets the UI reuse 3tched's existing protobuf service definitions (`operation.proto`: `StateSync`, `PluginService`) instead of inventing a new wire format. tonic-web adds this to a normal tonic server with one layer, so the same Rust service definitions serve both the UI and anything else that already speaks tonic.

### Call shape mapping

| UI need | gRPC-Web shape | Backend equivalent the adapter performs |
|---|---|---|
| One-shot call (submit a turn, set mode/model, approve a tool, read own identity) | Unary RPC | Write `operations/<plugin>/<method>/call`, read the receipt from the same file (or call `_3tched-fs::mounted::MountedBackend::call`, see Components) |
| Plugin feed (schema + state frames per Requirement 6b) | Server streaming RPC | Subscribe equivalent reachable from inside the container (Open Item 1 below — no door/bridge runs in-container; see Components for the fallback) |
| Turn response streaming (assistant text + `data-spec` parts arriving incrementally) | Server streaming RPC | Poll-free: the adapter streams out whatever the backend's response channel yields for that turn, without the adapter itself polling (Open Item, see below) |

## Components and Interfaces

### 1. Adapter (Rust, new crate, built on the host)

Responsibilities, each a direct translation of one requirement:

- **Identity** (Req 1.2): on startup, open the container's own 3tchedFS mount via the canonical pinned FUSE client (`_3tched-fs`, the same crate `op-chat-interface::mounted::MountedBackend` already uses in 3tched.com) and call `identity_sled.get_own_identity`. Hold the returned `BoundIdentity` for the process lifetime; re-verify it on every call the same way `MountedBackend::call` already does (compare `principal_id`, `session_id`, `genesis` before and loses the race only if it actually changed mid-call).
- **Call RPC** (unary): accepts `{plugin_id, method, arguments}` (reusing `CallMethodRequest`/`CallMethodResponse` shape from `operation.proto`, or a FUSE-shaped equivalent — see Open Items 2), calls `MountedBackend::call(plugin, method, arguments, confirmed)`, and returns the receipt verbatim, including `outcome_unknown` so the UI can show it without the adapter retrying (Req 10.6 / tech.md: feeds carry no authority, outcome_unknown is not success).
- **Schema RPC**: `GetSchemaRequest{plugin_id} -> GetSchemaResponse{schema_json}` backed by `MountedBackend::schema(plugin)`. Used for Requirement 2.1/3a.1 (granted schema only, surfaces as pre-catalog) and 6.2 (`json_render.validate_spec` is itself just another unary call, not special-cased in the adapter).
- **Feed RPC** (server streaming): `StateSync.Subscribe`-shaped request/response reusing `operation.proto`'s `StateChange` message (schema frames, state frames, tombstones, heartbeats, `state_generation`, `catalog_hash` — Requirement 6b.1-6b.3). The adapter does not invent a new feed protocol; it is the shape already defined in `odbus-verified/crates/op-grpc-bridge/proto/operation.proto`.
- **No business logic**: the adapter never inspects `arguments`, never decides what is granted (that is `held_capabilities` enforcement already inside `MountedBackend::call`), and never renders or validates a spec.
- **Serving static files**: the same tonic server also serves the Svelte build's static assets from the read-only LXD disk device path, same origin as the gRPC-Web endpoint, so the browser makes zero cross-origin requests.
- **Zero retry/poll**: per Req 1.1 and 1.4, the adapter does not poll the mount or retry a timed-out call; a 60s-deadline call that times out comes back as `outcome_unknown` (matching `_3tched-fs::dispatch::LungsError::OutcomeUnknown`) and the UI shows it, not-retried (Error Handling).

### 2. Browser transport (`ui/src/lib/transport/`)

- A thin `GrpcWebBackend` built on `@connectrpc/connect-web` (or equivalent gRPC-Web client) pointed at the host-loopback port the LXD proxy exposes. It exposes three functions: `call(plugin, method, arguments)`, `getSchema(plugin)`, `subscribeFeed(pluginIds)`.
- A custom AI SDK `ChatTransport` (consumed by `@ai-sdk/svelte`'s `Chat` class, Requirement 5.1) whose `sendMessages` writes one `chat_response.submit_turn` call through `GrpcWebBackend.call`, and whose streamed response is read back from the turn's server-streamed response RPC (Open Item 3) and converted into AI SDK `UIMessageChunk`s, including `data-spec` parts per Requirement 6.5 (`patch` while streaming, `flat` once committed).
- This transport is the **only** code path that reaches outside the Svelte component tree; every component calls it only through `defineRegistry`'s action handlers (Requirement 6a) or the picker components (Requirement 4), never directly.

### 3. Shell (`ui/src/lib/shell/`)

- `Shell.svelte`: lays out chat panel, model/mode picker panel, nav menu panel, and the canvas region, per the sealed default layout (Requirement 3.4/3.5). Each panel is collapsible (Req 3.3); collapsing one gives its space to the canvas region via a CSS grid/flex reflow, not an overlay.
- The shell's own layout state (which panels are open, their sizes) is **not** `localStorage`-sourced truth (Req 3.6): it is read once at mount from a granted call (Open Item 4 — which method; until resolved, the shell starts from the sealed default layout every load and changes are kept in memory only, never silently promoted to `localStorage` as a substitute source of truth).
- `ModelModePicker.svelte`: renders `chat_router.ListProviders`/`ListModels`/`SetSelection` and `project.get_context`/`select_context` (sealed per Requirement 4), each via one `GrpcWebBackend.call`. Suppresses "Personal" mode when the identity is a subsidiary (Req 4.4), determined from the identity read (Req 1.2), not hard-coded.
- `NavMenu.svelte`: left as a navigation surface placeholder; what it lists is Open Question 5 from requirements.md (unresolved; see Open Items).

### 4. Canvas / renderer (`ui/src/lib/canvas/`)

- `@json-render/svelte`'s `Renderer`, `JsonUIProvider`, `defineRegistry` against the sealed `json_render` catalog (read via the Schema RPC), pinned to the host blob's `core_version` (0.20.x) per Requirement 9.1a.
- `buildSpecFromParts` rebuilds the spec from the reactive `Chat.messages` parts stream (Requirement 6.5); no `createUIStream`/`createChatUI` HTTP helpers are used (Requirement 6.6).
- Action handlers (Requirement 6a): one handler per catalog action whose method is present in the granted schema; each handler performs exactly one `GrpcWebBackend.call` and returns the receipt; actions with `mutates_state` route through the propose/approve flow (`propose_pending_tool`/`approve_pending_tool`, Requirement 5.3) instead of calling directly.
- Plugin feeds (Requirement 6b): one `subscribeFeed` per plugin (or one call with multiple `plugin_ids`), applied into a `/plugins/<plugin_id>` read-only branch of the `JsonUIProvider` state store, keyed by object path, keeping only the highest `state_generation`, honoring tombstones, treating withheld state as absent.

### 5. Reused backend pieces (not re-implemented)

| Need | Reused as-is |
|---|---|
| Call-file semantics, identity binding, capability check, timeout/`outcome_unknown` handling | `_3tched-fs::mounted::MountedBackend` and `_3tched-fs::dispatch` (odbus-verified) |
| Feed wire shape | `operation.proto`'s `StateSync`/`StateChange` (odbus-verified `op-grpc-bridge`) — reused as the schema for the adapter's own Feed RPC, not as a client of the existing bridge (Open Item 1) |
| Chat turn lifecycle | `chat_response` plugin methods (`submit_turn`, `claim_pending_turn`, `generate_pending_turn`, `propose_pending_tool`, `approve_pending_tool`, `consume_pending_tool`, `record_pending_tool`, `respond_to_user`) called exactly as `op-chat-interface::responder.rs` already calls them — the adapter only relays, it does not re-implement the turn loop |
| UI surfaces pre-catalog | `chat_router.ListUiSurfaces` (Requirement 3a.1) |
| Candidate registration (deferred data-bearing work, Requirement 7) | `json_render.save_candidate`/`list_candidates`/`get_candidate`/`promote_candidate`/`delete_candidate` |

### Reuse discipline (zcall vs. the adapter)

Per `current-vs-deprecated.md`, scripts/hooks/agents/tests call sealed methods with `zcall`, not custom call-file code. The adapter is the one deliberate exception: it is a long-running service process relaying arbitrary browser-initiated calls one-to-one, not a script invoking a known method. Writing call files directly (via `_3tched-fs::mounted::MountedBackend`, the same crate 3tched.com's own `op-chat-interface` already depends on) is chosen over shelling out to `zcall` per request because: (a) `zcall` is a CLI process spawn per call, unsuitable for a server streaming feed that must stay open; (b) the adapter needs the typed receipt/outcome structure (`LungsError::OutcomeUnknown`, capability denial, etc.) that `_3tched-fs` already exposes as Rust types, not text to re-parse; (c) `_3tched-fs` is the same canonical pinned dependency 3tched.com's chat interface uses, so this does not introduce a second call-file implementation. All test fixtures, dev scripts, and hooks for this spec still use `zcall`, never hand-rolled call-file code.

## Data Models

No new persistent data model. The adapter is stateless between calls (Requirement 9.2's "holds no logic or state of its own"); it holds only:
- `BoundIdentity { principal_id, session_id, genesis }` — read once, re-verified per call, never persisted.
- In-flight RPC state (open feed subscriptions, one tokio task per stream) — process memory only, gone on restart.

Browser-side, the only client state is the `JsonUIProvider` store's two branches:
- `/plugins/<plugin_id>/...` — read-only, fed only from Feed RPC frames, replaced wholesale per path per Requirement 6b.4/6b.5.
- everything else (form inputs, picker selections, shell layout-in-memory) — local view state, never promoted to committed state (Requirement 6a.4).

This feature is UI/transport wiring over an existing backend contract, not a data transformation or parser/serializer. Per the design workflow's PBT applicability guidance, the testable logic here is state-reducer behavior (applying feed frames, highest-`state_generation`-wins, tombstone handling) and request/response mapping (adapter translating gRPC-Web calls 1:1 into FUSE calls and relaying receipts unchanged) — both are pure-function reducers over structured input, which is amenable to property-based testing. Rendering itself (json-render, Svelte components, Lichtenstein styling) is UI rendering and is excluded from PBT per the same guidance; it gets example/unit and visual checks instead.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Call relay is a transparent 1:1 mapping

For any plugin, method, and argument payload, when the browser issues a Call RPC, the adapter SHALL invoke exactly one underlying `MountedBackend::call` with the same plugin, method and arguments, and SHALL return the receipt's outcome (`success`, `outcome_unknown`, or capability denial) unchanged to the caller, without retrying the call itself.

**Validates: Requirements 1.3, 5.5, 9.2**

### Property 2: Feed reducer keeps only the newest generation per path

For any sequence of state frames across arbitrary plugins and object paths, applying them in any order into the feed reducer SHALL leave each path holding the value from the frame with the highest `state_generation` for that path, and SHALL never regress a path to a lower `state_generation` it has already observed.

**Validates: Requirements 6b.3**

### Property 3: Tombstones remove and stay removed

For any object path that has received a tombstone frame, SHALL that path (and everything under it) read as absent, and SHALL a subsequently-applied frame for that same path with a `state_generation` lower than the tombstone's leave the path absent.

**Validates: Requirements 6b.3**

### Property 4: Withheld state never materializes

For any plugin feed that never sends a frame for a given object path (because it is withheld), that path SHALL read as not-present in the `/plugins/<plugin_id>` store, and the reducer SHALL NOT synthesize a placeholder or default value for it.

**Validates: Requirements 6b.6**

### Property 5: Granted-schema filtering is exact

For any schema returned to the adapter and any set of held capabilities, the set of methods the UI is permitted to call SHALL be exactly the methods whose `required_capability` (if any) is in the held-capabilities set, with no method present in both "offered" and "excluded by capability".

**Validates: Requirements 2.1**

## Error Handling

- **Host refusal with missing capability (Req 5.5)**: a `CallMethodResponse`/receipt with a capability-denial outcome is passed through unchanged by the adapter; the UI renders it as a refusal naming the missing capability, never as a generic error or a retry.
- **`outcome_unknown` (timeout/transport ambiguity)**: surfaced to the user as "unknown — not retried", exactly per `_3tched-fs::dispatch::LungsError::OutcomeUnknown`'s own guidance ("do not retry automatically"). The UI never auto-retries a call whose outcome is unknown; a retry, if any, is a new explicit user action and a new call.
- **Ungranted view request (Req 2.2)**: the chatbot's own reply layer handles this (it is a `chat_response` conversational outcome, not a transport error); the adapter has nothing special to do here beyond relaying the turn response as-is.
- **Malformed or capability-denied feed frame (Req 6b.7)**: the browser-side feed reducer stops that plugin's feed; it retries only on transport unavailability or an expired proof, matching plugin-feeds.md's rule precisely. Identity change, capability denial, revocation, and malformed frames are terminal for that feed until the user re-establishes it (e.g. page reload), not auto-retried.
- **Adapter process crash/restart**: systemd restarts the unit; the browser's gRPC-Web client sees a connection failure and the UI shows a transport-level notice, never silently reconnecting with stale identity assumptions (a fresh adapter re-reads identity on startup).

## Testing Strategy

### What runs on the host

- **Adapter (Rust)**: `cargo test` in the adapter crate. Property tests (below) run as ordinary `cargo test` targets using `proptest` (chosen because it is already idiomatic in the Rust ecosystem the surrounding crates use; not implemented from scratch), minimum 100 cases per property, each tagged with a comment naming the design property it checks.
- **UI (Svelte/TypeScript)**: `vitest --run` for the feed-reducer and transport-mapping unit/property tests (using `fast-check` for property tests, same 100-iteration minimum), and `npm --prefix ui run check` (`svelte-check`) for type/template checking, per `.kiro/steering/svelte.md`.
- **No watch-mode commands** are part of any task in this spec; `vitest --run` and `cargo test` only.

### Property-based tests (map to Correctness Properties)

| Property | Where | Library |
|---|---|---|
| 1 (call relay transparency) | Adapter, `cargo test`, with a fake `MountedBackend` trait object standing in for the real FUSE mount (no live mount needed for this property) | `proptest` |
| 2 (newest generation wins) | UI, `vitest --run`, pure reducer function, no network | `fast-check` |
| 3 (tombstones stay removed) | UI, `vitest --run`, same reducer | `fast-check` |
| 4 (withheld never materializes) | UI, `vitest --run`, same reducer | `fast-check` |
| 5 (granted-schema filtering) | UI or adapter (pure filter function over a schema + capability set fixture) | `fast-check` or `proptest`, whichever side owns the filter function once written |

### Unit and integration tests

- Unit: picker suppresses "Personal" mode when identity is a subsidiary (Req 4.4); shell panel collapse hands its space to canvas (Req 3.3, DOM/layout assertion); action handler for a `mutates_state` action routes to propose/approve instead of calling directly (Req 6a.3); `data-spec` `patch` vs `flat` parts both rebuild correctly via `buildSpecFromParts` (Req 6.5).
- Integration (end-to-end read path, the one the task list implements): a single automated check that drives the real chain — browser-side `GrpcWebBackend.call` (or the lowest test double that still crosses the real gRPC-Web wire) issuing a read-only call (for example `chat_response.list_conversations`, confirmed from the container to return a receipt with `operation_id`, `outcome`, `event_id`, `event_hash`, `terminal_event_id`, `terminal_event_hash`, `subid`, `required_capability`, `side_effect`) through a running adapter instance against the container's real FUSE mount, asserting the receipt fields come back populated and unchanged. This is infrastructure wiring, not logic with varying behavior, so it is a single example-based integration test (1 example), not a property test, per the PBT-applicability guidance.
- No test presents rendered data as accurate ahead of the owner's state fix (Prerequisite in requirements.md): tests assert transport/shape correctness, not that displayed values are meaningful tenant data.

## Open Items

These are raised, not resolved, per the instruction not to silently decide owner-level questions.

1. **No bridge/door runs inside the container (Req 1, Req 9.2).** `StateSync.Subscribe` as defined in `odbus-verified/op-grpc-bridge` is a *host*-side gRPC service; nothing in the container currently exposes an equivalent over the FUSE mount (`plugins/<id>/value.json` returns EIO; `data/` returns EIO). This design assumes the adapter can get a feed-equivalent stream from inside the container (per plugin-feeds.md Open Question: "is there a FUSE equivalent for the identity inside the container, or do container processes read point-in-time state through read operations only?"). **Blocks the shell's live-feed piece** (Requirement 6b) until answered. Proposal: until resolved, the adapter's Feed RPC degrades to periodic read-operation snapshots reusing the plugin's own read methods (not polling the mount's internals, calling a granted read method, which is Requirement-1-compliant) rather than true push frames; this is explicitly a fallback, and the owner should confirm whether that fallback is acceptable or whether the in-container feed mechanism needs backend work first.
2. **Exact adapter RPC schema**: whether to reuse `operation.proto`'s `CallMethodRequest`/`CallMethodResponse` verbatim (which is object-path/interface-shaped, matching D-Bus, not call-file-shaped) or define a FUSE-call-file-shaped equivalent (`plugin_id`, `method`, `arguments`, `confirmed`) as a new, smaller proto reusing only the `StateChange`/`SubscribeRequest` messages from `operation.proto` for the feed half. This design assumes the latter (new minimal proto for Call/Schema, reused `operation.proto` messages for Subscribe) because `CallMethodRequest`'s `object_path`/`interface_name`/`capability_id` fields do not match the call-file model the adapter actually drives (`MountedBackend::call(plugin, method, arguments, confirmed)`, no object path or capability id supplied by the caller — capability is resolved from the schema, not asserted by the request). **Owner should confirm** this split before the adapter's `.proto` file is written (Task 1).
3. **Turn response streaming shape**: how a turn's streamed response (assistant text deltas and `data-spec` patches arriving incrementally, per Requirement 6.5) is read back from `chat_response` once `submit_turn`/`claim_pending_turn`/`generate_pending_turn`/`respond_to_user` have run. The backend-side turn lifecycle (chat-trace.md) does not describe a push channel for turn-in-progress text to a caller who did not generate it; this may require a dedicated server-streaming read (new Feed-like subscription scoped to one turn) or may mean the UI only sees the committed response once `respond_to_user`'s commit is read back, without true incremental streaming, until the backend adds one. **Flagged, not resolved**; tasks below build the committed (non-incremental) path first and leave true streaming as a later, explicitly marked task.
4. **Which granted method stores the user's shell layout** (requirements.md Open Question 3, Requirement 3.6). Until answered, Task 7 below keeps layout in memory only (sealed default on every load), per the Components section.
5. **What the navigation menu lists** (requirements.md Open Question 5). Not designed here; `NavMenu.svelte` ships as an empty collapsible placeholder (Task 3) pending the owner's answer.
6. **How the UI/adapter learns a turn is pending now that EMQX is retired** (requirements.md Open Question 6, also open in chat-trace.md for the responder itself). This affects only the turn-response-streaming piece (Open Item 3) and candidate/accountability features deferred out of this phase; not a blocker for the shell or the read-only Feed/Call RPCs.

Mutating container changes — the LXD read-only disk device, the LXD proxy device (or its Unix-socket hardening alternative), and the systemd unit install inside the container — all require explicit owner approval before being run, and are marked as such in the task list.
