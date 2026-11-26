# Exchange point and the schema feed through FUSE

Topic: how the chatbot UI sets mode and model, and how the schema it renders reaches it.
Sources: `odbus-verified` `crates/op-grpc-bridge/src/exchange_point.rs`, `chat_mode_policy.rs`, `.kiro/specs/identity-chat-interface` Requirement 34; the live 3tchedFS mounts on antix1; `/srv/git/3tched.com` package.json and `src/`.
Retrieved: 2026-11-23. Re-checked against the live view 2026-11-26 (see the exchange-point line below).

## Owner rules (2026-11-23)
- Clear cut: the UI runs strictly in the container; the backend runs strictly on the host.
- The UI sends the model and chat mode; they are set on the host.
- The host does all grants and capabilities and delivers only the schema that is granted to the UI. No chatbot or identity ever makes grants or capabilities, by any path (FUSE, host or container). The host has always done all of it.
- Development happens in this repository (`ui/`).
- The UI is delivered from the container, passed through directly to the user's browser.
- The schema comes through FUSE. Every call goes through FUSE; that is the primary way to make calls, for 3tched and here.
- Both FUSE views (`3tchedFS` and `threetchedFS`) are part of the bridge.

## First person (owner, 2026-11-23)
The identity is the system is the container. They are one thing: the container does not host or log in as an identity, it is the identity, and its mount is what that system sees.

The identity looks out from its own mount. It does not search for services, poll for state, wait on readiness, or authenticate to reach things. What it may use is already local and readily available in its mount: the plugins, the methods it is granted, their schemas, and its call files. Identity is a property of whose mount it is; the host already did grants and capabilities before anything appeared there.

For code this means:
- Read what is in the mount; do not discover endpoints or build service lookups.
- Act by writing a call file and reading its receipt; no login, token exchange or credential handling in the UI.
- Take changes from the plugin feeds; no polling loops or retry-until-ready.
- If something is absent, that is the answer (not granted, or not sealed), not a reason to search elsewhere.

## Exchange point
- One place where the UI sets variables and receives the schema. It holds no logic: no routing, grant, admission or schema-selection logic.
- Set variables:
  - `mode`, `project_id`, `personal_namespace` go unchanged to `project.select_context`.
  - `provider_id`, `model_id` go unchanged to `chat_router.SetSelection`.
  - Each is a normal sealed call, admitted and recorded by the execution tracker.
- Receive schema: the bridge selects it from the sealed catalog by the caller's exact grants. The reply holds:
  - `catalog`: blob format version, `catalog_hash`, `previous_catalog_hash`, `generation`
  - `session`: `principal_id`, `session_id`
  - `modes`: `allowed`, `default`, `current`
  - `plugins`: each with `plugin_id`, `version`, `schema_hash` and the methods the caller may call (`name`, `required_capability`, `subid`)
- The bridge source also serves it on the door at `/exchange/v1`. Per the owner rule above, the UI reaches it through FUSE. Checked 2026-11-26: the live view (generation 75) has no exchange plugin or operation. Mode and model go through `project.select_context` and `chat_router.SetSelection`, and the grant-filtered schema is meant to come from `fuse.get_catalog`, which is not sealed yet.

## Chat modes
Personal, Project, ControlPlane, Accountability, NotebookLm, UiRender.
- A subsidiary identity has no Personal mode. Its default is ControlPlane if it holds `chat.control_plane`, otherwise Accountability.
- The control-plane chatbot defaults to ControlPlane.
- Personal chat, personal namespace and soul writes stay in the container's own RocksDB and never reach the sled or its vectors. Other modes go to the sled and are vectorized at the end of the session.

## FUSE layout (3tchedfs/1)
- `view.json`: `view_id`, `source_catalog_hash`, `source_catalog_generation`, `parent_view`, and `objects` (plugin to object hash). Catalog generation 75 when retrieved; still 75 on 2026-11-26.
- `plugins/<plugin>/`: `schema.json`, `capabilities.json`, `object.blob.json`, `object.hash`, `value.json`, `data/`, `operations`.
- `operations/<plugin>/<method>/`: `call`, `input.schema.json`, `output.schema.json`, `metadata.json`.
- `capabilities/`: one entry per capability, for example `agent.invoke`, `cap.container.oci.create@v1` (URL-encoded on disk).
- `relationships/`.
- 74 plugins in `view.json` on 2026-11-26 (this page said 75 before; the host mount section already said 74). Render-related: `json_render` (catalog, components, specs, validation, candidate save and promote), `schema_renderer` (`render_schema`, `get_rendering`, `list_galleries`, `validate_schema`; needs `schema_renderer.read`), `web_ui` (`render_page`, `update_component`, `handle_event`). Mode and model: `project`, `chat_router`.

## Host FUSE mounts (`/run/mounts`, 2026-11-23)
- `/run/mounts/3tchedFS` (fuse.3tchedFS): our OP-DBUS plugins, 74 of them, catalog generation 75.
- `/run/mounts/threetched` (fuse.3tchedFS): one plugin, `threetched`, with its own `view.json`. Same FUSE engine and catalog hash.
- `/run/mounts/by-container/<name>/`: per-container views (`3tchedChatbot`, `Jeremy`), root-only.

## How a call works (from `hackathon/docs/DEV-CYCLE.md` and `crates/_3tched-fs`)
- Write the arguments to `operations/<plugin>/<method>/call`, then read the result from the same file. The result is the receipt (operation id, outcome, capability, chain event).
- Transport envelope format `3tchedfs.call/1`: plugin arguments stay unchanged; metadata carries `source_schema_hash`, `admitted_operation_id`, `response_turn_id`, `remaining_ms`. Budgets: 30 s ordinary, 600 s for application calls. VERIFY the exact bytes with the `3tched-callfile` helper before writing a client.
- Only the mount owner's UID may call (`caller_allowed` in `fuse_fs.rs`). The bridge then checks identity and the exact capability and commits the receipt.
- Each method's `metadata.json` names its `side_effect` (read or mutation), `idempotent`, `required_capability` and `subid`. Examples:
  - `project.select_context`: mutation, `chat.context`. Sets the chat mode.
  - `project.get_context`: read, `chat.context`.
  - `chat_router.SetSelection`: mutation, `cap.software.threetched.selection.set@v1`. Sets provider and model; both required.
  - `schema_renderer.render_schema`: read, `schema_renderer.read`.
  - `web_ui.render_page`: takes `spec_id`, returns a UI spec record with its `catalog_hash`.
- `plugins/<id>/value.json` is live public-projected state: only `public_state.paths` are disclosed, and a plugin with no public policy discloses nothing. On 2026-11-26 `plugins/project/value.json` does not exist. The EIO described in DEV-CYCLE.md was not reproduced. Use the plugin's read operations instead.
- Live consumers get each plugin's schema feed over the bridge's `Subscribe`, with values derived from committed state.
- The UI is derived from the blobs: screens from `schema_renderer.render_schema`, components only from the catalog sealed in the `json_render` blob, every generated spec validated against that catalog. Every action shows its receipt, and a refusal shows the missing capability.

## Observed on 2026-11-23
- Host view `/run/mounts/3tchedFS` and the chatbot's view `/run/mounts/by-container/3tchedChatbot/{3tchedFS,threetched}` are mounted. Schemas, operation files and capability lists read fine.
- `value.json` and `data/` return I/O errors from the host, also as root. This is a known gap; use read operations.
- Inside the `3tchedChatbot` container, `/run/mounts/3tchedFS` and `/run/mounts/threetchedFS` are empty directories. The FUSE views are mounted on the host side but are not visible inside the container. `/run/mounts/opdbus` (with `lungs/`, `tunnel/`, `lungs.sock`, `door.crt`) is present. This is not the Subsidiary container. The right container was not provisioned yet (owner, 2026-11-23); these observations describe the existing chatbot container only and are not requirements.

## Existing chat UI (`/srv/git/3tched.com`, pre-existing)
- SvelteKit with `adapter-static`, Svelte 5, `@ai-sdk/svelte` 5, `ai` 7, `@json-render/core` and `@json-render/svelte` 0.20, `chat` 4.43.
- Uses the AI SDK `Chat` class with a custom transport (`sessionChatTransport`). So `Chat` accepts a custom transport, which answers open decision 4 in chat-as-canvas-route.md.
- Layout adapted from json-render's `examples/svelte-chat`, without its API route or AI SDK server transport.
- `src/chat/` already has `chat-mode.ts`, `ModelPicker`, `ModeStrip`, `mounted-catalog.ts`, `threetchedfs-surface.ts`. It does not call the exchange point yet.
- It is pre-existing work (first commit 2026-09-17). Anything reused from it must be listed in `PREEXISTING.md`.

## What it means for Subsidiary
- The UI does not choose what to render from; it sets mode and model and renders what the bridge delivers for its grants.
- A subsidiary has no Personal mode, so the Subsidiary UI should not offer it.
- The catalog versioning (hash, generation) is the cache key for compiled catalog output. No new versioning scheme.
- Next to confirm: the FUSE path for the exchange point, and how a call file returns its result to the browser through the container passthrough.
