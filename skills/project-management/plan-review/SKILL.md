---
name: plan-review
description: Use when the user asks to review an implementation plan or asks what you think about a plan. Triggered by phrases like "review this plan", "what do you think about this plan", "check this plan", "plan review", "is this plan solid", or when the user links or pastes a plan and wants critique rather than execution.
---

# Plan Review

## Overview

Review implementation plans like a senior engineer reviewing a design doc before work starts. The goal is to catch bad assumptions, repo-rule violations, architectural drift, security leaks, missing rollout concerns, and fake precision before code gets written.

**Announce at start:** `Running plan review...`

The plan may live in the repo, in `~/.agents/docs/projects/<repo>/plans/`, or in the user message itself.

This review must stress the plan, not just summarize it. Treat every plan as guilty until it proves that its cross-layer contracts, failure modes, and validation strategy are real.

## What This Review Must Check

### 0. Source Spec Alignment

If the plan appears to come from a source spec, compare the plan against that source before reviewing implementation details.

Priority order:
- Task management ticket referenced in the plan (Jira, Linear, GitLab Issues, GitHub Issues, ADO, ClickUp, etc.)
- Spec/wiki page referenced in the plan (Confluence, Notion, etc.)
- Repo-local spec/note/task document referenced in the plan
- User-provided task description in the current chat

If the plan references a ticket or spec page, fetch and read it before judging the plan. Read the title, description, acceptance criteria, and any scope-defining comments that materially affect implementation. Compare the plan against the task, not just the codebase.

**How to access common systems:**

| System | How to fetch |
|--------|-------------|
| Jira | Use Atlassian MCP tool or `mcp__atlassian__getJiraIssue` |
| Linear | Use Linear MCP tool or fetch the URL |
| GitLab Issues | Use `glab issue view <id>` or fetch the GitLab URL |
| GitHub Issues | Use `gh issue view <id>` |
| Azure DevOps | Fetch the work item URL |
| ClickUp | Fetch the task URL |
| Confluence / Notion | Fetch the page URL |

If the system is not accessible via available tools, ask the user to paste the ticket description before proceeding.

Flag as findings when the plan:
- Misses acceptance criteria
- Adds material scope not present in the task
- Ignores explicit constraints or rollout requirements from the task
- Solves a different problem than the source ticket describes
- Claims decisions are settled when the task spec does not support that claim

### 1. Repo Rules and Local Standards

Read the rules that apply to the current repo before judging the plan:

```bash
sed -n '1,220p' AGENTS.md 2>/dev/null
sed -n '1,220p' context/code-standards.md 2>/dev/null
sed -n '1,220p' context/architecture-context.md 2>/dev/null
sed -n '1,220p' context/design-context.md 2>/dev/null
sed -n '1,220p' context/project-overview.md 2>/dev/null
sed -n '1,220p' context/domain-context.md 2>/dev/null
sed -n '1,220p' ~/AGENTS.md 2>/dev/null
```

Only read the context files relevant to the plan, but always read `AGENTS.md`, `context/code-standards.md`, and global `~/AGENTS.md`.

Flag as findings when the plan:
- Violates explicit repo rules
- Puts work in the wrong app/package/layer
- Proposes file paths or structures that conflict with current project patterns
- Adds work that already exists in the codebase

### 2. Codebase Reality Check

A plan review is not theoretical. Inspect the actual codebase.

For each planned file or subsystem:
- Verify the file exists or not
- Read the current module that would be modified
- Search for existing implementations of the same concept
- Check whether the plan duplicates existing helpers, middleware, routes, env handling, logger usage, or patterns

Useful commands:

```bash
rg --files
rg -n "symbolName|routePath|envVar|queue|worker|middlewareName" .
sed -n '1,220p' path/to/file.ts
```

Flag as findings when the plan:
- Re-creates something that already exists
- Misses an obvious existing abstraction it should extend
- Targets the wrong file because the architecture has already settled elsewhere
- Assumes framework behavior that does not match the current app setup

### 2.5 Cross-Layer Contract Review

For any plan that touches more than one layer or system, explicitly inspect the boundary contracts the plan depends on. Common examples:

- API/input/output schemas crossing network boundaries
- App code depending on SQL functions, migrations, ORM models, or generated DB types
- Config/env values consumed by more than one layer
- Ordering-sensitive behavior such as pagination, deduplication, ranking, retry order, or cache invalidation
- Generated artifacts consumed as if they were ground truth

Flag as findings when the plan:
- Changes one side of a contract but not the other
- Assumes a value is configurable when another layer fixes it
- Omits regeneration or synchronization steps for generated artifacts
- Describes ordered behavior without naming the tie-break, idempotency, or boundary semantics
- Has no validation step that proves cross-layer agreement

### 3. Stack Best Practices

Judge the plan against the actual stack in the repo, not generic advice.

Check for:
- Framework-idiomatic usage
- Correct lifecycle/boot/shutdown handling
- Type safety expectations
- Testing strategy appropriate to the stack
- Dependency choices that fit the existing architecture
- Operational concerns for the chosen infrastructure

Examples:
- Hono: middleware order, router composition, error-shape consistency, request context usage
- TypeScript: avoid vague `any` plans, require typed exports and shared types where appropriate
- Monorepo: respect package boundaries and build steps for compiled shared packages
- Redis / BullMQ / workers: connection reuse, shutdown, health checks, local/prod config split, failure handling

### 4. Security and Exposure

Explicitly check that the plan does not leak sensitive information or accidentally expose internal surfaces.

Look for:
- Secrets, tokens, URLs, internal hosts, or credentials proposed for committed files
- Plans to expose admin/debug/ops UIs without proper gating
- Logging of secrets, JWTs, headers, or PII
- Webhook, callback, or endpoint designs that trust user input incorrectly
- GitLab leakage: CI variables, private URLs, internal project identifiers, auth headers, webhook secrets, deploy tokens
- Open endpoints that should stay internal or admin-only

Flag anything that would place sensitive values in:
- Tracked `.env.example` files beyond safe placeholders
- Plan docs that may later be committed
- Source code, tests, fixtures, screenshots, or example curl commands

### 5. Delivery Completeness

A solid plan covers the work needed to land safely, not just "main code files".

Check for missing:
- Tests
- Env schema/build updates
- Migrations or seed impacts
- Docs the repo actually relies on
- Rollback/shutdown behavior
- Observability: logs, metrics, error handling
- Access control and authorization
- Local DX setup
- CI/build implications

Flag plans that only describe the happy path.

### 6. Failure-Mode Completeness

Review whether the plan names and addresses the obvious ways the work can be silently wrong even if build checks pass.

Look for missing treatment of:
- Negative paths and malformed input
- Minimal-valid-input cases where valid-but-sparse data triggers a runtime or persistence-layer failure
- Partial rollout or migration ordering problems
- Drift between runtime validation, compile-time types, and persisted schema
- Silent behavioral bugs in ordered/stateful systems such as pagination, retries, eventual consistency, and deduplication
- False confidence from narrow tests that only exercise helpers or happy paths

## Review Workflow

### Step 1: Load the Plan

Read the referenced plan file or the plan text from the user.

If the user references a path, open that exact file first.

### Step 2: Load the Source Spec

If the plan references a ticket or spec page, fetch and read it before judging the plan. Use whatever tools are available for the system in use — see the lookup table in section 0 for how to access common systems.

At minimum:
- Read the title/summary
- Read the description and acceptance criteria
- Read any linked context that changes scope or requirements

If the upstream spec cannot be accessed, say so explicitly in the final review and downgrade certainty where needed. If no tools are available, ask the user to paste the ticket description.

### Step 3: Read Repo Rules

Load the relevant repo instructions and context files before judging the plan.

### Step 4: Inspect Current Implementations

Read the current files the plan intends to modify. Search for comparable implementations elsewhere in the codebase.

At minimum:
- Read every file explicitly named in the plan that already exists
- Search for existing helpers/middleware/routes/services related to the proposed work
- Check whether the plan's file map aligns with current structure

### Step 5: Review Through These Lenses

Use these lenses in order:

1. Source spec mismatch
2. Rule violations
3. Architecture / wrong-layer issues
4. Codebase mismatch or redundant work
5. Cross-layer contract drift
6. Stack best-practice problems
7. Security / exposure risks
8. Missing implementation steps
9. Missing tests / rollout / ops concerns
10. Silent-failure risk

### Step 6: Produce Findings Only if They Matter

Do not pad the review. If there are no meaningful issues, say so explicitly and then mention any residual risks or unanswered questions.

## Output Format

Use this contract every time. Do not improvise the structure.

```markdown
---
date: <YYYY-MM-DD>
repo: <repo-name>
plan: <plan file path or ticket URL>
ticket: <issue key, if any>
---

## Plan Review — <plan name>

### Blocking Findings
- 🔴 [file-or-plan-section]: issue, why it matters, what the plan should do instead

### Non-Blocking Risks
- 🟡 [file-or-plan-section]: issue, why it matters, what is risky or incomplete

### Missing Steps
- [file-or-plan-section]: missing implementation, test, rollout, security, or ops step

### Open Questions
- Question that must be answered or explicitly accepted as a tradeoff

### Verdict
- `ready`: no blocking findings; minor risks only
- `needs edits`: workable direction, but specific corrections are required before execution
- `rewrite`: the plan is built on wrong assumptions, wrong layering, or major omissions
```

Rules for the report:
- Omit any section that has no items except `Verdict`
- Cite concrete file paths and line numbers when you can
- If the issue is inside the plan document, cite the section name or plan line
- Lead with the problem, then why it matters, then the correction
- Put true blockers only in `Blocking Findings`
- Put gaps that are not strictly wrong but still risky in `Non-Blocking Risks`
- Put omitted but necessary work in `Missing Steps`
- Be direct; no hedging language

## Step 6.5: Save Review to File

**Do not print the full review report to the terminal.** Write it to a file and print a short summary line instead.

### Determine repo name

```bash
basename $(git rev-parse --show-toplevel 2>/dev/null) 2>/dev/null || echo "global"
```

### Determine file slug

Priority order:
1. Issue key extracted from the plan (e.g. `MP-1`, `ENG-42` → `mp-1`, `eng-42`)
2. The plan filename without extension, lowercased, spaces → hyphens
3. Current branch name: `git rev-parse --abbrev-ref HEAD 2>/dev/null`

Append `-plan-review` to the slug.

Example: issue key `MP-1` + plan title "Start project" → `mp-1-start-project-plan-review.md`

### Write the file

```bash
mkdir -p ~/.agents/plan-reviews/<repo>/
```

Write the full review (with frontmatter) to:
```
~/.agents/plan-reviews/<repo>/<slug>.md
```

### Terminal output

After saving, print only this to the terminal — nothing else:

```
Plan review saved → ~/.agents/plan-reviews/<repo>/<slug>.md
```

Do not print the full report body to the terminal. The link above is enough for the user to open the file.

## High-Value Findings to Look For

These are common plan failures worth checking every time:

- Plan does not actually satisfy the source ticket or spec
- Plan invents scope that was never asked for
- Planned file already exists with the needed behavior
- New file should actually be an extension of an existing module
- Plan adds a new dependency when the stack already has an accepted pattern
- Plan forgets generated/build artifacts required by the monorepo
- Plan names the wrong error class, wrong response shape, or wrong route prefix
- Plan introduces a public/admin/debug endpoint without auth and authorization review
- Plan puts business logic in a frontend app or thin BFF
- Plan adds env vars but forgets validation, docs, and downstream rebuild/type refresh
- Plan changes generated/schema-derived outputs but forgets the regeneration step
- Plan describes pagination, ranking, or ordering without a stable contract and boundary test
- Plan defines sibling implementations of the same pattern but does not compare them for consistency in guards, shared helper usage, or failure handling
- Plan relies on unchecked casts or weak narrowing that proves presence but not the value's real type
- Plan relies on helper-only tests while leaving route/integration failure paths untested
- Plan treats lint/build success as proof of runtime correctness
- Plan describes boot-time work but ignores shutdown and deploy behavior
- Plan assumes local-only infrastructure choices will work unchanged in production
- Plan includes unsafe example values, secrets, URLs, or GitLab-specific internals

## What To Add Beyond the User's Initial Criteria

Always also assess:
- Spec alignment: does this plan satisfy the actual task?
- Redundant work: does the plan rebuild something that is already present?
- Missing tests: what proves the plan worked?
- Operational readiness: startup, shutdown, retries, observability, failure modes
- Rollout safety: migration order, backward compatibility, config dependency order
- Scope discipline: is the plan mixing MVP work with future-wave abstraction?
- False certainty: are there "no open questions" claims that are not defensible?
- Contract integrity: do all touched layers agree on types, config, ordering, and access rules?
- Silent-failure coverage: what would still be broken if the happy path passes?

## Step 7: Interactive Gap Resolution

After saving the file, if the review contains any Blocking Findings, Non-Blocking Risks, Missing Steps, or Open Questions, offer the user a choice:

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
- After all questions are answered, produce a short summary of decisions made and what still needs updating in the plan

Formatting rule for interactive questions:
- Do not use markdown numbered lists for both the prompt and the options in the same message. Many chat renderers renumber all `1.` / `2.` items into a single sequence, which breaks the mapping between the visible option numbers and the requested reply. Use a prompt like `Q1: ...`, option labels `A.`, `B.`, `C.`, and ask the user to reply with the letter.

If the user selects **2**:

- State which option you'd choose for each ambiguous finding and why (one sentence each)
- Ask if the user wants to proceed with that plan

**Do not ask questions if the review verdict is `ready` with no open questions.**

---

## What Not To Do

- Do not execute the plan
- Do not rewrite the whole plan unless the user asks
- Do not give generic best-practice filler without tying it to this repo
- Do not review the plan in isolation if an upstream ticket or spec document exists
- Do not ignore existing implementations
- Do not miss security exposure just because the plan is "only a document"
- Do not accept "tests will cover it" unless the plan names the layer and failure mode those tests cover
- Do not let a plan claim "configurable" without checking whether another layer hardcodes the value
