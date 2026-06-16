---
name: code-review
description: >
  Deep code review that acts like a blunt senior engineer. Use when the user says "review",
  "code review", "/review", "check this PR", "review the diff", "review PR <N>", "review MR <N>",
  "look at my changes", "review this branch", or "check my code".
---

# Code Review

## Overview

Perform a deep, opinionated review of code changes. Go beyond the diff — read the full module, internalize repo rules, find existing patterns in the codebase, and challenge every questionable decision. The goal is to prevent slop from reaching master.

**Announce at start:** "Running code review..."

Args: `[<PR/MR number>] [--harsh]`

This review must bias toward finding silent correctness bugs, not just style or local code smells. Treat green tests and a plausible implementation as weak evidence when the diff changes contracts, ordering, generated artifacts, or cross-layer behavior.

---

## Step 1: Get the Diff

**If a PR/MR number is given:**

```bash
# Try GitHub first
gh pr diff <N>

# If that fails or no gh, try GitLab
glab mr diff <N>

# If both fail, tell the user:
# "Could not fetch diff — install the gh CLI (GitHub) or glab CLI (GitLab) and authenticate."
```

Also fetch the PR/MR title for the report header:
```bash
gh pr view <N> --json title -q .title   # GitHub
glab mr view <N> --output json | jq -r .title   # GitLab
```

**If no number is given (local branch diff):**

```bash
# Detect base branch
git merge-base HEAD main 2>/dev/null \
  || git merge-base HEAD master 2>/dev/null \
  || git rev-parse origin/HEAD 2>/dev/null

# Get the diff
git diff <base>...HEAD
```

If the diff is empty: warn "No changes detected vs `<base>`. Are you on the right branch?" and stop.

**Set tone:**
- Default: `constructive` (lead with issue → why → alternative)
- If `--harsh` flag: `harsh` (verdict only — no hedging, no "consider", no softening)

---

## Step 2: Read Changed Files + Module Context

Parse the diff to extract changed file paths. Skip:
- `*.generated.*`, `*.min.*`, `*.lock`, `*.snap`
- `dist/`, `build/`, `vendor/`, `node_modules/`, `.next/`, `__pycache__/`
- Binary files

For each changed file:
1. Read the **full file** (not just the diff hunk) — line count matters for the size check
2. Note: record the file's current line count now (needed for Lens 3)
3. Identify its parent directory
4. Read related siblings:
   - Same basename, different extension: `foo.ts`, `foo.test.ts`, `foo.types.ts`, `foo.stories.tsx`
   - Index file of the same directory: `index.ts`, `index.tsx`, `__init__.py`, `mod.rs`
   - Files the changed file imports (one hop — grep for `import ... from` or `require(`)

**Cap at 20 files total.** Priority when over cap: changed files → index files → one-hop imports → siblings.

---

## Step 3: Load Repo Rules + Find Existing Patterns

This step runs before the review lenses. Its output is ground truth the lenses enforce.

### Part A — Repo Rules

Search for rule files in this order:

```bash
# Project-level (check all of these)
cat AGENTS.md 2>/dev/null
cat CLAUDE.md 2>/dev/null
cat .cursorrules 2>/dev/null
cat .cursor/rules 2>/dev/null
cat .github/copilot-instructions.md 2>/dev/null
cat CONTRIBUTING.md 2>/dev/null
cat docs/CONTRIBUTING.md 2>/dev/null
ls .claude/*.md 2>/dev/null && cat .claude/*.md
ls .agents/docs/*.md 2>/dev/null && cat .agents/docs/*.md

# Global fallbacks
cat ~/.claude/AGENTS.md 2>/dev/null
cat ~/.claude/CLAUDE.md 2>/dev/null
```

Extract and store:
- Naming conventions (files, variables, functions, CSS classes)
- Required or banned patterns
- Code style rules (import order, error handling, logging)
- Architecture rules (layer boundaries, where logic lives)
- Testing requirements

**Rule violations are 🔴 Issues — not suggestions.**

### Part B — Existing Patterns

For each changed file, classify what kind of thing it is and find comparable files already in the codebase:

| Changed file type | How to find comparables |
|---|---|
| API route handler | `grep -r "router\.\|app\.\(get\|post\|put\|delete\)" --include="*.ts" -l \| head -5` |
| React component | `find src -name "*.tsx" -not -name "*.test.*" \| head -10` |
| Service / util | `find src -path "*/services/*" -o -path "*/utils/*" \| head -10` |
| DB query / ORM | `grep -r "prisma\.\|db\.\|query\|findOne\|findMany" --include="*.ts" -l \| head -5` |
| Test file | `find . -name "*.test.*" -o -name "*.spec.*" \| head -5` |
| Hook (React) | `find src -name "use*.ts" -o -name "use*.tsx" \| head -5` |

Read 2–3 comparable files. Note what they consistently do that the changed file does differently. These deviations become `📏 Rules & Conventions` findings.

### Part C — Cross-Layer Contract Audit

Before the review pass, identify whether the diff touches any of these boundary types:

- network/API contract
- app/database or app/query-layer contract
- generated/manual code contract
- config/runtime contract
- auth/access contract
- ordering/stateful contract

Examples of ordering/stateful work:
- pagination or cursor logic
- sorting or ranking
- deduplication or idempotency
- retries, backoff, queue ordering
- cache invalidation or refresh timing

If any boundary type applies, explicitly inspect both sides of the boundary. Do not review only the local file that changed.

Flag as review findings when:
- one side of the contract changed without the other
- generated artifacts were edited or relied on without verifying regeneration
- a value is presented as configurable but another layer hardcodes it
- ordered behavior changed without a stable tie-break or boundary test
- runtime validation, compile-time types, and persisted schema disagree

---

## Step 4: Detect Tech Stack

From file extensions + root config files:

```bash
# Check what's present
ls package.json go.mod Cargo.toml pyproject.toml requirements.txt 2>/dev/null
cat package.json 2>/dev/null | grep -E '"next"|"react"|"vue"|"svelte"|"fastapi"|"django"'
```

Identify:
- **Language:** TypeScript, JavaScript, Python, Go, Rust, Ruby, etc.
- **Framework:** React, Vue, Next.js, Django, FastAPI, Gin, etc.
- **Test framework:** Jest, Vitest, Pytest, Go test, etc.

Apply language-specific lenses during the review:
- **React/Next.js:** unnecessary re-renders, missing `key` props, prop drilling, missing `Suspense`, `useEffect` with missing deps
- **Python:** mutable default args, `list()` where a generator suffices, `dict` where `dataclass` fits, bare `except`
- **Go:** goroutine leaks (launch without cancel/wait), swallowed errors (`_ =`), interface over-engineering, missing context propagation
- **TypeScript:** `any`/`unknown`, unsafe `as` casts, missing return types on exports (see Lens 7)

---

## Step 5: The Review Pass

Work through these lenses in order. Each finding must cite `file:line`.

---

### Lens 1 — Complexity & Cognitive Load

- **Long functions:** any function/method over ~30 lines — can it be split into named steps?
- **Deep nesting:** conditions nested 3+ levels — flatten with early returns or extract a helper
- **Unreadable boolean logic:** if a condition needs a comment, it needs a name instead
- **Argument overload:** 4+ positional args → options object / struct / named params
- **Magic numbers/strings:** inline literals that should be named constants

---

### Lens 2 — Wrong Abstractions

- Is this abstraction solving a real, present problem or a hypothetical future one?
- Would inlining the abstraction make the call site clearer?
- Class used where a plain function would do — or vice versa?
- Generic/utility built before it has 2+ actual callers? (YAGNI)
- Wrapper that adds no behavior — just proxies calls through?

---

### Lens 3 — Modularity & File Size

**Hard limits — flag as 🔴 Issue if violated:**
- A changed file is now **1000+ lines** AND the diff contributed significantly to that growth.
  - Suggest a concrete split: name the logical groups and the files they'd go into.
  - Example: "This file is now 1,240 lines. The form validation logic (lines 450–680) and the API helpers (lines 720–900) belong in separate files."

**Warning — flag as 🟡:**
- A changed file is now **700–999 lines** — approaching the limit, consider splitting now.

**Single responsibility:**
- Can you describe what this file does in one noun phrase? If not, it's doing too much.
- Does each new component, class, or function have exactly one reason to change?
- React component that fetches data AND manages state AND renders layout → split into container + presentational, or extract a hook for the data/state logic.

---

### Lens 4 — DRY

- **Duplicated logic:** grep for similar function names, identical conditionals, repeated data transformations. If the same logic exists elsewhere, one of them should call the other — or both should call a shared util.
- **Copy-paste with minor edits:** flag and extract.
- **Parallel if/switch trees:** same concept branched in multiple files will drift. Centralize the branching.

**Exception:** two things that look similar but have different reasons to change are coincidentally similar, not DRY violations. In that case, a short comment noting the non-obvious difference is better than a forced abstraction.

---

### Lens 5 — Performance

- N+1 queries or repeated expensive calls inside a loop
- Missing memoization where inputs are referentially stable (`useMemo`, `React.memo`, `lru_cache`, `sync.Once`)
- Synchronous I/O that should be async or batched
- Regex instantiated inside a function that's called frequently — compile once at module level
- Importing an entire library for one function where a targeted import or smaller alternative exists
- Unbounded growth: collections that accumulate without a cap or TTL

### Lens 6 — Contract Integrity & Drift

- Does the diff change a contract across layers without updating all consumers/producers?
- Are generated files, schema-derived types, API clients, compiled assets, or fixtures now stale?
- Is runtime validation weaker or broader than the compile-time types imply?
- Is a config/env/default value exposed as dynamic while another layer fixes it?
- Does the code rely on serialization/deserialization where precision, nullability, or shape can drift?
- If a migration, query, RPC, queue payload, or webhook shape changed, was the boundary revalidated end-to-end?

**Flag as 🔴 Issue when:**
- two layers now disagree about a contract in a way that can break behavior at runtime
- generated/manual drift can mislead future callers or hide runtime failures
- a value is falsely configurable and can fail outside the happy-path environment

---

### Lens 7 — Better Tools / Approaches

- Does a well-maintained package already solve this reliably? Name it.
- Is the code fighting the framework instead of using its idioms?
- Is a for-loop doing what `map`/`filter`/`reduce` (or equivalent) expresses more clearly?
- Would a different data structure change the algorithmic complexity? (linear scan vs. Set lookup, array vs. Map for keyed access)
- Is there a language built-in being reinvented? (`structuredClone` vs. manual deep copy, `Array.from` vs. spread, `Promise.all` vs. sequential awaits, etc.)

---

### Lens 8 — TypeScript Type Safety (TS projects only)

**Flag as 🔴 Issue:**
- `any` or `unknown` anywhere in the diff — **unless** the author added an inline comment explaining exactly why no TS-native solution works. Acceptable TS-native alternatives to suggest: generics, discriminated unions, type guards, conditional types, `satisfies`, `as const`, template literal types, `infer`.
- `as SomeType` cast without a preceding type guard — silences the compiler without making the code safe.
- `Record<string, any>` or `object` where a precise interface or discriminated union fits.

**Flag as 🟡:**
- Missing return type on an exported function — callers deserve a typed contract.
- Overloaded `interface` that could be split into a discriminated union for exhaustive checking.
- Type assertion `!` (non-null assertion) without a comment explaining why null is impossible here.

---

### Lens 9 — Validation Depth & Silent Failure Risk

- Do the tests only exercise helpers while the route, job, integration, migration, parser, or boundary behavior remains untested?
- Could this change pass lint/build/tests and still be wrong because of ordering, precision, stale codegen, config drift, or partial rollout?
- Are there malformed-input, permission, failure-path, or empty-state cases that the diff clearly does not cover?
- Is the review seeing only happy-path assertions with no adversarial checks?

**Raise findings when:**
- a higher-layer test is feasible and the diff only adds helper-level coverage
- the changed behavior is stateful or ordered and no boundary-specific verification exists
- the implementation relies on assumptions that are not enforced anywhere

---

### Lens 10 — Bigger Picture

Only raise this section if something genuinely architecture-level is spotted. Skip it otherwise — don't fill it to fill it.

- Is this feature being built in the wrong layer of the stack?
- Is the diff adding complexity to treat a symptom when the root cause is elsewhere?
- Would a fundamentally different pattern (event-driven vs. polling, push vs. pull, cache-aside vs. write-through) be dramatically cleaner here?
- Is this change going to make the next related change harder?

---

## Step 6: Save Report to File

**Do not print the full review report to the terminal.** Write it to a file and print a single link instead.

### Report format (written to file)

```markdown
---
date: <YYYY-MM-DD>
repo: <repo-name>
pr: <PR/MR number or branch name>
jira: <issue key, if detectable from branch name or PR title>
---

## Code Review — <branch name or PR/MR title>
**Files reviewed:** <N> changed · <M> context files read
**Stack:** <detected language/framework>
**Tone:** constructive  ← (or "harsh" if --harsh flag)

---

### 🔴 Issues (must fix before merge)
<file>:<line> — <what's wrong> — <why it matters> — <what to do instead>
...
_(none)_ if clean

### 📏 Rules & Conventions
<file>:<line> — <rule or pattern violated> — <what the rest of the codebase does>
...
_(none)_ if clean

### 🟡 Refactor Opportunities
<file>:<line> — <what's wrong> — <concrete alternative, code snippet if helpful>
...
_(none)_ if clean

### 🟢 Quick Wins
- <file>:<line> — <one-line description>
...
_(none)_ if clean

### 💡 Bigger Picture
<only if something architecture-level is worth raising — omit this section entirely if not>
```

### Determine repo name

```bash
basename $(git rev-parse --show-toplevel 2>/dev/null) 2>/dev/null || echo "global"
```

### Determine file slug

Priority order:
1. PR/MR number + slugified title (e.g. `123-add-auth-middleware`)
2. Jira key detectable from branch name or PR title (e.g. `mp-12-add-auth-middleware`)
3. Current branch name: `git rev-parse --abbrev-ref HEAD 2>/dev/null`, slugified

Append `-code-review` to the slug.

### Write the file

```bash
mkdir -p ~/.agents/code-reviews/<repo>/
```

Write the full report (with frontmatter) to:
```
~/.agents/code-reviews/<repo>/<slug>.md
```

### Terminal output

After saving, print only this to the terminal — nothing else:

```
Code review saved → ~/.agents/code-reviews/<repo>/<slug>.md
```

---

## Step 7: Interactive Gap Resolution

After saving the file, if the review contains any 🔴 Issues, 🟡 Refactor Opportunities, or open architectural questions, offer the user a choice:

```
The review found [N] issues / open questions. How do you want to handle them?

1. Ask me questions one-by-one (I'll fill in the gaps and decide on approaches)
2. Let you decide (apply your best judgment and summarize what you'd do)
```

Wait for the user's answer before proceeding. If the user selects **1**:

- Work through each open question or ambiguous finding **one at a time**
- For each question, present 2–4 options using stable plain-text labels such as `A.`, `B.`, `C.` — not markdown numbered lists
- Always put the best option first and label it `(Recommended)` with a one-sentence justification
- Keep each question to 1–3 sentences — no walls of text
- Wait for the user's answer before moving to the next question
- After all questions are answered, produce a short action summary of decisions made

Formatting rule for interactive questions:
- Do not use markdown numbered lists for both the prompt and the options in the same message. Many chat renderers renumber all `1.` / `2.` items into a single sequence, which breaks the mapping between the visible option numbers and the requested reply. Use a prompt like `Q1: ...`, option labels `A.`, `B.`, `C.`, and ask the user to reply with the letter.

If the user selects **2**:

- State which option you'd choose for each ambiguous finding and why (one sentence each)
- Ask if the user wants to proceed with that plan

**Do not ask questions if the report has no issues or all findings are clear-cut with obvious fixes.**

---

## Tone Rules

**Constructive (default):**
Lead with the specific problem → why it matters → what to do instead. No padding, no softening — just be concrete and useful.

**Harsh (`--harsh` flag):**
The verdict only. No "consider", no "might want to", no "one option could be". State the problem and the fix. Done.

---

## Anti-Slop Rules (always enforced, regardless of tone)

- **Never** say "looks good overall" unless the diff is genuinely clean — earn it
- **Never** pad findings with "great use of X" unless it's teaching a non-obvious pattern
- **Never** recommend a change without a concrete alternative
- **Never** report a finding you can't cite with `file:line`
- If a finding can't be stated in one sentence, it's not crisp enough — sharpen it
- Empty sections get `_(none)_` — never omit a section entirely (the reader needs to know it was checked)
- **Never** treat passing lint/tests as proof that a contract or boundary is correct
- **Never** stop at the changed file when the risky behavior lives across layers
- **Never** miss stale generated artifacts, config drift, or ordered-behavior bugs just because the local code looks clean
