---
name: code-review
description: >
  Run a strict code review focused on structural quality, maintainability, contract safety, and
  codebase health. Use when the user says "review", "code review", "/review", "check this PR",
  "review the diff", "review a numbered PR or MR", "look at my changes", "review this branch",
  or "check my code".
---

# Code Review

Announce at start: `Running code review...`

Review like a demanding senior engineer. Find real risks rather than praising effort, and assume
working code can still be the wrong design.

Be ambitious about simplification. Look past local cleanup for changes that delete branches instead
of reorganizing them, remove wrappers instead of polishing them, move logic to its canonical layer
instead of normalizing drift, and reduce the number of concepts the next reader must hold. Prefer a
few high-conviction findings over a long list of cosmetic notes.

When judging simplicity, apply the Four Rules of Simple Design in priority order — passes tests,
reveals intention, no duplication, fewest elements. A change that shrinks the code but obscures what
it does fails rule #2 before it satisfies rule #4. Name which failure you found.

## Priorities

1. Silent correctness and contract bugs
2. Structural regressions that make the code harder to extend
3. Spaghetti growth from one-off branches, flags, modes, and special cases
4. Logic living in the wrong layer or bypassing canonical helpers
5. File growth and decomposition problems
6. Missing validation at the real boundary
7. Lower-value maintainability issues

## Workflow

**Get the diff.** Given a PR or MR number, try `gh pr diff <N>`, then `glab mr diff <N>`, and fetch
the title for the report header. Otherwise diff the current branch against its merge-base with
`main`, `master`, or `origin/HEAD`. Stop if there is no diff.

**Read enough context to review the design.** Read each changed file in full, not just the hunk, plus
the directly related context that affects the review: sibling tests or types, nearby index/module
wiring, one-hop imports, and the other side of any touched boundary. Skip generated, vendored, lock,
minified, snapshot, build, and binary files. Read the minimum needed to judge whether the change is
correct and whether the design is getting better or worse.

**Load repo rules.** Read the project's agent instructions and contribution docs, and extract only the
rules that bear on this review — architecture boundaries, required patterns, banned patterns, testing
expectations, and naming or style rules that are enforced rather than merely preferred. Clear
violations are findings; not every convention mismatch is a blocker.

**Audit both sides of every boundary the diff touches** — API request/response contracts, app/database
and query-layer contracts, runtime validation against compile-time types, generated/manual artifact
boundaries, config and runtime defaults, auth and access control, and ordered or stateful behavior
such as pagination, deduplication, retries, ranking, and cache invalidation. Apply Design by Contract
at each: name the preconditions the caller must guarantee, the postconditions the callee guarantees,
and the invariants that stay true throughout. A change addressing fewer than all three has not made
the boundary a real contract. Review across layers whenever the risk lives there, not just the local
file.

## Flag aggressively

- a simpler reframing that would delete whole categories of complexity
- new conditionals bolted into already busy flows
- feature logic leaking into shared or general-purpose paths
- wrappers, pass-through helpers, or abstractions adding indirection without clarity
- types, casts, optionality, or ad-hoc object shapes obscuring the real invariant
- crowded component scripts piling refs, computeds, watchers, constants, and handlers inline where
  adjacent helpers or scoped composables would make the component scannable
- duplicated logic where a canonical helper already exists
- a contract changed on one side but not the other
- runtime validation weaker than the types suggest
- stale generated artifacts, fixtures, or clients
- tests covering helpers while the real boundary behavior stays unverified
- **CQS violations** — functions that return a value *and* mutate state
- **Rule of Three violations** — new abstractions generalizing fewer than 3 existing cases without a
  concrete reason
- **Functional core / imperative shell violations** — pure business logic mixed with I/O,
  orchestration embedded in domain helpers, database queries in the presentation layer

**File size.** Treat sprawl as a strong smell: challenge by default any PR pushing a file past 1000
lines, and check whether decomposition is already overdue when a changed file lands in the 700–999
range. Name the logical splits rather than saying "split this up."

**Stack-specific pressure**, applied only where it materially affects correctness or maintainability:
TypeScript — unjustified `any`, unsafe casts, vague object shapes, fake optionality. React/Nuxt/Next
— branching-heavy components, state and orchestration and rendering jammed together, avoidable
client/server boundary confusion, long `<script setup>` bodies that want decomposing into adjacent
helpers, constants, or scoped composables. Backend — orchestration mixed with core business logic,
duplicated query patterns, partial updates that should be atomic. Flag framework advice only when it
improves this design.

## Remedies

Every finding names a concrete better shape. Prefer: delete a layer of indirection, extract a pure
helper or engine, move logic to the module that already owns the concept, replace special-case
branching with a simpler model, collapse duplicate flows into one path, split a large file by
responsibility, make the contract explicit at the boundary instead of papering over it with casts or
fallbacks, add the missing higher-level test that proves the behavior where it matters.

## Output

Findings ordered by severity, each with a `file:line` citation:

- `🔴 Issues` — correctness, contract, architecture, or serious maintainability problems
- `📏 Rules & Conventions` — repo-rule or established-pattern violations
- `🟡 Refactor Opportunities` — worthwhile cleanups that are not blockers
- `🟢 Quick Wins` — small, concrete improvements
- `💡 Bigger Picture` — only for a real architecture-level concern

With no findings, say so explicitly and name any residual testing or context gaps. Say "looks good
overall" only when the diff is genuinely clean, and leave out compliments that teach nothing.

Write the full review to `~/.agents/code-reviews/<repo>/<slug>-code-review.md` with frontmatter
`date`, `repo`, `pr`, and `issue` when detectable. Print only:

```
Code review saved → ~/.agents/code-reviews/<repo>/<slug>-code-review.md
7 findings: 2 🔴, 1 📏, 3 🟡, 1 🟢
```

## Approval bar

Approval needs more than working code and green tests: no contract break across layers, no structural
regression, no unnecessary spaghetti growth, no unjustified file-size sprawl, no leak into the wrong
layer, and no missed simplification where a cleaner path is visible.

## Offer resolution

Skip this when there are no findings. Otherwise read `references/question-format.md` and follow its
Resolution Gates section — the standard dispositions, the computed recommendation, and the gate
format. Offer only the dispositions that apply. Record the gate answer and every per-finding decision
in a `## Decisions` section appended to the saved review.

**Planning handoff.** When the user picks the planning disposition, append that decision to the review
and invoke the planning skill immediately with the review path as its explicit source. This is a new
remediation task, never a request to reuse the plan that produced the reviewed branch. Tell the
planning skill to skip existing-plan discovery for this handoff, create
`~/.agents/plans/<repo>/YYYY-MM-DD-<review-slug>-from-code-review.md` where `<review-slug>` is the
review filename without `-code-review.md`, set `**Source:**` to the review path, and present the plan
and wait for a later explicit `go`. Choosing this disposition authorizes planning only.
