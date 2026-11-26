# Kiroween 2026 submission draft: Subsidiary

Draft, 2026-11-25. Category: Frankenstein. Check every claim against the repository before submitting; mark anything not yet working as planned.

## Text description

**Verifiable trust for work done by an identity, without seeing inside it.**

Public chains are verifiable but hold no useful detail, and putting real records on them leaks private data. Private systems hold the detail but ask you to take their word for it. That gap has held back the use of web3 for real work.

Subsidiary closes it with two linked records. *Our record* is the identity's private, hash-linked receipt chain: every call it makes is admitted, executed and receipted, under sealed schemas that carry OSCAL compliance tags on every field. *The public record* is a chain that no single party controls. The identity anchors the head of its record there, and a hire contract points at that anchored head as the proof of delivery. Anyone holding a receipt checks it themselves against the public record. No trusted authority is needed, and nothing private goes on-chain: only hashes.

The demo puts this in front of you as a used car salesman. He's the one person nobody trusts, and here you don't have to. "I've got everything you need right here, no need to go searching!" He pitches, you shake on it (CHING!), the work leaves receipts (KA-CHUNK!), the head is anchored (POW!), and then you put him on the stand. You bring the hash from the public record and ask what else his record says about the deal. He can only answer from his own receipts, and you check one yourself (BAM!).

The Frankenstein part is what gets stitched together. Solidity contracts hold the public proof. The identity is a container that sees its granted world as files in its own FUSE mount. The interface is a chatbot that renders every view on the fly from sealed json-render components, in a 1960s comic pop-art style.

What is new in this period:
- the contracts (`EtchedAnchor`, `HireContract`), their tests and the holder-side verifier;
- the chat canvas UI;
- the Kiro setup that built them.

The identity system underneath is my earlier work, 3tched, listed in `PREEXISTING.md`.

## How Kiro was used

### Specs (spec-driven development)
Eight specs in `.kiro/specs`. The ones that drove this build are `service-contract`, `receipt-anchoring` and `chat-canvas-ui`, written requirements-first in EARS form, then turned into a design and tasks.
- **Requirements turned into tests directly.** Every revert and transition in the hire contract requirements is a Foundry test, and the UI design states six correctness properties that run as property-based tests.
- **Specs record decisions as they change.** For example, ungranted operations were first hidden and then, by the owner's decision, shown as "present but not runnable". The spec, the design property and the tests changed together.
- **Specs reference other repos instead of copying them.** The UI spec maps each of the 34 requirements in the older backend spec to where it lands now, and copies none of them.
- **Compared with vibe coding.** The specs made the non-mainstream rules explicit (no polling, no schema copies, no capability ever rendered), so each one could be checked rather than argued again.

### Steering
Eight steering files (corrected 2026-11-26, was seven). The strategy that made the biggest difference was *always-on rules against the patterns models default to*. This design is deliberately not mainstream, and models kept "fixing" it back toward API clients, login flows, polling, schema copies, extra databases, and Btrfs used as a backup. The steering covers this in two places:
- **`tech.md`** says so outright, and tells the model to ask before normalizing anything.
- **`current-vs-deprecated.md`** lists what in the backend is current, retired or unsure. That stops models from building on retired pieces such as MCP inside 3tched or EMQX, which are still present as remnants in the source.

Two more steering files are file-scoped: the Solidity guide loads only for `web3/**/*.sol` and the Svelte guide only for `ui/**/*.svelte`.

### Agent hooks
Twenty hooks, seventeen enabled (corrected 2026-11-26, was twenty-one and eighteen; the disabled ones are grant gate, session start and anchor on stop), across the event types:
- **File edited:**
  - *Hash-only guard:* contracts store and emit only hashes.
  - *Wording guard:* the write-up rules.
  - *Solidity save:* `forge fmt` and `forge build`.
  - *Spec sync:* design and tasks follow requirements.
  - *Schema guard.*
- **File created and deleted:** a new contract gets a test stub and a spec entry, and a deleted file gets an orphan check.
- **Before and after tool use:**
  - *Secret scan* blocks writes containing keys.
  - *Receipt on tool use* hash-chains every tool call during development, the same idea the project is about.
- **Before and after tasks:** *Preflight* checks that anvil is up and both FUSE views are mounted. Losing the FUSE path in a late refactor is what sank my last hackathon entry. *Contract tests* runs `forge test` after each task.
- **Prompt submit:** a digest of the crew's overnight reports.
- **Agent stop:** keep the backlog current.
- **On demand:** Ready for demo, Explain this contract, Crew now, Work now.

### Custom agents and the CLI
Four custom agents in `.kiro/agents`, run by the Kiro CLI when the machine is idle. "Idle" means no Kiro session or terminal has had a command in the last 15 minutes and no Cargo build is running.
- **Validator** (report-only) checks the repo against the specs and steering. That covers no deprecated pieces, no capabilities rendered, no caches or copies, and the FUSE views still mounted.
- **Tester** runs Foundry and the UI checks, and may fix lint and test errors.
- **Rust housekeeping** reports fmt, Clippy, test and audit results for the 3tched backend. It runs in a clean worktree through the golden-build chroot and never edits the backend.
- **Worker** takes one open item from the backlog or the specs per run, and records blockers.

Each agent has its own tool allowlist. In unattended runs, anything outside it is refused.

### Property-based testing
Fuzzing in Foundry, 512 runs per property (corrected 2026-11-26: there are also invariant tests for both contracts, 128 runs each, 9 invariants in total, 39 tests pass):
- only the provider can accept;
- only parties can confirm;
- delivery succeeds exactly when the work head is anchored;
- a warranty claim is accepted exactly inside its window;
- anchoring is first-write-wins and specific to its head.

fast-check properties in the UI, 20 to 300 runs each (corrected 2026-11-26, was "at least 100"; the approval property runs 20):
- each action is exactly one call, returned unchanged;
- the newest generation wins per state path;
- tombstones stay removed;
- withheld state never appears;
- "runnable" is exact and no rendered output contains a capability;
- re-hydration leaves nothing stale;
- inputs never write into feed data.

### MCP and powers
Not used yet. 3tched exposes its 669 cognitive tools to external clients through its own MCP door (`/mcp/loader`, five meta-tools). Connecting Kiro to it is planned, not done. Say so plainly, or leave it out.

## Video plan (under 3:00)
See `docs/PLAN.md`, "Video: under 3:00". One business, one deal. Problem, then the salesman, the deal, on the record, on the stand, and how it was built.

## Known limits to state honestly
- The persisted receipt chain in 3tched hashes events with Keccak-256 (since 2026-11-25). Events recorded before the switch keep their MD5 hashes, so receipts for those older events are not collision-resistant against whoever runs the host.
- The live UI needs the 3tched build that seals `fuse.get_catalog`, and the browser identity bootstrap.
- Rendered views cannot call backend methods yet: the sealed catalog declares only local state actions.

## Checklist
See `docs/PLAN.md`, "Submission checklist".
