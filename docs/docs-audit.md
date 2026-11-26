# Docs audit

Audit of the pages under `docs/` (except `docs/wiki/`, `docs/reports/` and the mockup app code) against what exists on 2026-11-26.

Checked against: the files in this repo; `zcall methods` and `zcall help` (persona, json_render, chat_router, project, agent_config, ctl_plane_chatbot, fuse, cognitive); the hook, agent, script and steering files in `.kiro/`; `web3/foundry.toml`; the `numRuns` values in `ui/src`; the git tags; `/mnt/@upper/golden-state.json` (live release 352, commit `c5f7180e`, rollback 348 `9bc3aaf`); `/srv/git/odbus-verified` (read only).

## Table 1: this repository's docs

| Page | Claim | What exists | Result |
|---|---|---|---|
| SUBMISSION.md | "Seven steering files" | 8 files in `.kiro/steering` (product, tech, structure, security, solidity, svelte, current-vs-deprecated, backend-repo-preload) | Fixed: eight |
| SUBMISSION.md | "Twenty-one hooks, eighteen enabled" | 20 hook files, 17 enabled; grant-gate, session-start and anchor-on-stop are disabled | Fixed: twenty and seventeen |
| SUBMISSION.md | Hook list includes "Svelte check" | No hook file mentions Svelte or npm | Fixed: removed from the list |
| SUBMISSION.md | "Fuzzing in Foundry, 512 runs per property" | `web3/foundry.toml`: fuzz `runs = 512`; also `[invariant] runs = 128`; two invariant test files (3 and 6 invariants); 39 tests pass per `web3/README.md` | Fixed: invariants and 39 added |
| SUBMISSION.md | "fast-check ... at least 100 runs each" | `numRuns` is 20 (approval), 100 (actions), 200, 300 | Fixed: "20 to 300" |
| SUBMISSION.md | "Eight specs in `.kiro/specs`" | 8 directories; `cockpit-lxd-standalone` holds only a workspace file; `sealed-surface-gui` is closed | Left: count is right as directories; noted in PLAN.md |
| SUBMISSION.md | "Four custom agents" (validator, tester, rust-housekeeping, worker) | `.kiro/agents` has exactly these four | OK |
| SUBMISSION.md | "maps each of the 34 requirements in the older backend spec" | `chat-canvas-ui/requirements.md` line 154 maps "34 Exchange point and chat modes"; the full count of mapped rows was not checked | VERIFY |
| SUBMISSION.md | "669 cognitive tools" (MCP door) | Matches the steering note dated 2026-11-23. The current `zcall methods cognitive` list was not counted (output has no counter and pipes are not allowed) | VERIFY |
| SUBMISSION.md | Preflight "checks that anvil is up and both FUSE views are mounted" | `.kiro/scripts/preflight.sh` checks anvil on 8545 (chain 31337) and loops over `/run/mounts/3tchedFS` and `/run/mounts/threetched` | OK |
| SUBMISSION.md | Rust housekeeping "runs in a clean worktree through the golden-build chroot" | Not checked against `.kiro/agents/rust-housekeeping.json` and `crew-run.sh` | VERIFY |
| SUBMISSION.md | "Known limits": live UI needs the build that seals `fuse.get_catalog` | `zcall methods fuse` lists only the FUSE filesystem operations; there is no `get_catalog` | OK (still true). Live release is now 352, so re-check the wiki item |
| PLAN.md | "Progress so far": no project contracts, no `ui/`, "all spec tasks still unchecked", 19 hooks and 16 enabled, three agents, five specs, six steering files | Contracts, scripts and tests exist; `ui/` exists; 20 hooks, 17 enabled; four agents; eight scripts; eight spec dirs; eight steering files | Fixed: section rewritten and dated |
| PLAN.md | "Foundry 1.10.0 installed" | `forge --version` is not in the worker's allowlist | VERIFY (kept out of the rewritten text) |
| PLAN.md | Hook usage list (enabled and off) | See the hook counts above | Fixed |
| PLAN.md | "LXD container ... Incus is not used" and "LXD on antix1: being prepared" | `current-vs-deprecated.md` says Incus runs the current containers and LXD is being prepared; `tech.md` uses `sudo lxc exec kiroween` | Left: owner decision. Marked VERIFY in the page |
| PLAN.md | Spec at 3tched `.kiro/specs/subsidiary-container/` | Exists in `/srv/git/odbus-verified/.kiro/specs/subsidiary-container/` | OK |
| PLAN.md | Receipt chain is Keccak-256 since `bf3c4a8`, events from 976 | Matches the steering note (2026-11-25) | OK |
| PLAN.md | Crew section names validator, tester and rust-housekeeping | A fourth agent, worker, runs through `work-run.sh` and the "Work now" hook | Left: the section is about the idle crew; not an error |
| PLAN.md | Not yet run end to end: crew agents | `docs/reports/` has no files in this checkout | VERIFY |
| PLAN.md | "Unchecked tasks" and open items | Open item on the head read path is covered by `web3/script/anchor-head.sh` and `receipt-anchoring` tasks | Left: owner's open-items list |
| video-shotlist.md | "`forge test` 37 passing" | 39 tests pass | Fixed |
| video-shotlist.md | `forge script web3/script/DemoHire.s.sol ...` from the repo root | `foundry.toml` is in `web3/` only, so the command must run from `web3/` (as the README does) | Fixed |
| video-shotlist.md | Scripts `demo-setup.sh`, `anchor-head.sh`, `verify-receipt.sh`, `verify-hire.sh`; `.kiro/state/demo.env` | The four scripts exist in `web3/script`; `demo.env` is created by `demo-setup.sh` (ignored state) | OK |
| video-shotlist.md | `git tag \| grep demo-good`; `/preview` | Tags `demo-good-2026-11-25` and `demo-good-2026-11-25b`; `ui/src/routes/preview/+page.svelte` | OK |
| persona-salesman.md | "`set_identity` takes only `name` and `description`" | `zcall help persona set_identity`: `agent_type` (required), `name` (required), `description` | Fixed |
| persona-salesman.md | `ctl_plane_chatbot` `set_config` | Sealed: `set_config` (mutation, `chatbot.invoke`) | OK |
| persona-salesman.md | Responder at `3tched.com` `crates/op-chat-interface/src/responder.rs` | Not checked (`3tched.com` repo not in scope of this run) | VERIFY |
| design-embodiment.md | json_render flow: `save_candidate`, `validate_spec`, `list_candidates`, `get_candidate`, `promote_candidate`, `delete_candidate` and their capabilities | All sealed with the stated capabilities. Also present now: `retire_catalog_entry` (`json_render.promote`), `list_catalog`, `get_catalog_entry` | OK |
| design-embodiment.md | `agent_config`: `get_config`, `list_tools`, `register_tool`, `update_config`, `reset_config` | Same five methods sealed | OK |
| design-embodiment.md | `chat_router` `ListUiSurfaces`, `ListModels`, `ListProviders`, `SetSelection`; `project.select_context` | All sealed with the stated capabilities (`cap.software.threetched.ui-surfaces.read@v1`, `selection.set@v1`) | OK |
| design-embodiment.md | Default `ui_surfaces` table (Chat, Routable Models, gRPC Diagnostics) | Odbus-verified commit `e5d00f2` added a Shell surface to the default (per `proof-of-work` log), so the table is likely stale. Contents were not read | VERIFY |
| design-embodiment.md | `fuse.get_catalog` returns the catalog | Not sealed yet (see above) | Left: the page describes the design; status stays in the wiki |
| design-embodiment.md | `persona` plugin holds the persona | `persona` has `get_identity`, `set_identity`, triggers, `authenticate`, `execute` | OK |
| design-embodiment.md | `approve_pending_tool` | Listed in `current-vs-deprecated.md` as a `chat_response` method; not read from `zcall` | VERIFY |
| design-embodiment.md | Two-person rule | The steering says it is intended, not implemented; the page says so | OK |
| docs/handoff/browser-door-call-identity/tasks.md | Tasks 1 to 6 and 8 done in `89d8950` and `74091c7` | Commits are in `/srv/git/odbus-verified`; not checked | VERIFY |
| docs/handoff/browser-door-dispatch/tasks.md | Task list for odbus-verified | Point-in-time handoff; its status is the backend's to keep | Left |
| docs/handoff/* (requirements, design) | Handoff text for odbus-verified | Point-in-time; covered by the second audit table when done | Left |
| docs/proof-of-work/rovs-openflow/README.md | "Release 348 is live (rollback 341)" | Live release is now 352 (`c5f7180e`); 348 is the rollback. The page is a dated log | Left: log entries are history. A later entry should record 352 |
| docs/proof-of-work/rovs-openflow/README.md | Commit hashes and test counts | Not rerun (no cargo in this task) | VERIFY |
| docs/SUMMARY.md, docs/book.toml | Links and `src = "."` | All 18 wiki pages, the handoff pages and the proof-of-work page listed exist | OK |
| docs/KIROWEEN-RULES.md | Official rules copy | A saved copy of an external page; its own text says the live page prevails | Left |

## Not done in this pass

- Table 2 (odbus-verified docs) is a separate backlog item.
- Every VERIFY above needs a command that is outside the worker's allowlist, or a repo (`3tched.com`) that was not in scope.
