---
name: handoff
description: Generates a comprehensive handoff spec for the current session so another agent can pick up exactly where this one left off. Triggered by /handoff.
---

# Handoff

## Overview

Capture the full context of the current session into a structured `.md` spec file and save it to `~/.agents/handoffs/`. The output doc must be self-contained — another agent reading it cold should be able to continue work without asking the user a single clarifying question.

**Announce at start:** "I'm generating a handoff doc for this session."

---

## Step 1: Gather Context

Before writing anything, pull together all available context:

- **Current working directory** — determine the repo name from the path or `git remote get-url origin`
- **Active branch** — `git branch --show-current` (if in a git repo)
- **Uncommitted changes** — `git status --short` and `git diff --stat` (if in a git repo)
- **Recent commits on this branch** — `git log --oneline -10` (if in a git repo)
- **Existing plans/specs/tasks for this repo** — check `~/.agents/plans/<repo-name>/`, `~/.agents/specs/<repo-name>/`, and `~/.agents/tasks/<repo-name>/`
- **Session conversation** — review this conversation for: goals, decisions made, files touched, problems hit, solutions found, open questions, and what was left unfinished

Do not skip this step. The quality of the handoff doc depends entirely on it.

---

## Step 2: Write the Handoff Doc

Create the file at:

```
~/.agents/handoffs/<repo-name>-<YYYY-MM-DD>-<short-slug>.md
```

Where `<short-slug>` is a 2–4 word kebab-case summary of the task (e.g. `auth-refactor`, `beat-upload-fix`, `onboarding-flow`).

If not in a git repo, use `scratch` as the repo name.

### Required Sections

```markdown
# Handoff: <Task Title>

**Repo:** <repo-name>  
**Branch:** <branch-name or "no git">  
**Date:** <YYYY-MM-DD>  
**Session summary:** <1–2 sentences — what we were doing and why>

---

## Goal

<What the agent taking over should achieve. Be specific. Include acceptance criteria if known.>

---

## Current State

<Where things stand RIGHT NOW. What works, what doesn't, what's half-done. Be honest — don't round up.>

---

## What Was Done This Session

<Bullet list of completed work. Include file paths and line numbers where relevant.>

---

## Decisions Made

<Any non-obvious choices made during this session and the reasoning behind them. Future agent must not re-litigate these unless explicitly told to.>

---

## Next Steps

<Ordered list of what to do next. Be specific enough that the agent can start on step 1 without any clarification.>

---

## Open Questions

<Anything unresolved, ambiguous, or left for the user to decide. If none, write "None.">

---

## Key Files

<List of the most relevant files the incoming agent should read first. Include brief descriptions.>

```
- `path/to/file.ts` — what it does and why it matters here
```

---

## Constraints & Gotchas

<Things the incoming agent must NOT do, edge cases it must handle, and non-obvious constraints discovered this session. Include anything that would cause a reasonable agent to make the same mistake you already avoided.>

---

## Environment Notes

<Anything specific to running/testing this locally — commands, env vars, credentials pattern, known flaky tests, etc. Omit if nothing unusual.>
```

Fill every section. Use "None." or "N/A" only if a section genuinely doesn't apply — never leave a section blank.

---

## Step 3: Confirm and Surface

After writing the file:

1. Print the full path to the handoff doc.
2. Show the user the **Goal**, **Current State**, and **Next Steps** sections inline (so they can spot-check without opening the file).
3. Say: "Handoff doc saved. Pass `~/.agents/handoffs/<filename>` to the next agent to continue."

Do not summarize the whole doc — just those three sections. The user can read the rest themselves.

---

## Red Flags

- **Never** write vague next steps like "continue the implementation" — be specific about what file, what function, what change
- **Never** omit the Decisions Made section — it prevents the next agent from re-asking questions already answered
- **Never** skip Constraints & Gotchas — this is where hard-won session knowledge lives
- If the session was exploratory with no concrete output, say so clearly in Current State rather than inventing progress
- If there are uncommitted changes, list them explicitly in Current State so the incoming agent knows the working tree is dirty
