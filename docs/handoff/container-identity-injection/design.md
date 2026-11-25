# Design — `container-identity-injection`

References are to odbus-verified `origin/dev` at `7aa69e1`.

## Where the pieces are

- `crates/op-grpc-bridge/src/container_ui.rs` `mount()` serves `/`, `/chat` and `/assets/*` from `CHAT_UI_DIR` after it checks the guest mount (`MountedNamespace::open_for_identity_mode(.., IdentityMode::GuestKernel, ..)`).
- `crates/op-grpc-bridge/src/runtime_identity_owner.rs` `adopt_issued_identity_at_startup()` derives the session from `OP_IDENTITY_OWN_WIREGUARD_PUBKEY`, verifies the decoy-issued IID1 and the installed `sealed_id` (`OP_ISSUED_SEALED_ID_PATH`, default `/agent/user/sealed_id`), and commits or confirms the record (`record.sealed_id == inline`).
- `crates/op-grpc-bridge/src/interceptor.rs`: exactly one of OIA1 or SID1 per request. SID1 goes through `authenticate_sid1_grpc`.

## Change

1. **Keep the adopted SID1 in memory.** `adopt_issued_identity_at_startup` already computes `inline`, whether it commits a record or confirms an existing one. Expose it once, for example as `OnceLock<String>` `OWN_SEALED_ID`, set only after the record check passes. Don't read the file again per request, and don't add a second copy anywhere else.
2. **Route.** In `container_ui::mount`, add `GET /__3tched/config.js`. The handler takes no extractors. It returns 404 if `OWN_SEALED_ID` is unset. Otherwise it returns `window.__3TCHED_CONFIG__ = <serde_json of {"identity":{"kind":"sid1","sealedId":..}}>;` with the headers from Requirement 1.4. `serde_json` handles quoting, so nothing is formatted by hand.
3. **Stop saying the opposite.** Update the `container_ui.rs` module comment ("no ... credential injection") to describe the new route and its owner decision.
4. **SID1 path for a service identity.** Run Requirement 2's test first. Change `authenticate_sid1_grpc` only if it refuses a `principal_kind: service` record. That change belongs in the SID1 path's own checks.

## UI side (Subsidiary, done or trivial)

- `ui/src/lib/door/identity.ts` reads `window.__3TCHED_CONFIG__.identity`. It accepts SID1 only and checks for standard base64.
- `ui/src/app.html` loads `<script src="/__3tched/config.js"></script>` before the app bundle. A 404 leaves the config unset, and the shell shows "not connected".

Serving a separate script keeps `index.html` a static file, so the bridge never rewrites HTML, and it works with a `script-src 'self'` CSP.

## Open questions

1. Does the kiroween container's volume hold an installed `sealed_id`, and is `OP_IDENTITY_OWN_WIREGUARD_PUBKEY` set in its bridge? The instance has `user.opdbus.wireguard_public_key` and `user.opdbus.admission: pending`, so it may not have an adopted identity yet.
2. Expiry: if the SID1 has a term (`expires_at` > 0), the page holds a stale value after expiry. With `no-store`, reloading the page picks up the new one. Is a reload enough, or should the UI watch for expiry? A reload is enough for the demo.
