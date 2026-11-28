# Plugin feeds: one per plugin, schema plus state

> Update 2026-11-24: for the UI, the backend's path is `fuse.get_catalog` for schema and per-plugin read methods (or `value.json`) for state; see `backend-fuse-ui-feed.md`. `StateSync.Subscribe` below is the door's push feed and is not the UI path in that design.

Topic: what the bridge sends as a plugin's schema and state, the wire format, and how it feeds the UI's state.
Sources: `odbus-verified` `hackathon/docs/DEV-CYCLE.md` ("Each plugin is a schema feed"), `crates/op-grpc-bridge/proto/operation.proto` (`StateSync.Subscribe`, `StateChange`), `.kiro/specs/identity-chat-interface` Requirements 23 to 28; `3tched.com` `src/grpc/plugin-feeds.ts` (pre-separation reference); `@json-render/svelte` state API.
Retrieved: 2026-11-23. Re-checked 2026-11-26: the host view is still catalog generation 75 (`view.json`); `plugins/<id>/value.json` still returns `Input/output error` for `chat_router` and `openflow` (item 6 and the last Open question below are unchanged); the shared-memory trees and the door's `StateSync` wire format were not re-read

## What a feed is
Every sealed plugin publishes itself. A subscriber gets one stream per plugin:
| Frame | Carries |
|---|---|
| Schema frame (`CHANGE_TYPE_SCHEMA_MIGRATION`) | The sealed `PluginSchema` JSON in `new_value`, its hash in `member_name` and `schema_hash`. Lets the UI render forms and validate before calling |
| State frames | Committed values per D-Bus object path, each with `state_generation` and `catalog_hash` |
| Tombstones (`OBJECT_REMOVED`, `PROPERTY_DELETE`, or no `new_value`) | Deletions, so a removed object never reappears from an older frame |
| Heartbeats (`STATE_FRAME_KIND_HEARTBEAT`) | Repeat the last committed `catalog_hash` and generation; no state |
| Withheld | Private state the subscriber is not entitled to is not sent; the UI shows it as `withheld-or-unavailable` |

State has one writer, MutationEngine. It commits each admitted call's result and only then notifies subscribers, so a feed never carries an uncommitted value. Feeds carry no authority.

## Where the two halves come from, and who sends them
Two shared-memory trees, one writer, one sender.

| Half | Where | Versioned by | Read by |
|---|---|---|---|
| Schema | Sealed blobs, `/dev/shm/opdbus/plugin-blobs/<plugin>.<schema_hash16>.blob`, plus `.manifest.json` (`catalog_hash`, `previous_catalog_hash`, `generation`, plugin to hash map). Catalog generation 75 on 2026-11-23 | Catalog generation and per-plugin schema hash | The bridge's catalog |
| State | `/dev/shm/opdbus/state/<plugin>.json`, one JSON file per plugin, plus `.manifest.json` (`generation`, `publishing`). Private namespaces under `.bridge-private/<owner>/`. State generation 15 on 2026-11-23; only `identity_sled.json` was in the public tree | State generation (separate from the catalog generation) | The bridge's state store |

- MutationEngine is the single writer of state (`op-core/src/projection_shm.rs`). On every admitted mutation it commits the state, writes that plugin's file (temp file, then rename), writes the manifest last as the commit point, and only then publishes a `StateChange` to subscribers. Readers take a shared lock across manifest and data and reject an in-progress write.
- The bridge combines the halves in `StateSync.Subscribe` (`op-grpc-bridge/src/core.rs` `state_subscription`). Under the commit lock it captures, at one commit boundary:
  - schema frames from the catalog (`schema_frames_locked`): one per plugin, the sealed `PluginSchema` and its `schema_hash`;
  - initial state frames from the state store (`initial_frames_locked`): one per plugin and object path, stamped with that plugin's `schema_hash`, the `catalog_hash` and the state generation;
  - a live receiver for later `StateChange` frames.
  So a subscriber never sees state from between two commits, and every state frame says which schema it belongs to.
- The raw state files are root-only (0600). Location does not authorize disclosure: the bridge applies each plugin's state-exposure policy before sending, which is why some state arrives as withheld.

## Wire format
`StateSync.Subscribe(SubscribeRequest) returns (stream StateChange)` on the door (gRPC-Web).

`SubscribeRequest`: `plugin_ids` (empty means all), `path_patterns` (globs), `tags`, `include_initial_state`, `include_schema`.

`StateChange` fields: `change_id`, `event_id` (audit chain; not a state revision), `plugin_id`, `object_path` (under `/org/opdbus/v1/plugins/<sanitized id>`), `change_type`, `member_name`, `old_value`, `new_value` (`google.protobuf.Value`), `tags_touched`, `event_hash`, `timestamp`, `actor_id`, `frame_kind` (`INITIAL_STATE`, `UPDATE`, `HEARTBEAT`), `schema_hash`, `catalog_hash` (blake3 over sorted plugin id and schema hash pairs, on every frame), `state_generation` (monotonic per namespace; do not compare across owners).

Object paths: the sealed id is lowercased, hyphens become underscores, and a leading digit gets a `plugin_` prefix (`op_plugins::canonical::plugin_path`).

## Applying frames (rules from the reference reducer)
- Key each value by plugin and object path; keep the highest `state_generation` per key and ignore older frames.
- A schema frame sets the plugin's schema and schema hash; a schema frame with no value means the plugin was removed.
- A tombstone deletes the path and everything under it, and blocks older frames for that subtree.
- Values are complete views of their path, replaced, not patched.
- A plugin's state is "available" only when its values match its current schema hash.
- Retry only on transport unavailability or an expired proof. Identity change, capability denial, revocation and malformed frames stop the feed.

## Feeding the UI's state
- Keep feed data read-only under `/plugins/<plugin_id>/...` in the json-render state store (`JsonUIProvider` `initialState`, `createStateStore`). Specs bind to it with state paths, so a rendered view updates when its plugin's feed changes.
- The UI never writes into `/plugins`. Only a sealed method call changes state, and the change comes back through the feed.
- Local view state (form inputs, toggles) lives under a separate path and is never treated as committed.
- One subscription can cover all plugins (`plugin_ids` empty), but the reducer keeps one feed per plugin. Subscribe to specific plugins to narrow it.

## What the UI depends on (checks for the state fix)
The owner is fixing state with another agent (2026-11-23). The UI needs these to hold:
1. Every sealed plugin's committed state is in the SHM state tree, public or in its owner's private namespace, not only `identity_sled`.
2. `Subscribe` with `include_schema` and `include_initial_state` returns one schema frame per plugin and initial state frames stamped with the matching `schema_hash`, `catalog_hash` and state generation.
3. After a sealed call commits, a `STATE_FRAME_KIND_UPDATE` frame for that plugin and object path arrives with a higher state generation.
4. Deletions arrive as tombstones.
5. Private state the caller is not entitled to is withheld, not sent.
6. `plugins/<id>/value.json` on the mount reads the same committed state (it returns EIO today).
7. Inside a container, the identity can get the same feed or an equivalent through its mount.

## Open
- The browser subscribes through the door. Is there a FUSE equivalent for the identity inside the container, or do container processes read point-in-time state through read operations only?
- `plugins/<id>/value.json` on the mount returns EIO today; once it works, is it fed from the same committed SHM state?
