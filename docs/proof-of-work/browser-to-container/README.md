# Proof: a browser request reaches `127.0.0.1:8443` inside kiroween (2026-11-26)

Read-only checks, run from the host. No service was restarted, nothing was installed, and no flow or OVSDB row was written.

## Path, as it runs now (release 348, odbus-verified `9bc3aaf`)

```
browser ──HTTPS/HTTP2──▶ 10.0.0.2:20001          host op-grpc-bridge (pid 4985), tonic browser listener
                                                  (OP_BROWSER_DOOR=10.0.0.2; port from kiroween's browser_port)
          ──gRPC over the shared Unix socket──▶ /run/opdbus/tunnel-browser/browser.sock
                                                  bind-mounted in kiroween at /run/mounts/opdbus/tunnel-browser/browser.sock
          ──▶ op-tunnel-door in kiroween (pid 79): --door 127.0.0.1:8443
          ──▶ axum UI door, 127.0.0.1:8443 in kiroween   TLS ends here
          ──▶ kiroween's own /run/mounts/3tchedFS
```

No socat is on this path.

## Evidence

- Which port is kiroween: `https://10.0.0.2:20001/` serves `start.B3vC46NB`, the same build as kiroween's `CHAT_UI_DIR` (`/usr/local/share/op-browser-ui/index.html`). Port 20000 serves a different build (another container).
- In kiroween: `op-tunnel-door --socket /run/mounts/opdbus/tunnel-browser/browser.sock --door 127.0.0.1:8443` runs; `op-grpc-bridge` listens on `127.0.0.1:8443`; `/run/mounts/3tchedFS` and `/run/mounts/threetchedFS` are mounted (fuse.3tchedFS).
- gRPC-Web `operation.v1.PluginService/ListPlugins` to `https://10.0.0.2:20001/`: `HTTP/2 200`, `grpc-status:0`, 15347 bytes; the list includes `openflow`, `identity_sled`, `ovsdb_bridge`.
- gRPC-Web `GetSchema { plugin_id: "openflow" }`: `HTTP/2 200`, `grpc-status:0`, 47432 bytes; contains `add_flow` and `get_datapath_health`, no `ensure_fallback_normal` (matches release 348).

Commands:
```
curl -sk -X POST https://10.0.0.2:20001/operation.v1.PluginService/ListPlugins \
  -H 'content-type: application/grpc-web+proto' -H 'x-grpc-web: 1' --data-binary $'\x00\x00\x00\x00\x00'
# GetSchema body: 0x00, length (4 bytes BE), then field 1 "openflow"
```

## Not done, for the owner

- `100.96.0.5:8080` (the WARP address) is still `socat → 10.0.0.2:20000` (runit `opdbus-vip-door-8080`), which is another container, not kiroween. It was left running because it may be the path someone is using. Replacing it with the bridge's own tonic listener on `100.96.0.5` is a bridge change plus a deploy.
- OpenFlow does not carry this traffic. WARP traffic arrives on `CloudflareWARP`, a layer-3 tun that is not an `ovsbr0` port; the only `ovsbr0` port is `eth0`. Putting `CloudflareWARP` on `ovsbr0` needs the OF1.5 `packet_type` match and changes the live ingress path; not done while the owner was away, because a wrong flow there would cut off the way back in.

## WARP without socat: tonic browser listener on 100.96.0.5 (owner: "you take ownership")

- `53d97dd`: Codex's uncommitted, already-live chatbot shared lungs work committed as found (task `chatbot-shared-lungs-20261126`); Kiro owns it from here.
- `bdacd7d`: `OP_BROWSER_DOOR` is a comma-separated list; the host run script sets `10.0.0.2,100.96.0.5`. Every identity's browser port is bound on both, served by the same tonic browser listener over the shared browser socket into that container. Not compiled before deployment (owner, AGENTS.md).
- Decision, not asked: `CloudflareWARP` is not put on `ovsbr0`. All host egress uses the WARP table (`ip rule`: `not from all fwmark 0x100cf lookup 65743`), so bridging that tun would cut every outbound path at once.
- Golden deploy at `bdacd7d` started 2026-11-26 23:45Z: `~/provisioning/runs/golden-deploy-bdacd7d-20261126T234519Z.{sh,log,receipt}`. Verification after activation: `https://100.96.0.5:20001/` must serve kiroween's `start.B3vC46NB` and answer gRPC-Web `ListPlugins` with `grpc-status:0`.
