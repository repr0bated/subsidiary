# OpenFlow in the container UI

How the browser reaches the container, how the container serves the `openflow` plugin's schema from its own loopback, and what the UI does with it. The sources are in `odbus-verified`, branch `hackathon/kiroween`, and each section names its files. Status is as of 2026-11-26. The last section says what is live and what is not.

## 1. From the browser to the container

This is why the OpenFlow work exists (owner, 2026-11-26). The host already knows which container a connection belongs to, because the login links the connection to its identity. What was missing is a route to that container. The identity sled holds the route, and OpenFlow carries the traffic into the container's network namespace. The container needs no NIC of its own for this.

### Target path (OpenFlow only, PROPOSED)

There is no mux in this path (owner, 2026-11-26). OpenFlow alone carries the browser's traffic to the container.

```
browser
  │  one shared entry on the host for every identity (no per-container port)
  ▼
ovsbr0 OpenFlow flows   flow children of the `openflow` plugin, made by add_flow
  │                     (derived cookies, no NORMAL); the identity sled names
  │                     which container the identity's traffic goes to
  ▼
the container's network namespace (no NIC of its own needed)
  ▼
op-grpc-bridge UI door in the container   TLS ends here
  ▼
the container's own 3tchedFS mount
```

- The host already knows which container is the identity's, so nothing is looked up from the browser's request, peer IP or port number. The route comes from the identity sled; the flows implement it.
- No route in the sled, or an identity that is inactive, unanchored or expired: no flow, so the traffic goes nowhere. There is no fallback to another container, and no NORMAL flow to fall back on.
- The flows are managed only through the sealed plugins (`openflow`, `ovsdb_bridge`, `rovs_commands`, `rtnetlink`) via zcall; never `ovs-*`.
- This replaces the tunnel path below: `op-tunnel-mux`, `BrowserSelector::select` (picks by listener port) and the per-identity browser ports 20000+.
- Open, for the backend:
  - which sled field holds the route;
  - how the flows match the identity's traffic at the shared entry;
  - where the UI door listens. Today it is the container's own `127.0.0.1:8443`. Packets steered in by OpenFlow arrive on an interface, not on loopback, so the door either listens on the address the flow delivers to (`parse_listen` already allows `10.0.0.2`), or the flow rewrites to it.
- Not built yet. The rovs-openflow work so far is the foundation: the bridge creates, changes and deletes flows on `ovsbr0` itself, admitted and verified. The per-container route flows and the sled route field are the next pieces, and neither is in the `rovs-openflow` spec's task list.

### Current path (what the target replaces)

```
browser
  │  HTTPS (gRPC-Web), the identity's browser port on the host
  ▼
op-tunnel-mux (host)            port from the identity volume's `browser_port` file
  │  shared door socket /run/opdbus/tunnel(-browser)/tunnel.sock
  ▼
op-tunnel-door (in the container)   holds Accept on the socket, splices each connection
  │  plain TCP splice on the container's loopback
  ▼
op-grpc-bridge UI door, 127.0.0.1:8443 (in the container)   TLS ends here
  │  one read or one call-file write per request
  ▼
the container's own 3tchedFS mount (/run/mounts/3tchedFS)
```

- **Browser port.** The host owns a `browser_port` file on the committed identity volume, which the guest sees read-only at `/agent/user`. `op-tunnel-mux` registers browser sockets from authenticated connection metadata, never from request bytes (`crates/op-tunnel-mux/src/browser.rs`). A separate reservation under `/var/lib/op-dbus/browser-ports` stops ports being reused. It is not a routing table.
- **Splice into the container.** `op-tunnel-door` (`crates/op-tunnel-mux/src/bin/op-tunnel-door.rs`) runs inside the container. It holds `Accept` on the door socket and splices each delivered connection to the container's own door. It keeps 4 waiters by default, so accepts stay ready while earlier connections are spliced. The splice copies bytes and does not read them.
- **The UI door listens only inside the container.** `crates/op-grpc-bridge/src/container_ui_door.rs` listens on `OP_UI_LISTEN`. Provisioning sets this to `127.0.0.1:8443` (`deploy/provisioning/30-provision-container.sh`, commit `bf56615`), in `/etc/op-dbus/env/OP_UI_LISTEN` and `/agent/user/OP_UI_LISTEN`.
  - `parse_listen` refuses any address that is not loopback or `10.0.0.2`.
  - If `OP_UI_LISTEN` is absent, or equals the identity door address (`OP_GRPC_BRIDGE_LISTEN`), the UI door does not start (fail closed).
  - When it does start, it needs `CHAT_UI_DIR` for the static UI assets.
- **No browser login.** The container is the identity and is already authenticated (owner, 2026-11-25), so the browser is never authenticated again.
  - The door ignores identity sent by the browser, and the request carries none. Every call and read goes through the container's own mount, so the identity is the mount's.
  - The door holds no caller, grant, credential or `Runtime`.

## 2. What the UI door serves

| RPC | What it does |
|---|---|
| UI assets | Static files from `CHAT_UI_DIR` |
| `ListPlugins` | Lists plugins from the mount's catalog |
| `GetSchema` | One plugin's schema, read from the mount on each request |
| `CallMethod` | One write to `plugins/<plugin>/operations/<method>/call`, then the receipt |
| `Subscribe` | Initial state from `value.json`, then the same file re-read on each commit notice |

Every other RPC returns `UNIMPLEMENTED` ("not served on the container UI door"). That includes `Mutate`, `GetState`, `BatchMutate`, `GetProperty` and `SubscribeSignals`.

## 3. The schema the browser gets

- **Source.** `GetSchema` for `openflow` reads `/run/mounts/3tchedFS/plugins/openflow/schema.json` in the container. It opens the mount again for every request (`on_mount`), so no schema is cached, and a remounted view is picked up at once.
- **Check against the sealed catalog.** The mounted schema is decoded the way the mount writes it (`_3tched_fs::model::from_sealed`) and compared with the sealed one (`enforces`). A plugin missing from the mount is `NOT_FOUND`. A mount that can't be read is `UNAVAILABLE`.
- **No copies.** There is no copy of the schema in the UI repo. The UI renders what the door returns.

### The `openflow` schema

Read from the live host view on 2026-11-26. The container view projects the same sealed catalog.

- `name`: `openflow`, `version`: `2.0.0`.
- **State fields** (`fields`):

  | Field | Meaning |
  |---|---|
  | `bridges` | Bridges the plugin manages |
  | `flows` | Flow children, `flows[<bridge>][<cookie>]` (§5) |
  | `observed_flows` | The last flow seen by each mutation receipt |
  | `controller_endpoint`, `enable_security_flows`, `obfuscation_level`, `auto_discover_containers` | Plugin configuration |

- **Methods** (`methods`):

  | Method | Kind | Subid | What it does |
  |---|---|---|---|
  | `add_flow` | mutation | `mut.network.openflow.flow.add@v2` | Creates a flow. The cookie is derived; there is no NORMAL action and no priority 0. |
  | `modify_flow` | mutation | `mut.network.openflow.flow.modify@v2` | Replaces a flow's actions. `expected` must equal the flow on the switch. |
  | `delete_flow` | mutation | `mut.network.openflow.flow.delete@v2` | Deletes a flow. `expected` must equal the flow on the switch. |
  | `get_datapath_health` | read | `obs.network.openflow.datapath.get-health@v1` | Fail mode, controllers, uplink flows present, NORMAL present, foreign flows |
  | `set_fail_mode` | mutation | `mut.network.openflow.datapath.set-fail-mode@v1` | `secure` or `standalone` (OVSDB) |
  | `set_controller` | mutation | `mut.network.openflow.datapath.set-controller@v1` | Sets one `ssl:` controller (OVSDB). |
  | `del_controller` | mutation | `mut.network.openflow.datapath.del-controller@v1` | Removes the controllers (OVSDB). |
  | `attach_controller_safe` | mutation | `mut.network.openflow.datapath.attach-controller-safe@v1` | Adds the uplink flows, then the controller, then fail mode `secure`. |

  None of these methods is idempotent. `ensure_fallback_normal` is no longer in the live schema.

- **Per-method files.** Each method is a directory in the mount, `plugins/openflow/operations/<method>/` (also linked as `operations/openflow/<method>`):

  | File | Contents |
  |---|---|
  | `input.schema.json` | JSON Schema of the one argument object. Build the form from this. |
  | `output.schema.json` | JSON Schema of the result. Render the result from this. |
  | `metadata.json` | The method declaration |
  | `call` | Write the arguments, then read the receipt back from the same file. Mode `0600`, owned by the identity. |

## 4. Calling a method from the UI

1. **Request.** The browser sends `CallMethod` with `plugin_id = "openflow"`, `object_path = /org/opdbus/v1/plugins/openflow` (any other path is refused), `method_name`, and one named argument object.
2. **What the door refuses.**
   - It refuses `x-opdbus-operation-id` from the browser, because the call file allocates the operation id.
   - A capability sent with the request must equal the method's sealed one, or the call is refused before anything is written. The UI does not need to send one: the door admits against the sealed declaration.
3. **One call-file write.** The door writes the arguments once to `plugins/openflow/operations/<method>/call` in the container mount, then reads the receipt from that file.
4. **On the host.** That write is the identity's call. It enters `Runtime::call`: the call is admitted (identity and grants and sealed), recorded by the execution tracker, receipted and appended to the sled ledger. The UI door adds no admission of its own. For flow methods the bridge then:
   1. takes the per-bridge lock and reads the switch over rovs at OpenFlow 1.5 (`unix:/var/run/openvswitch/<bridge>.mgmt`);
   2. compares the switch's flow with the request (compare-and-swap);
   3. runs the final admission immediately before the write;
   4. sends one FLOW_MOD plus a barrier;
   5. reads the flow back and verifies it.

   The code is in `crates/op-grpc-bridge/src/openflow_methods.rs`.
5. **Reply.**
   - The response payload is the method's result, as on the identity door, not the whole receipt.
   - The operation id comes back in the `x-opdbus-operation-id` response metadata.
   - If the effect may have happened but couldn't be confirmed, the door returns an "outcome unknown" reply. That is neither success nor refusal, and the UI must not offer a retry. A bridge-side read-back mismatch is reported the same way.

### Arguments the UI builds

These are taken from `input.schema.json`; always read the live file.

- **`add_flow`**: `{ "bridge": "ovsbr0", "flow": FlowEntry }`.
- **`modify_flow`**: `{ "bridge", "expected": FlowEntry, "replacement": FlowEntry }`. Table, priority and match must stay the same.
- **`delete_flow`**: `{ "bridge", "expected": FlowEntry }`.
- **`FlowEntry`**: `table` (0–254), `priority` (1–65535 for add and modify), `match_fields` (name to value, for example `in_port: "eth0"`), `actions` (list of `output`, `load_register`, `resubmit`, `set_field`, `drop`, `controller`, `arp_responder`), `cookie` (optional; if given it must equal the derived one), `idle_timeout`, `hard_timeout`.
- **Easiest way to fill `expected`:** take the flow child's own values from state (§5). The compare-and-swap then matches by construction.

## 5. Flow state for rendering

- **Where it is.** `Subscribe` on `openflow` gives the plugin state, read from `plugins/openflow/value.json` and re-read after each commit. Flows are under `flows[<bridge>][<cookie>]`.
- **Fields of each flow child** (`FlowChild`, commit `549929b`). Each field carries `x-oscal-subid` `obs.network.openflow.flow.<field>@v1`.

  | Field | Meaning |
  |---|---|
  | `bridge` | Bridge name |
  | `table`, `priority` | Flow table and priority |
  | `cookie` | The flow id, `0x33444348xxxxxxxx` (pattern `^0x33444348[0-9a-f]{8}$`) |
  | `match` | Match fields, in the same vocabulary as `match_fields` |
  | `actions` | Same action list as `FlowEntry` |
  | `flags` | Flow flags |
  | `idle_timeout`, `hard_timeout` | Timeouts |
  | `packet_count`, `byte_count`, `duration_sec` | Counters. They refresh on each switch read, because OVS refuses flow monitor on `.mgmt`. |

- **Identity of a flow.** The cookie is the plugin prefix `0x33444348` plus the first 32 bits of a SHA-256 over bridge, table, priority and match. The same flow always has the same cookie. Use it as the list key.
- **Foreign flows** are flows without the plugin cookie prefix, such as today's cookie-0 NORMAL. They are never flow children. `get_datapath_health` lists them under `foreign_flows`, and the UI shows them as a problem to resolve, not as rows of the list.
- **Planned D-Bus path** for each child: `/org/opdbus/v1/plugins/openflow/bridges/<bridge>/flows/<cookie>`. Planned 3tchedFS path: `plugins/openflow/bridges/<bridge>/flows/<cookie>/value.json`. Neither is wired yet (§7).

## 6. Rendering rules

- Render from the schema alone. Build forms from `input.schema.json`, results from `output.schema.json`, and the flow list from the `flows` field schema, through the json-render catalog. Add no hand-written OpenFlow component outside the catalog.
- Never render capabilities. Leave out `required_capability`, `capabilities`, `capability_grants` and grant lists. A method the identity isn't granted is shown as present but not runnable.
- Say what the flow is in plain words. For example: "eth0 → LOCAL, priority 10, 1.2 M packets". Use the subid for provenance only, not as a label.
- Treat "outcome unknown" as its own state. Show the operation id, and offer a re-read (`get_datapath_health` or the next `Subscribe` frame), not a retry.
- The chatbot only renders and never executes. Every call goes through the grant-gated call file above.

## 7. Status, 2026-11-26

| Part | State |
|---|---|
| OpenFlow route into the container, no mux (§1 target) | Proposed design only; no route flows and no sled route field exist yet |
| Browser → `op-tunnel-mux` → `op-tunnel-door` → UI door at `127.0.0.1:8443` (§1 current) | In source (`bf56615`, `container_ui_door.rs`). Not running in any container: no container has a bridge with the door enabled (HANDOFF 2026-11-25). |
| `openflow` methods in the live catalog | 8 methods, as in §3 (host view read on 2026-11-26) |
| In-process flow writes over rovs at OpenFlow 1.5 (task 4), bridge methods (task 6) | Committed (`062de97`, `93f1129`). In the golden deploy started 08:48Z; not live until that deploy's receipt says `phase=activated` |
| `flows[bridge][cookie]` schema (task 5.1) | Committed (`549929b`). It reaches the mounts after the reseal. |
| Flow children filled from the switch, the D-Bus child objects, and the per-flow 3tchedFS entries (tasks 5.2–5.6) | Not done |
| `DatapathHealthOutput` schema matching the new health fields | Not done (the sealed output still has the old `fallback_*` fields) |
| The live switch | Still has only its cookie-0 NORMAL flow. The uplink flows and NORMAL removal are owner steps (task 12). |
| Reading `plugins/openflow/value.json` and `data/` on the host view as `jeremy` | Fails with `Input/output error` (seen on 2026-11-26, cause not diagnosed) |
