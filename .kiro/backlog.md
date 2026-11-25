# Open work

The worker agent (`.kiro/agents/worker.json`) takes items from here when the machine has been idle for 15 minutes.
Open work is this list plus every unchecked `- [ ]` task in `.kiro/specs/*/tasks.md`. Spec tasks are not copied here; this list holds only work that has no spec task.

Format: `- [ ] <what to do> (added <date>, <who>)`. The worker checks an item off when done, or moves it to Blocked with the reason.

## Open

## Blocked
<!-- - <item or spec/task id>: <reason>, what is needed to unblock (<date>) -->
- chat-canvas-ui 2.1: the pinned `odbus-verified` commit is not given anywhere, and no codegen configuration exists. Needs the owner to name the commit and config location (2026-11-24)
- chat-canvas-ui 3.1: needs `fuse.get_catalog`, which is not yet in the sealed catalog. Needs the rebuilt golden build live (2026-11-24)
- chat-canvas-ui 4.2: needs live StateSync and the generated door types from 2.1 (2026-11-24)
- chat-canvas-ui 5.2: the argument shape of `approve_pending_tool` and the deny path are not documented in this repo. Needs the sealed schema through FUSE, or the owner to name the deny method (2026-11-24)
- chat-canvas-ui 6.2: needs the sealed schemas of `chat_router` and `project` read through a live FUSE view (2026-11-24)
- chat-canvas-ui 7.1, 7.2, 7.3, 7.4: need the sealed `json_render` catalog, which is only readable from a live build (2026-11-24)
- chat-canvas-ui 8, 9: need the live golden build, and 9 needs owner approval (2026-11-24)
- receipt-anchoring 4, 5: method and receipt format not identified (already noted in tasks.md). Needs the 3tched method and format (2026-11-24)
- sealed-surface-gui 1 to 5: spec is blocked on the container, FUSE mount and an open design decision, and task 1 duplicates chat-canvas-ui task 1. Needs the owner to confirm the spec is superseded or settle the design (2026-11-24)
- service-contract 7, 8: need canonical JSON rules, the receipt format and a decision on identity-to-address mapping (open question 1). Needs the owner's decisions (2026-11-24)
- tenant-storage 1 to 5: the deliverable for the container mount is not specified (Incus versus LXD is unconfirmed), and tasks 2 to 5 need a live container, Cozo tenant data and a FUSE view. Needs the owner to confirm the container runtime and the target file (2026-11-24)

## Done
<!-- - <item or spec/task id>: <one line on what changed> (<date>) -->
