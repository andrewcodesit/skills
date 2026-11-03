# Model Escalation Standard

Applies to any skill or agent that runs on a cheaper model (for example a skill forked onto Haiku)
and can meet work beyond that model. A fixed rule decides what escalates, not the model's own
confidence: a weaker model tends to attempt a fix it cannot do reliably, so self-assessment is never
the trigger.

## Fix here - the mechanical class

Fix a finding or failure in place only when **every** condition holds:

- It is one of: a lint or formatting error; a typo or wording fix in copy or comments; an unused,
  missing or misordered import; or a type, test or build error whose exact fix the error message
  or the reviewer states (a rename, a missing argument, a wrong literal).
- The fix touches one file and about 15 changed lines or fewer.
- It adds no test, and changes no public signature, schema, migration, route, config, dependency,
  CI file, or anything the plan or project names as a contract.
- The fix passes the same validation on its first attempt.

## Escalate - everything else

- Any finding about behavior, logic, security, data, performance, architecture, or test design.
- A fix that failed validation once: revert it and leave the tree as you found it.
- Any doubt about which side of the line an item falls on.
- Never dismiss or defer a finding yourself. Deciding that a finding does not matter is a judgment,
  so it escalates too.

Stop before any irreversible step an escalated item gates (a merge, marking a task done), and return.

## Return contract

The escalating run ends with the block its skill defines, and that block always carries:

```
STATUS: ESCALATE
ESCALATE:
- <file:line or job> - <finding or failure, one line> - <condition it failed>
FIXED_HERE:
- <file:line> - <what changed> (uncommitted | pushed <sha>)
CONTEXT: <commands, job names, log locations the fixer needs>
NEXT: <the skill's continuation for the main session>
```

## Main session handling

When a forked skill returns `ESCALATE`, the main session handles it without asking the user unless
an item needs a product decision:

1. Decide each item: fix, dismiss with a one-line reason, or defer to a follow-up ticket.
2. Fix by Risk (`plan` skill definitions): `contract` items inline; the rest go to one Implementer
   on `standard` Risk, all items in a single briefing with the exact file fence. A `NEEDS_CONTEXT` or
   `BLOCKED` result steps up one Risk, per the delegation standard.
3. Run the validation the skill names through the Validator.
4. Follow the skill's `NEXT` line - it says what the main session may push and when to re-invoke.

`NEEDS_USER` means the run hit a decision only the user can make: ask the returned questions as
lettered choices, then re-invoke the skill with the answer as its argument.

Stop after two escalation rounds on the same skill run and report the remaining items to the user.

A forked cheap-model skill run counts like the Validator: exempt from the per-task subagent cap, at
most 3 per task run.
