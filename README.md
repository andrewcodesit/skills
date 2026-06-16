# Skills for day-to-day agentic engineering

[![npm version](https://img.shields.io/npm/v/@andrewcodesit/skills.svg)](https://www.npmjs.com/package/@andrewcodesit/skills)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

My agent skills for getting real engineering work done with Claude Code, Codex, and Gemini CLI - not demos.

Most skill collections are one-offs, built for a single project and abandoned. These are different: every skill here is something I reach for on every repo, every week, because it fixes a specific failure mode I kept hitting with agents.

## Install

```bash
npm install -g @andrewcodesit/skills
```

Skills are copied automatically into whichever agent directories exist on your machine:

| Agent       | Directory           |
| ----------- | ------------------- |
| Claude Code | `~/.claude/skills/` |
| Codex       | `~/.agents/skills/` |
| Gemini CLI  | `~/.gemini/skills/` |

Run `skills update` later to pull the latest version from npm.

## Why These Skills Exist

### #1: Plans get written, then ignored

An agent will happily write a plan and then quietly deviate from it the moment implementation gets hard. **[`plan`](./skills/project-management/plan/SKILL.md)** forces a real plan to exist before code gets touched. **[`execute`](./skills/engineering/execute/SKILL.md)** runs that plan and then checks the result against it - so drift gets caught, not shipped. **[`plan-review`](./skills/project-management/plan-review/SKILL.md)** catches bad plans before they become bad code. Sometimes I even run plan-review multiple times in a row, iterating on the plan until it's solid before I let it near the codebase.

### #2: Context dies at the end of every session

Every new session starts from zero unless you've documented the repo for the agent. **[`init-context-files`](./skills/context/init-context-files/SKILL.md)** gives agents a persistent `context/` directory instead of re-deriving the codebase from scratch each time. **[`handoff`](./skills/project-management/handoff/SKILL.md)** captures exactly where a session left off so the next one - yours or another agent's - can pick it up cold.

### #3: Reviews are either rubber-stamps or noise

Agents reviewing agent-written code tend to either approve everything or flood you with nitpicks. **[`code-review`](./skills/engineering/code-review/SKILL.md)** reviews like a blunt senior engineer would: real bugs and real risks, not style nitpicks.

### #4: Cruft accumulates and nobody notices

Dead code, leftover debug logs, and unused imports pile up quietly across sessions. **[`cleanup`](./skills/engineering/cleanup/SKILL.md)** scans for it, cites `file:line`, and fixes it category by category with your confirmation - not a silent mass rewrite.

## Reference

### Context

- **[init-context-files](./skills/context/init-context-files/SKILL.md)** - Creates a `context/` directory with structured markdown that gives agents persistent project knowledge.

### Engineering

- **[cleanup](./skills/engineering/cleanup/SKILL.md)** - Scans the repo for dead code, debug artifacts, and other cruft, then fixes it category by category with confirmation.
- **[code-review](./skills/engineering/code-review/SKILL.md)** - Deep code review that acts like a blunt senior engineer.
- **[execute](./skills/engineering/execute/SKILL.md)** - Runs an approved plan, then reviews the implementation against spec and repo standards.

### Project Management

- **[plan](./skills/project-management/plan/SKILL.md)** - Writes an implementation plan for a feature, task, or spec.
- **[plan-review](./skills/project-management/plan-review/SKILL.md)** - Reviews an implementation plan and critiques it before execution.
- **[handoff](./skills/project-management/handoff/SKILL.md)** - Generates a comprehensive handoff spec so another agent can pick up the session.

## How a skill is structured

Each skill is a `SKILL.md` file with YAML frontmatter (`name`, `description`) plus instructions the agent follows when it matches your request, grouped under `skills/<category>/<skill-name>/SKILL.md`.

## License

[MIT](LICENSE)
