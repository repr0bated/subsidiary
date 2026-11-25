# Design — `browser-door-call-identity`

Written 2026-11-25 against odbus-verified `bf3c4a8`. D1 is option A; D2 is closed and D3 accepted (see requirements). Implemented in `89d8950`; state wakeups use the container's own `subscribe_commits()` and re-read `value.json`.

## Today

```
browser ──TLS──▶ host browser door (op-tunnel-mux, port per container)
                 └─▶ op-tunnel-door (in container) ──▶ OP_UI_LISTEN (= identity door 10.0.0.2:8090 by default)
                        op-grpc-bridge: container_ui::mount serves CHAT_UI_DIR
                        CallMethod ─▶ service.rs call_method: requires SID1 xor OIA1 ─▶ UNAUTHENTICATED
```

`container_ui::mount` already opens the container mount as `IdentityMode::GuestKernel` and verifies it, but uses it only as a precondition for serving assets.

## Proposed

```
browser ──TLS──▶ host browser door ─▶ op-tunnel-door ─▶ UI listener (new, own address, same TLS cert)
                   UI router (axum + tonic-web), mounted from container_ui.rs:
                     /, /chat, /assets         ─▶ CHAT_UI_DIR (unchanged)
                     PluginService.ListPlugins ─▶ MountedNamespace::catalog_view
                     PluginService.GetSchema   ─▶ MountedNamespace::schema
                     PluginService.CallMethod  ─▶ MountedNamespace::invoke("plugins/<p>/operations/<m>/call", args, confirm)
                     StateSync.Subscribe       ─▶ mount state + change notification (open item 2)
                     anything else             ─▶ UNIMPLEMENTED
identity door 10.0.0.2:8090: unchanged, SID1/OIA1 required
```

### Pieces

1. **Setting `OP_UI_LISTEN`.** Today it defaults to the identity door address (`provision-container.sh:125`, `30-provision-container.sh:66`). Under option A, provisioning sets a distinct address (for example `10.0.0.2:8443`) that only `op-tunnel-door` targets, and the bridge reads it as a non-secret setting (`/etc/op-dbus/env/OP_UI_LISTEN`, 0:0:600, like the others in `deploy/provisioning/runit/op-grpc-bridge/run`). When it is absent or equals `OP_GRPC_BRIDGE_LISTEN`, the bridge does not start the UI listener: fail closed, with today's behavior.
2. **`UiPluginService`.** A small `PluginService` implementation that holds the opened `MountedNamespace`. `call_method`:
   - Refuses if any `op_identity::sealed_id::HTTP_HEADER_NAME` or `x-oracle-identity-assertion-bin` metadata is present.
   - Resolves `method_decl(plugin, method)`. Refuses if `x-opdbus-capability` is present and differs from `required_capability`.
   - Calls `invoke(path, args, confirm_side_effects = true)`, mapping the receipt into `CallMethodResponse` (`success`, `event_id`, `result`, `error`) as the identity door does.
   - Is not retried. `invoke` already refuses to replace a write, fsync or receipt failure with success (`mounted.rs`, `invoke_bound` comment).
3. **Admission.** Unchanged. The call file is handled by the host's 3tchedFS dispatch, which runs `Runtime::call` with the mount's identity and grants. The container door adds no authority of its own; it is a writer of call files, like `zcall` inside the container.
4. **Mutations.** The UI renders approval for mutations (`approve_pending_tool`). The door passes `confirm_side_effects = true` because the approval already happened in the chat flow, as a separate call. The two-person rule is out of scope.

### Why the mount and not the container's SID1

The bridge could read `/agent/user/sealed_id` and attach it to browser calls as SID1. That is credential injection on the server side. It puts a reusable credential inside a request path the browser drives, and `container_ui.rs` rules it out. The mount carries no credential: identity comes from the FUSE peer (the container), which is how `zcall` already works in the container. It also keeps "call files are the only way to make calls" true.

## Open items

1. **Subscribe without polling (resolved in `89d8950`).** `MountedNamespace` exposes `state()` reads, but I did not find a change notification on the guest mount. Options:
   - the bridge's existing `production_subscribe` (`service.rs:389`), restricted to the mount's disclosed paths and run as the mount identity;
   - an inotify or FUSE notify stream on `plugins/<id>/value.json`, if 3tchedFS emits one.

   The owner or backend chooses. A timer loop is not acceptable.
2. **`fuse.get_catalog`.** It is not in the sealed catalog as of golden 335. `ListPlugins` from `catalog_view` serves the UI in the meantime. When `get_catalog` is sealed, it is just one more call through `CallMethod`.
3. **kiroween image.** It is built from `75dd98b`, before Keccak. It needs a rebuild from `bf3c4a8` or later for receipts to verify.
