---
name: tests-audit
description: Audit and right-size an existing project's automated test suite. Use when a user says tests are excessive, noisy, slow, flaky, redundant, agent-generated, or difficult to run; asks to review testing strategy, reduce test bloat, improve test ergonomics, or redesign unit/integration/e2e coverage. Inspects the current project, reports evidence-backed findings, then either offers small scoped fixes directly or invokes $plan for structural test-suite changes.
---

# Tests Audit

Announce at start: `Auditing test suite...`

Audit tests as executable risk controls, not as a line-coverage exercise. Preserve tests that prevent meaningful product, data, security, or integration failures. Challenge tests that merely mirror implementation, language/framework behavior, or a trivial branch without a credible regression risk.

## Delegation

Steps 1-4 read the runner config, CI, helpers, representative tests, and the production code they
protect, then end at a saved audit path. That is a strong delegation candidate whenever a mechanism
exists and the session holds context worth protecting: brief a subagent with the repo rules, the
classification criteria, the report format, and the save path, and take back the path plus the
verdict. In Claude Code, launch the `critic` agent for this (see the Claude Code binding in `references/delegation.md`).

Step 5 stays with the main agent. Choosing the remediation route, seeking approval, and any editing
of tests happen where the user is, after reading the saved audit. Never lower the auditing capability
to save tokens - misjudging which tests protect a real invariant is the expensive failure here.

## Workflow

### 1. Establish the project and rules

- Work from the current repository unless the user names another one.
- Read the root `AGENTS.md`, global agent rules, and every context file applicable to the touched area before inspecting or changing tests.
- Inspect the test runner configuration, package/build scripts, CI configuration, and test helpers before judging individual tests.
- Check the working tree. Preserve unrelated edits and report overlaps before changing a dirty test file.
- Do not run tests that reset, migrate, truncate, or otherwise mutate a database unless the user has explicitly supplied or confirmed the exact disposable target.

### 2. Inventory before judging

Determine:

- test frameworks, commands, CI entry points, and environment prerequisites;
- test files and approximate test count grouped by unit, integration, contract, end-to-end, migration, and live rehearsal tests;
- source-to-test size ratio as a signal only, never a quality metric;
- shared fixtures, mocks, test databases, clocks, network stubs, and setup/teardown behavior;
- default-command behavior: speed, required services, failure clarity, and whether it can run on a fresh developer machine.

Read representative tests from each major category and the production code they protect. Do not infer a test's value from its name or assertion count alone.

### 3. Classify by risk and signal

Use these classifications in the audit.

**Keep - high value**

- Business invariants and irreversible side effects: payments, publishing, approval gates, permissions, data loss, and state transitions.
- Idempotency, concurrency, retry, transaction, migration, and recovery behavior.
- Security, auth, input validation, error classification, and secret handling.
- Provider/API/database boundary contracts, including deliberately recorded platform differences.
- A focused regression test for a previously observed production defect.

**Consolidate or refactor**

- Repeated cases that prove the same rule and can become one parameterized scenario without hiding relevant failures.
- Multiple high-level tests that repeat expensive setup but differ only in input data.
- Tests with arbitrary waits, real-time expiry, ordering races, global state leakage, or fragile snapshots.
- Tests that run at the wrong layer and make routine feedback slow, while a smaller test can prove the same local rule.
- Suites that depend on databases/services by default but do not make that requirement explicit.

**Remove only with proof**

- Tests that assert language, framework, generated-code, or type-checker behavior rather than project behavior.
- Duplicates whose remaining test demonstrably protects the same business rule and negative path at an equal or stronger boundary.
- Assertions coupled to private implementation structure where no observable contract is being protected.

Never recommend deleting a test just because it is short, old, generated-looking, or raises the test count. Never trade away a stateful, negative-path, or external-boundary test merely to improve a ratio.

### 4. Produce an evidence-backed audit

Write the full report outside the repository at:

`~/.agents/test-audits/<repo-name>/YYYY-MM-DD-tests-audit.md`

Include:

```markdown
# Test Suite Audit - <repo>

## Executive Summary
- Test execution model and developer experience
- What coverage is worth preserving
- High-confidence problems and their impact

## Inventory
| Layer | Files / tests | Default command | Dependencies | Assessment |

## Findings
### High value coverage to retain
- `path:line` - protected invariant and why it matters

### Improvements
- `path:line` - problem, evidence, recommended change, and coverage that remains

### No change recommended
- Cases considered but intentionally retained

## Recommended Test Model
- Default feedback command
- Explicit integration/contract/rehearsal commands
- Required environment and CI ownership
- Rules for adding future tests

## Proposed Changes
- Exact files and behavior changes
```

In the user-facing summary, lead with the verdict, then give only the most important evidence and link the audit artifact. Cite findings as `path:line`. Be candid when the test suite is already proportionate.

### 5. Choose the remediation route

Use **direct execution** only when every proposed change is small, isolated, test-only, and does not change test commands, CI behavior, test environment setup, test layers, or coverage policy. Examples: replacing a deterministic duplicate assertion, removing a timing sleep with a local barrier, or fixing a clearly broken fixture. Explain the exact changes and ask for approval before editing.

Use **`$plan`** when the remedy changes the test-command model, CI, database/service setup, test classification/layering, shared fixtures, broad test consolidation/removal, or any production code. Invoke the installed `plan` skill and provide the audit artifact as its source. The resulting plan must preserve the high-value coverage named in the audit and state what behavior proves each removed or consolidated test remains protected.

If no changes are warranted, say so plainly and do not manufacture a plan.

For either route, do not edit or remove tests during the audit itself. Wait for the user's approval after presenting the findings or plan.

## Future-Test Standard

When reviewing or adding tests after an audit, require a one-sentence answer to: "What concrete regression or invariant does this protect?" Add a test only when the answer is specific and consequential.

Prefer one behavior-focused scenario over many implementation-shaped cases. Use the cheapest layer that proves the contract, except where an integration boundary itself is the risk. Make dependency-heavy suites explicit and keep routine local feedback deterministic.

Do not demand coverage targets, test-per-function rules, or a test for every code change.
