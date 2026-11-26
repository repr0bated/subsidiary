#!/usr/bin/env bash
# Cron entry point (every 5 minutes).
# 1. Idle for 15 min (idle-check.sh) and open work in .kiro/backlog.md or spec tasks: run the worker (work-run.sh).
# 2. Then a crew run when idle on two consecutive checks AND the workspace changed since the last run,
#    or, as fallback work when everything is blocked, at least every CREW_FALLBACK_S seconds.
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
bash "$root/.kiro/scripts/work-run.sh" || exit 0   # rc 2: development resumed
if [ ! -e "$state/idle-seen" ]; then      # first idle observation: wait for the next tick
  touch "$state/idle-seen"
  exit 0
fi

last=$(cat "$state/last-run" 2>/dev/null || echo 0)
changed=$(find "$root" \( -path '*/.git' -o -path '*/node_modules' -o -path '*/web3/out' -o -path '*/web3/cache' \
  -o -path '*/web3/lib' -o -path '*/docs/reports' -o -path '*/.kiro/state' -o -name hashchain.log -o -path '*/target' \) -prune \
  -o -type f -newermt "@$last" -print -quit 2>/dev/null)
# Nothing new since the last crew run: still run the checks (tests, Rust lint) as fallback
# work once every CREW_FALLBACK_S seconds (default 3 hours), so a fully blocked queue
# keeps the crew checking instead of idling.
if [ -z "$changed" ] && [ $(( $(date +%s) - last )) -lt "${CREW_FALLBACK_S:-10800}" ]; then
  exit 0
fi

bash "$root/.kiro/scripts/crew-run.sh"
