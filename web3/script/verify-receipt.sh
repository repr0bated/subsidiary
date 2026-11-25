#!/usr/bin/env bash
# Check that a receipt is covered by an anchored head: the receipt's event links, hash by hash,
# to an event whose hash is anchored on the public record.
#
#   verify-receipt.sh --event-id N --event-hash HEX --anchor ADDRESS [--rpc URL]
#
# For a holder with read access to the identity's record (zcall on its mount):
#   1. receipt   event N exists and its event_hash equals the hash on your receipt
#   2. links     every later event's prev_hash equals the event_hash before it, up to a head
#   3. backend   snowball.verify_chain re-checks every hash in that range
#   4. anchor    the newest anchored hash on that path is in EtchedAnchor (time and anchorer shown)
# Exit 0 only if all pass. Today 3tched hashes events with MD5 (docs/PLAN.md risk): the link and
# anchor checks hold, but MD5 does not resist a host that crafts collisions.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$HOME/.local/bin:$PATH"
rpc="${RPC_URL:-http://127.0.0.1:8545}" id="" want="" anchor=""
while [ $# -gt 0 ]; do
  case "$1" in
    --event-id) id="$2"; shift 2 ;;
    --event-hash) want="$2"; shift 2 ;;
    --anchor) anchor="$2"; shift 2 ;;
    --rpc) rpc="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 64 ;;
  esac
done
[ -n "$id" ] && [ -n "$want" ] && [ -n "$anchor" ] || { sed -n 2,5p "$0" >&2; exit 64; }
res() { jq -c '.result.result // .result // .'; }
fail=0
pass() { printf 'PASS  %-8s %s\n' "$1" "$2"; }
bad()  { printf 'FAIL  %-8s %s\n' "$1" "$2"; fail=1; }
b32() { echo "0x$(printf '%064s' "$1" | tr ' ' 0)"; }
anchored() { [ "$(cast call "$anchor" 'isAnchored(bytes32)(bool)' "$(b32 "$1")" --rpc-url "$rpc")" = "true" ]; }

from="$id" prev="" first=1 covered="" covered_id="" last_id="$id"
while :; do
  page="$(zcall snowball query_events --from_event_id "$from" --limit 100 | res)"
  n="$(echo "$page" | jq '.events | length')"; [ "$n" -gt 0 ] || break
  while read -r ev; do
    eid="$(echo "$ev" | jq -r '.event_id')"; h="$(echo "$ev" | jq -r '.event_hash')"; p="$(echo "$ev" | jq -r '.prev_hash')"
    if [ "$first" = 1 ]; then
      first=0
      [ "$eid" = "$id" ] && [ "$h" = "$want" ] && pass receipt "event $id hash $h" || { bad receipt "event $eid hash $h, receipt says $id $want"; break 2; }
    else
      [ "$p" = "$prev" ] || { bad links "event $eid prev_hash $p does not match $prev"; break 2; }
    fi
    prev="$h"; last_id="$eid"
    if anchored "$h"; then covered="$h"; covered_id="$eid"; fi
  done < <(echo "$page" | jq -c '.events[]')
  [ "$(echo "$page" | jq -r '.has_more')" = "true" ] || break
  from=$((last_id + 1))
done
[ "$fail" = 0 ] && pass links "events $id to $last_id link by prev_hash"

if [ "$fail" = 0 ] && [ -n "$covered_id" ]; then
  v="$(zcall snowball verify_chain --from_event_id "$id" --to_event_id "$covered_id" | res)"
  [ "$(echo "$v" | jq -r '.valid')" = "true" ] && pass backend "verify_chain valid for $(echo "$v" | jq -r '.events_verified') events" || bad backend "verify_chain: $v"
  info="$(cast call "$anchor" 'anchorOf(bytes32)(uint256,address)' "$(b32 "$covered")" --rpc-url "$rpc" | tr '\n' ' ')"
  pass anchor "event $covered_id hash $covered anchored (timestamp anchoredBy: $info)"
elif [ "$fail" = 0 ]; then
  bad anchor "no anchored head at or after event $id yet"
fi
exit $fail
