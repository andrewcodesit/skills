---
name: git-merge
description: Check the CI pipeline for the current branch's MR/PR, fix any failure with a real (non-hacky) code fix and push it automatically, merge once the pipeline is green, then check out the default branch, pull, and offer to start the next task. Triggered by phrases like "merge this", "get this merged", "fix the pipeline and merge", "git-merge", or "/git-merge".
---

# Git Merge

Announce at start: `Running git-merge...`

Drive an open MR/PR to green and merge it, then reset the working tree onto the default branch for
the next task. This skill trades the usual per-step confirmations for speed on a narrow, well-defined
path - see **Authorization** before changing how it behaves.

## Authorization (read first)

Invoking this skill is the user's standing authorization for exactly two normally-gated actions,
**scoped to the current branch and its MR/PR only**:

1. Pushing a pipeline-fix commit without asking first.
2. Merging the MR/PR once the pipeline is green, without asking first.

Nothing else is pre-authorized. Force-push, touching any branch other than the current one and the
default branch in Step 6, editing files unrelated to the failure, and anything the Rules section below
forbids all still require stopping and asking. If the task turns out not to be "fix CI and merge" -
e.g. the pipeline is red for a product/design reason - stop and ask; this skill is not a blanket
license to push whatever makes a check pass.

## Rules (non-negotiable)

- **No hacks, no grey-area fixes.** A pipeline fix must be a real fix to the actual cause. Forbidden,
  full stop, no matter how green it makes the pipeline:
  - Skipping, deleting, `.skip`/`.only`-ing, or loosening the assertions of a failing test instead of
    fixing the code or the test's own bug.
  - Disabling a lint/type rule inline or in config (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`,
    `// biome-ignore`, weakening `tsconfig` strictness) to silence a real error rather than fixing it.
  - `--no-verify`, `--no-gpg-sign`, or any other hook/verification bypass.
  - Pinning, downgrading, or removing a dependency to dodge a failure without understanding why it
    failed.
  - Widening CI `rules:`/`if:`/`paths:` conditions, increasing timeouts, or adding `retry:`/`allow_failure:
    true` to a job so a real failure stops blocking the pipeline.
  - Committing generated artifacts, lockfile edits, or config changes whose only purpose is to route
    around the failure rather than resolve it.
  - Any fix outside the language/tooling's own idioms - if the "fix" needs a comment justifying why
    it's not really a hack, it's a hack.
  - If the true fix requires a product decision the user hasn't made (behavior change, API contract
    change, a flaky test that needs redesign), stop and ask instead of guessing.
- **An automated code-review job is advice, not a failure to fix.** A job that runs a code review
  and reports findings (e.g. `mr:review`, typically `allow_failure: true` so it shows as a warning)
  is a *judgment* about the change. Never enter the fix-push-recheck cycle for it, and never apply
  its findings on the way to a merge. Those findings belong to `close-task`, which waits for them and
  puts them in front of the user; by the time this skill runs they have already been read and
  dispositioned. If it turns out they haven't been - the job is still running, or its findings were
  never surfaced - stop and hand off to `close-task` rather than merging past a review nobody read.
  This job is also the one exception to the false-green rule below: an allowed-to-fail review job does
  not make the pipeline "not green".
- **Real local validation before every push.** Run the same checks the failing CI job runs (lint,
  typecheck, test, build - whatever applies) locally and confirm they pass before pushing. Never push
  a fix you haven't verified.
- **Commit hygiene matches `git-publish`:** short one-line message, capital first letter, no
  period, no body, no issue-ID prefix unless the repo's commit history shows a convention (check
  `git log --oneline -10`), and match Conventional Commits only if `commitlint.config.*`/
  `.commitlintrc*`/a `"commitlint"` key in `package.json` is present.
- **No AI attribution anywhere** - never add `Co-Authored-By: Claude`, `Claude-Session:`, "Generated
  with Claude Code", or any similar trailer to a commit message or MR/PR text.
- **Bounded retries.** Attempt a fix-push-recheck cycle at most 3 times. If the pipeline is still red
  after 3 real fix attempts, stop and report - do not escalate to a hackier fix to "just get it green."
- **Never merge on a false green.** If the pipeline is green only because a job was skipped, allowed
  to fail, or didn't run at all (e.g. `rules:` excluded it), treat that as not green and say so.
- **Never force a blocked merge.** If the MR/PR is blocked by anything other than the pipeline
  (unresolved discussions, missing approvals, merge conflicts, branch protection), stop and report
  exactly what's blocking it - do not attempt to bypass, resolve threads on the user's behalf, or
  request reviews.

---

## Step 1 - Identify the branch, platform, and MR/PR

```bash
git status --short
git branch --show-current
git remote -v
```

Existing uncommitted changes unrelated to a CI fix stay untouched - if they'd interfere with a clean
push, stop and ask how to proceed.

Detect platform from the remote: `gitlab.com` → `glab`, `github.com` → `gh`.

Find the open MR/PR for the current branch:

**GitLab:**
```bash
glab mr list --source-branch "$(git branch --show-current)"
```
**GitHub:**
```bash
gh pr list --head "$(git branch --show-current)" --state open
```

If none exists, stop and tell the user - this skill drives an existing MR/PR to merge, it doesn't
create one (that's `git-publish`).

### Drafts

A draft MR/PR cannot merge. In the normal flow it is already ready by the time this skill runs -
`close-task` marks it ready, because that is the moment the branch stops being provisional and it is
what releases the automated review it then reads.

So a draft here means the flow was skipped, not that a flag needs flipping in passing. Stop and say
so: the branch has not been through `close-task`, which means final validation and the code review
have not happened either. Marking it ready yourself would silently skip both. Offer `close-task`
instead, and merge only once it has run.

Check the flag before anything else:

```bash
glab api "/projects/$PROJECT/merge_requests/<mr-iid>" --jq '{title, draft}'   # GitLab
gh pr view "$PR_NUMBER" --json isDraft                                        # GitHub
```

---

## Step 2 - Check the pipeline

**GitLab** - resolve the project id once, then read the latest pipeline for the branch:
```bash
PROJECT=$(glab api "/projects/$(git remote get-url origin | sed -E 's#.*[:/]([^/]+/[^/.]+)(\.git)?$#\1#' | sed 's#/#%2F#')" --jq .id)
BRANCH=$(git branch --show-current)
glab api "/projects/$PROJECT/pipelines?ref=$BRANCH" --jq '.[0] | {id, status, web_url}'
```

**GitHub** - block until checks settle (this call polls on its own, no manual loop needed):
```bash
PR_NUMBER=$(gh pr list --head "$(git branch --show-current)" --state open --json number --jq '.[0].number')
gh pr checks "$PR_NUMBER" --watch
```

If there's no pipeline at all for this ref (no CI configured, or nothing triggered), say so and move
straight to Step 5's mergeability check.

If the pipeline is **green already** (and no job was skipped/allowed-to-fail - verify job list, not
just the top-level status), skip to Step 5.

If the pipeline is **still running**, wait for it - GitHub's `--watch` already blocks; for GitLab, poll
on an interval sized to the pipeline's typical runtime (don't hammer the API every few seconds):
```bash
while true; do
  STATUS=$(glab api "/projects/$PROJECT/pipelines?ref=$BRANCH" --jq '.[0].status')
  [ "$STATUS" != "running" ] && [ "$STATUS" != "pending" ] && [ "$STATUS" != "created" ] && break
  sleep 30
done
```

If it's **failed**, go to Step 3.

---

## Step 3 - Diagnose the failure

**GitLab:**
```bash
PIPELINE_ID=$(glab api "/projects/$PROJECT/pipelines?ref=$BRANCH" --jq '.[0].id')
glab api "/projects/$PROJECT/pipelines/$PIPELINE_ID/jobs" --jq '.[] | select(.status=="failed") | {id, name}'
glab api "/projects/$PROJECT/jobs/<failed-job-id>/trace"
```

**GitHub:**
```bash
gh run list --branch "$(git branch --show-current)" --limit 1
gh run view <run-id> --log-failed
```

Read the actual error, not just the job name. Reproduce it locally when possible (`pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm build`, or whatever the failing job runs - check the job's
script in `.gitlab-ci.yml`/`.github/workflows/*.yml` if unsure) so the fix is verified before it's
pushed, not just guessed at from the log.

Classify the failure honestly:
- A real code/test/type/lint defect → fix it (Step 4).
- Flaky infra (network blip, runner issue, transient timeout unrelated to the change) → re-run the
  job/pipeline once before touching any code; don't "fix" something that isn't broken.
- Something requiring a product decision or repo-owner input → stop and ask, per **Authorization**.

---

## Step 4 - Apply the fix and push

1. Make the minimal, correct fix for the diagnosed cause. Follow the repo's own conventions
   (`AGENTS.md`/`CLAUDE.md`, existing patterns, naming) exactly as any other change would.
2. Run the equivalent local validation for every job that failed until it's clean.
3. Stage only the files the fix touched:
   ```bash
   git add <files>
   git commit -m "<short, plain message describing the fix>"
   git push
   ```
   Push immediately - no confirmation prompt, per **Authorization**. This is the one non-negotiable
   exception to `git-publish`'s "ask before pushing" rule, and it applies only to this commit.
4. Return to Step 2 to re-check the new pipeline run. Track attempts; stop at 3 per the Rules above.

---

## Step 5 - Confirm the MR/PR is actually mergeable

Don't merge on pipeline-green alone - check for other blockers:

**GitLab:**
```bash
glab api "/projects/$PROJECT/merge_requests/<mr-iid>" --jq '{merge_status, has_conflicts, blocking_discussions_resolved, detailed_merge_status}'
```
**GitHub:**
```bash
gh pr view "$PR_NUMBER" --json mergeable,mergeStateStatus,reviewDecision
```

If blocked by anything other than the pipeline (conflicts, unresolved threads, missing approvals,
branch protection), stop and report exactly what's blocking it, per **Authorization**.

---

## Step 6 - Merge

**GitLab:**
```bash
glab api "/projects/$PROJECT/merge_requests/<mr-iid>/merge" -X PUT
```
**GitHub** - match the repo's enabled merge method rather than assuming one:
```bash
gh repo view --json squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed
gh pr merge "$PR_NUMBER" --squash   # or --merge / --rebase to match what's enabled
```

No confirmation prompt before merging, per **Authorization**. Do not pass a source-branch-deletion
flag unless the user has already indicated they want it - leave that to the repo's own default MR/PR
settings.

---

## Step 7 - Reset onto the default branch

Resolve the default branch rather than assuming `main` vs `master`:

**GitLab:**
```bash
glab api "/projects/$PROJECT" --jq .default_branch
```
**GitHub:**
```bash
gh repo view --json defaultBranchRef --jq .defaultBranchRef.name
```

Then:
```bash
git checkout <default-branch>
git pull
```

If local uncommitted changes block the checkout, stop and ask - don't stash or discard anything
without confirmation.

---

## Step 8 - Offer the next task

Offer, don't launch automatically:

> "Merged. Want me to start the next task? I can run `/start-task`."

If the user accepts and names or implies a task, invoke the `start-task` skill inline for that task.
Never wrap it in a subagent - the global `AGENTS.md` forbids wrapping a skill in an agent, and `start-task`
decides its own delegation. If the user doesn't specify a task, ask what to
start, or offer "next task" resolution the same way `start-task` itself would.

---

## Final Report

Always summarize:
- MR/PR merged, with its URL.
- Any pipeline fixes made: what failed, what the real fix was, files touched, commit hash(es).
- Number of fix-push-recheck cycles used.
- Default branch checked out and pulled.
- Whether `/start-task` was offered and what happened.
