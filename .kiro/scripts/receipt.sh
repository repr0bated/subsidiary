#!/usr/bin/env bash
# Append a receipt to the local hashchain: sha256(prev_head || sha256(stdin)).
# Stores only hashes. Chain file: .kiro/hashchain.log (head = last line's hash).
set -eu
chain="$(dirname "$0")/../hashchain.log"
touch "$chain"
prev=$(tail -n1 "$chain" | awk '{print $2}')
prev=${prev:-0000000000000000000000000000000000000000000000000000000000000000}
body=$(cat | sha256sum | awk '{print $1}')
head=$(printf '%s%s' "$prev" "$body" | sha256sum | awk '{print $1}')
printf '%s %s %s\n' "$(date -u +%FT%TZ)" "$head" "$body" >> "$chain"
