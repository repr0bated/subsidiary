#!/usr/bin/env bash
# Report-only Rust checks of the 3tched backend (odbus-verified), for the crew.
# - Checks a clean, detached worktree at the current `dev` commit; never the live tree.
# - Cargo goes through the golden chroot shim (~/.local/bin/cargo), same as golden builds.
# - One Cargo at a time: skips if Cargo, rustc, Clippy, a golden build or a queued golden deploy
#   is running, or less than BACKEND_MIN_AVAIL_GIB (12) GiB is available. Builds with one job.
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
# One compiler job and two test threads: a parallel workspace test run filled 31 GiB RAM and
# 22 GiB swap and got processes OOM-killed (2026-11-25).
export CARGO_BUILD_JOBS=1 RUST_TEST_THREADS=2
min_avail_kb=$(( ${BACKEND_MIN_AVAIL_GIB:-12} * 1024 * 1024 ))

busy() {
  # A queued or running golden deploy goes first (it waits for Cargo to be free).
  pgrep -f 'cargo-chroot.sh|build-golden.sh|golden.sh build|golden-deploy-' >/dev/null 2>&1 && return 0
  pgrep -f '(^|/)(cargo|rustc|clippy-driver)( |$)' >/dev/null 2>&1 && return 0
  # Too little free memory for even one rustc of this workspace (3-4 GB each).
  [ "$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)" -lt "$min_avail_kb" ] && return 0
  return 1
}
if busy; then
  echo "skip: another Cargo or golden build is running, or memory is low"
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
run "cargo clippy" cargo clippy -j 1 --locked --workspace --all-targets --all-features -- -D warnings || fail=1
run "cargo test" cargo test -j 1 --locked --workspace --all-targets --all-features || fail=1
if cargo audit --version >/dev/null 2>&1; then
  run "cargo audit" cargo audit || fail=1
else
  echo "## cargo audit: not installed" >> "$report"
fi

echo "- Finished: $(date -u +%Y%m%dT%H%M%SZ)" >> "$report"
echo "report: $report"
exit $fail
