# Cleanup Scan Categories

Use these category rules during Step 3 of the cleanup skill.

## A - Unused Imports

- JS/TS/Vue: use the repo ESLint config when present; otherwise use a minimal unused-vars ESLint run.
- Python: use `ruff check --select F401`.
- Go: use `goimports -l`.
- Record as `file:line - unused import: <name>`.

## B - Commented-Out Code

- Find 3+ consecutive comment lines that contain code-like syntax.
- Also check multi-line `/* ... */` blocks spanning 3+ lines.
- Record the block start as `file:line - commented-out code block (N lines)`.

## C - Debug Artifacts

- Auto-fixable after confirmation: `console.log`, `console.debug`, `debugger`, Python `print`, `breakpoint()`, Ruby `binding.pry` / `byebug`.
- Manual review only: `TODO`, `FIXME`, `HACK`, and deliberate production logging.
- Record as `file:line - debug: <matched text>` or `file:line - review debug/logging usage: <matched text>`.

## D - Dead Exports

- Collect exported symbols and check whole-project references.
- Do not report symbols referenced by non-test files outside the source file.
- Report test-only references as `test-only export`.
- Report same-file-only references as `export can likely be de-exported`.
- Report unreferenced symbols as `dead export`.
- Treat framework auto-import conventions as manual review.

## E - Stale Suppression Directives

- Search for `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `type: ignore`, and `noqa`.
- Report each as manual review only.
- Never auto-delete suppression directives.

## F - Empty Files

- Search source files with no meaningful non-comment content.
- Report as `path/to/file - empty file`.
- Confirm each file individually before deleting.

## G - Unused Packages

- JS/TS: use `depcheck` only as a candidate generator.
- Python: search imports for each dependency.
- Go: tell the user to run `go mod tidy -v`; do not modify `go.mod` silently.
- Before reporting JS/TS packages, check framework config, scripts, hooks, CSS entrypoints, tests, and build tooling.
- Never auto-remove packages; provide the removal command.

## H - Stale Feature Flags

- Search for hardcoded feature-flag style names such as `ENABLE_`, `FF_`, `FEATURE_`, `FLAG_`, and `USE_`.
- Report hardcoded values as manual review.

## I - Unreferenced Pages / Routes

- Run only for Nuxt or Next projects.
- Derive routes from page files and search for route references.
- Treat dynamic routes and programmatic navigation as likely false positives.
- Report as manual review only.
