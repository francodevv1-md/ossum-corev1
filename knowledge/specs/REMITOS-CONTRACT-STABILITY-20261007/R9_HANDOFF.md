# R9 handoff

## Done
- Surgery technical-id guard and remito draft content audit implemented; independent review pending.
## Changed
- `useRemitos` filters `surgeryId` through `isTechnicalId` (cuid/uuid/long hex) before any backend call; non-technical ids become `undefined` and the hook returns an empty list honestly.
- `TabPaneSeguimiento` and `CaseDetail` no longer fall back to `surgery.id` for queries. They surface the missing technical id (`null`/`""`), and the follow-up readers short-circuit honestly. The presupuesto lookup compares against `null`.
- `serializeRemitoForAudit` now records `items`, `destinatarioSnapshot`, `shippingAddressSnapshot`, `transportSnapshot`, and `metadata` in old/new values. `serializeDate` accepts `undefined`.
## Files
- `src/lib/api/ids.ts` — new technical-id helper.
- `src/hooks/useRemitos.ts` — guard.
- `src/components/coordinadores/modal/TabPaneSeguimiento.tsx`, `src/components/coordinadores/workspace/CaseDetail.tsx` — guard.
- `src/lib/services/remito.service.ts` — serializer + serializeDate signature.
- `src/__tests__/unit/surgery-id-guard.test.ts`, `src/__tests__/unit/remito-audit-content.test.ts`.
- R9 brief/validation/handoff/worklog/lock and audit/map R9 status.
## Validations
- 8 red checks before fix; 127/127 across 7 R1–R8 + R9 suites PASS; broad 580/580 across 38 files preserved. R9 scoped typing and owned whitespace PASS. Review pending.
## Risks
- No real PostgreSQL/Auth/browser/global build certification. The guard is a best-effort filter, not a contract change: it cannot reject ids that look technical but are not persisted.
- The serializer now includes more content; audit rows become larger. Existing read paths are untouched.
- No schema/Auth/roles/UI/Cajas/returns/dependencies/DB/Git mutation. R8 stock and the other agent's Surgery files are out of scope.
## Next
- Independent review; R9 closes the unit. Future work: any remaining global build/type gates that R9 was not authorised to fix.
