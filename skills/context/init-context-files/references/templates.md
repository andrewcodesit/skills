# Context File Templates

Every template has a size budget. Exceed it and the file must split into a directory with an
`index.md` - see [prose.md](./prose.md) (constraint P).

---

## `context/project-overview.md` - budget 8KB

```markdown
# [PROJECT NAME] - Project Overview

## What is [PROJECT NAME]?

[1–3 sentences: what the product does, who uses it, what problem it solves]

## Tech Stack

| Layer | Technology |
|---|---|

## Directory Structure

[Table showing top-level structure and what each part owns]

## Key Flows

[2–4 most important user or system flows - numbered steps, plain language]

## Development Commands

[Every command a developer runs day-to-day: dev, build, test, lint, db]

## External Services

[Each third-party service, its role, and where credentials live]
```

**Include:** product purpose, stack, structure, key flows, commands, external services.
**Exclude:** code patterns (→ code-standards), visual details (→ design-context).

---

## `context/code-standards.md` - budget 8KB

```markdown
# [PROJECT NAME] - Code Standards

## [Language/Framework] Conventions

[Non-obvious patterns: file structure rules, naming, component limits, import ordering]

## [Key Pattern]

[Correct vs incorrect - only for genuinely non-obvious rules]

## What Agents Get Wrong

[Bullets: common mistakes in this codebase]

## Rules

- [Rule]
```

**Include:** non-obvious conventions only. Omit generic best practice ("write tests", "use
meaningful names") - agents already know these, and every line costs on every turn.
**Format:** short bullets and small before/after blocks, not prose.

---

## `context/architecture-context.md` - budget 8KB, else `context/architecture/`

Single-file form, for projects with one clear shape:

```markdown
# [PROJECT NAME] - Architecture Context

## Service / App Boundaries

| Area | Purpose | When to use |
|---|---|---|

## Data Flow

[How data moves between layers - diagram or numbered steps]

## Key Decisions

[→ decisions.md once this exceeds ~5 rows]

## Non-Obvious Constraints

[Things that would surprise a new developer: rate limits, auth flows, DB gotchas]
```

Directory form, once any section outgrows the budget:

```
context/architecture/
├── index.md          # boundaries table + data flow + map of the leaves below
├── decisions.md      # the decision log (see below)
├── constraints.md    # non-obvious constraints
└── <subsystem>.md    # one per subsystem with real internal complexity
```

`index.md` must end with a table mapping each leaf to when to read it. An agent reads `index.md`
and one leaf - never the whole directory.

---

## `context/architecture/decisions.md` - budget 12KB (grows over time)

The PROSE `.memory.md` primitive. Highest-value file most projects lack.

```markdown
# [PROJECT NAME] - Architecture Decisions

| Decision | Why it exists | Consequence |
|---|---|---|
```

**One row per decision that a future agent could plausibly reverse by accident.** The "Consequence"
column is what makes it useful - it states what breaks if the decision is undone.
Append; don't rewrite history. When a decision is genuinely superseded, mark the row and add the
replacement rather than deleting.

---

## `context/design-context.md` - budget 8KB

```markdown
# [PROJECT NAME] - Design Context

## Brand Identity

[2–3 sentences: visual tone, target feeling]

## Typography

[Font family, scale, non-standard rules]

## Color System

[Token table: name → value → usage, organised by role]

## Radius and Spacing

[Only if the project overrides framework defaults]

## Component Library

[Table: component → how to use correctly]

## Styling Rules

[Ordered list, most important first]
```

**Exclude:** any value matching the framework default - document overrides only.

---

## `context/domain-context.md` - budget 8KB

```markdown
# [PROJECT NAME] - Domain Context

## Glossary

| Term | Meaning in this codebase |
|---|---|

## Core Business Rules

[Business rules, not technical rules]

## Key Entities

[The 5–10 most important domain objects and how they relate]

## What Agents Get Wrong

[Domain misunderstandings that cause bugs]
```

**Create only when** the domain has significant terminology (billing, medical, legal, finance,
logistics) or when incorrect domain understanding has caused real bugs.

---

## Nested `AGENTS.md` - budget 2KB each

One per major subtree. Pointers and subtree-specific rules only; never a copy of root content.

```markdown
# [subtree] - Agent Instructions

Inherits the root `AGENTS.md`. Rules below apply to `[subtree]/` only.

## Read before working here

| Working on | Read |
|---|---|

## Rules

- [rule that applies only in this subtree]
```
