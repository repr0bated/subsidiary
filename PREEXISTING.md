# Pre-existing work (disclosure)

Everything listed here was built by me (Jeremy Hobson) **before** the
Kiroween submission period (Oct 30 – Dec 4, 2026) and is **not** submitted as
hackathon work. Subsidiary depends on it; it is not copied into this repo.

Reference repository: [repr0bated/odbus-verified](https://github.com/repr0bated/odbus-verified)
(the 3tched platform). Commit references below are from its `dev` branch at
`009e035e981c7494b314c008fac352b3dd4303ad` unless noted.

| Component | What it is | Where |
|---|---|---|
| 3tched platform | Rust workspace (`op-*` crates) for identity containers, D-Bus control plane, chat, deployment | `Cargo.toml`, `crates/` |
| Bridge (`op-grpc-bridge`) | Admits callers by kernel/credential identity, checks the exact sealed capability, commits and returns receipts | `crates/op-grpc-bridge/` |
| 3tchedFS | FUSE filesystem projecting each sealed method as `operations/<plugin>/<method>/{call,metadata.json,input.schema.json,output.schema.json}`; returns a `CallReceipt` | `crates/_3tched-fs/` (last touched `7668611`) |
| D-Bus control plane | `org.opdbus.v1.plugins` / `org.opdbus.v1.PluginV1`, identity bootstrap `org.opdbus.v1.DbusIdentityV1` | `crates/_3tched-fs/src/dispatch.rs`, bridge |
| Sealed catalog / plugin blobs | Plugin schemas sealed into blobs (`opblob`), the single source of methods, arguments and required capabilities | `crates/op-blob/` |
| Grants and capabilities | Identity grants as exact sealed capability strings; admission model | `crates/op-identity/`, bridge, `etched-in-schema/catalog-routing/src/model.rs` |
| catalog-routing | Pure decision engine: allow / refuse (naming missing capability) / needs-approval (two-person root) | `etched-in-schema/catalog-routing/` (`7475dd0`) |
| Approvals | Two-human root approval crate | `etched-in-schema/approvals/` |
| Etched index entry format | `etched.index-entry/1` append-only index linking Web3 artifacts to 3tched receipts | `etched-in-schema/schema/index-entry.schema.json` |
| json-render UI references | Design-free element map / menu and json-render 0.20 docs | `etched-in-schema/ui/` |
| Container provisioning | Identity container provisioning (`new`, `complete`), identity sled, SID1, `/dev/fuse` | `deploy/provisioning/` (`a347e41`), `deploy/scripts/provision-container.sh`, `.kiro/specs/provisioning-system-subsidiary/` |
| LXD/Incus plugins | Sealed `lxd` and `incus` plugins used to create the base container | `crates/op-plugins/src/state_plugins/lxd.rs` |
| Earlier Etched in Schema project | Prior hackathon work by me (also public: [repr0bated/etched-in-schema](https://github.com/repr0bated/etched-in-schema), `4f82d39`) | — |
| EtchedAnchor proof | A Solidity anchor contract proven end-to-end on local Ganache (catalog hash + schema hash in the receipt block). **Its source is not in either public repo above**; it is disclosed here as prior work and will be referenced by commit once located. | TBD |

## Live dependency, not a copy

Subsidiary does **not** vendor any schema. The GUI and the anchoring code read
the **live** sealed schema from the running 3tched backend at runtime:

- the sealed catalog and per-method `metadata.json` / `input.schema.json` /
  `output.schema.json` as projected by 3tchedFS in the identity's mount;
- the receipts the bridge returns for each call;
- the identity's grants as reported by the backend.

If the backend's formats change, Subsidiary follows them; nothing here
redefines them.

## Third-party

Svelte, SvelteKit, Vite, `@json-render/core`, `@json-render/svelte`, Ganache
and any Solidity toolchain are used under their own licenses.
