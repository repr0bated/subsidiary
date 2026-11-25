#!/usr/bin/env bash
# Cron entry point (every 10 minutes). Starts a crew run when the server has been idle
# on two consecutive checks AND the workspace changed since the last run.
# Only one run at a time (flock).
set -u
root="$(cd "$(dirname "$0")/../.." && pwd)"
state="$root/.kiro/state"
mkdir -p "$state"
exec 9>"$state/lock"
flock -n 9 || exit 0

if ! bash "$root/.kiro/scripts/idle-check.sh" >/dev/null 2>&1; then
  rm -f "$state/idle-seen"
  exit 0
fi
if [ ! -e "$state/idle-seen" ]; then      # first idle observation: wait for the next tick
  touch "$state/idle-seen"
  exit 0
fi

last=$(cat "$state/last-run" 2>/dev/null || echo 0)
changed=$(find "$root" \( -path '*/.git' -o -path '*/node_modules' -o -path '*/web3/out' -o -path '*/web3/cache' \
  -o -path '*/web3/lib' -o -path '*/docs/reports' -o -path '*/.kiro/state' -o -name hashchain.log -o -path '*/target' \) -prune \
  -o -type f -newermt "@$last" -print -quit 2>/dev/null)
[ -z "$changed" ] && exit 0               # nothing new since the last run

bash "$root/.kiro/scripts/crew-run.sh"
