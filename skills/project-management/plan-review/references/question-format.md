# Question Format

Canonical format for every question a skill asks the user. Follow it exactly.

An option list without comparative reasoning is useless: the user cannot tell why the
recommendation beats the alternatives, so they cannot disagree with it meaningfully. The reasoning
is the product.

## Rules

- One question per message. Wait for the answer before asking the next one.
- Reassess after every answer — an answer often removes or reshapes later questions.
- Ask only about real unknowns. If codebase inspection settles it, say so and skip.
- 2–4 options. More than that is usually two questions. Resolution Gates are the exception.
- The recommended option is always `A.`, marked `A. (Recommended)` immediately after the letter.
- Every option carries a short reason covering quality, maintainability, reliability, security, and
  operational consequences. Development cost, time, effort, and difficulty are never criteria.
- `Why A wins:` names why the runners-up *lose*, specifically.
- `If wrong:` names the cost of reversing the decision later.
- Close with `Reply with the letter.`

## Template

```
Q<n> of <m> — <the question>
<one sentence: what is unknown, and why it matters here>

A. (Recommended) <option label>
   <short reason — quality and operational consequences>
B. <option label>
   <short reason>
C. <option label>
   <short reason>

Why A wins: <why B and C lose, specifically>
If wrong: <cost of reversing this later>

Reply with the letter.
```

`<m>` is an estimate. Adjust it as unknowns resolve.

## Example

```
Q2 of 4 — How should attribute schemas be stored?
Unknown: whether admins need to change schemas without a deploy.

A. (Recommended) DB table per category
   Admins edit schemas at runtime; enables faceted filtering later. Requires one migration.
B. Hardcoded map in the API
   Every schema change needs a redeploy.
C. JSON blob on the category row
   Avoids a new table; querying individual attributes gets painful.

Why A wins: the spec already lists admin-managed categories, which rules out B outright, and C
requires the same migration while losing queryability.
If wrong: switching A→B removes runtime schema management; C→A requires a data migration.

Reply with the letter.
```

## Resolution Gates

When a skill has findings and needs to know how to act on them, it offers a resolution gate: the
same format, with one carve-out — a gate may exceed 4 options when each extra option is a genuinely
distinct disposition. Show only the dispositions that apply to this run.

Standard dispositions:

1. Grill one-by-one on the ambiguous findings only, auto-apply the rest
2. Grill on every finding
3. Hand the selected findings to the planning skill as its input spec, then execute that plan
4. Apply best judgment on everything, then summarize
5. Do nothing — leave the report as-is

Compute the recommendation from the findings:

- Architecture-level findings, findings crossing 3+ files, or decompositions → recommend **3**.
  These are multi-file and sequenced; patching them inline turns a review into an unreviewed refactor.
- Otherwise → recommend **1**. Most findings have one sensible fix, and asking about those buries
  the few that need a real decision.

Option 3 passes the findings file path to the planning skill as its spec, and the resulting plan
records that path as its `**Source:**`. The execution skill takes a plan file, never a findings file.

## Recording Answers

Append every answered question to a `## Decisions` section in the artifact the skill produces — the
plan file, the review file. One line each: the question, the option chosen, and the user's own
reason if they gave one. Chat-only is lost at context summarization, which is exactly when the next
agent starts re-asking what the user already answered.

When questions span two artifacts, partition by origin and never duplicate: gate answers and
per-finding decisions go to the **review** file; approach decisions go to the **plan** file.
