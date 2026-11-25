# Requirements Document — `browser-door-dispatch`: one browser door, routed to the selected container

Status: IMPLEMENTED in odbus-verified `f81b086` and `7aa69e1` (origin/dev), live on golden release 335 (2026-11-25). D1 settled as option A: one browser port per identity container, assigned at provisioning (`deploy/provisioning/browser-port.py`). Verified live: Jeremy's container on `10.0.0.2:20000` served its UI with its own TLS certificate; `tunnel status` showed 4 browser waiters; all 7 mux regression tests passed. Not verified live: two-container routing (kiroween has no TLS UI listener yet) and the control-plane TLS check (the chatbot guest's bridge has an older identity_sled schema mismatch, unrelated to this change). Written 2026-11-25 against `bf3c4a8`.

## Introduction

Browsers reach a user's container UI through a host door. The container terminates TLS and serves its own UI. Today the host door (`op-tunnel-mux`) delivers every inbound connection to the single waiting container (`AcceptQueue::deliver`, `uids.len() == 1`), which fits the control-plane route and nothing else. This feature adds a second, shared browser door that delivers each connection only to the container selected for it, keyed by the container identity binding that lungs already establishes, and leaves the control-plane route unchanged.

Out of scope: Xray, guest IPs, host TLS termination, any change to the browser, the chatbot or the container's content server, and new authentication. The container's own TLS and identity checks stay the authorization for the UI; the host door only selects and forwards.

## Glossary

- **Binding**: the container identity a lungs connection is pinned to (`ContainerBinding.session_id` in `op-grpc-bridge/src/runtime_lungs_identity.rs`), found by matching the peer's pid namespace to a committed identity container's init. Not a Unix uid, and never a value supplied by the browser.
- **Waiter**: an open `Tunnel.Accept` stream from a container's `op-tunnel-door`, waiting to be given one inbound connection.
- **Control-plane door**: the existing route `100.96.0.5:8090` → `10.0.0.2:8090` (`OP_TUNNEL_DOOR`), reserved for control-plane MCP by `deploy/warp-vip/README.md`.
- **Browser door**: the new shared host listener for user containers.
- **Selector**: the host component that decides which binding an accepted browser connection belongs to (decision D1).

## Decision D1 (owner): how the host selects the container for a browser connection

The host sees a browser connection before TLS, and TLS ends in the container, so it cannot read a hostname, a path, a cookie or an OIA1/SID1 credential. Source-IP binding is retired (`AssertionSourceBinding::ExactPeerIp` in `oracle_assertion.rs`: privacy transports replace the inner source address). No existing dispatch maps a raw TCP connection to a container; the lungs and `_3tched-fs` dispatch bind D-Bus sessions, not TCP connections. One of these has to give:

- **A. One host port per container (recommended).** Provisioning assigns each identity container a browser port; the host maps the port to the binding from its own records. The host parses no browser bytes, and nothing breaks under ECH. It relaxes "one host port".
- **B. Read the SNI from the TLS ClientHello, without terminating TLS.** Keeps one host port. The host parses untrusted bytes, the selector is browser-supplied (the same weakness as a browser-supplied UUID, so the container's TLS must still be the gate), and ECH removes it. It reverses "no SNI routing".

Both feed the same `deliver_to(binding, stream)`; only task 6 differs.

## Requirements

### Requirement 1: Delivery to the selected container only

**User Story:** As the owner, I want each browser connection to go only to the container selected for it, so that no user reaches another user's container.

#### Acceptance Criteria
1. THE mux SHALL provide `deliver_to(binding, stream)` that delivers `stream` only to a waiter registered under `binding`.
2. WHEN no live waiter is registered under `binding`, THE mux SHALL refuse the connection (close it) and SHALL NOT deliver it to any other binding.
3. WHEN a waiter under `binding` has closed or its peer fails revalidation, THE mux SHALL drop that waiter and try the next waiter under the same binding only.
4. THE mux SHALL NOT retry, queue or hold a refused connection.
5. THE binding SHALL come from the selector (D1) and the waiter registration (Requirement 2), never from bytes the browser sends after the selector decision.

### Requirement 2: Waiters registered by identity binding

**User Story:** As the owner, I want a container's waiting Accept streams indexed by its identity, so that delivery follows identity and not Unix uids.

#### Acceptance Criteria
1. WHEN a container opens `Tunnel.Accept` on the browser door socket, THE mux SHALL identify the peer with the lungs peer proof (`PeerLifetime::from_socket`, peer process identity, pid-namespace match to a committed identity container's init) and register the waiter under that container's binding.
2. IF the peer has no committed live identity container, or is the host, or is an Incus forkproxy, THEN THE mux SHALL refuse the Accept with `unauthenticated`.
3. THE byte stream SHALL stay on the existing tunnel transport (`Tunnel.Accept` frames and `spawn_splice`); only identification is reused from lungs.
4. THE mux SHALL revalidate the waiter's peer lifetime before delivering to it.

### Requirement 3: Control-plane door unchanged

**User Story:** As the owner, I want the control-plane MCP route kept exactly as it is.

#### Acceptance Criteria
1. THE control-plane door (`OP_TUNNEL_DOOR`, socket `/run/opdbus/tunnel/tunnel.sock`) SHALL keep its current sole-waiter behavior, uid keying and tests.
2. THE browser door SHALL use its own listener, its own socket and its own `Mux` instance, and SHALL NOT share waiters with the control-plane door.
3. A container holding a browser waiter SHALL NOT become eligible for control-plane connections, and the control-plane waiter SHALL NOT receive browser connections.

### Requirement 4: Container side

**User Story:** As a user container, I want my door process to wait for browser connections and splice them to my own UI listener.

#### Acceptance Criteria
1. THE seed `deploy/provisioning/runit/op-tunnel-door/run` SHALL run `op-tunnel-door` against the browser door socket when it is present, and SHALL keep the control-plane branch for the chatbot container.
2. WHEN neither socket is present, THE service SHALL stay idle, as today.
3. THE container-local target SHALL be the container's own UI listener, given by provisioning configuration; `op-tunnel-door`'s existing splice SHALL be reused unchanged.
4. Provisioning SHALL bind the browser door socket directory into each user identity container; the control-plane socket directory SHALL stay with the chatbot container only.

### Requirement 5: Observable state through the tunnel plugin

**User Story:** As the owner, I want the browser door's state visible through the sealed `tunnel` plugin.

#### Acceptance Criteria
1. THE `tunnel` plugin state SHALL report the browser door's address, open flag, total waiters and active splices.
2. THE public state SHALL NOT disclose bindings, session ids, uids or any per-identity detail; only counts.
3. Every new field and method SHALL carry `x-oscal-subid` and be registered in `oscal_subid_registry`; the sealed schema is regenerated, not copied.
4. `set_open` and `close_connections` SHALL be available for the browser door with the same semantics as the control-plane door.

### Requirement 6: Selector (after D1)

#### Acceptance Criteria (option A)
1. THE host SHALL listen on one port per identity container on one host address, and map port to binding from the committed identity records, not from configuration the container can write.
2. WHEN a port has no binding, THE host SHALL not listen on it.

#### Acceptance Criteria (option B)
1. THE host SHALL read only the ClientHello, bounded in size and time, extract `server_name`, map it to a binding from the committed identity records, then hand the untouched bytes (including the ClientHello) to the splice.
2. IF the ClientHello is malformed, oversized, slow, has no `server_name`, uses ECH, or names no binding, THEN THE host SHALL refuse the connection.

### Requirement 7: Tests

1. Existing `op-tunnel-mux` tests SHALL pass unchanged for the control-plane door.
2. New tests SHALL cover: delivery to the selected binding with two bindings waiting; refusal when the selected binding has no waiter while another binding does; dead-waiter pruning within one binding; refusal of an Accept from a peer with no identity container; a closed browser door refusing and dropping its splices; a browser waiter never receiving a control-plane connection, and the reverse.
