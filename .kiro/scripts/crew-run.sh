#!/usr/bin/env bash
# Run the crew (validator, tester, rust-housekeeping) in order.
# CREW_FORCE=1 skips the idle checks (used by the "Crew now" hook).
# Re-checks idleness before each agent and stops as soon as development resumes.
# Each agent writes its report to docs/reports/. Agents fix lint/test errors; they never commit or push.
set -u
root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root" || exit 1
export PATH="$HOME/.foundry/bin:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
. "$root/.kiro/scripts/toolchain.sh"
export SUBSIDIARY_CREW=1
export ETH_RPC_URL="http://127.0.0.1:8545"   # anvil only
timeout_s="${CREW_AGENT_TIMEOUT:-1800}"
log="$root/.kiro/state/crew-run.log"
mkdir -p "$root/.kiro/state" "$root/docs/reports"
date +%s >"$root/.kiro/state/crew-start"
trap 'rm -f "$root/.kiro/state/crew-start"' EXIT

for agent in validator tester rust-housekeeping; do
  if [ "${CREW_FORCE:-0}" != 1 ] && ! bash "$root/.kiro/scripts/idle-check.sh" 2>>"$log" >/dev/null; then
    echo "$(date -u +%FT%TZ) stop before $agent: development resumed" >>"$log"
    exit 2
  fi
  if [ "$agent" = rust-housekeeping ]; then
    echo "$(date -u +%FT%TZ) start backend-check" >>"$log"
    bash "$root/.kiro/scripts/backend-check.sh" >>"$log" 2>&1
    echo "$(date -u +%FT%TZ) end backend-check rc=$?" >>"$log"
  fi
  echo "$(date -u +%FT%TZ) start $agent" >>"$log"
  timeout "$timeout_s" kiro-cli chat --agent "$agent" --no-interactive \
    --trust-tools=read,grep,glob,write,shell \
    "Run your full checklist now. Write your report to docs/reports/." >>"$log" 2>&1
  echo "$(date -u +%FT%TZ) end $agent rc=$?" >>"$log"
done
date +%s >"$root/.kiro/state/last-run"
