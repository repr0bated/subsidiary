#!/usr/bin/env bash
# Demo setup in one step (demo-hire-and-receipt-check requirement 1).
# Starts anvil if needed, runs preflight, deploys EtchedAnchor and HireContract, and writes the
# two addresses (never keys) to .kiro/state/demo.env. DEPLOYER_KEY comes from the environment.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; root="$(cd "$here/.." && pwd)"
export PATH="$HOME/.foundry/bin:$PATH"
: "${DEPLOYER_KEY:?set DEPLOYER_KEY in the environment (an anvil test key for local runs)}"
state="$root/.kiro/state"; mkdir -p "$state"
if ! cast chain-id --rpc-url http://127.0.0.1:8545 >/dev/null 2>&1; then
  nohup anvil --host 127.0.0.1 --port 8545 --chain-id 31337 > "$state/anvil.log" 2>&1 &
  for _ in $(seq 1 20); do cast chain-id --rpc-url http://127.0.0.1:8545 >/dev/null 2>&1 && break; sleep 0.5; done
fi
bash "$root/.kiro/scripts/preflight.sh" || { echo "preflight failed: fix the items above first" >&2; exit 1; }
out="$(cd "$here" && forge script script/Deploy.s.sol --rpc-url anvil --broadcast 2>&1)" || { echo "$out" >&2; exit 1; }
anchor="$(echo "$out" | grep -oE 'EtchedAnchor 0x[0-9a-fA-F]{40}' | tail -1 | cut -d' ' -f2)"
hire="$(echo "$out" | grep -oE 'HireContract 0x[0-9a-fA-F]{40}' | tail -1 | cut -d' ' -f2)"
[ -n "$anchor" ] && [ -n "$hire" ] || { echo "deploy output had no addresses" >&2; exit 1; }
printf 'ANCHOR_ADDRESS=%s\nHIRE_ADDRESS=%s\n' "$anchor" "$hire" > "$state/demo.env"
echo "EtchedAnchor $anchor"; echo "HireContract $hire"; echo "addresses saved to .kiro/state/demo.env"
