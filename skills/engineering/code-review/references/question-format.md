# Question Format

Canonical format for every question a skill asks the user. Follow it exactly.

An option list without comparative reasoning is useless: the user cannot tell why the
recommendation beats the alternatives, so they cannot disagree with it meaningfully. The reasoning
is the product.

## Rules

- One question per message. Wait for the answer before asking the next one.
- Reassess after every answer - an answer often removes or reshapes later questions.
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
Q<n> of <m> - <the question>
<one sentence: what is unknown, and why it matters here>

A. (Recommended) <option label>
   <short reason - quality and operational consequences>
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
Q2 of 4 - How should attribute schemas be stored?
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

When a skill has findings and needs to know how to act on them, it offers a resolution gate. Same
format as above, with three carve-outs:

- A gate may exceed 4 options, because each disposition is genuinely distinct.
- `If wrong:` is omitted. A gate is cheap to reverse - the report stays on disk and can be re-offered.
  `Why A wins:` is still required.
- The numbering line is `Q1 of 1` unless the gate genuinely sits inside a longer question sequence.

### Dispositions

These are the only dispositions. Copy the labels verbatim - they are user-facing text, not shorthand
to paraphrase. Show only the ones that apply to this run, and keep them in this relative order after
the recommended one has been promoted to `A.`:

| Disposition | Verbatim label | Drop it when |
|---|---|---|
| grill-ambiguous | `Grill me on the ambiguous findings only, auto-apply the rest` | every finding is ambiguous, or none is |
| grill-all | `Grill me on every finding` | there is only one finding |
| plan | `Hand the findings to the planning skill, then execute that plan` | nothing is architectural or multi-file |
| judgment | `Apply your best judgment on everything, then summarize` | never dropped |
| nothing | `Do nothing - leave the report as-is` | never dropped |

Letters are assigned per run: the recommended disposition is always `A.`, and the remaining ones keep
the table order.

### Computing the recommendation

- Architecture-level findings, findings crossing 3+ files, or decompositions → recommend **plan**.
  These are multi-file and sequenced; patching them inline turns a review into an unreviewed refactor.
- Otherwise → recommend **grill-ambiguous**. Most findings have one sensible fix, and asking about
  those buries the few that need a real decision.

The `plan` disposition passes the findings file path to the planning skill as its spec, and the
resulting plan records that path as its `**Source:**`. The execution skill takes a plan file, never a
findings file.

### Template

```
Q1 of 1 - How should we resolve these <n> findings?
<one sentence: which findings are unambiguous, which are not, and why that shapes the choice>

A. (Recommended) <verbatim label>
   <short reason - what happens to which finding numbers>
B. <verbatim label>
   <short reason>
...

Why A wins: <why each shown runner-up loses, specifically, by finding number>

Reply with the letter.
```

### Example

```
Q1 of 1 - How should we resolve these 7 findings?
Findings 1-4, 6 and 7 each have one obvious fix; finding 5 is a three-file decomposition with real
alternatives.

A. (Recommended) Grill me on the ambiguous findings only, auto-apply the rest
   You decide finding 5; 1-4, 6 and 7 are applied as written and verified.
B. Grill me on every finding
   Full control, at the cost of six questions whose answer is already the report's suggestion.
C. Hand the findings to the planning skill, then execute that plan
   Sequences finding 5 properly, but adds a plan artifact to approve before anything moves.
D. Apply your best judgment on everything, then summarize
   Fastest to a clean tree; commits you to one shape of finding 5 without asking.
E. Do nothing - leave the report as-is
   Nothing in the working tree changes.

Why A wins: B spends five questions on findings with one correct fix; D decides finding 5's
decomposition for you; C is right only when several findings are architectural, and here only 5 is.

Reply with the letter.
```

## Recording Answers

Append every answered question to a `## Decisions` section in the artifact the skill produces - the
plan file, the review file. One line each: the question, the option chosen, and the user's own
reason if they gave one. Chat-only is lost at context summarization, which is exactly when the next
agent starts re-asking what the user already answered.

When questions span two artifacts, partition by origin and never duplicate: gate answers and
per-finding decisions go to the **review** file; approach decisions go to the **plan** file.
