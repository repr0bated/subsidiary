# Shared by publish-record.sh and verify-record.sh. Sourced, not run.
# public_ref ADDRESS ID RPC  ->  the public ref JSON that `record.ts link --public` takes:
#   chainId, contract, recordId, root, txHash, blockNumber, blockHash, blockTime
# Read only: getRecord for the root and block, the Published log in that block for the tx, and the
# block for its hash and time.

PUBLISHED_TOPIC="$(cast keccak 'Published(uint256,bytes32,address,uint256,bytes)')"

# getRecord(id) -> "root bundleHash publisher timestamp blockNumber", one per line.
record_fields() {
  cast call "$1" 'getRecord(uint256)((bytes32,bytes32,address,uint64,uint64))' "$2" --rpc-url "$3" \
    | tr -d '()' | sed -E 's/ \[[^]]*\]//g' | tr ',' '\n' | sed -E 's/^ +//'
}

public_ref() {
  local addr="$1" id="$2" rpc="$3" f root block log chain time bhash
  f="$(record_fields "$addr" "$id" "$rpc")" || return 1
  root="$(sed -n 1p <<<"$f")"; block="$(sed -n 5p <<<"$f")"
  log="$(cast logs --json --from-block "$block" --to-block "$block" --address "$addr" "$PUBLISHED_TOPIC" --rpc-url "$rpc" \
    | jq -c --arg root "$root" '[.[] | select((.topics[2] | ascii_downcase) == ($root | ascii_downcase))][0]')"
  [ "$log" != "null" ] || { echo "no Published log for record $id in block $block" >&2; return 1; }
  chain="$(cast chain-id --rpc-url "$rpc")"
  time="$(cast block "$block" --field timestamp --rpc-url "$rpc")"
  bhash="$(cast block "$block" --field hash --rpc-url "$rpc")"
  jq -n -c --argjson chainId "$chain" --arg contract "$(tr 'A-F' 'a-f' <<<"$addr")" --argjson recordId "$id" \
    --arg root "$root" --arg txHash "$(jq -r .transactionHash <<<"$log")" --argjson blockNumber "$block" \
    --arg blockHash "$bhash" --argjson blockTime "$time" \
    '{blockHash:$blockHash,blockNumber:$blockNumber,blockTime:$blockTime,chainId:$chainId,contract:$contract,recordId:$recordId,root:$root,txHash:$txHash}'
}
