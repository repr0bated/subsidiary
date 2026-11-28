#!/usr/bin/env bash
# Local end-to-end check of the hire flow on a fresh anvil: deploy -> anchor a fixed work head
# -> hire (create, accept, deliver, confirm x2) -> verify-hire.sh, plus two checks that must fail;
# then a public record: build, publish-record.sh, verify-record.sh, and a changed bundle that must fail.
# Exit 0 only if every step passes. Always stops the anvil it started.
#
#   e2e-local.sh            uses port 8546 (E2E_PORT to change); refuses a port already in use
#
# Uses only anvil's public default dev accounts; sends nothing to any other chain.
# Deploys with demo-setup.sh (RPC_URL set to this anvil, DEMO_SKIP_PREFLIGHT=1, state in a temp dir,
# so the demo's own .kiro/state/demo.env is not touched), then reuses AnchorHead.s.sol, DemoHire.s.sol
# and verify-hire.sh, then runs ui/src/lib/web3/client.anvil.test.ts against the same node (skipped
# without ui/node_modules).
# shortcut: verify-receipt.sh is not run, it needs zcall and a live 3tched chain; add it when the
# e2e runs inside the container.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.foundry/bin:$PATH"
port="${E2E_PORT:-8546}"
rpc="http://127.0.0.1:$port"
command -v jq >/dev/null || { echo "jq is required" >&2; exit 69; }

# anvil default accounts 0, 1, 2 (public test keys, mnemonic "test test ... junk").
deployer=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
client=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
provider=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

if cast chain-id --rpc-url "$rpc" >/dev/null 2>&1; then
  echo "port $port already has a node; set E2E_PORT to a free port" >&2; exit 1
fi

tmp="$(mktemp -d)"
anvil_pid=""
cleanup() { [ -n "$anvil_pid" ] && kill "$anvil_pid" 2>/dev/null && wait "$anvil_pid" 2>/dev/null; rm -rf "$tmp"; }
trap cleanup EXIT
# Keep this run's broadcast logs out of web3/broadcast (the demo's own logs live there).
export FOUNDRY_BROADCAST="$tmp/broadcast"

anvil --host 127.0.0.1 --port "$port" --chain-id 31337 > "$tmp/anvil.log" 2>&1 &
anvil_pid=$!
for _ in $(seq 1 40); do cast chain-id --rpc-url "$rpc" >/dev/null 2>&1 && break; sleep 0.25; done
[ "$(cast chain-id --rpc-url "$rpc")" = "31337" ] || { echo "anvil did not start" >&2; cat "$tmp/anvil.log" >&2; exit 1; }

fail=0
pass() { printf 'PASS  %-9s %s\n' "$1" "$2"; }
bad()  { printf 'FAIL  %-9s %s\n' "$1" "$2"; fail=1; }
script() { ( cd "$here" && forge script "$@" --rpc-url "$rpc" --broadcast 2>&1 ); }

out="$(DEPLOYER_KEY=$deployer RPC_URL=$rpc DEMO_SKIP_PREFLIGHT=1 DEMO_STATE_DIR="$tmp/state" \
  bash "$here/script/demo-setup.sh" 2>&1)" || { echo "$out" >&2; exit 1; }
anchor="$(sed -n 's/^ANCHOR_ADDRESS=//p' "$tmp/state/demo.env")"
hire="$(sed -n 's/^HIRE_ADDRESS=//p' "$tmp/state/demo.env")"
[ -n "$anchor" ] && [ -n "$hire" ] && pass deploy "anchor $anchor hire $hire" || { bad deploy "no addresses"; exit 1; }

# Fixed test inputs: a salted terms document and a fixed work head.
cat > "$tmp/terms.json" <<'JSON'
{"version":"subsidiary.terms/1","task":"e2e-local fixed test hire","warranty_seconds":604800,
 "salt":"6b69726f7765656e2d6532652d6c6f63616c2d66697865642d73616c742d3031"}
JSON
terms_hash="$(cast keccak "$(jq -S -c . "$tmp/terms.json")")"
head="$(cast keccak "kiroween e2e-local fixed work head")"

out="$(ANCHOR_ADDRESS=$anchor ANCHOR_KEY=$provider HEAD=$head script script/AnchorHead.s.sol)" || { echo "$out" >&2; exit 1; }
[ "$(cast call "$anchor" 'isAnchored(bytes32)(bool)' "$head" --rpc-url "$rpc")" = "true" ] \
  && pass anchor "$head" || bad anchor "head not anchored after AnchorHead"

out="$(ANCHOR_ADDRESS=$anchor HIRE_ADDRESS=$hire CLIENT_KEY=$client PROVIDER_KEY=$provider \
  TERMS_HASH=$terms_hash WORK_HEAD=$head script script/DemoHire.s.sol)" || { echo "$out" >&2; exit 1; }
id="$(cast call "$hire" 'hireCount()(uint256)' --rpc-url "$rpc")"
[ "$id" = "1" ] && pass hire "hire $id created, delivered, confirmed" || bad hire "hireCount $id, want 1"

if bash "$here/script/verify-hire.sh" --rpc "$rpc" --hire "$hire" --id "$id" --terms "$tmp/terms.json" --head "$head"; then
  pass verify "verify-hire.sh exit 0"
else
  bad verify "verify-hire.sh failed"
fi

# The checks must also catch a wrong head and changed terms.
if bash "$here/script/verify-hire.sh" --rpc "$rpc" --hire "$hire" --id "$id" --terms "$tmp/terms.json" \
  --head "$(cast keccak wrong)" >/dev/null; then bad neg-head "wrong head passed"; else pass neg-head "wrong head rejected"; fi
jq '.task = "changed"' "$tmp/terms.json" > "$tmp/terms-changed.json"
if bash "$here/script/verify-hire.sh" --rpc "$rpc" --hire "$hire" --id "$id" --terms "$tmp/terms-changed.json" >/dev/null; then
  bad neg-terms "changed terms passed"; else pass neg-terms "changed terms rejected"; fi

# A record that starts on the public chain: build it (shown, redacted and withheld fields), publish
# it, verify bundle, proofs and entry against the contract, then a changed bundle must fail.
record="$(sed -n 's/^RECORD_ADDRESS=//p' "$tmp/state/demo.env")"
ui="$here/../ui"
rec() { ( cd "$ui" && node --experimental-strip-types --no-warnings=ExperimentalWarning --import ./scripts/ts-resolve.mjs scripts/record.ts "$@" ); }
cat > "$tmp/record.json" <<'JSON'
{"status":"delivered","hire":1,"client":"e2e client name","design":{"patent":"pending"}}
JSON
echo '{"status":"none","hire":"none","client":"private"}' > "$tmp/classes.json"
if rec build --record "$tmp/record.json" --classes "$tmp/classes.json" --bundle "$tmp/bundle.json" --entry "$tmp/entry.json" >/dev/null 2>&1 \
  && RECORD_ADDRESS=$record PUBLISH_KEY=$provider bash "$here/script/publish-record.sh" --rpc "$rpc" --bundle "$tmp/bundle.json" --out "$tmp/public.json" >/dev/null; then
  pass record "record $(jq -r .recordId "$tmp/public.json") published, root $(jq -r .root "$tmp/public.json")"
  if RECORD_ADDRESS=$record bash "$here/script/verify-record.sh" --rpc "$rpc" --record-id "$(jq -r .recordId "$tmp/public.json")" \
    --bundle "$tmp/bundle.json" --entry "$tmp/entry.json"; then pass verify-rec "verify-record.sh exit 0"; else bad verify-rec "verify-record.sh failed"; fi
  jq -c '(.fields[] | select(.path == "status") | .value) = "cancelled"' "$tmp/bundle.json" | jq -S -c . | tr -d '\n' > "$tmp/bundle-changed.json"
  if RECORD_ADDRESS=$record bash "$here/script/verify-record.sh" --rpc "$rpc" --record-id "$(jq -r .recordId "$tmp/public.json")" \
    --bundle "$tmp/bundle-changed.json" >/dev/null; then bad neg-rec "changed bundle passed"; else pass neg-rec "changed bundle rejected"; fi
else
  bad record "build or publish failed"
fi

# The UI's read-only chain client (ui/src/lib/web3/client.ts) against this same node, so its
# decoder meets real ABI encoding. The test is opt-in: offline `npm --prefix ui test` skips it.
ui="$here/../ui"
if [ -x "$ui/node_modules/.bin/vitest" ]; then
  if ( cd "$ui" && WEB3_RPC_URL="$rpc" WEB3_HIRE="$hire" WEB3_ANCHOR="$anchor" WEB3_HEAD="$head" \
    WEB3_TERMS_HASH="$terms_hash" WEB3_TERMS_JSON="$(cat "$tmp/terms.json")" WEB3_CLIENT="$(cast wallet address --private-key "$client")" \
    WEB3_PROVIDER="$(cast wallet address --private-key "$provider")" \
    node_modules/.bin/vitest --run src/lib/web3/client.anvil.test.ts ) > "$tmp/ui-client.log" 2>&1; then
    pass ui-client "client.ts read hire $id and the head"
  else
    cat "$tmp/ui-client.log" >&2; bad ui-client "client.anvil.test.ts failed"
  fi
else
  echo "SKIP  ui-client  ui/node_modules missing; run npm --prefix ui install to include it"
fi

[ "$fail" = 0 ] && echo "e2e-local: all checks passed" || echo "e2e-local: FAILED" >&2
exit $fail
