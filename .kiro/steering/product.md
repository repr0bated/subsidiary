---
inclusion: always
---
# Product: 3tched Subsidiary

An individual project by Jeremy Hobson for Kiroween 2026 (Frankenstein).
A personal project: keep all copy about Jeremy as an individual builder.

## What it is
A standalone identity container that runs as its own Web3 instance — a child
of the 3tched platform, independent but using the platform's existing
backend grants and capabilities.

## Core loop
spawn subsidiary → issue grant → run action → verify the receipt against
the public anchor of the hashchain head.

## Accountability without disclosure
- 3tched's hashchain (pre-existing) stays private: it protects IP and data.
- EtchedAnchor (new) periodically commits only hashes — the head commitment,
  catalog hash and schema hash — on a public chain.
- The point is comparison: the local head versus what was publicly
  committed. A mismatch is tamper evidence.
- Receipts are the verifiable artifact, given to authorized parties; the
  holder checks a receipt against the public anchor. Nobody gets the chain.

## The one rule
`admit(a) ⇔ identity(a) ∧ grants(a) ∧ sealed(a)`. Nothing executes that the
live sealed schema does not authorize for the acting identity.

## Principles
- Rendering is not execution. The GUI and chatbot only render; every action
  dispatches through a sealed method, and the backend decides.
- The schema never reaches the renderer if the grant does not exist.
- Admission is the trust; the sealed blob is the law; the anchor is only the
  timestamp. Anchor only what is real — never reconstruct history.
- The schema is live: read it from the running backend, never copy it.

## In scope (new, built with Kiro)
- `sealed-surface-gui` — the Svelte sealed-surface UI.
- `receipt-anchoring` — EtchedAnchor (Foundry): periodic commitments of the
  hashchain head on Anvil, then Base Sepolia; receipt verification by the
  holder; operator-side head comparison.

## Out of scope (pre-existing, see PREEXISTING.md)
Container provisioning, bridge, 3tchedFS, D-Bus control plane, grants and
capabilities, catalog-routing, sealed catalog, and the hashchain with its
vectorization. EtchedAnchor is new
hackathon work, not a pre-existing contract.
