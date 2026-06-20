---
name: verify-ui
description: >
  Verify local UI changes in a running app by starting the correct dev server if needed, opening
  the target page in the in-app browser, exercising the relevant flow, checking layout and visual
  behavior, and inspecting console and network errors. Use when the user asks to verify frontend
  changes, check a local page or browser flow, review a UI implementation, test whether a visual
  change works, or confirm that a local feature behaves correctly end to end.
---

# Verify UI

Use this skill to validate a UI implementation in the browser and return a solid findings report.
Do not stop at "it renders" or "no obvious issues." Verify the actual user flow and inspect the
browser signals that reveal broken implementations.

## Core Standard

Treat this as implementation verification, not a casual visual glance.

The job is to:
- run or connect to the correct local app
- open the relevant page in the in-app browser
- exercise the real flow a user would take
- inspect visible layout and interaction behavior
- check console errors and failed network activity
- report concrete findings, coverage, and gaps

## Browser Dependency

Use the best available browser control surface for local verification.

If the in-app Browser plugin and its browser-control skill are available, use them first for local
UI verification. If they are not available, use another browser automation surface that can open
the local app, exercise the flow, and inspect visible state. If no browser surface is available,
report that verification is blocked instead of pretending the UI was checked.

## Workflow

### 1. Establish the target

Identify:
- which app to run
- which route or flow to verify
- whether the user wants a broad smoke check or a specific scenario

If the request is vague, infer the most relevant target from the changed files, app structure, and
repo context before asking questions.

### 2. Start or connect to the dev server

Find the correct local run command from the repository instead of guessing.

Prefer:
- documented project commands
- `package.json` scripts
- app-specific README or context docs

Before starting a new server, check whether the relevant app is already running. Reuse an existing
healthy server instead of spawning duplicates.

When you start a server:
- launch it in the background
- capture the local URL and port
- wait until the app is actually reachable before opening the browser

If the server fails to start, report the failure clearly and include the blocking error.

### 3. Open the app and understand the current state

Open the target URL in the in-app browser.

Before interacting:
- confirm the page loaded
- inspect the visible state
- note obvious rendering failures, hydration errors, blank states, broken styling, or auth gates

Do not click randomly. Form a short hypothesis about the intended flow first.

### 4. Exercise the flow

Walk the actual user path relevant to the change.

Examples:
- open a modal and verify its content, focus behavior, and close actions
- submit a form and verify validation, loading, success, and failure states
- navigate between pages and verify preserved state, routing, and data refresh
- test responsive behavior when the layout change is part of the task

Do not stop at the happy path when the implementation clearly has meaningful edge states.

### 5. Inspect browser signals

During and after the flow, inspect:
- console errors and warnings that indicate broken behavior
- failed or suspicious network requests
- visible loading states that never resolve
- layout breakage, overflow, clipping, overlap, alignment issues, or missing assets
- interaction regressions such as dead buttons, double submits, focus traps, or stale UI

Treat console or network issues as real findings unless they are clearly unrelated noise.

### 6. Re-verify after code changes

If code changed during the task, reload the app and verify the affected flow again. Do not assume
hot reload produced the final state correctly.

## What Good Verification Looks Like

A strong verification pass answers:
- what was verified
- how it was verified
- what failed
- how to reproduce each issue
- how severe the issue is
- what was not covered

Good verification is specific. "Looks good" is not verification.

## Findings Bar

Flag issues such as:
- console exceptions or repeated warnings tied to the change
- failed API requests, bad payload handling, or incorrect loading/error states
- broken navigation, stale data, or state loss across the flow
- layout regressions on the affected viewport
- mismatches between the intended UX and the implemented behavior
- UI that technically renders but is visibly incomplete, misleading, or hard to use

Also call out partial verification when:
- the flow is blocked by missing credentials, feature flags, seed data, or backend failures
- the app starts but the requested route cannot be reached
- verification was limited to one viewport or one branch of the flow

## Output Format

Report findings like a review, not a stream of browser notes.

Use this structure:

### Verdict
- `Pass`
- `Pass with issues`
- `Blocked`
- `Fail`

### Verified
- the route, flow, or behavior checked
- the environment used, including local URL when relevant
- the major user actions performed

### Findings
- severity
- `file:line` when the cause is already clear from local code or logs
- exact symptom
- reproduction steps
- likely cause when reasonably supported

### Not Covered
- any flows, viewports, states, or dependencies that were not verified

### Evidence
- relevant console errors
- failed requests
- screenshots only when useful

Prefer a few high-signal findings over a noisy diary of every click.

## Review Discipline

- Do not confuse "no crash" with "correct implementation"
- Do not ignore console or network errors just because the UI still rendered
- Do not declare success without naming what was actually exercised
- Do not over-report harmless noise when it is clearly unrelated to the changed flow
- Do not stop after one success path if the feature obviously has important failure or empty states
