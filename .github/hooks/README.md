# GitHub Copilot Hooks

This folder uses the GitHub Copilot cloud agent hook format:

- hook config: `.github/hooks/docs-first.json`
- hook scripts: `.github/hooks/scripts/*.sh`
- runtime state: `.github/hooks/.state/` (gitignored)

The hooks enforce the project workflow:

1. Read `docs/` before inspecting or editing source.
2. If source changes a feature or behavior, update `docs/` before finishing.
3. If a source change does not affect documented behavior, explicitly acknowledge it.

## Files

| File | Purpose |
| --- | --- |
| `docs-first.json` | GitHub Copilot hook config with `version: 1`. |
| `scripts/docs-session-start.sh` | Clears the docs-reviewed marker at session start. |
| `scripts/docs-first.sh` | Blocks source/codebase tools until `docs/` has been read. |
| `scripts/docs-update-required.sh` | Creates a docs-update checkpoint after source edits. |
| `scripts/docs-stop-check.sh` | Blocks agent stop until docs are updated or checkpoint is acknowledged. |
| `scripts/test-docs-hooks.sh` | Local smoke test for the hook flow. |

## Local Smoke Test

Run from the repository root:

```sh
bash .github/hooks/scripts/test-docs-hooks.sh
```

## Acknowledge No Docs Needed

Use only when the source edit does not add, remove, or change documented behavior:

```sh
bash .github/hooks/scripts/docs-update-required.sh --acknowledge-no-docs
```

## Notes For Teammates

- The config file must be committed under `.github/hooks/` on the default branch before Copilot cloud agent can use it.
- Cloud agent runs hooks in a Linux sandbox, so the config intentionally uses only the `bash` key.
- Scripts emit one compact JSON object on stdout when they need to influence the agent, matching GitHub's hook contract.
