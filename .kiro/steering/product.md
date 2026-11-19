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
spawn subsidiary → issue grant → run action → verify receipt on-chain.

## The one rule
`admit(a) ⇔ identity(a) ∧ grants(a) ∧ sealed(a)`. Nothing executes that the
live sealed schema does not authorize for the acting identity.

## Principles
- Rendering is not execution. The GUI and chatbot only render; every action
  dispatches through a sealed method, and the backend decides.
- The schema never reaches the renderer if the grant does not exist.
- Admission is the trust; the sealed blob is the law; the anchor is only the
  timestamp. Anchor only what is real — never reconstruct provenance.
- The schema is live: read it from the running backend, never copy it.

## In scope (new, built with Kiro)
- `sealed-surface-gui` — the Svelte sealed-surface UI.
- `receipt-anchoring` — anchoring receipt catalog hash + schema hash on
  Ganache, then Base Sepolia, plus an independent verifier.

## Out of scope (pre-existing, see PREEXISTING.md)
Container provisioning, bridge, 3tchedFS, D-Bus control plane, grants and
capabilities, catalog-routing, sealed catalog, earlier anchor proof.
