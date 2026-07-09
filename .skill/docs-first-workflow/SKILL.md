---
name: docs-first-workflow
description: Project-local workflow for Bug Black Box agents. Use when starting any implementation in this repository, changing source code, adding or changing features, editing docs, or maintaining GitHub Copilot cloud agent hooks under .github/hooks. Requires reading docs/ before source code and updating docs/ after documented behavior changes.
---

# Docs First Workflow

## Purpose

Use this skill to work safely in the Bug Black Box repository. Treat `docs/` as the project contract, source code as implementation evidence, and `.github/hooks/` as enforcement for Copilot cloud agents.

## Required Start Sequence

Before inspecting or editing source files:

1. Read the root guide at `docs/README.md`.
2. **Dynamically discover available documentation**: Run filesystem listing tools (e.g. `list_dir`) on the `docs/` folder recursively to locate available domain directories (e.g., `docs/product/`, `docs/architecture/`, `docs/data/`, `docs/ui/`, `docs/security/`, `docs/testing/`).
3. **Select and read the most relevant files**: Identify the documents matching the domain of your task.
   - *Strict Version Rule*: If multiple versioned files exist for a spec (e.g., `docs/ui/v1-ui-spec.md` and `docs/ui/v2-ui-spec.md`), you **must** select and read the file with the highest version prefix (e.g., `v2-ui-spec.md`).
4. Only then inspect source under `bug-black-box/` or `test-page.html`.
5. If docs and source disagree, state the mismatch before changing code.

## Implementation Rule

Keep every code edit traceable to the user request and the existing docs. Do not add speculative behavior that is not requested or already documented.

After source changes, update `docs/` in the same session when the change adds, removes, or changes any of these:

- feature behavior
- user flow
- UI state or user-facing copy with behavioral meaning
- data model, report format, storage key, or event schema
- Chrome permission or integration boundary
- privacy/security behavior
- testing or demo expectation

If a source change does not affect documented behavior, explicitly acknowledge that no docs update is needed.

### ⚠️ Strict Document Versioning Rule
* **Do not edit, modify, or append** directly to any existing versioned document (e.g., `docs/ui/v1-ui-spec.md` must never be modified).
* **Create a new file** in the same domain subdirectory with the version number incremented in the filename (e.g., write to a new file `docs/ui/v1.1-ui-spec.md` or `docs/ui/v1.2-ui-spec.md` depending on the update, since we are in Phase 1).
* State the differences, additions, and deprecations compared to the previous version at the beginning of the new file.

## Hook Locations

```text
.github/hooks/docs-first.json
.github/hooks/scripts/docs-session-start.sh
.github/hooks/scripts/docs-first.sh
.github/hooks/scripts/docs-update-required.sh
.github/hooks/scripts/docs-stop-check.sh
.github/hooks/scripts/test-docs-hooks.sh
```

Runtime state lives in `.github/hooks/.state/` and must stay gitignored.

## Hook Maintenance

When changing hooks:

1. Keep the config in GitHub's `version: 1` hook format.
2. Keep scripts as `.sh` files because Copilot cloud agent runs hooks in a Linux sandbox.
3. Emit compact one-line JSON on stdout only when the hook needs to influence the agent.
4. Keep `docs-first.sh` responsible for docs-before-code enforcement.
5. Keep `docs-update-required.sh` responsible for marking source edits that may require docs updates.
6. Keep `docs-stop-check.sh` responsible for blocking completion until docs are updated or acknowledged.
7. Update `CLAUDE.md` if hook paths, commands, or workflow semantics change.

## Validation

After editing hooks, validate from the repository root:

```sh
bash .github/hooks/scripts/test-docs-hooks.sh
```

On Windows without a normal `bash` in PATH, run through Git Bash:

```powershell
$repo = (Resolve-Path .).Path -replace '\\','/'
& "C:\Program Files\Git\bin\bash.exe" --login -c "cd '$repo' && bash .github/hooks/scripts/test-docs-hooks.sh"
```

Expected smoke-test coverage:

- blocks source access before docs review
- records docs review
- creates a docs-update marker after source edit
- blocks completion while docs are stale
- clears the marker with no-docs-needed acknowledgement
- allows completion after acknowledgement

## Acknowledge No Docs Needed

Use this only when a source edit does not affect documented behavior:

```sh
bash .github/hooks/scripts/docs-update-required.sh --acknowledge-no-docs
```

## Auto-Synchronization

To ensure that the file listings under `Hook Locations` remain up-to-date as the codebase evolves, run the sync script:

```sh
node .skill/docs-first-workflow/update-skill.js
```
