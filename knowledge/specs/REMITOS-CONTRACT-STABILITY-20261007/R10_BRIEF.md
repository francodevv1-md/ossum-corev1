# R10 — close remaining surgery technical-id fallbacks

## Scope
- R10 closes the seven `backendId || surgery.id` / `backendId ?? surgery.id` sites the FRAGILITY_MAP row 6 already flagged and that R9 intentionally left out of scope.
- All seven sites use the new `isTechnicalId` from `src/lib/api/ids.ts`. When the technical id is missing they either short-circuit to an honest empty state, or use the local store id for **labels only** (e.g. mailContextKey) but never as a query key.
- Out of scope: `src/lib/api/surgery-adapter.ts`, `src/lib/api/backend-surgeries.ts`, `src/lib/validators/surgery.validator.ts` (other agent's SURGERY-IN-TRANSIT-CANONICAL chain); no schema/Auth/roles/Cajas/returns/stock writers/dependencies/DB/browser; no `useRemitos` changes.

## Diagnosis
- Each site reuses the wrong fallback pattern. When `backendId` is missing they send a non-persisted id to a query or compose a URL with it. Result: silent empty lists, wrong URLs, mail dedupe keys that collide between cases.
- The R9 pattern is canonical: `const surgeryId = isTechnicalId(surgery.backendId) ? surgery.backendId : null` for query keys, with `""` for `useSeguimientoFeed` because it already short-circuits on falsy.

## Tasks
1. Reproduce each site on a surgery without `backendId` and prove it now uses the technical id or short-circuits to honest empty state.
2. Apply the R9 guard. Do not change behaviour when the technical id is present.
3. Extend `src/__tests__/unit/surgery-id-guard.test.ts` with the seven call sites mocked and asserted.
4. Run focused + R1–R9 regression, scoped typing, owned whitespace, independent review.
5. Commit locally (no push, no PR). Release the lock only after the independent critical review passes.

## Allow / Stop
- Allowed: read-only Git/code/docs, offline Vitest/scoped tsc/whitespace, directed read-only review, the seven source files above, the new tests, R10 docs.
- Stop: any other file in `src/components/coordinadores/`, `src/components/cirugias/`, `src/components/mail/`, `src/components/facturacion/`, `src/components/expediente/`, `src/hooks/useCirugiaActions.ts` outside the listed lines; any live data; any foreign lock.
