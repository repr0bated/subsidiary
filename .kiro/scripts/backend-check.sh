#!/usr/bin/env bash
# Report-only Rust checks of the 3tched backend (odbus-verified), for the crew.
# - Checks a clean, detached worktree at the current `dev` commit; never the live tree.
# - Cargo goes through the golden chroot shim (~/.local/bin/cargo), same as golden builds.
# - One Cargo at a time: skips if Cargo, rustc, Clippy or a golden build is running.
# - Never edits or commits anything in odbus-verified. Writes one report here.
# Owner approval for downtime checks: 2026-11-24.
set -u
root="$(cd "$(dirname "$0")/../.." && pwd)"
repo="${BACKEND_REPO:-/srv/git/odbus-verified}"
tree="${BACKEND_CHECK_TREE:-/srv/git/ov-crew-check}"
ref="${BACKEND_REF:-dev}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
report="$root/docs/reports/$stamp-backend-rust.md"
mkdir -p "$root/docs/reports"
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
export CXXFLAGS="-include cstdint"

busy() {
  pgrep -u 0 -f 'cargo-chroot.sh|build-golden.sh|golden.sh build' >/dev/null 2>&1 && return 0
  pgrep -f '(^|/)(cargo|rustc|clippy-driver)( |$)' >/dev/null 2>&1 && return 0
  return 1
}
if busy; then
  echo "skip: another Cargo or golden build is running"
  exit 3
fi

commit="$(git -C "$repo" rev-parse --verify "$ref^{commit}")" || { echo "no $ref in $repo" >&2; exit 1; }
if [ ! -e "$tree/.git" ]; then
  git -C "$repo" worktree add --detach "$tree" "$commit" >/dev/null 2>&1 || { echo "worktree add failed" >&2; exit 1; }
else
  git -C "$tree" checkout -q --detach "$commit" || { echo "worktree checkout failed" >&2; exit 1; }
  git -C "$tree" clean -qfdx -e target >/dev/null 2>&1 || true
fi

{
  echo "# Backend Rust checks (report only)"
  echo
  echo "- Repo: \`$repo\`, ref \`$ref\`, commit \`$commit\`"
  echo "- Checked in a detached worktree \`$tree\` through the golden chroot Cargo shim"
  echo "- Started: $stamp"
  echo
} > "$report"

run() {
  local name="$1"; shift
  local log; log="$(mktemp)"
  if busy; then
    echo "## $name: skipped (another Cargo started)" >> "$report"; rm -f "$log"; return 3
  fi
  ( cd "$tree" && timeout "${BACKEND_STEP_TIMEOUT:-5400}" "$@" ) >"$log" 2>&1
  local rc=$?
  { echo "## $name: $([ $rc -eq 0 ] && echo pass || echo "FAIL (exit $rc)")"
    echo; echo '```'; tail -n 60 "$log"; echo '```'; echo; } >> "$report"
  rm -f "$log"
  return $rc
}

fail=0
run "cargo fmt --check" cargo fmt --all -- --check || fail=1
run "cargo clippy" cargo clippy --locked --workspace --all-targets --all-features -- -D warnings || fail=1
run "cargo test" cargo test --locked --workspace --all-targets --all-features || fail=1
if cargo audit --version >/dev/null 2>&1; then
  run "cargo audit" cargo audit || fail=1
else
  echo "## cargo audit: not installed" >> "$report"
fi

echo "- Finished: $(date -u +%Y%m%dT%H%M%SZ)" >> "$report"
echo "report: $report"
exit $fail
