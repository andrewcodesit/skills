# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests
npm test

# Run a single test file
node --test tests/install.test.js

# Validate skills manually
node scripts/validate-skills.js
```

No build step — plain Node.js, no transpilation, no bundler.

## Architecture

This is an npm package (`@andrewcodesit/skills`) that distributes AI agent skills to local agent directories on install.

**Core flow:**
1. `npm install -g` triggers `postinstall` → `scripts/install.js`
2. Install script detects which agent dirs exist (`~/.claude/skills/`, `~/.agents/skills/`, `~/.gemini/skills/`) and copies each skill folder into them
3. `bin/skills.js` exposes the `skills update` CLI command, which checks the npm registry and re-installs if a newer version exists

**Skill format:** Each skill lives at `skills/<skill-name>/SKILL.md`. The file must contain YAML frontmatter with a non-empty `name` and `description` field — validated by `scripts/validate-skills.js`.

**Release process:** Bump `version` in `package.json`, push a `v*` tag. GitHub Actions (`.github/workflows/publish.yml`) runs validation, tests, then publishes to npm automatically — no manual `npm publish`.

## Adding a Skill

Create `skills/<slug>/SKILL.md` with valid frontmatter:

```markdown
---
name: <slug>
description: Use when ...
---

# Skill content here
```

The validator (`scripts/validate-skills.js`) enforces that both `name` and `description` are present and non-empty. CI will reject the publish if validation fails.
