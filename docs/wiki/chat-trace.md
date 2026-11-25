# Chat trace: one turn, end to end

Topic: how a chat turn travels, which code owns each step, and what is current vs deprecated.
Sources: `3tched.com` `crates/op-chat-interface` (commit `ed1891a`, 2026-11-21), `odbus-verified` `crates/op-grpc-bridge`, `crates/op-plugins/src/state_plugins/chat_response.rs`, `.kiro/specs/identity-chat-interface/records/ts-rust-conversion-inventory.md` (2026-11-19), and the live 3tchedFS operation list.
Retrieved: 2026-11-23

## Owner statements (2026-11-23)
- The chat is the Vercel stack (AI SDK and Chat SDK). Its server-side TypeScript has been converted to Rust. Only the browser UI stays TypeScript/Svelte.
- Every tool call, the chat's included, goes through the execution tracker.
- `chat_router` is current (confirmed 2026-11-23). It is really the provider plugin, but the name stays.
- EMQX is deprecated and not used.

## Where the code lives
- Browser UI (TypeScript, Svelte 5): `3tched.com` `src/svelte`, `src/chat`. Uses `@ai-sdk/svelte` `Chat` with a custom transport, `@json-render/svelte`, `chat`.
- Chat route (Rust, runs inside the identity container): `3tched.com` `crates/op-chat-interface`. `responder.rs` owns the model and tool loop; `mounted.rs` is the container-side FUSE client ("every invocation writes once and reads the receipt from the same descriptor").
- Host: `odbus-verified` `op-grpc-bridge` (`Runtime::call`, the execution tracker, chat conversations); `chat_response` plugin (the schema of a turn).

## One turn (current code)
1. The human submits a turn: `chat_response.submit_turn`. The bridge commits the human turn before any inference and opens an answer turn for the designated responder.
2. The responder in the container reads and claims it: `get_pending_turn`, then `claim_pending_turn`.
3. It builds the offered tools from the granted methods (excluding `chat_response` itself) and asks for a generation: `chat_response.generate_pending_turn`. Inference is owned by the pinned threetched runtime on the host; the container has no provider HTTP client.
4. Tool calls:
   - Reads: called directly through FUSE (`backend.call(plugin, method, ...)`), then recorded with `record_pending_tool`. The receipt and resulting state go back to the model as untrusted data.
   - Mutations: proposed with `propose_pending_tool`, approved by the human through the Svelte catalog (`approve_pending_tool`), then `consume_pending_tool`, called, and recorded.
5. The answer is always a tool call, never raw text: `respond_to_user` (or `request_clarification`, `cannot_perform`), with optional `canvas` content. The responder reads it back with `get_response_commit`.
6. Identity on every call comes from `identity_sled.get_own_identity` on the container's own mount.

Every one of these is a `Runtime::call`, so the execution tracker reserves it, admits it, commits `ReceiptCompleted` and appends the sled ledger in the same step. No chat-side tracking code is needed.

## Deprecated, do not use
- EMQX and MQTT, including the responder wake (`op-grpc-bridge/src/responder_wake.rs`, `opdbus/responder-wake/...`) and the MQTT wake relay in `op-chat-responder`.
- MCP (retired 2026-10-28).
- The standalone `ChatService` proto in `op-chat-interface` (removed in `ed1891a`) and the Node ChatLink worker per principal.

## Open
- With EMQX gone, how is the responder told a turn is pending? (First person: it should see the pending turn in its own mount, not be woken or poll.)
- Where the chat interface and the model and mode picker are declared as UI surfaces now, if not in `chat_router`.
- Which methods set model and mode now, if `chat_router.SetSelection` is deprecated. `project.select_context` sets the chat mode.
- Known gaps from the 2026-11-19 inventory: no turn trace id across a turn's tool calls; no sealed method to read one's own execution records; the UI message stream emits whole parts, not AI SDK deltas.
