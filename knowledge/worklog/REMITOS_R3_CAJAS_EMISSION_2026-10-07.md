# Remitos R3 — Cajas emission boundary

## Done
- Reproduced31 existing failures, repaired shared preflight/context/exact-retry behavior in the approved finite DEV scope.
## Changed
- One authoritative linkage resolver, symmetric lot/serial compatibility, duplicate-line rejection; observed command cache and context invalidation in both callers. Corrected actual wire trace DTO/fixture mismatch and Workspace auth-only-loss/immediate reload gaps identified by independent review after three new failures reproduced. No backend/domain/stock changes.
## Files
- `src/lib/cajas-intent.ts`; type-only canonical trace fields in `src/lib/api/cajas-assignments.ts`; Workspace and Logistics callers; two HTTP suites; new resolver/wire unit suites; one incumbent Workspace argument assertion; R3 brief/validation/config/lock.
## Validations
-276/276 focused tests across19 files PASS; isolated printing22/22 PASS; R3 scoped tsc PASS; tracked scoped diff check PASS. Independent re-review PASS with105/105 independently rerun checks plus scoped tsc; three blockers resolved. Ownership released.
## Risks
- Browser/viewport/DB/global build NOT RUN; existing wider typing and intermittent separate printing-suite failures unresolved. In-view retries only; no guarantee of rollback after POST. R4–R9 remain.
## Next
- Next bounded work unit R4 request typing/validation/errors. No commit or push authorization inferred.
