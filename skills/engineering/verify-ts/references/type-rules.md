# TypeScript Audit Rules

Apply these rules when running the `verify-ts` skill.

1. **No unjustified `any`** - use typed alternatives, `unknown` with narrowing, or documented utility escape hatches only.
2. **Use `unknown` at boundaries** - parsed JSON, API responses, events, storage, catch blocks, and external payloads must be narrowed before use.
3. **Avoid unsafe casts** - `as T` is an assertion, not proof. Prefer guards, schemas, and `satisfies`.
4. **Eliminate non-null assertions** - replace `!` with explicit checks or types that prove presence.
5. **Use discriminated unions for state** - avoid optional-field shapes that encode illegal combinations.
6. **Require exhaustiveness** - union switches and if-chains need `never` checks.
7. **Avoid TypeScript `enum`** - use string-literal unions or `as const` objects.
8. **Brand important primitives** - IDs, amounts, percentages, slugs, URLs, and validated strings should not be plain `string` where swaps are risky.
9. **Default data to readonly** - use readonly arrays/properties for parameters, return values, store state, and data objects.
10. **Use precise function signatures** - no `Function`, no implicit `any`, return types on exported functions.
11. **Prefer `satisfies` for shape checks** - keep literal inference while checking conformance.
12. **Centralize type guards** - repeated shape checks should become typed predicates.
13. **Validate external boundaries at runtime** - use schema libraries or predicates where TypeScript types are erased.
14. **Avoid boxed primitive types** - do not use `Object`, `String`, `Number`, `Boolean`, or `Symbol`.
15. **Constrain generics** - express constraints in signatures instead of casting inside the function.
16. **Use type-only imports** - use `import type` when imports are erased at runtime.

Severity guide:
- Blocker: runtime bug risk or clear type-safety hole.
- Strict: rule violation with no justification.
- Improve: safe but weaker than idiomatic TypeScript.
- Style: minor import or widening issue.
