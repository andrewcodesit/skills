---
name: close-task
description: Use when finishing a task after implementation, including running final validation, marking the branch's MR/PR ready for review, waiting for and routing code-review findings, and marking the task done in a local task board or connected project-management system. Triggered by phrases like "finish this task", "close task", "complete task", "ship this task", "mark task done", or "wrap this up".
context: fork
model: haiku
---

# Close Task

Announce at start: `Closing task...`

Finish the current task without hiding unresolved review, validation, or status work.

## How this skill runs

Where the harness supports it, this skill runs as a forked subagent on a small model: a fresh
context, no conversation history, no way to ask the user, and no subagents of its own. Anything
that needs the user or a stronger model goes back to the main session as a return status, never as a
guess. Where the harness runs it inline in the main session instead, that session handles each
status itself, as **Continuation** describes, instead of returning.

Arguments: the task id or link when given, and `finalize` when the main session re-invokes the skill
after resolving an earlier return.

Read `references/model-escalation.md` before step 3. It decides what you fix here and what escalates.

## Process

1. Identify the active task from:
   - local task files under `~/.agents/tasks/<repo>/`
   - repo-local `.agents/tasks/`
   - the current branch name
   - the task, issue, ticket, or external link given as an argument
2. Check implementation state:
   - `git status --short`
   - whether an open MR/PR already exists for this branch, and whether it is still a draft - via the
     connected Git host's CLI/API
3. Run validation: whatever the task or plan calls for - typecheck, lint, tests, build. Run each
   command directly, filtered at the source (`2>&1 | tail -n 40`). Fix failures in the mechanical
   class; every other failure escalates. This happens before the MR/PR is marked ready, not after.
4. Check the branch is published. If it has no MR/PR or has unpushed commits, return `NEEDS_USER`
   asking whether to publish it through the `git-publish` skill. Never run a git write command here.
   Usually the MR already exists as a draft from `git-publish` earlier in the workflow.
5. Mark the MR/PR ready for review, unless step 3 escalated or repo/global rules put the ready flag
   under human control. A draft means the branch is still in progress; taking the flag off is the
   moment it stops being. It is also what starts the automated reviewer, which skips drafts on
   purpose, so this is what produces the findings step 6 reads.
   - **GitLab** - the flag is the `Draft: ` title prefix; strip it:
     `glab api "/projects/$PROJECT/merge_requests/<iid>" -X PUT -F "title=<title without prefix>"`
   - **GitHub** - `gh pr ready "$PR_NUMBER"`
6. Collect review findings, unless the argument is `finalize` (they were already dispositioned):
   - the automated reviewer's note on the MR/PR, **when the repo runs one** - check `.gitlab-ci.yml` /
     the workflow files rather than assuming. When it exists, wait for it: it is the one independent
     read of this diff. Wait in **one** command that polls inside itself (every 30 s, at most 9
     minutes), never in a series of separate status checks. If the job is still running after that,
     return `PENDING_REVIEW` with its URL.
   - the latest local report at `~/.agents/code-reviews/<repo>/<slug>-code-review.md`, when
     `/code-review` was run during implementation.

   When neither exists, say so under `REVIEW` - silence must not imply a review happened - and add
   the offer to run `/code-review` to `QUESTIONS`. Knowingly closing an unreviewed branch is a
   legitimate choice; this step makes it visible.
7. Triage every finding with `references/model-escalation.md`. Fix the mechanical ones here and re-run
   step 3's validation; every other finding escalates, and the main session decides whether to fix,
   dismiss, or defer it. The automated reviewer is advisory and does not block the merge. Never
   commit, push, or resolve review threads.
8. List follow-up ticket candidates under `DEFERRED`: suggestions, missing tests, known gaps, grouped
   where they share a cause. Never file them here; filing needs the user's go-ahead, which the main
   session asks for.
9. Mark the task `done` only when validation passes, nothing is under `ESCALATE` or `QUESTIONS`, and
   the working tree is clean and pushed. Otherwise leave it for the `finalize` run.
   **Automated-tracker exception below applies.**
10. If the task belongs to an epic, update the epic checklist. If all children are done, mark the
    epic `done`.

## Git Rules

- Never commit, push, stage, or open a PR here. Publishing and pushing fixes belong to the main
  session through the `git-publish` skill, after the user's go-ahead.
- Marking an existing MR/PR ready for review is part of closing a task, not a separate git action -
  skip it if repo/global rules put the ready flag under human control.
- **HARD RULE - No AI attribution, ever.** Never add `Co-Authored-By: Claude ...`,
  `Claude-Session:`, `Generated with Claude Code`, or any AI-attribution/trailer line to a commit
  message, PR/MR title, or PR/MR description.
- **No MR/PR description** - title only. Never pass `--description`, `--body`, or `--fill`.

## Status Rules

- Local task files: update `Status:` and any matching checklist entry.
- **Automated trackers - never transition or close the issue.** When user or project rules say a
  tracker moves issues on merge, do not call any transition tool, do not set the status, and do not
  comment on the issue to close it. Filing *new* follow-up issues is not touching the task's own
  issue - that stays allowed.
- Other external systems: use the connected tool. If no tool is connected, say what remains to
  update manually under `QUESTIONS`.
- Preserve task content unless the user asks to edit it.

## Return

Return exactly this block and nothing else. Status priority: `BLOCKED` > `ESCALATE` > `NEEDS_USER` >
`PENDING_REVIEW` > `DONE`.

```
STATUS: DONE | ESCALATE | NEEDS_USER | PENDING_REVIEW | BLOCKED
TASK: <id> - <done | not marked done: reason>
VALIDATION: <command> - PASS | FAIL <one line>    (one line per command)
MR: <url> - <marked ready | already ready | not published>
REVIEW: <sources read> | none found
FIXED_HERE: <file:line - change> (uncommitted) | none
ESCALATE: <file:line - finding - condition it failed> | none
DEFERRED: <follow-up ticket candidates> | none
QUESTIONS: <lettered choices for the user> | none
CONTEXT: <commands, job URLs, report paths the fixer needs> | none
NEXT: <the continuation step below that applies>
```

## Continuation

For the main session, after a return (also stated in `NEXT`):

- `ESCALATE` - resolve the items per `references/model-escalation.md`, then continue as below.
- Once nothing is escalated, ask the user in **one** message: push the fixes (`FIXED_HERE` and the
  escalated fixes) through `git-publish`, the `QUESTIONS`, and which `DEFERRED` items to file as
  tickets (through the tracker's issue-creation skill when rules name one). Then re-invoke
  `/close-task finalize`.
- `NEEDS_USER` - ask the questions, act on the answer, re-invoke.
- `PENDING_REVIEW` - wait for the job in the background, then re-invoke.
- `DONE` - report the task status, validation, MR state, review source, fixes, tickets filed, and
  any remaining manual step.
