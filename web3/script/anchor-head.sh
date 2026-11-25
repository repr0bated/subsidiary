#!/usr/bin/env bash
# Read the identity's own receipt-chain head from 3tched and (optionally) anchor it on-chain.
#
#   anchor-head.sh            print the head, after the backend verifies the chain (read only)
#   anchor-head.sh --send     also anchor it: needs ANCHOR_ADDRESS and ANCHOR_KEY in the environment
#
# Reads through zcall (sealed methods via the identity's own 3tchedFS mount):
#   snowball.verify_chain   the backend re-checks every event hash and link
#   snowball.query_events   pages to the newest event; its event_hash is the head
# The head is written as bytes32: the hash hex left-padded with zeros to 32 bytes, so a 32-byte
# hash maps to itself. 3tched heads are Keccak-256 (32 bytes); older MD5 events are 16 bytes (docs/PLAN.md).
set -euo pipefail
export PATH="$HOME/.foundry/bin:$HOME/.local/bin:$PATH"
send=0; rpc="${RPC_URL:-http://127.0.0.1:8545}"
[ "${1:-}" = "--send" ] && send=1
command -v zcall >/dev/null || { echo "zcall is required" >&2; exit 69; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 69; }

res() { jq -c '.result.result // .result // .'; }

verdict="$(zcall snowball verify_chain | res)"
[ "$(echo "$verdict" | jq -r '.valid')" = "true" ] || { echo "chain did not verify: $verdict" >&2; exit 1; }
verified="$(echo "$verdict" | jq -r '.events_verified')"

from=0; last=""; last_id=0
while :; do
  page="$(zcall snowball query_events --from_event_id "$from" --limit 100 | res)"
  n="$(echo "$page" | jq '.events | length')"
  [ "$n" -gt 0 ] || break
  last="$(echo "$page" | jq -r '.events[-1].event_hash')"
  last_id="$(echo "$page" | jq -r '.events[-1].event_id')"
  [ "$(echo "$page" | jq -r '.has_more')" = "true" ] || break
  from=$((last_id + 1))
done
[ -n "$last" ] || { echo "no events in the chain" >&2; exit 1; }
[[ "$last" =~ ^[0-9a-f]{32,64}$ ]] || { echo "unexpected head format" >&2; exit 1; }
head32="0x$(printf '%064s' "$last" | tr ' ' 0)"

echo "chain verified by backend: $verified events"
echo "head event_id: $last_id"
echo "head hash:     $last ($(( ${#last} * 4 )) bits)"
echo "bytes32:       $head32"

if [ "$send" = 1 ]; then
  : "${ANCHOR_ADDRESS:?set ANCHOR_ADDRESS}"; : "${ANCHOR_KEY:?set ANCHOR_KEY in the environment}"
  here="$(cd "$(dirname "$0")/.." && pwd)"
  ( cd "$here" && HEAD="$head32" forge script script/AnchorHead.s.sol --rpc-url "$rpc" --broadcast 2>&1 | grep -E "anchored|Error" | tail -1 )
  cast call "$ANCHOR_ADDRESS" 'anchorOf(bytes32)(uint256,address)' "$head32" --rpc-url "$rpc" | tr '\n' ' '; echo
fi
