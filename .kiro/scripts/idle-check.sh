#!/usr/bin/env bash
# Exit 0 only when no one has been working for IDLE_MINUTES (default 15)
# and no Cargo or golden build is running.
# Looks at sessions and when the last command was made, not at load:
#   - logged-in ttys (ssh, console): time since the last keystroke (tty input time)
#   - Kiro sessions (CLI, IDE, Crew): time since the last message or command in ~/.kiro/sessions
#   - other coding agents (omp, Claude Code, Codex, Grok): a session transcript written in the window
# Sessions created after the current crew run started (.kiro/state/crew-start) are the crew's own and are ignored.
# Prints the reason to stderr when busy.
set -u
mins="${IDLE_MINUTES:-15}"
limit=$(( mins * 60 ))
now=$(date +%s)

busy() { echo "busy: $*" >&2; exit 1; }

# 1. Logged-in terminals: last input time.
while read -r _ tty _; do
  [ -n "${tty:-}" ] && [ -e "/dev/$tty" ] || continue
  age=$(( now - $(stat -c %X "/dev/$tty" 2>/dev/null || echo 0) ))
  [ "$age" -lt "$limit" ] && busy "tty $tty: last command $(( age / 60 )) min ago"
done < <(who)

# 2. Kiro sessions: newest message/history write, skipping sessions the crew itself started.
newest=0; newest_file=""
crew_start=$(cat "$(dirname "$0")/../state/crew-start" 2>/dev/null || echo 0)
while IFS= read -r -d '' f; do
  if [ "$crew_start" -gt 0 ]; then
    born=$(stat -c %W "$f" 2>/dev/null || echo 0)
    sdir=$(dirname "$f"); sborn=$(stat -c %W "$sdir" 2>/dev/null || echo 0)
    [ "$born" -ge "$crew_start" ] || [ "$sborn" -ge "$crew_start" ] && continue
  fi
  m=$(stat -c %Y "$f" 2>/dev/null || echo 0)
  [ "$m" -gt "$newest" ] && { newest=$m; newest_file=$f; }
done < <(find "$HOME/.kiro/sessions" -type f \( -name 'messages.jsonl' -o -name '*.history' \) -print0 2>/dev/null)
if [ "$newest" -gt 0 ]; then
  age=$(( now - newest ))
  [ "$age" -lt "$limit" ] && busy "kiro session: last command $(( age / 60 )) min ago (${newest_file##*/})"
fi

# 3. Other coding agents. They can work for long stretches in a terminal nobody types into, so
#    tty input time misses them; their session transcripts do not.
for d in "$HOME/.omp/agent/sessions" "$HOME/.claude/projects" "$HOME/.codex/sessions" "$HOME/.grok/sessions"; do
  [ -d "$d" ] || continue
  while IFS= read -r -d '' f; do
    [ "$crew_start" -gt 0 ] && [ "$(stat -c %W "$f" 2>/dev/null || echo 0)" -ge "$crew_start" ] && continue
    busy "agent session ${f#"$HOME"/}: written in the last $mins min"
  done < <(find "$d" -type f -name '*.jsonl' -mmin "-$mins" -print0 2>/dev/null)
done

# 4. A running Cargo/rustc/Clippy or golden build means the machine is busy (single-Cargo rule).
if pgrep -f 'cargo-chroot.sh|build-golden.sh|golden.sh build|golden-deploy-' >/dev/null 2>&1 \
   || pgrep -f '(^|/)(cargo|rustc|clippy-driver)( |$)' >/dev/null 2>&1; then
  busy "a Cargo or golden build is running"
fi

echo "idle: no command in the last $mins min"
exit 0
