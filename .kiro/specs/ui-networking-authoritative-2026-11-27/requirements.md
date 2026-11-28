# Requirements — `ui-networking-authoritative-2026-11-27`

Status: **AUTHORITATIVE**, owner direction recorded 2026-11-27.

This spec is the authority for browser delivery to an identity container. It supersedes the proposed `identity-aware-mux`, `browser-door-dispatch`, `openflow-browser-route`, and `browser-lungs-handoff` delivery designs where they disagree with this document.

## Objective

The container is the identity is the person is the sealed WireGuard key. It is not a backend selected after a browser login. The browser reaches the identity through the URI in that identity's committed sled, but the browser does not carry, choose, or prove the identity again.

Read from inside (owner, 2026-11-27): I am the identity; I happen to run as a container. My sled, key, mount, receipts and UI are all here already; login sealed them. Nothing outside me checks who I am again, looks me up, polls for me or matches me to anything. My browser connection is handed to me. Every requirement below is written as "give the identity its connection", never "find which container this connection belongs to". The container is the binding, the proof and the receipt.

The identity container is deliberately IP-less. It has only loopback, currently `127.0.0.1/8` and the namespace-local alias `10.0.0.2/32`; it has no NIC and no default route. Its UI is axum on `127.0.0.1:8443`, and axum reads the identity's live schema from that container's own 3tchedFS mount. The browser does not know or reach that loopback address.

The shared browser entry remains port `8080`. The server currently occupying that port is replaced by the identity-aware ingress described here; the public port is not changed to `8081`.

## Terms

- **Identity**: one thing represented by the container, its committed identity sled, and its sealed WireGuard public key.
- **`session_id`**: the identity's id for the whole lifetime of its container (owner, 2026-11-27). It is not a per-login session.
- **Episode**: one login of the identity; the traditional session. Episodes come and go within one `session_id`.
- **UI URI**: the canonical browser URI obtained from the committed identity sled. It uses the shared entry on port `8080`.
- **Ingress**: the host process that accepts raw browser TCP connections on the shared `:8080` entry. It does not serve HTTP or terminate TLS.
- **Login route**: the OpenFlow flow that login writes for the identity, from the identifier already in its committed sled, so that the identity's incoming browser connection is settled to it. Written and deleted only through the sealed `openflow` plugin. It carries only the incoming connection setup; traffic after the browser is connected does not go through OpenFlow.
- **BPF custody**: kernel state that carries the identity named by the login route onto the accepted socket, so the socket can be handed to that identity unread.
- **Lungs connection**: the identity's own peer-to-peer D-Bus connection to the host. It is the identity's; nothing re-proves it.
- **Hand-off**: transfer of the accepted TCP file descriptor as a D-Bus Unix fd over that identity's lungs connection.
- **Local door**: the container's existing TLS UI listener at `127.0.0.1:8443`.

## REQ-001: One browser entry

1. The end user SHALL open the UI URI from the identity sled, using port `8080`.
2. Port `8080` SHALL be one shared browser entry for all identities; there SHALL be no browser port per container.
3. The `:8080` ingress SHALL accept raw TCP and SHALL NOT serve UI assets, schemas, HTTP responses, redirects, or login pages.
4. The existing host service or forwarding rule occupying `:8080` SHALL be moved or replaced during deployment. The container's local UI port SHALL remain `8443`.
5. The UI URI SHALL resolve to the sealed WireGuard-reachable host entry. It SHALL NOT resolve to a container address or to `127.0.0.1`.

## REQ-002: Login settles the identity; nothing re-derives it

1. The identity SHALL be the one login sealed. Login already established it from the WireGuard key and the committed identity sled; the browser path SHALL NOT check it again.
2. AT login, the system SHALL write the identity's login route with `add_flow` through the sealed `openflow` plugin (via zcall; admitted and receipted), using the identifier already held in the committed sled (session ID, UUID, container name or hostname).
3. The login route SHALL carry only the incoming connection to the shared `:8080` entry. Traffic after the browser is connected SHALL NOT go through OpenFlow.
4. HTTP bytes, TLS SNI, cookies, URL paths, query strings, browser headers, source ports, and browser-supplied identity values SHALL NOT name the identity.
5. Nothing on the browser path SHALL perform a second login, a WireGuard peer check, a binding lookup, a search for a container, or a count of containers present.
6. THE login route SHALL last for the `session_id`, which is the identity's lifetime (owner, 2026-11-27). Nothing on this path SHALL delete it; logout ends only an episode. If the identity's container is not there to take the socket, the connection closes. There SHALL be no fallback identity.

## REQ-003: BPF carries the login's identity onto the socket

1. A BPF program SHALL carry the identity named by the login route onto each accepted `:8080` socket, keyed by a kernel-derived socket key (socket cookie), before any application byte is read.
2. The host ingress SHALL take that identity from the accepted socket and hand the socket to it. It SHALL NOT choose, match or re-derive the identity.
3. BPF state SHALL follow the login route: written when login writes it, and kept for the `session_id`.
4. Per-connection BPF entries SHALL be bounded and SHALL expire with the connection.
5. BPF SHALL carry custody only. It SHALL NOT parse or serve application bytes.

## REQ-004: Lungs delivers the socket to the identity

1. The host SHALL hand the accepted TCP socket itself to that identity's own lungs connection, as a D-Bus Unix fd.
2. A lungs connection that has ended SHALL NOT receive a socket. This is a liveness fact about the connection, not a re-check of who the identity is.
3. The host SHALL close its copy after successful transfer and SHALL NOT read, copy, splice, proxy, or relay browser bytes afterwards.
4. If the identity's lungs connection is not there or the push fails, the browser socket SHALL close immediately. It SHALL NOT be queued, retried, or delivered to another identity.
5. One accepted socket SHALL be delivered at most once.

## REQ-005: The container serves from localhost

1. The receiving process SHALL run inside the selected identity container.
2. It SHALL splice the handed raw TCP socket to the existing local door at `127.0.0.1:8443`.
3. TLS SHALL remain untouched until it terminates at the container's local axum door. The certificate SHALL cover the UI URI used by the browser.
4. The axum door SHALL serve the existing UI assets and gRPC-Web services. `GetSchema` SHALL read the requested schema from that container's own `/run/mounts/3tchedFS` view for the request, with no copied schema or host-side substitute.
5. Calls SHALL continue through the container's own 3tchedFS call files and existing admission. The networking path SHALL grant no authority.
6. The container SHALL remain self-contained: its own process serves its own UI from its own loopback and its own mounted view.

## REQ-006: The container remains externally IP-less

1. This feature SHALL add no NIC, veth, tap, OVS internal port, routable address, default route, or externally reachable listener to the container.
2. It SHALL NOT rewrite packets to container loopback with `route_localnet`, NAT, or a namespace route. The login route settles the incoming connection at the host's shared entry; the socket reaches the container only by lungs hand-off.
3. The namespace-local `10.0.0.2/32` alias SHALL remain local and SHALL NOT be described as the container's externally reachable IP.
4. Existing NIC-less BPF egress SHALL remain independent and unchanged.
5. The login route SHALL NOT create a data-plane port into a container. All OpenFlow writes SHALL remain sealed plugin calls through zcall; never direct `ovs-*` writes.
6. The Decoy is not part of this path.

## REQ-007: Privacy and fail-closed behavior

1. Public state and ordinary logs SHALL expose aggregate counts only. They SHALL NOT disclose WireGuard keys, sled/session identifiers, BPF route handles, login routes, URIs, or call arguments.
2. Failure at any boundary (no login route, no BPF custody, no live lungs connection, fd transfer, local `127.0.0.1:8443` connection, or TLS) SHALL close that connection with no alternate path.
3. The host SHALL never have access to plaintext HTTP, UI assets, schemas, or method arguments on this path.
4. No browser credential, SID1, OIA1, bearer token, pairing code, or identity cookie SHALL be introduced.

## REQ-008: Replacement and verification

1. Once this path is live, the browser relay path, socat forwarding for the UI, per-identity ports `20000+`, `PortSelector`, and `BrowserSelector::select` SHALL be removed.
2. The control-plane door and unrelated host services SHALL remain unchanged.
3. With two identity containers active, simultaneous connections to the shared `:8080` entry SHALL each reach only the identity whose login wrote its route.
4. Each browser SHALL receive the TLS certificate, UI build, plugin list, and live schema from its own container.
5. Verification SHALL prove that each container still has only loopback and no default route after deployment.
6. Deployment and the first live hand-off SHALL require the owner's approval.

## Success criteria

The feature is complete only when all of the following evidence exists:

1. Two active identity containers can simultaneously receive connections through the same `:8080` entry, and each connection reaches only the identity whose login wrote its route.
2. Packet capture or equivalent byte comparison proves that the host does not consume or change the TLS ClientHello before the container's `127.0.0.1:8443` listener receives it.
3. Each browser receives the certificate, UI build, plugin catalog, and live `GetSchema` result from its own container.
4. Changing one container's mounted schema changes only that identity's response, without a host copy, cache, restart, or route update.
5. No-login-route, missing-lungs, and failed-push cases close the affected connection and never reach another identity.
6. Host diagnostics disclose aggregate counts only, and a review finds no identity, sled, route-handle, URI, or request data in ordinary logs.
7. After cutover, each identity container still exposes only loopback, has no default route, and has no veth, tap, OVS port, NAT rule, or externally reachable listener.
8. The old UI relay, per-identity `20000+` browser ports, `PortSelector`, and browser `BrowserSelector::select` path are absent after the new path has passed live proof.

## Change boundaries

### Always

- Take the identity from login and carry it forward unchanged; never re-derive, match or count it.
- Push, never poll or wait (owner, 2026-11-27). Use bounded maps, bounded in-flight pushes, owned file descriptors, cancellation-safe cleanup, and fail-closed errors.
- Keep TLS, HTTP, UI assets, schema reads, calls, and admission inside the selected container.
- Record commands and evidence without recording private identity material.

### Ask first

- Attaching or replacing a live BPF program or map.
- Replacing the live `:8080` owner, changing runit services, activating a golden deployment, or running the first live browser hand-off.
- Running repository-wide tests, formatting, clippy, or destructive cleanup beyond the focused implementation build.
- Changing the canonical URI or certificate model beyond retaining shared port `8080`.

### Never

- Add a container NIC, veth, routable address, default route, OpenFlow route port, NAT path, or `route_localnet` dependency.
- Select identity from browser-controlled bytes or accept a caller-supplied identity on the hand-off interface.
- Pick the identity by which or how many containers are present, or by a WireGuard peer check, a binding lookup, or the Decoy.
- Poll, wait, keep waiters or pending calls, index, or cache anywhere on this path.
- Terminate TLS or serve/cache UI or schema content on the host.
- Fall back to another identity, a legacy relay, or a per-container port after an admission or delivery failure.
- Bypass zcall for OpenFlow mutations or bypass the container's existing 3tchedFS admission for calls.

## Out of scope

- Redesigning the axum UI, gRPC-Web API, schema format, 3tchedFS, or plugin admission.
- Giving identity containers general ingress or egress networking.
- Routing packets into a container namespace (the login route settles the incoming connection at the host entry; lungs delivers the socket).
- Changing unrelated control-plane tunnel behavior or unrelated services currently exposed by `op-web`.
- The Decoy.
- Adding browser login, pairing, bearer-token, cookie, SNI, or URL-based identity selection.

## Open questions

There are no open architecture decisions. Identity is settled at login (owner, 2026-11-27). The login route's identifier is the committed sled's `session_id`, which lasts for the container's lifetime; episodes are the per-login sessions (owner, 2026-11-27). The flow's cookie and the mark it puts on the connection are derived from `session_id`, and BPF carries that `session_id` onto the accepted socket. The packet field the flow matches is the browser address login saw for this identity at login; never anything the browser sends inside the connection (REQ-002.4).
