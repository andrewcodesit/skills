---
name: handoff
description: Generates a comprehensive handoff spec for the current session so another agent can pick up exactly where this one left off, then copies a short ready-to-paste prompt for the next session to the clipboard. Triggered by /handoff.
---

# Handoff

Announce at start: `Generating a handoff doc...`

Capture the full context of this session into a `.md` spec another agent can act on cold, without
asking the user a single clarifying question. Self-containment is the whole bar.

## 1. Gather context

Pull all of it before writing anything - the doc is only as good as this step:

- Repo name from the working directory or `git remote get-url origin`
- Active branch (`git branch --show-current`)
- Uncommitted changes (`git status --short`, `git diff --stat`)
- Recent commits (`git log --oneline -10`)
- Existing plans, specs, and tasks under `~/.agents/plans|specs|tasks/<repo-name>/`
- This conversation: goals, decisions made, files touched, problems hit, solutions found, open
  questions, and what was left unfinished

## 2. Write the doc

Save to `~/.agents/handoffs/<repo-name>-<YYYY-MM-DD>-<short-slug>.md`, where the slug is 2–4
kebab-case words (`auth-refactor`, `beat-upload-fix`). Outside a git repo, use `scratch` as the repo
name.

```markdown
# Handoff: <Task Title>

**Repo:** <repo-name>
**Branch:** <branch-name or "no git">
**Date:** <YYYY-MM-DD>
**Session summary:** <1–2 sentences - what we were doing and why>

## Goal
What the incoming agent should achieve, with acceptance criteria when known.

## Current State
Where things stand right now: what works, what doesn't, what's half-done. Report it honestly rather
than rounding up. List uncommitted changes explicitly so the agent knows the tree is dirty. If the
session was exploratory with no concrete output, say exactly that.

## What Was Done This Session
Completed work, with file paths and line numbers where relevant.

## Decisions Made
Non-obvious choices and the reasoning behind them. This section is what stops the next agent from
re-litigating settled questions, so it always has content.

## Next Steps
Ordered and specific - name the file, the function, and the change, so step 1 needs no clarification.

## Open Questions
Anything unresolved or left for the user to decide. "None." if there are none.

## Key Files
- `path/to/file.ts` - what it does and why it matters here

## Constraints & Gotchas
What the incoming agent must avoid, edge cases it must handle, and the non-obvious constraints
discovered this session - especially any mistake you already avoided that a reasonable agent would
walk straight into.

## Environment Notes
Commands, env vars, credential patterns, known flaky tests. Omit when nothing is unusual.
```

Fill every section; "None." or "N/A" only where one genuinely doesn't apply.

## 3. Write the handoff prompt

Compose a short prompt the user pastes as the first message of the next session. It points at the
doc rather than repeating it - the doc is the briefing, the prompt is the ignition. At most 10 lines,
in the language the user has been writing in:

```text
Continue <task title> in <repo-name> (branch <branch-name>).
Read the handoff first: <absolute path to the handoff .md>
Brief: <2-3 sentences - where things stand and what matters most>
Start with: <Next Steps item 1, concrete enough to act on>
<one line for a blocker, a pending decision, or a hard constraint - omit when none>
```

Use the absolute path (no `~`), so the prompt works from any working directory.

Copy it to the clipboard by piping it to the bundled script through a quoted heredoc, so quotes and
backticks in the prompt survive:

```bash
<skill-dir>/scripts/copy-to-clipboard.sh <<'PROMPT'
<prompt text>
PROMPT
```

If the script reports that no clipboard tool exists, say so in one line; the prompt is still printed
below.

## 4. Surface it

Print the full path of the doc, show the **Goal**, **Current State**, and **Next Steps** sections
inline so the user can spot-check, then show the handoff prompt in a fenced block and close with:

> Handoff doc saved and the prompt is on your clipboard - paste it into a fresh session.

The user can read the rest themselves - keep the other sections out of chat.
