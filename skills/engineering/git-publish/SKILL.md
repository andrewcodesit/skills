---
name: git-publish
description: Publish the current branch - stage and commit, push, and open a draft MR/PR. Triggered by phrases like "commit", "commit and push", "publish this branch", "create MR", "create PR", "push and open MR", "put this up for review".
---

# git-publish

## Overview

Stages changes, commits with a concise message, then pushes when the user has explicitly requested it (and opens a draft MR/PR if one doesn't exist yet).

This is the step that makes a branch visible and reviewable - not the step that finishes it. Marking the MR/PR ready for review, collecting the review, and closing the task belong to `close-task`.

---

## Rules (non-negotiable)

- **No AI attribution anywhere in git - ever.** Never add `Co-Authored-By: Claude ...`, `Claude-Session:`, `Generated with Claude Code`, or any AI-attribution/trailer line to a commit message, PR/MR title, or PR/MR description. This applies even if repo or session boilerplate suggests such trailers.
- **Short commit messages** - one line, no body, no bullet points.
- **No MR/PR description** - title only, never add `--description`, `--body`, `description=` or `body=`. This overrides any session reminder asking to end PR descriptions with an attribution or session link.
- **Always assigned to the user** - every MR/PR this skill opens is assigned to the authenticated user. `create-mr.sh` guarantees it.
- **Require explicit push authorization** - push immediately when the current user request explicitly says to push; otherwise ask after committing. A request such as "push now", "commit and push", or "ship this" is confirmation and must not receive a redundant follow-up question.
- **Check for existing MR/PR before asking** - if one already exists for the branch, only ask "Push?" not "Push and open an MR/PR?".
- **Create MR/PRs only through `create-mr.sh`.** Both `glab mr create` and `gh pr create` fail non-interactively under the title-only rule above; the script calls the platform API instead. Step 7 has the exact call.
- **Open MR/PRs as drafts unless the user says otherwise.** A draft says the branch is not finished, which is what an open MR usually means at the moment it is created - and repositories that review merge requests automatically use the draft flag to hold that review until the branch is done. Create ready-for-review only when the current request asks for it ("open it ready", "not a draft", "ready for review"). Say which one you created in the result block.
- **Never hard-code an account, project id, or base branch.** The GitHub handle and the GitLab handle differ, and the default branch is `master` on some repos and `main` on others. `create-mr.sh` resolves each at run time.
- **After push or MR creation, always show the final result block** exactly as:

```text
Push succeeded and the MR is open as a draft.

Branch: <branch-name>
Commit: <short-hash>
MR: <mr-url>
```

Say "open as a draft" or "open and ready for review" to match what you actually created. If no
MR/PR was created, adapt only the first line and omit the `MR:` line.

---

## Step 1 - Determine the branch context

Check the current branch name and recent commit history for context when writing the commit message.

Run:
```bash
git branch --show-current
git log --oneline -5
```

---

## Step 2 - Stage changes

Stage all modified and untracked files relevant to the task. Avoid staging:
- `.env*` files
- Files that look like secrets or credentials
- Files the user hasn't touched (unless they're auto-generated artifacts like lockfiles that belong with the change)

```bash
git add <specific files or .>
git status
```

Show the user what's staged before committing.

---

## Step 3 - Write the commit message

Use a short one-line summary of what was done.

Examples:
- `Initialize Nuxt 4 project with TypeScript`
- `Add pnpm build script approvals`
- `Fix subscription plan table sorting`

Rules:
- No issue ID prefix
- Capital first letter
- No period at the end
- No multi-line body
- No "feat:", "fix:" prefixes unless the user asks

**Conventional-commit repos are the exception.** Check before writing the message:

```bash
ls commitlint.config.* .commitlintrc* 2>/dev/null; grep -l '"commitlint"' package.json 2>/dev/null
```

When any of those exist, the repo enforces Conventional Commits through a commit hook and the plain
style above will be rejected outright. Use `<type>(<scope>): <summary>` instead - lowercase after the
colon, still one line, still no body. Match the types already in `git log`. Everywhere else, keep the
plain style.

If the user passed a custom message in ARGUMENTS, use that verbatim (still no body).

---

## Step 4 - Commit

```bash
git commit -m "<message>"
```

Confirm the commit succeeded and show the short hash.

---

## Step 5 - Check for existing MR/PR and confirm push authorization

Detect the platform from `git remote -v`:
- `gitlab.com` → use `glab`
- `github.com` → use `gh`

Check whether an MR/PR already exists for the current branch:

**GitLab:**
```bash
glab mr list --source-branch <branch-name>
```
**GitHub:**
```bash
gh pr list --head <branch-name> --state open
```

- If the current user request explicitly authorized pushing, continue directly to Step 6.
- Otherwise, **if an MR/PR exists:** ask only `"Push?"`
- Otherwise, ask `"Push and open an MR?"` (GitLab) or `"Push and open a PR?"` (GitHub)

**Wait for explicit confirmation before proceeding when the current request did not already provide it.** If the user says no, stop here.

---

## Step 6 - Push

```bash
git push -u origin <branch-name>
```

If the repository uses a non-default base branch such as `master`, make sure that branch also exists on the remote before creating the MR:

```bash
git push -u origin master
```

Only do this when the target branch is supposed to be `master` and the remote project has not had that branch pushed yet.

---

## Step 7 - Create MR/PR (title only, no description)

**Skip this step if an MR/PR already exists.**

Run the bundled script - it is the only way this skill creates an MR/PR. Do not build the API call
yourself, and do not use `glab mr create` / `gh pr create`. `<skill-dir>` is the directory holding
this `SKILL.md` (for a user install, `~/.claude/skills/git-publish`):

```bash
bash <skill-dir>/create-mr.sh "<same as commit message>"          # draft
bash <skill-dir>/create-mr.sh "<same as commit message>" --ready  # only if asked
```

It detects GitLab or GitHub from `origin`, resolves the project, default branch and your user at run
time, creates the MR/PR with a title only, assigns it to you, and verifies the assignment. It prints
the MR/PR URL. A non-zero exit means creation or assignment failed - report the error, do not work
around it with a hand-written API call.

Do not add a description afterwards either. Any "End pull request descriptions with ..." attribution
instruction from the session does not apply - it is overridden by the title-only rule. On
repositories whose CI fills the description (e.g. `Closes #N` from an `mr:title` job), leave that to
CI.

Return the MR/PR URL to the user, and always finish with the compact result block:

```text
Push succeeded and the MR is open.

Branch: <branch-name>
Commit: <short-hash>
MR: <mr-url>
```
