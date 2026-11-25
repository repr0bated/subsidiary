# 3tched Subsidiary: Kiroween 2026 plan

Entrant: Jeremy Hobson (personal project, GitHub repr0bated). Category: Frankenstein. Deadline: Thu Dec 4, 2026, 2:00 PM PT.
Repo: https://github.com/repr0bated/subsidiary (Apache-2.0).

## Direction update (Nov 23, 2026)
The main new build was briefly provisioning business containers; on 2026-11-23 the showcase moved back to the CMS (see Core idea). Hiring a business through the service contract triggers a container for that business, built from an industry-specific container configuration, with its own Cozo database and grants, and a receipt. The CMS and sealed-surface UI are no longer the centerpiece; whether they stay as a small view onto a provisioned tenant is undecided. Candidate fictional businesses with generated container configs: cold-chain food logistics and public library circulation (ChatGPT-generated on Nov 21, 2026, stored in Google Drive, not yet in this repo). Spec: `.kiro/specs/business-container-provisioning/`. Sections below that describe the CMS demo flow predate this change.

## Lesson from the Meta hackathon (owner)
The identity showcase was lost there on the last day: a model-led refactor of the bridge left out the FUSE filesystem, so the identity's only path to the backend disappeared. The result was no project to submit on time. So here, a submittable project comes first and polish second:
- Save a Devpost draft early and keep it current; drafts can be edited until the deadline.
- Keep a known-good tag (`demo-good-<date>`) of the last version that ran end to end, and record the demo video from a tagged version.
- Risk, owner decision needed (found 2026-11-25): live receipts carry a 32-hex `event_hash`, which is MD5 (`op-state-store/src/event_chain.rs` `compute_hash` → `md5::compute`, used by `core_persistence.rs`). MD5 collisions, including chosen-prefix ones, are practical, so an anchored MD5 chain head does not prove the record is unchanged against whoever runs the host. The bridge core's own journal (`op-grpc-bridge/src/core.rs` `hash_event`) already uses blake3; moving the persisted chain to blake3 (or SHA-256) before the demo would make "check it against the public record" hold. Until then the write-up must not claim tamper-proof receipts.
- Critical path: containers have no NIC by design (their only path is FUSE and the host binds). Something networking-related did not make it into the seed, so persona agents cannot reach a model through the host (owner investigating, 2026-11-23; seen as `outcome_unknown` on `cognitive.agent_dbus_expert_explain`, operation `eb9c4771-ed6c-4be5-ac54-09f3f1f450c8`).
- Critical path: plugin state must work (owner fixing it with another agent) before the UI shows real data. Without state the demo has no accurate data.
- Milestones: Nov 30, the demo runs end to end and a rough video exists. Dec 1 12:00 PM PT, Kiro credits requested. Dec 2, feature freeze; only fixes after. Dec 3, final video and write-up. Dec 4 2:00 PM PT, deadline; submit by the morning, not the last hour.

Guard against that here: never refactor the bridge or the FUSE layer for this project, and check the FUSE path before every task and every crew run.

## Origin: lightbulb moments (for the write-up and blog; no dates or timeframes)
It started as a privacy network. It was never planned as this; it grew through a series of lightbulb moments, several of them from an offhand question to a model.
1. While building a D-Bus MCP server the owner had asked for, Opus pointed out that it could fully control the Linux system through it. The system could be driven through its own bus.
2. Schema as code. The schema stopped being documentation about the system and became the system: the plugin is the schema, sealed into a blob, and methods, call files, UI and checks all derive from it.
3. OSCAL. Compliance went into the schema itself: every field and method carries an OSCAL subid and canonical mapping, so the system is compliance-tagged by construction instead of audited afterwards.
4. Blobs, the real game changer. Everything was consolidated into the sealed blob, the one true source of truth, literally: a plugin exists only if its blob is in the catalog, and the schema, the methods and their compliance tags all live in that one sealed file.
5. 3tchedFS (FUSE). Mentioned in passing to a model: what if we made a FUSE filesystem out of the schema and the blobs? Next thing, it existed. It then sat unused for a long while.
6. Identity as the container. Much later, while actually building the containers, came the idea that the identity is the container, and that it works from the inside, in the first person: it sees what it is granted as files in its own mount and acts by writing a call file and reading the receipt. No searching, polling or authenticating; everything local and present. This is what finally put the FUSE filesystem to its real use.

Each big idea removed code instead of adding it. The fat squeezed out on its own: thousands of lines disappeared when the blobs became the one source of truth, again when the sockets were consolidated into the shared lungs, and again with the FUSE filesystem. Huge sections simply went away because they no longer had a reason to exist. One model reviewing the code (Fable) remarked that it had never seen a codebase gain so much while losing so many lines.

Held strictly the whole way: one single source of truth (the sealed blob; no copies, no parallel schemas, no second store of the same fact), and the identity is the system (the identity, the system and the container are one thing). Every later idea had to fit these two rules or it was dropped.

Everything is generated from the plugin: the GUI, the hash chain records, the policy and the enforcement all come from one plugin's sealed schema. Getting models to keep one source of truth was one of the hardest things to enforce: no caches, no copies, no extra databases. They kept adding a SQL database, a cache, a copy of this or that, and each had to be found and deleted. They did not like it.

Keeping models to these rules was a constant fight. None of it follows the mainstream patterns models learn from, so they kept trying to "fix" it back toward the usual way: API clients, login flows, polling, a copy of the schema, a separate database layer. That is a big part of the Kiro story here: steering files hold the non-mainstream rules on every request, a current-vs-deprecated list stops models reviving retired pieces, and the validator agent checks for drift on its idle runs.

Off-label uses of technology (confirmed by the owner; add more as they come up):
- Btrfs as transport and cache, not backup: send/receive moves releases and golden snapshots, transports vectors into Qdrant, and cache subvolumes are the caching layer.
- Xray as an SNI server.
- D-Bus as the object model of the whole system: every object on the system is a D-Bus object, not only the plugins (`/org/opdbus/v1/plugins/<name>`). Everything derived from a plugin is a child "document" D-Bus object under it. At scale, each person is a D-Bus object too; everything is. D-Bus is normally just desktop or service messaging.
- No backups. State lives in shared memory (SHM). Each object's plugin schema defines it, including its dependencies, size, software, gRPC shape and other attributes, so the whole system can be described as one full JSON document. The ledger, with its gRPC payloads, is vectorized, and the vectors carry all the data, with Cozo holding the edges that link them (vectors to chain events, actors and objects); vectors and edges are the only thing kept. To rebuild, the D-Bus PackageKit plugin installs everything the description defines. Btrfs send/receive carries data where it needs to go; it is not a backup.
- gRPC as one generic door: a single `PluginService/CallMethod` for every method, with shapes derived from the sealed schema, instead of a hand-written service per feature. New capabilities are plugins, never new proto packages.

Thread through all of it: a long fascination with biological systems. It shows in the embodiment (the identity as a body: brain, eyes, lungs, heart, spinal cord, skeleton).

## What it is
A schema-generated, compliant CMS offered as a contract-backed service. A live 3tched schema renders a CMS in a sealed Svelte surface. A contract records the hire terms. Each sealed run produces a receipt; receipt hashes from 3tched's private hashchain are anchored on-chain, and the receipt holder compares their local hash to the chain. Only hashes go on-chain.

Admission: admit(a) iff identity(a) AND grants(a) AND sealed(a).

## Demo flow
1. Pick a fictional business from a fixed, pre-generated list (each has a compliant schema).
2. Hire the service through the contract.
3. The CMS renders live from the schema.
4. Each sealed action yields a receipt; the head is anchored on anvil (31337).
5. The visitor checks their receipt against the anchored hash.

Extensions to mention: website-creator agent, Rust debugger agent, business specialist agent, contract-hired agents in general.

## Scope limits
- Fixed list of schemas; no dynamic routing or system introspection.
- Live schema only, no copies.
- No network for the container; FUSE call files plus local chain. OVN edge port is post-deadline.

## Architecture
Pre-existing (see `PREEXISTING.md`): the backend, the FUSE call-file channel, per-tenant Cozo storage, and the container. They are used as they are, not rebuilt for the hackathon. New: `ui/`, `web3/`, the demo wiring and `.kiro/`.

- LXD container on antix1 (Ubuntu 26.04; Incus is not used), unprivileged, no nesting, resource limits, read-only base plus overlay, snapshot, runit with log services. Spec lives in 3tched `.kiro/specs/subsidiary-container/`.
- Only backend channel: FUSE call files.
- Storage: ext4 host volumes with one Cozo (RocksDB) DB per tenant, bind-mounted; host ownership must match shifted container UIDs.
- Chain: Foundry (forge, anvil, cast, forge script). Base Sepolia (84532) optional later.

## Contracts
- `EtchedAnchor`: anchors hashchain heads.
- Service/hire contract: written by Jeremy in Kiro.

## Timeline
- Week 1: connect to the existing container on antix1 and its tenant Cozo mounts; anvil + EtchedAnchor.
- Week 2: Svelte GUI from generated schemas; hire contract; receipt check flow.
- Final days: demo polish, video, write-up, PREEXISTING.md review.

## Open items
- LXD on antix1: being prepared (its daemon was not running when last checked).
- Method names for "spawn subsidiary" and "issue grant".
- Head read path (sealed method or bridge feed), head hash width, canonical JSON, anchoring frequency.
- Pick the GPT-generated fictional businesses and schemas.

## Write-up rules
Say Foundry, not Ganache. Verification is by the receipt holder. No company, startup or YC language.

---

# Hackathon rules and submission

Source: the official rules, saved in full in `docs/KIROWEEN-RULES.md` (updated Nov 16, 2026). This section is the working summary.

## Dates (Pacific Time)
- Submission Period: Oct 30, 2026 9:00 am to Dec 4, 2026 2:00 pm. No extensions.
- Kiro credit request: by Dec 1, 12:00 pm. Credit codes must be redeemed by Dec 4. 4,000 credits per person.
- Judging: Dec 16, 2026 to Jan 29, 2027. Winners around Feb 3, 2027.

## Rules that shape this project
- New projects only. Code built before the Submission Period is allowed only if disclosed, and the submitted work must have been built during the period. `PREEXISTING.md` is that disclosure. Keep it accurate and keep the boundary clear in the repo.
- Must be a working app built with Kiro (IDE, CLI, Web, and/or Crew). Insufficient use of Kiro is grounds for disqualification.
- Category: Frankenstein.
- Judges must be able to test it. A URL to a functional application or test build is required, free of access until judging ends. The plan says the container has no network and runs on antix1, so a judge-accessible demo or test build with instructions still has to be decided (see open items).
- Video: under three minutes, public on YouTube, shows the project running, no copyrighted music or third-party trademarks.
- Repository: public on GitHub (not GitLab or Bitbucket), with an open-source license visible in the About section. `/.kiro` at the root and never in `.gitignore`. Only `.kiro/hashchain.log` and `.kiro/state/` are ignored, which are local run files; remove those two entries if you want zero risk.
- Everything in English.
- Judging: pass/fail viability, then five equal criteria at 20% each: Potential Impact, Technological Implementation (depth and variety of Kiro use, strategy, experimentation), Design, Innovation, Presentation.

## Bonus prizes worth considering
- Best Kiro Crew App ($1,000): needs a separate public GitHub repo for a Kiro Crew app, newly created in the period, with a write-up. The cron-run agents here use `kiro-cli chat` agents and are not a Kiro Crew app, so this needs its own decision.
- Bonus Blog Prize (2,000 credits, top 100): public blog post on a third-party platform during the period, mentioning Kiroween 2026.
- Social Blitz (3-month Pro+, 5 awards): post starting with `#KiroweenHackathon26`, with a link in the submission form.
- Best Demo ($1,000): highest Presentation score within the top 10% overall.
- Best Ghost of Kiroween Past: only if you registered for Kiroween 2025.
- Startup and Student prizes: not pursued. Subsidiary is a personal project and carries no startup framing.

## Submission checklist
- [ ] Repository public on GitHub at repr0bated/subsidiary, license visible in About
- [ ] `.kiro/` at the root and not ignored
- [ ] Category set to Frankenstein; bonus categories chosen
- [ ] Kiro credits requested by Dec 1, 12:00 pm PT
- [ ] Judge-accessible demo or test build, with instructions, free of access until Jan 29, 2027
- [ ] Video public on YouTube, under three minutes
- [ ] Description (below), Kiro usage write-up (below), install and run instructions
- [ ] `PREEXISTING.md` reviewed
- [ ] Write-up rules checked: Foundry not Ganache, verification by the receipt holder, no company, startup or YC language

## What the submission presents (owner, 2026-11-23)
Only the new element: the Web3 contracts, and the transparency and accountability they give. 3tched is the pre-existing foundation and is not presented as the entry; it appears only as context. The hire contract, the receipt-anchoring contract, the on-chain anchor of the identity's receipt chain, and the holder's own verification are the things to show off. The CMS rental is the scenario that makes them visible, not the thing being judged. Broader 3tched benefits (savings on backup, storage, licensing) stay out of the submission.

The problem (for Potential Impact): verifiable trust. It is a real-world problem that has held back web3 adoption. Public chains are verifiable but carry no useful detail, and putting real records on them exposes private data. Private systems hold the detail but ask you to take their word for it. So businesses either keep records off-chain, where no one can check them, or put too much on-chain. This project shows a third way: the detail stays private and searchable in the identity's own record, and the public chain carries only the proof that the record has not changed. Whoever holds a receipt can check it themselves, without trusting the business and without seeing inside it. The public chain removes the need for an outside trusted authority (no notary, auditor or platform has to vouch), because no single party controls it. Instead, our linked hashchain becomes the trusted authority, and a verifiable one: anyone can come to us with what the public chain says and ask "does your record match, and what else does it say about this?" We answer by searching our record for the related documents and receipts, and every answer can be checked against the public chain. Our authority is trusted because it can be checked, not because anyone has to take our word for it. State this as the problem we address and show it working; do not claim adoption numbers we cannot source.

Other uses of the same pattern (for the write-up, not built for the demo):
- A privacy dial set by the client, from Snowden (no personal information, only a WireGuard key as identity) to Big Brother (every move tracked). Accountability holds at every setting.
- Natural language to sealed calls: `zcall ask "..."` has JEV pick the sealed method and fill in its flags, with a confidence for each choice and a warning when nothing fits.
- The chatbot itself: every turn and tool call is receipted, so the chatbot is accountable for what it said and did.
- Cognitive services, formerly behind MCP and now reached through FUSE: context-aware coding, a knowledge base, and the chatbot's memory loop.
- Transparent product release, IP stays private. Each release's steps (build, checks, approvals, sealing) leave receipts in our record, and the release head is anchored publicly. Anyone can see that a release happened, when, and that its record has not changed since; the source and other IP stay private, revealed only by hash. 3tched's own releases already carry catalog hashes and generations, so a release is a natural thing to anchor.

The pitch in three words: our record, the public record. Our record is 3tched's private receipt chain, recorded under sealed, OSCAL-tagged schemas. The public record is the anchored hash on-chain. Together they are an immutable audit trail and compliance evidence, checkable by whoever holds a receipt. The two are linked in parallel, and our record can be searched by meaning (the hashchain is vectorized, with Cozo edges back to each event and actor): search finds the answer, the public record proves it was not changed.

The identity is shown alongside the contracts. It is not the project being judged, but it is the most striking part of it and should be clearly visible: the business that is its own container, sees from the inside and stands behind its receipts. The contracts are what is new; the identity is what makes people look twice.

## Video: under 3:00 (draft)
One story, one business, one deal. Everything else goes to the write-up and blog.
| Time | Beat | Shows |
|---|---|---|
| 0:00 to 0:20 | The problem | Verifiable trust: public chains show nothing useful, private records ask to be trusted |
| 0:20 to 0:45 | Meet the salesman | The business pitches in the chat: "I've got everything you need right here!" |
| 0:45 to 1:20 | The deal | Hire through the contract (CHING!); the hired agent does the work; receipts pile up (KA-CHUNK!) |
| 1:20 to 1:50 | On the record | Head anchored on-chain (POW!); the hire completes with the work head |
| 1:50 to 2:30 | On the stand | The visitor brings the public hash and searches our record for the deal. The salesman takes the stand and is questioned about his own receipts; each answer cites a receipt; the visitor checks one against the public record (BAM!) |
| 2:30 to 2:55 | How it was built | Kiro specs, steering, hooks, the idle crew, in a few quick shots |
Cut from the video: warranty, CMS generation details, product release, privacy and OSCAL detail, architecture diagrams, the origin story. Mention one line at most, or leave them to the write-up.

## Core idea (owner, 2026-11-23)
The identity is the system is the container, and it acts in the first person. It looks out from its own mount, where everything it may use is already local: no searching, polling, waiting or authenticating. The host alone decides grants and capabilities. This changes how a system deals with the outside world, and the web3 part is how we show it: the identity's own receipts are hash-chained, their head is anchored on-chain, and anyone holding a receipt can check it against the anchor. The contracts let the outside world hold the identity to what it did without seeing inside it.

The identity is the business: each subsidiary is its own business and its own salesperson. It presents itself, offers its own services, takes the hire through the contract, does the work, and stands behind it with its own receipts. No separate storefront, broker or operator speaks for it.

Demo (owner, 2026-11-23): the CMS is the showcase, because a container being provisioned is not something a viewer can see. The business sells a CMS rental.
1. The visitor talks to the business in the chat; it pitches its CMS rental.
2. The visitor hires it through the contract (CHING!).
3. Within 5 to 10 minutes the pre-existing UI generator produces a compliant, schema-backed CMS with a Cozo backend, ready to rent. Its fields are OSCAL-tagged from the template.
4. Each step leaves a receipt; the head is anchored (POW!); the visitor checks their receipt (BAM!).
The CMS runs inside the business's container and is handed over as a URL. Less is more: a small CMS, done well. The point of the showcase is the identity; the CMS is what makes it visible. Container provisioning still happens underneath, but it is not the visible centerpiece. Time a real run early; show the timer in the video rather than cutting.
Candidate businesses: cold-chain food logistics, public library circulation.

How businesses are made (owner, 2026-11-23): don't reinvent the wheel. Each business is generated (with ChatGPT) from the container configuration schema template used for Proxmox/LXC containers. That template carries years of work by partners and industries: thousands of fields, layouts and compliance standards. A generated business inherits all of it. The examples so far are cold-chain food logistics and public library circulation, from `lxc-configuration-schema.json` (Google Drive, `3tched-Agent-Schemas/`, not yet in this workspace).

What the compliance vectors are for: they are the business's enforcement, rules and automation guidance. The compliance corpus (`compliance-datasets-provenance`, served at `/compliance/`, Cozo `cc_chunk_embeddings`, Voyage 1024-dimension) is vectorized so a business identity can retrieve the rules that apply to it, through a granted read, and act within them. The owner runs the vectorization.

OSCAL is built in from the beginning (owner, 2026-11-23). Every schema carries OSCAL tags, subids and canonical mappings: fields already declare `x-oscal-subid` (for example `exp.service.llm-ui-surface.name@v1`), methods declare subids (`mut.service.project.select-context@v1`), and `oscal_subid_registry` (`lookup`, `resolve`, `list_by_category`, `assess_fields`, `export`, `register`) holds the registry. So a business generated from the template is OSCAL-tagged from its first field, and its compliance rules are reachable through those subids. This part is foundational, not half developed.

Schema-tag routing (owner, 2026-11-23: half developed). The backend has a shadow-only foundation: `schema_tag_registry` (tags, policies, protected-method markers) and `routing_decision` (`record_shadow_decision`, `get_decision`, `list_decisions`), plus OSCAL field classification. Tags do not grant capabilities. Enforcement, redaction and egress are not finished (`odbus-verified/SCHEMA-TAG-ROUTING-CODE.md`, `.kiro/specs/schema-tagged-routing/`). This is the enforcement layer on top of the OSCAL tags: it would route a business's data by those tags. Do not depend on it for the demo beyond what is sealed and working; show shadow decisions at most, and say so.

Stretch goal, only if time allows: renting an agent (a contract-hired agent).

## Project description (draft)
Subsidiary renders a content management system from a live schema inside a sealed Svelte 5 surface. The chatbot builds each view on the fly and only renders; every action goes through a grant-checked FUSE call file. A contract records the hire terms as a hash. Each sealed action produces a hash-chained receipt, the chain head is anchored on a local Foundry chain (anvil, 31337), and the receipt holder checks their own receipt against the anchored hash. Only hashes go on-chain. The businesses in the demo are fictional example tenants. The Frankenstein angle: an LLM-rendered UI, a FUSE capability layer, per-tenant Cozo/RocksDB storage, a hash chain, and Solidity contracts stitched into one admission rule, admit(a) iff identity(a) AND grants(a) AND sealed(a).

## How Kiro was used (write-up draft)
- **Specs:** five specs in `.kiro/specs/` (sealed-surface-gui, receipt-anchoring, service-contract, tenant-storage, demo-hire-and-receipt-check), each with requirements in EARS form, a design and a task list. The demo spec uses the requirements-first workflow.
- **Steering:** six files in `.kiro/steering/`: product, tech, structure, security always on; Solidity and Svelte guides load only when matching files are open.
- **Hooks:** 19 hooks in `.kiro/hooks/` (see below).
- **Custom agents:** validator, tester and rust-housekeeping in `.kiro/agents/`, run by the idle watcher.
- **Holding non-mainstream rules:** models kept pulling the design back toward common patterns. Steering (always-on rules, the current-vs-deprecated list), hooks and the validator agent are how Kiro was kept to the project's own rules. Note concrete cases where a rule or the validator caught a model normalizing something.
- **Planning in the Kiro IDE:** the requirements, designs, tasks, steering and the first hooks were planned and written in the Kiro IDE. The spec-sync hook keeps design and tasks consistent with the requirements as they change. Fill in specific moments (a requirement that changed a design, a hook that caught a mistake) as they happen so the write-up has concrete examples.
- **Kiro CLI:** unattended crew runs and the scripts around them.
- **MCP:** none configured yet.
- **Property-based testing, Kiro powers:** not used yet. The rules ask about both. Foundry fuzz tests on the contracts are a natural fit for property-based testing (for example, anchoring never accepts a zero or non-head hash).
- **IDE, CLI, Crew compared:** the rules ask how they differ. Note observations as you go.
- **Specs vs vibe coding:** the rules ask for this comparison. Note concrete cases.

## Progress so far
Done:
- Planning: `docs/PLAN.md`, `PREEXISTING.md`, five specs, six steering files, plus `docs/wiki/` research notes.
- Tooling: Foundry 1.10.0 installed; `web3/` initialised with `forge init` (template contract removed, no project contracts yet); git initialised with the `repr0bated/subsidiary` remote and a `.gitignore`.
- Hooks: 19 files, 16 enabled.
- Agents and scripts: three agents; `idle-check.sh`, `idle-watch.sh`, `crew-run.sh`, `preflight.sh`, `receipt.sh`; a cron job runs the idle watcher every 10 minutes.

Not started (all spec tasks are still unchecked):
- `EtchedAnchor`, the service contract, and their Foundry tests and scripts
- `ui/` scaffold and the sealed surface
- `container/`, the tenant Cozo mounts, and the FUSE call files
- The demo spec's requirements, design and tasks
- The fictional businesses and their schemas
- The video and the final write-up

Not yet run end to end: the crew agents and the hooks added this session.

## Usage

### Local chain
    export PATH="$HOME/.foundry/bin:$PATH"
    anvil                       # chain 31337 at http://127.0.0.1:8545
    cd web3 && forge fmt && forge build && forge test -vv

### Hooks
Hooks fire inside the Kiro IDE. Enabled now: preflight, contract tests, Solidity save, Svelte check, schema guard, spec sync, hash-only guard, wording guard, secret scan, new-contract spec, orphan check, reports digest, receipt on tool use, and three on-demand buttons (Ready for demo, Explain this contract, Crew now). Off until the FUSE door and the anchor contract exist: grant gate, session start, anchor on stop. Toggle a hook by changing `"enabled"` in its file.

### Crew
Validator, tester and rust-housekeeping run when the server is idle: no logged-in terminal and no Kiro session has had a command in the last 15 minutes, and files changed since the last run. Cron calls `.kiro/scripts/idle-watch.sh` every 10 minutes, and the run stops if you return. The tester and rust-housekeeping agents fix lint, format and test errors and log each change; the validator only reports. Reports go to `docs/reports/` (not committed). Start a run immediately with the "Crew now" hook or `CREW_FORCE=1 bash .kiro/scripts/crew-run.sh`. Agents use anvil only and never read `.env`, tenant data or `/etc/op-dbus/secrets`. They do not commit or push.
