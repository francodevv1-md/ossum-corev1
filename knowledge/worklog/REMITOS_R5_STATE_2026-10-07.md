# Remitos R5 — state authority/concurrency

## Done
- Bounded R5 implemented and independently reviewed after Franco clarified cancellation must remain viable, not conditional on a separate physical-dispatch step. Ownership released.
## Changed
- Company/state/updatedAt conditional Remito writes in generic state service and Seguimiento delivery; local P2025→409 mapping. Generic return targets require confirmed Devolucion. Cancellation eligibility/catalog unchanged; no automatic stock/accounting compensation.
## Files
- Remito state function, Seguimiento delivery block,24-case barrier suite, incumbent guarded-where test fixture/assertion, R5 docs/config/lock.
## Validations
-21 red/3 green before fix;57/57 focused and scoped TypeScript PASS. Wider441 pass/9 fail of450; failures isolated to unrelated mocked-service Seguimiento route permission/JSON fixtures. Remaining30 suites436/436 PASS.
- Final clean scoped replay436/436 across30 files and final typing/whitespace PASS. Independent reviewer57/57+typing/whitespace PASS; no scoped blockers.
## Risks
- Canonical return opposite-direction races remain R7; not all producers or real PostgreSQL certified. No UI/schema/Auth/DB/browser/dependencies/Git writes; original R2/R4 and foreign work preserved.
## Next
- R6 deletion/actual actor/state race and R7 returns next, no invented stock reversals.
