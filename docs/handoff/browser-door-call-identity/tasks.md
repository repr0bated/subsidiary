# Implementation Plan — `browser-door-call-identity`

For odbus-verified (`dev`, from `bf3c4a8`). Tasks 1 to 6 and 8 are done in `89d8950` and `74091c7`, per the backend's HANDOFF.md (tests written, not run). Task 7's optional count and OSCAL field were not added.

- [x] 1. Owner decisions: D1 option A; D2 closed (the container is already authenticated); D3 accepted
  - _Requirements: all_
- [x] 2. `OP_UI_LISTEN` as a distinct bridge setting
  - Provisioning (`provision-container.sh`, `30-provision-container.sh`, `31-provision-subsidiary.sh`) writes a UI address distinct from `OP_GRPC_BRIDGE_LISTEN`, to `/agent/user/OP_UI_LISTEN` and `/etc/op-dbus/env/OP_UI_LISTEN`.
  - The bridge run script exports it. The bridge starts no UI listener when it is absent or equal to the identity door.
  - _Requirements: 4.1, 4.2_
- [x] 3. UI router on its own listener
  - Move the `container_ui::mount` routes onto the UI listener, with the same TLS certificate.
  - Add tonic-web services for `ListPlugins`, `GetSchema`, `CallMethod` and `Subscribe`. Answer every other RPC with `UNIMPLEMENTED`.
  - _Requirements: 4.3_
- [x] 4. `UiPluginService.call_method` through `MountedNamespace::invoke`
  - Refuse identity metadata. Check the capability header against `method_decl`.
  - Return the receipt unchanged, with no retry.
  - _Requirements: 1.1–1.6_
- [x] 5. `ListPlugins` and `GetSchema` from `catalog_view` and `schema`, with no cache
  - _Requirements: 2.1, 2.2_
- [x] 6. `Subscribe` for the UI (after open item 2 is decided)
  - _Requirements: 3.1–3.3_
- [ ] 7. Schema, OSCAL and state count
  - _Requirements: 5.1, 5.2_
- [x] 8. Tests from requirement 6
  - _Requirements: 6.1, 6.2_
- [ ] 9. Live check in kiroween, after its image is rebuilt from `bf3c4a8` or later and its browser port is provisioned
  - From the Subsidiary UI: the picker loads providers, models and the current mode, and `SetSelection` and `select_context` return receipts.
  - `zcall` in the container verifies those receipts.
  - _Requirements: 1, 2_
