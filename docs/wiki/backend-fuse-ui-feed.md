# Backend → 3tchedFS → UI: the schema and state feed

Topic: how schema and state travel from plugin source to the UI, as traced in source by the owner's backend agent (2026-11-24, read-only), plus what was checked live here.
Sources: `odbus-verified` `crates/op-plugins/src/state_plugins/*.rs`, `op-plugins/src/bin/opblob.rs`, `op-grpc-bridge/src/{mutation_engine,container_ui,runtime_catalog,runtime_misc,runtime_fuse}.rs`, `op-core/src/projection_shm.rs`, `_3tched-fs/src/{source,model,namespace,fuse_fs,mounted}.rs`, `op-state-store/public_state.rs`, `op-plugins/src/state_plugins/fuse.rs`.
Status: the backend is being rebuilt so that everything in this path is included. Parts below exist in source but are not yet in the sealed catalog (see "Live check").

## Pipeline
1. Plugin definitions (`op-plugins/src/state_plugins/*.rs`): each `PluginSchema` declares the state type, methods, `required_capability`, and `public_state.paths`.
2. `opblob seal-shm` writes the sealed blobs `/dev/shm/opdbus/plugin-blobs/<plugin>.<hash16>.blob` (OPBLOB01) and `.manifest.json` (`catalog_hash`, `generation`).
3. MutationEngine, the single write door, commits runtime state with `write_plugin_projection()` (`mutation_engine.rs:620`) → `op_core::projection_shm::write_projection()`: `/dev/shm/opdbus/state/<plugin>.json` (0600), atomic temp file and rename per plugin, manifest generation written last as the commit point.
4. 3tched-fs capture (`_3tched-fs/src/source.rs`, `capture_bounded`): reads the catalog manifest, decodes each blob and checks its SHA-256 schema hash against the manifest, takes one locked snapshot of SHM state, projects each plugin's state through its sealed public policy, and stores content-addressed objects plus a `ViewManifest` (`view_id` = BLAKE3 of the canonical view JSON) in the ObjectStore (`/dev/shm/3tchedfs*`). `--schema-only` skips state, for booting before the state owner is up.
5. The TypedFuse mount (`_3tched-fs/{fuse_fs,namespace}.rs`) serves the view.

## Two authorities, kept separate
| | Schema | State |
|---|---|---|
| Source | Each plugin's `PluginSchema` | Runtime mutations |
| Writer | `opblob seal-shm` | MutationEngine |
| Pinned | At capture, frozen into the view | Never frozen for view mounts |
| Exposure | The full schema travels | Only `schema.public_state.paths` survive `project_public_value()` (`_3tched-fs/model.rs:217`, `op-state-store/public_state.rs`). An empty policy means no state is disclosed |

## What the mount serves (`namespace.rs:270+`)
```
/run/mounts/3tchedFS/
├── .3tchedfs.json      format 3tchedfs/1, view_id, source catalog hash and generation, object_count, mount_identity, instance_uuid
├── view.json           pinned view manifest
├── plugins/<plugin>/
│   ├── schema.json             sealed PluginSchema, frozen at capture
│   ├── object.blob.json, object.hash, capabilities.json
│   ├── value.json              LIVE public-projected state
│   ├── data/…                  state exploded recursively; scalar leaves are live files
│   └── operations/<method>/{input.schema.json, output.schema.json, metadata.json, call}
├── operations/<plugin>/<method>   symlinks to the above
├── capabilities/<cap>/…           symlinks grouped by required_capability
└── relationships/dependencies/…
```

The key asymmetry: schema comes from the pinned captured object; state does not. On view mounts, `value.json` and every `data/` leaf are live: each `open()` re-reads `/dev/shm/opdbus/state/<plugin>.json` under the projection lock, re-verifies the pinned catalog before and after, re-projects through `public_state`, and snapshots the bytes for that file handle only. No polling, watching or caching; reopening gets fresh state. Workspace (copy-on-write) mounts are the opposite: frozen captured objects, no live reads.

## How the UI gets it
The browser never touches FUSE. The UI is a separate repository served as static files by `op-grpc-bridge/src/container_ui.rs` on the TLS door, which first verifies its own mount.

Schema: one call, `fuse.get_catalog` (types in `op-plugins/src/state_plugins/fuse.rs:9609+`, routed in `runtime_misc.rs:54` → `runtime_catalog::get_catalog`):
1. It opens both mounts (`CHAT_UI_MOUNT`, default `/run/mounts/3tchedFS`; `CHAT_UI_BINARY_MOUNT`, default `/run/mounts/threetchedFS`) through `_3tched_fs::mounted::MountedNamespace`, which walks descriptors with `O_NOFOLLOW`, cross-checks `.3tchedfs.json` against `view.json`, and pins the mount's `instance_uuid`.
2. It reads `plugins/<p>/schema.json` for each plugin and fails hard if it differs from the sealed runtime catalog (`runtime_catalog.rs:33`), so the UI's schema can never drift from what the backend enforces.
3. It filters per caller: methods whose `required_capability` is not in the caller's current grants are removed from both the operation list and `schema.methods`; grants are re-checked after the blocking read to close the time-of-check gap.
4. It returns `GetCatalogOutput { views: [{ view_id, source_catalog_hash, source_catalog_generation, plugins: [{ plugin_id, object_hash, schema_hash, schema, operations: [{ method, call_path, metadata_path, currently_granted }], state }] }] }`.

State: the catalog deliberately carries none (`state: "not_requested"`). State reaches the UI per plugin only:
- through each plugin's own read methods, by writing to `operations/<method>/call`; the call goes over the lungs socket (`org.opdbus.v1.PluginV1.CallWithOperationId`) to the bridge's `Runtime::call`, where grants are enforced (not in FUSE); or
- for native clients, `MountedNamespace::state()` reading `plugins/<p>/value.json`.

## Who creates the mounts
- Standalone `3tched-fs` runit services for the host session mounts.
- Bridge-hosted, in `runtime_fuse.rs`: it enumerates committed Incus identities and mounts a 3tchedFS and threetched pair per container at `/run/mounts/by-container/<name>/`, dispatching calls in-process through `Runtime::call`.

## Live check (2026-11-24, here)
- The live sealed `fuse` plugin has only FUSE-operation methods (`open`, `read`, `write` and so on). It does not yet declare `get_catalog`: `zcall help fuse get_catalog` reports no such method. So `get_catalog` is in source, waiting for the rebuild and reseal.
- Only 10 live plugins declare any `public_state.paths`: `chat_router` (5), `fuse` (5), `grafana` (4), `hardware` (5), `incus` (6), `json_render` (3), `net` (4), `ovsdb_bridge` (16), `procfs` (4), `prometheus` (10). Plugins such as `chat_response`, `project` and `identity_sled` declare none, so their `value.json` discloses nothing. That fits the EIO seen earlier on `value.json`.

## Live check (2026-11-26, here)
- Live release is golden 352 (commit `c5f7180`, from `/mnt/@upper/golden-state.json`). The mounted catalog is still generation 75 (hash `da7c733a…`), so the sealed catalog did not change.
- `zcall methods fuse` still lists only FUSE-operation methods. `get_catalog` is not sealed yet. The UI must not rely on it until it appears.

## What this changes for Subsidiary
- Schema: the UI gets the granted schema from `fuse.get_catalog`, not by subscribing. It is already grant-filtered and checked against the sealed catalog.
- State: per plugin, through read methods, or `value.json` for plugins with a public policy. There is no push feed in this path; fresh state comes from reopening or calling again. The "one feed per plugin" requirement needs either this read-again model or a push mechanism the rebuild adds.
- Serving: `container_ui.rs` already serves the UI on the TLS door. That overlaps with the in-container adapter in the current `chat-canvas-ui` design.
