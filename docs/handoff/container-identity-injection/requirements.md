# Requirements Document — `container-identity-injection`: the container hands its own SID1 to the page it serves

Status: SPEC FOR odbus-verified. Written 2026-11-25 against `origin/dev` at `7aa69e1`. Owner-approved 2026-11-25. Not implemented.

## Introduction

The container is the identity, and the chat UI is that container's chatbot. There is no browser, human or session identity of its own. Today the UI's calls through the door are refused: a live `CallMethod identity_sled.get_own_identity` through Jeremy's browser door (`10.0.0.2:20000`) returns `UNAUTHENTICATED: exactly one identity is required`. The UI (Subsidiary `ui/src/lib/door/identity.ts`) already reads an injected SID1 from `window.__3TCHED_CONFIG__.identity`, the same mechanism 3tched.com uses (`src/chat/door-config.ts` `injectedIdentity`). This feature makes the container's bridge supply that value.

**This reverses a stated decision.** `crates/op-grpc-bridge/src/container_ui.rs` says it serves "no ... identity endpoint, credential injection", and "Public application bytes do not establish browser identity". The owner approved the reversal on 2026-11-25 for the container's own UI.

## Glossary

- **Own SID1**: the container's installed sealed identity, `/agent/user/sealed_id` on its read-only identity volume (`OP_ISSUED_SEALED_ID_PATH`). It is the inline SID1 that `adopt_issued_identity_at_startup` checks against the adopted identity record.
- **Config script**: a small JavaScript response that sets `window.__3TCHED_CONFIG__`.

## Requirements

### Requirement 1: Serve the container's own SID1 to its own page

1. WHEN `CHAT_UI_DIR` is set, THE bridge SHALL serve `GET /__3tched/config.js` with `window.__3TCHED_CONFIG__ = {"identity":{"kind":"sid1","sealedId":"<own SID1>"}};`, JSON-encoded.
2. THE value SHALL be the container's own SID1 and nothing else. It SHALL be read from the installed `sealed_id` and SHALL equal the identity the bridge adopted at startup. IF the file is missing, unreadable, not standard base64, or differs from the adopted identity, THEN the route SHALL return 404 and the page shows "not connected".
3. THE bridge SHALL NOT accept any request input for this route: no query, no body, no per-request identity.
4. THE response SHALL carry `Content-Type: text/javascript; charset=utf-8`, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`.
5. THE bridge SHALL NOT log the value, and SHALL NOT put it in receipts, state or the ledger.
6. Only the container's own bridge serves this route. The host never serves or relays a container's SID1.

### Requirement 2: The door accepts it

1. WHEN the page sends the own SID1 in `x-opdbus-sealed-id-bin` on `CallMethod` or `StateSync.Subscribe`, THE door SHALL authenticate the call as the container identity through the existing SID1 path (`authenticate_sid1_grpc`). Grants and admission stay unchanged.
2. IF the existing SID1 path refuses a `principal_kind: service` identity, THEN that is the change to make. It must be made in the SID1 path, not as a bypass for this route.

### Requirement 3: Unchanged

The interceptor's one-credential rule, OIA1 and decoy handling, the control-plane door, the browser door (`browser-door-dispatch`), grants, and `Runtime::call` admission all stay as they are.

### Requirement 4: Tests

1. The route returns the own SID1 when it matches the adopted identity, and 404 when the file is missing, malformed, or differs.
2. The route ignores query strings and bodies, and sends the three headers.
3. A `CallMethod` carrying the own SID1 is admitted as the container identity. One carrying another container's SID1 is refused.
4. The value never appears in logs. Check this with log capture in the test.

## Known exposure (owner-accepted)

Anyone who can load the page from the container's door port gets the container's SID1 and can act as the container until it expires or is revoked. Reachability of the port is the only gate. The UI must never render untrusted HTML, because script injection in the page would expose the same value.
