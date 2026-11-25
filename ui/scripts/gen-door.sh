#!/usr/bin/env bash
# Generate the door's TypeScript client from the backend's own operation.proto at a pinned commit.
# The proto is never copied into this repository; generated files are not committed.
#   BACKEND_REPO   path to the 3tched backend checkout (default /srv/git/odbus-verified)
#   DOOR_PROTO_REF git commit of that checkout to generate from (see door-proto.ref)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
repo="${BACKEND_REPO:-/srv/git/odbus-verified}"
ref="${DOOR_PROTO_REF:-$(tr -d '[:space:]' < "$here/door-proto.ref")}"
src="crates/op-grpc-bridge/proto/operation.proto"
out="$here/src/lib/door/gen"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
git -C "$repo" show "$ref:$src" > "$tmp/operation.proto"
rm -rf "$out"; mkdir -p "$out"
( cd "$tmp" && npx --prefix "$here" protoc --ts_out "$out" --ts_opt long_type_string --ts_opt eslint_disable --ts_opt ts_nocheck --proto_path . operation.proto )
echo "generated from $repo@$ref:$src"
