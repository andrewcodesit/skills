# Report Format

The saved review is read by a human deciding what to fix. Optimize for scanning first, depth second.
Every finding must be understandable without opening the file, and actionable without asking a
follow-up question.

## Structure

```
---
date: YYYY-MM-DD
repo: <repo>
pr: <url or number, when detectable>
issue: <ticket id, when detectable>
---

# Code Review: <title>

<One or two sentences: what the diff does and the single most important takeaway.>

## Summary

| # | Severity | Location | Finding |
|---|----------|----------|---------|
| 1 | 🔴 | `src/render/renderJob.ts:70` · `downloadClips()` | Downloads unplaced clips, breaking the export contract |
| 2 | 🟡 | `src/render/captionRenderer.ts:169` · `runFfmpeg()` | Duplicate ffmpeg process runner |

## 🔴 Issues
## 📏 Rules & Conventions
## 🟡 Refactor Opportunities
## 🟢 Quick Wins
## 💡 Bigger Picture
```

Keep the section order above. Number findings continuously across sections (1, 2, 3…) so the summary
table and the gate can reference them. Drop the summary table only when there is a single finding.
Omit a section entirely when it is empty rather than filling it with "nothing found" prose - except
when the absence is itself informative (e.g. tests you could not run), which belongs in a closing
`## Notes` section.

## Finding format

Each finding is a `###` heading and follows this shape:

````
### 1. 🔴 Render input includes clips the timeline never places

**Where:** `apps/api/src/lib/render/renderJob.ts:70` - `downloadClips()`
**Also:** `apps/api/src/lib/render/loadRenderInput.ts:63` - `loadRenderInput()`
**Type:** contract break

**Problem.** `loadRenderInput()` validates readiness only for clips referenced by placements, but
loads every project clip into `RenderInput.clips`. `downloadClips()` then iterates all of them, so an
unplaced clip that is still uploading fails an export the UI already allowed.

**Current**
```ts
// renderJob.ts:70
for (const clip of options.input.clips) {
  await downloadToDisk(clip.storagePath)
}
```

**Suggested**
```ts
// renderJob.ts:70 - download only what the timeline actually references
const placedIds = new Set(options.input.placements.map((p) => p.clipId))
for (const clip of options.input.clips.filter((c) => placedIds.has(c.id))) {
  await downloadToDisk(clip.storagePath)
}
```

**Why it matters.** Makes the invariant explicit - burned-in export depends on placed ready clips,
not every asset attached to the project - and removes I/O for large unused files.
````

### Rules for the code blocks

- **Current** is copied verbatim from the file, never paraphrased or reconstructed from memory.
- Keep it to the smallest span that makes the problem visible - typically 3-12 lines. Elide interior
  noise with a `// …` line rather than pasting a whole function.
- Lead each block with a `// <file>:<line>` comment so the snippet stays anchored when copied out.
- **Suggested** must be real, compilable code in the file's language and idiom - not pseudocode, not
  a prose description in a fence. It should be pasteable with at most trivial adjustment.
- When the fix is a deletion, show the deleted code as **Current** and write `**Suggested.** Delete -
  <one line on what absorbs the behavior>` with no second fence.
- When the fix is structural and too large to show whole (a file split, a new module), show the
  representative seam - the new signature, the moved call site - and describe the rest in one
  sentence. Never skip the code entirely because the change is big.
- Use `diff` fences only when a change is genuinely a few interleaved line edits; otherwise two
  separate fences read better.

### Rules for the header lines

- `**Where:**` is always `` `path/to/file.ts:LINE` `` followed by a hyphen and the enclosing
  function, method, component, class, or hook - the name a reader would search for. Use
  `Class.method()` for methods and the component name for a template or `<script setup>` body. If the
  code sits at module top level, write `module scope`.
- Add `**Also:**` lines for every other site the finding touches. A contract break has two sides;
  cite both.
- `**Type:**` is a two-to-four-word tag: `contract break`, `silent correctness`, `wrong layer`,
  `duplication`, `CQS violation`, `file sprawl`, `missing validation`, `repo rule`.

### Rules for the prose

- `**Problem.**` is at most four sentences and explains the failure, not the code. Name the concrete
  scenario that breaks - inputs, state, ordering - rather than asserting a smell.
- `**Why it matters.**` is one or two sentences on the payoff of the suggested shape. Skip it when
  the problem statement already makes it obvious.
- No paragraph anywhere in the report exceeds five sentences. Break it up or cut it.

## Closing line

End the report with `## Approval` - one line, either what blocks approval (referencing finding
numbers) or an explicit statement that the diff clears the bar.
