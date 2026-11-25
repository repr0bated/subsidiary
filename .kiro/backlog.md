# Open work

The worker agent (`.kiro/agents/worker.json`) takes items from here when the machine has been idle for 15 minutes.
Open work is this list plus every unchecked `- [ ]` task in `.kiro/specs/*/tasks.md`. Spec tasks are not copied here; this list holds only work that has no spec task.

Format: `- [ ] <what to do> (added <date>, <who>)`. The worker checks an item off when done, or moves it to Blocked with the reason.

## Open

## Blocked
- chat-canvas-ui 11.2 and persona agents: `snowball.search_own_events` and `cognitive.agent_*` return `outcome_unknown` (operations 5e9fceac-… and eb9c4771-…); both need a model path, missing from the seed's networking. Owner investigating (2026-11-25)
- chat-canvas-ui 7.2 (backend-calling actions): the sealed json_render catalog declares only setState, pushState, removeState and validateForm. A rendered view can call a granted method only once the backend seals an action for it (for example one that takes plugin, method and arguments and is admitted by Runtime::call). Owner/backend change and reseal (2026-11-25)
- chat-canvas-ui 2.4: browser identity source (SID1 or OIA1 from the decoy issuer). Needs the owner's identity bootstrap; the UI mints nothing (2026-11-25)
- service-contract 8: needs the identity-to-address decision (2026-11-25)
<!-- - <item or spec/task id>: <reason>, what is needed to unblock (<date>) -->
- chat-canvas-ui 3.1: needs `fuse.get_catalog`, which is not yet in the sealed catalog. Needs the rebuilt golden build live (2026-11-24)
- chat-canvas-ui 4.2 live check: needs live StateSync; the wrapper itself is done and tested (2026-11-25)
- chat-canvas-ui 8, 9: need the live golden build. 9 (deploy to CHAT_UI_DIR) was approved by the owner on 2026-11-25 but still waits for the build (2026-11-25)
- receipt-anchoring 5: holder recompute of an event hash needs the full canonical payload, which `query_events` does not return (link checks via prev_hash are possible) (2026-11-25)
- tenant-storage 2 to 5: need a live tenant container, Cozo tenant data and a FUSE view (2026-11-25). Task 1 is unblocked: Incus profile under container/incus/ (see design.md)

## Done
<!-- - <item or spec/task id>: <one line on what changed> (<date>) -->
- chat-canvas-ui 2.1: door types generated from operation.proto at the commit in ui/door-proto.ref by ui/scripts/gen-door.sh (2026-11-25)
- service-contract 7: holder verifier web3/script/verify-hire.sh; canonical terms JSON decided (jq -S -c, keccak256, salt) (2026-11-25)
- sealed-surface-gui: superseded by chat-canvas-ui; its tasks are closed (2026-11-25)
