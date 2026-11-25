# Design: Tenant Storage

- Host path: `/var/lib/subsidiary/tenants/<tenant-id>/cozo` (ext4), bind-mounted to `/data/tenants/<tenant-id>/cozo` in the container.
- One Cozo engine instance per tenant, opened with the RocksDB backend at that path.
- Tenant id comes from the verified identity of the request, never from request payload.
- Startup check: each configured tenant path exists and is writable, else abort.
- Schema: read-only FUSE file generated from the live Cozo relations on each read.
- `.kiroignore` keeps tenant data out of the agent's context.
