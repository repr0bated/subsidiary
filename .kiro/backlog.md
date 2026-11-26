# Open work

The worker agent (`.kiro/agents/worker.json`) takes items from here when the machine has been idle for 15 minutes.
Open work is this list plus every unchecked `- [ ]` task in `.kiro/specs/*/tasks.md`. Spec tasks are not copied here; this list holds only work that has no spec task.

Format: `- [ ] <what to do> (added <date>, <who>)`. The worker checks an item off when done, or moves it to Blocked with the reason.

Open is in priority order (owner, 2026-11-26): **Foundation** (the contracts and the chain) first, then **Structure**, then **Cleanup and tests**. When everything here is blocked, the crew still runs the checks (tests, Rust lint) as fallback work, at least every three hours.

## Open
- [ ] Foundation: invariant tests for `EtchedAnchor` in `web3/test/EtchedAnchor.invariant.t.sol` (forge-std `StdInvariant` with a handler that anchors bounded random heads from several senders, including repeats and zero). Invariants: the zero head is never anchored; once anchored, a head's `anchorOf` timestamp and sender never change; `isAnchored(h)` holds exactly for the heads the handler anchored successfully (ghost set). Uses the `[invariant]` settings in `foundry.toml`. Done when `forge fmt`, `forge build` and `forge test` pass. (added 2026-11-26, Kiro)
- [ ] Foundation: invariant tests for `HireContract` in `web3/test/HireContract.invariant.t.sol` (handler with client and provider actors calling createHire, accept, cancel, deliver, confirm, fileClaim and resolveClaim with bounded ids and inputs, anchoring work and remedy heads through `EtchedAnchor` first). Invariants, tracked with ghost state: status only moves along the transitions the contract allows (Created to Accepted or Cancelled, Accepted to Delivered, Delivered to Completed) and never back; client, provider, termsHash and warrantyPeriod never change after creation; every Delivered or Completed hire has a nonzero workHead that is anchored; a Completed hire has both confirmations; each provider's `providerRecord` counts equal the ghost counts; claims exist only on Completed hires and a resolved claim's remedyHead is anchored. Done when `forge fmt`, `forge build` and `forge test` pass. (added 2026-11-26, Kiro)
- [ ] Foundation: gas snapshot for both contracts (`forge snapshot` into `web3/.gas-snapshot`, committed) and a `forge coverage --report summary` table appended to `web3/README.md` under a "Test evidence" heading with the date. Done when both run clean. (added 2026-11-26, Kiro)

## Blocked
- Owner item: kiroween container TLS UI listener (`OP_UI_LISTEN`) and provisioned browser port, then the live two-container check from docs/handoff/browser-door-dispatch/tasks.md task 9. Blocked: container provisioning and a live two-container check are owner actions outside the worker's scope. Unblock: owner configures the listener and port, then the check can run (2026-11-25)
- Owner item: kiroween image is from odbus-verified `75dd98b`, before the Keccak change, so its in-container `zcall` likely rejects every receipt. Blocked: needs an image rebuild from `bf3c4a8` or later (golden 335), an owner action when kiroween is next reprovisioned (2026-11-25)
- Control-plane MCP TLS check: the chatbot guest's bridge has a compiled versus sealed identity_sled schema mismatch (predates golden 335). Backend fix in odbus-verified (2026-11-25)
- Owner item: anchor a Keccak-256 head on anvil (`web3/script/anchor-head.sh --send`) and verify a receipt from event 976 or later with `web3/script/verify-receipt.sh` (added 2026-11-25, Kiro; demo requirement 7.1 needs a Keccak receipt). Blocked: it is an on-chain anchoring write of a real 3tched head, not a local anvil test, and `--send` needs `ANCHOR_KEY` from the environment (a secret). Unblock: the owner runs it with the key, using a client built from odbus-verified `bf3c4a8` or later (2026-11-24)
- Salesman persona: text drafted in docs/persona-salesman.md. It needs a backend home (ctl_plane_chatbot config or persona plugin) and the container responder to insert it as a system message. Owner/backend change (2026-11-25)
- chat-canvas-ui 11.2 and persona agents: `snowball.search_own_events` and `cognitive.agent_*` return `outcome_unknown` (operations 5e9fceac-… and eb9c4771-…); both need a model path, missing from the seed's networking. Owner investigating (2026-11-25)
- chat-canvas-ui 7.2 (backend-calling actions): the sealed json_render catalog declares only setState, pushState, removeState and validateForm. A rendered view can call a granted method only once the backend seals an action for it (for example one that takes plugin, method and arguments and is admitted by Runtime::call). Owner/backend change and reseal (2026-11-25)
- service-contract 8: decided (host method submits for the identity; see requirements open question 1). Waits for 3tched to add the sealed submit and address-read methods (2026-11-25)
<!-- - <item or spec/task id>: <reason>, what is needed to unblock (<date>) -->
- chat-canvas-ui 3.1: needs `fuse.get_catalog`, which is not yet in the sealed catalog. Needs the rebuilt golden build live (2026-11-24)
- chat-canvas-ui 4.2 live check: needs live StateSync; the wrapper itself is done and tested (2026-11-25)
- chat-canvas-ui 8, 9: golden 335 is live; now need, for kiroween, its TLS UI listener. 9 (deploy to CHAT_UI_DIR) is owner-approved (2026-11-25)
- tenant-storage 2 to 5: need a live tenant container, Cozo tenant data and a FUSE view (2026-11-25). Task 1: LXD disk device through the sealed `lxd` plugin (see design.md); adding it is an lxd mutation, so it needs the owner
- chat-canvas-ui 10.6: `json_render.save_candidate` is a zcall mutation (`--yes`) and needs the owner's approval. Unblock: owner approves registering Burst, SpeechBalloon and ReceiptCard (2026-11-24)
- demo-hire-and-receipt-check 3: needs the live door, the host-side identity for UI calls and the persona backend home (2026-11-24)
- demo-hire-and-receipt-check 4: needs the seed networking fix so persona agents reach a model (2026-11-24)
- demo-hire-and-receipt-check 6: same as chat-canvas-ui 11.2, `search_own_events` returns `outcome_unknown` (2026-11-24)
- demo-hire-and-receipt-check 7: recording the video needs a tagged known-good version and the live tasks 3, 4 and 6 first (2026-11-24)

## Done
- UI build: Node 22.23.5 through nvm (v0.41.0, cloned from github.com/nvm-sh/nvm into ~/.nvm), pinned in ui/.nvmrc and used by the crew and worker scripts; build writes build/index.html with the config script (2026-11-25)
- chat-canvas-ui 2.4: no browser identity; the host handles identity (owner) (2026-11-25)
- receipt-anchoring 6: deferred until 3tched exposes the full canonical event payload (2026-11-25)
<!-- - <item or spec/task id>: <one line on what changed> (<date>) -->
- tenant-storage, business-container-provisioning: parked (pre-existing backend; out of the hackathon showcase) (2026-11-25)
- chat-canvas-ui 2.1: door types generated from operation.proto at the commit in ui/door-proto.ref by ui/scripts/gen-door.sh (2026-11-25)
- service-contract 7: holder verifier web3/script/verify-hire.sh; canonical terms JSON decided (jq -S -c, keccak256, salt) (2026-11-25)
- sealed-surface-gui: superseded by chat-canvas-ui; its tasks are closed (2026-11-25)
