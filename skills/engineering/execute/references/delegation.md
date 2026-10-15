# Delegation Standard

Load before launching any subagent. When the global `AGENTS.md` carries a short Delegation core,
this file holds the detail. The harness-neutral rules come first; each harness's binding of roles to
named agents and models follows at the end.

## When to delegate

Delegation trades tokens for context. A subagent starts cold and re-reads what the main thread
already holds, so it costs *more* total tokens; what it buys is a main thread that stays short and an
expensive read that never lands in it. Delegate when that trade is favourable, not by reflex.

- **Threshold.** Work that touches under ~10 files and one concern, with linear dependencies, runs
  in a single agent. Splitting implementation across agents pays only above ~20 files across two or
  more concerns that partition cleanly.
- **Large or unpredictable input, small output.** Delegate multi-file audits and reviews, broad
  codebase searches, long iterative fix loops, a validation run whose output may be silence or forty
  errors, browser sessions, and any exploration the main thread will never need again. A skill that
  writes its report to `~/.agents/` and prints only a path is the ideal candidate.
- **Whole-plan handoff.** An approved plan that touches ~5 or more files, or has 3 or more tasks,
  and whose highest task Risk is `mechanical` or `standard`, goes to one Plan executor for the whole
  plan, on the model that Risk maps to. The plan file is the briefing, so the handoff costs one cold
  boot on a cheaper model, and the main thread keeps only the status report and then reviews the
  diff. Plans with a `contract` task, and plans below the threshold, run inline: the main thread
  already holds the reasoning a contract task needs, and a small plan costs less inline than a boot.
- **Design-led work** - a new or reshaped screen or flow, a UX or visual review, or a UI task where
  the quality of the experience is the point - goes to the Designer, whichever path the rest of the
  work takes. In a whole-plan handoff, carve the design-led tasks out for the Designer first and hand
  the remainder to the Plan executor; if nothing remains, the Designer's run is the whole handoff.
- **Keep inline:** small and medium edits (copy, i18n keys, a component, route wiring, a helper, a
  review's fix list), a single command whose output you need anyway (pipe it through
  `| tail -n 40`), and anything needing conversation context a briefing cannot carry.
- **Several tracker tasks** run as one `/start-task` per task (or a batch, below), never as a generic
  agent per task. Independent tasks the user wants run in parallel follow `start-task`'s Parallel
  tasks flow: one git worktree per task, an `architect` plans each, the user approves each plan,
  then a `foreman` executes each approved plan in its worktree.

## The cap

- **At most 3 subagents per task run**, counting every kind and every re-spawn. Continuing an agent
  that already ran does not count.
- **Exempt: Searcher and Validator.** They run on the cheapest model, read only, and return a short
  answer, so they do not count against the cap; at most 3 of each per task run. Every other role,
  the Browser verifier and Designer included, counts.
- More requires asking the user first, with the count and the reason. A skill invocation, a plan
  approval, or "go" is never that approval.
- **Batches.** A batch approval that names N tasks authorises N task runs, each under its own cap of
  3. The approval message must state N; it never raises the per-run cap. In the parallel flow, a
  task's `architect` and `foreman` count against that task's own cap.
- **Top-level sessions are not subagents.** A separate top-level session per task (headless run or
  workflow step) is a task run, not a subagent, so it may delegate within its own cap. A subagent
  never spawns subagents unless the user asked for orchestration; when a skill that delegates runs
  inside a subagent, it runs every step inline.
- **Parallel is a speed lever, not a savings lever.** Concurrent agents finish sooner for about the
  same total tokens. Fan out only within the cap, and never give two agents overlapping files.

**Standing authorization.** Invoking a skill whose steps call for delegation authorizes delegation
within the cap for the work that skill defines - never beyond the cap, and never for unrelated work.
State the assignment before launching so the user can veto it.

## Roles, not generic agents

Skills describe delegated work by role. Use the harness's named agent for the role (see the binding
below); a generic agent is the last resort. When the named agent is not installed in this
environment, use the harness's generic subagent with the same briefing and output contract.

| Role | Used for |
| --- | --- |
| Searcher | a broad "where is X" sweep |
| Planner | one plan per task when planning several tasks in parallel (`plan` steps 2, 4, 5) |
| Implementer | one plan task from a briefing pack (`execute`) |
| Plan executor | one whole approved plan, end to end, in a worktree (parallel tasks) or the task checkout (whole-plan handoff) |
| Reviewer | read-heavy audits and reviews (`code-review`, `verify-ts`, `tests-audit`, `cleanup`) |
| Refuter | trying to disprove one finding before it is acted on |
| Validator | typecheck, lint and tests after a change |
| Browser verifier | `verify-ui` and project browser checks |
| Designer | design-led UI work: new or reshaped screens and flows, UX and visual reviews |

Project-specific agents (domain auditors, a project validator) are routed by the project's own
`AGENTS.md`.

**Never wrap a skill in an agent.** A subagent whose whole instruction is "invoke skill X" pays a full
cold boot to reach a call the main thread could make directly, and pushes the skill's own delegation
one level deeper than the no-nesting rule allows. Invoke the skill inline and let it decide what to
delegate. If a wrapper agent is proposed, say so and invoke the skill instead.
`architect` and `foreman` are not wrappers: each follows the `plan` or `execute` procedure inline
from a briefing, without invoking the skill or delegating further.

## Briefing contract

Brief properly or do not delegate. If the briefing would be longer than the work, do the work. Every
briefing states, in this order:

1. The goal in one sentence.
2. The file paths, symbols and commands already known, so nothing is rediscovered. For implementation
   work, the exclusive list of files the agent may change; every other file is off limits.
3. The constraints and standards that apply, naming the standards file the global or project
   `AGENTS.md` maps to the work. Quote the relevant project rules rather than describing them.
4. The validation command that proves the work, as the last instruction before the output contract.
5. The output contract.

## Output contract

End every briefing with an explicit cap and shape, for example: "Return at most 20 lines: each
finding as `file:line - claim`. No summary of what you read, no file contents, no restated
instructions." An agent given no contract returns a transcript.

## Continue, do not re-spawn

Follow up with an agent that already ran by continuing it; its context is intact. A fresh launch
starts cold and pays the whole discovery cost again. Once a search is delegated, do not also run it
in the main thread - wait for the result.

## Capability by risk

Plans label each task's Risk as `mechanical`, `standard` or `contract` (definitions in the `plan`
skill). Where the harness allows a per-task model, assign the least capable model that clears the
task's Risk, using the harness binding below.

- Raise, never lower, a label the task text contradicts.
- Never downgrade a review, an audit, or a task touching a named contract.
- A delegated task that returns `NEEDS_CONTEXT` or `BLOCKED` is relaunched one Risk step up before
  you take it inline.
- With no per-task control, everything runs at the session default; Risk still sets how thorough the
  briefing is and how hard the result is verified.

## Claude Code binding

Each role binds to a named agent in `~/.claude/agents/`, an installed plugin, or a project's
`.claude/agents/` (which shadows a user agent of the same name). Always launch the named agent,
never `general-purpose`, when a role fits.

| Role | Agent | Model |
| --- | --- | --- |
| Searcher | `scout` | `haiku` |
| Planner | `architect` | `opus`, never overridden down |
| Implementer | `smith` | from Risk, below |
| Plan executor | `foreman` | from the plan's highest Risk, below |
| Reviewer | `critic` | `opus`, never overridden down |
| Refuter | `skeptic` | `opus` |
| Validator | `gatekeeper` | `haiku` |
| Browser verifier | `pilot` | `sonnet` |
| Designer | `michelangelo` | `opus`, never overridden down |

**Main thread.** The interactive session runs on `opus` at the user's effort setting: it orchestrates,
plans, reviews, and does `contract` work inline. Execution goes down the table above; the main
thread never switches itself to a cheaper model to implement. A session that is only quick questions
or lookups may run on `sonnet` (`/model sonnet`, or `claude --model sonnet`).

**Risk to model** (the only copy of this mapping): `mechanical` -> `haiku`, `standard` -> `sonnet`,
`contract` -> `opus`. Set the model on each `smith` launch; one Risk step up means the next model in
that list.

**Continuation** uses `SendMessage` to the agent's name. A new `Agent` call is a re-spawn and counts
against the cap.
