#!/usr/bin/env bash
set -euo pipefail

repo_root="$(pwd)"
state_dir="$repo_root/.github/hooks/.state"
marker="$state_dir/docs-update-required"

mkdir -p "$state_dir"

if [[ "${1:-}" == "--acknowledge-no-docs" ]]; then
  rm -f "$marker"
  printf '%s\n' '{"additionalContext":"Docs update checkpoint cleared because this source change was acknowledged as not affecting documented behavior."}'
  exit 0
fi

payload="$(cat || true)"

HOOK_PAYLOAD="$payload" python3 - "$repo_root" "$marker" <<'PY'
import json
import os
import sys
import time
from pathlib import Path

repo_root = Path(sys.argv[1]).resolve()
marker = Path(sys.argv[2])
payload = os.environ.get("HOOK_PAYLOAD", "")

source_roots = [
    repo_root / "bug-black-box",
]
source_files = [
    repo_root / "test-page.html",
]
ignored_roots = [
    repo_root / "docs",
    repo_root / ".github" / "hooks",
    repo_root / ".task",
]

def compact_json(value):
    print(json.dumps(value, separators=(",", ":")))

def parse_maybe_json(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return {}
    return value if isinstance(value, dict) else {}

def full_path(value):
    if not value:
        return None
    path = Path(str(value))
    if not path.is_absolute():
        path = repo_root / path
    try:
        return path.resolve()
    except Exception:
        return path.absolute()

def is_under(path, parent):
    if path is None:
        return False
    try:
        path.relative_to(parent.resolve())
        return True
    except ValueError:
        return path == parent.resolve()

def collect_paths(tool_args):
    paths = []
    if not isinstance(tool_args, dict):
        return paths
    for key in ("file_path", "path", "notebook_path"):
        if tool_args.get(key):
            paths.append(tool_args[key])
    return paths

def is_source_path(path):
    if path is None:
        return False
    if any(is_under(path, root) for root in ignored_roots):
        return False
    if any(is_under(path, root) for root in source_roots):
        return True
    return any(path == file.resolve() for file in source_files)

try:
    data = json.loads(payload) if payload.strip() else {}
except Exception:
    data = {}

tool_args = parse_maybe_json(data.get("toolArgs", data.get("tool_input", {})))
changed_source = [str(path) for path in (full_path(p) for p in collect_paths(tool_args)) if is_source_path(path)]

if changed_source:
    marker.write_text(
        "Docs update required since %s\nSource files changed:\n%s\n"
        % (time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "\n".join(f"- {p}" for p in changed_source)),
        encoding="utf-8",
    )
    compact_json({
        "additionalContext": (
            "Source files changed. If this introduced or changed a feature, user flow, UI state, data model, "
            "permission, privacy behavior, report format, integration, or testing expectation, update docs/ before finishing."
        )
    })
PY
