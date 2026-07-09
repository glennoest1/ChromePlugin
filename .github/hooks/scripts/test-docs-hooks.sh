#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
state_dir="$repo_root/.github/hooks/.state"
reviewed_marker="$state_dir/docs-reviewed"
update_marker="$state_dir/docs-update-required"

cd "$repo_root"
mkdir -p "$state_dir"
rm -f "$reviewed_marker" "$update_marker"

assert_contains() {
  haystack="$1"
  needle="$2"
  label="$3"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "FAIL $label"
    echo "Expected to find: $needle"
    echo "Actual: $haystack"
    exit 1
  fi
  echo "PASS $label"
}

assert_file_exists() {
  path="$1"
  label="$2"
  if [[ ! -f "$path" ]]; then
    echo "FAIL $label"
    exit 1
  fi
  echo "PASS $label"
}

assert_file_missing() {
  path="$1"
  label="$2"
  if [[ -f "$path" ]]; then
    echo "FAIL $label"
    exit 1
  fi
  echo "PASS $label"
}

blocked="$(printf '%s' '{"toolName":"view","toolArgs":{"file_path":"bug-black-box/background.js"}}' | bash .github/hooks/scripts/docs-first.sh)"
assert_contains "$blocked" '"permissionDecision":"deny"' "docs-first blocks source before docs review"

printf '%s' '{"toolName":"view","toolArgs":{"file_path":"docs/README.md"}}' | bash .github/hooks/scripts/docs-first.sh >/dev/null
assert_file_exists "$reviewed_marker" "docs-first records docs review"

context="$(printf '%s' '{"toolName":"edit","toolArgs":{"file_path":"bug-black-box/background.js"}}' | bash .github/hooks/scripts/docs-update-required.sh)"
assert_contains "$context" '"additionalContext"' "docs-update-required returns additional context"
assert_file_exists "$update_marker" "docs-update-required creates marker"

stop_block="$(bash .github/hooks/scripts/docs-stop-check.sh)"
assert_contains "$stop_block" '"decision":"block"' "docs-stop-check blocks stale docs"

bash .github/hooks/scripts/docs-update-required.sh --acknowledge-no-docs >/dev/null
assert_file_missing "$update_marker" "acknowledge clears marker"

allow_stop="$(bash .github/hooks/scripts/docs-stop-check.sh || true)"
if [[ -n "$allow_stop" ]]; then
  echo "FAIL docs-stop-check allows completion after acknowledge"
  echo "Actual: $allow_stop"
  exit 1
fi
echo "PASS docs-stop-check allows completion after acknowledge"

rm -f "$reviewed_marker" "$update_marker"
