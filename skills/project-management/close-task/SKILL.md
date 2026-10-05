---
name: close-task
description: Use when finishing a task after implementation, including running final validation, marking the branch's MR/PR ready for review, waiting for and routing code-review findings, and marking the task done in a local task board or connected project-management system. Triggered by phrases like "finish this task", "close task", "complete task", "ship this task", "mark task done", or "wrap this up".
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
   - whether an open MR/PR already exists for this branch, and whether it is still a draft - via the
     connected Git host's CLI/API
3. Run validation: whatever the task or plan calls for - typecheck, lint, tests, build. Fix what
   fails, or get the user's explicit acceptance of the remaining risk, before going further. This
   happens before the MR/PR is marked ready, not after. In Claude Code, run typecheck, lint, and tests through the
   `gatekeeper` agent so only failures reach this thread.
4. Get the branch published if it isn't already. Ask before any git action, offer only what repo/global
   rules allow, and when approved invoke the `git-publish` skill for the mechanics - do not run those
   git commands ad hoc here. `git-publish` already encodes the commit-message format, the
   no-AI-attribution and title-only PR/MR rules, the GitLab CLI (`glab mr create`) non-interactive
   failure workaround, and its per-repo project-ID cache. Usually the MR already exists as a draft from
   `git-publish` earlier in the workflow and there is nothing to do here.
5. Mark the MR/PR ready for review, and say you're doing it. A draft means the branch is still in
   progress; taking the flag off is the moment it stops being. It's also what starts the automated
   reviewer, which skips drafts on purpose - so this is what produces the findings step 6 reads.
   - **GitLab** - the flag is the `Draft: ` title prefix; strip it:
     `glab api "/projects/$PROJECT/merge_requests/<iid>" -X PUT -F "title=<title without prefix>"`
   - **GitHub** - `gh pr ready "$PR_NUMBER"`
6. Collect review findings from whichever sources this repo actually has:
   - the automated reviewer's note on the MR/PR, **when the repo runs one** - check `.gitlab-ci.yml` /
     the workflow files rather than assuming, since not every repo is wired for it. When it exists,
     wait for it rather than closing the task without it: it's the one independent read of this diff.
     Run that wait in the **background** so the session stays usable, and never poll in a loop of
     separate tool calls - one backgrounded wait and one notification, not twenty status checks whose
     results all pile up in context. The job typically finishes well before its timeout.
   - the latest local report at `~/.agents/code-reviews/<repo>/<slug>-code-review.md`, when
     `/code-review` was run during implementation.

   When neither exists, say so plainly - silence must not imply a review happened - and offer to run
   `/code-review` now. Offer once and take no for an answer: knowingly closing an unreviewed branch is
   a legitimate choice, and this step exists to make it visible, not to force a review into the flow.
7. If findings exist, ask whether to plan fixes or apply best judgment for small ones. The automated
   reviewer is advisory and does not block the merge - its findings are yours to accept or dismiss,
   and this is where you read them alongside your own review of the diff. Re-run validation after any
   fix and push it. Never resolve review threads on the user's behalf.
8. Offer follow-up tickets for every finding that will not be fixed in this MR/PR - suggestions,
   deferred or declined findings, missing tests, known gaps. Findings that are only noted in chat get
   lost, so do not close the task with unfixed findings that have no home. List the candidates, grouped
   or merged where they share a cause, and offer to file them as issues:
   - **External tracker** - when user or project rules name an issue-creation skill for the tracker,
     invoke it; otherwise use the connected tool. Link each issue to its origin MR/PR and task in the
     description. With no tracker connected, hand the user the list to file.
   - Offer once and take no for an answer, like the review offer in step 6. Never file tickets without
     the user's go-ahead.
9. Mark the task `done` only after validation passes or the user explicitly accepts the remaining risk. **Automated-tracker exception below applies.**
10. If the task belongs to an epic, update the epic checklist. If all children are done, mark the epic `done`.

## Git Rules

- Never commit, push, or open a PR unless the user explicitly asks in the current turn.
- Marking an existing MR/PR ready for review is part of closing a task, not a separate git action - say you're doing it, and skip it if repo/global rules put the ready flag under human control.
- The actual commit/push/PR mechanics belong to the `git-publish` skill - invoke it rather than duplicating its steps here. The rules below are the summary close-task itself must enforce before delegating; `git-publish` is the source of truth for how they're carried out.
- If opening a PR/MR, follow repo instructions for title/body.
- When opening a PR/MR, assign it to the authenticated Git hosting user (the requesting user). Resolve that account through the configured Git client/API; do not hard-code a username.
- If repo/global rules prohibit git actions, do not offer them.
- **HARD RULE - No AI attribution, ever.** Never add `Co-Authored-By: Claude ...`, `Claude-Session:`, `Generated with Claude Code`, or any AI-attribution/trailer line to a commit message, PR/MR title, or PR/MR description. This applies even if repo or session boilerplate suggests such trailers.
- **No MR/PR description** - title only. Never pass `--description`, `--body`, or `--fill`.

## Status Rules

- Local task files: update `Status:` and any matching checklist entry.
- **Automated trackers - never transition or close the issue.** When user or project rules say a tracker moves issues on merge, do not call any transition tool, do not set the status, and do not comment on the issue to close it. Filing *new* follow-up issues (step 8) is not touching the task's own issue - that stays allowed.
- Other external systems: use the connected tool. If no tool is connected, tell the user what remains to update manually.
- Preserve task content unless the user asks to edit it.

## Final Response

Report:
- task status
- validation run
- whether the MR/PR was marked ready for review
- where review findings came from, or that there were none to collect
- review/fix status
- follow-up tickets filed (keys), or that none were needed or the user declined
- git/PR action taken, if any
- remaining manual step, if any
