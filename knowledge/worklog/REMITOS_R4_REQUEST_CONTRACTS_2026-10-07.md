# Remitos R4 — request contracts

## Done
- Reproduced27 runtime failures and11 typing diagnostics; corrected bounded request contracts. Supplemental2-case Decimal exponent underflow red reproduced and fixed after independent review found the same edge.
## Changed
- Partial/null PATCH typing and literal enums. Exact base-10 Decimal(18,4) request validation without rounding/overflow/nonzero underflow. Malformed emission JSON400 and canonical Devolucion error status/code preservation through existing ApiError.
## Files
- `src/lib/api/remitos.ts`; `src/lib/validators/remito.ts`; Remito emission route; `src/lib/services/devolucion.service.ts` class/import only. Three new runtime request suites and one compile-time contract file; R4 brief/config/validation/lock.
## Validations
-372/372 across24 related suites PASS, expanded scoped TypeScript PASS, tracked diff check PASS. Independent re-review72/72 and scoped typing PASS; underflow blocker resolved and ownership released.
## Risks
- No browser/DB/global build certificate; no UI/schema/Auth/stock/return transaction changes, commit/push/deploy. Direct internal service validation and return atomicity/quantity arithmetic remain outside R4. Caller numbers may already be rounded; exact amounts use strings.
## Next
- R5 state authority/concurrency as its own red/green unit. Preserve current Remito printing/PDF and unrelated dirty work.
