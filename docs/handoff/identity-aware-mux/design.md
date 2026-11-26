# Design — `identity-aware-mux`

Status: PROPOSED, 2026-11-26. Owner direction, short on purpose.

## Model

The login already links the connection to its identity. Nothing is looked up afterwards: no peer IP, no port number, no search for "which container is mine".

The identity sled holds the route. The route is where that identity's traffic goes: a network namespace, the container's door socket, or anything else the sled names. The host follows it.

```
login (links connection -> identity) -> identity sled -> route (namespace / socket) -> the container's own UI door on 127.0.0.1:8443
```

## Pieces

1. **One shared entry.** One listener for every identity (no port per container). No Xray: the login already links the connection to its identity, so nothing extra authenticates or tags it (owner, 2026-11-26).
2. **Route from the sled.** Each identity sled carries its route. The mux reads it from the committed record at accept time and sends the connection there. No route, or an inactive, unanchored or expired identity: refuse, no fallback.
3. **Into the namespace.** OpenFlow needs no NIC in the container: it routes into the container's namespace. Control goes only through the sealed plugins (`openflow`, `ovsdb_bridge`, `rovs_commands`, `rtnetlink`) through zcall; `ovs-*` commands are not used.
4. **The container is unchanged.** `op-tunnel-door` and the UI door on the container's own `127.0.0.1:8443` stay as they are. The container is the identity; its mount is how calls run.

## Replaces

`BrowserSelector::select` in `crates/op-grpc-bridge/src/runtime_tunnel.rs` (selects by `listener.port`, ignores the connection) and the per-identity browser ports 20000+.

## Open, for the backend

- The sled field that holds the route (new, or an existing one such as `instance_json` or `interface`).
- What the login hands the mux at accept, so the right sled is read.
