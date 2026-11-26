# threetched catalog: what is there to call

Topic: the ZeroClaw-derived `threetched` commands available as sealed methods, so they can be used without a menu or spec.
Source: `/run/mounts/threetched/operations/threetched/` (147 methods, catalog generation 75). Each method is a D-Bus-wrapped binary command: its arguments are the CLI flags. Each has `metadata.json` with `usage` and `help` text.
Retrieved: 2026-11-23. Re-checked 2026-11-26 (golden 352): `/run/mounts/threetched/operations/threetched/` still lists 147 methods and the mount is still catalog generation 75. `zcall methods threetched` does not work for this view; list the directory instead.

Owner note: this catalog is usable now; it is just not in any menu or spec yet.

## Groups (method count)
onboard (23), skills (12), auth (10), cron (9), config (9), sop (8), service (7), channel (7), plugin (6), providers (5), peripheral (5), memory (5), models (4), gateway (4), doctor (4), channels (4), agents (4), hardware (3), estop (3), and single commands: agent, acp, browse, completions, daemon, desktop, eval, integrations, locales, migrate, quickstart, security, self-test, status, update.

## Likely useful for Subsidiary
- SOPs: `sop.list`, `sop.show`, `sop.graph`, `sop.validate`, `sop.pending`, `sop.approve`, `sop.deny`, `sop.delete`. Standard operating procedures with an approval step: a natural fit for accountable, contract-backed work (an SOP as the terms, approval as acceptance).
- Agents: `agent` (runs `threetched agent --agent <alias>`), `agents.list`, `agents.create`, `agents.delete`, `agents.rename`.
- Cron: `cron.add`, `cron.add-at`, `cron.add-every`, `cron.once`, `cron.pause`, `cron.resume`, `cron.update`, `cron.remove`, `cron.list`.
- Skills: `skills.add`, `skills.install`, `skills.audit`, `skills.bundle.*`, and more.
- Memory: `memory.get`, `memory.list`, `memory.stats`, `memory.reindex`, `memory.clear`.
- Eval: `eval.run`.
- Emergency stop: `estop`, `estop.status`, `estop.resume`.
- Gateway: the binary runs as a gateway to reach the models.

## Cautions
- Gateway is current: the binary runs as a gateway, and that is how models are reached (`gateway`, `gateway.start`, `gateway.restart`). `gateway.get-paircode` is used once, to pair when 3tched is deployed; it is not part of normal operation.
- Some commands overlap retired 3tched pieces and should not be used: `onboard.mcp*` and MCP bundles (MCP is retired), `desktop`. Device pairing for browsers is retired; the gateway pairing at deployment is separate.
- Read a method's `help` in its `metadata.json` before use; flags are the arguments.
- Every call still goes through the execution tracker and needs its grant.
