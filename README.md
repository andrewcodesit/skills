# @andrewcodesit/skills

Distributes agent skills to AI coding agents (Claude Code, Codex, Gemini CLI).

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
