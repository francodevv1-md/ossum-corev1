# R4 validation — request boundary

## Diagnose / evidence

- Red runtime replay: **27 failed /32 passed across59 cases**. Numeric schemas accepted blank declared values, radix strings and Decimal(18,4) scale/range violations; whitespace was returned unchanged. Emission malformed JSON and canonical Devolucion errors were serialized as500.
- Red scoped TypeScript: **11 diagnostics** in the new type contracts. Client PATCH required create fields and excluded nullable surgery; schema enum casts discarded readonly catalog literals.
- Scope/trace: real clients → company routes/guards → incumbent schemas/services. Column declaration read-only confirms Remito declaredValue and quantity/returnedQuantity are Decimal(18,4). No real database connection.
- Hypothesis/minimal correction: reuse installed Prisma.Decimal for exact lexical/scale/range checks and preserve normalized strings; use readonly enum tuples directly; align client PATCH with existing partial/null schema; map malformed emission JSON to existing invalid_json_body; inherit incumbent ApiError in DevolucionError instead of adding per-endpoint mappings.
- First green: **126/126 across8 suites**, scoped TypeScript PASS. Expanded real-client→route synthetic transport checks, existing R1–R3/Devolucion/UI/PDF regressions: **366/366 across24 suites**, expanded scoped typing (including page, hook, Workspace and dialog consumers) PASS; tracked diff whitespace PASS.
- Supplemental scientific exponent checks then exposed **2 failing underflow cases**: Decimal converts a nonzero coefficient at extreme negative exponent to zero, making finite/scale/range checks insufficient. Independent review separately identified the same P2 for positive and negative coefficients. Added a lexical coefficient guard; three nonzero forms now reject while three exact-zero scientific forms remain valid. **72/72 request checks PASS** after correction; final results below supersede the initial366 gate.

## Intended bounded invariants

- Client PATCH supports scalar-only edits, full optional item replacement and nullable surgery, with origin immutable. Schemas retain catalog literal types.
- Preserve exact18-digit decimal strings, supported base-10/scientific forms and trailing zeros that do not change value; reject lexical invalid/blank/radix/nonfinite/sign violations, rounding-required scale, overflow and nonzero underflow.
- Authenticated transport preserves payload fields and existing route error status/code; rejected numeric input never invokes mocked create/update/return mutation service.
- Optional empty emission body remains supported; malformed JSON is400/invalid_json_body and valid-JSON schema rejection stays400/validation_failed.
- Devolucion domain errors retain statuses/codes through incumbent response serialization; unknown exceptions still return generic500 without internal detail.

## Replay

```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/remito-request-validation.test.ts src/__tests__/unit/remito-request-errors.test.ts src/__tests__/unit/remito-request-transport.test.ts src/__tests__/unit/devolucion-route.test.ts src/__tests__/unit/devolucion-service.test.ts --maxWorkers=2
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/R4-tsconfig.json --noEmit --incremental false --pretty false
git diff --check -- src/lib/api/remitos.ts src/lib/validators/remito.ts 'src/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route.ts' src/lib/services/devolucion.service.ts
```

Final regression matrix:
```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/remito-request-validation.test.ts src/__tests__/unit/remito-request-errors.test.ts src/__tests__/unit/remito-request-transport.test.ts src/__tests__/unit/devolucion-route.test.ts src/__tests__/unit/devolucion-service.test.ts src/__tests__/unit/remito-cajas-wire-trace.test.ts src/__tests__/components/RemitoCajasEmission.http.test.tsx src/__tests__/components/LogisticaCajasEmission.http.test.tsx src/__tests__/unit/remito-cajas-emission-intent.test.ts src/__tests__/unit/cajas-ui-intent-wiring.test.ts src/__tests__/unit/cajas-dispatch-owner.test.ts src/__tests__/components/OperationalRemitoWorkspace.test.tsx src/__tests__/unit/logistica-canonical-quantities.test.ts src/__tests__/hooks/useRemitos.test.tsx src/__tests__/unit/remito-response-contract.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-route.test.ts src/__tests__/unit/remito-devolucion-route.test.ts src/__tests__/unit/remito-workspace-draft-recovery.test.ts src/__tests__/components/RemitosPage.test.tsx src/__tests__/components/RemitosSummaryCard.backend.test.tsx src/__tests__/components/RemitoDraftDialog.test.tsx src/__tests__/components/RemitoPdfDownload.test.tsx src/__tests__/components/ComprobantesAsociados.http.test.tsx --maxWorkers=2
```

## Limits

- Synthetic HTTP/Prisma doubles, no DB/server/browser. No UI/layout changes, schema/migrations/generate/Auth/roles/stock/state/return transaction changes, dependency installation, commit/push/deploy.
- API/schema boundary only: does not certify all direct internal service callers or numeric/accounting projections. Canonical Devolucion quantity validation, floating preflight sums and return atomicity remain R7, not silently refactored here.
- Caller-supplied JavaScript numbers may already be rounded before validation; send strings for high precision. No attempt to reconstruct lost digits.
- Full app build/global typing not certified; prior foreign errors and separate ComprobantesPrint multi-suite intermittency remain outside scope. Existing print/PDF tests in regression are preserved.
- R5–R9 state authority/deletion/returns/stock/audit gates remain open.

## Final gates

- Final **372/372 tests across24 files PASS** after underflow correction.
- Expanded R4 scoped TypeScript PASS, including new compile-time contracts and page/hook/Workspace/dialog consumers. Tracked owned whitespace PASS (LF/CRLF warnings only).
- Independent first review:108/108 related tests and typing passed but P2 underflow blocked acceptance. Re-review **PASS** after red reproduction/minimal correction: reviewer independently72/72 request tests and expanded scoped TypeScript passed, no remaining blocker in this re-review. Ownership released. No whole-app/DB/browser certification.
