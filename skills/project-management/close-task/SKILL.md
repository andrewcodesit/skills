---
name: close-task
description: Use when finishing a task after implementation, including checking review status, routing or applying small fixes for code-review findings, running validation, optionally committing/pushing/opening a PR after explicit user approval, and marking the task done in a local task board or connected project-management system. Triggered by phrases like "finish this task", "close task", "complete task", "ship this task", "mark task done", or "wrap this up".
---

# Close Task

Announce at start: `Closing task...`

Finish the current task without hiding unresolved review, validation, or status work.

## Process

1. Identify the active task from:
   - local task files under `~/.agents/tasks/<repo>/`
   - repo-local `.agents/tasks/`
   - the current branch name
   - the user-provided task, issue, ticket, or external link
2. Check implementation state:
   - `git status --short`
   - relevant tests or validation commands from the task/plan
   - latest code-review report if one exists
3. If review findings exist, ask whether to plan fixes or apply best judgment for small fixes.
4. Run validation after fixes.
5. Ask before any git action. Offer only actions allowed by repo/global rules.
6. Mark the task `done` only after validation passes or the user explicitly accepts the remaining risk.
7. If the task belongs to an epic, update the epic checklist. If all children are done, mark the epic `done`.

## Git Rules

- Never commit, push, or open a PR unless the user explicitly asks in the current turn.
- If opening a PR/MR, follow repo instructions for title/body.
- If repo/global rules prohibit git actions, do not offer them.

## Status Rules

- Local task files: update `Status:` and any matching checklist entry.
- External systems: use the connected tool. If no tool is connected, tell the user what remains to update manually.
- Preserve task content unless the user asks to edit it.

## Final Response

Report:
- task status
- validation run
- review/fix status
- git/PR action taken, if any
- remaining manual step, if any
