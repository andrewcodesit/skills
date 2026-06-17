# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run tests
npm test

# Validate skills manually
node scripts/validate-skills.js
```

No build step — plain Node.js, no transpilation, no bundler.

## Architecture

This is a skills content library. Skills are installed by users via the Vercel skills CLI:

```bash
npx skills@latest add andrewcodesit/skills
```

There is no CLI, no postinstall script, and no npm publish workflow. The only code in this repo is `scripts/validate-skills.js` and its test — both exist to catch malformed skill frontmatter before it reaches users.

**Skill format:** Each skill lives at `skills/<category>/<skill-name>/SKILL.md`. The file must contain YAML frontmatter with a non-empty `name` and `description` field — validated by `scripts/validate-skills.js`.

**CI:** GitHub Actions runs `validate-skills.js` and `npm test` on every push and pull request to `master`.

## Adding a Skill

Create `skills/<category>/<slug>/SKILL.md` with valid frontmatter:

```markdown
---
name: <slug>
description: Use when ...
---

# Skill content here
```

The validator enforces that both `name` and `description` are present and non-empty. CI will fail the PR if validation fails.
