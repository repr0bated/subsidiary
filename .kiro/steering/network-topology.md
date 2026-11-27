---
inclusion: always
---

# Network topology

Checked 2026-11-27, read-only. This is the map. Do not probe listeners, flows, namespaces, or `docs/src/operations/network.md` to relearn it. Re-check only the one claim you are about to change. That operations file is a dated log; sections in it are superseded.

## Identity

The container is the identity is the WireGuard key. One thing. There is no mux. A mux exists only to find the container, and the connection was already handed the identity. Do not select by listener port, peer IP, or request bytes. The browser is never authenticated again.

The first step is the identity sled: take the identifier it already holds and use OpenFlow to route to that container. No route, or an inactive, unanchored, or expired identity: the traffic goes nowhere. No NORMAL fallback.

## UI the browser is served

The page is inside the container, on that container's own `127.0.0.1`. Not a host port.

Live door, 2026-11-27: `https://127.0.0.1:8443/` returned HTTP 200 `text/html`, 1428 bytes, in both identity containers. `:8080` is not this UI and was not listening in kiroween. Do not change ports.

| Container | Runtime | Loopback UI | Asset |
|---|---|---|---|
| kiroween | lxc | `127.0.0.1:8443` | `start.B3vC46NB.js` |
| Jeremy | incus | `127.0.0.1:8443` | `start.Bz_1mM2m` |

Host ports are not the UI. Do not curl them and call that the container page.

- `10.0.0.2:20000` and `:20001` — host `op-grpc-bridge`
- `10.0.0.2:8080` — host `op-web-server`
- `100.96.0.5:8080` — socat to `10.0.0.2:20000`
- `100.96.0.5:8090` — socat to `10.0.0.2:8090`
- `100.96.0.5:8443` — incusd
- `10.0.0.2:8090` inside a container — identity door, not the browser UI

## Running carrier versus target

Running, not the design: `op-tunnel-door` splices the browser socket to `127.0.0.1:8443` in kiroween and Jeremy. `3tchedChatbot` splices its control socket to `10.0.0.2:8090`. That splice delivers bytes. It does not find the container.

Target, not built: OpenFlow on `ovsbr0` carries the identity's traffic into the container network namespace. The container has no NIC. The UI door stays on `127.0.0.1:8443`. Linux drops `127.0.0.0/8` that arrives on any interface other than `lo` unless `route_localnet` is set on that interface. On 2026-11-27, `all=1` and `ovsbr0=0`.

OpenFlow is not doing this. `ovsbr0` has `eth0` and its internal port only. One flow: cookie `0`, priority `0`, action `NORMAL`.

Do not put `CloudflareWARP` on `ovsbr0`. It is a layer-3 tun, not a bridge port. Host egress uses the WARP table (`not from all fwmark 0x100cf lookup 65743`). Bridging it cuts every outbound path.

Flow writes go only through the sealed plugins (`openflow`, `ovsdb_bridge`, `rovs_commands`, `rtnetlink`) via zcall. Never `ovs-*` writes.
