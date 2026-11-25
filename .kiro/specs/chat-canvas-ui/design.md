# Design: Chat Canvas UI

Revised 2026-11-24 to follow the backend's own path, documented in `odbus-verified/docs/FUSEFS.md` §12 ("How schema and state reach the UI") and summarized in `docs/wiki/backend-fuse-ui-feed.md`. The earlier design with an in-container Rust adapter is kept in `records/design-adapter-2026-11-24.md`; it is superseded because the bridge already serves the UI, the schema and the state.

## Overview
The UI is a static Svelte 5 build. It adds no server, adapter or service of its own.

```
Browser (human session)                op-grpc-bridge (host, TLS door)                    Container's own mounts
┌──────────────────────┐  static files ┌─────────────────────────────────┐  MountedNamespace ┌───────────────────────┐
│ Svelte UI            │ ◀──────────── │ container_ui.rs (CHAT_UI_DIR)   │ ────────────────▶ │ /run/mounts/3tchedFS   │
│ @ai-sdk/svelte Chat  │  gRPC-Web     │ fuse.get_catalog  (schema)      │                   │ /run/mounts/threetchedFS│
│ @json-render/svelte  │ ◀───────────▶ │ StateSync.Subscribe (state)     │ ◀── SHM state ─── │ (schema frozen, state  │
│                      │  as the human │ CallMethod → Runtime::call      │     + catalog     │  live on open)         │
└──────────────────────┘               └─────────────────────────────────┘                   └───────────────────────┘
```

Three identities, kept apart by the backend (FUSEFS.md §12.4):
| Concern | Identity | Decided by |
|---|---|---|
| Execution (every call, every effect) | The human in the browser | `Runtime::call` grants |
| Rendering reads (schema, committed state, subscriptions) | The designated chatbot renderer principal | `configured_renderer`, `can_render_plugin` |
| Private state selection | The human only | the caller's private scope |

The UI never decides any of these. It renders what arrives and sends actions as the human.

## Components

### 1. Static build and serving
- `ui/` is a SvelteKit app built with `adapter-static` to `index.html` plus `assets/`, which is exactly what `container_ui.rs` serves from `CHAT_UI_DIR` (`/`, `/chat`, `/assets`). Serving only starts after the bridge verifies the container's mount.
- Built on the host with Node 22 (installed through fnm). Placing the build where `CHAT_UI_DIR` points, and setting it, is a deployment step on the backend side and needs owner approval.
- No credentials in the UI. The door handles the human's identity (SID1); the UI forwards what the session already carries and mints nothing (Requirement 10.2).

### 2. Door client (`ui/src/lib/door/`)
- One gRPC-Web client for the door's `PluginService.CallMethod` and `StateSync.Subscribe`.
- Types are generated at build time from `odbus-verified`'s `crates/op-grpc-bridge/proto/operation.proto` at a pinned commit, given by configuration (not a hard-coded path, Requirement 9.3). The proto is never copied into this repository.
- `call(plugin, method, args)` sends one `CallMethod` and returns the receipt unchanged, including `outcome_unknown` and refusals. It never retries.

### 3. Catalog (`ui/src/lib/catalog/`)
- On start, and again when a frame reports a new `catalog_hash`, the UI calls `fuse.get_catalog`. It returns both views (3tchedFS and threetchedFS), every plugin's sealed schema and `schema_hash`, and each operation with `call_path`, `metadata_path` and `currently_granted`. The bridge has already checked it against the sealed catalog.
- The catalog carries no state (`state: "not_requested"`).
- The catalog is the chatbot's material; nothing in it reaches the human until the chatbot renders it. When the chatbot renders an operation that is not `currently_granted`, it shows it as present but not runnable (owner decision, 2026-11-24). The chatbot never renders capabilities.
- Surfaces (Requirement 3a) come from `chat_router.ListUiSurfaces`; the json-render catalog from the `json_render` plugin's schema.

### 4. State (`ui/src/lib/state/`)
Pull, with StateSync as the wakeup (FUSEFS.md §12.2, §12.3):
1. Subscribe first, with `include_initial_state` and `include_schema`. The bridge opens the commit receiver before sending hydration, so nothing is missed.
2. Hydration frames: committed public state and the human's own private state, plus one schema frame per plugin.
3. Live frames: after each durable commit the bridge re-reads the committed value and sends a `StateChange` with the fresh value and `state_generation`, deduplicated per plugin, scope and generation.
4. On `data_loss` ("committed state stream lagged; hydrate again"), disconnect, or a new `catalog_hash`: discard and hydrate again.
5. Never poll on a timer.

The reducer keeps one feed per plugin: newest `state_generation` per object path, tombstones remove a subtree and block older frames, withheld state is simply absent. Feed data sits read-only under `/plugins/<plugin_id>` in the json-render state store.

State disclosed through the mount is limited to each plugin's `public_state.paths`; plugins with none (for example `chat_response`, `project`, `identity_sled` today) show their data through their read methods instead.

### 5. Chat transport (`ui/src/lib/chat/`)
- A custom AI SDK `ChatTransport` for `@ai-sdk/svelte`'s `Chat`. `sendMessages` calls `chat_response.submit_turn`; the committed response (`respond_to_user`, `request_clarification`, `cannot_perform`) is read back with `get_turn_response` and turned into `UIMessageChunk`s.
- Views travel as `data-spec` parts: `flat` for a committed spec. `patch` streaming waits for a backend push of in-progress turns.
- Mutating tool proposals show approve and deny; the answer goes through `approve_pending_tool`.

### 6. Shell (`ui/src/lib/shell/`)
- Chat, model and mode picker, navigation menu, and the canvas. Each panel collapses and gives its space to the canvas.
- Starts from the sealed default layout; changes are kept in memory until the layout-storage method is known (Open item 3).
- Model picker: `chat_router.ListProviders`, `ListModels`, `SetSelection`, rendered from the Routable Models surface. Mode picker: `project.get_context`, `select_context`. No Personal mode for a subsidiary.

### 7. Canvas (`ui/src/lib/canvas/`)
- `@json-render/svelte` `Renderer`, `JsonUIProvider` and `defineRegistry`, pinned to the host blob's `core_version` (0.20.x).
- `buildSpecFromParts` rebuilds views from the reactive `Chat.messages`.
- One action handler per catalog action whose method is offered. Each makes exactly one `call`. Actions with `mutates_state` go through propose and approve.
- Receipts and refusals are shown without any capability fields (`required_capability` and grant lists are dropped before rendering).

## Data
No persistent data in the UI. Client state is only:
- `/plugins/<plugin_id>/…`: read-only, from StateSync frames.
- Local view state (form inputs, picker selection, layout in memory), never treated as committed.

## Correctness properties
1. Action passthrough: for any action, the handler makes exactly one `CallMethod` with the same plugin, method and arguments, and returns the outcome unchanged, never retrying. Validates 1.3, 5.5, 6a.2.
2. Newest generation wins: for any order of frames, each path holds the value of its highest `state_generation` and never regresses. Validates 6b.3.
3. Tombstones stay removed: after a tombstone, the path and its subtree stay absent against any lower-generation frame. Validates 6b.3.
4. Withheld never appears: a path with no frame reads as absent; no placeholder is synthesized. Validates 6b.6.
5. Runnable is exact and capability-free: among rendered operations, those with a runnable control are exactly the ones with `currently_granted` true, and no rendered output contains a capability name or `required_capability` value. Validates 2.2 to 2.4.
6. Re-hydration is complete: after `data_loss` or a new `catalog_hash`, no value from before the re-hydration survives unless re-sent. Validates 6b.7.

## Error handling
- Host refusal: shown as refused. No capability is named.
- `outcome_unknown`: shown as "unknown, not retried". A retry is a new, explicit user action.
- StateSync `data_loss`, disconnect, catalog change: hydrate again (property 6).
- Identity change, revocation, capability denial or a malformed frame: stop that feed until the user reconnects.
- Renderer not configured on the backend: subscriptions fail closed; the UI shows that state is unavailable, with no fallback.

## Testing
- `vitest --run` with `fast-check` for properties 1 to 6 (100 or more cases each), and unit tests for the picker (no Personal for a subsidiary), panel collapse, `mutates_state` routing, and `flat` `data-spec` parts.
- `npm --prefix ui run check` (svelte-check).
- One integration check against the live door once `fuse.get_catalog` is sealed: load the catalog, subscribe, and make one read call, asserting the receipt has `operation_id`, `outcome` and `event_id`.
- No test presents data as accurate before the state fix (Prerequisite).

## Decisions and open items
1. **Flag, not filter (owner decision, 2026-11-24).** The chatbot follows FUSEFS.md §12.1: it works from the full catalog and shows ungranted operations it renders as present but not runnable, without naming capabilities, because some things must be shown accurately even when they cannot be run. Only things absent from the catalog get "nothing like that available".
2. **Browser calls go through the door, not call files.** The browser cannot write call files. Its actions go through the door's `CallMethod` and are admitted by `Runtime::call`, the same tracker path a call file uses; identities inside containers keep using call files. Requirements 1.3 and 9.2 are revised to say this.
3. Which granted method stores the user's layout (Requirement 3.6).
4. What the navigation menu lists.
5. How in-progress turns are pushed, for `patch` streaming.
6. `fuse.get_catalog` and the renderer principal become live with the current golden build; until then only the static shell can be built and tested.
7. FUSEFS.md §12.4 mentions MQTT wake doorbells as a channel with its own checks. EMQX is retired; the UI does not use any MQTT path.
