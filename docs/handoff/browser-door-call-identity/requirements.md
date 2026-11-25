# Requirements Document — `browser-door-call-identity`: browser calls admitted as the container

Status: PROPOSED, not implemented. Written 2026-11-25 against odbus-verified `bf3c4a8` (branch `dev`). For the backend; nothing here is built in the Subsidiary repo.

## Introduction

The Subsidiary UI runs in the browser and is served by the container's own door (`op-grpc-bridge`, `container_ui.rs`, `CHAT_UI_DIR`). It reaches the backend only through the door's gRPC-Web services: `PluginService.ListPlugins`, `PluginService.CallMethod` and `StateSync.Subscribe`.

Live check (2026-11-25): through a container's browser door, `ListPlugins` answers without a credential, but `CallMethod` is refused with `UNAUTHENTICATED "exactly one identity is required"` (`crates/op-grpc-bridge/src/service.rs:630`; the same check is in `authenticate`, `service.rs:155`). The door accepts exactly one of `SID1` (`op_identity::sealed_id::HTTP_HEADER_NAME`) or `x-oracle-identity-assertion-bin` (OIA1), and the browser sends neither.

Owner rule (2026-11-25, final): the host takes care of all identity. The browser carries, mints, stores and sends no identity: no SID1, no OIA1, no injected config, no identity endpoint, no pairing code. The container is the identity. So the browser cannot satisfy today's check, and the check has to be met on the backend side.

This feature makes calls that arrive from the container's own browser UI run as the container identity, through the container's own 3tchedFS mount, so every call is one call file and one receipt under the container's grants.

Out of scope: any change to the browser or UI code; new credentials or login flows; the host browser door and its port mapping (done in `browser-door-dispatch`); the control-plane door; the two-person rule.

## Glossary

- **Container door**: the `op-grpc-bridge` inside an identity container, on `OP_GRPC_BRIDGE_LISTEN` (default `10.0.0.2:8090`), TLS with the container's own certificate.
- **UI listener**: the address `op-tunnel-door` splices browser connections to (`/agent/user/OP_UI_LISTEN`, `deploy/provisioning/runit/op-tunnel-door/run`).
- **Container mount**: the container's own 3tchedFS view at `/run/mounts/3tchedFS`, opened as `MountedNamespace::open_for_identity_mode(.., IdentityMode::GuestKernel, None)` (already done in `container_ui.rs::mount`).
- **Browser call**: a `CallMethod` or `Subscribe` that arrives on the UI listener.

## Decisions for the owner

- **D1: which connections run as the container.** "No credential means the container" must not hold on a listener that other callers can reach.
  - **A (recommended):** a separate UI listener that `op-tunnel-door` alone splices to. Every call on it is a browser call. The identity door on `8090` keeps today's credential check unchanged.
  - **B:** the same listener, where the bridge tells browser connections apart by their source (the `op-tunnel-door` splice). This is more fragile and mixes two admission rules on one port.
- **D2: who may open the page.** With no browser credential, anyone who reaches the container's browser port acts as the container under its grants. What limits reaching the port: the host browser door's exposure (WARP/privacy transport), an allowlist, or something else? This decides whether the feature is safe to enable. It is not answered in source.
- **D3: the `container_ui.rs` rule.** Its header says "No host HTTP listener, desktop, identity endpoint, credential injection or RPC proxy", and "The existing generic door still validates every human credential". This feature changes that: browser calls are no longer human-credentialed, they are the container's. The owner confirms the change, or rejects the feature.
- **Existing alternative, not proposed:** the OIA1 browser binding (`oracle_assertion.rs::with_browser_binding`, `bound_state_subscription.rs`) admits a browser that presents a bound oracle assertion. That is a browser-carried credential, which the owner rule forbids.

## Requirements

### Requirement 1: Browser calls run as the container

**User Story:** As the container identity, I want calls from my own UI to run as me, so the UI works with no browser credential.

#### Acceptance Criteria
1. WHEN a `CallMethod` arrives on the UI listener, THE container door SHALL run it as one invocation of `plugins/<plugin>/operations/<method>/call` on the container mount (`MountedNamespace::invoke`), and SHALL return that call file's receipt unchanged.
2. THE container door SHALL NOT read, require or accept SID1, OIA1 or any other identity metadata on the UI listener. IF such metadata is present, THEN THE door SHALL refuse the call with `UNAUTHENTICATED`, so a browser cannot choose its identity.
3. THE identity of a browser call SHALL be the identity of the container mount alone (`MountIdentity::GuestKernel`), never a value from the request.
4. THE call SHALL be admitted by the existing rule, admit(a) iff identity(a) AND grants(a) AND sealed(a), through `Runtime::call`: reserved, admitted, receipted and appended to the ledger in one commit. A method the container is not granted SHALL be refused, and the refusal SHALL be returned as the receipt.
5. THE `x-opdbus-capability` header SHALL NOT widen admission. WHEN it differs from the method's sealed `required_capability`, THE door SHALL refuse the call.
6. THE door SHALL NOT retry, queue or replay a browser call. An `outcome_unknown` receipt SHALL be returned as it is.

### Requirement 2: Reads and schema for the UI

#### Acceptance Criteria
1. `ListPlugins` and `GetSchema` on the UI listener SHALL return only the plugins and methods in the container mount's catalog view (`MountedNamespace::catalog_view`), the grant-filtered schema this container may see.
2. THE door SHALL NOT copy, cache or mirror the schema; each answer SHALL be read from the mount.

### Requirement 3: State feed for the UI

#### Acceptance Criteria
1. `StateSync.Subscribe` on the UI listener SHALL deliver only state the container mount discloses (`MountedNamespace::state`, `public_state.paths`), as the container identity.
2. THE feed SHALL keep the existing frame order (initial state, schema, then live changes, with heartbeats) and SHALL end the stream with `DATA_LOSS` when it cannot keep that order, as today.
3. THE door SHALL NOT poll the mount on a timer to produce frames. If the mount has no change notification, this criterion is an open item (see design).

### Requirement 4: The identity door is unchanged

#### Acceptance Criteria
1. Under D1 option A, THE identity door on `OP_GRPC_BRIDGE_LISTEN` SHALL keep its current SID1/OIA1 check, tests and behavior.
2. THE UI listener SHALL accept connections only from the `op-tunnel-door` splice. Under option A, that means a listener address only `op-tunnel-door` targets.
3. THE UI listener SHALL serve the UI assets (`CHAT_UI_DIR`, `container_ui.rs`) and the browser calls above, and no other RPC (no `Mutate`, `BatchMutate`, `SetProperty` or `ChatLink`).

### Requirement 5: Schema and OSCAL

#### Acceptance Criteria
1. Any new setting or state field SHALL carry `x-oscal-subid` and be registered in `oscal_subid_registry`; the sealed schema SHALL be regenerated, not copied.
2. THE `tunnel` or bridge public state MAY report a count of browser calls; it SHALL NOT disclose identities, session ids or call arguments.

### Requirement 6: Tests

1. Existing `op-grpc-bridge` admission tests SHALL pass unchanged.
2. New tests SHALL cover:
   - a browser call runs as the mount identity and returns its receipt;
   - a browser call carrying SID1 or OIA1 is refused;
   - an ungranted method is refused, with its receipt;
   - a capability header that differs from the sealed one is refused;
   - an identity-door call without a credential is still refused;
   - the UI listener refuses `Mutate` and the other RPCs outside Requirement 4.3.
