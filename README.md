# Skills for day-to-day agentic engineering

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Practical agent skills for real engineering work with Claude Code, Codex, Gemini CLI, and other tools that support the Agent Skills format.

These are the skills I keep reusing across repos because they solve recurring failure modes: weak plans, lost context, shallow reviews, and gradual repo drift.

## Install

```bash
npx skills@latest add andrewcodesit/skills
```

Pick the skills you want from the interactive prompt. Works with Claude Code, Codex, Cursor, Windsurf, and [other agents that support the format](https://github.com/vercel-labs/skills#supported-agents).

Install a specific skill without the picker:

```bash
npx skills@latest add andrewcodesit/skills --skill code-review
```

### Claude Code plugin (skills + agents)

In Claude Code, install the skills together with the subagents they delegate to:

```text
/plugin marketplace add andrewcodesit/skills
/plugin install skills@andrewcodesit
```

Plugin skills and agents are namespaced under `skills:` (for example `/skills:plan` and the `skills:critic` agent). Use one install path, not both, or every skill shows up twice.

> **Upgrading from 1.x:** `init-context-files` is now `setup-context`. Remove the old skill when you update.

## Why These Skills Exist

### #1: Plans get written, then ignored

An agent will happily write a plan and then quietly deviate from it the moment implementation gets hard. **[`plan`](./skills/project-management/plan/SKILL.md)** forces a real plan to exist before code gets touched. **[`execute`](./skills/engineering/execute/SKILL.md)** runs that plan and then checks the result against it - so drift gets caught, not shipped. **[`plan-review`](./skills/project-management/plan-review/SKILL.md)** catches bad plans before they become bad code. Sometimes I even run plan-review multiple times in a row, iterating on the plan until it's solid before I let it near the codebase.

### #2: Context dies at the end of every session

Every new session starts from zero unless you've documented the repo for the agent. **[`setup-context`](./skills/context/setup-context/SKILL.md)** gives agents a persistent `context/` directory instead of re-deriving the codebase from scratch each time, and **[`update-context`](./skills/context/update-context/SKILL.md)** keeps it true as the code and your instructions change. **[`handoff`](./skills/project-management/handoff/SKILL.md)** captures exactly where a session left off so the next one - yours or another agent's - can pick it up cold.

### #3: Reviews are either rubber-stamps or noise

Agents reviewing agent-written code tend to either approve everything or flood you with nitpicks. **[`code-review`](./skills/engineering/code-review/SKILL.md)** is tuned to focus on real bugs and real risks, not style noise.

The other half of the problem is *when* review happens. An agent that reviews its own work seconds after writing it, with the plan still in context, mostly re-confirms its own assumptions - so `execute` verifies the implementation against the plan and stops there, and the real review is a separate pass over the finished diff. Whether that's `code-review` or an automated reviewer on the merge request is up to your repo; either way it's offered, never forced.

### #4: Cruft accumulates and nobody notices

Dead code, leftover debug logs, and unused imports pile up quietly across sessions. **[`cleanup`](./skills/engineering/cleanup/SKILL.md)** scans for it, cites `file:line`, and fixes it category by category with your confirmation - not a silent mass rewrite.

### #5: Project work needs a trackable path

Starting from a vague idea is where agents lose the thread fastest. **[`define-spec`](./skills/project-management/define-spec/SKILL.md)** turns the idea into a concise spec, **[`breakdown-tasks`](./skills/project-management/breakdown-tasks/SKILL.md)** turns that spec into local or external tasks with epics when the work is large, **[`git-publish`](./skills/engineering/git-publish/SKILL.md)** puts the branch up as a draft merge/pull request once there's something worth showing, and **[`close-task`](./skills/project-management/close-task/SKILL.md)** handles the finish line: final validation, marking that request ready for review, routing whatever the review turns up, and task completion.

## Reference

### Context

- **[setup-context](./skills/context/setup-context/SKILL.md)** - Creates a `context/` directory with structured markdown that gives agents persistent project knowledge.
- **[update-context](./skills/context/update-context/SKILL.md)** - Makes targeted edits to `context/` files when new information turns up, instead of rewriting them.

### Engineering

- **[cleanup](./skills/engineering/cleanup/SKILL.md)** - Scans the repo for dead code, debug artifacts, and other cruft, then fixes it category by category with confirmation.
- **[code-review](./skills/engineering/code-review/SKILL.md)** - Deep code review focused on structural issues, behavioral risks, and missing coverage.
- **[execute](./skills/engineering/execute/SKILL.md)** - Runs an approved plan, then verifies the implementation against the plan, repo standards, and the contracts the plan named.
- **[git-merge](./skills/engineering/git-merge/SKILL.md)** - Drives an open merge/pull request to merged: fixes CI failures with real fixes, checks mergeability, merges, and resets onto the default branch.
- **[git-publish](./skills/engineering/git-publish/SKILL.md)** - Commits the current branch, pushes it, and opens a draft merge/pull request on GitHub or GitLab.
- **[tests-audit](./skills/engineering/tests-audit/SKILL.md)** - Audits an existing test suite for bloat, flakiness, and redundancy, then right-sizes it.
- **[verify-ui](./skills/engineering/verify-ui/SKILL.md)** - Verifies local UI changes in a running app, including the browser flow, layout, and visible regressions.
- **[verify-ts](./skills/engineering/verify-ts/SKILL.md)** - TypeScript strictness audit enforcing no-any, unknown at boundaries, discriminated unions, branded types, exhaustiveness checks, and runtime validation.

### Project Management

- **[breakdown-tasks](./skills/project-management/breakdown-tasks/SKILL.md)** - Breaks specs or project goals into local or external tasks, with epics for larger work.
- **[close-task](./skills/project-management/close-task/SKILL.md)** - Finishes a task by running final validation, marking the merge/pull request ready for review, routing the resulting review findings, and marking the task done.
- **[define-spec](./skills/project-management/define-spec/SKILL.md)** - Turns a project idea, feature request, bug, or vague goal into a concise implementation-ready spec.
- **[handoff](./skills/project-management/handoff/SKILL.md)** - Generates a comprehensive handoff spec so another agent can pick up the session.
- **[plan](./skills/project-management/plan/SKILL.md)** - Writes an implementation plan for a feature, task, or spec.
- **[plan-review](./skills/project-management/plan-review/SKILL.md)** - Reviews an implementation plan and critiques it before execution.
- **[start-task](./skills/project-management/start-task/SKILL.md)** - Starts work from any task source: checks out the branch and hands off to `plan`; runs several tasks in parallel worktrees when asked.

### Agents

Claude Code subagents in [`agents/`](./agents), shipped with the plugin. Skills name the agent for each role and fall back to a generic subagent when it is not installed; the role table and model binding live in each skill's `references/delegation.md`.

| Agent | Role | Used by |
| --- | --- | --- |
| [`scout`](./agents/scout.md) | Searcher - broad "where is X" sweeps | any skill, through the Searcher role |
| [`architect`](./agents/architect.md) | Planner - one plan per task in parallel runs | `start-task` |
| [`smith`](./agents/smith.md) | Implementer - one plan task from a briefing pack | `execute` |
| [`foreman`](./agents/foreman.md) | Plan executor - a whole approved plan in its own worktree | `start-task` |
| [`critic`](./agents/critic.md) | Reviewer - read-heavy audits and reviews | `code-review`, `verify-ts`, `tests-audit`, `cleanup` |
| [`devil`](./agents/devil.md) | Refuter - tries to disprove one finding | on demand, before acting on a costly finding |
| [`gatekeeper`](./agents/gatekeeper.md) | Validator - typecheck, lint, tests; returns failures only | `execute`, `close-task` |
| [`pilot`](./agents/pilot.md) | Browser verifier - drives a real browser | `verify-ui` |

## How a skill is structured

Each skill is a `SKILL.md` file with YAML frontmatter (`name`, `description`) plus instructions the agent follows when it matches your request, grouped under `skills/<category>/<skill-name>/SKILL.md`.

Skills follow the [Agent Skills specification](https://agentskills.io) and are compatible with any agent that supports it.

## For contributors

This repo is intentionally simple:

- Skills live at `skills/<category>/<skill-name>/SKILL.md`; agents live at `agents/<name>.md`.
- Every skill and agent must include YAML frontmatter with a non-empty `name` and `description`.
- `.claude-plugin/` makes the repo a Claude Code marketplace with one plugin; its version must match `package.json`.
- Validation is handled by `scripts/validate-skills.js`; test the repo with `npm test`.
- There is no build step, transpilation, or bundler.

Skills are maintained in a local skills directory and released here in batches. `npm run release` copies every skill and agent listed in `scripts/release.js` from `~/.agents/skills` and `~/.agents/agents` (override with `--skills-dir` and `--agents-dir`), turns `references/` symlinks into real files, removes skills no longer listed, and fails on any validation error. Review the resulting diff before committing.

## License

[MIT](LICENSE)
