---
inclusion: always
---
# Structure

```
.kiro/steering/    this file, product.md, tech.md
.kiro/specs/<feature>/{requirements,design,tasks}.md
container/         base container notes (pre-existing tooling, no code here)
ui/                sealed-surface GUI (SvelteKit app)
web3/              anchor contract, anchorer, verifier
```

## Transfer back into 3tched
- `ui/`  → `odbus-verified/etched-in-schema/ui/` (or a `subsidiary/ui/` subtree)
- `web3/` → `odbus-verified/etched-in-schema/web3/`
- `.kiro/specs/<feature>/` → `odbus-verified/.kiro/specs/<feature>/`
  (feature slugs are unique against that repo's existing specs)
- No schema, receipt or grant shapes are defined here; both repos read the
  same live backend, so nothing needs reconciling on merge.

## Conventions
- Spec files follow the 3tched Kiro style: `# Requirements Document`,
  EARS acceptance criteria, design referencing requirement numbers,
  `tasks.md` as a checkbox implementation plan.
- Commits: small, one task per commit, referencing the spec task number.
- Branches: `main` (submission) and `dev` (work); no force pushes.
