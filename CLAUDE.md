# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. Docs-First Project Workflow

Before project work, read the local workflow skill:
- `.skill/docs-first-workflow/SKILL.md`

Before touching the codebase:
- Read `docs/README.md` first.
- Read the docs file(s) relevant to the requested work before inspecting or editing source files.
- Use the docs as the project contract. If the docs and code disagree, identify the mismatch before changing code.

While implementing:
- Keep code changes scoped to the requested behavior.
- Do not add features that are not represented in the request or existing docs.

After source changes:
- If a change adds, removes, or changes a feature, user flow, UI state, data model, permission, privacy behavior, report format, integration, or testing expectation, update the relevant file under `docs/` in the same work session.
- If the source change does not affect documented behavior, explicitly acknowledge that no docs update is needed.

GitHub Copilot cloud agent hooks enforce this workflow. Hook config follows GitHub's `version: 1` format in `.github/hooks/docs-first.json`, and all hook scripts are Bash scripts under `.github/hooks/scripts/`. See `.skill/docs-first-workflow/SKILL.md` and `.github/hooks/README.md` before changing hook behavior.

- `.github/hooks/scripts/docs-first.sh` blocks source/codebase tools until `docs/` has been reviewed.
- `.github/hooks/scripts/docs-update-required.sh` marks docs as needing review after source edits.
- `.github/hooks/scripts/docs-stop-check.sh` blocks completion until docs are updated, or until a no-docs-needed source change is acknowledged with:

```sh
bash .github/hooks/scripts/docs-update-required.sh --acknowledge-no-docs
```
