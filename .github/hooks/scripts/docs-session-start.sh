#!/usr/bin/env bash
set -euo pipefail

repo_root="$(pwd)"
state_dir="$repo_root/.github/hooks/.state"

mkdir -p "$state_dir"
rm -f "$state_dir/docs-reviewed"

exit 0
