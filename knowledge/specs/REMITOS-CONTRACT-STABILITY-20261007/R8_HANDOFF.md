# R8 handoff

## Done
- Reverified concurrent transit ownership and repaired bounded stock projection. Independent critical review PASS, ownership released; not whole-stock acceptance.
## Changed
- Canonical Remito En_transito recognized additively; incumbent Emitido/legacy/delivery/reservation eligibility unchanged.
- Exact posted ledger coverage per company/Remito/item/article; only unposted documentary remainder reduces availability. Transit remains informational; full/partial/mixed lines counted once, real RETURN_IN netted, no stock effects invented.
- Technical-ID and SKU namespaces resolved once; mixed totals merge without cross-article leakage.
## Files
- `src/lib/services/stock-ledger.service.ts` —getStockAvailability read projection only.
- `src/__tests__/unit/stock-availability-remitos.test.ts` —34 checks.
- R8 brief/config/evidence/handoff/worklog/lock and audit/map R8 status.
## Validations
-16/30 red before fix;65/65 first focused. Final580/580 across38 suites, scoped TypeScript/whitespace PASS. Independent34/34 R8 and59/59 across5 selected suites+typing/whitespace PASS, no introduced blocker.
## Risks
- No live PostgreSQL/browser/global build certification; existing numeric DTO and multi-query snapshot behavior unchanged. Prior separate route/print failures excluded.
- No Surgery/Remito transition writers, schema/Auth/roles/UI/API/DTO/stock effects/Cajas/accounting/dependencies/DB/Git changed.
## Next
- R9 changed-content audit/technical IDs/global gates. Keep other Surgery agent's scope untouched.
