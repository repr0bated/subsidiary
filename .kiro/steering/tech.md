---
inclusion: always
---

# Tech

- UI: Svelte 5 sealed surface (runes), in `ui/`.
- Contracts: Foundry only (`forge`, `anvil` on chain 31337, `cast`, `forge script`). Not Ganache, not Hardhat.
- Storage: Cozo with RocksDB on host ext4, mounted into the container. One DB per tenant.
- **The identity is the system is the container is the WireGuard key (owner, 2026-11-26): one thing, not four.** A container does not hold, run as or log in with an identity; it is the identity, and its WireGuard key is that same identity, not a credential issued to it.
- One source of truth: everything is generated from the plugin (its sealed schema): the GUI, the hash chain records, policy and enforcement. No caches, no copies, no extra databases (SQL or otherwise), no mirrored state. If you feel the need for one, stop and ask; the answer is almost always to read from the plugin.
- This design is deliberately not mainstream. Do not "fix" it toward common patterns: no API or HTTP clients, login or token flows, polling or retry loops, schema copies, direct database layers, or Btrfs snapshots used as backups (Btrfs here is transport and cache). If something looks unusual, assume it is intended and ask before changing it.
- The UI is the chatbot. Nothing reaches the human until the chatbot renders it, and the chatbot never renders capabilities (names, identifiers, grant lists, `required_capability`). Ungranted operations it renders are shown as present but not runnable.
- First person: write code from the identity's point of view. The identity looks out from its own mount, where everything it may use is already local and present. Do not write discovery, searching, polling, waiting loops, or authentication handshakes; read the mount, write call files, and take changes from the feeds.
- Boundary: the UI runs only in the container; the backend runs only on the host. The UI sends model and chat mode to the host through FUSE. Only the host decides grants and capabilities, and it delivers only the granted schema. No chatbot or identity ever makes grants or capabilities, whatever the path (FUSE, host or container).
- **Where the UI is:** the container's own `127.0.0.1`. The map, the live port, and which host ports are not the UI are in `network-topology.md` in this directory. Do not re-probe to relearn it. Do not change ports.
- Never refactor, replace or bypass the bridge or the FUSE layer from this project. If a change would touch them, stop and ask.
- Backend channel: FUSE call files are the only way the UI or agent reaches the backend. No direct HTTP/DB access from the UI.
- Live schema, no copies: read the schema through FUSE; do not duplicate it into the repo.
- Local chain: `anvil` at http://127.0.0.1:8545.
