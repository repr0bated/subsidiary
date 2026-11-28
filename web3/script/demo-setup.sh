#!/usr/bin/env bash
# Demo setup in one step (demo-hire-and-receipt-check requirement 1).
# Starts anvil if needed, runs preflight, deploys EtchedAnchor and HireContract, and writes the
# two addresses (never keys) to .kiro/state/demo.env. DEPLOYER_KEY comes from the environment.
#
#   RPC_URL                node to deploy to, default http://127.0.0.1:8545 (like the other scripts);
#                          if nothing answers there, anvil is started on its port, on 127.0.0.1 only
#   DEMO_SKIP_PREFLIGHT=1  skip .kiro/scripts/preflight.sh (FUSE view, anvil on 8545) for plain tests;
#                          the chain id 31337 is still checked. Leave unset for the real demo.
#   DEMO_STATE_DIR         where demo.env and anvil.log go, default .kiro/state (tests use a temp dir)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; root="$(cd "$here/.." && pwd)"
export PATH="$HOME/.foundry/bin:$PATH"
: "${DEPLOYER_KEY:?set DEPLOYER_KEY in the environment (an anvil test key for local runs)}"
rpc="${RPC_URL:-http://127.0.0.1:8545}"
state="${DEMO_STATE_DIR:-$root/.kiro/state}"; mkdir -p "$state"
if ! cast chain-id --rpc-url "$rpc" >/dev/null 2>&1; then
  hostport="${rpc#http://}"; hostport="${hostport%%/*}"; host="${hostport%:*}"; port="${hostport##*:}"
  [ "$port" != "$hostport" ] || port=8545
  case "$host" in
    127.0.0.1|localhost) ;;
    *) echo "no node at $rpc; anvil is only started on 127.0.0.1" >&2; exit 1 ;;
  esac
  nohup anvil --host 127.0.0.1 --port "$port" --chain-id 31337 > "$state/anvil.log" 2>&1 &
  for _ in $(seq 1 20); do cast chain-id --rpc-url "$rpc" >/dev/null 2>&1 && break; sleep 0.5; done
fi
if [ "${DEMO_SKIP_PREFLIGHT:-0}" = 1 ]; then
  [ "$(cast chain-id --rpc-url "$rpc" 2>/dev/null)" = 31337 ] || { echo "no anvil (chain 31337) at $rpc" >&2; exit 1; }
  echo "skip: preflight (DEMO_SKIP_PREFLIGHT=1)"
else
  bash "$root/.kiro/scripts/preflight.sh" || { echo "preflight failed: fix the items above first" >&2; exit 1; }
fi
out="$(cd "$here" && forge script script/Deploy.s.sol --rpc-url "$rpc" --broadcast 2>&1)" || { echo "$out" >&2; exit 1; }
anchor="$(echo "$out" | grep -oE 'EtchedAnchor 0x[0-9a-fA-F]{40}' | tail -1 | cut -d' ' -f2)"
hire="$(echo "$out" | grep -oE 'HireContract 0x[0-9a-fA-F]{40}' | tail -1 | cut -d' ' -f2)"
[ -n "$anchor" ] && [ -n "$hire" ] || { echo "deploy output had no addresses" >&2; exit 1; }
printf 'ANCHOR_ADDRESS=%s\nHIRE_ADDRESS=%s\n' "$anchor" "$hire" > "$state/demo.env"
echo "EtchedAnchor $anchor"; echo "HireContract $hire"; echo "addresses saved to $state/demo.env"
