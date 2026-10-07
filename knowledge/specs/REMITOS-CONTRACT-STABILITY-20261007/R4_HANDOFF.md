# R4 handoff

## Done
- Request typing/decimal/error boundary corrected, independently re-reviewed and ownership released in the approved finite DEV scope. Not complete Remitos acceptance.
## Changed
- Client PATCH now partial, allows nullable surgery and keeps origin immutable. Existing Zod readonly catalog unions remain literal.
- Shared Remito decimal validation trims strings, rejects invalid lexical/sign/scale/range/nonzero-underflow forms and preserves supported exact base-10/scientific values.
- Emission malformed JSON maps400/invalid_json_body; optional empty body remains valid. DevolucionError inherits existing ApiError, preserving domain statuses/codes while unknown failures stay generic500.
## Files
- `src/lib/api/remitos.ts` — PATCH type only.
- `src/lib/validators/remito.ts` — shared Decimal boundary and enum casts removed.
- `src/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route.ts` — malformed JSON mapping only.
- `src/lib/services/devolucion.service.ts` — ApiError class/import only; quantities/transactions unchanged.
- `src/__tests__/unit/remito-request-validation.test.ts`, `remito-request-errors.test.ts`, `remito-request-transport.test.ts`; `src/__tests__/types/remito-request-contracts.ts` — schema/routes/authenticated-client/compile-time checks.
- R4 brief/config/validation/worklog/lock; audit R4 status.
## Validations
-27 failed/32 passed initial59 runtime checks;11 scoped typing diagnostics → fixes →126/126 first related tests and tsc green.
- Supplemental2 underflow failures reproduced → minimal guard and positive/negative/exact-zero regressions → final372/372 across24 files PASS.
- Expanded R4 scoped TypeScript (including consumers) and tracked diff check PASS. Independent first review found underflow; final re-review independently72/72 tests plus scoped typing PASS, no remaining scoped blocker. Replays in `R4_VALIDATION.md`.
## Risks
- No live DB/server/browser or whole-app type/build acceptance. No schema/Auth/roles/stock/state/return transaction change, dependencies, commit/push/deploy.
- API boundary validation only; direct internal service callers/canonical Devolucion numeric validation and floating return preflight sums remain separate R7 work. JavaScript numbers may lose precision before validation; use strings for exact values.
- Existing separate ComprobantesPrint multi-suite intermittency and R5–R9 remain outside scope; print/PDF regression preserved.
## Next
- R5 state authority/concurrency with competing-transition reproduction and existing domain authority, not invented compensating stock rules.
