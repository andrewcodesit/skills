---
name: setup-context
description: Use when the user asks to set up, create, or initialize context files for a project - triggered by phrases like "create context files", "set up context", "init context docs", "add context to this project", or "help agents understand this project".
---

# setup-context

## Overview

Gives agents persistent, deep knowledge of a project without re-deriving it each session, structured
so a given task loads only the slice it needs. The result works the same under every harness:

| Layer | What it holds | Loaded |
| --- | --- | --- |
| Root `AGENTS.md` | Repo-wide rules, Approval Gates, the Context Map | Every session |
| Nested `<dir>/AGENTS.md` | Rules that apply only inside that directory | When work touches the directory |
| `CLAUDE.md` beside every `AGENTS.md` | The two-line shim below | Makes Claude Code load the `AGENTS.md` next to it |
| `context/**/*.md` leaves | Deep knowledge per task type | On demand, from a Context Map row |

Every repository gets a root `AGENTS.md` that carries its own rules and Context Map - never a
pointer-only file. Global rules stay in the user's global `AGENTS.md`.

The design follows the PROSE constraints; read [references/prose.md](references/prose.md) before
deciding the layout. Templates and the decision log format are in
[references/templates.md](references/templates.md).

**Size budgets.** Context is paid for on every later turn, not once, and attention degrades with
length, so cost and quality point the same way.

| File | Budget |
| --- | --- |
| Root `AGENTS.md` | <= ~4 KB |
| Any file a Context Map row marks "always" | <= ~4 KB |
| Nested `AGENTS.md` | <= ~2 KB |
| Each `context/` leaf | <= ~8 KB |

A file over budget is split, never trimmed into vagueness: a topic becomes a directory with a thin
`index.md` and leaves, and a directory rule moves to that directory's `AGENTS.md`.

## Process

1. Scan
2. Classify
3. Decide the tree shape
4. Fill from code
5. Ask targeted questions
6. Write the leaves
7. Write the root `AGENTS.md`
8. Add nested `AGENTS.md` files
9. Add `CLAUDE.md` shims
10. Check the budgets

### Step 1 - Scan

Read in this order: `package.json` / `Cargo.toml` / `pyproject.toml` -> `README.md` -> top-level
directory structure -> key config files (`vite.config.ts`, `nuxt.config.ts`, `tsconfig.json`,
`wrangler.toml`, `docker-compose.yml`). Never guess - read first. Never open `.env` files.

### Step 2 - Classify

A project can match more than one type.

| Signal | Type |
|--------|------|
| Vue/React/Angular/Svelte | Frontend SPA or SSR app |
| Nuxt / Next / SvelteKit | Full-stack framework app |
| `express` / `fastify` / `hono` / `django` / `rails` | API / backend service |
| Workers / Lambda / edge runtime | Serverless - note the no-persistent-process constraint |
| `package.json` workspaces / `pnpm-workspace.yaml` | Monorepo |
| Figma, Storybook, design tokens | Has UI design system |
| Supabase / Prisma / Drizzle | Has managed DB layer |
| CLI entrypoint (`bin`) | CLI tool |

### Step 3 - Decide the tree shape

Always create:
- `context/project-overview.md`
- `context/code-standards.md` - the "always" file, so it stays <= ~4 KB
- a decision log (`context/architecture/decisions.md`, or `context/decisions.md` for a small repo)

Create if applicable:
- `context/architecture-context.md`, or `context/architecture/` once over budget - multiple
  services, complex data flow, non-obvious boundaries
- `context/design-context.md`, or `context/design/` once over budget - a UI layer with a design
  system, component library, or custom tokens
- `context/domain-context.md` - domain-heavy logic, specific terminology, or a regulated industry

Skip files that would be mostly empty - fewer, denser files beat many thin ones.

Estimate each file's size before writing it. Any file projected over budget becomes a directory:

```
context/architecture/
├── index.md          # boundaries + data flow + map of the leaves
├── decisions.md      # the decision log
├── constraints.md    # non-obvious constraints
└── <subsystem>.md    # one per subsystem with real internal complexity
```

Split by **task type**, not by document section - the test is whether a plausible task reads one
leaf and ignores the rest. A UI task must not load ingestion internals.

Then decide where each rule lives. A rule that applies only inside one directory (`server/`, `src/`,
`packages/*`) goes in that directory's `AGENTS.md`, not in `code-standards.md`. That keeps the
"always" file small and puts the rule where every harness finds it.

The decision log is what most context trees lack: without it, agents re-derive settled rationale or
quietly reverse it.

### Step 4 - Fill from code

Derive as much as possible from reading actual code. Do not ask the user for anything readable.

**Check for staleness as you go.** If the working tree or current branch contradicts what you're
about to write - a file being deleted, a subsystem mid-replacement - do not encode the old fact as
current. Write what is true on the default branch and flag the in-flight change to the user rather
than guessing at the destination.

### Step 5 - Ask targeted questions

Collect everything that cannot be derived from code. Ask all gap questions in a **single** message,
as a plain numbered list.

| Gap | Question to ask |
|-----|-----------------|
| What the product does | "What does [project] do - one sentence for a new teammate?" |
| Who the users are | "Who are the primary users - internal team, consumers, developers?" |
| Non-obvious coding rules | "Any conventions or anti-patterns not visible in the code?" |
| Design intent | "What adjectives describe the visual brand?" |
| Architectural decisions | "Any non-obvious architectural decisions or constraints?" |
| Approval gates | "Which operations should an agent never run without asking? (migrations, deploys, dependency bumps)" |
| Things agents get wrong | "What do new developers or agents typically misunderstand here?" |

Only ask what's relevant to the files you're creating.

### Step 6 - Write the leaves

Use [references/templates.md](references/templates.md). Leaves link to each other with relative
markdown links; no leaf is imported into another file.

### Step 7 - Write the root `AGENTS.md`

Repo-wide rules, an **Approval Gates** section, and the **Context Map** - nothing else. Approval Gates
name operations that are hard to reverse or outward-facing (migrations, deploys, dependency bumps,
secret edits).

The Context Map has one row per task type, pointing at the narrowest file that serves it - never a
row listing four task types against one file, and never a row pointing at three files.

```markdown
## Context Map

Read only the rows that match the task, before starting it:

| Working on | Read |
|---|---|
| Any code - **always** | `context/code-standards.md` |
| Architecture, boundaries, data flow | `context/architecture/index.md` |
| Why something is built this way | `context/architecture/decisions.md` |
| Any component or view | `context/design/index.md` |
| Domain logic / business rules | `context/domain-context.md` |
| Project orientation / onboarding | `context/project-overview.md` |

Directory rules live in `server/AGENTS.md` and `src/AGENTS.md`.
```

Leaves stay links in the table. Never import a `context/` leaf into `AGENTS.md` or `CLAUDE.md`:
imports expand eagerly and every session would pay for it.

### Step 8 - Add nested `AGENTS.md` files

For each directory with rules of its own, create a <= ~2 KB `AGENTS.md` holding only that
directory's rules and the context leaves relevant there. Skip directories fully covered by the root
file. Never copy root content into a nested file.

### Step 9 - Add `CLAUDE.md` shims

Next to **every** `AGENTS.md` - root and nested - create a `CLAUDE.md` containing exactly:

```markdown
# CLAUDE.md
@AGENTS.md
```

Claude Code reads `CLAUDE.md`, not `AGENTS.md`; the shim imports the file beside it, and a nested
shim loads when work touches its directory. Replace an existing pointer-style `CLAUDE.md` ("Read
`AGENTS.md` ...") with the shim. A `CLAUDE.md` holding its own rules is a finding: move the rules to
the `AGENTS.md` beside it, then write the shim. Never describe a nested `AGENTS.md` as loading on its
own in a directory that has no shim.

### Step 10 - Check the budgets

```bash
find . -name AGENTS.md -not -path '*/node_modules/*' -not -path './.git/*' -exec wc -c {} +
find context -name '*.md' -exec wc -c {} +
```

Compare each line against the budget table. Report every file over budget with a proposed split
(which sections go to which new leaf or directory `AGENTS.md`, and the Context Map rows that change)
rather than shipping it.

## Quality Bar

A good context tree:
- Could onboard a new developer in 15 minutes
- Contains things NOT derivable from a 5-minute code scan
- Has no generic advice
- Uses tables and bullets, not paragraphs
- **Serves any single task from <= ~10 KB of loaded context**, root `AGENTS.md` included
- Passes the Step 10 budget check
- Has a `CLAUDE.md` shim beside every `AGENTS.md`
- Has a decision log with dated entries that say what breaks if reversed
- Is updated when the project changes significantly (see the `update-context` skill)

A bad context tree:
- Repeats what's obvious from the directory structure
- Has one large file that every task loads in full
- Mixes concerns (design details in code-standards, directory rules in the root file)
- Has stale commands, tech stack, or a superseded auth model
- States decisions without saying what breaks if they're reversed
