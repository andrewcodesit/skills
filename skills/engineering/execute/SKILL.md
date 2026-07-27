---
name: execute
description: Use when the user approves a plan and says "go", "go for it", "execute", "implement it", or similar. Runs the implementation, then reviews against spec and repo standards.
---

# Execute Plan

## Mandatory approval gate

Only run this skill after the user has seen the plan and explicitly approved it in a later turn, or has invoked `/execute` in a later turn. **Never infer approval from the existence of a plan file, from the user's initial request to start work, or from same-turn wording such as “go,” “let’s do it,” or “implement it” before the plan was presented.** If the plan has not been presented and separately approved, stop and present the plan instead of changing files.

## Overview

Take an approved plan and implement it - dispatching parallel subagents for independent tasks, or executing inline for sequential ones. Review the result before offering next steps.

**Announce at start:** "I'm using the execute skill to implement this plan."

Execution quality is not "the code compiles and tests pass." This skill must verify that the implementation preserved the plan's boundary contracts and does not hide silent behavioral bugs behind green checks.

---

## Step 1: Load the Plan

Find the most recent unexecuted plan for this repo:

```bash
ls ~/.agents/plans/<repo-name>/ | grep -v '^EXECUTED-' | sort | tail -5
```

If multiple plans exist, show the list and ask which one to execute. If only one exists, load it, but do not proceed until the approval gate above is satisfied. A plan file alone is never authorization to implement.

Store the exact plan file path you loaded in a variable for later. You will need that same path in Step 5 when marking the plan as executed.

Read the full plan. Extract:
- All tasks (with their steps, file paths, and dependencies)
- Goal and architecture notes
- Out-of-scope items
- Key contracts and failure modes called out by the plan

---

## Step 2: Determine Execution Mode

Analyze task dependencies:

**Parallel (subagents)** - tasks qualify when ALL of the following are true:
- They touch different files (no shared writes)
- No task relies on a type, function, or output created by another task in this plan
- Order doesn't matter for correctness

**Sequential (inline)** - use when ANY of the following is true:
- Task N creates code that Task N+1 imports or extends
- A shared file (e.g. index.ts, router, schema) is modified across tasks
- Task order affects correctness

When in doubt, choose sequential - a wrong parallel execution is harder to fix than a slow sequential one.

---

## Step 3: Execute

### Mode A: Parallel (independent tasks)

Dispatch one subagent per task simultaneously. Each subagent prompt must include:

1. **The full task text** (copy verbatim from the plan - do not make them read the plan file)
2. **Repo context:** working directory, tech stack, relevant conventions from AGENTS.md/CLAUDE.md
3. **What files to read before starting** (from the repo's context map if one exists)
4. **Explicit constraint:** "Do NOT commit. Do NOT push. User owns all git operations." — unless AGENTS.md explicitly overrides this for the repo.
5. **Status instruction:** Report back with DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED

Wait for all subagents to complete before proceeding to Step 4.

### Mode B: Sequential (inline)

Execute each task step by step in the current session, following the plan's checkbox steps exactly. Do not skip steps. After each task, verify the expected files exist and look correct before moving to the next.

When a task changes generated artifacts, runtime config, migrations, ordering logic, or cross-layer contracts, complete the synchronization steps in the same execution flow. Do not leave codegen/type refresh or dependent file updates as implied follow-up work.

---

## Step 4: Review Implementation

After all tasks complete, run a three-pass review.

### Pass 1 - Spec Compliance

Compare the implementation against the plan's requirements:
- Every requirement in the plan has corresponding code
- Nothing extra was added beyond the spec
- File paths match what the plan specified
- Out-of-scope items were NOT implemented

### Pass 2 - Repo Standards

Read the following in order (repo-specific rules override global ones):
1. `AGENTS.md` in the project root (if it exists)
2. `CLAUDE.md` in the project root (if it exists, and if it contains its own rules - not just a pointer)
3. `~/.claude/CLAUDE.md` (global fallback)

Check against the standards found. Common things to verify:
- Naming conventions (e.g. BEM for SCSS classes)
- File placement matches project structure
- No AI/assistant attribution in code or comments
- Commit format if commits were made (only relevant if AGENTS.md permits git actions)
- Shared helpers, shared schemas, and common utilities are reused consistently instead of being inlined into sibling implementations
- Any repo-specific patterns called out in `context/` files if a context map exists

### Pass 3 - Adversarial Correctness

Try to prove the implementation wrong before calling it done. Check the contracts and failure modes from the plan against the real code.

At minimum, review these categories when relevant:
- **Cross-layer agreement:** do types, runtime validation, persisted schema, generated artifacts, and docs all agree?
- **Sibling consistency:** when the plan created parallel implementations of the same pattern, do they use the same guards, shared abstractions, and boundary behavior?
- **Ordering/stateful behavior:** are pagination, sorting, deduplication, retries, cursor logic, idempotency, or cache invalidation stable at boundaries?
- **Config drift:** does every configurable value have a real consumer, and is anything falsely presented as configurable?
- **Negative paths:** do malformed input, failed integrations, permission failures, empty states, and partial results fail in a controlled way?
- **Minimal valid input:** for write paths that accept sparse or partial input, what happens when the payload contains only the minimum allowed fields or is otherwise structurally valid but effectively empty?
- **Validation depth:** do tests exercise the correct layer, or only narrow helpers while route/integration behavior remains unproven?

Do not treat passing lint/build/tests as sufficient if the implementation changed ordered behavior, schema contracts, or multi-layer integration points.

### Post-review offers

- If the work removed, renamed, or moved behavior, offer to run `cleanup` to catch dead imports, stale harnesses, or orphaned UI affordances left behind by the refactor.
- If UI behavior changed, offer `verify-ui` — but only run browser-based, visual, or interactive verification with explicit user approval in the current turn. Never launch it on your own.

---

## Step 5: Report Results

### If issues were found (either pass):

Present a clean summary:

```
## Review Findings

### Spec gaps
- [ ] <specific issue and where>

### Standards violations  
- [ ] <specific issue and where>

### Behavioral risks
- [ ] <silent bug, cross-layer drift, or boundary issue and where>
```

Then offer a resolution gate.

Read `references/question-format.md` and follow its Resolution Gates section exactly — the standard dispositions, the computed recommendation, and the format of the gate itself.

If that file cannot be read, stop and tell the user:

> Question-format reference not found at `references/question-format.md`.
> I can't ask questions in the standardized format without it.
>
> Continue anyway with an improvised format, or stop so you can fix the file?

Then wait. Never improvise silently and never continue as if the format were loaded.

Offer only the dispositions that apply. These findings come from adversarial review of just-written code, so they are more likely than usual to be structural — when a finding is architecture-level, crosses 3+ files, or is a decomposition, recommend routing it back through the planning skill rather than patching inline.

**Wait for user approval before proceeding.** Never present fix work as already done.

### If no issues were found:

Say: "Implementation complete, review passed."

**Mark plan as executed (always do this before offering next steps):**

Rename the plan file to prepend `EXECUTED-` so later agents do not re-execute it or mistake it for pending work:

```bash
PLAN_FILE=~/.agents/plans/<repo-name>/<plan-file>.md
PLAN_DIR=$(dirname "$PLAN_FILE")
PLAN_BASE=$(basename "$PLAN_FILE")

case "$PLAN_BASE" in
  EXECUTED-*) ;;
  *) mv "$PLAN_FILE" "$PLAN_DIR/EXECUTED-$PLAN_BASE" ;;
esac
```

If the rename fails because the plan came from a non-standard location or no longer exists, skip silently. Do not block completion on bookkeeping. The goal is simply to leave a visible marker for the next agent whenever possible.

**Context file check (always run this before offering next steps):**

Ask yourself: did this implementation introduce anything that isn't already captured in `context/`? Specifically:

- A non-obvious pattern or convention that emerged during implementation
- An architectural decision that was made (even a small one)
- A new "what agents get wrong" trap — something that tripped up during this implementation or that a future agent would likely misunderstand
- A new component, service, or external dependency
- A business rule that became concrete during coding

If yes to any of these, draft the proposed edits (which file, what's being added/changed, and why) and show them to the user. Wait for explicit approval before running `/update-context-files` to apply them. Include what was updated in the report once applied. If context files don't exist for this repo yet, skip silently (don't prompt to create them mid-execution).

Then offer `close-task` for task status, final validation, and any explicit git/PR workflow. Do not commit, push, or mark external work done from `execute` unless the user explicitly asks in the current turn.

---

## Red Flags

- **Never** start implementing before loading and reading the full plan
- **Never** skip the review step even if the implementation looks obviously correct
- **Never** implement out-of-scope items "while you're at it"
- **Never** leave a successfully implemented plan looking unexecuted when the plan file is writable
- **Never** present fix plans as already done - offer first, implement after approval
- **Never** let a subagent read the plan file - paste the full task text into their prompt
- If a subagent returns BLOCKED and you can't resolve it, surface it to the user before continuing other tasks
- **Never** stop at helper-level tests for a new endpoint, integration, migration, parser, or ordered/stateful workflow when a higher-layer verification is feasible
- **Never** leave generated files, schema-derived types, or runtime docs stale after changing their source contract
- **Never** call the implementation complete if a key contract in the plan was not explicitly re-verified after coding
