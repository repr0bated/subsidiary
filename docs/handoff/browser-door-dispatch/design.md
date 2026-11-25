# Design — `browser-door-dispatch`

Source references are odbus-verified `dev` at `bf3c4a8`.

## Current state

- `crates/op-tunnel-mux/src/lib.rs`
  - `AcceptQueue { inner: HashMap<u32, Vec<oneshot::Sender<TcpStream>>> }`, keyed by the Unix peer uid from `peer_uid()` (`UdsConnectInfo.peer_cred`).
  - `deliver(stream)` drops closed waiters, refuses unless exactly one uid is waiting, then pops that uid's waiter.
  - `Tunnel::accept` registers `(uid, tx)`, waits for a `TcpStream`, then `spawn_splice` copies bytes between the gRPC frame stream and the TCP stream, tracking it in `active`.
  - `serve(unix, inbound, mux)`: the raw accept loop calls `deliver_inbound(stream)` with no other argument.
  - `op-tunnel-door` (a bin in this crate) holds Accept streams and splices each delivered connection to a container-local address.
- `crates/op-grpc-bridge/src/runtime_tunnel.rs`: the single `OWNER` (`OnceLock<Owner>`), built from `OP_TUNNEL_DOOR` and `OP_TUNNEL_SOCKET` (socket mode 0666; "the peer credential names the caller"). It serves the `tunnel` plugin methods `status`, `set_open` and `close_connections`.
- `crates/op-plugins/src/state_plugins/tunnel.rs`: `TunnelState { door, socket, open, waiting_uids, waiting, active, oldest_active_since }`.
- `crates/op-grpc-bridge/src/runtime_lungs_identity.rs`: `LungsIdentity::capture` takes `PeerLifetime::from_socket`, the peer's `ProcessIdentity` (pid, start ticks, user and pid namespaces) and its uid. `bind_current_container` rejects host and Incus-forkproxy peers and finds the `ContainerBinding` whose init shares the peer's namespaces (`find_container_binding`), adopting unindexed identity volumes once.
- Deploy: `deploy/runit/op-grpc-bridge/run` sets `OP_TUNNEL_DOOR=10.0.0.2:8090`. The seed's `deploy/provisioning/runit/op-tunnel-door/run` idles unless `/run/opdbus/tunnel/tunnel.sock` exists. `deploy/warp-vip/README.md` reserves `100.96.0.5:8090` for control-plane MCP.

## Shape of the change

```
browser ──TCP──▶ host browser door listener(s)
                    │  selector (D1) → binding
                    ▼
               BrowserMux.deliver_to(binding, stream)
                    │  pops a live waiter of that binding only, else refuses
                    ▼
     Tunnel.Accept stream (browser socket) ──▶ op-tunnel-door in that container
                                                 └─ existing splice ─▶ container UI listener (TLS ends here)

control plane: 100.96.0.5:8090 → 10.0.0.2:8090 → existing Mux (uid keyed, sole waiter)  — unchanged
```

### 1. A generic accept queue

Make `AcceptQueue` generic over its key, `AcceptQueue<K: Eq + Hash + Clone>`, and split its single method in two:

- `deliver_sole(stream)`: today's behavior, unchanged, used by the control-plane `Mux` (`K = u32`).
- `deliver_to(&K, stream)`: drop closed waiters for that key, then pop waiters of that key until one accepts the stream. Return `Err` when the key is absent or every waiter has ended. It never looks at other keys.

Keep LIFO `pop()` to match current behavior. The order doesn't matter for correctness.

### 2. Waiter identity

Add a `WaiterIdentity` trait in `op-tunnel-mux`, so the mux stays free of bridge types:

```rust
pub trait WaiterIdentity<K>: Send + Sync + 'static {
    /// Identify the peer of an Accept on the browser socket. Err => unauthenticated.
    fn identify(&self, stream: &tokio::net::UnixStream) -> anyhow::Result<WaiterProof<K>>;
}
pub struct WaiterProof<K> { pub key: K, pub revalidate: Box<dyn Fn() -> bool + Send + Sync> }
```

The bridge implements it with the lungs code. It calls `LungsIdentity::capture` plus the container-binding lookup, using the binding's `session_id` as `K`, and builds `revalidate` from `PeerLifetime::revalidate`. Factor out the lookup part of `bind_current_container`, which finds the binding without publishing a D-Bus binding, so both callers share one implementation. Don't fork a copy of the lookup.

Identification has to happen per connection on the Unix socket, before the gRPC request. Today `serve_unix` uses `UnixListenerStream`, and `peer_uid` reads `UdsConnectInfo`. For the browser socket, accept connections manually, run `identify` on each `UnixStream`, and attach the resulting `WaiterProof` as connect info. tonic's `serve_with_incoming` accepts any stream of `Connected` IO, so a wrapper type carries the proof into the request extensions. Refuse the connection outright if `identify` fails.

`deliver_to` calls `revalidate()` before it sends the stream to a waiter. If revalidation fails, it drops that waiter and continues with the same key.

### 3. A second mux, owned by the bridge

- New environment variables: `OP_BROWSER_DOOR` (host listen address for option B, or the host address for option A) and `OP_BROWSER_SOCKET` (default `/run/opdbus/tunnel-browser/browser.sock`, in its own directory so provisioning can bind it into user containers without exposing `tunnel.sock`).
- `runtime_tunnel.rs` gains a second owner slot, `BROWSER_OWNER`, built only when `OP_BROWSER_DOOR` is set. The control-plane `OWNER` and its code path stay as they are.
- `op_tunnel_mux::serve_browser(unix, listeners, mux, selector, identity)`: one accept loop per listener. Each loop calls `selector.select(&listener_meta, &stream).await` to get `Option<K>`, then `mux.deliver_to(&k, stream)`. A `None` closes the stream. Each refusal is logged with a reason, but no identity value goes into the log.

### 4. Selector (D1)

```rust
#[async_trait] pub trait Selector<K> {
    async fn select(&self, listener: &ListenerMeta, stream: &TcpStream) -> Option<K>;
}
```

- **Option A, a port per container:** `ListenerMeta` carries the local port. The bridge implementation maps port → `session_id` from the committed identity records, the same source `find_container_binding` reads. Listeners are opened for committed containers that have an assigned port. Port assignment is a provisioning field on the identity record. Where that field lives is a sub-decision for whoever owns provisioning.
- **Option B, SNI:** `select` uses `TcpStream::peek` (non-consuming), with a byte cap of 16 KiB and a deadline, to parse only the ClientHello `server_name`. It maps the name → `session_id` from the committed identity records, and returns `None` for malformed, oversized, slow or ECH ClientHellos and for unknown names. Because `peek` doesn't consume anything, the splice later forwards the original bytes unchanged.

### 5. Tunnel plugin state

Add to `TunnelState`. Each field gets its own `x-oscal-subid`, using the `sch.software.plugin.tunnel.*@v1` family:

- `browser_door: Option<String>`
- `browser_open: bool`
- `browser_waiting: u32`
- `browser_active: u32`

Don't add per-binding lists. `waiting_uids` stays as it is for the control-plane door. Extend `set_open` and `close_connections` with an optional `door: "control" | "browser"` argument that defaults to `control`, so existing callers keep their behavior. Regenerate the sealed schema and the `oscal_subid_registry` entries from the plugin. Don't hand-edit the generated `plugin_types.rs`.

### 6. Container side

`deploy/provisioning/runit/op-tunnel-door/run`:

```sh
if [ -S /run/opdbus/tunnel/tunnel.sock ]; then          # chatbot: control-plane door (unchanged)
  mountpoint -q /run/mounts/threetchedFS || { sleep 3; exit 1; }
  exec op-tunnel-door --socket /run/opdbus/tunnel/tunnel.sock --door 10.0.0.2:8090
elif [ -S /run/opdbus/tunnel-browser/browser.sock ]; then  # user container: browser door
  exec op-tunnel-door --socket /run/opdbus/tunnel-browser/browser.sock --door "${OP_UI_LISTEN:?}"
else
  echo "no tunnel device; idle"; exec sleep infinity
fi
```

`OP_UI_LISTEN` is the container's own TLS UI listener, written by provisioning. Provisioning binds `/run/opdbus/tunnel-browser/` into every user identity container, and binds `/run/opdbus/tunnel/` only into the chatbot. Check whether the threetchedFS mount guard also applies to user containers.

## Security notes

- The selector only picks a container. It doesn't authorize anything. The container's TLS and its own identity checks remain the gate, and the host never terminates browser TLS.
- A container can only register waiters under its own binding, because the key comes from the kernel peer proof and the committed identity records. Whatever a container sends in the Accept request is ignored for keying.
- A container that holds no waiter can't receive connections. A container that stops can't receive connections meant for others, because delivery never falls through to another key.
- With option B, the ClientHello parser is a new parser of untrusted bytes. Keep it minimal, bounded and fuzzed.

## Not changed

The browser, the chatbot, the container content server, `spawn_splice` and `op-tunnel-door`'s splice logic, the control-plane door and its tests, the bridge's TLS door, and the FUSE layer.

## Open questions

1. D1 (requirements.md).
2. For option A: where the per-container port is recorded and who assigns it.
3. Container runtime (checked 2026-11-25): LXD. The live `kiroween` container has no NIC: its only devices are `root`, `run` (host `/run/opdbus/subsidiary/<session_id>/run` bind-mounted at `/run`, recursive) and `sled` (identity volume at `/agent/user`, read-only). It is unprivileged with `security.idmap.isolated` (its own host uid range, base 1065536), and `user.opdbus.session_id` is set on the instance. Consequences:
   - The tunnel socket is the only way in, which is what this design needs.
   - Simpler alternative to task 3, for the owner to weigh: the host creates one browser socket per container inside that container's own host run directory (`/run/opdbus/subsidiary/<session_id>/run/opdbus/tunnel-browser/browser.sock`). The socket the Accept arrived on then names the binding, because only the host writes that directory and only that container sees it. The lungs peer proof can still be checked on top. This replaces the shared socket directory of Requirement 4.4.
   - With isolated idmaps the peer uid is already unique per container, but keying stays on the binding so it survives a recreated container with a new uid range.

## Live verification, 2026-11-25 (golden 335, from the host)

- TLS through the browser door: `openssl s_client -connect 10.0.0.2:20000` verifies against the exported `/run/opdbus/ct/Jeremy/door.crt` (return code 0) and negotiates ALPN `h2`. The guest certificate's SANs are IP 10.0.0.2, IP 127.0.0.1, `localhost` and `dashboard.ghostbridge.tech`, valid to 2036. The port is not part of the name, so `:20000` matches.
- UI: `GET /` returns 200 `text/html`.
- gRPC-web: the `OPTIONS` preflight and `POST /operation.v1.PluginService/ListPlugins` (`application/grpc-web+proto`) both return HTTP 200 through the door.
- CORS: the bridge returns no `access-control-allow-origin` for `https://10.0.0.2:20000` or `:8090`, so its exact-origin allowlist is empty or names neither. That is fine while the UI and gRPC-web share the origin (`https://10.0.0.2:20000`). A UI served from any other origin would need that origin added to the bridge allowlist (`configured_allowed_origins`).
- Not checked: browser trust of the guest certificate (the browser must trust `door.crt`), and two-container routing (kiroween has no TLS listener).
