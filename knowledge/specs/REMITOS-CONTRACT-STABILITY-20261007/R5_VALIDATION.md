# R5 — bounded state validation

## Diagnose

- **Reproduce:** `vitest run src/__tests__/unit/remito-state-concurrency.test.ts --maxWorkers=1` before source changes: **21 failed /3 passed across24 cases**. Predicate-aware deterministic read barriers show stale generic and Seguimiento delivery writes overwrite the winner, duplicate delivery entry/audit, disappearing row exposes P2025, and generic return-state targets succeed with no confirmed returned quantities. Five cancellation cases already succeed on eligibility/result but fail the added conditional-write predicate assertion: cancellation itself was not broken.
- **Scope:** generic `updateRemitoState` plus separate `createSeguimientoEntry` delivery synchronization. Catalog/canonical return transactions/emission/stock/deletion unchanged. Existing R2 projections preserved.
- **Evidence:** both producers read state before updating by ID alone. Installed Prisma7 permits atomic `update` with unique ID and additional nonunique predicates; docs retrieved from Context7 `/prisma/web` (OCC/extendedWhereUnique).
- **Hypothesis:** include observed company/state/updatedAt in the write itself (also surgery for Seguimiento), mapping only that write's P2025 to existing domain409. No additional repository/state abstraction or second read needed.
- **Minimal Fix:** conditional predicates and local error mapping in both producers; generic return targets require a confirmed Devolucion, just as generic issuance already requires its dedicated endpoint. Dead generic issued/returned timestamp branches removed; delivery timestamp/hydrated select retained.
- **Validate:** **57/57 across4 focused files PASS**, R5 scoped TypeScript PASS.
- **Regression Check:** wider31-file run **441 passed /9 failed of450**. All9 failures belong to unrelated `seguimiento-event-route.test.ts`; isolated replay reproduces9 failures/5 passes. Final scoped30-file replay independently confirms **436/436 PASS**, including existing R1–R4/Cajas/Devolucion/PDF and Seguimiento service/adapter/validator/guard checks. Final R5 scoped typing/whitespace PASS.
- **Handoff:** cancellation stays viable in all incumbent allowed source states; no stock reversal and no dispatch prerequisite. Independent review PASS and ownership released.

## Clarified cancellation scope

Franco explicitly rejected restricting cancellation based on an undefined physical-dispatch step. Preserve `Borrador`, `Emitido`, `En_transito`, `Entregado`, `Parcialmente_devuelto` → `Anulado` as currently allowed. Existing terminal-state restrictions remain. A conflicting simultaneous cancellation can be retried after reloading the current document; it is not automatically retried against a state that the operation did not observe.

Code-backed nuance: Cajas issuance already records `CajasDispatch`, `DISPATCH_OUT` and dispatch accounting. R5 does not erase this historical evidence or manufacture a stock return when cancelling the document. Compensation/accounting disposition remains a separate product/domain scope, not a reason to prohibit cancellation here.

## Additional failing suite — not an R5 source regression

`seguimiento-event-route.test.ts:20–25` entirely replaces `seguimiento.service.ts` with mocks, and its unrelated route handlers do not execute the changed Remito service. The mismatches occur in permission/JSON processing before service calls. These route/guard files have no R5 diff. Auth fixtures retain legacy role-only expectations: expected company mutation denial versus actual capability denial (or malformed-body400); generic authorization cases expect409 but receive403. No Auth/roles/guards/fixtures were changed to force a pass. This suite remains **FAIL**, outside R5 acceptance.

## Replay

```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/remito-state-concurrency.test.ts src/__tests__/unit/logistics-delivery-seguimiento.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-response-contract.test.ts --maxWorkers=2
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/R5-tsconfig.json --noEmit --incremental false --pretty false
node_modules/.bin/vitest.cmd run src/__tests__/unit/seguimiento-event-route.test.ts --maxWorkers=1
```

Final scoped regression:
```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/remito-state-concurrency.test.ts src/__tests__/unit/logistics-delivery-seguimiento.test.ts src/__tests__/unit/seguimiento-service.test.ts src/__tests__/unit/seguimiento-event-guard.test.ts src/__tests__/unit/seguimiento-validator.test.ts src/__tests__/unit/seguimiento-adapter.test.ts src/__tests__/unit/remito-request-validation.test.ts src/__tests__/unit/remito-request-errors.test.ts src/__tests__/unit/remito-request-transport.test.ts src/__tests__/unit/devolucion-route.test.ts src/__tests__/unit/devolucion-service.test.ts src/__tests__/unit/remito-cajas-wire-trace.test.ts src/__tests__/components/RemitoCajasEmission.http.test.tsx src/__tests__/components/LogisticaCajasEmission.http.test.tsx src/__tests__/unit/remito-cajas-emission-intent.test.ts src/__tests__/unit/cajas-ui-intent-wiring.test.ts src/__tests__/unit/cajas-dispatch-owner.test.ts src/__tests__/components/OperationalRemitoWorkspace.test.tsx src/__tests__/unit/logistica-canonical-quantities.test.ts src/__tests__/hooks/useRemitos.test.tsx src/__tests__/unit/remito-response-contract.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-route.test.ts src/__tests__/unit/remito-devolucion-route.test.ts src/__tests__/unit/remito-workspace-draft-recovery.test.ts src/__tests__/components/RemitosPage.test.tsx src/__tests__/components/RemitosSummaryCard.backend.test.tsx src/__tests__/components/RemitoDraftDialog.test.tsx src/__tests__/components/RemitoPdfDownload.test.tsx src/__tests__/components/ComprobantesAsociados.http.test.tsx --maxWorkers=2
```

## Limits

- Synthetic predicate-aware Prisma/HTTP replay, not real PostgreSQL isolation or rollback certification. Only write-stage P2025 remapped; unrelated write/audit errors remain errors, not fabricated successful/conflicting responses.
- Pre-read version protects overlapping server writes, not a new client-observed version contract. Timestamp collisions are not a general-purpose revision counter; observed state predicate independently protects these transitions, which have no normal backward cycle.
- Generic state and Seguimiento delivery cannot overwrite an intervening committed state/version. **Does not certify all producers:** canonical return projection still uses absolute totals/read→write and can race in the opposite direction; R7 remains required. Deletion concurrency remains R6. Emission stays its existing Serializable transaction.
- Fresh standalone Seguimiento notes on already noneligible Remito states retain incumbent no-state-change behavior; no new blanket rejection/entry-type policy introduced.
- UI/schema/Auth/permissions/stock/accounting/DB/browser/dependencies untouched; no commit/push/deploy. Full build/global typing/live DEV acceptance NOT RUN. Prior separate ComprobantesPrint multi-suite intermittency remains outside the matrix.

## Independent review

- PASS: reviewer independently reproduced57/57 tests, scoped TypeScript and whitespace. Guard predicates, local P2025 mapping, hydrated responses, actors/timestamps, numbering/terminal checks and cancellation preserved. No scoped blockers; no stock reversal introduced. Real PostgreSQL/rollback and R6/R7 not certified. Ownership released.
