# R6 — DELETE end-to-end evidence

## Diagnose

- **Reproduce:** new `remito-delete-contract.test.ts` before fix: **17 failures /8 passes of25**. Required owned items prevent parent deletion via Restrict, producing P2003/HTTP500. Missing actor, creator attribution, stale deletion, reference/rollback and client confirmation contracts fail.
- **Scope:** existing DELETE route → service/interface; no UI or new client helper. Real `apiFetch`, guards, service, audit helper and JSON serializer run against authenticated-context and transactional predicate/FK/rollback doubles.
- **Evidence:** `RemitoItem` owner Restrict in current schema; parent Consumo/Devolucion/Cajas references Restrict. Optional item consumption/return references can SetNull, so broad child deletion risks detaching evidence.
- **Hypothesis:** use existing observed draft/version conditional update before deleting any child, remove only unreferenced owned children, then scoped parent delete inside the same transaction; FK failure rolls back. Require actual deleting actor and forward it from auth context, never request body/creator.
- **Minimal Fix:** `deletedById` required; blank runtime actor400; company/draft/updatedAt `updateMany` claim first; reference-filtered `remitoItem.deleteMany`; company/draft parent delete; map only delete-stage P2003 to409; audit actual actor unconditionally in transaction.
- **Validate:** **79/79 across5 files PASS**, R6 scoped TypeScript PASS.
- **Regression Check:** final **461/461 across31 files PASS**, preserving R1–R5/Devolucion/Cajas/PDF/Seguimiento checks. Independent reviewer **90/90 across5 selected suites + R6 TypeScript PASS**, no scoped correctness/regression blockers.
- **Handoff:** existing DELETE confirmation remains explicit JSON200; unauthorized403, missing404, non-draft/dependencies/stale409, missing actor400. Cancellation stays distinct/viable and no stock effect is created or reversed.

## Checks covered

- Owned line-before-parent removal, foreign rows unchanged; actual deleter differs from creator or creator absent.
- Six non-draft states rejected. Competing issuance/cancellation/edit/deletion after observed read rejects before child writes.
- Referenced optional-FK item is not deleted/detached; surviving owned line forces parent Restrict and rollback. Parent dependencies restore any already-removed unreferenced lines and the draft claim.
- Audit failure restores both deletions and is not relabeled as a dependency failure. Tenant mismatch produces404; unauthorized actual canonical role rejected by unchanged real guard.
- Real authenticated client→route→service→audit replay preserves JSON confirmation and conflict status/code; spoofed body actor/company ignored; repeated successful DELETE returns404 without a second audit.

## Replay

```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/remito-delete-contract.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-route.test.ts src/__tests__/unit/remito-state-concurrency.test.ts src/__tests__/unit/remito-response-contract.test.ts --maxWorkers=2
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/R6-tsconfig.json --noEmit --incremental false --pretty false
git diff --check -- src/lib/services/remito.service.ts 'src/app/api/companies/[companyId]/remitos/[remitoId]/route.ts' src/__tests__/unit/remito-service.test.ts
```

Final regression:
```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/remito-delete-contract.test.ts src/__tests__/unit/remito-state-concurrency.test.ts src/__tests__/unit/logistics-delivery-seguimiento.test.ts src/__tests__/unit/seguimiento-service.test.ts src/__tests__/unit/seguimiento-event-guard.test.ts src/__tests__/unit/seguimiento-validator.test.ts src/__tests__/unit/seguimiento-adapter.test.ts src/__tests__/unit/remito-request-validation.test.ts src/__tests__/unit/remito-request-errors.test.ts src/__tests__/unit/remito-request-transport.test.ts src/__tests__/unit/devolucion-route.test.ts src/__tests__/unit/devolucion-service.test.ts src/__tests__/unit/remito-cajas-wire-trace.test.ts src/__tests__/components/RemitoCajasEmission.http.test.tsx src/__tests__/components/LogisticaCajasEmission.http.test.tsx src/__tests__/unit/remito-cajas-emission-intent.test.ts src/__tests__/unit/cajas-ui-intent-wiring.test.ts src/__tests__/unit/cajas-dispatch-owner.test.ts src/__tests__/components/OperationalRemitoWorkspace.test.tsx src/__tests__/unit/logistica-canonical-quantities.test.ts src/__tests__/hooks/useRemitos.test.tsx src/__tests__/unit/remito-response-contract.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-route.test.ts src/__tests__/unit/remito-devolucion-route.test.ts src/__tests__/unit/remito-workspace-draft-recovery.test.ts src/__tests__/components/RemitosPage.test.tsx src/__tests__/components/RemitosSummaryCard.backend.test.tsx src/__tests__/components/RemitoDraftDialog.test.tsx src/__tests__/components/RemitoPdfDownload.test.tsx src/__tests__/components/ComprobantesAsociados.http.test.tsx --maxWorkers=2
```

## Evidence limits

- End-to-end contract replay, not live deployed UI/PostgreSQL acceptance. No existing UI DELETE button was present; none added. Auth context/token resolution mocked; actual canonical role guard is exercised and unchanged.
- Transaction double models rollback/FKs/predicates, not engine lock scheduling/isolation. Full concurrent dependent insertion during child deletion remains unverified; do not advertise broad PostgreSQL serializability from these tests.
- R7 canonical return races, R8 projections, R9 audit/identity/global gates still open. Separate9 Seguimiento route fixture failures and ComprobantesPrint multi-suite intermittency not in the461-case matrix.
- No schema/migrations/DB/browser/UI/Auth/roles/dependencies/stock/emission/returns or Git mutation. Global typing/full app build NOT RUN; shared .next/runtime reservations preserved.

## Fragility verification

`FRAGILITY_MAP.md` ranks9 current seams, names breaking changes/guards and separates reproduced behavior from code-backed unexecuted domain risks. Numeric conversion/sum probes executed; no unrequested domain fixes attached to the report. Independent factual/overclaim review PASS: sources/status/exclusions match, no correction required. Final R6 TypeScript/whitespace PASS; ownership released.
