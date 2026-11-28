# Design: Public record linked to the 3tched hash chain

## Flow
1. Build (`npm --prefix ui run record -- build`): record JSON plus the classification (field to protection floor) gives the root, the public bundle and the private entry.
2. Publish (`web3/script/publish-record.sh`): the bundle goes on the public chain with `EtchedRecord.publish`; prints the public ids.
3. Take in: the entry is recorded in the hash chain as one event (needs a sealed method, below).
4. Link (`record.ts link`): public ids, that event and its vector id, inside the bubble. The link is recorded with the entry.
5. Anchor: the next `anchor-head.sh --send` anchors a head that covers the event, so the public chain also holds proof that the hash chain took the record in.
6. Verify (`web3/script/verify-record.sh`): public part from the chain alone; entry and link when you hold them; the event read back through `zcall` when on the mount.

## Tree (EtchedRecord.sol and ui/src/lib/web3/disclosure.ts)
- leaf = keccak256(0x00 || keccak256(path) || salt || keccak256(canonical JSON value)); canonical JSON is `jq -S -c` (terms.ts).
- node = keccak256(0x01 || min || max). Prefixes keep leaves and nodes apart; sorted pairs make a proof a plain list of siblings.
- Leaves in path order (UTF-8 bytes), paired left to right, odd node carried up.
- Shared test vector: the same root is asserted in `web3/test/EtchedRecord.t.sol` and `ui/src/lib/web3/disclosure.test.ts`.

## Documents
- Bundle (`subsidiary.record/1`, public, canonical JSON, its keccak256 is kept on-chain): root, shown fields (path, value, salt, proof), redacted fields (path, leaf, proof), withheld count.
- Entry (`subsidiary.record-entry/1`, hash chain only): root and every field with class, value, salt and leaf.
- Link (`subsidiary.link/1`): bubble, public ids, event id, hash and time, ledger point id, entry hash.

## Vector id
`ledger_point_id(event_hash)` in odbus-verified `crates/op-cognitive/src/chain_vectors.rs` (branch hackathon/kiroween, b443dc7): UUIDv5 in namespace 3c0b91e4-5a27-4d6f-8b12-e6f409d3a751 over `ledger:<event_hash>`. `link.ts` derives it the same way (checked against Python's uuid5).

## Needs from 3tched (backend, not this repo)
- A sealed write that records an entry and its link as one hash-chain event, readable only by the identity and its grants.
- A sealed read that returns that entry and link by event id, so a verifier can compare.
- Optionally, `assess_fields` output mapped to record paths, so the classification file is not written by hand.

## Not changed
EtchedAnchor and HireContract are unchanged. Deploy.s.sol now also deploys EtchedRecord; demo-setup.sh writes RECORD_ADDRESS.
