# Design: Sealed Surface GUI

## Overview
`ui/` hosts one sealed surface. The chatbot produces each view on the fly; the surface renders it and nothing else. No screens are written ahead of time.

## Pieces
- Sealed host: the only fixed code. It receives chatbot output, checks it against the seal, and renders it.
- FUSE client: the only module that touches the backend, by writing call files and reading results under the FUSE mount.
- Admission display: shows identity, grants and sealed results for a requested action (rendered by the chatbot like any other view, from the result file).

## Data flow
User intent -> chatbot reads live schema via FUSE -> chatbot produces view -> sealed host checks and renders -> user action -> FUSE call file -> backend admission (identity AND grants AND sealed) -> result file -> next view.

## Open decision
The format of chatbot output and how the seal is enforced. This decides the host's design and must be settled before tasks are written for it.

## Testing
`npm --prefix ui run check` for types. Rendering and admission are tested against the real FUSE mount once it exists.
