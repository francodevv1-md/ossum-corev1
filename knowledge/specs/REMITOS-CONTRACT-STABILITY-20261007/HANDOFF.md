## Done
- Mapped critical Remitos flows and frontend/API/backend contracts; delivered two bounded units without browser QA.
## Changed
- R1 common reader stabilized for equal filters, identity changes, out-of-order reads, late mutation readback and loading cancellation.
- R2 creation/state mutation now reuse existing hydrated read projection; no domain state/stock/permission/schema change.
- One own prior role-query type error corrected; foreign changes preserved.
## Files
- `src/hooks/useRemitos.ts`; two projection blocks in `src/lib/services/remito.service.ts`; new hook/response tests; exact authored assertion in `ComprobantesAsociados.http.test.tsx`; own brief/audit/validation/configs/lock.
## Validations
- R1 nine red→22green; R2 two red→3green; focused133/133PASS; scopedTS/diff check PASS. Independent review blocker reproduced/corrected; final source re-review no remaining blocker.
## Risks
-31preexisting Cajas failures confirmed against HEAD hook; return/stock/state/validation/delete risks remain scoped follow-ups. Broader sourceTS has foreign errors; Comprobantes print suite intermittent. Full app/build/real DB not certified.
## Next
- R3 Cajas emission failures → R4 validators/request typing → state/delete/return/projection/audit bounded units per FLOW_AND_CONTRACT_AUDIT. No commit/push/browser/DB action performed.
