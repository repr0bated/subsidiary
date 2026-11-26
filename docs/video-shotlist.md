# Video shot list (under 3:00)

Draft 2026-11-25, built from what runs today. Record from a tagged known-good version (`git tag | grep demo-good`). Every burst on screen must match a real event in that shot.

| Time | Shot | What is on screen | Works today? |
|---|---|---|---|
| 0:00 to 0:15 | Problem | Narration box: "Public chains show nothing useful. Private records ask you to trust them." Split panel: an empty block explorer and a locked filing cabinet | Graphic only |
| 0:15 to 0:40 | Meet the salesman | The UI: yellow toolbar, speech balloon "Step right up, friend! I've got everything you need right here, no need to go searching!" Lot shown: runnable services, one marked not available to you | `/preview` today (sample, labelled); live needs the door and persona |
| 0:40 to 1:05 | The deal | Visitor clicks "Shake on it". Terminal: `forge script script/DemoHire.s.sol` → CHING! on `HireAccepted` | Script works; UI hire needs the door |
| 1:05 to 1:25 | The work | Receipts arrive (KA-CHUNK! per receipt). Terminal alternative: `zcall` reads, each one receipted | zcall works; agent work needs the seed networking fix |
| 1:25 to 1:50 | On the record | `web3/script/anchor-head.sh --send`: "chain verified by backend: N events", head printed, "anchored" → POW! | Works now on the real 3tched chain |
| 1:50 to 2:30 | On the stand | "On the stand" tab: search the record, pick an event, "OBJECTION! Answer that". Then `verify-receipt.sh`: PASS receipt, links, backend, anchor → BAM! Change one character: FAIL | Verifier works now; search needs the model path |
| 2:30 to 2:55 | How it was built | Quick cuts: `.kiro/specs` (EARS requirements), steering (current-vs-deprecated), hooks firing (hash-only guard, preflight), crew report in `docs/reports`, `forge test` 39 passing (corrected 2026-11-26, was 37), fuzz and invariant runs | Works now |
| 2:55 to 3:00 | Close | "Don't take my word for it. Check the receipt." | Graphic |

Honest limits to say or caption: receipts older than the Keccak-256 switch still rest on MD5; anvil is a local chain.

Commands, in order, for the recorded terminal segments:

```sh
web3/script/demo-setup.sh
set -a; . .kiro/state/demo.env; set +a
(cd web3 && forge script script/DemoHire.s.sol --rpc-url anvil --broadcast)   # keys in the environment; run from web3/ (corrected 2026-11-26: foundry.toml is in web3/)
web3/script/anchor-head.sh --send
web3/script/verify-receipt.sh --event-id N --event-hash HASH --anchor $ANCHOR_ADDRESS
web3/script/verify-hire.sh --rpc http://127.0.0.1:8545 --hire $HIRE_ADDRESS --id 1 --terms /tmp/terms.json
```
