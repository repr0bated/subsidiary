# AI SDK and Chat SDK: the pieces we use

Topic: what the Vercel AI SDK and Chat SDK provide, and how each piece maps to 3tched.
Sources: `github.com/vercel/ai` at `fac1d6a` (2026-11-22; `@ai-sdk/svelte` 5.0.179, Apache-2.0) and `github.com/vercel/chat` at `3527c72` (2026-11-21; `chat` and `@chat-adapter/web` 4.45.0, MIT). Local reference clones in `.kiro/state/ref/` (not committed).
Retrieved: 2026-11-23

The 3tched.com UI pins `@ai-sdk/svelte` ^5.0.159, `ai` ^7.0.159 and `chat` ^4.43.0, slightly behind these.

## Svelte only, no React (owner, 2026-11-23)
Svelte is the only UI framework. Not React, Vue, Angular, Solid or any other, including their SDK bindings (`@ai-sdk/react`, `@ai-sdk/vue`, `@ai-sdk/angular`, `@chat-adapter/web/react`, `/vue`).

Both SDKs lean on React in their docs and examples, but the parts we use work with Svelte 5. Use no React anywhere: no `@ai-sdk/react`, no `react`, no JSX, no `@chat-adapter/web/react`, no AI Elements or shadcn React components, no `rsc`.

Checked in the clones' `package.json`:
| Package | React dependency |
|---|---|
| `@ai-sdk/svelte` | none |
| `ai` | none |
| `chat` | none (optional peers are only `ai`, `workflow`, `zod`) |
| `@chat-adapter/web` | `react` and `@ai-sdk/react` are optional peers; use its `/svelte` entry or skip it |

When reading SDK docs, translate React examples (`useChat` hook) to the Svelte `Chat` class. Chat SDK cards can be built with plain function calls (`Card(...)`, `Text(...)`); its JSX runtime is not used.

## Requirements (from the clones' package.json, 2026-11-23)
| Package | Version | Node engine | Peer dependencies | Runtime dependencies |
|---|---|---|---|---|
| `@ai-sdk/svelte` | 5.0.179 | >= 22 | `svelte` ^5.31.0 | `ai`, `@ai-sdk/provider-utils` |
| `ai` | 7.0.179 | >= 22 | `zod` ^3.25.76 or ^4.1.8 | `@ai-sdk/gateway`, `@ai-sdk/provider`, `@ai-sdk/provider-utils` |
| `@ai-sdk/provider-utils` | 5.0.83 | >= 22 | `zod` | `@ai-sdk/provider`, `@standard-schema/spec`, `@workflow/serde`, `eventsource-parser` |
| `chat` | 4.45.0 | >= 20 | optional: `ai` ^6 or ^7, `workflow` ^5 beta, `zod` | `@chat-adapter/catalog`, `@workflow/serde`, remark and unified (markdown) |
| `@chat-adapter/web` | 4.45.0 | >= 20 | all optional: `ai`, `@ai-sdk/svelte` ^4 or ^5, `svelte` ^5 (and React/Vue, unused) | `chat`, `@chat-adapter/shared` |

What this means here:
- Node: the AI SDK needs Node 22 or newer to build. This host has Node v20.19.2, so builds need Node 22 (3tched.com already builds with Node 22 for golden). The browser bundle itself has no Node requirement.
- Svelte 5.31 or newer (3tched.com pins ^5.57.1).
- `zod` is a required peer of `ai`.
- Browser APIs used by the client: `ReadableStream`, `TextDecoderStream`, `structuredClone`, `AbortController`. All current browsers have them.
- `ai` pulls in `@ai-sdk/gateway` (Vercel's hosted AI Gateway) as a dependency, used for model resolution in server-side generation. The browser chat path does not use it. Do not configure it; inference runs on the host through the threetched gateway.
- Chat SDK is optional for us. If used, only `chat` core; skip `@chat-adapter/web`, its state adapters and `workflow`.
- The 3tched.com pins (`@ai-sdk/svelte` ^5.0.159, `ai` ^7.0.159, `chat` ^4.43.0) satisfy these ranges.

## json-render (the on-the-fly renderer)
Source: `github.com/vercel-labs/json-render` at `c926907` (2026-11-18), Apache-2.0, packages 0.23.2. Local clone in `.kiro/state/ref/json-render`. 3tched.com pins ^0.20.0, matching the host blob's `core_version`.

| Package | Peers | Use here |
|---|---|---|
| `@json-render/core` 0.23.2 | `zod` ^4 | Catalog, spec validation, SpecStream, prompt building |
| `@json-render/svelte` 0.23.2 | `svelte` ^5, `zod` ^4 | Svelte 5 renderer: `Renderer`, `JsonUIProvider`, `CatalogRenderer`, `ConfirmDialog` |
| `@json-render/directives` | `zod` ^4 | Optional: `$format`, `$math`, `$concat`, `$count` and others inside specs |
| `@json-render/devtools-svelte` | `svelte` ^5 | Optional, development only |
| `@json-render/shadcn-svelte` | `tailwindcss` ^4 and bits-ui, lucide | Not used: we draw our own Lichtenstein components |
| `@json-render/chat` | `chat` ^4.43 | Not used: renders specs as Slack/Teams cards |
| React, Vue, Solid, Next and other renderers | | Not used (Svelte only) |

How on-the-fly rendering works:
- A spec is `{root, elements}` built only from catalog components.
- SpecStream: the spec arrives as JSON lines of RFC 6902 patches and is applied as it streams (`parseSpecStreamLine`, `applySpecStreamPatch`, `createSpecStreamCompiler`, `compileSpecStream`). The view fills in while the model is still writing.
- In a chat, the spec rides inside the AI SDK message stream as a `data-spec` part (`SPEC_DATA_PART_TYPE`). `createMixedStreamParser` and `pipeJsonRender` split text from spec patches on the server side; on the client, `buildSpecFromParts` and `getTextFromParts` (from `@json-render/svelte`) rebuild the spec and the text from a message's parts.
- `validateSpec`, `autoFixSpec` and `formatSpecIssues` check a spec against the catalog; the sealed `json_render.validate_spec` is the host-side equivalent.
- `createUIStream` and `createChatUI` in `@json-render/svelte` fetch an HTTP `api` URL. We do not use them: the spec comes from our FUSE transport instead, and we feed it to the renderer with the core SpecStream functions.

Requirement: `zod` ^4 (note: `ai` accepts zod 3.25 or 4, so use zod 4 for both).

### How `@json-render/svelte` rides on the AI SDK
This is the key link between the two libraries:
- The AI SDK `UIMessage` is the carrier. A view travels as `data-spec` data parts inside an assistant message, next to its text parts.
- Each `data-spec` part's `data` is one of three payloads: `patch` (one RFC 6902 patch, applied in order), `flat` (a whole `{root, elements}` spec) or `nested` (a tree, flattened on arrival).
- Client side (the example `examples/svelte-chat/src/routes/+page.svelte`): `new Chat({transport})` from `@ai-sdk/svelte`; for each message, `buildSpecFromParts(message.parts)` replays the spec parts into a spec and `getTextFromParts` joins the text; the spec goes to `Renderer`. Because `Chat.messages` is reactive, the view rebuilds as each patch part arrives, which is what makes rendering happen on the fly.
- Server side in the example: `pipeJsonRender(result.toUIMessageStream())` turns spec lines written by the model into `data-spec` parts. In 3tched there is no such server route: the host responder produces the canvas (`respond_to_user` `canvas`), and our FUSE transport must emit it as `data-spec` chunks (`patch` while streaming, or `flat` for a committed whole spec).
- `@json-render/svelte` itself depends only on `svelte` and `zod`, not on a particular `ai` version, so it works with `ai` 7 even though its example pins `ai` 6.

### `@json-render/svelte` API (https://json-render.dev/docs/api/svelte, retrieved 2026-11-23)
- `Renderer {spec, registry, loading}`: renders a spec with a component registry; `null` spec renders nothing.
- `JsonUIProvider {initialState, handlers, validationFunctions}`: wraps the state, visibility, validation and action providers.
- `defineRegistry(catalog, {components, actions})` returns `{registry, handlers, executeAction}`.
- Registry components get `{props, children, emit, bindings, loading}`; `emit("event")` fires the handlers bound in the spec's `on` field.
- Context helpers: `getStateValue(path)`, `getBoundProp`, `isVisible(condition)`, `getAction(name)`, `getFieldValidation`, and full contexts `getStateContext`, `getActionContext`, `getVisibilityContext`, `getValidationContext`.
- Streaming helpers `createUIStream` and `createChatUI` take an HTTP `api` URL (not used here).
- `schema` from `@json-render/svelte` is used when defining catalogs for Svelte specs.

How this maps to 3tched:
- Actions are where rendering meets effects. The sealed `json_render` catalog declares actions (`name`, `params`, `params_schema`, `mutates_state`). Each action handler in `defineRegistry` must do exactly one thing: write a call file for a granted method and return its receipt. Read actions call directly; actions with `mutates_state` go through the responder's propose and approve flow. No handler talks to anything else.
- Only granted methods get handlers. An action whose method is not granted has no handler, so the component cannot fire it.
- `JsonUIProvider` state is local view state only (form values, toggles). Committed state comes from the host; the provider never becomes a second source of truth.
- Visibility conditions and validation run in the browser for display only; the host still validates and admits every call.

### Version on the host
The sealed `json_render` blob declares `core_version` 0.20.0. npm is at 0.23.2, and the bundled changelog stops at 0.16, so the changes between 0.20 and 0.23 are not documented here. Pin the UI to the host's `core_version` (0.20.x) until the host catalog is updated, so the spec format matches what the host validates.

## AI SDK (browser side)
- `Chat` class (`packages/svelte/src/chat.svelte.ts`): reactive `messages`, `status`, `error`; `sendMessage`, `addToolOutput`, `addToolApprovalResponse`. Do not destructure it (Svelte 5 rule).
- `ChatTransport` (`packages/ai/src/ui/chat-transport.ts`): the one seam we replace.
  - `sendMessages({trigger, chatId, messageId, messages, abortSignal, ...})` returns `ReadableStream<UIMessageChunk>`.
  - `reconnectToStream({chatId})` returns the stream or `null`.
  - Built-in examples: `DefaultChatTransport` and `HttpChatTransport` (HTTP), `TextStreamChatTransport`, `WebSocketChatTransport`, `DirectChatTransport` (in-process agent, no HTTP).
- `UIMessage` parts (`ui/ui-messages.ts`): text, reasoning, tool (`tool-{name}`), dynamic-tool, source-url, source-document, file, reasoning-file, data (`data-{name}`), custom, steering-message, step-start.
- Tool part states: `input-streaming`, `input-available`, `approval-requested`, `approval-responded`, `output-available`, `output-error`, `output-denied`.
- `UIMessageChunk` types (`ui-message-stream/ui-message-chunks.ts`): `start`, `finish`, `abort`, `error`, `start-step`, `finish-step`, `reset-step`, `text-start`/`-delta`/`-end`, `reasoning-start`/`-delta`/`-end`, `tool-input-start`/`-delta`/`-available`/`-error`, `tool-approval-request`, `tool-approval-response`, `tool-output-available`/`-error`/`-denied`, `source-url`, `source-document`, `file`, `reasoning-file`, `message-metadata`, `steering-message`, `custom`, and `data-*`.
- Helpers: `lastAssistantMessageIsCompleteWithToolCalls`, `lastAssistantMessageIsCompleteWithApprovalResponses`.
- Not used: provider packages (openai, anthropic, and so on), server `streamText` routes, `rsc` (React only). Inference runs on the host.

## Chat SDK
- `Chat` core plus platform adapters (Slack, Teams, Discord, and so on) and state adapters (memory, Redis, Postgres).
- `@chat-adapter/web`: serves a browser chat over the AI SDK UI message stream (or AG-UI). Its Svelte helper `useChat({api, threadId})` wraps `@ai-sdk/svelte` `Chat` with `DefaultChatTransport` to `/api/chat`. `threadId` is the conversation id.
- Web data parts: `data-plan` and `data-task` (`PlanTaskStatus`: pending, in_progress, complete, error).
- Cards (`chat/src/cards.ts`), platform-neutral elements: Card, Text, Image, Divider, Section, Actions, Button, LinkButton, Link, Field, Fields, Table, Chart (pie and series).
- Modals (`chat/src/modals.ts`): text, date and number inputs, select, external select, radio select, text, fields.
- Not used: state adapters (the backend owns state), platform adapters, the `/api/chat` HTTP route.

## Mapping to 3tched
| SDK piece | 3tched |
|---|---|
| `ChatTransport.sendMessages` | A FUSE-backed transport: `chat_response.submit_turn`, then the turn's committed parts turned into `UIMessageChunk`s |
| `reconnectToStream` | Read the conversation back (`get_conversation`, `get_turn_response`); no live stream to resume |
| `chatId` / `threadId` | `conversation_id` (the backend's; the UI never mints it) |
| Tool part `approval-requested` / `addToolApprovalResponse` | `propose_pending_tool` / `approve_pending_tool` |
| `output-available` | The call's receipt (`record_pending_tool`) |
| `output-denied` | Host refused the call (BONK!) |
| `data-*` parts | Carry the json-render canvas spec and receipts (for example `data-canvas`, `data-receipt`) |
| `data-plan`, `data-task` | The business's work in progress ("On it!") |
| Chat SDK Chart, Table, Card, Actions | Models for json-render catalog components (the "most used contracts" graph) |
| Final answer | Always a `respond_to_user` tool call, rendered as text plus canvas |

## What this means for Subsidiary
- Keep the `Chat` class and message-part rendering; write one transport over FUSE. Nothing else in the SDKs needs replacing.
- The 2026-11-19 inventory notes the Rust chat route emits whole parts, not deltas. A transport can turn committed parts into `text-start`/`text-delta`/`text-end` itself; true streaming would need the backend.
- Use the Chat SDK card and chart shapes as a reference for catalog components; render them with json-render, not with Chat SDK.
- Both SDKs are standard open-source libraries, allowed under the rules; name them in the write-up.
