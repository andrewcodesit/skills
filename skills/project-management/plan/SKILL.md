---
name: plan
description: Use when asked to plan, create a plan, or write a plan for any feature, task, or spec. Triggered by phrases like "plan X", "write a plan for X", "let's plan X", "create a plan for X", or when starting work on a task that requires an implementation plan.
---

# Plan

Announce at start: `Planning...`

Plan like a senior engineer who will personally execute and own the result. Default to the simplest thing that could work. Treat every abstraction as a cost until the spec proves it's necessary.

## Core Thesis

A plan that isn't grounded in the actual codebase is a guess.

Before writing a single step, verify what exists, what is already installed, and what patterns the repo has already committed to. Do not plan from memory. Do not plan from first principles when the repo already has a canonical answer.

Optimize for correctness at the seams. When work crosses boundaries — client/server, app/DB, generated/manual, config/runtime — the plan must name the contract at that boundary and how the implementation will prove it holds.

For larger work, make the plan a controlled sequence, not one long unchecked run. Keep all work in one markdown plan, split it into ordered phases, and split each phase into small, concrete tasks. A phase must be a coherent, independently verifiable slice of the outcome; do not begin the next phase until the current phase's verification gate passes.

## Steps

### 1. Check for Existing Plan

Determine the repo name from the working directory or git remote. Check:

```bash
ls ~/.agents/plans/<repo-name>/ 2>/dev/null | grep -i "<task-slug>"
```

Ignore any candidate whose filename starts with `EXECUTED-`. It is a historical record of
completed work, never a reusable plan, and must not be shown to the user or used to block
writing a new plan.

If one or more candidate plans are found, do a quick relevance assessment before asking the user anything:

- Read the title, Goal, and Approach sections of each candidate.
- Compare them against the current user request, not just the filename or slug match.
- Treat a plan as relevant only if its user outcome and implementation surface materially overlap with the current task.
- If none are actually relevant, say so briefly and continue with a new plan without asking whether to reuse them.

If a candidate is genuinely relevant: show the path and one-sentence reason it matches, then ask "Use it or write a new one?" If the user chooses to use existing: stop and send the link only. If the user chooses new: continue.

If another skill invoked this one with an explicit spec source — a findings file, a review file, a spec path — read that file first and judge relevance against it. Never let a slug match against an old plan discard the spec you were handed; record the path in the plan's `**Source:**` field.

### 2. Gather Context

Read the relevant codebase before forming any opinion about the task:

```bash
sed -n '1,220p' AGENTS.md 2>/dev/null
sed -n '1,220p' context/code-standards.md 2>/dev/null
sed -n '1,220p' ~/AGENTS.md 2>/dev/null
```

Read additional context files when the task touches those areas:

```bash
sed -n '1,220p' context/architecture-context.md 2>/dev/null
sed -n '1,220p' context/design-context.md 2>/dev/null
sed -n '1,220p' context/project-overview.md 2>/dev/null
sed -n '1,220p' context/domain-context.md 2>/dev/null
```

Inspect the current implementation:

```bash
rg --files
rg -n "symbolName|routePath|envVar|featureName" .
sed -n '1,220p' path/to/existing/file.ts
```

Do not plan from memory. Verify what exists, what does not, and what APIs are already in use.

### 2.5 Reality Check Before Questions

Before writing questions or a plan, explicitly check:

- **Working backwards:** what does the user actually get? Do the planned steps trace back to that outcome?
- **YAGNI:** does each planned piece of work appear in the spec, or is it anticipating future needs that were not asked for?
- **Existing implementations:** what modules, helpers, composables, routes, or patterns already exist that this should extend — not duplicate?
- **Dependency reality:** is the needed package already installed? Is a new one justified?
- **Framework constraints:** SSR vs client-only, lazy-loading, boot order, shutdown, build implications
- **Boundary contracts:** where do data, types, config values, auth assumptions, or ordering semantics cross layers?
- **Pre-mortem:** imagine it's 3 months from now and this feature failed silently in production. What happened? Name the top 3 scenarios.
- **Type-safety shortcuts:** does the approach rely on unchecked casts, inferred shapes, or presence checks that don't actually prove the inner value type?

If any of those checks reveal a likely conflict, ask targeted questions or record the constraint in the plan.

### 2.6 Contract Audit

For any task touching 2+ layers, generated artifacts, or runtime configuration, do a short contract audit. Note only the categories that apply:

- **Data contract:** request/response shape, serialization, schema nullability, enum constraints
- **Ordering contract:** sorting, cursor/pagination semantics, deduplication, idempotency, tie-break rules
- **Type contract:** generated types vs handwritten types vs runtime validation
- **Config contract:** env vars, flags, defaults, schema-fixed values pretending to be dynamic
- **Auth/access contract:** caller identity, role checks, internal-only surfaces
- **Runtime contract:** retries, timeouts, shutdown, background work, cache invalidation

If a category applies, the plan must include a concrete implementation step for it — or explicitly state why it is unaffected.

### 3. Grill the User

Non-negotiable. Ask every question needed before writing anything.

Read `references/question-format.md` and follow it exactly for every question. Do not improvise a
format and do not rely on memory of what the format is.

If that file cannot be read, stop and tell the user:

> Question-format reference not found at `references/question-format.md`.
> I can't ask questions in the standardized format without it.
>
> Continue anyway with an improvised format, or stop so you can fix the file?

Then wait. Never improvise silently and never continue as if the format were loaded.

When the task has no real unknowns after codebase inspection, say so and skip this step. The goal is to remove ambiguity, not perform thoroughness.

Wait for user answers before proceeding. Record every answer in the plan's `## Decisions` section as described in the format reference.

### 4. Write the Plan

Save to:

```
~/.agents/plans/<repo-name>/YYYY-MM-DD-<task-slug>.md
```

**Plan structure:**

```markdown
# [Feature Name] — Implementation Plan

**Task:** [ticket link, issue URL, or task reference]
**Source:** [path to the spec, findings, or review file this plan was built from — omit if none]
**Date:** YYYY-MM-DD

## Goal
One sentence: what the user gets and why it matters. Start from the user's perspective, not the implementation.

## Approach
2–3 sentences on the technical strategy. Key decisions and why. Name any repo or framework constraint that shapes the implementation. Challenge any complexity the spec did not ask for.

## Key Contracts
Only the contracts that matter for this task. For each:
- What must stay true (precondition / postcondition / invariant)
- Where it crosses a boundary
- How the implementation will prove it holds

## File Map
| File | Action | What it does |
|------|--------|--------------|
| `path/to/file.ts` | Create | ... |
| `path/to/existing.ts` | Modify | ... |

For small, self-contained work, use one phase. For larger work, split the plan into ordered phases. Do not create separate plan files per phase.

## Phases

### Phase 1: [Outcome-sized name]
**Goal:** the independently useful or verifiable result this phase delivers.
**Files:** exact files touched
**Depends on:** none, or earlier phase(s)

#### Tasks

- [ ] Concrete, actionable task
- [ ] ...

#### Phase Verification Gate

- [ ] Exact command, test, inspection, or behavior check proving this phase is complete
- [ ] Confirm the phase's contracts and negative paths still hold

**Proceed only when:** every task and verification check above passes. If a check fails, fix or re-plan this phase before starting Phase 2.

### Phase 2: [Outcome-sized name]
**Goal:** ...
**Files:** exact files touched
**Depends on:** Phase 1

#### Tasks

- [ ] Concrete, actionable task

#### Phase Verification Gate

- [ ] Exact proof that this phase is complete

**Proceed only when:** every task and verification check above passes.

Use as many phases as the task needs. Keep phases sequential unless their file ownership and contracts are genuinely independent. When phases can safely run in parallel, state which ones may be delegated to subagents, their exact scope, and the integration/verification task that reunites their work. Never parallelize work that edits the same files, depends on unverified contracts, or makes integration ownership unclear.

**Execution protocol:** after approval, execute the plan one phase at a time in this same file. Complete and mark the phase's tasks, run and record its verification gate, then begin the next phase only after the gate passes. If a gate fails, keep work within that phase until it is fixed or the plan is explicitly revised. A final Validation section validates the whole feature; it never replaces a phase verification gate.

## Validation
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] Task-specific verification that proves the behavior works, not just that the build passed

## Pre-mortem
The top ways this could silently fail even if all checks pass.
- **Scenario:** what breaks
  **Prevention:** what the plan does about it
  **Verification:** how to confirm it held

## Decisions
Every question answered while writing this plan. One line each: the question, the option chosen, and the user's own reason if they gave one.
- **[question]** → [chosen option]. [User's reason, if given.]

## Out of Scope
Anything explicitly excluded.

## Open Questions
Remaining unknowns that don't block the plan but should be tracked.
```

**Plan quality rules:**
- Every step is a concrete action, not a vague directive
- File paths are exact and verified against the repo
- No placeholders, no TBDs
- Every new dependency is justified — if the stack already solves it, use what's there
- Apply the Rule of Three: if an abstraction generalizes fewer than 3 cases, name why it still makes sense
- Distinguish "build passes" from "behavior is correct" — lint/tests alone are not sufficient proof for stateful or cross-layer work
- When sibling implementations share a pattern, name the reference and require the others to match its guards and failure handling
- Every new endpoint, job, or write path gets at least one negative-path validation step
- Each phase has a concrete verification gate that proves its stated outcome before the next phase begins
- Each task belongs to exactly one phase; do not use a single unbounded task list for large work
- Only delegate phase work to subagents when its inputs, file ownership, and completion criteria are explicit and independent; retain one integration owner and verification gate
- Do NOT include commit steps

### 4.5 Self-Review Before Saving

Before saving, check:

1. Does every step in the plan appear in the spec? If not, justify it or cut it.
2. Does the Goal describe what the user gets, or just what gets built?
3. Are all file paths and framework APIs verified against the repo?
4. Does the plan name the boundary contracts and how they are verified?
5. Does the Pre-mortem name specific failure scenarios — not just "add error handling"?
6. Is the Validation section specific enough to prove the feature works?
7. Did the plan introduce contradictory statements between Tasks and Out of Scope?
8. For a large task, are phases ordered by dependency, with a concrete verification gate before each later phase?
9. If parallel delegation is proposed, are the subagent scopes independent and is the integration verification explicit?

If any answer is "no" or "not sure," fix the plan first.

### 5. Show the Plan and Wait

After saving:

> Plan saved → `~/.agents/plans/<repo-name>/<filename>.md` — reply "go" to execute, or tell me what to change.

Include a short 1–3 sentence summary of the main decisions. Do not dump the full plan in chat.

**Do not proceed further. Do not start implementing. Wait for explicit approval.**

## Anti-Slop Rules

- Never write a step that says "add error handling" or "write tests for the above"
- Never cite a file path without verifying it exists in the repo
- Never let "validation: run the tests" pass without naming what behavior those tests prove
- Never add abstractions that generalize beyond what the spec requires
- Never leave Open Questions unresolved — either answer them or make them blockers
- Never write a Pre-mortem that only lists "network failure" and "edge cases"
- Never accept TBD anywhere in a plan that is supposed to be ready for execution
- Never add a new dependency without checking if the stack already solves the problem
- Never treat a plan as done if the File Map contains paths you have not verified
- Never plan for future requirements that were not asked for
- Never start a later phase before recording how the preceding phase will be verified
- Never start a later phase before its preceding verification gate has passed
- Never split a plan into separate phase files; preserve one source of truth for the whole task
