# Design — `ui-networking-authoritative-2026-11-27`

Status: **AUTHORITATIVE**, 2026-11-27. Requirements: `requirements.md` in this directory.

## The model

The container is the identity, not a destination discovered after login. The committed sled, the lungs connection, the container, the local axum door and the 3tchedFS view are all that one identity. Read from inside: I am the identity; login sealed me; my browser connection is handed to me. Nothing on this path checks, looks up, matches or counts who I am.

The user sees one ordinary HTTPS URI on port `8080`. Internally, the connection is delivered as a capability (an already accepted socket), not as a packet routed to a container address.

```text
browser
  │ HTTPS to the UI URI from the sled: https://<label>.perspective.3tched.com:8080/
  ▼
host shared TCP ingress :8080
  │ peek (non-consuming) the ClientHello server_name
  │ decrypt <label> -> session_id (host key; no lookup)
  ▼
the identity's own lungs connection
  │ host pushes ReceiveBrowser(h): accepted TCP fd as D-Bus Unix fd
  ▼
container-side lungs receiver
  │ raw byte splice entirely inside the identity container
  ▼
127.0.0.1:8443
  │ TLS terminates here (cert *.perspective.3tched.com); existing axum UI door
  ▼
the container's own /run/mounts/3tchedFS
  │ schema reads and call-file writes under this identity's grants
  ▼
response returns over the same handed browser socket
```

The host owns connection admission and delivery. It does not own the page. The container owns TLS, HTTP, the UI router, the schema view, and calls.

## Technology and component ownership

Implementation is Rust 2024 with Tokio. The ingress peeks the ClientHello `server_name` and decrypts its label; eBPF socket custody (already live) may carry the result with the socket; zbus/D-Bus Unix-fd passing transfers it; axum and the existing gRPC-Web bridge continue to serve the UI; 3tchedFS remains the schema and call authority. Runit owns services. No new Python runtime, HTTP proxy, OpenFlow flow, or packet route into a container is introduced.

Current and target ownership in `odbus-verified` is:

| Area | Current source | Target responsibility |
| --- | --- | --- |
| UI label | `crates/op-network/src/browser_route.rs` | Encrypt `session_id` to the label (one AES-128 block, host key from `/etc/op-dbus/secrets`) and decrypt it back. Write the UI URI into the sled. |
| SNI read | new module beside `runtime_browser_ingress.rs` | Bounded, deadline-limited `peek` of the ClientHello; extract `server_name` only; refuse malformed, oversized, slow or ECH input. |
| BPF custody | `crates/op-network/bpf/browser_ingress.bpf.c`, `crates/op-network/src/browser_ingress.rs` | Optional: carry the `session_id` with the socket, bounded, expiring with the connection. |
| Lungs | `crates/op-grpc-bridge/src/runtime_lungs.rs`, `runtime_lungs_identity.rs`, `runtime_lungs_browser.rs` | The identity's own lungs connection receives its socket when the host calls `ReceiveBrowser(h)` on it (push). No waiter, no pending call, no re-check of who it is. |
| Shared browser ingress | `crates/op-grpc-bridge/src/runtime_browser_ingress.rs` | One raw `:8080` listener. Takes the `session_id` from the decrypted SNI label and pushes the socket to it. |
| Container recipient | `crates/op-tunnel-mux/src/bin/op-tunnel-door.rs` | Replace the framed browser stream with an owned-fd receiver and raw Tokio splice to `127.0.0.1:8443`. |
| Existing UI door | `crates/op-grpc-bridge/src/container_ui_door.rs` | Remain unchanged as the TLS/axum/3tchedFS serving boundary. |
| Existing host web server | `crates/op-web/src/main.rs` and its runit service | Stop owning the WireGuard-facing `:8080` socket. Preserve any unrelated service on a non-conflicting internal binding only if still required. |
| Service lifecycle | `deploy/provisioning/runit/` and golden activation tooling | Start dependencies in fail-closed order, cut over `:8080`, and retain a bounded rollback window until live proof succeeds. |

Final file placement is chosen after the implementation repository inventory and `HANDOFF.md` claim. New modules should keep each concern isolated and should not turn `runtime_tunnel.rs` into a second protocol stack.

## Trust boundaries and threat model

The browser is untrusted. Only the ClientHello `server_name` label is read. It names an identity only because it decrypts under the host key to a `session_id`; a forged label decrypts to an unknown `session_id`, which has no browser receiver, so the connection closes. Connection timing, source addresses and ports, HTTP and other TLS fields never name the identity.

The host holds socket custody but is blind to application plaintext. The container owns the TLS key and application data.

Primary threats and controls are:

- **Cross-identity delivery:** the socket goes only to the `session_id` its label decrypts to; undecryptable label, no delivery; never by which containers are present.
- **Tampering:** the ClientHello is peeked, never consumed or rewritten; file-descriptor custody is transferred once.
- **Information disclosure:** the label is encrypted, so the `session_id` is not on the wire; TLS ends in the container; logs expose aggregate state only.
- **Denial of service:** bounded peek size and deadline, bounded in-flight pushes, and immediate close when the push cannot be delivered.
- **Absent container:** if the identity's lungs connection is not there, the connection closes.
- **Privilege escalation:** the hand-off carries no identity argument or grant and does not bypass existing 3tchedFS admission. A browser that knows another identity's URI reaches only that identity's TLS door; the door's own admission is unchanged.

## D1. Public contract: keep `:8080`

The sled's canonical UI URI names the WireGuard-reachable shared host entry and explicitly uses port `8080`. The current service behind `:8080` is replaced or moved; the URI contract stays stable.

The ingress is a raw TCP acceptor. It must not consume the TLS ClientHello, because the same bytes must reach the container's `127.0.0.1:8443` TLS listener. There is no HTTP redirect and no host login page on this listener.

The certificate installed in each identity container covers `*.perspective.3tched.com` (Let's Encrypt, DNS-01 through the Cloudflare zone; renewed by the host runit service `perspective-cert-renew`). Every identity uses the same `:8080` entry; the SNI label decides which container receives the connection.

## D2. The SNI label carries the session_id

The identity's UI URI is `https://<label>.perspective.3tched.com:8080/`, derived from its committed `session_id`:

```text
label = hex(AES-128(host_key, session_id_bytes))   # one 16-byte block, 32 hex chars
```

The host computes it when the identity asks on its own lungs connection (`LungsV1.BrowserUri`); the identity's browser receiver writes it to `/run/opdbus/browser/ui-uri` in the container. Nothing stores a copy.

On `:8080`, the ingress `peek`s the ClientHello (bounded size and deadline, no bytes consumed), extracts `server_name`, takes its first label and decrypts it to the `session_id`. A label that does not decrypt to a well-formed `session_id` closes the connection. No table is consulted; the label is the `session_id`, encrypted so it stays private on the wire. The host key lives in `/etc/op-dbus/secrets` and is never logged.

BPF socket custody, already live, may carry the `session_id` with the accepted socket until hand-off. Per-connection entries expire when their sockets close.

## D3. Lungs is the identity delivery channel

The lungs socket is peer-to-peer D-Bus over Unix sockets. Each identity's lungs connection is its own.

Add a browser delivery method that the container's own lungs side exports, and that the host calls:

```text
ReceiveBrowser(h)
```

`h` is the D-Bus Unix fd for one accepted browser TCP socket. Delivery is a push (owner, 2026-11-27): when a socket arrives on `:8080`, the host calls `ReceiveBrowser` on the lungs connection of the `session_id` its SNI label decrypts to. The container has nothing pending, polling or waiting; the call arrives and the container serves it. If that identity's lungs connection is not there, or the call fails, the browser connection closes; it never goes to another identity.

## D4. Localhost stays literally in the data path

The container-side recipient converts the handed fd into a nonblocking TCP stream, opens a local connection to `127.0.0.1:8443`, and splices the two raw streams. This is an internal organ-to-organ connection inside the identity, not a host relay.

The splice starts before any browser bytes are consumed. Consequently:

- the browser's TLS ClientHello reaches the existing UI door unchanged;
- TLS terminates in the identity container;
- the axum listener remains exactly `127.0.0.1:8443`;
- the UI door continues using its current router, certificate, admission, and FUSE code;
- no additional container listener is created.

Serving the handed fd directly with `container_ui_door::router` is not used by this spec, because the owner requires the existing localhost door to remain the serving boundary.

## D5. Schema and calls remain first-person

The local axum door obtains the schema from the identity's own mounted view. For `openflow`, for example, `GetSchema` reads:

```text
/run/mounts/3tchedFS/plugins/openflow/schema.json
```

The path is inside the container and the mount is identity-scoped. Nothing is pushed to `127.0.0.1`; axum reads the mounted schema when serving the request. Calls remain one write to that mount's operation call file and are admitted as that identity. Networking conveys no grants.

## D6. Why there is no container network route

`lo` currently has `127.0.0.1/8` and `10.0.0.2/32`, with no other link and no default route. The `10.0.0.2/32` address is a reusable namespace-local service alias, not an externally routable address.

OVS cannot output directly to loopback. Adding a veth, internal port, or route port would create the network surface this design intentionally removes. Rewriting packets to `127.0.0.1` with `route_localnet` is therefore rejected.

OpenFlow is not part of this path. The ingress reads the SNI label, and lungs transfers the socket across the IP-less boundary.

## D7. Lifecycle and failure behavior

1. Login seals the identity. Its UI URI is derived from its `session_id`.
2. A browser connection on `:8080`: the ingress peeks the ClientHello and decrypts the label to the `session_id`, before any byte is consumed.
3. The ingress pushes the fd once with `ReceiveBrowser(h)` on that identity's lungs connection and closes its copy.
4. The container splices the fd to `127.0.0.1:8443`; TLS ends there.
5. The UI URI lasts for the `session_id`. Logout ends only an episode.

Every missing or failed step closes the affected connection. There is no polling, waiting, queue, retry, alternate identity, per-port fallback, or NORMAL delivery into another container.

## D8. Deployment boundary

The first deployment changes what owns the shared `:8080` listener. It does not change the public port or the container UI listener.

After the new path is proven with two containers:

- remove UI socat forwarding;
- remove per-identity browser ports `20000+`;
- remove browser use of `PortSelector` and `BrowserSelector::select`;
- remove the host byte-frame browser relay;
- keep unrelated control-plane tunnel behavior intact.

No live switch, BPF, listener, or deploy mutation is part of writing this spec.

## Implementation conventions

- Represent route handles, connection keys, and verified bindings with distinct Rust newtypes; do not pass interchangeable strings through the custody path.
- Keep ownership explicit with `OwnedFd`. Any `from_raw_fd` boundary must have a local `SAFETY` explanation and must establish exactly one owner.
- Everything is push (owner, 2026-11-27): no polling, waiting, waiters or pending calls. Indexes are allowed where needed; no process builds or maintains them. Use bounded semaphores for in-flight pushes. No unbounded channel, retry loop, or accepted-socket queue is permitted.
- Preserve cancellation and half-close behavior with structured Tokio tasks. Dropping a hand-off or splice owner must close both sides and release BPF/user-space state.
- Use repository error conventions (`anyhow` at process boundaries and typed errors where callers branch). Error text and tracing fields must not include private identifiers.
- Keep D-Bus as the control/custody plane. Do not add a new gRPC byte relay, host-side HTTP parser (the bounded ClientHello `server_name` reader is the only parser), or direct `ovs-*`, `incus`, or `lxc` subprocess path.
- This feature adds no OpenFlow mutation.
- Preserve current `container_ui_door` routing and 3tchedFS code unless live evidence exposes a separate defect.

## Verification strategy

Verification is layered so failures identify the boundary that broke:

1. **Pure/unit:** label encrypt/decrypt round trip and forged-label refusal, ClientHello `server_name` extraction (malformed, oversized, ECH and slow input refused; fuzzed), push at-most-once semantics, fd ownership, and splice half-close/cancellation.
2. **Component:** two labels plus two identities' lungs connections prove no cross-identity hand-off; the ingress proves it consumes no byte of the TCP stream.
3. **Namespace integration:** an identity-container fixture receives a handed fd and splices it to a loopback TLS fixture at `127.0.0.1:8443`; byte comparison proves the ClientHello is unchanged.
4. **Repository integration:** `op-network`, `op-grpc-bridge`, `op-tunnel-mux`, and affected `op-web`/runit contracts build together and old selector tests are replaced with shared-entry tests.
5. **Live proof, owner-approved:** two logged-in identities (the control-plane chatbot and its human identity) use the same `:8080` entry and each receives its own container-owned UI/schema results. Failure cases, revocation, log privacy, and the no-NIC invariant are recorded before legacy removal.

No unit test substitutes for live proof that each label delivers its identity's connection, and only that one.

## Commands and approval gates

Run commands from `/srv/git/odbus-verified`. Keep one Cargo process active at a time.

```bash
# Safe implementation build; one Cargo invocation.
CARGO_BUILD_JOBS=2 cargo build -p op-network -p op-grpc-bridge -p op-tunnel-mux -p op-web

# Document checks in the spec repository.
git diff --check
```

The implementation adds a dedicated browser-ingress BPF build command under `crates/op-network/bpf/`; it must write artifacts to an explicit temporary output directory and must not attach them as a build side effect.

Focused tests are planned, but repository policy requires explicit owner direction before running tests, formatting, or clippy. The eventual commands are expected to be one at a time and package-scoped, for example:

```bash
CARGO_BUILD_JOBS=2 cargo test -p op-network --lib
CARGO_BUILD_JOBS=2 cargo test -p op-grpc-bridge --lib
CARGO_BUILD_JOBS=2 cargo test -p op-tunnel-mux --lib
```

Attaching BPF, changing the live listener, enabling runit services, and running `./activate-golden.sh` are deployment actions and require a separate explicit approval after source verification.

## Rollout and rollback

Build and validate the new path without attaching it. In an owner-approved maintenance window, stop admission on the old UI entry, attach the browser-ingress BPF state, start the container's `ReceiveBrowser` receiver, and bind the new raw ingress to the same `:8080` address. Do not run two competing `:8080` owners.

Until two-identity live proof passes, rollback restores the prior `:8080` service ownership and detaches only the new browser-ingress BPF program/maps. It does not add a legacy fallback inside the new ingress. After proof, remove the old relay, dynamic ports, and selectors; rollback after that point is a golden-version rollback, not an in-process fallback.
