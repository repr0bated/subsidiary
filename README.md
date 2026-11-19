# 3tched Subsidiary

**Kiroween 2026 — Frankenstein category.** An individual project by Jeremy
Hobson ([@repr0bated](https://github.com/repr0bated)).

> You cannot separate the identity from any part of the system, because the
> system is inside the identity.

Subsidiary is a standalone identity container that runs as its own Web3
instance: a child of my 3tched platform, but independent. It has its own
identity, it acts only through methods sealed into the platform's catalog,
and every action is recorded in 3tched's private hashchain. The head of that
hashchain is committed periodically on a public chain — hashes only — so the
local history can be compared against what was publicly committed, and a
receipt handed to an authorized party can be checked against that public
commitment. A mismatch is tamper evidence. The chain contents stay private.

The core loop:

1. **Spawn** a subsidiary (a child identity container).
2. **Issue** a grant (an exact sealed capability).
3. **Run** an action through a sealed method.
4. **Verify**: the receipt holder checks the receipt against the public
   anchor of the hashchain head (head commitment + catalog hash + schema hash).

The admission rule, which nothing in this repo is allowed to weaken:

```
admit(a) ⇔ identity(a) ∧ grants(a) ∧ sealed(a)
```

## Why Frankenstein

It stitches together parts that were never meant to meet: Rust system
components, a D-Bus control plane, a FUSE filesystem that projects sealed
methods as call files, a Svelte + json-render UI, and an on-chain anchor.

## What is new in this hackathon (built with Kiro)

| Piece | Spec | Code home |
|---|---|---|
| Sealed-surface GUI — renders only what the identity's grants permit; the chatbot is a display-only renderer; every action dispatches through a sealed method and shows its receipt | [`.kiro/specs/sealed-surface-gui/`](.kiro/specs/sealed-surface-gui/) | [`ui/`](ui/) |
| Receipt anchoring (Web3) — EtchedAnchor (Foundry) periodically commits the head of 3tched's existing private hashchain, with the catalog hash and schema hash, on local Anvil then Base Sepolia; receipt holders verify against it and the operator compares the local head to the anchors. Hashes only on-chain | [`.kiro/specs/receipt-anchoring/`](.kiro/specs/receipt-anchoring/) | [`web3/`](web3/) |

Both are built spec-first in Kiro: Kiro drafts the spec, I review and correct
it, Kiro implements against it. The spec is the contract — the same principle
Subsidiary runs on, where the sealed schema is the law.

## What is pre-existing (disclosed)

Subsidiary runs on top of my existing 3tched platform. The container base,
provisioning, bridge, 3tchedFS, D-Bus control plane, grants and capabilities,
catalog routing, and 3tched's hashchain (event chain) with its vectorization
are pre-existing dependencies and are **not** claimed as hackathon work. EtchedAnchor is new hackathon work to be built with Kiro. Subsidiary reads the
platform's **live** sealed schema at runtime; it does not copy or fork it.
Full list with commit references: [`PREEXISTING.md`](PREEXISTING.md).

## Repository layout

```
.kiro/
  steering/        product.md, tech.md, structure.md
  specs/
    sealed-surface-gui/   requirements.md, design.md, tasks.md
    receipt-anchoring/    requirements.md, design.md, tasks.md
container/         how the base LXD container is provisioned (pre-existing tooling)
ui/                Svelte 5 + json-render sealed-surface GUI (new)
web3/              anchoring contract, anchorer and verifier (new)
```

The layout mirrors the hackathon area of 3tched (`etched-in-schema/ui`,
`etched-in-schema/web3`) so the new work can be merged back into 3tched as a
subtree without rewrites. See `.kiro/steering/structure.md`.

## How to run

> Status: specs and scaffold. Implementation is being done in Kiro against the
> specs in `.kiro/specs/`; these instructions are filled in as each task lands.

Requirements:

- A host running the 3tched backend (bridge + 3tchedFS + sealed catalog). The
  reference host is `antix1`. Subsidiary uses that backend's existing grants
  and capabilities — it brings no security model of its own.
- A freshly provisioned LXD container on that host (see
  [`container/README.md`](container/README.md)).
- Node 22+ / Bun for `ui/`; Foundry for `web3/`: `forge` for build/tests
  (including fuzz), `anvil` for the local chain (31337), `cast` for
  verification and `forge script` for deployment. Local Anvil first, then
  Base Sepolia (84532).

Planned commands (wired up by the Kiro tasks):

```sh
cp .env.example .env          # local chain settings only, no secrets
cd web3 && forge build && forge test  # includes fuzz tests when implemented
anvil                              # local chain, in a separate terminal
# Deployment will use forge script; verification will use cast.
cd ui   && <install> && <dev server against the container's 3tchedFS mount>
```

## License

[Apache-2.0](LICENSE), © 2026 Jeremy Hobson — the same license the 3tched
workspace declares, so code can move back into 3tched without relicensing.
