#!/usr/bin/env bash
# Run the worker agent one item at a time while the machine stays idle.
# Stops when development resumes, when a run changes nothing (everything left is blocked),
# or after WORK_MAX_ITEMS runs. The worker commits after each item and never pushes. WORK_FORCE=1 skips the idle check.
set -u
root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root" || exit 1
export PATH="$HOME/.foundry/bin:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
# Node from nvm at the version pinned in ui/.nvmrc (cron does not read ~/.bashrc).
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use --silent "$(cat "$root/ui/.nvmrc")" >/dev/null
. "$root/.kiro/scripts/toolchain.sh"
export SUBSIDIARY_CREW=1
export ETH_RPC_URL="http://127.0.0.1:8545"   # anvil only
timeout_s="${WORK_AGENT_TIMEOUT:-1800}"
max="${WORK_MAX_ITEMS:-10}"
log="$root/.kiro/state/work-run.log"
mkdir -p "$root/.kiro/state" "$root/docs/reports"
date +%s >"$root/.kiro/state/crew-start"      # idle-check ignores sessions started after this
trap 'rm -f "$root/.kiro/state/crew-start"' EXIT

open_count() {
  { sed -n '/^## Open/,/^## /p' .kiro/backlog.md 2>/dev/null; cat .kiro/specs/*/tasks.md 2>/dev/null; } \
    | grep -c '^[[:space:]]*- \[ \]'
}
snapshot() { { git rev-parse HEAD; git status --porcelain; git diff; cat .kiro/backlog.md; cat .kiro/specs/*/tasks.md; } 2>/dev/null | sha256sum; }   # HEAD: the worker commits
# The live golden release ("<id> <commit>"); a change can unblock items that waited for it.
live_release() { jq -r '"\(.live.id) \(.live.commit[0:7])"' /mnt/@upper/golden-state.json 2>/dev/null; }
seen="$root/.kiro/state/seen-release"
stuck="$root/.kiro/state/no-progress"     # snapshot after a run that changed nothing

for i in $(seq 1 "$max"); do
  [ "$(open_count)" -gt 0 ] || { echo "$(date -u +%FT%TZ) no open work" >>"$log"; exit 0; }
  release=$(live_release)
  message="Complete the next open item now, following your instructions."
  if [ -n "$release" ] && [ "$release" != "$(cat "$seen" 2>/dev/null)" ]; then
    message="The live release changed to $release. Re-check the Blocked items first, as your instructions say, then complete the next open item."
  elif [ "$(snapshot)" = "$(cat "$stuck" 2>/dev/null)" ]; then
    # Everything left was blocked last time and nothing changed since: do not spend another run.
    echo "$(date -u +%FT%TZ) skip: nothing changed since the last run without progress" >>"$log"
    exit 0
  fi
  if [ "${WORK_FORCE:-0}" != 1 ] && ! bash "$root/.kiro/scripts/idle-check.sh" 2>>"$log" >/dev/null; then
    echo "$(date -u +%FT%TZ) stop before item $i: development resumed" >>"$log"
    exit 2
  fi
  before=$(snapshot)
  echo "$(date -u +%FT%TZ) start worker item $i" >>"$log"
  timeout "$timeout_s" kiro-cli chat --agent worker --no-interactive \
    --trust-tools=read,grep,glob,write,shell \
    "$message" >>"$log" 2>&1
  echo "$(date -u +%FT%TZ) end worker item $i rc=$?" >>"$log"
  [ -n "$release" ] && printf '%s\n' "$release" >"$seen"
  if [ "$(snapshot)" = "$before" ]; then
    printf '%s\n' "$before" >"$stuck"
    echo "$(date -u +%FT%TZ) no progress; stopping" >>"$log"
    exit 0
  fi
done
