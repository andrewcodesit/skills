---
name: cleanup
description: >
  Scan the repo for dead code, debug artifacts, and other cruft. Reports findings with
  file:line citations, then applies fixes category by category with user confirmation.
  Use when the user says "cleanup", "clean up", "dead code", "remove todos",
  "purge debug logs", "remove console logs", "unused imports", "/cleanup",
  "remove commented code", "clean the repo", or "repo hygiene".
---

# Cleanup

## Overview

Scan the repo for cleanup opportunities across 9 categories, report every finding with `file:line`, then apply fixes interactively — one category at a time, only after the user confirms.

Before offering any cleanup action, verify whether a finding is a real issue or a framework / docs / test false positive. The skill should prefer fewer, high-confidence findings over noisy reports.

Write the full cleanup scan and cleanup plan to a global markdown artifact instead of dumping it into the terminal.
The terminal should stay clean: show only the file path link to the artifact, plus the minimal follow-up prompt needed for confirmation.

**Announce at start:** "Running cleanup scan..."

Args: `[--branch | --full]`
- `--branch` (default): scan only files changed on the current branch vs the base branch
- `--full`: scan the entire working tree

Artifact location:
- `~/.agents/cleanup-plans/<repo>/<slug>-cleanup-plan.md`
- `slug` should prefer: issue/ticket key if present → current branch name → repo name, kebab-cased
- include frontmatter: `date`, `repo`, `branch`, `mode`

Terminal behavior:
- Never print the full cleanup report body in the terminal
- After writing the artifact, print only a single file path link to the markdown file
- Then ask the minimal confirmation question(s) for fixable categories, without repeating the full report

---

## Step 1: Determine Scope

**Detect the file list to scan:**

```bash
# --branch mode (default)
BASE=$(git merge-base HEAD main 2>/dev/null \
  || git merge-base HEAD master 2>/dev/null \
  || git rev-parse origin/HEAD 2>/dev/null)
git diff "$BASE"...HEAD --name-only
```

For `--full` mode: use the working tree root.

**Skip these always:**
- `*.generated.*`, `*.min.*`, `*.lock`, `*.snap`
- `dist/`, `build/`, `vendor/`, `node_modules/`, `.next/`, `__pycache__/`
- Binary files

If the file list is empty in `--branch` mode: warn "No changed files found vs base. Try `--full` to scan the whole repo." and stop.

---

## Step 2: Detect Tech Stack

```bash
ls package.json go.mod pyproject.toml requirements.txt 2>/dev/null
cat package.json 2>/dev/null | grep -E '"nuxt"|"next"|"vue"|"react"'
ls nuxt.config.* next.config.* 2>/dev/null
```

Determine:
- **JS/TS** — has `package.json`
- **Vue/Nuxt** — has `nuxt.config.*` or `"nuxt"` in package.json
- **Next.js** — has `next.config.*` or `"next"` in package.json
- **Python** — has `pyproject.toml` or `requirements.txt`
- **Go** — has `go.mod`

Store detected stack — used in Step 3 to choose the right linter commands and for the unreferenced pages scan.

Also detect these supporting signals up front:

```bash
ls eslint.config.* .eslintrc* commitlint.config.* 2>/dev/null
find .husky -maxdepth 2 -type f 2>/dev/null
find . -path '*/__tests__/*' -o -name '*.test.*' -o -name '*.spec.*'
```

Track:
- whether tests exist
- whether Husky / commitlint config exists
- whether framework config files exist (`nuxt.config.*`, `next.config.*`, `vite.config.*`, etc.)

These signals are required for false-positive filtering later.

---

## Step 2.5: Verification Rules

Apply these rules to every category before reporting anything:

### Global filters

Never report matches found only in:
- `context/`, `docs/`, `README*`, `CHANGELOG*`
- markdown files
- generated files
- lockfiles
- binary files

If a match appears only in documentation or standards text, treat it as **not a cleanup finding**.

### Framework / config awareness

Before flagging something as unused, check whether it is referenced from:
- framework config files (`nuxt.config.*`, `next.config.*`, `vite.config.*`, `vitest.config.*`)
- tool config files (`eslint.config.*`, `.eslintrc*`, `commitlint.config.*`, `prettier.config.*`)
- git hooks (`.husky/**`)
- package scripts in `package.json`

If yes, do **not** report it as unused.

### Test awareness

When validating exports, functions, constants, or packages, search both runtime code and tests:
- `**/*.test.*`
- `**/*.spec.*`
- `**/__tests__/**`

If something is only used by tests, report it as:

```text
file:line — test-only export: <name> (keep if intentional test surface)
```

Do not report it as dead.

### Same-file export awareness

If an exported symbol is only used inside the same file, do **not** call it a dead export.
Report it separately as:

```text
file:line — export can likely be de-exported: <name> (used only within source file)
```

This is a lower-severity cleanup hint than a dead export.

### Nuxt / Next / framework conventions

For JS/TS package checks, assume `depcheck` is incomplete on framework repos. For each candidate package, verify all of:
- module registration in `nuxt.config.*` / `next.config.*`
- use via framework auto-components or auto-import conventions
- CSS entrypoint usage (for packages like `tailwindcss`)
- CLI / hook usage through `package.json` scripts or `.husky/**`

Only report a package after this verification pass.

---

## Step 3: Scan All Categories

Read `references/scan-categories.md`, run every category, and collect findings before modifying anything.

Categories:
- A - Unused Imports 🔧
- B - Commented-Out Code 🔧
- C - Debug Artifacts 🔧/⚠️
- D - Dead Exports ⚠️
- E - Stale Suppression Directives ⚠️
- F - Empty Files 🔧
- G - Unused Packages ⚠️
- H - Stale Feature Flags ⚠️
- I - Unreferenced Pages/Routes ⚠️ (Nuxt/Next only)

---

## Step 4: Output the Report

Do not print the full report in the terminal.

Instead:
1. Render the full report below into `~/.agents/cleanup-plans/<repo>/<slug>-cleanup-plan.md`
2. Include all findings, verification notes, and summary in that file
3. In the terminal, print only the path link to that file
4. Then continue directly to the confirmation flow in Step 5

Suggested frontmatter:

```yaml
---
date: YYYY-MM-DD
repo: <repo-name>
branch: <branch-name>
mode: branch|full
---
```

```markdown
## Cleanup Scan — <branch name or "full repo">
**Scope:** <N> files scanned · <date>
**Stack:** <detected stack>

---

### A · Unused Imports 🔧
`file:line` — unused import: `<name>`
...
_(none)_ if clean

### B · Commented-Out Code 🔧
`file:line` — commented-out code block (N lines)
...
_(none)_ if clean

### C · Debug Artifacts
🔧 `file:line` — debug: `console.log(...)`
⚠️ `file:line` — TODO: <text> ← manual action only
...
_(none)_ if clean

### D · Dead Exports ⚠️
`file:line` — ⚠️ dead export: `<name>` (verify before removing)
`file:line` — export can likely be de-exported: `<name>` (used only within source file)
`file:line` — test-only export: `<name>` (keep if intentional test surface)
...
_(none)_ if clean

### E · Stale Suppression Directives ⚠️
`file:line` — ⚠️ `@ts-ignore` (verify still needed)
...
_(none)_ if clean

### F · Empty Files 🔧
`path/to/file` — empty file
...
_(none)_ if clean

### G · Unused Packages ⚠️
`package.json` — ⚠️ verified unused package: `<name>` → run: `npm uninstall <name>`
...
_(none)_ if clean

### H · Stale Feature Flags ⚠️
`file:line` — ⚠️ `FLAG_X = true` (hardcoded)
...
_(none)_ if clean

### I · Unreferenced Pages ⚠️
`file` — ⚠️ route `/path` has no references (verify)
...
_(none)_ if clean

---
**Summary:** <N> auto-fixable 🔧 · <M> manual review ⚠️
Reply per category to apply 🔧 fixes, or say "apply all fixable" to do them all at once.
```

Add one extra section before the summary:

```markdown
### Verification Notes
- Suppressed as docs-only false positives: <count or _(none)_>
- Suppressed as framework/config usage: <count or _(none)_>
- Suppressed as test-only usage: <count or _(none)_>
- Reclassified from dead export to de-export hint: <count or _(none)_>
```

---

## Step 5: Interactive Confirmation

After writing the markdown artifact, the terminal should look like:

```text
[cleanup-plan.md](<absolute path>)
Apply fixes for Category A? (yes / no / show-me-first)
```

Rules:
- Do not paste the report body into the terminal
- Do not restate all findings in the terminal
- Keep prompts short and category-focused

For each category that contains **at least one 🔧 auto-fixable finding**, ask:

> Apply fixes for **[Category X]**? (`yes` / `no` / `show-me-first`)

- `show-me-first` → print the exact lines that will be removed or the diff, then re-ask
- `yes` → proceed to Step 6 for this category
- `no` → skip

If the user says **"apply all fixable"** → treat all 🔧 categories as confirmed at once.

For categories with **only ⚠️ findings**, say:
> [Category X] findings need manual review — no auto-fix available.

---

## Step 6: Apply Confirmed Fixes

Execute only the categories the user confirmed.

**A — Unused Imports:**
- JS/TS/Vue: `npx eslint --fix <files>`
- Python: `ruff check --select F401 --fix <files>`
- Go: `goimports -w <files>`

**B — Commented-Out Code:**
Use the Edit tool to remove each flagged block. Remove the full contiguous comment block, not just the first line.

**C — Debug Artifacts (console.log / print / debugger only):**
Use the Edit tool to remove each flagged line. Never remove TODO/FIXME/HACK lines.

**F — Empty Files:**
Confirm each file individually:
> Delete `path/to/file`? It contains no meaningful code. (`yes` / `no`)

Use Bash `rm <file>` only on confirmed files.

**G — Unused Packages:**
Do **not** run `npm uninstall` or equivalent. Instead, print the commands for the user to run:
```
Run these to remove unused packages:
  npm uninstall <pkg1> <pkg2>
```

After all fixes are applied:
```bash
git diff --stat
```

---

## Step 7: Summary

```markdown
## Cleanup Complete

**Applied:** <N> categories fixed · <M> files modified
**Skipped:** <list of skipped categories>
**Manual review needed:** <count of ⚠️ findings — list categories>

Run your test suite to verify nothing broke.
```

If any ⚠️ findings remain, remind the user:
> The ⚠️ findings above (dead exports, TODOs, suppression directives, feature flags, unreferenced pages) need manual review — I've surfaced them but won't touch them automatically.

Also include a short line when relevant:
> I filtered out docs-only, config-driven, framework-convention, and test-only false positives before producing this report.
