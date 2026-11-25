---
inclusion: fileMatch
fileMatchPattern: "web3/**/*.sol"
---

# Solidity guide

- Solidity ^0.8.x, custom errors over revert strings, NatSpec on public functions.
- Store only hashes (bytes32) and minimal metadata. Emit events for every anchor.
- Tests in `web3/test/*.t.sol` with Foundry; use `vm.expectRevert` and fuzz where inputs are free-form.
- Deploy via `forge script` against anvil (31337). No private keys in scripts; use env vars.
- Run `forge fmt && forge build && forge test -vv` before marking a task done.
