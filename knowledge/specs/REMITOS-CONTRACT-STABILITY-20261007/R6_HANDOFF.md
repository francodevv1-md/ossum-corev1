# R6 handoff

## Done
- Existing draft DELETE chain implemented and independently reviewed;25 new end-to-end contract checks. Fragility map source-verified with reproduced numeric probes and independent factual/overclaim review PASS. Ownership released. Not full Remitos/live DB acceptance.
## Changed
- Actor forwarded exclusively from authenticated context; service requires a deleting actor and always audits them, not the creator.
- Conditional company/draft/observed-version claim before any child mutation; unreferenced owned lines removed, then scoped parent in one transaction. FK dependencies409 restore everything; no broad cascade/detachment. Unknown/audit errors remain errors.
- Existing JSON200 confirmation, unauthorized403/missing404/non-draft409 and viable cancellation preserved. No UI DELETE action added; none existed in the audited surface.
## Files
- `src/lib/services/remito.service.ts` — DeleteRemitoInput/deleteRemito only, preceding R2/R5 preserved.
- `src/app/api/companies/[companyId]/remitos/[remitoId]/route.ts` — DELETE actor forwarding only.
- `src/__tests__/unit/remito-delete-contract.test.ts`; incumbent remito-service delete fixtures/assertions only.
- R6 brief/config/validation/handoff/worklog/lock, audit R6 status and `FRAGILITY_MAP.md`.
## Validations
-17 failed/8 passed before correction →79/79 first focused tests+R6 TypeScript PASS.
- Final461/461 across31 scoped files; independent90/90 across5 selected suites+typing PASS, no correctness/regression blocker. Owned whitespace PASS. Exact replay/limits in `R6_VALIDATION.md`.
- Fragility map9 seams traced in current source; floating precision/return-sum probes reproduced. Open risks are not described as executed live-data incidents.
- Independent map review PASS: source anchors/evidence/status accurate, no correction required;461 matrix exclusions explicit. Final R6 TypeScript and whitespace PASS.
## Risks
- Synthetic client/HTTP/FK/rollback replay, Auth context mocked, actual guard exercised. Full concurrent dependency-insertion isolation and real PostgreSQL/browser/global build acceptance NOT RUN.
- R7 return atomicity/retry/shared totals, R8 stock projection, R9 audit/identity/global gates remain open. Separate9 Seguimiento fixture failures and ComprobantesPrint intermittency excluded from461 matrix, not fixed or claimed green.
- No schema/Auth/roles/UI/DB/dependencies/stock/emission/return/Git mutation; no cancellation prohibition/automatic stock reversal.
## Next
- Next bounded unit R7 return transactions/replay/concurrency, then R8/R9. Keep user cancellation constraint and existing print/PDF.
