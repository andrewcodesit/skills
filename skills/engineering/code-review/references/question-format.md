# Question Format

Canonical format for every question a skill asks the user. Read this before asking the first
question, and follow it exactly for every question after that.

The purpose is not politeness. An option list without comparative reasoning is useless — the user
cannot tell why the recommendation beats the alternatives, so they cannot disagree with it
meaningfully. The reasoning is the product.

## Rules

- **One question per message.** Never batch. Wait for the answer before asking the next one.
- **Reassess after every answer.** An answer often removes or reshapes later questions. Stop asking
  when the remaining ambiguity is non-blocking.
- **Ask only about real unknowns.** If codebase inspection already settles it, say so and skip. The
  goal is removing ambiguity, not performing thoroughness.
- **2–4 options.** If a question needs more, it is usually two questions. See Resolution Gates for
  the one exception.
- **The recommended option is always `A.`**, with the marker immediately after the letter:
  `A. (Recommended)`. Never place it at the end of the label.
- **Every option gets a short reason** — what it buys, and what it costs.
- **`Why A wins:` is mandatory** and must name why the runners-up *lose*. "A is good because X" is a
  failure; "B loses because Y, C loses because Z" is the requirement.
- **`If wrong:` is mandatory** — the cost of reversing this decision later, so the user knows when to
  think hard and when to take the default.
- **Close with `Reply with the letter.`**

## Template

```
Q<n> of <m> — <the question>
<one sentence: what is unknown, and why it matters here>

A. (Recommended) <option label>
   <short reason — what it buys, what it costs>
B. <option label>
   <short reason>
C. <option label>
   <short reason>

Why A wins: <why B and C lose, specifically>
If wrong: <cost of reversing this later>

Reply with the letter.
```

`<m>` is an estimate. If it changes as unknowns resolve, adjust it rather than pretending the
original count was right.

## Example

```
Q2 of 4 — How should attribute schemas be stored?
Unknown: whether admins need to change schemas without a deploy.

A. (Recommended) DB table per category
   Admins edit schemas at runtime; enables faceted filtering later. Costs one migration.
B. Hardcoded map in the API
   Simplest possible; every schema change needs a redeploy.
C. JSON blob on the category row
   Avoids a new table; querying individual attributes gets painful.

Why A wins: the spec already lists admin-managed categories, which rules out B outright, and C pays
the same migration cost as A while losing queryability.
If wrong: switching A→B later is cheap; C→A needs a data migration.

Reply with the letter.
```

## Resolution Gates

When a skill has produced findings and needs to know how to act on them, it offers a resolution gate.
The gate follows this same format, with one carve-out: **a gate may exceed 4 options when each extra
option is a genuinely distinct disposition**, and it must **hide options that do not apply** to the
current run.

Standard dispositions:

1. Grill one-by-one on the ambiguous findings only, auto-apply the rest
2. Grill on every finding
3. Hand the selected findings to the planning skill as its input spec, then execute that plan
4. Apply best judgment on everything, then summarize
5. Do nothing — leave the report as-is

Compute the recommendation from the findings, do not hardcode it:

- Any architecture-level finding, any finding crossing 3 or more files, or any decomposition
  → recommend **3**. These are multi-file and sequenced; patching them inline turns a review into an
  unreviewed refactor.
- Otherwise → recommend **1**. Most findings have exactly one sensible fix, and asking about those
  buries the few that need a real decision.

Option 3 passes the findings file path to the planning skill as the spec, and the resulting plan
records that path as its `**Source:**`. Do not feed a findings file to the execution skill directly —
it expects a plan file, in the plan directory, with tasks and contracts.

## Recording Answers

Every answered question is appended to a `## Decisions` section in the artifact the skill produces —
the plan file, the review file. One line each: the question, the option chosen, and the user's own
reason if they gave one.

Chat-only is not enough. It is lost at context summarization, which is exactly when the next agent
needs it and starts re-asking questions the user already answered.

When questions were asked across two artifacts, partition by origin and never duplicate:

- Gate answers and per-finding decisions → the **review** file, the artifact being acted on.
- Approach decisions from planning → the **plan** file.

## Anti-Slop Rules

- Never ask a question whose answer is already in the codebase, the spec, or an earlier answer
- Never write a `Why A wins:` that only praises A without naming why the others lose
- Never present an option you would refuse to implement — cut it instead
- Never pad to three options when the real choice is binary
- Never ask a question with no recommendation; if every option is equally good, it is not a decision
  worth interrupting the user for
- Never batch questions "to save time" — the user's answer to Q1 usually changes Q2
