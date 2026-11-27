# Requirements — `ui-networking-authoritative-2026-11-27`

Status: **AUTHORITATIVE**, owner direction recorded 2026-11-27.

This spec is the authority for browser delivery to an identity container. It supersedes the proposed `identity-aware-mux`, `browser-door-dispatch`, `openflow-browser-route`, and `browser-lungs-handoff` delivery designs where they disagree with this document.

## Objective

The container is the identity is the person is the sealed WireGuard key. It is not a backend selected after a browser login. The browser reaches the identity through the URI in that identity's committed sled, but the browser does not carry, choose, or prove the identity again.

The identity container is deliberately IP-less. It has only loopback, currently `127.0.0.1/8` and the namespace-local alias `10.0.0.2/32`; it has no NIC and no default route. Its UI is axum on `127.0.0.1:8443`, and axum reads the identity's live schema from that container's own 3tchedFS mount. The browser does not know or reach that loopback address.

The shared browser entry remains port `8080`. The server currently occupying that port is replaced by the identity-aware ingress described here; the public port is not changed to `8081`.

## Terms

- **Identity**: one thing represented by the container, its committed identity sled, and its sealed WireGuard public key.
- **UI URI**: the canonical browser URI obtained from the committed identity sled. It uses the shared entry on port `8080`.
- **Ingress**: the host process that accepts raw browser TCP connections on the shared `:8080` entry. It does not serve HTTP or terminate TLS.
- **Login**: the existing identity process. WireGuard ends on the Decoy, which mints the identity assertion for the key; the host verifies it (`oracle_receiver.rs::verify_assertion`), derives the session from the key and anchors it in the committed identity sled (`interceptor.rs::anchor_verified_human_session`). That session is the container. The host has no WireGuard (owner, 2026-11-27).
- **BPF binding**: trusted kernel state associating an accepted connection with the identity the login established.
- **Lungs binding**: the existing peer-to-peer D-Bus connection whose peer credentials and committed sled bind it to exactly one identity container.
- **Hand-off**: transfer of the accepted TCP file descriptor as a D-Bus Unix fd over that identity's lungs connection.
- **Local door**: the container's existing TLS UI listener at `127.0.0.1:8443`.

## REQ-001: One browser entry

1. The end user SHALL open the UI URI from the identity sled, using port `8080`.
2. Port `8080` SHALL be one shared browser entry for all identities; there SHALL be no browser port per container.
3. The `:8080` ingress SHALL accept raw TCP and SHALL NOT serve UI assets, schemas, HTTP responses, redirects, or login pages.
4. The existing host service or forwarding rule occupying `:8080` SHALL be moved or replaced during deployment. The container's local UI port SHALL remain `8443`.
5. The UI URI SHALL resolve to the host's shared entry. It SHALL NOT resolve to a container address or to `127.0.0.1`.

## REQ-002: Identity comes only from the login and the sled

1. The host SHALL associate the connection with the identity the login already established. The host has no WireGuard interface and SHALL NOT need one.
2. The login's identity SHALL be one active, anchored, unexpired committed identity sled, and therefore one container.
3. BPF SHALL carry the login's identity-to-sled association to the accepted connection. It SHALL NOT be derived from a source address or anything the browser sends.
4. HTTP bytes, TLS SNI, cookies, URL paths, query strings, browser headers, source ports, and browser-supplied identity values SHALL NOT select the identity.
5. The host SHALL NOT perform a second identity login or search for a container after the login-to-sled binding is known.
6. An unknown, ambiguous, inactive, unanchored, expired, or revoked binding SHALL close the connection. There SHALL be no fallback identity.

## REQ-003: BPF preserves the connection identity

1. A BPF program at the host's `:8080` ingress SHALL associate each eligible `:8080` flow with an opaque route handle derived from the committed sled binding.
2. The host ingress SHALL recover that handle for the accepted socket and revalidate the committed sled before hand-off.
3. The BPF route map SHALL be populated and removed from sealed, admitted state transitions. Logout, revocation, expiry, or container teardown SHALL remove or invalidate the route.
4. Per-connection BPF entries SHALL be bounded and SHALL expire with the connection.
5. BPF SHALL classify the connection only. It SHALL NOT parse or serve application bytes.

## REQ-004: Lungs delivers the socket to the identity

1. The host SHALL hand the accepted TCP socket itself to the lungs connection already bound to the same identity, as a D-Bus Unix fd.
2. Immediately before hand-off, the host SHALL revalidate the lungs peer lifetime and confirm that its committed binding equals the BPF/sled identity.
3. The host SHALL close its copy after successful transfer and SHALL NOT read, copy, splice, proxy, or relay browser bytes afterwards.
4. No matching bound lungs connection or no ready waiter SHALL close the browser socket immediately. It SHALL NOT be queued, retried, or delivered to another identity.
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
2. It SHALL NOT route packets to container loopback with OpenFlow, `route_localnet`, NAT, or a namespace route.
3. The namespace-local `10.0.0.2/32` alias SHALL remain local and SHALL NOT be described as the container's externally reachable IP.
4. Existing NIC-less BPF egress SHALL remain independent and unchanged.
5. OpenFlow MAY enforce host-side policy for the shared entry, but it SHALL NOT select a container or create a data-plane port into one. All OpenFlow writes SHALL remain sealed plugin calls through zcall; never direct `ovs-*` writes.

## REQ-007: Privacy and fail-closed behavior

1. Public state and ordinary logs SHALL expose aggregate counts only. They SHALL NOT disclose WireGuard keys, sled/session identifiers, BPF route handles, lungs bindings, URIs, or call arguments.
2. Failure at any boundary—login binding, committed sled, BPF association, lungs binding, fd transfer, local `127.0.0.1:8443` connection, or TLS—SHALL close that connection with no alternate path.
3. The host SHALL never have access to plaintext HTTP, UI assets, schemas, or method arguments on this path.
4. No browser credential, SID1, OIA1, bearer token, pairing code, or identity cookie SHALL be introduced.

## REQ-008: Replacement and verification

1. Once this path is live, the browser relay path, socat forwarding for the UI, per-identity ports `20000+`, `PortSelector`, and `BrowserSelector::select` SHALL be removed.
2. The control-plane door and unrelated host services SHALL remain unchanged.
3. With two identity containers active, simultaneous connections to the shared `:8080` entry SHALL reach only their login-bound identity containers.
4. Each browser SHALL receive the TLS certificate, UI build, plugin list, and live schema from its own container.
5. Verification SHALL prove that each container still has only loopback and no default route after deployment.
6. Deployment and the first live hand-off SHALL require the owner's approval.

## Success criteria

The feature is complete only when all of the following evidence exists:

1. Two active identity containers can simultaneously receive connections through the same `:8080` entry, and each connection reaches only the container its login established.
2. Packet capture or equivalent byte comparison proves that the host does not consume or change the TLS ClientHello before the container's `127.0.0.1:8443` listener receives it.
3. Each browser receives the certificate, UI build, plugin catalog, and live `GetSchema` result from its own container.
4. Changing one container's mounted schema changes only that identity's response, without a host copy, cache, restart, or route update.
5. Unknown, expired, revoked, ambiguous, missing-lungs, and dead-waiter cases close the affected connection and never reach another identity.
6. Host diagnostics disclose aggregate counts only, and a review finds no identity, sled, route-handle, URI, or request data in ordinary logs.
7. After cutover, each identity container still exposes only loopback, has no default route, and has no veth, tap, OVS port, NAT rule, or externally reachable listener.
8. The old UI relay, per-identity `20000+` browser ports, `PortSelector`, and browser `BrowserSelector::select` path are absent after the new path has passed live proof.

## Change boundaries

### Always

- Preserve identity selection from the login and the committed sled; revalidate at every hand-off boundary.
- Use bounded maps, bounded waiter counts, owned file descriptors, cancellation-safe cleanup, and fail-closed errors.
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
- Terminate TLS or serve/cache UI or schema content on the host.
- Fall back to another identity, a legacy relay, or a per-container port after an admission or delivery failure.
- Bypass zcall for OpenFlow mutations or bypass the container's existing 3tchedFS admission for calls.

## Out of scope

- Redesigning the axum UI, gRPC-Web API, schema format, 3tchedFS, or plugin admission.
- Giving identity containers general ingress or egress networking.
- Routing packets into a container namespace with OpenFlow.
- Changing unrelated control-plane tunnel behavior or unrelated services currently exposed by `op-web`.
- Browsers that have not logged in.
- Adding browser login, pairing, bearer-token, cookie, SNI, or URL-based identity selection.

## Open questions

There are no open architecture decisions. Source inventory may choose the strongest available kernel-derived accepted-socket key (socket cookie or normalized tuple) and the exact trusted post-decryption BPF hook, but only if focused proof demonstrates every requirement above. If the current kernel cannot prove that association without trusting browser input, implementation stops rather than weakening this spec.
