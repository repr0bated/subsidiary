# Subsidiary

Verifiable trust for work done by an identity, without seeing inside it.

A business identity takes a job, does the work, and stands behind it. Every step it takes leaves a receipt in its own private, hash-linked record. The head of that record is anchored on a public chain, and the hire itself is a contract that points at that anchored head. Anyone holding a receipt can check it against the public record themselves, with no trusted authority in between.

Subsidiary is a personal project by Jeremy Hobson. It builds on 3tched, earlier work of mine that is listed in [PREEXISTING.md](PREEXISTING.md). The businesses in the demo are fictional example tenants.

## What is in this repository

| Path | What it is |
|---|---|
| `web3/` | Foundry project: `EtchedAnchor` (anchors receipt-chain heads, hash only) and `HireContract` (hire, deliver against an anchored head, two-party completion, warranty claims and anchored remedies, a public provider record). Tests, deploy and demo scripts, and a holder-side verifier |
| `ui/` | The chat canvas: a Svelte 5 static build served by the 3tched door. The chatbot is the UI; views are rendered from sealed catalog components in a Lichtenstein pop-art style |
| `.kiro/` | How this was built with Kiro: steering, specs, hooks and the crew agents |
| `docs/` | Plan, design notes and research wiki |

## Requirements

- [Foundry](https://getfoundry.sh) (`forge`, `anvil`, `cast`), and `jq` for the verifier
- Node.js 22 or newer for the UI
- For the live UI: a running 3tched backend (door, sealed catalog). The contracts, verifier, tests and UI preview run without it.

Clone with the submodule:

```sh
git clone --recurse-submodules https://github.com/repr0bated/subsidiary.git
cd subsidiary
```

## Contracts

```sh
cd web3
forge build
forge test -vv          # 37 tests, including fuzzed properties
```

Run a full hire on a local chain:

```sh
anvil                    # chain 31337 at http://127.0.0.1:8545, prints test keys
# in another shell, with keys from the anvil output in your environment:
export DEPLOYER_KEY=...  CLIENT_KEY=...  PROVIDER_KEY=...
forge script script/Deploy.s.sol --rpc-url anvil --broadcast
# note the two printed addresses, then:
export ANCHOR_ADDRESS=... HIRE_ADDRESS=...
jq --arg s "$(openssl rand -hex 32)" '.salt=$s' examples/terms.example.json > /tmp/terms.json
export TERMS_HASH=$(cast keccak "$(jq -S -c . /tmp/terms.json)")
export WORK_HEAD=$(cast keccak "example-receipt-chain-head")
forge script script/DemoHire.s.sol --rpc-url anvil --broadcast
```

No key is stored in any script; keys come from the environment.

## Check a hire yourself

```sh
web3/script/verify-hire.sh --rpc http://127.0.0.1:8545 --hire $HIRE_ADDRESS --id 1 \
  --terms /tmp/terms.json --head $WORK_HEAD
```

It checks that your terms document hashes to the hire's `termsHash` (canonical form: `jq -S -c .`, keccak256), that the hire is completed, and that its work head is anchored, and it reads only public chain data. Change one word in the terms and the check fails.

## Anchor a real 3tched record and check a receipt against it

With a 3tched host and `zcall` (reads go through the identity's own mount and are themselves receipted):

```sh
web3/script/demo-setup.sh                       # deploy; addresses saved to .kiro/state/demo.env
set -a; . .kiro/state/demo.env; set +a
web3/script/anchor-head.sh                      # backend verifies the chain, prints the head
ANCHOR_KEY=... web3/script/anchor-head.sh --send   # anchor it (key from the environment only)
web3/script/verify-receipt.sh --event-id N --event-hash HASH --anchor $ANCHOR_ADDRESS
```

`verify-receipt.sh` checks that your receipt's event exists with your hash, that every later event links to it by `prev_hash` up to an anchored head, that the backend's `verify_chain` agrees over that range, and that the head is on the public record. A wrong hash fails.

## UI

```sh
cd ui
npm install
npm test                 # property tests for the door, catalog, feeds and chat transport
npm run check            # svelte-check
npm run build            # writes build/index.html and build/assets for the 3tched door
npx vite preview         # then open /preview for a labelled sample of the look
```

`npm run check`, `test` and `build` first generate the door client from the 3tched backend's own `operation.proto` at the commit in `ui/door-proto.ref` (set `BACKEND_REPO` if your checkout is elsewhere). The proto is never copied into this repository.

## How it fits together

- 3tched (pre-existing) is the identity, its sealed schemas, grants, execution tracker and receipt chain. The identity is the container: it sees what it is granted as files in its own mount and acts by writing call files.
- The UI is served by the 3tched door. It renders only what the catalog contains; operations the user is not granted are shown as present but not runnable, and capabilities are never shown.
- The contracts are the new public layer: the hire, the anchored proof of delivery, and the warranty, all as hashes. Terms and deliverables stay off-chain.

## Status and known limits

- The receipt chain the anchor relies on currently hashes events with MD5 in 3tched. Until it moves to blake3 or SHA-256, an anchored head is not a tamper-proof commitment against whoever runs the host.
- The live UI needs the 3tched build that seals `fuse.get_catalog`, and the browser identity bootstrap.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
