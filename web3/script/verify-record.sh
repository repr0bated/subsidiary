#!/usr/bin/env bash
# Check a public record, and how far it links into 3tched's hash chain.
#
#   verify-record.sh --record-id N --bundle B.json [--entry E.json] [--link L.json] [--rpc URL]
#
# Needs RECORD_ADDRESS in the environment. Read only: sends nothing.
#   public   the record exists; the bundle's keccak256 is the one the contract kept; its root is the record's
#   proofs   every shown or redacted field proves into the root (record.ts), and every shown field
#            also proves through the contract's own leafHash and verifyLeaf, so both encodings agree
#   entry    with --entry (the hash chain's private side): every field, withheld ones included,
#            rebuilds the root, and the bundle shows exactly what the entry allows
#   link     with --link: the public ids still read the same from the chain; with zcall on the
#            identity's mount, the linked hash-chain event is read back with snowball.query_events and
#            must match id, hash and time, inside the bubble, with the vector id derived from its hash
# Exit 0 only if every check that ran passed.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$HOME/.local/bin:$PATH"
here="$(cd "$(dirname "$0")/.." && pwd)"
ui="$here/../ui"
rpc="${RPC_URL:-http://127.0.0.1:8545}" id="" bundle="" entry="" link=""
while [ $# -gt 0 ]; do
  case "$1" in
    --record-id) id="$2"; shift 2 ;;
    --bundle) bundle="$2"; shift 2 ;;
    --entry) entry="$2"; shift 2 ;;
    --link) link="$2"; shift 2 ;;
    --rpc) rpc="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 64 ;;
  esac
done
[ -n "$id" ] && [ -n "$bundle" ] || { sed -n 2,16p "$0" >&2; exit 64; }
for c in jq cast node; do command -v "$c" >/dev/null || { echo "$c is required" >&2; exit 69; }; done
: "${RECORD_ADDRESS:?set RECORD_ADDRESS}"
# shellcheck source=record-lib.sh
. "$here/script/record-lib.sh"
record() { ( cd "$ui" && node --experimental-strip-types --no-warnings=ExperimentalWarning --import ./scripts/ts-resolve.mjs scripts/record.ts "$@" ); }
abspath() { [ -z "$1" ] || echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; }
bundle="$(abspath "$bundle")"; entry="$(abspath "$entry")"; link="$(abspath "$link")"
fail=0
pass() { printf 'PASS  %-7s %s\n' "$1" "$2"; }
bad()  { printf 'FAIL  %-7s %s\n' "$1" "$2"; fail=1; }

f="$(record_fields "$RECORD_ADDRESS" "$id" "$rpc")" || { bad public "no record $id"; exit 1; }
root="$(sed -n 1p <<<"$f")"; kept="$(sed -n 2p <<<"$f")"
[ "$(cast keccak "$(cat "$bundle")")" = "$kept" ] && pass public "record $id, bundle hash $kept" || bad public "bundle is not the one published as record $id"
[ "$(jq -r .root "$bundle")" = "$root" ] && pass public "root $root" || bad public "bundle root differs from record root $root"

if record verify --bundle "$bundle" ${entry:+--entry "$entry"} >/dev/null 2>&1; then
  pass proofs "all fields prove into the root${entry:+; entry rebuilds it and matches the bundle}"
else
  record verify --bundle "$bundle" ${entry:+--entry "$entry"} 2>&1 | sed 's/^/      /'; bad proofs "record.ts verify"
fi
while read -r fld; do
  path="$(jq -r .path <<<"$fld")"
  leaf="$(cast call "$RECORD_ADDRESS" 'leafHash(string,bytes32,bytes32)(bytes32)' "$path" "$(jq -r .salt <<<"$fld")" \
    "$(cast keccak "$(jq -S -c .value <<<"$fld" | tr -d '\n')")" --rpc-url "$rpc")"
  proof="[$(jq -r '.proof | join(",")' <<<"$fld")]"
  [ "$(cast call "$RECORD_ADDRESS" 'verifyLeaf(bytes32,bytes32,bytes32[])(bool)' "$root" "$leaf" "$proof" --rpc-url "$rpc")" = true ] \
    && pass proofs "contract agrees on shown field $path" || bad proofs "contract rejects shown field $path"
done < <(jq -c '.fields[] | select(.class == "public")' "$bundle")

if [ -n "$link" ]; then
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  public_ref "$RECORD_ADDRESS" "$id" "$rpc" > "$tmp/public.json" || bad link "could not read the public ids"
  ev=()
  if command -v zcall >/dev/null; then
    eid="$(jq -r .hashchain.eventId "$link")"
    zcall snowball query_events --from_event_id "$eid" --to_event_id "$eid" --limit 1 \
      | jq -c '(.result.result // .result // .).events[0]' > "$tmp/event.json"
    [ "$(cat "$tmp/event.json")" != null ] && ev=(--event "$tmp/event.json") || bad link "event $eid is not in the hash chain"
  else
    echo "SKIP  link    zcall not here: the hash-chain event is not read back"
  fi
  if record check-link --link "$link" --public "$tmp/public.json" "${ev[@]}" ${entry:+--entry "$entry"} >/dev/null 2>&1; then
    pass link "event $(jq -r .hashchain.eventId "$link"), vector $(jq -r .vector.ledgerPointId "$link"), inside the bubble"
  else
    record check-link --link "$link" --public "$tmp/public.json" "${ev[@]}" ${entry:+--entry "$entry"} 2>&1 | sed 's/^/      /'
    bad link "record.ts check-link"
  fi
fi
exit $fail
