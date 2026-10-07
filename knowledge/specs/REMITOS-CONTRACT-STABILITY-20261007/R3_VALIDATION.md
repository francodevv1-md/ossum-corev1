# R3 validation — bounded Cajas emission

## Diagnose evidence

1. **Reproduce:** existing HTTP-backed suites failed **31/43**, identical to the R1/R2 baseline. Authenticated transport remains real; `fetch` is synthetic, Logistics presentation is replaced. No live backend/DB acceptance claimed.
2. **Scope:** two callers → incumbent Cajas helper → real authenticated clients → unchanged issuance route/validator/transaction/dispatch authority.
3. **Evidence:** nullable/mismatched linked assignment/preparation fell through to generic POST; Logistics ignored persisted linkage; retries read version99 while retaining the old semantic key; obsolete company/document preflights still posted; absent trace fields bypassed the builder's compatibility checks.
4. **Hypothesis/minimal fix:** resolve authoritative linkage centrally; reject missing/mismatched scope/trace and duplicate lines; retain exact version/key/lines per observed command; synchronously reserve preflight; invalidate old contexts and verify again before calling mutation. No server/domain changes.
5. **Validate:** original 43 HTTP cases plus incumbent31-helper cases **74/74 PASS** immediately after correction.
6. **Regression:** expanded identity/Auth/unmount/company-round-trip and fresh-key checks plus shared resolver failures. Incumbent Workspace assertion failed because it expected two arguments instead of the already existing optional third `undefined`; changed assertion only. New test fixture TypeScript cast failed; replaced with complete typed row. No source workaround for either test defect.
7. **Initial focused matrix:** **268/268 PASS across18 files**; scoped R3 TypeScript PASS; tracked owned diff whitespace PASS (Windows LF/CRLF warnings only).
8. **Independent review/second Diagnose:** reviewer found actual service wire fields differed from HTTP fixture aliases, plus Workspace auth-only-loss and immediate same-version reload invalidation gaps. Three runtime failures reproduced before corrections. Added canonical wire DTO fields (types only); normalized canonical lot/serial with explicit null authoritative; fixtures now use actual GET field names; Auth status/loading participates in invalidation; reload immediately discards pending/cached commands. **102/102 targeted checks PASS** before expanded wire tests.
9. **Final matrix after corrections:** **276/276 PASS across19 files**; R3 scoped TypeScript and tracked diff checks PASS. Separate Comprobantes printing replay **22/22 PASS isolated**; this does not resolve previously observed multi-suite intermittency.

## Proven behavior

- Persisted `metadata.cajas.assignmentId` wins; failed or malformed linkage does not switch to an unrelated active assignment.
- Unmarked surgery-linked documents read backend active assignments; only a confirmed empty result permits generic emission. Missing selected detail/preparation/items, ambiguous mappings, missing/mismatched lot/serial, wrong company/surgery/inactive detail and duplicate preparation-line mappings reject before POST.
- Two uncertain retries retain the exact request body and do not observe a newer preparation version. Explicit accepted edit/Logistics freshness reload starts a new observed command with a fresh semantic key. Incumbent pure-builder nullable contract and deterministic key remain intact.
- Workspace company/user/document identity, draft edit, Auth readiness, unmount and A→B→A invalidate pending preflight. Logistics additionally invalidates surgery/freshness context and changed raw-row version. Duplicate Logistics preflight rejects; mutation busy state remains intact.
- Subsequent list refresh failure does not turn an accepted mutation into a rejection. Existing draft recovery and print/PDF tests remain green.

## Replay

```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/remito-cajas-wire-trace.test.ts src/__tests__/components/RemitoCajasEmission.http.test.tsx src/__tests__/components/LogisticaCajasEmission.http.test.tsx src/__tests__/unit/remito-cajas-emission-intent.test.ts src/__tests__/unit/cajas-ui-intent-wiring.test.ts src/__tests__/unit/cajas-dispatch-owner.test.ts src/__tests__/components/OperationalRemitoWorkspace.test.tsx src/__tests__/unit/logistica-canonical-quantities.test.ts src/__tests__/hooks/useRemitos.test.tsx src/__tests__/unit/remito-response-contract.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-route.test.ts src/__tests__/unit/remito-devolucion-route.test.ts src/__tests__/unit/remito-workspace-draft-recovery.test.ts src/__tests__/components/RemitosPage.test.tsx src/__tests__/components/RemitosSummaryCard.backend.test.tsx src/__tests__/components/RemitoDraftDialog.test.tsx src/__tests__/components/RemitoPdfDownload.test.tsx src/__tests__/components/ComprobantesAsociados.http.test.tsx --maxWorkers=2
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/R3-tsconfig.json --noEmit --incremental false --pretty false
git diff --check -- src/lib/cajas-intent.ts src/lib/api/cajas-assignments.ts src/components/remitos/OperationalRemitoWorkspace.tsx src/components/expediente/LogisticaTabContent.tsx src/__tests__/components/OperationalRemitoWorkspace.test.tsx
node_modules/.bin/vitest.cmd run src/__tests__/components/ComprobantesPrint.test.tsx --maxWorkers=1
```

## Limits / NOT RUN

- No browser or viewport QA (1366×768/1920×1080/390×844), by explicit user constraint. No layout/class changes. No visual acceptance claimed.
- No real DB, server, schema/migration/generate, Auth/roles policy, stock/accounting effects, dependencies, commit/push/deploy.
- Full app build/source-wide TypeScript not a green gate; R1/R2 documented foreign diagnostics remain. Intermittent `ComprobantesPrint.test.tsx` not included in276-test matrix; isolated22-test replay passed.
- Retry retention is in-view only, not across full page reload/remount. It prevents rebuilding a command during in-context retries, not cancellation/rollback of a mutation already sent/accepted. Backend remains authority for concurrency, reservation, control, Decimal precision, expiration evidence and stock.
- R4–R9 state/delete/returns/stock/audit and wider typing remain separate units. Complete Remitos acceptance remains unproven.

## Independent review

Initial read-only review identified three blockers; all reproduced and corrected within the owned boundary. Re-review **PASS**: all three resolved, no remaining blocker in these findings. Reviewer independently reran **105/105 focused tests** and scoped TypeScript PASS. Parent final276-test matrix and isolated22-case printing replay documented above. Ownership released; review does not establish browser/database/full-app acceptance.
