---
name: plan
description: Use when asked to plan, create a plan, or write a plan for any feature, task, or spec. Triggered by phrases like "plan X", "write a plan for X", "let's plan X", "create a plan for X", or when starting work on a task that requires an implementation plan.
---

# Plan

## Overview

Write an implementation plan after grilling the user with clarifying questions. Always check for an existing plan first. Never proceed to execution without explicit user sign-off.

This skill is for producing plans that are executable in the current repo, not plausible-sounding documents. A good plan is grounded in the actual codebase, repo rules, source spec, and stack behavior.

The plan must optimize for correctness at the seams, not just a plausible implementation path. In particular, when work crosses boundaries such as client/server, app/DB, generated/manual code, config/runtime, or request/async job, the plan must explicitly name the contract at that boundary and how it will be verified.

## Steps

### 1. Check for Existing Plan

Determine the repo name from the current working directory or git remote. Then check:

```bash
ls ~/.agents/docs/projects/<repo-name>/plans/ 2>/dev/null | grep -i "<task-slug>"
```

**If a plan is found:**
- Show the file path to the user
- Ask: "A plan already exists at `<path>`. Use it, or write a new one?"
- If use existing: stop here and send only the plan link plus a short summary line if useful; do not print the full plan contents into the terminal
- If new: continue (new plan overwrites old)

**If no plan found:** continue to step 2.

### 2. Gather Context

Read the relevant parts of the codebase to understand:
- The tech stack, existing patterns, and conventions
- Any files directly related to the task
- Anything the spec references or depends on

If working from a task management ticket (Jira, Linear, GitLab Issues, GitHub Issues, ADO, ClickUp, etc.), the description and acceptance criteria are your spec.

You must also read the repo and global instructions that govern the work before planning:

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

Before you ask the user questions, inspect the current implementation:

```bash
rg --files
rg -n "symbolName|routePath|envVar|featureName|dependencyName" .
sed -n '1,220p' path/to/existing/file.ts
```

Do not plan from memory. Verify what exists, what does not exist, and what package or framework APIs are already installed or in use.

**Detect validation commands before writing the plan:**

```bash
# JS/TS — check package.json scripts
cat package.json 2>/dev/null | grep -E '"lint"|"typecheck"|"build"|"test"|"check"'

# Python
ls pyproject.toml setup.py requirements.txt 2>/dev/null
# → use: pytest / ruff check / mypy as appropriate

# Go
ls go.mod 2>/dev/null
# → use: go vet ./... / go test ./...

# Ruby
ls Gemfile 2>/dev/null
# → use: rubocop / rspec / bundle exec rake

# Rust
ls Cargo.toml 2>/dev/null
# → use: cargo clippy / cargo test
```

Use the actual scripts/commands found in the repo. Never default to `pnpm` commands unless the repo is a confirmed JS/TS project. Fill the Validation section of the plan with the real commands.

### 2.5 Reality Check Before Questions

Before writing questions or a plan, explicitly check these:

- Source spec alignment: what does the ticket/spec actually require?
- Repo rules: what constraints are non-negotiable here?
- Existing implementation: what modules, helpers, composables, routes, or patterns already exist?
- Dependency reality: is the needed package already installed, and if not, is a new dependency justified?
- Framework/runtime constraints: SSR vs client-only, lazy-loading, boot order, shutdown behavior, mobile constraints, build implications
- Delivery requirements: tests, lint, typecheck, build, docs, env validation, rollout or migration steps
- Boundary contracts: where do data, types, config values, auth assumptions, generated artifacts, or sort/pagination semantics cross layers?
- Failure modes: what are the top 3 ways this work can silently be wrong even if lint/tests pass?
- Minimal-valid-input behavior: for create/update flows, what happens when input is valid but contains only the minimum allowed data, including an empty object for partial updates?
- Type-safety shortcuts: does the intended approach rely on unchecked casts, inferred shapes, or presence checks that do not actually prove the inner value type?

If any of those checks reveal a likely conflict, ask targeted questions or record the constraint in the plan. Do not silently ignore it.

### 2.6 Contract and Drift Audit

Before questioning the user or drafting the plan, do a short audit for drift and hidden contracts. This is mandatory for any task that touches 2 or more layers, generated artifacts, or runtime configuration.

Check these categories and note only the ones that apply:

- **Data contract:** request/response shape, serialization format, schema nullability, enum/domain constraints
- **Ordering contract:** sorting, cursor/pagination semantics, deduplication, idempotency, tie-break rules
- **Type contract:** generated types vs handwritten types vs runtime validation
- **Config contract:** env vars, flags, defaults, schema-fixed values pretending to be dynamic
- **Auth/access contract:** caller identity, role checks, internal-only surfaces, admin/debug paths
- **Runtime contract:** retries, timeouts, shutdown, background work, cache invalidation, eventual consistency
- **Consistency contract:** sibling handlers, sibling jobs, or parallel implementations of the same pattern staying behaviorally aligned

If a category applies, the plan must either:
- include a concrete implementation step for it, or
- explicitly state why it is unaffected.

### 3. Grill the User

This step is non-negotiable. Before writing anything, ask every question you need answered. Do not be shy - probe the spec hard.

Ask clarifying questions **one at a time** by default. Do not batch multiple questions into a single message unless the user explicitly asks for grouped questions or the tool/runtime requires it. After each answer:
- reassess what remains unknown
- ask the next single highest-value question only if it is still needed
- stop questioning as soon as the remaining ambiguity is non-blocking

**Questions to dig into:**
- Ambiguous requirements ("what does 'X' mean exactly?")
- Unstated constraints ("does this need to work offline? on mobile?")
- Design decisions ("should this be a modal or a new page?")
- Data/API questions ("where does this data come from?")
- Edge cases ("what happens when the list is empty / user has no permissions?")
- Minimal valid writes ("for any create/update path, what should happen when the input is valid but contains only the minimum allowed fields?")
- Scope ("is X in or out of scope for this task?")
- Priority trade-offs ("if we can't do A and B, which matters more?")

Do not start writing the plan until you have the answers.

Question formatting rule:
- If you present multiple-choice clarifying questions, do not use markdown numbered lists for both the prompt and the options in the same message. Many chat renderers renumber all `1.` / `2.` items into a single sequence, which breaks option mapping. Use a prompt like `Q1: ...`, option labels `A.`, `B.`, `C.`, and ask the user to reply with the letter.
- Even for multiple-choice questions, ask only one question per message unless the user explicitly asks you to batch them.

**Wait for user answers before proceeding.**

If the codebase or spec already answers a question, do not ask it. Use questions for real unknowns, not things you could have verified yourself.

When the task has no real unknowns after inspection, say so explicitly and proceed without inventing questions. The goal is to remove ambiguity, not to satisfy a ritual.

### 4. Write the Plan

Save the plan to:

```
~/.agents/docs/projects/<repo-name>/plans/YYYY-MM-DD-<task-slug>.md
```

**Plan document structure:**

```markdown
# [Feature Name] - Implementation Plan

**Task:** [ticket link or task reference]
**Date:** YYYY-MM-DD

## Goal
One sentence: what this builds and why.

## Approach
2-3 sentences on the technical strategy. Key decisions made and why.
Call out any framework or repo constraints that materially shape the implementation.

## Key Contracts
List only the contracts that matter for this task. For each one, state:
- what must stay true
- where it crosses a boundary
- how the implementation and validation will prove it

Example headings:
- Pagination/order contract
- Type/schema contract
- Config/runtime contract
- Auth/access contract

## File Map
| File | Action | What it does |
|------|--------|--------------|
| `path/to/file.ts` | Create | ... |
| `path/to/existing.ts` | Modify | ... |

## Tasks

### Task 1: [Name]
**Files:** list the exact files touched

- [ ] Step description (specific, actionable)
- [ ] Step description
- [ ] ...

### Task 2: [Name]
...

## Validation
- [ ] <lint command — detected from stack>
- [ ] <typecheck command — if applicable>
- [ ] <build/test command — detected from stack>
- [ ] Any task-specific verification that proves the feature works

## Failure Modes Checked
- Failure mode: ...
  Prevention: ...
  Verification: ...
- Failure mode: ...
  Prevention: ...
  Verification: ...

## Out of Scope
Anything explicitly excluded from this task.

## Open Questions
Any remaining unknowns that don't block the plan but should be tracked.
```

**Plan quality rules:**
- Every step is a concrete action, not a vague directive
- File paths are exact, not approximate
- No placeholders, no TBDs
- Each task is independently reviewable
- Every file in the File Map must be backed by a codebase check, not a guess
- Every new dependency must be justified against what is already installed
- Include client/server, lazy-load, and runtime lifecycle constraints when relevant
- Include validation steps that match the repo's actual gates — never default to `pnpm` unless the repo is confirmed JS/TS
- Include contract checks when work crosses layers, uses generated artifacts, or introduces/changes runtime config
- Include at least one negative-path or failure-path validation for every new endpoint, job, integration, migration, or parser
- Include at least one minimal-valid-input validation for every new write path, especially partial updates or patch-style handlers
- Include regeneration steps when generated code, schema-derived types, compiled assets, or codegen outputs are affected
- Distinguish "build passes" from "behavior is correct"; do not treat lint/tests alone as sufficient proof for stateful, ordered, or cross-layer work
- Do not mark something out of scope if another task in the same plan depends on it to function
- When two or more sibling implementations share a pattern, name the reference implementation and require the others to match its guards, shared helpers, and observable behavior
- Do NOT include commit steps (user owns all git operations)

### 4.5 Self-Review Before Saving

Before saving the plan, review it against this checklist:

1. Does it satisfy the source spec and acceptance criteria rather than a guessed version of the task?
2. Does it obey repo rules and local architecture constraints?
3. Does it extend existing code where appropriate instead of inventing parallel structure?
4. Are file paths, package names, and framework APIs verified?
5. Does it cover tests and required verification commands?
6. Does it include build, SSR/client-only, env, rollout, or operational constraints when relevant?
7. Does it name the important boundary contracts and how they are verified?
8. Did it accidentally introduce contradictory statements between Tasks, Out of Scope, and Open Questions?
9. Does it check the obvious silent-failure cases, not just the happy path?

If any answer is "no" or "not sure", fix the plan before showing it to the user.

### 5. Show the Plan and Wait

After saving the plan, do **not** output the full plan contents directly in the chat unless the user explicitly asks for it.

Then say:

> Plan saved. [Open plan](<file:///path/to/plan.md>) — reply "go" to execute, or tell me what to change.

Replace `<file:///path/to/plan.md>` with the actual absolute `file://` URL of the saved plan file.

Optionally include a short 1-3 sentence summary of the plan's scope or the main decisions, but never dump the full markdown by default.

**Do not proceed further.** Do not offer execution options. Do not start implementing. Wait for the user to explicitly say to proceed.

## What NOT to Do

- Never skip the clarifying questions step, even if the spec seems clear
- Never batch clarifying questions by default; ask them one by one unless the user explicitly asks otherwise
- Never start writing the plan before getting answers
- Never auto-execute after saving - always wait for explicit approval
- Never add vague steps like "add error handling" or "write tests for the above"
- Never include git commit steps in the plan
- Never assume a framework API, dependency, or file path without checking the repo
- Never write a plan that ignores explicit repo constraints just because the high-level idea sounds right
- Never omit validation, build, or runtime constraints for infrastructure-heavy or framework-heavy changes
- Never pretend a value is configurable when another layer fixes it
- Never treat generated files or schema-derived types as automatically correct without a refresh/verification step
- Never stop at "implement X"; also state what could silently go wrong and how the plan proves it will not
