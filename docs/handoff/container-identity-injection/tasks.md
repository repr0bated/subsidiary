# Implementation Plan — `container-identity-injection`

For odbus-verified. Use the golden chroot Cargo shim, one build at a time.

- [ ] 1. Test first: does `authenticate_sid1_grpc` admit a `principal_kind: service` SID1 as the container identity? Write the test either way
  - _Requirements: 2.1, 2.2_
- [ ] 2. Keep the adopted own SID1 in memory (`OWN_SEALED_ID`), set only after `adopt_issued_identity_at_startup` passes its record check
  - _Requirements: 1.2_
- [ ] 3. `GET /__3tched/config.js` in `container_ui::mount`: no extractors, `serde_json` body, `no-store`, `nosniff`, `text/javascript`; 404 when unset. Update the module comment
  - _Requirements: 1.1, 1.3, 1.4, 1.6_
- [ ] 4. If task 1 failed: make the SID1 path admit the container's own service identity, within its existing checks
  - _Requirements: 2.2_
- [ ] 5. Tests: value matches the adopted identity, or 404; query and body ignored; headers present; another container's SID1 refused; value absent from captured logs
  - _Requirements: 4.1–4.4, 1.5_
- [ ] 6. Golden build and deploy (owner go-ahead). Live check on Jeremy's door: `/__3tched/config.js` returns 200 (print the status only, never the body); the UI on `https://10.0.0.2:20000/` connects; `CallMethod identity_sled.get_own_identity` returns `completed`
  - _Requirements: 1, 2_
