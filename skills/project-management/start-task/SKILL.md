---
name: start-task
description: Use when starting implementation work from any task source and needing to create or switch to the corresponding git branch, inspect context, and write an implementation plan before coding. Triggered by phrases like "start ORAG-3", "work on task X", "start this task", "create branch for X", "pick up the next task", or "let's start working on X".
---

# Start Task

Announce at start: `Starting task...`

Prepare implementation work from any task source: resolve the task, check out its branch, then hand
off to the `plan` skill. This skill stops at an approved-pending plan and never implements itself; in
the Parallel tasks flow, a `foreman` implements each approved plan.

**Planning gate:** implementation begins only after the plan has been presented and the user approves
it (answering the approval question, approving in a message, or `/execute`). Wording like "go" or
"implement it" sent before the plan was shown is task-selection context, not approval.

Tracker-agnostic throughout: a Jira key, Linear URL, GitHub issue, local task file, spec path, or a
plain description are all valid sources. Never require an external tracker, and never mutate one -
no status transitions, assignments, comments, or field updates unless the user asks in the current
turn. No commits, pushes, or PRs either.

## Parallel tasks

Use this flow when the user starts several tasks at once or asks what can run in parallel. Each task
still goes through steps 1-3; this section replaces where they run and who runs them.

1. **Resolve every candidate** (step 1), then map each one's likely files from the task text plus a
   quick search. Tasks that share files, or where one consumes another's output, run sequentially.
   Present the parallel set and the held tasks with the reason as a lettered choice. The approval must
   state the task count N (the batch rule in `references/delegation.md`).
2. **One worktree per task**, all off the up-to-date default branch: `git worktree add -b <branch>
   <repo>/.claude/worktrees/<branch> origin/<default>` (confirm the directory is gitignored), then
   `git branch --unset-upstream <branch>` so a push can never land on the default branch, then install
   dependencies from the lockfile. One task may stay in the main checkout and run the normal flow.
3. **One `architect` per worktree task**, in the background, briefed with the task source, the worktree
   path, and the save path `~/.agents/plans/<repo>/YYYY-MM-DD-<branch>.md`.
4. **Approval per task.** As each `architect` returns, show the plan path, its summary and its open
   questions, and ask for approval the way the `plan` skill does (step 6). Never treat one task's
   approval as another's.
5. **One `foreman` per approved plan**, in the background, briefed with the plan path, the worktree,
   the project validation commands, and the model from the plan's highest task Risk. The `foreman`
   takes the place of `execute` for that task.
6. **Reviews from the main thread.** When a `foreman` returns, run the reviews the project's
   `AGENTS.md` requires for the touched paths, then report per task: branch, status, validation, and
   open findings. Commits and MRs go through `/git-publish` from each worktree, only on request.

## 1. Resolve the task

- **Local spec, task, or plan path** - read the file.
- **Tracker key or URL** - use the available connector, fetching only what planning needs: the stable
  id, title, description, acceptance criteria, an existing branch name if the tracker stores one, and
  the type/status for awareness. If access fails, say so in one line and continue from local context.
- **Plain prompt** - the user's message is the brief.
- **"next task"** - inspect known local task files first; ask only when nothing reasonable surfaces.

When the source is an epic, broad initiative, roadmap note, or an idea with no implementable scope:
create no branch, write no plan, name what is missing, and point at `define-spec`. Continue only for
implementation-level work - a task, bug, improvement, sub-task, or accepted spec.

## 2. Check out the branch

Branch checkout is the default when the user is explicitly starting or picking up a task, not an
optional extra. Name the branch from, in order: the branch the task source already carries, the repo
convention in the context files, or a derived lowercase slug (`<task-key>-<short-title>`).

Run `git status --short` first. Existing unrelated changes stay untouched - if they make checkout
unsafe, stop and ask how to proceed. Otherwise switch before planning, so implementation and review
land on the task branch:

```bash
git checkout -b <branch-name>   # or: git checkout <branch-name> if it exists
```

## 3. Plan

Look for an existing plan under `~/.agents/plans/<repo>/` matching the task key, slug, or title. If
one exists, show its path and ask whether to reuse it or write a new one; on reuse, ask for approval
the same way the `plan` skill does (step 6).

Otherwise invoke the `plan` skill with the resolved task as its explicit source. It owns codebase
exploration, clarifying questions, plan structure, and the save location. Pass along the task key,
URL, or path so the plan records it as its `**Source:**`.

## 4. Stop

Report the task source used, the branch checked out, the plan file path, a brief summary of what
would be built, and any tracker failure or unresolved question. The `plan` skill's approval question
follows; on approval, `execute` runs without further input.
