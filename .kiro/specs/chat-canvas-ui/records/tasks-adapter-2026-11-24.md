# Implementation Plan: Chat Canvas UI

## Overview

Build the adapter (Rust) and the Svelte shell/transport/canvas in parallel-safe waves: adapter proto and crate skeleton first, then the call/schema RPCs and their property tests, then the feed RPC and reducer with its property tests, then the Svelte shell and canvas wired to the transport, then the end-to-end read-path integration test. Container-mutating steps (LXD disk device, LXD proxy device, systemd unit install) are isolated into their own tasks and explicitly marked as needing owner approval before they are run. No task renders tenant data as accurate, per the Prerequisite in requirements.md.

## Tasks

- [ ] 1. Define the adapter's proto and crate skeleton
  - Create a new Rust crate (e.g. `adapter/`) with `tonic-build`/`tonic-prost-build`, pulling in `_3tched-fs` as a pinned git dependency the same way `op-chat-interface` does
  - Write a new, minimal `.proto` (do not modify `odbus-verified`'s `operation.proto`) with `Call(CallRequest) returns (CallResponse)` and `GetSchema(GetSchemaRequest) returns (GetSchemaResponse)` unary RPCs shaped as `{plugin_id, method, arguments, confirmed}` per design Open Item 2, and a `Subscribe(SubscribeRequest) returns (stream StateChange)` RPC reusing the `SubscribeRequest`/`StateChange` message shapes from `odbus-verified`'s `operation.proto` (copied field-for-field into this crate's own proto, not imported across repos)
  - _Requirements: 1.3, 9.2_

- [ ] 2. Implement identity binding and the Call/Schema RPCs
  - [ ] 2.1 Implement adapter startup: open the container's own 3tchedFS mount via `_3tched-fs::mounted::MountedBackend::open`, read `identity_sled.get_own_identity`, hold the `BoundIdentity`
    - _Requirements: 1.1, 1.2_
  - [ ] 2.2 Implement the `Call` RPC handler: translate the request 1:1 into `MountedBackend::call(plugin, method, arguments, confirmed)` and return the receipt's outcome unchanged, including `outcome_unknown` and capability-denial outcomes, with no retry
    - _Requirements: 1.3, 5.5, 9.2_
  - [ ]* 2.3 Write property test for Property 1 (call relay is a transparent 1:1 mapping) using `proptest` with a fake backend trait object, 100+ cases
    - **Property 1: Call relay is a transparent 1:1 mapping**
    - **Validates: Requirements 1.3, 5.5, 9.2**
  - [ ] 2.4 Implement the `GetSchema` RPC handler backed by `MountedBackend::schema(plugin)`
    - _Requirements: 2.1, 3a.1_
  - [ ] 2.5 Implement the granted-method filter (schema methods whose `required_capability` is absent or held) as a standalone pure function
    - _Requirements: 2.1_
  - [ ]* 2.6 Write property test for Property 5 (granted-schema filtering is exact) using `proptest`, 100+ cases
    - **Property 5: Granted-schema filtering is exact**
    - **Validates: Requirements 2.1**
  - [ ]* 2.7 Write unit tests for identity re-verification (capability no longer held, identity changed mid-call) using fixed examples
    - _Requirements: 1.2_

- [ ] 3. Checkpoint - ensure adapter tests pass
  - Ensure all `cargo test` tests pass, ask the user if questions arise

- [ ] 4. Implement the Subscribe (feed) RPC and the browser-side feed reducer
  - [ ] 4.1 Implement the adapter's `Subscribe` handler, relaying schema frames, state frames, tombstones and heartbeats for the requested `plugin_ids` without adding adapter-side buffering/caching beyond one in-flight stream task
    - _Requirements: 1.4, 6b.1, 6b.2, 6b.7_
  - [ ] 4.2 Implement the TypeScript feed reducer (`ui/src/lib/transport/feed-reducer.ts`): apply frames keyed by `(plugin_id, object_path)`, keep only the highest `state_generation`, apply tombstones, treat withheld paths as absent
    - _Requirements: 6b.3, 6b.4, 6b.5, 6b.6_
  - [ ]* 4.3 Write property test for Property 2 (feed reducer keeps only the newest generation per path) using `fast-check`, 100+ cases
    - **Property 2: Feed reducer keeps only the newest generation per path**
    - **Validates: Requirements 6b.3**
  - [ ]* 4.4 Write property test for Property 3 (tombstones remove and stay removed) using `fast-check`, 100+ cases
    - **Property 3: Tombstones remove and stay removed**
    - **Validates: Requirements 6b.3**
  - [ ]* 4.5 Write property test for Property 4 (withheld state never materializes) using `fast-check`, 100+ cases
    - **Property 4: Withheld state never materializes**
    - **Validates: Requirements 6b.6**
  - [ ] 4.6 Implement feed-stop-on-terminal-condition logic (identity change, capability denial, revocation, malformed frame stop the feed; transport unavailability or expired proof retry) in the reducer/subscription wrapper
    - _Requirements: 6b.7_
  - [ ]* 4.7 Write unit tests for feed-stop-on-terminal-condition with concrete examples of each terminal and each retryable case
    - _Requirements: 6b.7_

- [ ] 5. Checkpoint - ensure adapter and UI feed tests pass
  - Ensure all `cargo test` and `vitest --run` tests pass, ask the user if questions arise

- [ ] 6. Implement the browser gRPC-Web transport client
  - [ ] 6.1 Implement `GrpcWebBackend` (`ui/src/lib/transport/grpc-web-backend.ts`) using `@connectrpc/connect-web`'s gRPC-Web transport, exposing `call(plugin, method, arguments)`, `getSchema(plugin)`, `subscribeFeed(pluginIds)`, generated from the Task 1 proto
    - _Requirements: 1.3, 9.2_
  - [ ] 6.2 Implement the custom AI SDK `ChatTransport` (`ui/src/lib/transport/chat-transport.ts`) whose `sendMessages` calls `chat_response.submit_turn` through `GrpcWebBackend.call` and converts the committed response into AI SDK `UIMessageChunk`s, emitting `data-spec` `flat` parts for a committed canvas payload (incremental `patch` streaming deferred per design Open Item 3)
    - _Requirements: 5.1, 5.2, 6.5_
  - [ ]* 6.3 Write unit tests for `data-spec` `flat` part construction from a committed `respond_to_user` canvas payload
    - _Requirements: 6.5_

- [ ] 7. Implement the shell
  - [ ] 7.1 Implement `Shell.svelte` with collapsible chat, model/mode picker and nav-menu panels and a canvas region, laid out from an in-memory default (the sealed default layout read via `GetSchema`/`chat_router.ListUiSurfaces`), persisting layout changes in memory only for this session (design Open Item 4; no `localStorage` as source of truth)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_
  - [ ] 7.2 Implement `ModelModePicker.svelte`: reads `chat_router.ListProviders`/`ListModels` and `project.get_context` via `GrpcWebBackend.call`/`getSchema`, writes selections via `chat_router.SetSelection` and `project.select_context`, and suppresses "Personal" mode when the bound identity is a subsidiary
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 7.3 Write unit test: picker suppresses "Personal" mode for a subsidiary identity fixture and offers it otherwise
    - _Requirements: 4.4_
  - [ ] 7.4 Implement `NavMenu.svelte` as an empty collapsible placeholder panel (contents deferred to design Open Item 5)
    - _Requirements: 3.1_
  - [ ]* 7.5 Write unit test: collapsing a shell panel hands its freed space to the canvas region (layout/DOM assertion)
    - _Requirements: 3.3_

- [ ] 8. Implement the canvas renderer and actions
  - [ ] 8.1 Wire `@json-render/svelte`'s `Renderer`/`JsonUIProvider`/`defineRegistry` against the catalog read via `GetSchema`, pinned to `core_version` 0.20.x, with `buildSpecFromParts` rebuilding specs from `Chat.messages`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1a_
  - [ ] 8.2 Mount the Task 4.2 feed reducer's output read-only under `/plugins/<plugin_id>` in the `JsonUIProvider` state store
    - _Requirements: 6b.4, 6b.5_
  - [ ] 8.3 Implement action-handler registration: one handler per catalog action whose method is present in the granted schema (Task 2.5's filter), each handler performing exactly one `GrpcWebBackend.call` and returning the receipt
    - _Requirements: 6a.1, 6a.2_
  - [ ] 8.4 Route `mutates_state` actions through `propose_pending_tool`/`approve_pending_tool`/`consume_pending_tool` instead of a direct call
    - _Requirements: 5.3, 6a.3_
  - [ ]* 8.5 Write unit test: a `mutates_state` action handler proposes and awaits approval rather than calling directly
    - _Requirements: 6a.3_
  - [ ] 8.6 Display call receipts and host refusals (with the missing capability) returned from any Call RPC invocation in the chat/canvas UI
    - _Requirements: 5.4, 5.5_
  - [ ]* 8.7 Write unit test: an `outcome_unknown` receipt renders as "unknown, not retried" and triggers no automatic second call
    - _Requirements: 5.5_

- [ ] 9. Checkpoint - ensure all UI and adapter unit/property tests pass
  - Ensure all `cargo test`, `vitest --run` and `npm --prefix ui run check` checks pass, ask the user if questions arise

- [ ] 10. Implement the end-to-end read-path integration check
  - [ ] 10.1 Write one integration test that starts a real adapter instance against a real (or container-equivalent) FUSE mount, issues a `chat_response.list_conversations` read call through the real gRPC-Web wire from a test client, and asserts the returned receipt has populated `operation_id`, `outcome`, `event_id`, `event_hash`, `terminal_event_id`, `terminal_event_hash`, `subid`, `required_capability`, `side_effect` fields, unchanged from what the FUSE call file returned
    - _Requirements: 1.3, 9.2_

- [ ] 11. Container provisioning tasks (require owner approval before running)
  - [ ] 11.1 Add the read-only LXD disk device exposing the adapter binary and static UI build output into the container — **requires owner approval before execution**
    - _Requirements: 9.2_
  - [ ] 11.2 Add the LXD proxy device forwarding a host-loopback port to the container's loopback adapter port (or its Unix-socket hardening alternative, owner's choice) — **requires owner approval before execution**
    - _Requirements: 9.2_
  - [ ] 11.3 Install the adapter as a systemd unit inside the container — **requires owner approval before execution**
    - _Requirements: 9.2_

- [ ] 12. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional test sub-tasks and are not implemented as part of automatic task execution.
- Requirement 6c (accountability view data), Requirement 7 (candidates) and Requirement 8 (Lichtenstein styling/sound effects) are deliberately absent from this task list: the Prerequisite in requirements.md limits this phase to the shell, the transport/adapter, and rendering from schema frames, with no view presenting data as accurate. Add them as a follow-on task list once the owner's state fix lands.
- Turn-response incremental streaming (design Open Item 3) ships only as the committed (`flat`) path in Task 6.2; true `patch` streaming is a later task once the backend exposes a push channel for in-progress turns.
- Task 11's three sub-tasks are mutating container changes and must not be executed without explicit owner approval, per tech.md and security.md.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.4", "2.5"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "2.6", "2.7"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4", "4.5", "4.6"] },
    { "id": 6, "tasks": ["4.7"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2"] },
    { "id": 9, "tasks": ["6.3", "7.1", "7.4"] },
    { "id": 10, "tasks": ["7.2"] },
    { "id": 11, "tasks": ["7.3", "7.5", "8.1"] },
    { "id": 12, "tasks": ["8.2", "8.3"] },
    { "id": 13, "tasks": ["8.4", "8.6"] },
    { "id": 14, "tasks": ["8.5", "8.7"] },
    { "id": 15, "tasks": ["10.1"] },
    { "id": 16, "tasks": ["11.1", "11.2", "11.3"] }
  ]
}
```
