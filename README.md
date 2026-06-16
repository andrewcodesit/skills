# Skills for day-to-day agentic engineering

[![npm version](https://img.shields.io/npm/v/@andrewcodesit/skills.svg)](https://www.npmjs.com/package/@andrewcodesit/skills)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Practical skills for developers and teams who want AI agents embedded in their real workflows — not just demos.

## Why this exists

Most agent skill sets are one-offs built for a specific project. This collection is different: every skill here is something you reach for repeatedly, designed to fit into the kind of workflows real engineering teams actually run — sprint planning, code review, project management.

## How it works

A skill is a `SKILL.md` file with YAML frontmatter (`name`, `description`) plus instructions the agent follows when it matches your request. This package groups skills into categories under `skills/<category>/<skill-name>/SKILL.md` and copies them into whichever agent directories it finds on your machine.

```
skills/
  context/
    init-context-files/SKILL.md
  engineering/
    cleanup/SKILL.md
    code-review/SKILL.md
    execute/SKILL.md
  project-management/
    plan/SKILL.md
    plan-review/SKILL.md
    handoff/SKILL.md
```

## Skills

### Context

| Skill | What it does |
|---|---|
| `init-context-files` | Creates a `context/` directory with structured markdown files that give agents deep, persistent project knowledge |

### Engineering

| Skill | What it does |
|---|---|
| `cleanup` | Scans the repo for dead code, debug artifacts, and other cruft, then fixes it category by category with confirmation |
| `code-review` | Deep code review that acts like a blunt senior engineer |
| `execute` | Runs an approved plan, then reviews the implementation against spec and repo standards |

### Project Management

| Skill | What it does |
|---|---|
| `plan` | Writes an implementation plan for a feature, task, or spec |
| `plan-review` | Reviews an implementation plan and critiques it before execution |
| `handoff` | Generates a comprehensive handoff spec so another agent can pick up the session |

## Install

```bash
npm install -g @andrewcodesit/skills
```

Skills are automatically copied into detected agent directories on install.

| Agent | Directory |
|---|---|
| Claude Code | `~/.claude/skills/` |
| Codex | `~/.agents/skills/` |
| Gemini CLI | `~/.gemini/skills/` |

## Update

```bash
skills update
```

Checks the npm registry for a newer version and upgrades if one is available.

## Contributing

1. Create `skills/<category>/<skill-name>/SKILL.md` with valid frontmatter:

   ```markdown
   ---
   name: <skill-name>
   description: Use when ...
   ---

   Skill instructions here.
   ```

2. Run `node scripts/validate-skills.js` to confirm `name` and `description` are present.
3. Run `npm test` before opening a pull request.

## Release (maintainers)

1. Bump `version` in `package.json`
2. `git tag v1.x.x && git push --tags`

GitHub Actions validates, tests, and publishes to npm automatically — no manual publish step.

## License

[MIT](LICENSE)
