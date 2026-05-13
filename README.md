# Skills for day-to-day agentic engineering

> Practical skills for developers and teams who want AI agents embedded in their real workflows — not just demos.

## Why this exists

Most agent skill sets are one-offs built for a specific project. This collection is different: every skill here is something you reach for repeatedly, designed to fit into the kind of workflows real engineering teams actually run — sprint planning, code review, project management, publishing.

## Skills

### Context

| Skill | What it does |
|---|---|
| `init-context-files` | Creates a `context/` directory with structured markdown files that give agents deep, persistent project knowledge |

### Publishing

| Skill | What it does |
|---|---|
| `post-to-threads` | Drafts and posts dev-focused content to Meta Threads |

### Engineering

_Coming soon_

### Project Management

_Coming soon_

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

## Release

1. Add or edit skills in `skills/`
2. Bump `version` in `package.json`
3. `git tag v1.x.x && git push --tags`

GitHub Actions validates, tests, and publishes automatically — no manual publish step.
