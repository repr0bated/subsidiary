---
inclusion: always
---
# Tech

Match the 3tched platform (repr0bated/odbus-verified) so code merges back.

## Backend (pre-existing, consumed live)
- Rust 2024 workspace, `op-*` crates, license Apache-2.0.
- D-Bus control plane: bus name `org.opdbus.v1.plugins`, interface
  `org.opdbus.v1.PluginV1`; identity bootstrap `org.opdbus.v1.DbusIdentityV1`.
- 3tchedFS (FUSE) projects each sealed method as
  `operations/<plugin>/<method>/{call,metadata.json,input.schema.json,output.schema.json}`.
  An identity acts by writing JSON args to `call` and reading the result /
  `error`. Humans act through the door's generic `PluginService/CallMethod`
  with their own credential. Same blob, same capability check, same receipt.
- Grants are exact sealed capability strings (exact match only; tags never
  grant).
- No MCP in the UI or anchoring path. Do not use the host `lungs` socket from
  new code directly; go through the mount or the door.

## New code
- UI: Svelte 5, SvelteKit, Vite, `@json-render/core` + `@json-render/svelte`
  0.20. Every visible element is declared in the catalog sealed in the
  `json_render` blob; generated specs are validated against it before render.
- Web3: Solidity contract + TypeScript (or Rust) anchorer/verifier. Ganache
  (chain id 1337) first, Base Sepolia (84532) second. Index entries use the
  platform's live `etched.index-entry/1` format.
- Tests: unit tests next to code; integration tests run against a live
  backend only when explicitly enabled.

## Secrets
Never commit keys. On antix1, secrets resolve from `/etc/op-dbus/secrets`
(one value per file) and env from `/etc/op-dbus/env`. `.env` is gitignored.
