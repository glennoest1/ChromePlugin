---
name: docs-first-workflow
description: Project-local workflow for Bug Black Box agents. Use when starting any implementation in this repository, changing source code, adding or changing features, editing docs, or maintaining GitHub Copilot cloud agent hooks under .github/hooks. Requires reading docs/ before source code and updating docs/ after documented behavior changes.
---

# Docs First Workflow

## Purpose

Use this skill to work safely in the Bug Black Box repository. Treat `docs/` as the project contract, source code as implementation evidence, and `.github/hooks/` as enforcement for Copilot cloud agents.

## Required Start Sequence

Before inspecting or editing source files:

1. Read `docs/README.md`.
2. Read the docs file most relevant to the requested task:
   - product behavior: `docs/product-spec.md`
   - architecture or permissions: `docs/tech-architecture.md`
   - storage/report shape: `docs/data-model.md`
   - UI states: `docs/ui-spec.md`
   - user journeys: `docs/user-flows.md`
   - privacy/security: `docs/privacy-security.md`
   - tests/demo behavior: `docs/testing-and-demo.md`
   - requirements IDs: `docs/functional-requirements.md`
3. Only then inspect source under `bug-black-box/` or `test-page.html`.
4. If docs and source disagree, state the mismatch before changing code.

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

## Hook Locations

GitHub Copilot cloud agent hooks live here:

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
