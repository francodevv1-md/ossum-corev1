# R7 — atomic returns and replay evidence

## Diagnose

- **Reproduce:** new17 service cases plus24 shared-hook cases: **16 failed /25 passed of41** before source fixes. Legacy failure leaves a committed pending document/audit; success uses3 root transactions; repeated command duplicates quantities/documents; full-return retry rejects; fractional duplicate sums reject0.3; non-delivered/Cajas returns orphan documents; simultaneous distinct confirmations lose increments/over-accept.
- **Scope:** Remito return endpoint/input, canonical Devolucion owners and competing document-state writers, exact Decimal validator extraction, shared API/hook return-command transport. Previous R1–R6 preserved. No schema/stock/accounting-policy/UI/Auth changes.
- **Evidence:** source trace and staged read-committed parent/document-lock transaction replay. Quantity/state writes originally read before obtaining shared ownership; per-Devolucion claim alone cannot serialize distinct returns on the same Remito.
- **Hypothesis:** reuse canonical create/pending/confirm with a real transaction client; one outer transaction, parent lock before reading balances, Decimal aggregation, persistent accepted receipt scoped by company/Remito/key and actual actor/content proof. Guard each competing writer's observed document state.
- **Minimal Fix:** canonical composition accepts `Prisma.TransactionClient`; parent `FOR UPDATE` before quantity projection; company-scoped writes; optional bounded idempotency key transported by existing client/route, shared hook retains same failed in-view command. Legacy endpoint rejects unsupported state/Cajas accounting before document creation; no inferred disposition. Shared exact positive Decimal(18,4) validation at public and direct creation/legacy-return boundaries.
- **Validate:** first **91/91 across5 files**, scoped TypeScript PASS after incumbent return mocks support transaction reads and mandatory lock.
- **Supplemental reproduction:**2 receipt-tamper checks fail when metadata falsely describes actual document items/creator; verify accepted actual items/creator as well as snapshot.2 staged stale rejection/annulation races overwrite Confirmada after quantities applied; company/observed-state conditional writes and write-only P2025→409 fix them. Neither arbitrary audit failures nor unknown failures are remapped.
- **Independent review / Diagnose:** reviewer ran141/141 and typing PASS but reproduced P2: two identical overlapping return requests useK; first success clearsK, second loses response, retry createsK2 and may duplicate a return. Added3 failing hook regressions (success/failure coalescing and obsolete callback overwriting current failed command), then fixed centrally: identical in-flight calls share1 promise/request, failure preserves key, scope guard runs before touching command. Focused144/144 and typing PASS.
- **Regression Check:** final parent **502/502 across32 files PASS**, R7 scoped TypeScript and owned whitespace PASS. Independent re-review **144/144 + scoped typing +3 independent in-memory checks PASS**: original overlap now1 HTTP/shared promise; delayed refresh and old-company completion preserve command isolation. Prior P2 resolved, no new reproducible issue. Ownership released.
- **Handoff:** durable server replay requires the same company/Remito/key, accepted item content and actor; it returns a fresh authorized Remito even if now terminal. Old keyless callers retain compatibility, not once-only response-loss guarantees.

## Supplemental checks

-36 current service/real-HTTP cases include legacy atomic failure,1 root transaction, lost-response/full-return/concurrent identical receipt replay, changed content/actor409, actual receipt item/creator proof, distinct-key partial returns, fractional aggregation and invalid precision/overflow/underflow.
- Distinct canonical returns serialize increments and remaining balance; same Devolucion claims once. Both Remito cancellation/return winner orders tested; stale cancellation409, cancellation winner rejects return without revival. Fresh cancellation after accepted partial return remains viable.
- Same-document stale rejection/annulation cannot erase accepted Confirmada. Existing transitions and human confirmation remain unchanged.
- Actual unchanged `acceptCajasAccounting`, command/audit and `recordStockMovement` run on staged doubles: explicit human `unchanged` disposition produces one RETURN_IN/evidence; confirmed retry creates no further effects; late accounting failure restores document, quantity, audit and staged ledger. No synthetic disposition supplied in production code.
- Existing client → actual return route/unchanged canonical guard → actual services: exact string quantity/key survives transport, repeat once, conflicting content409, malformed key400 before transaction, viewer403 before mutation. Auth resolution mocked, not bypassed.
- Five hook checks prove failed retry keeps a key; identical overlapping requests coalesce on success/failure; obsolete callbacks cannot replace the current failed command; success, changed content and company start a fresh command. Key retention is in mounted view only; no localStorage or durable client state.
- Wider run preserves Cajas emission, draft CRUD, R1–R6, existing returns, Seguimiento service, Comprobantes and NR PDF.

## Replay

```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/remito-return-atomic.test.ts src/__tests__/hooks/useRemitos.test.tsx src/__tests__/unit/remito-service.test.ts src/__tests__/unit/devolucion-service.test.ts src/__tests__/unit/remito-devolucion-route.test.ts src/__tests__/unit/cajas-ui-intent-wiring.test.ts --maxWorkers=2
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --project knowledge/specs/REMITOS-CONTRACT-STABILITY-20261007/R7-tsconfig.json --noEmit --incremental false --pretty false
```

Final regression is the exact31-file command in `R6_VALIDATION.md` with `src/__tests__/unit/remito-return-atomic.test.ts` added, using `--maxWorkers=2`. It now totals32 files /502 checks (prior461 plus36 new service/transport cases and5 new hook cases). No excluded suite is counted as passing.

## Limits / open work

- No real PostgreSQL/engine isolation/deadlock/timeout certification. Staging and row-lock doubles prove predicates, lock order relative to reads, once-only effects and rollback contracts, not engine scheduling. Parent lock uses current schema's quoted Remito table/company columns; schema untouched.
- Receipt lookup uses existing Devolucion JSON metadata under parent lock, not a new indexed receipt table. Large per-Remito histories may require an index/table later. Other authorized document creators can provide metadata, so replay also verifies actual accepted items/creator; snapshot is not the authority.
- Receipt returns current Remito, not a historic response snapshot; confirmed old documents/auth-user removal may affect receipt recognition. Caller must retain/reuse the same key; no replay promise across a UI remount or for old keyless requests.
- Exact strings are preserved; JavaScript numbers already rounded before arriving cannot be recovered. R3 Cajas numeric intent transport and R8 stock projection still separate. Existing generic Remito UI does not collect human Cajas dispositions: explicit canonical accounting flow remains necessary, no new UI invented.
- Independent domain notification helper remains incumbent; no promise of external notification delivery or native print completion.
- Global build/source-wide type acceptance NOT RUN; unrelated baseline errors,9 separate Seguimiento route fixture failures and intermittent ComprobantesPrint multi-suite failures remain excluded. No browser/live DB/Git mutation/deploy; no production acceptance.
- R8 stock/transit and R9 changed-content audit/technical IDs/global gates remain next bounded units.
