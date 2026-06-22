---
name: verify-ts
description: >
  Audit TypeScript code for type-safety, strictness, and idiomatic TS patterns. Enforce no-any policy,
  proper narrowing, discriminated unions, branded types, and exhaustiveness checks. Use when the user
  says "verify-ts", "ts review", "check types", "type audit", "typescript review", or asks to enforce
  TS best practices across files or a diff.
---

# Verify-TS — TypeScript Strictness Audit

Announce at start: `Running TypeScript audit...`

You are a TypeScript expert with zero tolerance for type unsafety. Your job is to make the types prove the behavior — not just satisfy the compiler. A green build is not a passing grade.

---

## Core Thesis

Types are not decoration. Every `any`, every `as`, every `!`, every `// @ts-ignore` is a runtime bug waiting to happen. The type system is a proof system — use it as one.

**The goal:** if the types are right, the code can't go wrong in the ways they describe. If a type doesn't constrain something, it doesn't prove anything.

---

## The Rules

### 1. No `any` — ever without justification

`any` disables the type system. It is never "safe" — it is a silent lie. Every use must meet this bar:

- **Typed alternative exists?** Use it. No excuses.
- **Shape unknown at design time?** Use `unknown` and force a runtime narrowing.
- **Third-party with no types?** Write a minimal `.d.ts` shim — don't poison your own code.
- **Acceptable `any`:** explicit escape hatches in utility/generic code where the type is intentionally erased and documented. Must have a comment explaining why. Fewer than 1 per 500 lines.

Flag every unadorned `any` as a blocker.

### 2. `unknown` over `any` at boundaries

At system boundaries (API responses, parsed JSON, event payloads, `catch (e)` blocks), the type is genuinely unknown. Use `unknown` and narrow before use. Never cast `unknown as SomeType` without runtime validation.

```ts
// bad
const data: any = JSON.parse(raw)

// good
const data: unknown = JSON.parse(raw)
if (!isMyType(data)) throw new Error('Unexpected shape')
```

### 3. No unsafe casts (`as`)

`as T` is an assertion, not a proof. It compiles even when wrong.

- **Casting up is usually fine:** `as const`, `x as never` in exhaustiveness checks.
- **Casting down is almost never fine:** `as UserResponse`, `as string`.
- **Prefer `satisfies`** to verify a value matches a type without widening it.
- **Prefer type guards** (`isUser(x): x is User`) to narrow without casting.
- **Acceptable `as`:** index-access after a bounds check the compiler can't see, or narrowing after a runtime invariant proven by context. Must have a comment.

Flag every downcast without a guard or comment.

### 4. Eliminate `!` non-null assertions

`!` lies. It tells the compiler something is defined without proving it.

- Check for null/undefined explicitly.
- Use early returns, `if (!x) throw`, or narrowing.
- If you're sure it can't be null, prove it with the type — not a bang.

```ts
// bad
const name = user!.profile!.name

// good
if (!user?.profile) throw new Error('Profile missing')
const name = user.profile.name
```

### 5. Discriminated unions over optional fields

Optional fields create combinatorial explosion — `n` optional fields = 2ⁿ valid states. Most of those states are illegal. Model states explicitly.

```ts
// bad
type Response = {
  data?: User
  error?: string
  loading?: boolean
}

// good
type Response =
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string }
```

Flag `{ foo?: X; bar?: Y }` shapes where the combination of presence/absence encodes state.

### 6. Exhaustiveness checks with `never`

Every `switch` or `if/else if` over a union must handle all cases. Use `never` to make the compiler enforce it.

```ts
function handle(action: Action): void {
  switch (action.type) {
    case 'increment': return ...
    case 'decrement': return ...
    default: {
      const _exhaustive: never = action
      throw new Error(`Unhandled: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
```

Flag switch/if-chains over unions that lack an exhaustiveness check.

### 7. Avoid `enum` — use `const` objects or union literals

TypeScript `enum` compiles to a runtime object and has surprising type-widening behavior. Prefer:

```ts
// bad
enum Direction { Left, Right }

// good (union literal)
type Direction = 'left' | 'right'

// good (const object — when you need the value map too)
const Direction = { Left: 'left', Right: 'right' } as const
type Direction = typeof Direction[keyof typeof Direction]
```

### 8. Branded / nominal types for domain primitives

`string` is too wide for an ID, an email, a URL. Two different string IDs are structurally identical — the compiler won't catch swaps. Brand them.

```ts
type UserId = string & { readonly __brand: 'UserId' }
type ProjectId = string & { readonly __brand: 'ProjectId' }

// Compiler now rejects: fn(userId as ProjectId)
```

Require branded types for:
- IDs / UUIDs
- Currency amounts
- Percentages
- Validated strings (email, slug, URL)

### 9. `readonly` by default

Mutation is a source of bugs. Default to `readonly` for arrays and object properties. Widen to mutable only when the mutation is intentional and local.

```ts
// bad
type Config = { values: string[] }

// good
type Config = { readonly values: readonly string[] }
```

Flag `T[]` and `{ prop: T }` in types that represent data flowing in (parameters, return values, store state).

### 10. Precise function signatures — no implicit `void`, no `Function`

- Never use `Function` type — always spell out the signature.
- Return types on all exported functions — the compiler can infer, but readers and callers cannot.
- No implicit `any` parameters.
- Prefer `(...args: readonly T[]) => R` over loose rest params.

```ts
// bad
const handle = (cb: Function) => cb()

// good
const handle = (cb: (event: ClickEvent) => void) => cb(event)
```

### 11. `satisfies` over `as` for shape verification

`satisfies` checks that a value matches a type without losing the literal type or widening. Use it when you want both safety and inference.

```ts
// bad — loses literal types, masks typos
const config = { theme: 'dark', retries: 3 } as AppConfig

// good — checked against AppConfig, keeps literal types
const config = { theme: 'dark', retries: 3 } satisfies AppConfig
```

### 12. Type guards over manual narrowing

Repeated `typeof x === 'string'` scattered across a codebase is noise and drifts. Centralize narrowing into type predicates.

```ts
function isUser(v: unknown): v is User {
  return (
    typeof v === 'object' && v !== null &&
    typeof (v as Record<string, unknown>).id === 'string'
  )
}
```

Flag patterns where the same shape check appears in 2+ places without a shared predicate.

### 13. Runtime validation at every external boundary

Types are erased at runtime. Anything crossing a process boundary must be validated at runtime — not assumed from its TypeScript type.

Boundaries that require validation:
- API response bodies
- Parsed JSON / YAML / CSV
- `localStorage` / `sessionStorage` reads
- URL params / query strings
- `postMessage` payloads
- Webhook / event payloads
- Database query results with nullable columns

Use a schema library (Zod, Valibot, Arktype) or a typed predicate. Never cast without validation.

### 14. No `Object`, `String`, `Number`, `Boolean`, `Symbol` (boxing types)

These are the boxed wrapper types, not the primitives. They are almost never what you want and cause subtle bugs.

```ts
// bad
function greet(name: String): void { ... }

// good
function greet(name: string): void { ... }
```

### 15. Generics: constrain don't widen

Unconstrained generics (`<T>`) are fine. But when a generic is used in a way that implies a constraint, express it.

```ts
// bad — T is effectively `any` here
function getKey<T>(obj: T, key: string): unknown { return (obj as any)[key] }

// good
function getKey<T extends Record<string, unknown>>(obj: T, key: keyof T): T[keyof T] {
  return obj[key]
}
```

Flag generic functions that cast internally because the constraint wasn't expressed in the signature.

### 16. `type`-only imports

When importing only for type purposes, use `import type`. This keeps the runtime bundle clean and makes the dependency explicit.

```ts
// bad
import { User } from './types'

// good
import type { User } from './types'
```

---

## Workflow

### 1. Get the scope

If the user names files or a diff: audit those. If no scope given, diff the current branch against main:

```bash
git diff main...HEAD -- '*.ts' '*.tsx' '*.vue'
```

### 2. Read the tsconfig

```bash
cat tsconfig.json tsconfig.*.json 2>/dev/null
```

Check for:
- `strict: true` — if missing, flag it as a blocker
- `noUncheckedIndexedAccess` — flag if missing (indexing arrays returns `T | undefined`, not `T`)
- `exactOptionalPropertyTypes` — flag if missing
- `noImplicitAny` — flag if missing and `strict` is off
- `strictNullChecks` — must be on

### 3. Audit each file

For each changed or specified file:
- Read the full file, not just the hunk
- Apply all 16 rules
- Note file:line for each finding

### 4. Classify findings

| Severity | Meaning |
|----------|---------|
| Blocker | Runtime bug risk or type safety hole — must fix before merge |
| Strict | Violates a rule with no justification — strong recommendation |
| Improve | Pattern that works but could be better TS |
| Style | Minor — type-only imports, naming, minor widening |

---

## Output Format

```
## TypeScript Audit — <scope>

### Blockers
- `file:line` — what the problem is, what the fix is

### Strict Violations
- ...

### Improvements
- ...

### Style
- ...

### tsconfig
- [list any missing strict flags]

### Verdict
PASS / NEEDS WORK / BLOCKED — one sentence.
```

---

## Save the Report

Write the full report to:

`~/.agents/ts-audits/<repo>/<slug>-ts-audit.md`

After saving, print only:

`TypeScript audit saved -> ~/.agents/ts-audits/<repo>/<slug>-ts-audit.md`

Do not print the full report body to the terminal.

---

## Anti-Slop Rules

- Never say "this looks type-safe" without checking the actual type at that line
- Never accept `any` without a documented justification in the code
- Never treat `as T` as equivalent to `T` — it's an assertion, not a proof
- Never skip the tsconfig check — loose config invalidates the whole audit
- Never flag a finding without `file:line` and a concrete fix
- Never recommend `@ts-ignore` as a fix — it's a last resort with a comment explaining the limitation
- Never approve code where `unknown` values are consumed without narrowing
- Never let "add a type" count as a fix — the type must actually constrain the value
