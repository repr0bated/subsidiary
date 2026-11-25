---
inclusion: always
---

# Structure

- `ui/`        Svelte 5 sealed surface
- `web3/`      Foundry project (src, test, script; `out/` and `cache/` are ignored)
- `container/` container build and mounts (Cozo/RocksDB, FUSE)
- `docs/`      design notes and submission material
- `.kiro/`     steering, specs, hooks, settings, scripts

Keep changes mergeable into 3tched: no renamed shared concepts, no forked copies of live schema.
