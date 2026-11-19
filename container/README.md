# container/ — the base (pre-existing)

Subsidiary runs in a **freshly provisioned LXD container on antix1**, created
with 3tched's existing provisioning (`deploy/provisioning/` and the sealed
`lxd` plugin in repr0bated/odbus-verified). The container, its identity sled,
grants and the 3tchedFS mount are pre-existing work and are disclosed in
[`../PREEXISTING.md`](../PREEXISTING.md).

The container contract (network isolation, FUSE-only backend channel,
hardening) lives in 3tched, not here:
[odbus-verified `.kiro/specs/subsidiary-container/`](https://github.com/repr0bated/odbus-verified/tree/dev/.kiro/specs/subsidiary-container).

Status: **not provisioned yet.** It will be created after the current golden
build on antix1 finishes. When it is, this file will record:

- the provisioning command and the 3tched commit it ran from;
- the container name and the identity it is bound to (no credentials);
- where the identity's 3tchedFS mount appears inside the container, which is
  what `ui/` and `web3/` read the live sealed schema from.

No container image is stored in this repo.
