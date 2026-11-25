# Chosen route: chat as canvas with a precompiled catalog

Topic: the route the project owner intends to take for the sealed surface. For use when the sealed-surface-gui spec is revised.
Sources: https://ai-sdk.dev/docs/getting-started/svelte ; https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage ; https://svelte.dev/docs/svelte/legacy-svelte-component ; json-render.md in this wiki
Retrieved: 2026-11-19
Status: direction from the owner's own research and notes. Items marked VERIFY are not yet confirmed.

## Route in one paragraph
The chat message list is the canvas. Each assistant message has ordered parts. Tool parts and structured parts are rendered inline by precompiled Svelte 5 components chosen from a fixed catalog, mounted dynamically from a JSON tree. Components keep their own `$state` and `bind:` controls. User interactions return to the model loop as tool output. The catalog is compiled at build time; nothing compiles in the browser.

## Two phases: compile the CMS structure first, runtime second
Stated by the project owner. Interpreting a voice-typed note, so correct if wrong.

1. Compile phase (ahead of time, per business). The schema is turned into the CMS structure: the compiled Svelte components and the catalog entries that business needs. This matches the plan to pre-generate the fictional businesses and their schemas.
2. Runtime phase. The chatbot is the canvas. It renders views from the compiled structure, binds controls to local state, and reads live data through FUSE. It does not invent structure at runtime.

Consequences:
- Nothing compiles in the browser, so no compiler needs shipping and no generated code needs sealing. The seal is the sealed scaffolding and functional core elements (owner, 2026-11-23); the catalog only limits what can be drawn.
- "Rendered on the fly" means choosing and filling compiled structure per view, not producing new component code.
- Schema changes require re-running the compile phase before they show up. VERIFY how this fits "live schema, no copies"; the compile output must be derived from the live schema through FUSE and not kept as a second source of truth.

## Confirmed in the AI SDK docs
- Tool results go back with `addToolOutput`; approvals with `addToolApprovalResponse`.
- `sendAutomaticallyWhen` resumes the model loop; helper `lastAssistantMessageIsCompleteWithToolCalls` (and a variant for approval responses) exists.
- Tool part states include `input-streaming`, `input-available`, `output-available` and `approval-requested`. Tool parts are typed `tool-{name}`; dynamic tools use `dynamic-tool`.
- A tool can require approval (`needsApproval`) and the client can use `onToolCall`.
- The Svelte `Chat` class exposes reactive `messages`, and its API is described as largely the same as React's `useChat`. The tool-usage page itself is written for `useChat`; VERIFY each name against `@ai-sdk/svelte` types before use.
- Svelte 5 rule: do not destructure `Chat` properties; pass reactive args by reference (getters). `createAIContext()` shares state across components.
- Server-streamed React Server Components (`streamUI`, `@ai-sdk/rsc`) are React only. The Svelte path is client-side rendering of parts.

## Dynamic mounting in Svelte 5
In runes mode a component held in a variable re-renders when that variable changes, so `<Component {...props} />` from a registry lookup works. `<svelte:component>` is only needed in legacy mode. VERIFY the exact current syntax in the Svelte 5 docs when writing the renderer.

## Catalog rendering
Either hand-write the mapping (`registry[node.type]`) or use json-render's `defineRegistry` and `<Renderer>` for Svelte 5. See json-render.md. json-render adds a typed catalog, prompt generation, streaming and state/action bindings.

## Where the route conflicts with project rules
These parts of the research assume a standard web stack. They do not fit as written:
- SvelteKit `+server.ts` endpoints, form actions and Remote Functions as the action path. The only backend channel here is grant-checked FUSE call files, and all models run in the backend behind FUSE.
- An HTTP or gRPC sidecar to Cozo from SvelteKit. Cozo is reached only through the backend and FUSE.
- A shared client-side store that mutates the database directly. Writes must go through grant checks.
- Tool `execute` functions that perform effects. The chatbot only renders; effects happen through call files.
- "Save generated layouts to `.svelte` files and trigger a Vite build". Not in scope; views are generated per page and the catalog is fixed at build time.
- Reading the project as a "Component Content Management System" (DITA topics, where-used queries). Here "CMS" means a schema-generated compliant CMS for a fictional tenant. Reuse and versioning features are not requirements unless added to the spec.

## What the client keeps
Message parts, the catalog renderer, local component state, and a thin adapter that turns user interactions into FUSE call files and turns results back into parts.

## Open decisions for the spec
1. What the backend returns per request: ready UI tree, tool-call-shaped parts, or schema the chatbot turns into a tree.
2. Whether to use json-render or a hand-written registry.
3. How action names map to call files, and how a denied grant is shown in the canvas.
4. Whether the `Chat` class is used as the client state holder or replaced by a thin FUSE-backed equivalent with the same part shapes. VERIFY whether `Chat` can use a custom transport.
5. State persistence across page reloads: from what, and through which call file.
