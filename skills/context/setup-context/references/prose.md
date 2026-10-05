# PROSE, applied to context files

Five architectural constraints from the [PROSE framework](https://danielmeppiel.github.io/awesome-ai-native)
(Daniel Meppiel, *The Agentic SDLC Handbook*), each translated into a concrete rule for designing a
project's agent context. Only these five are used; the handbook's wider taxonomy is not.

## P - Progressive Disclosure

> *"Context arrives just-in-time, not just-in-case."*

**Rule:** root `AGENTS.md` <= ~4 KB, nested `AGENTS.md` <= ~2 KB, each `context/` leaf <= ~8 KB
(~2k tokens). A topic that outgrows its budget becomes a directory with a thin `index.md` and linked
leaves. The index carries the map and what every task in that area needs; the leaves carry detail a
specific task needs.

**Why it matters in money terms:** a context file is not read once. It sits in the context window
and is re-read on every subsequent turn. A 33 KB file loaded on turn 3 of a 400-turn session is paid
for ~397 times. Splitting it so a task loads 4 KB instead is an 8x reduction on that line item, for
the whole session.

**Violation:** one architecture file holding boundaries, data flow, four subsystem deep-dives, a
decision log, and a constraints list - where a UI task loads the ingestion internals it will never use.

## R - Reduced Scope

> *"Match task size to context capacity."*

**Rule:** each file serves one task type. The Context Map's "Working on" column is the unit of
scope - if a row would send an agent to three files, the files are cut wrong.

**Violation:** a Context Map row reading "Architecture, API, database, or ingestion" - four task
types collapsed onto one 33 KB file.

## O - Orchestrated Composition

> *"Simple things compose; complex things collapse."*

**Rule:** small files that link to each other with relative markdown links, never one monolith, so
an agent follows a thread on demand instead of being handed everything up front. Links, not
imports: an import expands eagerly and defeats the split.

## S - Safety Boundaries

> *"Autonomy within guardrails."*

**Rule:** approval gates belong in the root `AGENTS.md`, stated explicitly - which operations an agent
must never perform unprompted (migrations, deploys, dependency bumps, secret edits). Pair them with
the harness's permission allowlist so safe commands run without prompting and unsafe ones stop.

## E - Explicit Hierarchy

> *"Specificity increases as scope narrows."*

**Rule:** root `AGENTS.md` holds repo-wide rules. A nested `AGENTS.md` in a directory (`server/`,
`src/`, `packages/*`) holds rules specific to that directory and points at the leaves relevant there.

**Loading:** harnesses that read `AGENTS.md` natively discover nested ones when work touches the
directory. Claude Code reads `CLAUDE.md` instead, so a `CLAUDE.md` shim containing `@AGENTS.md` sits
beside every `AGENTS.md`; a nested shim loads when work touches its directory. Without the shim, a
nested `AGENTS.md` is invisible to Claude Code.

**Violation:** flat instructions with no inheritance; the same rules loaded for frontend and backend.

## How each layer loads

| Layer | Mode | Trigger |
| --- | --- | --- |
| Root `AGENTS.md` (+ shim) | Eager | Every session |
| Nested `AGENTS.md` (+ shim) | Lazy, deterministic | Work touches the directory |
| `context/` leaf | Lazy, agent-driven | A Context Map row matches the task |
| Skill | Lazy, probabilistic | The task matches the skill's description |

Put content in the most deterministic layer that does not make every session pay for it: directory
rules in nested `AGENTS.md`, task knowledge in leaves, procedures in skills.

## Grounding principles

1. **Context is finite and fragile** - attention degrades with length. Treat context as scarce.
2. **Context must be explicit** - tacit knowledge is invisible. Externalize it.
3. **Output is probabilistic** - reliability is architected, not assumed.

## The decision log

Decisions and learnings that persist across sessions, updated after significant decisions and
consulted before similar work. Most `context/` trees have none, so agents re-derive rationale that was
settled months ago - or quietly reverse it. A dated decision log (why / rejected / breaks if reversed)
is the highest-value file most projects are missing.
