#!/usr/bin/env bash
# Publish a record on the public chain. This is where a record starts: the public chain gets the
# root and the bundle (shown fields, redacted leaves); the private entry stays for the hash chain.
#
#   publish-record.sh --bundle B.json [--rpc URL] [--out P.json]
#
# B.json comes from `npm --prefix ui run record -- build`, byte for byte (its keccak256 is what the
# contract keeps). Needs RECORD_ADDRESS and PUBLISH_KEY in the environment; the key is read by
# PublishRecord.s.sol and is never on a command line. A root that is already published is not
# sent again. Prints the public ref JSON (and writes it to --out): the input of
# `record.ts link --public`, which ties it to the hash-chain event that takes the entry in.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$HOME/.local/bin:$PATH"
here="$(cd "$(dirname "$0")/.." && pwd)"
rpc="${RPC_URL:-http://127.0.0.1:8545}" bundle="" out=""
while [ $# -gt 0 ]; do
  case "$1" in
    --bundle) bundle="$2"; shift 2 ;;
    --rpc) rpc="$2"; shift 2 ;;
    --out) out="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 64 ;;
  esac
done
[ -n "$bundle" ] || { sed -n 2,11p "$0" >&2; exit 64; }
for c in jq cast forge od; do command -v "$c" >/dev/null || { echo "$c is required" >&2; exit 69; }; done
: "${RECORD_ADDRESS:?set RECORD_ADDRESS}"; : "${PUBLISH_KEY:?set PUBLISH_KEY in the environment}"
# shellcheck source=record-lib.sh
. "$here/script/record-lib.sh"

[ "$(jq -r .version "$bundle")" = "subsidiary.record/1" ] || { echo "not a record bundle: $bundle" >&2; exit 65; }
root="$(jq -r .root "$bundle")"
[[ "$root" =~ ^0x[0-9a-f]{64}$ ]] || { echo "bundle root is not bytes32" >&2; exit 65; }
[ "$(jq -S -c . "$bundle" | tr -d '\n')" = "$(cat "$bundle")" ] || { echo "bundle is not canonical JSON; use the file record.ts wrote" >&2; exit 65; }
hex="0x$(od -An -v -tx1 "$bundle" | tr -d ' \n')"

( cd "$here" && ROOT="$root" BUNDLE="$hex" forge script script/PublishRecord.s.sol --rpc-url "$rpc" --broadcast 2>&1 \
  | grep -E "published|Error" | tail -1 ) >&2
id="$(cast call "$RECORD_ADDRESS" 'recordIdOf(bytes32)(uint256)' "$root" --rpc-url "$rpc")"
[ "$id" != 0 ] || { echo "root $root is not published" >&2; exit 1; }
want="$(sed -n 2p <<<"$(record_fields "$RECORD_ADDRESS" "$id" "$rpc")")"
[ "$want" = "$(cast keccak "$(cat "$bundle")")" ] || { echo "record $id was published with a different bundle" >&2; exit 1; }
ref="$(public_ref "$RECORD_ADDRESS" "$id" "$rpc")"
[ -z "$out" ] || printf '%s' "$ref" > "$out"
echo "$ref"
