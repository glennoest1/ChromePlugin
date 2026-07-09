#!/usr/bin/env bash
set -euo pipefail

repo_root="$(pwd)"
marker="$repo_root/.github/hooks/.state/docs-update-required"
docs_dir="$repo_root/docs"

if [[ ! -f "$marker" ]]; then
  exit 0
fi

if [[ -d "$docs_dir" ]] && find "$docs_dir" -type f -newer "$marker" | grep -q .; then
  rm -f "$marker"
  exit 0
fi

printf '%s\n' '{"decision":"block","reason":"Docs update checkpoint blocked completion. Source changed after the last docs update. If the change introduced or changed a feature, update docs/ first. If it did not, run: bash .github/hooks/scripts/docs-update-required.sh --acknowledge-no-docs"}'
