---
inclusion: always
---

# Working in the backend repo (odbus-verified)

When a task reads or changes `/srv/git/odbus-verified` or any of its worktrees (for example `/srv/git/odbus-verified-wt/kiroween`), do this first, before any analysis, planning, edits or subagent work, in that repo:

1. Read `AGENTS.md` completely.
2. Read every file in its "Mandatory skill preload" list (`.agents/skills/<name>/SKILL.md` and the listed references). Every agent and subagent does this in its own session; a parent's preload does not count for a child.
3. Read its `.kiro/steering/*.md` (`handoff.md`, `subagent-cargo.md`).
4. Read `HANDOFF.md`; add or update your *Active work* row before changing anything, and never touch work another agent has claimed there.
5. Load the task's own skills from `.agents/skills/` as well (for network and OpenFlow work: `ovs-db-analysis`, `grpc-expert`, `protobuf`, `trestle-oscal-models`, `linux-network-admin`, `rust-testing`, `test-driven-development`, `verification-before-completion`).

Then follow those documents: one cargo process at a time, no workspace-wide builds unless the owner says workspace, branch policy (`scripts/branch-policy.sh`; allowed branches are `main`, `dev` and `hackathon/kiroween`).
