# Requirements Document — `identity-aware-mux`

Status: PROPOSED, not implemented. Written 2026-11-25 against odbus-verified `e451fe5` (`dev`, release 341). For the backend.

## Introduction

Owner (2026-11-25): the mux is identity-aware. The key a connection arrives with decides which container it reaches.

Today `BrowserSelector::select` (`crates/op-grpc-bridge/src/runtime_tunnel.rs:157`) selects by listener port and ignores the connection. This feature replaces that lookup with one keyed by the connection's identity key. The WireGuard and network path stays as it is; this feature does not change it.

## Requirements

### Requirement 1: Select by key

1. THE mux SHALL select the container whose committed identity key matches the key the connection arrived with, and SHALL deliver the connection only to that container's waiter (`deliver_to`).
2. IF no active, anchored, unexpired identity has that key, THEN THE mux SHALL refuse the connection, with no fallback to another container.
3. THE key-to-identity mapping SHALL come from the committed identity records (`committed_sessions_in`), checked at accept time. It SHALL NOT come from a copy, a cache or configuration.
4. THE mux SHALL NOT read anything the browser sends to select.

### Requirement 2: Everything else unchanged

1. The control-plane door, `op-tunnel-door` and the container UI door SHALL be unchanged.

### Requirement 3: Tests

1. With two identities waiting, a key reaches only its own container.
2. An unknown key is refused.
3. A revoked identity's key is refused.
4. The existing mux tests pass.
