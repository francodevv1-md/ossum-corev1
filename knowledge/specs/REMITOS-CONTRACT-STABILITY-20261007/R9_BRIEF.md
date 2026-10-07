# R9 — content audit, technical-id guard, scope of new gates

- Task/owner: REMITOS-R9-20261007; sole backend/test/docs writer; directed reviewer read-only. T3 safeguards; Franco `IMPLEMENTA` after R8.
- R9 scope: (a) close the surgery technical-id guard, (b) record full content in `remito.draft_updated` audit, (c) keep within the existing R1–R8 source ownership.
- Independent review caught a regression: `CaseDetail` was using `surgery.id` as a fallback for queries. Re-corrected: `surgeryId` is `null` when not technical, and the follow-up readers receive `""` (which `useSeguimientoFeed` already short-circuits on). The presupuesto lookup compares against `null` honestly.
- Out of scope: Compras, billing/comparativa, NewSurgeryDialog, AiLateralRail, PDF CSS, `seguimiento-event-route.test.ts`, `ComprobantesPrint.test.tsx`, schema, Auth, roles, hooks outside `useRemitos` and the two coordinator panels, Cajas, returns.
- Sources: `src/lib/api/ids.ts` (new), `src/hooks/useRemitos.ts` (surgery id filter guard only), `src/components/coordinadores/modal/TabPaneSeguimiento.tsx`, `src/components/coordinadores/workspace/CaseDetail.tsx`, `src/lib/services/remito.service.ts` (serializer and serializeDate signature only).
- Tests: `src/__tests__/unit/surgery-id-guard.test.ts`, `src/__tests__/unit/remito-audit-content.test.ts`.
- Docs: R9 brief/validation/handoff/worklog; R9 lock; audit/map R9 status.
- Gates: failing replays first, then focused and R1–R8 regression, scoped typing, owned whitespace, independent review; release on evidence.
- Stop: owner overlap, needed schema/Auth/stock/Surgery policy, live data, foreign dirty.
