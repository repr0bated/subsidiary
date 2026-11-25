#!/usr/bin/env bash
# Holder-side check of a hire against the public record. Needs only cast and jq.
#
#   verify-hire.sh --rpc URL --hire ADDRESS --id N --terms TERMS.json [--head HEX]
#
# Checks:
#   1. terms   keccak256 of the canonical terms document equals the hire's termsHash.
#              Canonical form: `jq -S -c .` (keys sorted at every depth, compact, UTF-8), no
#              trailing newline. The document must carry a random "salt" and no personal data.
#   2. status  the hire is Completed.
#   3. anchor  the hire's workHead is anchored in EtchedAnchor (time and anchorer shown).
#   4. head    optional: a head you recomputed from your own receipt equals the hire's workHead.
# Exit 0 only if every check passes. Reads public chain data only; sends no transaction.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
rpc="" hire="" id="" terms="" head=""
while [ $# -gt 0 ]; do
  case "$1" in
    --rpc) rpc="$2"; shift 2 ;;
    --hire) hire="$2"; shift 2 ;;
    --id) id="$2"; shift 2 ;;
    --terms) terms="$2"; shift 2 ;;
    --head) head="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 64 ;;
  esac
done
[ -n "$rpc" ] && [ -n "$hire" ] && [ -n "$id" ] && [ -n "$terms" ] || { sed -n 2,5p "$0" >&2; exit 64; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 69; }

fail=0
pass() { printf 'PASS  %-7s %s\n' "$1" "$2"; }
bad()  { printf 'FAIL  %-7s %s\n' "$1" "$2"; fail=1; }

jq -e 'has("salt") and (.salt|type=="string") and (.salt|length)>=32' "$terms" >/dev/null \
  || bad terms "document has no salt of at least 32 characters (its hash could be guessed)"

canon="$(jq -S -c . "$terms")"
local_hash="$(cast keccak "$canon")"
sig='getHire(uint256)((address,address,bytes32,bytes32,uint64,uint64,uint64,uint64,uint64,uint8,bool,bool))'
raw="$(cast call "$hire" "$sig" "$id" --rpc-url "$rpc")"
fields="$(echo "$raw" | tr -d '() ' | tr ',' '\n')"
on_terms="$(echo "$fields" | sed -n 3p)"
on_work="$(echo "$fields" | sed -n 4p)"
on_status="$(echo "$fields" | sed -n 10p)"

[ "$local_hash" = "$on_terms" ] && pass terms "$local_hash" || bad terms "local $local_hash, on-chain $on_terms"
[ "$on_status" = "5" ] && pass status "Completed" || bad status "status $on_status (5 = Completed)"

anchor="$(cast call "$hire" 'anchor()(address)' --rpc-url "$rpc")"
anchored="$(cast call "$anchor" 'isAnchored(bytes32)(bool)' "$on_work" --rpc-url "$rpc")"
if [ "$anchored" = "true" ]; then
  info="$(cast call "$anchor" 'anchorOf(bytes32)(uint256,address)' "$on_work" --rpc-url "$rpc" | tr '\n' ' ')"
  pass anchor "$on_work anchored (timestamp anchoredBy: $info)"
else
  bad anchor "$on_work is not anchored in $anchor"
fi

if [ -n "$head" ]; then
  want="$(cast to-bytes32 "$head" 2>/dev/null || echo "$head")"
  [ "${want,,}" = "${on_work,,}" ] && pass head "matches the hire's work head" || bad head "yours $want, hire $on_work"
fi
exit $fail
