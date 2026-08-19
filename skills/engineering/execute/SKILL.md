---
name: execute
description: Use when the user approves a plan and says "go", "go for it", "execute", "implement it", or similar. Runs the implementation, then reviews against spec and repo standards.
---

# Execute Plan

Announce at start: `Executing the plan...`

Take an approved plan and implement it, then prove the implementation right before calling it done.
"The code compiles and tests pass" is not the bar — this skill verifies that the plan's boundary
contracts survived implementation and that no silent behavioral bug is hiding behind green checks.

**Approval gate:** run this only after the user has seen the plan and approved it in a later turn, or
invoked `/execute` in a later turn. A plan file on disk is not authorization. Same-turn wording like
"go" or "let's do it" spoken *before* the plan was presented is not authorization either — present
the plan and stop instead.

## 1. Load the plan

```bash
ls ~/.agents/plans/<repo-name>/ | grep -v '^EXECUTED-' | sort | tail -5
```

With multiple candidates, show the list and ask which to execute. Keep the exact path — step 5 needs
it. Read the whole plan and extract the tasks with their file paths and dependencies, the goal and
architecture notes, the out-of-scope items, and the key contracts and failure modes it calls out.

## 2. Choose the execution mode

Go **parallel** (one subagent per task) only when all three hold: tasks touch different files, no
task consumes a type, function, or output another creates, and order is irrelevant to correctness.

Go **sequential** (inline) otherwise — when task N creates what N+1 imports, when a shared file
(index, router, schema) is touched across tasks, or when order affects correctness. When in doubt,
sequential: a wrong parallel run costs more to untangle than a slow serial one.

## 3. Execute

**Parallel.** Each subagent prompt carries the full task text pasted verbatim (subagents never read
the plan file), the repo context — working directory, stack, the conventions from `AGENTS.md` — the
files to read first, the constraint "the user owns all git operations; do not commit or push" unless
`AGENTS.md` overrides it for this repo, and the instruction to report back `DONE`,
`DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`. Wait for all of them before step 4. Surface any
`BLOCKED` you cannot resolve to the user before continuing other tasks.

**Sequential.** Work the plan's checkbox steps in order, verifying each task's files exist and look
right before moving on.

Either way: when a task changes generated artifacts, runtime config, migrations, ordering logic, or
cross-layer contracts, complete the codegen, type refresh, and dependent-file updates inside the same
execution flow rather than leaving them as implied follow-up.

## 4. Review the implementation

Three passes, all of them, even when the implementation looks obviously correct.

**Spec compliance.** Every plan requirement has corresponding code, file paths match what the plan
specified, out-of-scope items stayed unimplemented, and nothing extra was added.

**Repo standards.** Read `AGENTS.md`, then `CLAUDE.md` if it carries its own rules rather than a
pointer, then `~/.claude/CLAUDE.md`; repo-specific rules override global ones. Check the standards
you find — typically naming conventions, file placement, absence of AI or assistant attribution in
code and comments, consistent reuse of shared helpers and schemas instead of inlined copies, and any
repo-specific pattern the context map calls out.

**Adversarial correctness.** Try to prove the implementation wrong. Check the plan's contracts and
failure modes against the real code:

- **Cross-layer agreement** — do types, runtime validation, persisted schema, generated artifacts,
  and docs all agree?
- **Sibling consistency** — do parallel implementations of one pattern share guards, abstractions,
  and boundary behavior?
- **Ordering and state** — are pagination, sorting, deduplication, retries, cursors, idempotency, and
  cache invalidation stable at the boundaries?
- **Config drift** — does every configurable value have a real consumer, and is anything falsely
  presented as configurable?
- **Negative paths** — do malformed input, failed integrations, permission failures, empty states, and
  partial results fail in a controlled way?
- **Minimal valid input** — for write paths accepting sparse input, what happens with only the minimum
  allowed fields?
- **Validation depth** — do tests exercise the real boundary, or only narrow helpers while route and
  integration behavior stays unproven?

Green lint, build, and tests do not settle any of the above when the change touched ordered behavior,
schema contracts, or multi-layer integration. Reach for the higher-layer verification whenever it is
feasible: a new endpoint, integration, migration, parser, or stateful workflow needs more than a
helper-level test.

## 5. Report

**When the review found issues:**

```
## Review Findings

### Spec gaps
- [ ] <specific issue and where>

### Standards violations
- [ ] <specific issue and where>

### Behavioral risks
- [ ] <silent bug, cross-layer drift, or boundary issue and where>
```

Then read `references/question-format.md` and offer a resolution gate per its Resolution Gates
section. These findings come from adversarial review of just-written code, so they skew structural:
when a finding is architecture-level, crosses 3+ files, or is a decomposition, route it back through
the planning skill rather than patching inline. Offer only the dispositions that apply, and wait for
approval — fix work is offered, never presented as already done.

**When it found none:** say "Implementation complete, review passed."

**Then, always:**

Mark the plan executed so later agents don't re-run it:

```bash
PLAN_FILE=~/.agents/plans/<repo-name>/<plan-file>.md
PLAN_DIR=$(dirname "$PLAN_FILE"); PLAN_BASE=$(basename "$PLAN_FILE")
case "$PLAN_BASE" in
  EXECUTED-*) ;;
  *) mv "$PLAN_FILE" "$PLAN_DIR/EXECUTED-$PLAN_BASE" ;;
esac
```

If the rename fails because the plan came from a non-standard location, skip silently — bookkeeping
never blocks completion.

Check whether the implementation surfaced anything `context/` doesn't capture: a convention that
emerged, an architectural decision, a new trap a future agent would fall into, a new component,
service, or dependency, or a business rule that became concrete during coding. If so, draft the
proposed edits — which file, what changes, why — and wait for approval before running
`/update-context-files`. Skip silently when the repo has no context files.

Finally, offer the follow-ups that apply: `cleanup` when the work removed, renamed, or moved
behavior; `verify-ui` when UI behavior changed, run only with explicit approval in the current turn;
and `close-task` for task status, final validation, and any git or PR workflow. Committing, pushing,
and marking external work done belong to `close-task` and only when the user asks in the current turn.
