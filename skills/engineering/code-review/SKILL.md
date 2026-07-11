---
name: code-review
description: >
  Run a strict code review focused on structural quality, maintainability, contract safety, and
  codebase health. Use when the user says "review", "code review", "/review", "check this PR",
  "review the diff", "review PR <N>", "review MR <N>", "look at my changes", "review this branch",
  or "check my code".
---

# Code Review

Announce at start: `Running code review...`

Review like a demanding senior engineer. Default to finding real risks, not praising effort.
Assume working code can still be the wrong design.

## Core Thesis

Be ambitious about simplification.

Do not stop at local cleanup. Look for changes that:
- use "code-judo" moves: restructurings that preserve behavior while making the implementation simpler, smaller, and more inevitable
- delete branches instead of reorganizing them
- remove wrappers instead of polishing them
- move logic to its canonical layer instead of normalizing drift
- reduce the number of concepts the next reader must hold in their head

Prefer a small number of high-conviction findings over a long list of cosmetic notes.

## Review Priorities

Check findings in this order:
1. Silent correctness and contract bugs
2. Structural regressions that make the code harder to extend
3. Spaghetti growth from one-off branches, flags, modes, and special cases
4. Logic living in the wrong layer or bypassing existing canonical helpers
5. File growth and decomposition problems
6. Missing validation at the real boundary
7. Lower-value maintainability issues

When judging simplicity, apply the Four Rules of Simple Design in priority order: passes tests → reveals intention → no duplication → fewest elements. A change that shrinks the code but obscures what it does fails rule #2 before it satisfies rule #4. Know which failure you're looking at.

## Workflow

### 1. Get the diff

If the user gives a PR or MR number:
- Try `gh pr diff <N>` first
- Fall back to `glab mr diff <N>`
- Also fetch the title for the report header

If no number is given:
- Diff the current branch against its merge-base with `main`, `master`, or `origin/HEAD`

Stop if there is no diff.

### 2. Read enough context to review the design

For each changed file:
- Read the full file, not just the hunk
- Read directly related context only when it affects the review:
  - sibling tests or types
  - nearby index/module wiring
  - one-hop imports
  - the other side of any touched boundary

Skip generated, vendored, lock, minified, snapshot, build, and binary files.

Do not read context mechanically. Read the minimum needed to understand whether the change is correct and whether the design is getting better or worse.

### 3. Load repo rules

Read the project's applicable rule files before reviewing. Prioritize local agent/repo instructions and contribution docs.

Extract only the rules that actually affect the review:
- architecture boundaries
- required patterns
- banned patterns
- testing expectations
- naming or style rules that are enforced rather than merely preferred

Treat clear repo-rule violations as findings, but do not inflate every convention mismatch into a blocker.

### 4. Audit both sides of important boundaries

If the diff touches a boundary, inspect both sides:
- API/request-response contracts
- app/database or query-layer contracts
- runtime validation vs compile-time types
- generated/manual artifact boundaries
- config/runtime defaults
- auth/access control
- ordering/stateful behavior such as pagination, deduplication, retries, ranking, cache invalidation

Apply Design by Contract at every boundary: name the preconditions (what the caller must guarantee), postconditions (what the callee guarantees on return), and invariants (what must stay true throughout). If the change doesn't address all three, the boundary is not a real contract.

Do not review only the local file when the risk lives across layers.

## What To Flag Aggressively

Raise findings when you see:
- a simpler reframing that would delete whole categories of complexity
- new conditionals bolted into already busy flows
- feature logic leaking into shared or general-purpose paths
- wrappers, pass-through helpers, or abstractions that add indirection without clarity
- types, casts, optionality, or ad-hoc object shapes obscuring the real invariant
- crowded component scripts that keep piling refs, computeds, watchers, constants, and handlers inline when adjacent helpers or scoped composables would make the component easier to scan
- duplicated logic where the codebase already has a canonical helper
- a contract changed on one side but not the other
- runtime validation weaker than the types suggest
- stale generated artifacts, fixtures, or clients
- tests that only cover helpers while the real boundary behavior remains unverified
- CQS violations: functions that return a value AND mutate state — they make behavior unpredictable and are hard to test in isolation
- Rule of Three violations: new abstractions that generalize fewer than 3 existing cases without a concrete reason
- Functional core / imperative shell violations: pure business logic mixed with I/O, orchestration embedded in domain helpers, or database queries in the presentation layer

## File Size Rule

Treat file sprawl as a strong smell.

- If a PR pushes a file from under 1000 lines to over 1000 lines, challenge it by default.
- If a changed file lands in the 700-999 line range, check whether the decomposition is already overdue.
- When raising this, name the logical splits instead of saying "split this up."

## Stack-Specific Pressure

Apply stack-specific scrutiny only when it materially affects maintainability or correctness.

Examples:
- TypeScript: unjustified `any`, unsafe casts, vague object shapes, fake optionality
- React/Nuxt/Next: branching-heavy components, state/orchestration/rendering all jammed together, avoidable client/server boundary confusion, long `<script setup>` or component bodies that should be decomposed into adjacent helper files, constants, or scoped composables
- Backend/service code: orchestration mixed with core business logic, duplicated query patterns, partial updates that should be more atomic

Do not cargo-cult framework advice. Flag it only when it improves the design.

## Preferred Remedies

Prefer suggestions like:
- delete a whole layer of indirection
- extract a pure helper or engine
- move logic to the module that already owns the concept
- replace special-case branching with a simpler model
- collapse duplicate flows into one clearer path
- split a large file by responsibility
- make the contract explicit at the boundary instead of papering over it with casts or fallbacks
- add the missing higher-level test that proves the behavior where it actually matters

Do not give vague advice. Every finding needs a concrete alternative.

## Output Format

Primary focus: findings ordered by severity with `file:line` citations.

Use this structure:
- `🔴 Issues` for correctness, contract, architecture, or serious maintainability problems
- `📏 Rules & Conventions` for repo-rule or established-pattern violations
- `🟡 Refactor Opportunities` for worthwhile cleanups that are not blockers
- `🟢 Quick Wins` for small, concrete improvements
- `💡 Bigger Picture` only if there is a real architecture-level concern

If there are no findings, say so explicitly and mention any residual testing or context gaps.

## Save The Report

Write the full review to:

`~/.agents/code-reviews/<repo>/<slug>-code-review.md`

Include frontmatter:
- `date`
- `repo`
- `pr`
- `issue` when detectable

After saving, print only:

`Code review saved → ~/.agents/code-reviews/<repo>/<slug>-code-review.md`

Do not print the full report body to the terminal.

## Approval Bar

Do not approve just because the code works or tests pass.

Approval requires:
- no clear contract break across layers
- no obvious structural regression
- no unnecessary spaghetti growth
- no unjustified file-size sprawl
- no clear leak into the wrong layer
- no obvious missed simplification when a cleaner path is visible

## Anti-Slop Rules

- Never say "looks good overall" unless the diff is genuinely clean
- Never pad the review with compliments that do not teach anything
- Never report a finding without `file:line`
- Never recommend a change without naming the better shape
- Never stop at the changed file when the bug risk lives at a boundary
- Never treat green tests as proof that the design or contract is sound
