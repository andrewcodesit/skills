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

# Validate skills manually
node scripts/validate-skills.js
```

No build step - plain Node.js, no transpilation, no bundler.

## Architecture

This is a skills content library. Skills are installed by users via the Vercel skills CLI:

```bash
npx skills@latest add andrewcodesit/skills
```

There is no CLI, no postinstall script, and no npm publish workflow. The only code in this repo is `scripts/validate-skills.js` and its test - both exist to catch malformed skill frontmatter before it reaches users.

## Skill Rules

- Each skill lives at `skills/<category>/<skill-name>/SKILL.md`.
- Every `SKILL.md` must contain YAML frontmatter with a non-empty `name` and `description` field.
- The validator in `scripts/validate-skills.js` enforces that both fields are present and non-empty.
- Skills in this repo must stay vendor-neutral by default. Do not write instructions that assume Jira, Azure DevOps, ClickUp, GitLab Issues, or another specific task-management or DevOps platform unless the skill is explicitly about integrating with that platform.
- Prefer generic terms such as `ticket`, `issue`, `task`, `spec`, `wiki`, or `project management system` over vendor names.
- If a workflow can consume upstream work items, phrase it so the agent adapts to the system available in the user environment instead of assuming one.
- For implementation decisions, prioritize output quality, correctness, maintainability, reliability, security where relevant, and established best practice. Never use development cost, development time, implementation effort, or perceived difficulty as a selection criterion.
- Use a standard hyphen (`-`), never an em dash, in skill prose and in the output templates skills tell agents to emit. Templates propagate: an em dash inside a fenced example reappears in every report, plan, and question an agent writes from it.
- Skills that read many files and return a short saved report should say so, and say which of their steps must stay with the main agent. Delegation guidance stays harness-neutral: describe the executor the environment exposes rather than naming a vendor's agent types or models.

## Shared References

Some skills carry an identical file under `references/`, so each skill stays self-contained and works
when installed on its own. `references/question-format.md` is one of these - it defines the format
every skill uses to ask the user a question, and it currently lives in `plan`, `plan-review`,
`breakdown-tasks`, `code-review`, and `execute`.

- Editing one copy means editing **every** copy. `validateSharedReferences` in
  `scripts/validate-skills.js` fails CI when copies drift.
- To add a new shared reference, add its filename to `SHARED_REFERENCES` in that script.
- Do not replace these copies with a single file that skills read by absolute path. Users install
  skills individually, so a cross-skill path breaks for anyone who did not install every skill.

## CI

GitHub Actions runs `validate-skills.js` and `npm test` on every push and pull request to `master`.

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

When adding, removing, or renaming a skill, always update the Reference section of `README.md` to reflect the change.
