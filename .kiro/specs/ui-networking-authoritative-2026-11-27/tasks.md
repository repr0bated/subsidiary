# Tasks — `ui-networking-authoritative-2026-11-27`

Status: **PROPOSED FOR OWNER APPROVAL**. This plan implements the authoritative design dated 2026-11-27.

Implementation belongs in `/srv/git/odbus-verified`; this repository records the authoritative requirements, design, and proof index. Follow `odbus-verified/AGENTS.md`, read the current `HANDOFF.md`, claim the task before backend edits, and keep one Cargo process active at a time. Tests, formatting, clippy, live listener changes, BPF attachment, and golden activation require the approvals stated in `requirements.md`.

File lists below are expected scope, not permission to rewrite unrelated code. Source inventory may adjust a list before editing, but each task remains at five changed implementation files or fewer; split the task if it cannot.

## Phase A — Prove and preserve identity at ingress

- [x] **Task 1 — Claim the work and pin the current source boundaries**
  - **Outcome:** Record the active task in `HANDOFF.md`; identify the exact sealed WireGuard-to-sled authority, live `:8080` owner, lungs bootstrap, and current relay/selector removal points. Choose the strongest supported BPF hook and accepted-socket key only from source and live read-only evidence.
  - **Likely files:** `HANDOFF.md` only. This task is otherwise read-only.
  - **Dependencies:** Approved requirements and design.
  - **Size:** S.
  - **Acceptance:** The handoff names one authoritative route-lifecycle writer, one BPF hook, one accepted-socket key, exact service owners, and any source discrepancy. No requirement is weakened.
  - **Verification:** `rg`/read-only inspection plus `git diff --check`; no live mutation.
  - **Requirements:** REQ-001, REQ-002, REQ-003, REQ-008.

- [x] **Task 2 — Implement the sealed route-handle lifecycle**
  - **Outcome:** Add typed, opaque browser route handles derived from the active committed sled/WireGuard binding. Publish and revoke eligibility from the existing sealed lifecycle; do not create a copied identity database.
  - **Likely files:** `crates/op-network/src/wireguard_kernel.rs`, one new `crates/op-network/src/browser_route.rs`, `crates/op-network/src/lib.rs`, and the identity-sled lifecycle module identified by Task 1.
  - **Dependencies:** Task 1.
  - **Size:** M.
  - **Acceptance:** The sled's canonical URI retains shared port `8080`; an active/anchored/unexpired binding creates exactly one eligible opaque route; expiry, revocation, WireGuard removal, and container teardown synchronously block new delivery; unknown or ambiguous state has no route.
  - **Verification:** Focused lifecycle tests when the owner authorizes tests; safe package build otherwise.
  - **Requirements:** REQ-001, REQ-002, REQ-003.3, REQ-007.

- [x] **Task 3 — Add the trusted browser-ingress BPF association**
  - **Outcome:** Add a dedicated browser-ingress BPF program and userspace loader/map wrapper. Classify post-WireGuard TCP destination port `8080`, preserve a kernel-derived connection key to the opaque route handle, and expire bounded per-flow state.
  - **Likely files:** `crates/op-network/bpf/browser_ingress.bpf.c`, `crates/op-network/bpf/browser_ingress_loader.c` or a Rust loader module, `crates/op-network/bpf/build-browser-ingress.sh`, `crates/op-network/src/browser_ingress.rs`, and `crates/op-network/src/lib.rs`.
  - **Dependencies:** Task 2.
  - **Size:** L.
  - **Acceptance:** Browser bytes are never read; unrecognized inner addresses and non-`8080` flows have no route; map and connection state are bounded; ordinary diagnostics are aggregate only; existing NIC-less egress remains independent.
  - **Verification:** Build BPF artifacts into an explicit temporary directory without attaching them. With test approval, run map/key/lifecycle negative cases using fixtures or a disposable namespace.
  - **Requirements:** REQ-002.3–REQ-002.4, REQ-003, REQ-006.4, REQ-007.1.

- [ ] **Task 4 — Replace dynamic browser selection with one raw `:8080` ingress**
  - **Outcome:** Accept raw TCP on the shared WireGuard-facing `:8080` socket, recover the kernel connection key and route handle, revalidate the current sled, and offer the untouched `OwnedFd` to the hand-off service. Remove port- and browser-data-based selection from the new path.
  - **Likely files:** one new `crates/op-grpc-bridge/src/runtime_browser_ingress.rs`, `crates/op-grpc-bridge/src/runtime_bootstrap.rs`, `crates/op-grpc-bridge/src/runtime_tunnel.rs`, `crates/op-grpc-bridge/src/lib.rs`, and `crates/op-grpc-bridge/Cargo.toml` if needed.
  - **Dependencies:** Tasks 2–3.
  - **Size:** L.
  - **Acceptance:** Exactly one configured shared listener exists; it performs no TLS/HTTP reads or responses; missing/stale/mismatched route state closes the socket; the fd is offered once; source port, SNI, path, cookie, header, and identity arguments cannot select a container.
  - **Verification:** Safe package build. With test approval, a fake lookup proves the first application byte remains unread and two route handles remain isolated.
  - **Requirements:** REQ-001, REQ-002, REQ-003.2, REQ-007.

### Checkpoint A — Host admission is buildable

Do not proceed until Tasks 2–4 build together in one Cargo invocation, BPF artifacts build without attachment, bounds and cleanup have been reviewed, and Task 1's handoff record is current. Record test results only when the owner authorized those commands.

## Phase B — Transfer custody and serve from container localhost

- [x] **Task 5 — Add at-most-once browser fd waiters to the existing lungs D-Bus connection**
  - **Outcome:** Add a bounded `AcceptBrowser`-style call to `org.opdbus.v1.LungsV1`. The connection's existing peer proof and committed container binding key the waiter; the method accepts no caller-supplied identity. Transfer the accepted TCP socket with D-Bus Unix-fd semantics.
  - **Likely files:** `crates/op-grpc-bridge/src/runtime_lungs.rs`, `crates/op-grpc-bridge/src/runtime_lungs_identity.rs`, one new `crates/op-grpc-bridge/src/runtime_lungs_browser.rs`, and `crates/op-grpc-bridge/Cargo.toml` if required.
  - **Dependencies:** Task 4.
  - **Size:** L.
  - **Acceptance:** Immediately before transfer, BPF route identity, current sled identity, lungs peer identity, peer lifetime, and container-init lifetime agree. Success leaves one fd owner in the container. Missing/dead waiter, binding change, peer death, duplicate offer, or saturation closes the browser socket without retry or cross-identity delivery.
  - **Verification:** Safe package build. With test approval, focused tests cover two identities, stale/dead peers, at-most-once custody, bounded waiters, cancellation, and fd leaks.
  - **Requirements:** REQ-004, REQ-007.

- [x] **Task 6 — Replace the framed container browser relay with a local raw splice**
  - **Outcome:** Make `op-tunnel-door` hold bounded lungs browser waiters, receive an owned TCP fd, open `127.0.0.1:8443` inside the identity container, and splice raw streams with backpressure and half-close semantics. Do not serve the axum router directly.
  - **Likely files:** `crates/op-tunnel-mux/src/bin/op-tunnel-door.rs`, one new `crates/op-tunnel-mux/src/browser_fd.rs`, `crates/op-tunnel-mux/src/lib.rs`, and `crates/op-tunnel-mux/Cargo.toml`.
  - **Dependencies:** Task 5.
  - **Size:** M.
  - **Acceptance:** The TLS ClientHello reaches `127.0.0.1:8443` byte-for-byte; TLS terminates at the existing axum door; connect/splice failure closes both sides; cancellation releases the fd; no listener, NIC, route, address, HTTP parser, or direct-router shortcut is added.
  - **Verification:** Safe package build. With test approval, loopback TLS fixtures cover unchanged bytes, large streams, half-close, local-door refusal, cancellation, and bounded concurrency.
  - **Requirements:** REQ-005, REQ-006, REQ-007.2–REQ-007.3.

### Checkpoint B — End-to-end path works in fixtures

Do not touch live `:8080` or attach BPF until all affected packages build together, the application-security review finds no identity-from-browser path, fd custody has a single owner at every step, and the container fixture reaches only `127.0.0.1:8443`. Owner-authorized focused tests must pass before requesting live deployment approval.

## Phase C — Cut over, prove, then remove legacy delivery

- [ ] **Task 7 — Prepare the runit and golden cutover without activating it**
  - **Outcome:** Define fail-closed service ordering for BPF state, shared ingress, lungs, and the container waiter. Stop `op-web` from owning the WireGuard-facing `10.0.0.2:8080`; preserve unrelated required services only on a non-conflicting internal binding. Update the container door command to use lungs and `127.0.0.1:8443`.
  - **Likely files:** `deploy/runit/op-web/run`, `deploy/provisioning/runit/op-tunnel-door/run`, the shared-ingress runit `run` file identified by Task 1, `deploy/lib/golden/activate-services.tsv`, and its focused activation contract test.
  - **Dependencies:** Checkpoint B.
  - **Size:** M.
  - **Acceptance:** Generated/deployed configuration has one `:8080` owner, starts only when route and lungs dependencies are ready, never exposes the container, and has an explicit pre-legacy-removal rollback to prior service ownership.
  - **Verification:** Static runit/golden checks and safe builds only. Do not enable, restart, attach, or activate in this task.
  - **Requirements:** REQ-001.4, REQ-006, REQ-008.2, REQ-008.6.

- [ ] **Task 8 — Complete focused coverage, then perform the owner-approved live proof**
  - **Outcome:** First add package-scoped regression coverage for the full chain and negative cases. After a separate deployment approval, attach only the new browser-ingress BPF state, activate the prepared services, transfer `:8080` ownership, and prove two sealed WireGuard identities through the same public entry.
  - **Likely files:** At most one focused test file in each of `op-network`, `op-grpc-bridge`, and `op-tunnel-mux`; live evidence goes under `docs/proof-of-work/ui-networking-authoritative-2026-11-27/`. Split tests and operations into separate commits.
  - **Dependencies:** Task 7, owner-approved package tests, clean security/review findings, and explicit deployment approval.
  - **Size:** L.
  - **Acceptance:** Each browser receives its own certificate, UI, `ListPlugins`, live `GetSchema(openflow)`, and admitted call result. Unknown/revoked/stale/missing-lungs cases fail closed. Logs are aggregate. Each container still has only loopback and no default route; no veth, OVS port, NAT, `route_localnet`, or per-container ingress exists; NIC-less egress remains independent.
  - **Verification:** Record exact time-bounded commands, redacted outputs, service versions, BPF attachment identity, schema-to-mounted-file comparison, call receipt, rollback readiness, and owner sign-off. Roll back on any identity ambiguity or invariant failure.
  - **Requirements:** REQ-002–REQ-008 and all success criteria except legacy removal.

- [ ] **Task 9 — Remove the superseded browser delivery only after live proof**
  - **Outcome:** Remove UI socat/framed relay behavior, per-identity browser ports `20000+`, `PortSelector`, browser `BrowserSelector::select`, and obsolete deployment state. Mark conflicting old specs superseded and update topology, OpenFlow UI, `HANDOFF.md`, and proof documentation. Keep unrelated control-plane tunnel behavior.
  - **Likely files:** Split into cleanup commits of five files or fewer: (a) Rust relay/selectors, (b) runit/provisioning, and (c) documentation/spec status.
  - **Dependencies:** Task 8 owner sign-off.
  - **Size:** L, split into three S/M commits.
  - **Acceptance:** Repository search and live state find no legacy browser selector, per-identity UI port, UI socat path, or host byte relay; shared `:8080` still serves both identities; unrelated tunnel behavior is unchanged; final proof points to exact commits.
  - **Verification:** Safe build plus owner-approved focused regressions and live smoke proof; `git diff --check`; review against every success criterion.
  - **Requirements:** REQ-008 and all success criteria.

## Definition of done

All nine tasks and both checkpoints are complete; every requirement has recorded evidence; no mandatory review finding remains; rollback and operational ownership are documented; live proof has owner sign-off; and the legacy path is removed only after that sign-off. A build alone, fixture-only proof, or deployment without two-identity isolation is not completion.
