# web3/ — receipt anchoring (new, built with Kiro)

Spec: [`../.kiro/specs/receipt-anchoring/`](../.kiro/specs/receipt-anchoring/).

EtchedAnchor is **new hackathon work**, built in Kiro. It periodically
records a commitment to the head of 3tched's existing private hashchain,
with the catalog hash and schema hash in force. Only hashes go on-chain; the
hashchain stays private. Receipt holders verify their receipts against these
anchors, and the operator compares the local head against them.

Foundry toolchain:
- `forge build` — compile the contract.
- `forge test` — unit and fuzz tests.
- `anvil` — local chain (default chain id 31337).
- `cast` — independent on-chain verification.
- `forge script` — deployment scripts.

Local Anvil first, then Base Sepolia (84532). This directory currently holds
specs/scaffold only; code and scripts land here as Kiro completes the tasks.
