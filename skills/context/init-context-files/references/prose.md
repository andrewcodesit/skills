# PROSE, applied to context files

Five architectural constraints from the [PROSE framework](https://danielmeppiel.github.io/awesome-ai-native)
(Daniel Meppiel, *The Agentic SDLC Handbook*). This file translates each one into a concrete rule
for designing a `context/` tree.

## P - Progressive Disclosure

> *"Context arrives just-in-time, not just-in-case."*

**Rule for context files:** no leaf file over ~8KB (~2k tokens). A topic that outgrows that becomes
a directory with a thin `index.md` and linked leaves. The index carries the map and the parts every
task needs; the leaves carry detail a specific task needs.

**Why it matters in money terms:** a context file is not read once. It sits in the context window
and is re-read on every subsequent turn of the session. A 33KB file loaded on turn 3 of a 400-turn
session is paid for ~397 times. Splitting it so a task loads 4KB instead of 33KB is an 8x reduction
on that line item, for the whole session.

**Violation:** one `architecture-context.md` holding boundaries, data flow, four subsystem deep-dives,
a decision log, and a constraints list - where a UI task loads the ingestion internals it will never use.

## R - Reduced Scope

> *"Match task size to context capacity."*

**Rule for context files:** each file serves one task type. The Context Map's "Working on" column is
the unit of scope - if a row would send an agent to three files, the files are cut wrong.

**Violation:** a Context Map row reading "Architecture, API, database, or ingestion" - four task
types collapsed onto one 33KB file.

## O - Orchestrated Composition

> *"Simple things compose; complex things collapse."*

**Rule for context files:** small files that link to each other, never one monolith. Cross-reference
with relative markdown links so an agent can follow a thread on demand instead of being handed
everything up front.

## S - Safety Boundaries

> *"Autonomy within guardrails."*

**Rule for context files:** approval gates belong in `AGENTS.md`, stated explicitly - which
operations an agent must never perform unprompted (migrations, deploys, dependency bumps, secret
edits). Pair this with a permission allowlist in `.claude/settings.local.json` so the safe commands
run without prompting and the unsafe ones stop.

## E - Explicit Hierarchy

> *"Specificity increases as scope narrows."*

**Rule for context files:** root `AGENTS.md` holds project-wide principles. Nested `AGENTS.md` files
in major subtrees (`server/`, `src/`, `packages/*`) hold rules specific to that subtree and point at
the context leaves relevant there. Claude Code loads a nested `AGENTS.md` when work touches that
directory - this is the cheapest just-in-time mechanism available, because the harness does the
scoping for free.

**Violation:** flat instructions with no inheritance; the same rules loaded for frontend and backend.

## Grounding principles

1. **Context is finite and fragile** - attention degrades with length. Treat context as scarce.
2. **Context must be explicit** - tacit knowledge is invisible. Externalize it.
3. **Output is probabilistic** - reliability is architected, not assumed.

## The one addition worth making

PROSE names a `.memory.md` primitive: decisions and learnings that persist across sessions, updated
after significant decisions and consulted before similar work. Most `context/` trees have no
equivalent, so agents re-derive rationale that was settled months ago - or worse, quietly reverse it.
A `decisions.md` (decision / why it exists / consequence) is the highest-value file most projects
are missing.
