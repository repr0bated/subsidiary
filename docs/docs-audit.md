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

## Table 2: odbus-verified's docs (report only, nothing edited there)

Audited on 2026-11-26 against `/srv/git/odbus-verified` (read only), checked out at the working tree the host handoff describes (release `c5f7180e9d59-352`). Files: `AGENTS.md`, `README.md`, `docs/README.md`, `docs/book.toml`, `docs/src/`. Checked with the file system, `Cargo.toml`, `ls /run/mounts`, `mountpoint /run/mounts/3tchedFS` and `zcall list`. Line numbers are in the file named in the first column.

| File:line | Claim | What exists | Suggested fix |
|---|---|---|---|
| AGENTS.md:221 | "37 member crates under `crates/`, plus the root package (38 workspace packages total)" | `Cargo.toml` `members` lists 43 crates (`op-container`, `op-tunnel-mux`, `op-mcp-door`, `cozo-ublk`, `op-chat-responder`, `_3tched-fs` and others were added); with the root package that is 44 | Change to 43 member crates and 44 packages, or drop the number and point to `Cargo.toml` |
| AGENTS.md:231-232 | "`op-ml`, `op-gallery-gen`, and `op-uds-relay` have manifests under `crates/` but are outside workspace membership" | `crates/` has `op-uds-relay` only. There is no `op-ml` or `op-gallery-gen` directory. `Cargo.toml` `exclude` is `op-uds-relay` and `hackathon`; `op-ml` is only a commented-out member line | Name `op-uds-relay` and `hackathon` as the excluded paths. Say that `op-ml` is a commented-out member whose directory is absent. Drop `op-gallery-gen` |
| AGENTS.md:371 | "README.md is stale: crate count (31) is wrong, `cd lovable` is a deleted directory, `sudo service6` references are retired" | `README.md` now says 37 crates (not 31) and has no `lovable` or `service6` text. The remaining README errors are listed below (README.md:6, 19, 28, 60) | Replace the bullet with the current README defects, or delete it once the README is fixed |
| AGENTS.md:51, 57 | The second host view is `/run/mounts/threetchedFS` | `ls /run/mounts` shows `3tchedFS`, `by-container` and `threetched`. The project steering and the live mount use `/run/mounts/threetched` | Use `/run/mounts/threetched`, or explain that `threetchedFS` is the former name. The owner naming note (2026-10-18) should state which one is current |
| AGENTS.md:168, 212 | Operator procedures are in `docs/src/getting-started/local-release-activation.md` (line 212) and the book holds more than network notes | `docs/src/` holds only `operations/network.md`. `docs/src/getting-started/` does not exist, so the activation procedure and rollback contract are not in the tree | Restore the page, or point to where the procedure lives (`activate-golden.sh`, `op-release-launch`) and remove the dead path. Line 168 (`docs/src/operations/network.md`) is correct |
| AGENTS.md:339 | The sealed catalog is at `/dev/shm/opdbus/plugin-blobs/<plugin_id>.<schema_hash16>.blob` | Both `/dev/shm/opdbus/plugin-blobs` and `/var/lib/opdbus/plugin-blobs` exist. The 2026-11-23 handoff row says containers now use `/var/lib/opdbus/plugin-blobs` because systemd covers `/dev/shm` | VERIFY which path is canonical for the host and which for containers, then state both |
| AGENTS.md (MCP retirement paragraph; no line for crates) | MCP is retired; do not re-enable the bridge's `/mcp` endpoint or MCP bundles | `Cargo.toml` still has `op-mcp`, `op-mcp-aggregator` and `op-mcp-door` as members. The project steering lists `op-mcp-door` as the external MCP endpoint (not installed as a service) | Add one sentence naming `op-mcp-door` as the external-client door and `op-mcp` and `op-mcp-aggregator` as retained crates, so the retirement text and the workspace agree |
| AGENTS.md (preload list, line 8-37) | 28 skill files must be read at the start of a session | Every listed path exists under `.agents/skills/`, including the quality-auditor references | OK. The list is long for a docs-only task; consider a short list per task type |
| AGENTS.md:179-216 | `./activate-golden.sh`, `deploy/lib/golden/build-golden.sh`, `vendor/threetched/source.pin`, `build-threetched.sh`, `scripts/branch-policy.sh`, `scripts/check-workspace.sh`, `scripts/claude-cloud-setup.sh`, `.githooks` | All exist | OK |
| AGENTS.md (invariants) | `runtime.rs`, `runtime_checkpoint.rs`, `runtime_sled_ledger.rs`, `tracker_hub_tests.rs`, `interceptor.rs`, `schema_loader.rs`, `container_ui_door.rs`, `runtime_lungs*.rs`, `default_registry.rs`, `plugin_scaffold_helpers.rs`, `oscal_subid_registry.rs`, `threetched_contract.rs`, `threetched-surface.rs`, `op-blob/src/json_schema_proto.rs` | All exist at the stated paths | OK |
| AGENTS.md (storage invariant) | Original repo `branding/product-baseline.md` §12 describes the cache design | `branding/` does not exist in this tree; the text says "original repo", so it is not a broken link here | OK, but a reader cannot follow it. Add the repository and commit of the original |
| AGENTS.md (host policy) | `/usr/bin/threetched`, `/usr/local/bin/systemctl` shim, `/etc/runit/sv/threetched` | Not present in the kiroween container, which is expected: these are host paths | VERIFY on the host. Not checkable from the container |
| AGENTS.md (threetched view) | The sealed `threetched` plugin is how our code reaches the executable | `zcall list` on the `3tchedFS` view has 72 plugins and none named `threetched`; the `threetched` view (`ls /run/mounts/threetched`: `capabilities`, `operations`, `plugins`, `relationships`, `view.json`) holds it | OK, consistent with the two-view note. Say in the text that the plugin is on the `threetched` view, not on `3tchedFS` |
| README.md:6 | Link to `docs/src/getting-started/verified-workspace.md` | The file does not exist (`docs/src/` holds only `operations/network.md`) | Restore the guide or link to `scripts/check-workspace.sh` and the Cloud section of `AGENTS.md` |
| README.md:19 | "37 member crates under `crates/` plus the root package" | 43 members plus the root package | Update the count (see AGENTS.md:221) |
| README.md:24 | `op-web`: "Unified HTTP server + chat UI" | `AGENTS.md` says the UI is `/srv/git/3tched.com` and op-web only serves its static build; README.md:51 says the same | Change to "HTTP server; serves the static UI" |
| README.md:28 | Crate `op-cognitive-mcp` | No such crate. The workspace crate is `op-cognitive` (it has `SPEC.md`, `proto/`, `src/`) | Rename the row to `op-cognitive` |
| README.md:13 | Containers: "Incus" | The 2026-11-23 and 2026-11-24 handoffs provision `kiroween` through the sealed `lxd` plugin on LXD 5.0.2; the project steering says Incus runs current containers and LXD is being prepared | VERIFY with the owner, then name both or the current one |
| README.md:60 | "generated gRPC and MCP calls use the canonical plugin dispatch" | `AGENTS.md` retires MCP inside 3tched (2026-10-28). Calls enter `Runtime::call` through the door, FUSE and other paths | Replace "gRPC and MCP" with "door and FUSE" or add the external `op-mcp-door` caveat |
| README.md (crate table) | Table lists nine crates | It omits the crates added since: `op-container`, `op-tunnel-mux`, `op-mcp-door`, `_3tched-fs`, `cozo-ublk`, `op-chat-responder` | Add the rows or say the table is a selection |
| docs/README.md:3-5 | Historical handoffs, generated conversations and reviews "are intentionally excluded" | `docs/` holds `CONVERSATION-TRANSCRIPT-2026-09-28-3035bc0a.jsonl` (about 11 MB), `CONVERSATION-TRANSCRIPT-2026-08-09-control-plane-migration.jsonl`, `VPS-ZEROCLAW-HANDOFF-2026-08-09.md`, `fable-handoff-synthesis.md`, `reviews/`, `collected-code-reviews/` and `architecture/zen-review-*` | Move them under an `archive/` directory, or reword to "kept under the listed folders for history" |
| docs/README.md:32-36 | The installer is `install/3tched-artix-s6-install.sh`; host services are managed "exclusively through `sudo service6`" | `install/` does not exist. `AGENTS.md` retires s6 and `service6` and says to use `sudo sv` | Replace the section with the runit and `activate-golden.sh` contract, as in `AGENTS.md` |
| docs/README.md:37-40 | "OVS system datapath with host Xray"; "no host WireGuard"; "separate Zeroclaw bridge" | The 2026-11-23 handoff rows say the Xray proxy carrier was rejected as not the spec network and removed from kiroween; `wireguard`, `wg_opdbus` and `wgcf` plugins are sealed. Zeroclaw is now `threetched` | VERIFY against `docs/src/operations/network.md` (the current network authority), then rewrite or replace with a link to it |
| docs/reference/proto/README.md:29 | Documents `op-grpc-adapters` (`op.adapters.v1`: Mail, Netmaker, Mq services) | `AGENTS.md` says that crate and protocol are retired and absent; the crate is not in `crates/` | Mark the page historical or remove the row and `op-grpc-adapters/adapters.proto.md` |
| docs/book.toml:4, 9 | `src = "src"` and `create-missing = false` | `docs/src/` has no `SUMMARY.md` and one file, so `mdbook build` fails. All other pages (`docs/README.md`, `overview/`, `reference/`, ...) are outside `src` | Add `docs/src/SUMMARY.md`, or set `src = "."` with a `SUMMARY.md` in `docs/` as this repo's `docs/book.toml` does |
| docs/book.toml:15-16 | `git-repository-url` and `edit-url-template` use `Factory-AI/odbus` | The project's other documents name `github.com/repr0bated/...`. `git remote -v` is outside the worker's allowlist | VERIFY the remote, then update both URLs |
| docs/book.toml:11-12, 19-23 | Needs `mdbook-mermaid`, and `mdbook-linkcheck2` with `warning-policy = "error"` | Neither tool was checked. With the book's page set as it is, the link check would fail on README.md:6-style dead links | Document the two tools in the docs README, or relax linkcheck until the dead links are fixed |
| docs/check-links.sh | Uses `lychee --offline` over `docs/**/*.md` | Script is consistent with its header. `lychee` was not run (no allowlist entry) | VERIFY by running it; expect failures from the missing `getting-started` pages and `install/` |

## Not done in this pass

- Every VERIFY above needs a command outside the worker's allowlist (`git remote`, host paths, `lychee`, `mdbook`), a host check, or an owner decision.
- Table 1 row "docs/reports has no files in this checkout" is out of date: `docs/reports/` now holds the crew and worker reports. Table 1 was not re-run.
- The preload skills were read only in part (see the worker report). This audit did not need the Rust, Svelte, security or memory skills.
