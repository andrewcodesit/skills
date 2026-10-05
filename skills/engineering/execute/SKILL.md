---
name: execute
description: Use when the user approves a presented plan - by answering the plan skill's approval question, by approving it in a message, or by invoking /execute. Runs the implementation, then verifies it against the plan, repo standards, and the contracts the plan named.
---

# Execute Plan

Announce at start: `Executing the plan...`

Take an approved plan and implement it, then prove the implementation right before calling it done.
"The code compiles and tests pass" is not the bar - this skill verifies that the plan's boundary
contracts survived implementation and that no silent behavioral bug is hiding behind green checks.

**Approval gate:** run this only after the user has seen the plan and approved it - by answering the
approval question, approving in a message, or invoking `/execute`. A plan file on disk is not
authorization, and neither is wording like "go" spoken *before* the plan was presented - present the
plan and ask for approval instead.

## 1. Load the plan

```bash
ls ~/.agents/plans/<repo-name>/ | grep -v '^EXECUTED-' | sort | tail -5
```

With multiple candidates, show the list and ask which to execute. Keep the exact path - step 5 needs
it. Read the whole plan and extract the tasks with their file paths and dependencies, the goal and
architecture notes, the out-of-scope items, and the key contracts and failure modes it calls out.

Tick each task and gate box in the plan file as it passes. A plan with ticked boxes is a resumed run
after a session reset: ticked work is done, so start from the first unticked box.

## 2. Plan the execution

Two decisions here: what order the tasks run in, and what each task is worth running on.

When the plan carries a **Task Ownership** table per phase, it already answers both: `Files owned`
and `Depends on` give the waves, `Risk` gives the capability. Use it - but verify rather than trust. Two
tasks the table calls independent while both editing a barrel file, or a task marked `standard` that
the Key Contracts section also names, is a planning error you correct here and mention in the report.
Plans without the table get the same analysis derived from the task text and File Map.

### 2a. Group the tasks into waves

Two tasks may share a wave only when all three hold: they touch different files, neither consumes a
type, function, or output the other creates, and their order is irrelevant to correctness. Everything
else is sequenced.

Most plans are neither fully parallel nor fully serial. Build **waves**: a shared-foundation task
runs alone first, the independent tasks that depend on it form the next wave, and a
task touching a shared file (index, router, schema, migration list) runs alone again. Sequence
whenever in doubt - a wrong parallel run costs more to untangle than a slow serial one.

**Inline by default, within the cap.** Per `references/delegation.md`, a task run gets at
most 3 subagents - implementers, validators and browser verifiers together - so most tasks run
**inline** (done by this agent, in wave order). Spend the 3 on what a cold agent genuinely does
cheaper than the main thread: the one or two largest isolated implementation tasks, the validation
run, a browser check. Never one agent per task. Needing more than 3 means asking the user first,
with the count and the reason. Delegated tasks in the same wave may run in parallel.

### 2b. Capability per task

Each task's capability comes from the plan's `Risk` column (`mechanical`, `standard`, `contract`, as
defined in the `plan` skill). Plans without the column get a Risk derived from the same definitions.
Raise, never lower, a label the task text contradicts - a `standard` task the Key Contracts section
names is `contract`. The Risk-to-model binding, and the escalation on `NEEDS_CONTEXT` or `BLOCKED`,
are in `references/delegation.md`; use that one mapping. Never downgrade the step 4
verification - it runs at the session default or better.

State the assignment before you launch, one line per delegated task, naming the Risk and what this
harness resolved it to: `T3 -> standard -> <model> (new route, single layer)`. The user should be
able to veto an assignment before the tokens are spent.

## 3. Execute

**Delegated tasks.** Only the tasks step 2a picked for the cap get an agent - the Implementer,
Validator, or Browser verifier role's agent from `references/delegation.md`, never a
generic one. Independent delegated tasks in one wave may launch together; wait for the wave before
starting work that depends on it.

The user's invocation of this skill authorizes delegation within the cap, for the plan's tasks only
and only for this run; step 2b's assignment line is where the user vetoes it. When no delegation
mechanism exists here, or this run is itself inside a subagent, run every task inline in wave order -
the grouping and Risk above still hold, they just describe your own passes instead of subagents.

Each prompt is a **briefing pack** - everything the subagent needs and nothing else. Subagents never
read the plan file and never see the other tasks:

- the task text pasted verbatim, plus its acceptance criteria
- the exact files to read first, by path - not "explore the repo"
- only the contracts at *this task's* boundary: the signatures, types, and shapes it must consume or
  produce. When an earlier wave created them, paste the real resulting signature, not the plan's
  prediction of it.
- only the conventions that apply to this task's layer, quoted from `AGENTS.md` - not the whole file
- the working directory and stack
- "the user owns all git operations; do not commit or push", unless `AGENTS.md` overrides it here
- scope fencing: the exclusive list of files this task may change; every other file, including those
  other tasks in the wave own, is off limits
- the validation command that proves this task
- report back `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`, with the files changed

Scale the pack to the Risk: a `mechanical` task needs the target file, the exact change, and the
pattern to copy; a `contract` task needs the surrounding contracts and the failure modes the plan
named.

Surface any `BLOCKED` you cannot resolve before continuing other tasks. Verify each wave's files
exist and look right before launching the next - a subagent reporting `DONE` is a claim, not proof.

**Inline tasks.** Work the plan's checkbox steps in order, verifying each task's files exist and look
right before moving on.

Either way: when a task changes generated artifacts, runtime config, migrations, ordering logic, or
cross-layer contracts, complete the codegen, type refresh, and dependent-file updates inside the same
execution flow rather than leaving them as implied follow-up.

## 4. Verify against the plan

This step answers one question: did you build what the plan said, wired the way it said? It is not a
code review, and it must not grow into one. Design quality belongs to a dedicated review pass that
reads the finished diff with none of this session's context - and that independence is the whole
reason it catches what this step cannot. Reviewing your own work here, minutes after writing it and
with the plan's reasoning still loaded, mostly reproduces the assumptions you already made.

That pass is not automatic. Some repos run an automated reviewer on the MR (an `mr:review` CI job or
similar); others don't, and there it happens only because someone runs `/code-review`. Take the
answer from the repo's `AGENTS.md` when it states one, else check the CI config, and offer
accordingly in the report - never run a review unasked, and never write as though one is coming when
nothing is set up to produce it.

The verification runs on the code, never on the subagents' reports. Read every file a delegated task
changed before judging it - a `DONE` summary is the one thing in this skill that cannot be trusted,
and cheaper models concentrate their mistakes exactly where the plan was thinnest. Pay extra attention
to the seams between tasks: two subagents that each satisfied their own briefing pack can still
disagree about the shape that crosses between them.

**Spec compliance.** Every plan requirement has corresponding code, file paths match what the plan
specified, out-of-scope items stayed unimplemented, and nothing extra was added.

**Repo standards.** The repo and global `AGENTS.md` are already in context; read only the Context
Map rows this task needs. If the harness has not already loaded one of them, read it once.
Repo-specific rules override global ones. Check the standards you find - typically naming conventions, file placement, absence of AI or assistant attribution in
code and comments, consistent reuse of shared helpers and schemas instead of inlined copies, and any
repo-specific pattern the context map calls out.

**The contracts the plan named.** For each contract and failure mode the plan called out, confirm the
real code honors it. This list is bounded by the plan: you are checking that its own risk register
came true, not opening a general hunt for defects. Where the plan named a boundary, verify it at that
boundary - green lint, build, and tests do not establish that a contract survived, and a new
endpoint, integration, migration, parser, or stateful workflow needs more than a helper-level test.

Anything you notice outside that scope - a design smell, a structural concern, a simplification worth
making - is recorded as a note in the report and left for the review pass. Do not act on it here.

## 5. Report

**When the verification found gaps:**

```
## Verification Findings

### Spec gaps
- [ ] <specific issue and where>

### Standards violations
- [ ] <specific issue and where>

### Broken contracts
- [ ] <a contract or failure mode the plan named that the code does not honor, and where>

### Notes for review
- [ ] <observation outside this step's scope, left for the review pass>
```

Findings in the first three sections are gaps against the plan and need resolving. Read
`references/question-format.md` and offer a resolution gate per its Resolution Gates
section, with the working tree as the target - when a
finding is architecture-level, crosses 3+ files, or is a decomposition, route it back through the
planning skill rather than patching inline. Offer only the dispositions that apply, and wait for
approval - fix work is offered, never presented as already done.

`Notes for review` is not part of the gate. It carries forward to the review pass untouched; drop the
section when there is nothing to note.

**When it found none:** say "Implementation complete, verified against the plan."

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

If the rename fails because the plan came from a non-standard location, skip silently - bookkeeping
never blocks completion.

Check whether the implementation surfaced anything `context/` doesn't capture: a convention that
emerged, an architectural decision, a new trap a future agent would fall into, a new component,
service, or dependency, or a business rule that became concrete during coding. If so, draft the
proposed edits - which file, what changes, why - and wait for approval before running
`/update-context`. Skip silently when the repo has no context files.

Finally, offer the follow-ups that apply:

- **`/code-review`** - the independent pass step 4 deliberately left undone. Offer it only when this
  repo has no automated reviewer on MRs, since then it's the only review the change will get. When the
  repo does run one, say that the pipeline is the review instead of offering a second pass over the
  same diff.
- **`git-publish` to open the branch as a draft MR/PR.** Offer this whenever the work is committable,
  and wait for a yes - this skill never touches the remote on its own. Draft is the point, not a
  formality: the branch becomes visible and reviewable while you keep adding to it, and a repo whose
  automated reviewer skips drafts won't spend its one review on an unfinished branch.
- `cleanup` when the work removed, renamed, or moved behavior.
- `verify-ui` when UI behavior changed, run only with explicit approval in the current turn.
- `close-task` when the branch is genuinely finished - it runs final validation, marks the MR/PR ready
  for review, collects the review, and handles task status.

Committing, pushing, and marking external work done happen only when the user asks in the current turn.
