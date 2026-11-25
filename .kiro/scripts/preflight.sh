#!/usr/bin/env bash
# Preflight: anvil reachable on 8545; live schema readable through FUSE (if mounted).
# Set SUBSIDIARY_FUSE_SCHEMA to the schema path under the FUSE mount to enforce the second check.
set -u
fail=0

resp=$(curl -s -m 3 -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://127.0.0.1:8545 || true)
if echo "$resp" | grep -q '"0x7a69"'; then
  echo "ok: anvil reachable on 8545 (chain 31337)"
else
  echo "FAIL: anvil not reachable on 8545 or wrong chain id. Start it with: anvil" >&2
  fail=1
fi

# The identity's only path to the backend. Losing it is what sank the Meta hackathon demo.
for view in /run/mounts/3tchedFS /run/mounts/threetched; do
  if mountpoint -q "$view" && [ -r "$view/view.json" ]; then
    echo "ok: FUSE view $view mounted"
  else
    echo "FAIL: FUSE view $view missing or unreadable" >&2
    fail=1
  fi
done

if [ -n "${SUBSIDIARY_FUSE_SCHEMA:-}" ]; then
  if [ -r "$SUBSIDIARY_FUSE_SCHEMA" ]; then
    echo "ok: live schema readable via FUSE"
  else
    echo "FAIL: cannot read $SUBSIDIARY_FUSE_SCHEMA" >&2
    fail=1
  fi
else
  echo "skip: SUBSIDIARY_FUSE_SCHEMA not set (no container/FUSE yet)"
fi

exit $fail
