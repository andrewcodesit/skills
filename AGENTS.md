# AGENTS.md

This file is the source of truth for agent instructions in this repository.

## Instruction Source Of Truth

- `AGENTS.md` is the only canonical instruction file for agents in this repo.
- `CLAUDE.md` must remain a pointer to `AGENTS.md`, not a second rules file.
- When repo-specific agent guidance changes, update `AGENTS.md` and do not duplicate the change elsewhere.

## Commands

```bash
# Run tests
npm test

# Validate skills and agents manually
node scripts/validate-skills.js

# Release local skills and agents into the repo (see Release Workflow)
npm run release

# Validate the plugin and marketplace manifests (needs the Claude Code CLI)
claude plugin validate .
```

No build step - plain Node.js, no transpilation, no bundler.

## Architecture

This is a skills content library with a companion set of Claude Code subagents. It ships two ways:

- Skills only, via the Vercel skills CLI: `npx skills@latest add andrewcodesit/skills`.
- Skills and agents together, as a Claude Code plugin: `.claude-plugin/marketplace.json` declares the
  marketplace `andrewcodesit` with one plugin `skills` whose root is the repo root, and
  `.claude-plugin/plugin.json` lists the three skill category directories. Agents load from `agents/`.

There is no CLI, no postinstall script, and no npm publish workflow. The only code in this repo is
`scripts/validate-skills.js`, its test, and `scripts/release.js` - they exist to catch malformed or
non-portable content before it reaches users and to import releases mechanically.

## Skill Rules

- Each skill lives at `skills/<category>/<skill-name>/SKILL.md`.
- Every `SKILL.md` must contain YAML frontmatter with a non-empty `name` and `description` field.
- The validator in `scripts/validate-skills.js` enforces that both fields are present and non-empty.
- Each agent lives at `agents/<name>.md` with frontmatter `name` equal to the filename and a non-empty
  `description`.
- Published skills and agents are portable: no symlinks, no `~/.agents/standards/` or `~/AGENTS.md`
  paths, no absolute home paths, no em dashes. The validator rejects each of these.
- Skills in this repo must stay vendor-neutral by default. Do not write instructions that assume Jira, Azure DevOps, ClickUp, GitLab Issues, or another specific task-management or DevOps platform unless the skill is explicitly about integrating with that platform.
- Prefer generic terms such as `ticket`, `issue`, `task`, `spec`, `wiki`, or `project management system` over vendor names.
- If a workflow can consume upstream work items, phrase it so the agent adapts to the system available in the user environment instead of assuming one.
- For implementation decisions, prioritize output quality, correctness, maintainability, reliability, security where relevant, and established best practice. Never use development cost, development time, implementation effort, or perceived difficulty as a selection criterion.
- Use a standard hyphen (`-`), never an em dash, in skill prose and in the output templates skills tell agents to emit. Templates propagate: an em dash inside a fenced example reappears in every report, plan, and question an agent writes from it.
- Skills that read many files and return a short saved report should say so, and say which of their steps must stay with the main agent. Delegation guidance describes work by role. A skill may name an agent only when it ships in `agents/` (the validator checks this); `references/delegation.md` maps roles to agents and models and carries the generic-subagent fallback for environments without them.

## Shared References

Some skills carry an identical file under `references/`, so each skill stays self-contained and works
when installed on its own. `references/question-format.md` is one of these - it defines the format
every skill uses to ask the user a question. `references/delegation.md` is the other - it defines
when and how skills delegate to subagents.

- Edit the maintainer's single local standards file and release; the release writes every copy.
  When editing in the repo directly, editing one copy means editing **every** copy. `validateSharedReferences` in
  `scripts/validate-skills.js` fails CI when copies drift.
- To add a new shared reference, add its filename to `SHARED_REFERENCES` in that script.
- Do not replace these copies with a single file that skills read by absolute path. Users install
  skills individually, so a cross-skill path breaks for anyone who did not install every skill.

## Release Workflow

The maintainer's local skills (`~/.agents/skills`) and agents (`~/.agents/agents`) are the source of
truth and are released here in batches. Locally, each shared reference is a symlink to one standards
file; `npm run release` copies every skill and agent listed in `scripts/release.js`, turns those
symlinks into real files, removes repo skills no longer listed, and fails on any validation error.

- To publish, unpublish, or move a skill between categories, edit the manifest in `scripts/release.js`.
- Fix validation errors in the local source and release again; never hand-patch released files.
- Bump the version in both `package.json` and `.claude-plugin/plugin.json`; the validator checks they
  match.

## CI

GitHub Actions runs `validate-skills.js` and `npm test` on every push and pull request to `master`.
`claude plugin validate .` is not in CI (it needs the Claude Code CLI); run it locally when the
manifests or the skill layout change.

## Adding a Skill

Create `skills/<category>/<slug>/SKILL.md` with valid frontmatter:

```markdown
---
name: <slug>
description: Use when ...
---

# Skill content here
```

CI will fail the PR if validation fails.

When adding, removing, or renaming a skill or agent, always update the Reference section of `README.md` to reflect the change.
