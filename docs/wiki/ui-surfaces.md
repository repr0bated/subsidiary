# UI surfaces in the sealed schema

Topic: how a plugin's schema declares a UI surface, where the Svelte chat interface is defined, and how the UI reads it.
Sources: `odbus-verified` `crates/op-plugins/src/state_plugins/common/llm_projection.rs`, `chat_router.rs`, `antigravity.rs`, commit `b0f8caf` (2026-10-31, "UiSurface purpose sealed in blob"); `op-grpc-bridge/src/mutation_engine.rs`; `3tched.com` `src/svelte/App.svelte`, `runtime.svelte.ts`, `src/chat/door-chat-adapter.ts`; live `/run/mounts/3tchedFS/plugins/chat_router/schema.json`.
Retrieved: 2026-11-23

## The type
`UiSurface` (in `common/llm_projection.rs`) is a schemars struct, so it is part of the schema that gets sealed:
| Field | Subid | Meaning |
|---|---|---|
| `path` | `exp.service.llm-ui-surface.path@v1` | Route path |
| `name` | `exp.service.llm-ui-surface.name@v1` | Display name |
| `schema` | `exp.service.llm-ui-surface.schema@v1` | The schema the surface renders, as `<plugin>.<part>` |
| `purpose` | `exp.service.llm-ui-surface.purpose@v1` | "A purpose is what gives the schema this UI surface." It names the stack the renderer draws or a behaviour the renderer derives |

The type itself carries `sch.software.llm-ui-surface.schema@v1`.

`purpose` is the extension point, and it can be anything (owner, 2026-11-23): a free-form string the renderer interprets. Any plugin schema can gain a UI surface by declaring one with a purpose; nothing about purposes is fixed or enumerated. It was added on 2026-10-31 (`b0f8caf`), serde-defaulted so older blobs still parse. Renderers derive behaviour from it; a purpose grants nothing and execution stays capability-gated. The first purposes were `select-sets-model` (for `/models`) and `chat-takeover` (for `/chat`, render-only); the current sealed value for both is the stack: `vite, svelte-kit, json-render, ai-sdk, chat-sdk`.

## A pre-catalog
The sealed surfaces work like a pre-catalog (owner, 2026-11-23). The `json_render` catalog lists the components that can be drawn; the surfaces, one level up, list which interfaces exist and what each is for (its purpose). The renderer picks catalog components to fulfil a surface's purpose. json-render is strict: it renders only catalog items, so every purpose must be met from the catalog, or by registering a candidate. That strictness is not the seal; the seal is the sealed scaffolding and functional core elements. Adding a surface with a new purpose is how a new kind of interface enters the system, sealed like everything else.

## Where surfaces live
`UiSurface` is one field (`ui_surfaces: Vec<UiSurface>`) of the shared `LlmProjection` struct, which also holds providers, model routes, router, tools, config schema and structured output. `LlmProjection` was shared by `chat_router` and `antigravity`; `rewrite_projection_subids_for_plugin` renames `llm-projection` to `<plugin>-llm-projection` in each plugin's subids so they do not collide.

Today only `chat_router` carries surfaces. `antigravity` dropped its `projection` field (a test asserts it is gone), so "Antigravity's chat interface is the pattern" refers to the shape, not to a surface in the antigravity blob.

Sealed defaults in `chat_router.rs` (catalog `ui_surfaces`):
| name | path | schema | purpose |
|---|---|---|---|
| Chat | `/chat` | `chat_router.chat` | `vite, svelte-kit, json-render, ai-sdk, chat-sdk` |
| gRPC Diagnostics | `/grpc` | `plugin-service` | (empty) |
| Routable Models | `/models` | `chat_router.providers` | `vite, svelte-kit, json-render, ai-sdk, chat-sdk` |

So the Svelte chat interface is the `/chat` surface in the `chat_router` blob, and the model picker is `/models`.

## How the UI reads it
- `chat_router.ListUiSurfaces` (read, `cap.software.threetched.ui-surfaces.read@v1`) returns the sealed `ui_surfaces`; the bridge reads them straight from the sealed schema (`mutation_engine.rs`), failing if the schema declares none.
- The 3tched.com UI (pre-separation reference) loads the purposes by path and treats a missing answer as "unknown": no takeover, everything else keeps working. `App.svelte` renders the chat when `/chat`'s purpose is the stack or `chat-takeover`.

## Adding a surface (for example a chat-mode picker)
A new surface is a new `UiSurface` entry in a plugin's sealed schema: a source change in the backend plugin, then a reseal. Options for the mode picker:
1. Add `{name: "Chat Mode", path: "/mode", schema: "project.context", purpose: "vite, svelte-kit, json-render, ai-sdk, chat-sdk"}` to `chat_router`'s `ui_surfaces`. Smallest change; keeps every surface in one place.
2. Give `project` its own `ui_surfaces` field using the same `UiSurface` type. Puts the surface next to the schema it renders, but `project` does not carry `LlmProjection`.
Either way it is backend work in 3tched, and the UI only reads it.
