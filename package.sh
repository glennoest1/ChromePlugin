#!/usr/bin/env bash
set -euo pipefail

extension_dir="bug-black-box"
dist_dir="dist"

usage() {
  cat <<'EOF'
Usage: bash package.sh [--extension-dir DIR] [--dist-dir DIR]

Builds a Chrome Web Store zip package from the extension manifest version.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --extension-dir)
      extension_dir="${2:-}"
      shift 2
      ;;
    --dist-dir)
      dist_dir="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
extension_path="$script_dir/$extension_dir"
dist_path="$script_dir/$dist_dir"
manifest_path="$extension_path/manifest.json"
staging_path="$dist_path/_package-staging"

if [[ -z "$extension_dir" || -z "$dist_dir" ]]; then
  echo "--extension-dir and --dist-dir must not be empty." >&2
  exit 2
fi

if [[ ! -d "$extension_path" ]]; then
  echo "Extension directory not found: $extension_path" >&2
  exit 1
fi

if [[ ! -f "$manifest_path" ]]; then
  echo "Manifest not found: $manifest_path" >&2
  exit 1
fi

python_bin=""
if command -v python3 >/dev/null 2>&1; then
  python_bin="python3"
elif command -v python >/dev/null 2>&1; then
  python_bin="python"
else
  echo "Python 3 is required to read manifest.json and create the zip archive." >&2
  exit 1
fi

version="$("$python_bin" - "$manifest_path" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as manifest_file:
    version = json.load(manifest_file).get("version")

if not version:
    raise SystemExit("manifest.json must include a version.")

print(version)
PY
)"

package_name="bug-black-box-v${version}.zip"
package_path="$dist_path/$package_name"

rm -rf -- "$staging_path"
mkdir -p -- "$staging_path"

"$python_bin" - "$extension_path" "$staging_path" <<'PY'
import fnmatch
import shutil
import sys
from pathlib import Path

extension_path = Path(sys.argv[1])
staging_path = Path(sys.argv[2])
exclude_directories = {".git", ".task", "docs", "dist", "scripts"}
exclude_files = ("*.ps1", "*.sh", "*.md", "*.map")

for item in extension_path.iterdir():
    if item.is_dir():
        if item.name in exclude_directories:
            continue
        shutil.copytree(item, staging_path / item.name, dirs_exist_ok=True)
        continue

    if any(fnmatch.fnmatch(item.name, pattern) for pattern in exclude_files):
        continue

    shutil.copy2(item, staging_path / item.name)
PY

rm -f -- "$package_path"

"$python_bin" - "$staging_path" "$package_path" <<'PY'
import sys
import zipfile
from pathlib import Path

staging_path = Path(sys.argv[1])
package_path = Path(sys.argv[2])

with zipfile.ZipFile(package_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for item in sorted(staging_path.rglob("*")):
        if item.is_file():
            archive.write(item, item.relative_to(staging_path).as_posix())
PY

rm -rf -- "$staging_path"

echo "Created $package_path"
