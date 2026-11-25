# Design: Tenant Storage

- Host path: `/var/lib/subsidiary/tenants/<tenant-id>/cozo` (ext4), bind-mounted to `/data/tenants/<tenant-id>/cozo` in the container.
- One Cozo engine instance per tenant, opened with the RocksDB backend at that path.
- Tenant id comes from the verified identity of the request, never from request payload.
- Startup check: each configured tenant path exists and is writable, else abort.
- Schema: read-only FUSE file generated from the live Cozo relations on each read.
- `.kiroignore` keeps tenant data out of the agent's context.
- Container runtime (checked 2026-11-25): LXD. The `kiroween` container is an LXD container (Ubuntu 26.04, unprivileged, `security.idmap.isolated`, no profiles), provisioned by 3tched's sealed `lxd` plugin; its devices are `root`, `run` (host `/run/opdbus/subsidiary/<session_id>/run` → `/run`) and `sled` (identity volume, read-only, at `/agent/user`). The tenant mount deliverable is an LXD disk device added through the sealed `lxd` plugin, not a hand-written profile; read the live instance with `zcall lxd get_instance --name kiroween`.
