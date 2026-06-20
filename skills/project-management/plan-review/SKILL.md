---
name: plan-review
description: Use when the user asks to review an implementation plan or asks what you think about a plan. Triggered by phrases like "review this plan", "what do you think about this plan", "check this plan", "plan review", "is this plan solid", or when the user links or pastes a plan and wants critique rather than execution.
---

# Plan Review

Announce at start: `Running plan review...`

Review plans like a senior engineer who has to implement this and will be paged when it fails. Treat every plan as guilty until it proves its contracts, failure coverage, and scope discipline are real.

A plan review is not a summary. Stress the plan.

## Core Thesis

A good plan is the simplest thing that satisfies the spec, names what can go wrong, and proves the contracts hold.

Challenge complexity. The first question for every non-trivial abstraction: did the spec ask for this, or did the planner add it? Apply Gall's Law: a complex system designed from scratch never works. Complexity must be earned, not assumed.

Use the Four Rules of Simple Design as the underlying standard for every planned module — in priority order:
1. Will it pass all tests?
2. Does it reveal intention?
3. Does it avoid duplication?
4. Does it use the fewest possible elements?

Failing #4 while satisfying #1–3 is a YAGNI violation. Failing #2 or #3 while claiming #4 is a different problem. Know which failure you're looking at.

## Review Lenses

Work through these in order.

### 0. Source Spec Alignment

If the plan references an upstream issue, ticket, or spec page, fetch and read it first. Never judge the plan against your interpretation of the task — judge it against the actual spec.

Flag when the plan:
- Misses acceptance criteria
- Adds scope the task never asked for
- Solves a different problem
- Claims decisions are settled when the spec does not support that

### 1. Repo Rules and Architecture

Read before judging:

```bash
sed -n '1,220p' AGENTS.md 2>/dev/null
sed -n '1,220p' context/code-standards.md 2>/dev/null
sed -n '1,220p' context/architecture-context.md 2>/dev/null
sed -n '1,220p' ~/AGENTS.md 2>/dev/null
```

Flag when the plan:
- Violates explicit repo rules
- Puts work in the wrong app, package, or layer
- Proposes structures that conflict with current project patterns

### 2. Codebase Reality Check

A plan review is not theoretical. Read the actual files.

For each planned file or subsystem:
- Verify the file exists or not
- Read the module that would be modified
- Search for existing implementations of the same concept

```bash
rg --files
rg -n "symbolName|routePath|envVar|queue|middlewareName" .
sed -n '1,220p' path/to/file.ts
```

Flag when the plan:
- Re-creates something that already exists
- Misses an obvious abstraction it should extend
- Targets the wrong file because the architecture already settled elsewhere
- Assumes framework behavior that doesn't match the current app setup

### 3. YAGNI and Complexity Discipline

Every abstraction the spec didn't ask for is a finding.

Flag when the plan:
- Abstracts a pattern that appears fewer than 3 times in the codebase (Rule of Three)
- Adds generalization, extensibility, or configurability the spec did not require
- Designs for future requirements not in scope
- Introduces a new dependency when the stack already handles it
- Proposes a multi-step architecture where a simpler one would satisfy the spec

### 4. Contract Integrity

For any plan touching more than one layer, inspect the boundary contracts it depends on.

Apply Design by Contract: for every new endpoint, job, or write path, the plan should name the preconditions (what the caller must guarantee), postconditions (what the callee guarantees on return), and invariants (what must stay true throughout). If none of these are named, the boundary is not a contract — it's a hope.

Flag when the plan:
- Changes one side of a contract without addressing the other
- Assumes a value is configurable when another layer fixes it
- Describes ordered behavior (pagination, retries, deduplication) without naming the tie-break or idempotency rule
- Consumes generated artifacts without a refresh/verification step
- Has no validation step that proves cross-layer agreement — only that the build passed

### 5. Functional Layer Discipline

Flag when the plan mixes pure logic with imperative shell:
- Business logic in a controller or route handler
- Orchestration embedded in a domain helper
- I/O inside a pure computation function
- Database queries in a presentation layer

The test: if you extracted the logic from the I/O, would it become trivially unit-testable? If not, the layering is wrong.

### 6. Security and Exposure

Flag when the plan:
- Exposes admin, debug, or ops endpoints without explicit auth and authorization review
- Proposes logging secrets, JWTs, headers, or PII
- Trusts user input at a webhook, callback, or internal endpoint
- Puts sensitive values in committed files, plan docs, fixtures, or example curl commands
- Opens a surface that should stay internal

### 7. Delivery Completeness

A complete plan covers the work needed to land safely, not just the main code files.

Flag missing:
- Tests — and which failure paths they cover, not just "tests will be added"
- Env schema updates and downstream rebuild steps
- Migrations, seed impacts, or rollback steps
- Observability: logs, metrics, error handling
- CI/build implications

### 8. Pre-mortem Coverage

Imagine the feature ships and fails silently 3 months later. What happened?

Flag when the plan:
- Covers only the happy path
- Names "edge cases" without specifying them
- Has no test covering the first realistic failure scenario
- Treats lint or build success as proof that stateful or ordered behavior is correct
- Describes minimal-valid-input behavior without a step to verify it

## Output Format

Use this structure every time:

```markdown
---
date: YYYY-MM-DD
repo: <repo-name>
plan: <plan file path or ticket/spec URL>
issue: <issue key or task id, if any>
---

## Plan Review — <plan name>

### Blocking Findings
- 🔴 [section]: issue → why it matters → what the plan should do instead

### Non-Blocking Risks
- 🟡 [section]: issue → why it's risky → what to watch

### Missing Steps
- [section]: what's missing and why it matters for landing safely

### Open Questions
- Question that must be answered or explicitly accepted as a tradeoff

### Verdict
- `ready` — no blocking findings; minor risks only
- `needs edits` — workable direction, specific corrections required before execution
- `rewrite` — built on wrong assumptions, wrong layering, or major omissions
```

Rules:
- Omit any section that has no items except `Verdict`
- Every finding cites a plan section name or file path — never report without a reference
- Lead with the problem, then why it matters, then the correction
- Put true blockers only in Blocking Findings
- Do not pad with non-findings or generic advice

## Save the Review

Write the full review to:

```
~/.agents/plan-reviews/<repo>/<slug>-plan-review.md
```

Slug priority: issue key or task id → plan filename → current branch name. Append `-plan-review`.

Print only:

```
Plan review saved → ~/.agents/plan-reviews/<repo>/<slug>-plan-review.md
```

## Offer Resolution

If the review contains any Blocking Findings, Non-Blocking Risks, Missing Steps, or Open Questions:

```
Found [N] issues. How do you want to handle them?

1. Ask me questions one-by-one (I'll fill in the gaps and decide on approaches)
2. Let you decide (I'll apply best judgment and summarize)
```

Wait for the user's answer before proceeding.

If option **1**: work through each issue one at a time using the same lettered-option format as `/plan` — options A/B/C, recommended first, one question per message.

If option **2**: state which option you'd choose for each ambiguous finding and why (one sentence each), then ask if the user wants to proceed.

If verdict is `ready` with no open questions, skip this step entirely.

## Anti-Slop Rules

- Never say "the plan looks solid" unless there are zero findings
- Never report a finding without citing the plan section or file
- Never accept "tests will cover it" without naming the failure path those tests exercise
- Never let a plan with TBDs pass as `ready`
- Never review the plan in isolation if an upstream issue or ticket exists — always fetch it
- Never skip the codebase check — a plan review that doesn't open files is a theoretical exercise
- Never treat complexity as neutral — every abstraction the spec didn't ask for is a finding
- Never flag a risk without saying what the actual risk is
- Never stop at the happy path when the plan describes a write, migration, or cross-layer flow
