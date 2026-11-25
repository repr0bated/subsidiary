# Implementation Plan: Chat Canvas UI

Revised 2026-11-24 for the backend path (door, `fuse.get_catalog`, StateSync). The adapter plan is kept in `records/tasks-adapter-2026-11-24.md`. Tasks 1 to 7 need no live backend. Status 2026-11-25: scaffold, door passthrough, runnable and capability stripping, feed reducer, chat transport and shell done with 15 passing tests (properties 1 to 6); `svelte-check` clean; `npm run build` writes `build/index.html` and `build/assets/`. Tasks 8 and 9 need the current golden build sealed and live. Nothing here presents data as accurate before the state fix.

- [x] 1. Scaffold `ui/`
  - SvelteKit with `adapter-static` (output `index.html` and `assets/`), Svelte 5, TypeScript, Node 22
  - Pin `@ai-sdk/svelte` ^5, `ai` ^7, `@json-render/core` and `@json-render/svelte` 0.20.x, `zod` ^4; dev: `vitest`, `fast-check`, `svelte-check`
  - `check` and `test` scripts (`vitest --run`); no React or other framework
  - _Requirements: 9.1, 9.1a, 9.3_
- [ ] 2. Door client
  - [ ] 2.1 Generate TypeScript types for `PluginService` and `StateSync` from `operation.proto` at a pinned `odbus-verified` commit given by configuration; do not copy the proto into this repo
  - [x] 2.2 `call(plugin, method, args)`: one `CallMethod`, receipt returned unchanged, no retry
  - [x]* 2.3 Property test 1 (action passthrough) against a fake door
  - _Requirements: 1.3, 5.5, 9.2, 10.2_
- [ ] 3. Catalog
  - [ ] 3.1 Load `fuse.get_catalog`; keep both views; reload on a new `catalog_hash`
  - [x] 3.2 Runnable function: an operation is runnable only when `currently_granted` is true; rendered ungranted operations are marked not runnable; strip capability fields from anything rendered
  - [x]* 3.3 Property test 5 (runnable is exact and capability-free)
  - _Requirements: 2.1 to 2.6, 3a.1_
- [ ] 4. State feed
  - [x] 4.1 Reducer: one feed per plugin; newest generation per path; tombstones; withheld absent; read-only under `/plugins/<id>`
  - [ ] 4.2 Subscription wrapper: subscribe first with initial state and schema; on `data_loss`, disconnect or new `catalog_hash`, hydrate again; stop on identity change, revocation, denial or malformed frame; no timers
  - [x]* 4.3 Property tests 2, 3, 4 and 6
  - _Requirements: 1.4, 6b.1 to 6b.7_
- [ ] 5. Chat transport
  - [x] 5.1 `ChatTransport`: `submit_turn`, read back with `get_turn_response`, emit text and `flat` `data-spec` parts
  - [ ] 5.2 Approve and deny for mutating tool proposals through `approve_pending_tool`
  - [x]* 5.3 Unit test: committed canvas becomes a `flat` `data-spec` part
  - _Requirements: 5.1 to 5.3, 6.5_
- [ ] 6. Shell
  - [x] 6.1 `Shell.svelte`: collapsible chat, picker and menu; canvas takes freed space; sealed default layout, in memory only for now
  - [ ] 6.2 Model and mode picker: `chat_router.ListProviders`, `ListModels`, `SetSelection`; `project.get_context`, `select_context`; no Personal for a subsidiary
  - [x] 6.3 Navigation menu placeholder
  - [x]* 6.4 Unit tests: no Personal for a subsidiary; collapse gives space to the canvas
  - _Requirements: 3.1 to 3.6, 4.1 to 4.4_
- [ ] 7. Canvas
  - [ ] 7.1 `Renderer`, `JsonUIProvider`, `defineRegistry` against the `json_render` catalog; `buildSpecFromParts` from `Chat.messages`
  - [ ] 7.2 One action handler per runnable catalog action (not-runnable actions render without a handler); `mutates_state` through propose and approve
  - [ ] 7.3 Show receipts (without capability fields), refusals (without naming a capability), and `outcome_unknown` as not retried
  - [ ]* 7.4 Unit tests for 7.2 and 7.3
  - _Requirements: 5.4, 5.5, 6.1 to 6.6, 6a.1 to 6a.4_
- [ ] 8. Integration check against the live door (after the golden build is live)
  - Load the catalog, subscribe, make one read call; assert the receipt has `operation_id`, `outcome`, `event_id`
  - _Requirements: 1.3, 9.2_
- [ ] 9. Deploy the build to `CHAT_UI_DIR` — **requires owner approval**
  - _Requirements: 9.2_

Deferred until state works: Requirement 6c (accountability view data), 7 (candidates), 8 (Lichtenstein styling and bursts).
