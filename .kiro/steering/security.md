---
inclusion: always
---

# Security

- Never put secrets in code, chat, logs, or mcp.json. Secrets come from env (`/etc/op-dbus/secrets`).
- Only hashes go on-chain. Never anchor payloads, tenant data, or identifiers.
- Receipt verification is done by the holder of the receipt.
- Admission rule: admit(a) iff identity(a) AND grants(a) AND sealed(a). Every write or shell action is checked against grants.
- Do not read `.env`, tenant Cozo data, or anything under `/etc/op-dbus/secrets`.
