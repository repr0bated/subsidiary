#!/usr/bin/env bash
# Put this project's toolchain first on PATH: Foundry, and Node 22 (the system Node is 20; the UI needs 22).
# Usage: . .kiro/scripts/toolchain.sh   (or: bash .kiro/scripts/toolchain.sh <command...>)
node22="$(ls -d "$HOME"/.local/share/fnm/node-versions/v22.*/installation/bin 2>/dev/null | sort -V | tail -1)"
export PATH="$HOME/.foundry/bin${node22:+:$node22}:$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
if [ "${BASH_SOURCE[0]}" = "$0" ] && [ $# -gt 0 ]; then exec "$@"; fi
