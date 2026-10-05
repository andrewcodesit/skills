# Context File Templates

Every template carries its size budget. A file that exceeds it splits into a directory with an
`index.md` (see [prose.md](./prose.md), constraint P); a directory-only rule moves to that
directory's `AGENTS.md`.

---

## Root `AGENTS.md` - budget 4 KB

```markdown
# [PROJECT NAME] - Agent Instructions

[One sentence: what the project is.]

## Rules

- [Repo-wide rule an agent would get wrong without being told]

## Approval Gates

Never run these without explicit confirmation in the current turn:
- [operation - one line, no rationale beyond a clause]

## Context Map

Read only the rows that match the task, before starting it:

| Working on | Read |
|---|---|

Directory rules live in [`dir/AGENTS.md`, ...].
```

**Exclude:** anything only one directory needs (-> nested `AGENTS.md`), anything only one task type
needs (-> a leaf), procedures (-> a skill), rationale (-> decision log).

---

## Nested `AGENTS.md` - budget 2 KB each

One per directory with rules of its own. Directory rules and pointers only; never a copy of root
content.

```markdown
# [dir] - Agent Instructions

Rules below apply to `[dir]/` only, on top of the root `AGENTS.md`.

## Read before working here

| Working on | Read |
|---|---|

## Rules

- [rule that applies only in this directory]
```

---

## `CLAUDE.md` shim - beside every `AGENTS.md`

```markdown
# CLAUDE.md
@AGENTS.md
```

Nothing else. Never import a `context/` leaf.

---

## `context/project-overview.md` - budget 8 KB

```markdown
# [PROJECT NAME] - Project Overview

## What is [PROJECT NAME]?

[1-3 sentences: what the product does, who uses it, what problem it solves]

## Tech Stack

| Layer | Technology |
|---|---|

## Directory Structure

[Table of the top-level parts and what each owns - only what a listing does not make obvious]

## Key Flows

[2-4 most important user or system flows - numbered steps, plain language]

## Development Commands

[Commands whose purpose or order is not obvious from package scripts]

## External Services

[Each third-party service, its role, and where credentials live]
```

**Exclude:** code patterns (-> code-standards), visual details (-> design), anything a directory
listing or `package.json` already shows.

---

## `context/code-standards.md` - budget 4 KB (the "always" file)

```markdown
# [PROJECT NAME] - Code Standards

## Conventions

[Non-obvious repo-wide patterns: naming, file placement, import rules]

## [Key Pattern]

[Correct vs incorrect - only for genuinely non-obvious rules]

## What Agents Get Wrong

- [One line per trap an agent actually fell into, naming the right alternative]
```

**Include:** non-obvious repo-wide conventions only. Rules for one directory go to that directory's
`AGENTS.md`; testing or UI rules that grow past a few lines get their own leaf and map row. Omit
generic best practice ("write tests", "use meaningful names") - agents already know these, and every
line costs on every turn.

---

## `context/architecture/` - index 8 KB, each leaf 8 KB

Single-file form (`context/architecture-context.md`) only while everything fits in 8 KB. Otherwise:

```
context/architecture/
├── index.md          # boundaries table + data flow + map of the leaves below
├── decisions.md      # the decision log (see below)
├── constraints.md    # non-obvious constraints
└── <subsystem>.md    # one per subsystem with real internal complexity
```

```markdown
# [PROJECT NAME] - Architecture

## Service / App Boundaries

| Area | Purpose | When to use |
|---|---|---|

## Data Flow

[How data moves between layers - numbered steps]

## Leaves

| Read | When |
|---|---|
```

`index.md` ends with the leaf table. An agent reads `index.md` and one leaf - never the whole
directory.

---

## Decision log - budget 8 KB per file

One dated entry per decision that a future agent could plausibly reverse by accident. No tables:
table rows get padded to align, and the padding is paid for on every read.

```markdown
# [PROJECT NAME] - Decisions

### YYYY-MM-DD - [Decision in one line]
- Why: [the constraint or evidence that forced it]
- Rejected: [the alternatives and the one reason each lost]
- Breaks if reversed: [what fails, concretely]
```

- Append; never rewrite history. A superseded decision keeps its entry and gains a line
  `- Superseded by: YYYY-MM-DD - [title]`; the replacement is a new entry.
- "Breaks if reversed" is the line that earns the entry its place. Without it, drop the entry.
- Over 8 KB: split by area (`decisions/<area>.md`) and keep `decisions.md` as an index of active
  decisions, one line each, linking to the area file.

---

## `context/design/` - index 8 KB, each leaf 8 KB

Single-file form (`context/design-context.md`) only while everything fits in 8 KB. Otherwise split by
what a UI task touches: `index.md` (brand, styling rules, token names), `tokens.md`,
`components.md`, `surfaces/<area>.md`, each with its own map row.

```markdown
# [PROJECT NAME] - Design

## Brand Identity

[2-3 sentences: visual tone, target feeling]

## Styling Rules

[Ordered list, most important first]

## Tokens

[Name -> value -> usage, by role - overrides of framework defaults only]

## Components

[Component -> how to use it correctly]
```

**Exclude:** any value matching the framework default - document overrides only. A new surface gets a
new `surfaces/<area>.md` leaf, never another section in the index.

---

## `context/domain-context.md` - budget 8 KB

```markdown
# [PROJECT NAME] - Domain Context

## Glossary

| Term | Meaning in this codebase |
|---|---|

## Core Business Rules

[Business rules, not technical rules]

## Key Entities

[The 5-10 most important domain objects and how they relate]

## What Agents Get Wrong

- [Domain misunderstanding that caused a bug, and the correct reading]
```

**Create only when** the domain has significant terminology (billing, medical, legal, finance,
logistics) or when incorrect domain understanding has caused real bugs.
