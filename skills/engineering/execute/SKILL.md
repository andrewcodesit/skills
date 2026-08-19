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

## 2. Plan the execution

Two decisions here: which tasks can run concurrently, and what each task is worth running on.

When the plan carries a **Task Ownership** table per phase, it already answers both: `Files owned`
and `Depends on` give the waves, `Risk` gives the tier. Use it — but verify rather than trust. Two
tasks the table calls independent while both editing a barrel file, or a task marked `standard` that
the Key Contracts section also names, is a planning error you correct here and mention in the report.
Plans without the table get the same analysis derived from the task text and File Map.

### 2a. Group the tasks into waves

Two tasks may share a wave only when all three hold: they touch different files, neither consumes a
type, function, or output the other creates, and their order is irrelevant to correctness. Everything
else is sequenced.

Most plans are neither fully parallel nor fully serial. Build **waves**: a shared-foundation task
runs alone first, the independent tasks that depend on it fan out together in the next wave, and a
task touching a shared file (index, router, schema, migration list) runs alone again. Sequence
whenever in doubt — a wrong parallel run costs more to untangle than a slow serial one.

A task stays **inline** (done by this agent, no subagent) when it is a handful of lines, when it
needs conversation context a briefing pack cannot carry, or when the whole plan is one wave of one
task. Delegation has a fixed cost; do not pay it for a two-line edit.

### 2b. Set a capability tier per task

Judge how much reasoning capability each task genuinely demands, in three tiers. These describe the
work, never a particular product:

- **Routine** — fully specified, no judgment left: renaming, moving constants, copy and string
  changes, wiring config the plan spells out, repeating a pattern that already exists in the repo.
  The task is "type this out", not "decide anything".
- **Standard** — bounded work inside one layer: one route, one component, one migration, one service
  method, tests for behavior that already exists. The design is settled; judgment applies locally.
- **Deep** — anything the plan flagged as a contract or failure mode, cross-layer changes, tricky
  ordering, state, concurrency or idempotency, auth and security-sensitive paths, ambiguous tasks
  where the executor must resolve a design question, and any task whose blast radius is wide enough
  that a subtle wrong answer survives green tests.

The plan's `Risk` column maps straight across — `mechanical` → routine, `standard` → standard,
`contract` → deep — but overrule it when the task text disagrees with its label.

**Then bind the tiers to what this environment actually offers.** Inspect the delegation mechanism
available here and what it lets you vary per delegated task:

- If it accepts a **model or capability override**, order the models this session exposes by
  capability and assign the least capable one that clears the task's tier. Read the roster from the
  environment rather than from memory — it differs per harness and changes over time.
- If it accepts a **named executor, role, or profile** instead, pick the one whose description
  matches the task's tier and domain.
- If it offers **no per-task control**, everything runs at the session default. The tier still earns
  its place: it sets how thorough the briefing pack is and how hard step 4 verifies that task.

Two escalation rules override the tiers: a task the plan calls risky never runs below standard, and a
task returning `NEEDS_CONTEXT` or `BLOCKED` is retried one tier up before you take it inline. Never
downgrade the step 4 review — it runs at the session default or better.

State the assignment before you launch, one line per task, naming the tier and whatever this
environment resolved it to: `T3 → standard (new route, single layer)`. The user should be able to
veto an assignment before the tokens are spent.

## 3. Execute

**Delegated tasks.** Launch one subagent per task, dispatching a whole wave at once if the
environment can run them concurrently, and wait for the wave to finish before starting the next.
Prefer a general-purpose executor unless a more specialized one clearly fits the task. When no
delegation mechanism exists here, run every task inline in wave order — the grouping and tiering
above still hold, they just describe your own passes instead of subagents.

Each prompt is a **briefing pack** — everything the subagent needs and nothing else. Subagents never
read the plan file and never see the other tasks:

- the task text pasted verbatim, plus its acceptance criteria
- the exact files to read first, by path — not "explore the repo"
- only the contracts at *this task's* boundary: the signatures, types, and shapes it must consume or
  produce. When an earlier wave created them, paste the real resulting signature, not the plan's
  prediction of it.
- only the conventions that apply to this task's layer, quoted from `AGENTS.md` — not the whole file
- the working directory and stack
- "the user owns all git operations; do not commit or push", unless `AGENTS.md` overrides it here
- scope fencing: what this task must not touch, naming the files other tasks in the wave own
- report back `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`, with the files changed

Scale the pack to the tier: a routine task needs the target file, the exact change, and the pattern
to copy; a deep task needs the surrounding contracts and the failure modes the plan named.

Surface any `BLOCKED` you cannot resolve before continuing other tasks. Verify each wave's files
exist and look right before launching the next — a subagent reporting `DONE` is a claim, not proof.

**Inline tasks.** Work the plan's checkbox steps in order, verifying each task's files exist and look
right before moving on.

Either way: when a task changes generated artifacts, runtime config, migrations, ordering logic, or
cross-layer contracts, complete the codegen, type refresh, and dependent-file updates inside the same
execution flow rather than leaving them as implied follow-up.

## 4. Review the implementation

Three passes, all of them, even when the implementation looks obviously correct.

The review runs on the code, never on the subagents' reports. Read every file a delegated task
changed before judging it — a `DONE` summary is the one thing in this skill that cannot be trusted,
and cheaper tiers concentrate their mistakes exactly where the plan was thinnest. Pay extra attention
to the seams between tasks: two subagents that each satisfied their own briefing pack can still
disagree about the shape that crosses between them.

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
