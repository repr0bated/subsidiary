---
inclusion: always
---

# Network topology

Checked 2026-11-27, read-only, on the host and the Decoy. This is the map. Do not probe listeners, flows, namespaces, WireGuard or nft, and do not read `docs/src/operations/network.md` to relearn it. Re-check only the one claim you are about to change, then update this file. That operations file is a dated log; sections in it are superseded.

## Identity

The container is the identity is the WireGuard key. One thing. There is no mux. A mux exists only to find the container, and the connection was already handed the identity. Do not select by listener port, peer IP, or request bytes. The browser is never authenticated again.

The first step is the identity sled: the identifier it already holds names the container. No binding, or an inactive, unanchored, or expired identity: the connection goes nowhere. No fallback.

## Target: `.kiro/specs/ui-networking-authoritative-2026-11-27/` (authoritative, not built)

No mux. One shared entry `:8080`. A BPF program ties the connection to the sealed WireGuard peer, and so to the sled. The host hands the accepted socket itself to that identity's bound lungs connection (D-Bus Unix fd). Inside the container it is spliced to `127.0.0.1:8443`, where TLS ends at the axum door. The spec forbids OpenFlow routes into the container, `route_localnet`, a container NIC, and selection by port, SNI or headers. It supersedes `identity-aware-mux`, `browser-door-dispatch`, `openflow-browser-route` and `browser-lungs-handoff`.

Blocker found 2026-11-27: the host never sees a WireGuard peer (next section). The spec says to stop in that case rather than weaken it.

## Live browser path (2026-11-27)

`https://10.0.0.2:8080` (over WARP, lands on `100.96.0.5:8080`) shows kiroween's own axum UI on its `127.0.0.1:8443`. It is kiroween's LXD proxy device `ui` (`listen=tcp:100.96.0.5:8080 connect=tcp:127.0.0.1:8443 bind=host`). No mux, no port 20000, no NIC, no route. Checked: page, `start.B3vC46NB.js` and `ListPlugins` all come from kiroween. The socat relay `opdbus-vip-door-8080` is down with a `down` file. Undo: `sudo lxc config device remove kiroween ui`.

## WireGuard and the Decoy

- WireGuard ends on the Decoy only (`standalone-network` design). The host has no WireGuard interface. Host interfaces: `CloudflareWARP` (`100.96.0.5/32`), `eth0`, `ovsbr0`, `ovs-system`, `dummy0`, `lo`.
- Decoy: `ubuntu@129.80.64.127`, key `~jeremy/.ssh/vps_key` (no `decoy` host alias for jeremy). Interfaces: `wg-opdbus` (`10.0.0.1/24`, port 51821), `wg0` (51820), `wgcf-ingress`, `mesh-wg` (`192.168.250.1/30`; table 28061 routes `10.0.0.2` and `100.96.0.5` via `.2`), `enp0s6`.
- Decoy nft: `wg-opdbus` traffic to `10.0.0.2:8080` and `:8090` is DNATed to `100.96.0.5` and masqueraded, so the peer's address is gone before the host. Other `wg-opdbus` traffic to `10.0.0.2` is marked `0x51820` for WARP or DNATed to the host's public `188.68.58.237`.
- `wg-opdbus` peers: `lnF9hBrc…` = `10.0.0.5/32` (the router, handshaking); `HzneJZpK…` = `10.0.0.8/32`; `8fUis0DF…` (kiroween's key) has no allowed IPs and no handshake; `1CWFO9e6…` has no allowed IPs.
- Router `10.0.0.5` (OpenWrt): answers ping from the Decoy; refuses TCP 22, 2222, 2022, 8022, 80, 443 and 8080. Its SSH must be opened from the WireGuard zone before its key can be changed.

## Not used

No mux. Port `20000` and the other `20000+` ports are not used (owner, 2026-11-27). Neither are the socat relay `opdbus-vip-door-8080` (`100.96.0.5:8080` to `10.0.0.2:20000`), `PortSelector`, `BrowserSelector::select`, `op-tunnel-mux` or the `op-tunnel-door` byte splice for the browser. They are leftovers still running until the BPF path replaces them. Do not route, test or debug the UI through them, and do not offer them as a fix.

The browser reaches its container only by BPF and the lungs hand-off (see Target). The door speaks only TLS: `https://`, never `http://`.

## The container

- `lo` only: `127.0.0.1/8` and `10.0.0.2/32` (namespace-local alias set by `opdbus-lo`). No NIC, no default route. Internet works through the eBPF egress (`ct-egress-bpf`), independent of browser ingress.
- UI door: axum on `127.0.0.1:8443`, TLS, `CHAT_UI_DIR=/usr/local/share/op-browser-ui`. It serves only `/`, `/chat` and `/assets/**`; any other path gets an empty `200 application/grpc`. The identity door is `10.0.0.2:8090` inside the container, not the browser UI.

| Container | Runtime | Loopback UI | Asset |
|---|---|---|---|
| kiroween | lxc (`sudo lxc exec kiroween`) | `127.0.0.1:8443` | `start.B3vC46NB.js` |
| Jeremy | incus (`sudo incus exec Jeremy`) | `127.0.0.1:8443` | `start.Bz_1mM2m` |

## Host ports (not the UI)

- `10.0.0.2:8080` — host `op-web-server` (the spec moves it off `:8080`)
- `100.96.0.5:8090` — socat to `10.0.0.2:8090` (control-plane door)
- `100.96.0.5:8443` — incusd

## OpenFlow

`ovsbr0` has `eth0` and its internal port only. One flow: cookie `0`, priority `0`, action `NORMAL`. OpenFlow carries no browser traffic. Do not put `CloudflareWARP` on `ovsbr0`: it is a layer-3 tun, and host egress uses the WARP table (`not from all fwmark 0x100cf lookup 65743`), so bridging it cuts every outbound path. Flow writes go only through the sealed plugins (`openflow`, `ovsdb_bridge`, `rovs_commands`, `rtnetlink`) via zcall. Never `ovs-*` writes.
