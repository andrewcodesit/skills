---
name: update-context
description: Update context/ files when new information is discovered - from user instructions, code review findings, or codebase drift. Makes targeted, minimal edits to the right file(s) rather than rewriting. Use when the user says "update context", "remember this for the future", "add this to context", or when an agent discovers something that contradicts or extends a context file. Also use proactively after any significant code change that makes existing context stale.
---

# Update Context Files

Make targeted, minimal updates to a project's agent context - root and nested `AGENTS.md`, the
`context/` leaves, and the decision log - when new information surfaces. Never rewrite a file; find
the right section and edit only what changed. The layout this skill maintains is the one
`setup-context` creates: root `AGENTS.md` with rules and a Context Map, nested `AGENTS.md` per
directory with a `CLAUDE.md` shim beside each, and `context/` leaves loaded from the map.

**Announce at start:** "Updating context files."

## Step 1 - Identify the source

| Source | What it looks like |
|---|---|
| **User instruction** | "Remember that...", "We decided to use X", "Update context with..." |
| **Correction** | "That's wrong, it's actually...", or a user edit that contradicts context |
| **Code drift** | The code diverges from what context says |
| **Agent failure** | An agent made a mistake because context was missing or wrong |
| **Proactive discovery** | A feature introduced a pattern or decision context doesn't capture |

For drift, read the actual code first. Trust the code over the context when they conflict - unless
the user says otherwise.

## Step 2 - Route each piece of information

Ask first **what kind of knowledge it is**, and route it by kind before picking a file:

| Kind | Destination |
|---|---|
| A rule that applies only inside one directory | That directory's `AGENTS.md` (create it with a `CLAUDE.md` shim if absent) |
| A repeatable procedure (steps someone runs) | A skill, not context. Propose the skill to the user; do not write it into `context/` |
| A trap an agent fell into | One line under "What Agents Get Wrong" in the leaf for that area (usually `code-standards.md`), naming the right alternative |
| A durable decision | A new dated entry in the decision log |
| A repo-wide rule every session needs | Root `AGENTS.md` - only if it stays within budget |
| Anything else | The leaf table below |

Leaf table. Roles, not paths: check the Context Map for the project's actual layout (single file or
directory) before writing.

| Information type | Target |
|---|---|
| Tech stack, external service, key flow, non-obvious command | project overview |
| Repo-wide coding pattern, naming, file placement | code standards |
| Security rule or new attack surface | code standards, or the directory's `AGENTS.md` if local |
| Service boundary or data flow change | architecture index |
| Non-obvious constraint discovered in code | architecture constraints |
| Subsystem internals changed | that subsystem's leaf |
| Brand, token, component usage, styling rule | design leaf for that area |
| Domain term, business rule, key entity | domain context |
| New leaf added | a Context Map row in root `AGENTS.md` |

Information that spans several destinations updates each of them. Information that fits none is
surfaced to the user with a proposed destination.

## Step 3 - Read the target sections

Read the section you will edit, not the whole tree. Never edit blind. If a file the routing needs does
not exist, say so and propose creating it (per `setup-context`); do not create it unasked.

## Step 4 - Check the budget, then propose

```bash
wc -c <each target file>
```

Budgets: root `AGENTS.md` <= ~4 KB, nested `AGENTS.md` <= ~2 KB, the "always" leaf <= ~4 KB, every
other leaf and decision log file <= ~8 KB. When an edit would push a file over its budget, propose a
split instead of appending: which sections move to which new leaf or directory `AGENTS.md`, and the
Context Map rows that change.

Draft the proposed edits - which file, what is added, changed or removed, and why - in the Step 6
report format, and wait for approval before writing. Skip the wait only when the user's own
instruction in the current turn already is the approval ("update context to say X").

## Step 5 - Make targeted edits

- **Minimal diff** - change only what needs to change. Don't reformat or reorder other sections.
- **No information loss** - keep surrounding context that is still accurate.
- **Contradictions** - remove the old fact and add the new one. Never leave both.
- **Stale removals** - delete replaced technologies, patterns, or rules outright. No "deprecated"
  notes, except superseded decisions (below).
- **Specific traps** - Bad: "Don't forget X." Good: "Agents query `price_observations` for current
  prices - use the `current_prices` view instead."

Decision log entries use this shape, appended at the end of the file:

```markdown
### YYYY-MM-DD - [Decision in one line]
- Why: [the constraint or evidence that forced it]
- Rejected: [the alternatives and the one reason each lost]
- Breaks if reversed: [what fails, concretely]
```

A reversed decision keeps its entry and gains `- Superseded by: YYYY-MM-DD - [title]`; the new
decision is its own entry. Never write decisions as table rows.

## Step 6 - Verify and report

- [ ] No fact stated in two places, and no old version of a changed fact left anywhere
- [ ] Every edited file is within budget (`wc -c`)
- [ ] The Context Map lists every leaf, and every new `AGENTS.md` has a `CLAUDE.md` shim beside it
- [ ] The edit would not confuse a new developer reading the file cold

```
Updated context:

- `server/AGENTS.md` - added: queue handlers must be idempotent on message id
- `context/code-standards.md` -> What Agents Get Wrong - added: query the `current_prices` view
- `context/architecture/decisions.md` - added 2026-10-03 entry: D1 over Postgres
```

Surface anything unrouted or unconfirmed:

```
Not updated (needs decision):
- "Use Drizzle instead of the raw client" - changes code standards and architecture. Confirmed?
```

## When NOT to update context

- **Ephemeral state** - current tasks, in-progress work, who's on what. That belongs in task tracking.
- **Git history** - context holds durable facts, not changelogs.
- **Derivable from code** - if an agent can read it from the code in under 30 seconds, skip it.
- **Obvious best practice** - "write tests", "use meaningful names".

## Proactive use

Enter this skill without being asked when:

1. An agent made a mistake that missing or wrong context caused - route it as a trap or a rule
2. A user corrected an agent's assumption
3. A feature introduced a non-obvious pattern or decision not in context
4. A spec or `AGENTS.md` changed with decisions the leaves don't yet reflect

Proactive entry means noticing the gap and drafting the proposal; Step 4's approval still applies
before anything is written.
