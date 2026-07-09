#!/usr/bin/env bash
set -euo pipefail

repo_root="$(pwd)"
state_dir="$repo_root/.github/hooks/.state"
reviewed_marker="$state_dir/docs-reviewed"

mkdir -p "$state_dir"

if [[ -f "$reviewed_marker" ]]; then
  exit 0
fi

payload="$(cat || true)"

HOOK_PAYLOAD="$payload" python3 - "$repo_root" "$reviewed_marker" <<'PY'
import json
import os
import sys
from pathlib import Path

repo_root = Path(sys.argv[1]).resolve()
reviewed_marker = Path(sys.argv[2])
docs_dir = (repo_root / "docs").resolve()
payload = os.environ.get("HOOK_PAYLOAD", "")

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
        path.relative_to(parent)
        return True
    except ValueError:
        return path == parent

def collect_paths(tool_args):
    paths = []
    if not isinstance(tool_args, dict):
        return paths
    for key in ("file_path", "path", "notebook_path"):
        if tool_args.get(key):
            paths.append(tool_args[key])
    command = tool_args.get("command")
    if isinstance(command, str) and ("docs/" in command or "docs\\" in command):
        paths.append("docs")
    return paths

try:
    data = json.loads(payload) if payload.strip() else {}
except Exception:
    data = {}

tool_args = parse_maybe_json(data.get("toolArgs", data.get("tool_input", {})))
paths = [full_path(path) for path in collect_paths(tool_args)]

if any(is_under(path, docs_dir) for path in paths):
    reviewed_marker.write_text("docs reviewed\n", encoding="utf-8")
    sys.exit(0)

compact_json({
    "permissionDecision": "deny",
    "permissionDecisionReason": (
        "Docs-first workflow blocked this tool call. Read docs/README.md and the relevant docs/*.md files before "
        "inspecting or changing the codebase. After reading docs/, retry the original tool call."
    )
})
PY
