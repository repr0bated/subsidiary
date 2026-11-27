# Design — `ui-networking-authoritative-2026-11-27`

Status: **AUTHORITATIVE**, 2026-11-27. Requirements: `requirements.md` in this directory.

## The model

The container is the identity, not a destination discovered after login. The sealed WireGuard peer, committed sled, bound lungs connection, container, local axum door, and 3tchedFS view are successive expressions of that one identity.

The user sees one ordinary HTTPS URI on port `8080`. Internally, the connection is delivered as a capability—an already accepted socket—not as a packet routed to a container address.

```text
browser
  │ HTTPS to the UI URI from the sled, port 8080
  │ after the login (identity minted on the Decoy, verified on the host)
  ▼
host shared TCP ingress :8080
  │ BPF: the login's identity -> opaque sled route handle
  │ host revalidates active/anchored/unexpired committed sled
  ▼
the same identity's bound lungs connection
  │ peer lifetime and binding revalidated
  │ accepted TCP fd transferred as D-Bus Unix fd
  ▼
container-side lungs waiter
  │ raw byte splice entirely inside the identity container
  ▼
127.0.0.1:8443
  │ TLS terminates here; existing axum UI door
  ▼
the container's own /run/mounts/3tchedFS
  │ schema reads and call-file writes under this identity's grants
  ▼
response returns over the same handed browser socket
```

The host owns connection admission and delivery. It does not own the page. The container owns TLS, HTTP, the UI router, the schema view, and calls.

## Technology and component ownership

Implementation is Rust 2024 with Tokio. The login supplies the identity and eBPF carries it to the accepted connection; zbus/D-Bus Unix-fd passing transfers socket custody; axum and the existing gRPC-Web bridge continue to serve the UI; 3tchedFS remains the schema and call authority. Runit owns services. No new Python runtime, HTTP proxy, or packet route is introduced.

Current and target ownership in `odbus-verified` is:

| Area | Current source | Target responsibility |
| --- | --- | --- |
| Login and BPF | the login path (`oracle_receiver.rs`, `interceptor.rs`), `crates/op-network/bpf/` | Maintain the login-to-sled route lifecycle and classify eligible `:8080` connections into a bounded kernel map. Use a browser-ingress program/loader separate from the unchanged NIC-less egress program. |
| Identity and lungs | `crates/op-grpc-bridge/src/runtime_lungs.rs`, `runtime_lungs_identity.rs` | Reuse the existing kernel peer proof and committed-sled validation; add the bounded browser waiter/fd hand-off on the existing lungs D-Bus connection. |
| Shared browser ingress | `crates/op-grpc-bridge/src/runtime_tunnel.rs` currently owns dynamic browser listeners and selectors | Replace dynamic per-identity listeners with one raw `:8080` listener whose accepted socket is resolved from BPF and delivered to lungs. Keep this code separate from HTTP serving. |
| Container recipient | `crates/op-tunnel-mux/src/bin/op-tunnel-door.rs` | Replace the framed browser stream with an owned-fd receiver and raw Tokio splice to `127.0.0.1:8443`. |
| Existing UI door | `crates/op-grpc-bridge/src/container_ui_door.rs` | Remain unchanged as the TLS/axum/3tchedFS serving boundary. |
| Existing host web server | `crates/op-web/src/main.rs` and its runit service | Stop owning the shared `:8080` socket. Preserve any unrelated service on a non-conflicting internal binding only if still required. |
| Service lifecycle | `deploy/provisioning/runit/` and golden activation tooling | Start dependencies in fail-closed order, cut over `:8080`, and retain a bounded rollback window until live proof succeeds. |

Final file placement is chosen after the implementation repository inventory and `HANDOFF.md` claim. New modules should keep each concern isolated and should not turn `runtime_tunnel.rs` into a second protocol stack.

## Trust boundaries and threat model

The browser is untrusted. TLS/HTTP fields, connection timing, source ports, and request contents cannot convey identity. The login and the committed sled are the only identity authority. The kernel-to-userspace boundary conveys an opaque, short-lived route handle; userspace must revalidate it rather than treating a map hit as permanent authority.

The host is trusted for admission and socket custody but intentionally blind to application plaintext. The lungs Unix peer is trusted only after `SO_PEERPIDFD`, peer credentials, namespace identity, container init lifetime, and current sled binding all validate. The container owns the TLS key and application data.

Primary threats and controls are:

- **Spoofing/cross-identity delivery:** kernel-derived flow key, equality of login/sled/lungs bindings, and revalidation immediately before fd transfer.
- **Tampering:** raw TLS bytes are neither parsed nor rewritten on the host; file-descriptor custody is transferred once.
- **Information disclosure:** TLS ends in the container and logs expose aggregate state only.
- **Denial of service:** bounded BPF entries, waiter count, accepted-fd count, timeouts, and immediate close when a destination is not ready.
- **Stale authority:** revocation and peer/container death invalidate routes and waiters; every delivery rechecks authoritative state.
- **Privilege escalation:** the hand-off carries no identity argument or grant and does not bypass existing 3tchedFS admission.

## D1. Public contract: keep `:8080`

The sled's canonical UI URI names the shared host entry and explicitly uses port `8080`. The current service behind `:8080` is replaced or moved; the URI contract stays stable.

The ingress is a raw TCP acceptor. It must not consume the TLS ClientHello, because the same bytes must reach the container's `127.0.0.1:8443` TLS listener. There is no HTTP redirect and no host login page on this listener.

The certificate installed in each identity container covers the UI URI. Multiple identities may use the same entry name because the login's identity, not SNI, selects the container.

## D2. The login's identity, carried by BPF

The host has no WireGuard (owner, 2026-11-27). WireGuard ends on the Decoy, which mints the identity assertion for the key. The login verifies it on the host (`oracle_receiver.rs::verify_assertion`), derives the session from the key (`op_identity::session::derive_session_id`) and anchors it in the committed identity sled (`interceptor.rs::anchor_verified_human_session`). That session is the container:

```text
login -> committed identity sled (session) -> opaque route handle
```

The login installs only the opaque handle in BPF maps; keys and session identifiers do not appear in packet-path logs. BPF associates the connection with that handle before application bytes are read, keyed by a kernel-derived connection key (socket cookie or normalized tuple; Task 1 picks it from source and live read-only evidence). After `accept(2)` the ingress resolves the handle and re-reads the committed sled. The map preserves the login's association; it is not a second identity database, and nothing is looked up again.

Route-control mutations are admitted sealed operations. Per-flow entries are ephemeral and expire with their sockets.

## D3. Lungs is the identity delivery channel

The existing lungs socket is peer-to-peer D-Bus over Unix sockets. Its peer credentials, process lifetime, namespace proof, and committed identity volume already bind each live connection to a container identity.

Add a browser accept operation on the existing lungs bootstrap object:

```text
AcceptBrowser() -> h
```

`h` is the D-Bus Unix fd for one accepted browser TCP socket. The container maintains a small bounded set of pending calls. The host answers a waiter only when all three values are equal at hand-off time:

```text
BPF route identity == current committed sled identity == lungs binding identity
```

The host closes its fd after transfer. If there is no exact waiter, it closes the browser connection. Waiters are revalidated immediately before use; dead waiters are discarded only within their own identity and never cause cross-identity delivery.

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

OpenFlow remains available for host datapath policy and continues to be controlled only through sealed plugins. It is not the last hop into the container. BPF preserves the authenticated connection identity, and lungs transfers the socket capability across the IP-less boundary.

## D7. Lifecycle and failure behavior

1. The login establishes the identity and its committed sled binding.
2. The sled exposes the canonical UI URI and the live container binding.
3. The BPF route becomes eligible only while the sled is active, anchored, and unexpired.
4. A bound lungs peer registers bounded `AcceptBrowser` waiters.
5. A browser connection on `:8080` is associated before application data is read.
6. The ingress revalidates sled and lungs, transfers the fd once, and closes its copy.
7. The container splices the fd to `127.0.0.1:8443` and removes the waiter when the connection ends.
8. Logout, revocation, expiry, peer death, or container teardown invalidates the BPF route and all waiters for that identity.

Every missing or mismatched step closes the affected connection. There is no queue, retry, alternate identity, per-port fallback, or NORMAL delivery into another container.

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
- Use bounded collections and semaphores. No unbounded channel, waiter list, flow map, retry loop, or accepted-socket queue is permitted.
- Preserve cancellation and half-close behavior with structured Tokio tasks. Dropping a hand-off or splice owner must close both sides and release BPF/user-space state.
- Use repository error conventions (`anyhow` at process boundaries and typed errors where callers branch). Error text and tracing fields must not include private identifiers.
- Keep D-Bus as the control/custody plane. Do not add a new gRPC byte relay, host-side HTTP parser, or direct `ovs-*`, `incus`, or `lxc` subprocess path.
- Existing OpenFlow writes remain zcall/plugin operations. This feature does not require an OpenFlow mutation.
- Preserve current `container_ui_door` routing and 3tchedFS code unless live evidence exposes a separate defect.

## Verification strategy

Verification is layered so failures identify the boundary that broke:

1. **Pure/unit:** route-handle/newtype parsing, bounded map lifecycle, key normalization, waiter at-most-once semantics, stale binding rejection, fd ownership, and splice half-close/cancellation.
2. **Component:** a fake BPF lookup plus two authenticated lungs peers proves no cross-identity hand-off; malformed/unknown mappings fail closed; the ingress proves it does not read the TCP stream.
3. **Namespace integration:** an identity-container fixture receives a handed fd and splices it to a loopback TLS fixture at `127.0.0.1:8443`; byte comparison proves the ClientHello is unchanged.
4. **Repository integration:** `op-network`, `op-grpc-bridge`, `op-tunnel-mux`, and affected `op-web`/runit contracts build together and old selector tests are replaced with shared-entry tests.
5. **Live proof, owner-approved:** two logged-in identities use the same `:8080` entry and receive different container-owned UI/schema results. Failure cases, revocation, log privacy, and the no-NIC invariant are recorded before legacy removal.

No unit test substitutes for live proof of the login-to-BPF accepted-socket association. If the running kernel cannot demonstrate that association unambiguously, cutover does not proceed.

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

Build and validate the new path without attaching it. In an owner-approved maintenance window, stop admission on the old UI entry, attach the browser-ingress BPF state, start the lungs waiters, and bind the new raw ingress to the same `:8080` address. Do not run two competing `:8080` owners.

Until two-identity live proof passes, rollback restores the prior `:8080` service ownership and detaches only the new browser-ingress BPF program/maps. It does not add a legacy fallback inside the new ingress. After proof, remove the old relay, dynamic ports, and selectors; rollback after that point is a golden-version rollback, not an in-process fallback.
