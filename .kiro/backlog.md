# Open work

The worker agent (`.kiro/agents/worker.json`) takes items from here when the machine has been idle for 15 minutes.
Open work is this list plus every unchecked `- [ ]` task in `.kiro/specs/*/tasks.md`. Spec tasks are not copied here; this list holds only work that has no spec task.

Format: `- [ ] <what to do> (added <date>, <who>)`. The worker checks an item off when done, or moves it to Blocked with the reason.

Open is in priority order (owner, 2026-11-26): **Foundation** (the contracts and the chain) first, then **Structure**, then **Cleanup and tests**. When everything here is blocked, the crew still runs the checks (tests, Rust lint) as fallback work, at least every three hours.

## Open

## Blocked
- Foundation: show a hire's on-chain state in the canvas with `ui/src/lib/web3/client.ts` (added 2026-11-28, kiroween). Blocked: the card would make the browser call a chain RPC endpoint directly. Steering (tech.md) says the UI has no direct HTTP access and the backend channel is FUSE call files only; chat-canvas-ui design §2 makes the door the browser's only path. Unblock: owner decides the route (a sealed chain-read method through the door, or an approved browser-side RPC origin) (2026-11-28)
- Owner item: kiroween container TLS UI listener (`OP_UI_LISTEN`) and provisioned browser port, then the live two-container check from docs/handoff/browser-door-dispatch/tasks.md task 9. Blocked: container provisioning and a live two-container check are owner actions outside the worker's scope. Unblock: owner configures the listener and port, then the check can run (2026-11-25)
- Owner item: kiroween image is from odbus-verified `75dd98b`, before the Keccak change, so its in-container `zcall` likely rejects every receipt. Blocked: needs an image rebuild from `bf3c4a8` or later (golden 335), an owner action when kiroween is next reprovisioned (2026-11-25)
- Control-plane MCP TLS check: the chatbot guest's bridge has a compiled versus sealed identity_sled schema mismatch (predates golden 335). Backend fix in odbus-verified (2026-11-25)
- Owner item: anchor a Keccak-256 head on anvil (`web3/script/anchor-head.sh --send`) and verify a receipt from event 976 or later with `web3/script/verify-receipt.sh` (added 2026-11-25, Kiro; demo requirement 7.1 needs a Keccak receipt). Blocked: it is an on-chain anchoring write of a real 3tched head, not a local anvil test, and `--send` needs `ANCHOR_KEY` from the environment (a secret). Unblock: the owner runs it with the key, using a client built from odbus-verified `bf3c4a8` or later (2026-11-24)
- Salesman persona: text drafted in docs/persona-salesman.md. It needs a backend home (ctl_plane_chatbot config or persona plugin) and the container responder to insert it as a system message. Owner/backend change (2026-11-25)
- chat-canvas-ui 11.2 and persona agents: `snowball.search_own_events` and `cognitive.agent_*` return `outcome_unknown` (operations 5e9fceac-… and eb9c4771-…); both need a model path, missing from the seed's networking. Owner investigating (2026-11-25)
- chat-canvas-ui 7.2 (backend-calling actions): the sealed json_render catalog declares only setState, pushState, removeState and validateForm. A rendered view can call a granted method only once the backend seals an action for it (for example one that takes plugin, method and arguments and is admitted by Runtime::call). Owner/backend change and reseal (2026-11-25)
- service-contract 8: decided (host method submits for the identity; see requirements open question 1). Waits for 3tched to add the sealed submit and address-read methods (2026-11-25)
- ui-networking-authoritative-2026-11-27 tasks 4, 5 and 6 (reopened 2026-11-27: raw `:8080` ingress, `ReceiveBrowser(h)` fd push, local raw splice): all change Rust in `/srv/git/odbus-verified` (op-grpc-bridge, op-tunnel-mux), which the worker may not edit. Unblock: owner or a backend session implements them there, then ticks them (2026-11-28)
- ui-networking-authoritative-2026-11-27 tasks 8 and 9: tasks 1 to 7 are implemented; backend release `5ab10056684f-359` is live. The bridge owns shared `10.0.0.2:8080` and fails closed without a waiter; op-web is forced to internal `127.0.0.1:8081` and its health endpoint returns 200. Post-deploy focused tests pass (browser routes 4/4, runtime lungs 2/2, tunnel mux 7/7); full op-network lib coverage still has three unrelated existing OpenFlow/rovs failures. No identity container runs the new lungs browser waiter yet. Per owner, the two-identity proof uses the control-plane chatbot and its human identity and happens after development. Unblock: install/activate the current `op-tunnel-door` and `OP_UI_LISTEN=127.0.0.1:8443` for the development identity, then run Task 8 proof; remove legacy delivery only after that proof (2026-11-28).
<!-- - <item or spec/task id>: <reason>, what is needed to unblock (<date>) -->
- Terms-hash check in the UI: the read-only chain client checks status, anchor and work head but not the terms hash, because the UI has no Keccak-256 and adding a hash package is a new dependency. Unblock: owner approves a hash dependency (for example `@noble/hashes`) or keeps the terms check in `web3/script/verify-hire.sh` only (2026-11-28)
- chat-canvas-ui 3.1: needs `fuse.get_catalog`, which is not yet in the sealed catalog. Needs the rebuilt golden build live (2026-11-24). Re-checked 2026-11-27 at release 359 5ab1005: `/run/mounts/3tchedFS` is mounted, but `zcall methods fuse` lists only fs/ll operations and `zcall help fuse get_catalog` says no such method, so still blocked
- chat-canvas-ui 4.2 live check: needs live StateSync; the wrapper itself is done and tested (2026-11-25)
- chat-canvas-ui 8, 9: golden 335 is live; now need, for kiroween, its TLS UI listener. 9 (deploy to CHAT_UI_DIR) is owner-approved (2026-11-25)
- tenant-storage 2 to 5: need a live tenant container, Cozo tenant data and a FUSE view (2026-11-25). Task 1: LXD disk device through the sealed `lxd` plugin (see design.md); adding it is an lxd mutation, so it needs the owner
- chat-canvas-ui 10.6: `json_render.save_candidate` is a zcall mutation (`--yes`) and needs the owner's approval. Unblock: owner approves registering Burst, SpeechBalloon and ReceiptCard (2026-11-24)
- demo-hire-and-receipt-check 3: needs the live door, the host-side identity for UI calls and the persona backend home (2026-11-24)
- demo-hire-and-receipt-check 4: needs the seed networking fix so persona agents reach a model (2026-11-24)
- demo-hire-and-receipt-check 6: same as chat-canvas-ui 11.2, `search_own_events` returns `outcome_unknown` (2026-11-24)
- demo-hire-and-receipt-check 7: recording the video needs a tagged known-good version and the live tasks 3, 4 and 6 first (2026-11-24)

## Done
- Cleanup and tests: `web3/script/demo-setup.sh` takes its node from `RPC_URL` (anvil started on that port, 127.0.0.1 only), `DEMO_SKIP_PREFLIGHT=1` skips the FUSE preflight for plain tests (default unchanged), `DEMO_STATE_DIR` keeps test addresses out of `.kiro/state`; `e2e-local.sh` now deploys through it, 11/11 pass (2026-11-28, kiroween)
- Cleanup and tests: `ui/src/lib/web3/client.ts` checked against a real local anvil: opt-in `client.anvil.test.ts` (skipped unless `WEB3_RPC_URL` is set) run by `web3/script/e2e-local.sh` after hire 1; real ABI decoding of `getHire`, `hireCount`, `anchor`, `anchorOf`, `checkReceipt` matches, no decoder bug found (2026-11-28, kiroween)
- Cleanup: re-checked the nine remaining wiki pages against the live view (2026-11-26): `ui-surfaces.md` gained the new Shell surface (`/`, `json_render.canvas`); resolved VERIFY marks for the `Chat` custom transport and receipts; found `application_session_id` in no sealed schema and `.kiro/scripts/receipt.sh` still present (owner decision); `value.json` still EIO; unconfirmed VERIFY marks left in place
- Cleanup: wiki re-check of `exchange-point-and-schema-feed.md` and `json-render.md` against the live view (generation 75, 74 plugins; no exchange operation in FUSE; `value.json` absent for `project`; json_render catalog read through FUSE); the other nine pages stay in Open (2026-11-26)
- Cleanup: wiki update for the four pages the item named (2026-11-26): `fuse.get_catalog` still not sealed (golden 352, catalog gen 75), `chat_response` path unchanged, 147 threetched methods confirmed, `SetSelection` resolved as current, Keccak-256 note added to `two-chains.md`; README updated. The other pages are a new Open item
- Cleanup: odbus-verified docs audit, table 2 in docs/docs-audit.md (28 rows with file:line and fixes: crate count 37 vs 43, missing getting-started pages, op-cognitive-mcp, s6 install text, book.toml with no SUMMARY.md); nothing edited in odbus-verified (2026-11-26)
- Cleanup: docs audit table 1 in docs/docs-audit.md; fixed stale counts, hook list, persona method args and a video command, VERIFY marks left for what the allowlist could not check (2026-11-26)
- Structure: mdBook for the docs: docs/book.toml and docs/SUMMARY.md link the existing pages in place; `mdbook build docs` succeeds (2026-11-26)
- Foundation: gas snapshot in web3/.gas-snapshot and coverage table under "Test evidence" in web3/README.md (39 tests pass; contracts 100% lines) (2026-11-26)
- Foundation: `HireContract` invariant tests in web3/test/HireContract.invariant.t.sol (6 invariants, handler with 4 actors and ghost state; fmt, build, test pass) (2026-11-26)
- Foundation: `EtchedAnchor` invariant tests in web3/test/EtchedAnchor.invariant.t.sol (3 invariants, handler with ghost set; fmt, build, test pass) (2026-11-26)
- UI build: Node 22.23.5 through nvm (v0.41.0, cloned from github.com/nvm-sh/nvm into ~/.nvm), pinned in ui/.nvmrc and used by the crew and worker scripts; build writes build/index.html with the config script (2026-11-25)
- chat-canvas-ui 2.4: no browser identity; the host handles identity (owner) (2026-11-25)
- receipt-anchoring 6: deferred until 3tched exposes the full canonical event payload (2026-11-25)
<!-- - <item or spec/task id>: <one line on what changed> (<date>) -->
- tenant-storage, business-container-provisioning: parked (pre-existing backend; out of the hackathon showcase) (2026-11-25)
- chat-canvas-ui 2.1: door types generated from operation.proto at the commit in ui/door-proto.ref by ui/scripts/gen-door.sh (2026-11-25)
- service-contract 7: holder verifier web3/script/verify-hire.sh; canonical terms JSON decided (jq -S -c, keccak256, salt) (2026-11-25)
- sealed-surface-gui: superseded by chat-canvas-ui; its tasks are closed (2026-11-25)
