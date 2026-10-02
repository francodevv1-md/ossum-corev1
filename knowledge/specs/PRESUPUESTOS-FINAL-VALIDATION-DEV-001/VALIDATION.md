# Final validation evidence

## Corrections / mock suites
- Reproduced TS2872 at presupuesto-service.test.ts:300; changed only bad literal expression to expect(e.status).toBe(409), preserving pre-existing dirty changes.
- Added five independent lock-order assertions (edit, emit, state, version, delete): actual tagged SQL must be tenant/ID-scoped SELECT FOR UPDATE, complete before first presupuesto read. No transaction mutex/queue in these five tests. Removing/moving/unawaiting the lock violates explicit event-order assertions.
- `npx vitest run src/__tests__/unit/presupuesto-concurrency.test.ts src/__tests__/unit/presupuesto-service.test.ts src/__tests__/unit/presupuesto-api-routes.test.ts src/__tests__/unit/presupuesto-mvp-closure.test.ts src/__tests__/unit/presupuesto-connected-journey-e2e.test.ts src/__tests__/unit/invoice-service.test.ts src/__tests__/unit/pending-invoices-page.test.tsx` → 7 files / 68 passed (63 existing + 5 new).
- `npx tsc --noEmit --incremental false` → PASS after the assertion fix and after the integration gate fixture type fix.
- `git diff --check` → PASS; no unrelated whitespace corrections applied.
- Existing queued mock race remains only mock evidence; connected-journey-e2e.test.ts is a mocked unit suite, NOT a browser or PostgreSQL test.

## Real PostgreSQL
- Confirmed development deployment tier and exact yywqcdromnmmelijvspi project in both DATABASE_URL and Supabase URL; approved runtime pooler host/port/database and username form checked without disclosing credentials.
- Read-only target corroboration found the exact checklist ID and QA observation previously created via server5000 against Franco's confirmed disposable DEV. Thus target matching is based on live data identity plus URL fingerprint, not .env filename.
- Opt-in command: set OSSUM_RUN_PRESUPUESTOS_FINAL_VALIDATION_DEV=true and OSSUM_PRESUPUESTOS_CONFIRMED_TARGET=yywqcdromnmmelijvspi; `node --env-file=.env --env-file=.env.local node_modules/vitest/vitest.mjs run src/__tests__/integration/presupuesto-revision-postgres.test.ts` → 10/10 (9 pure gate checks + 1 real DB race).
- Two independently constructed PrismaPg/PrismaClient pools (max1 each), real interactive transactions, distinct PostgreSQL backend PIDs and txids asserted. Only a simultaneous-start barrier, no harness write queue/mutex or forced winner.
- Same expectedRevision1: exactly one accepted write, one 409/presupuesto_revision_conflict; persisted revision2 once; winner title, one item, quantity, price, totals, exclusive metadata and one update audit; no rejected marker or partial audit.
- Exact-owned retained synthetic fixture: presupuesto cmuqqsez70000nshuaexh7tyx, qaRun b9ba4e61-e135-46a3-87ff-71a2cbda0ec9, qaOwner PRESUPUESTOS-FINAL-VALIDATION-DEV-001. Existing synthetic surgery sgdevsurgery1000000000000/company codevdistricorr1000000000 and existing authorized actor reused. No user, membership, permission, schema or migration changes; no destructive cleanup.
- Winner A race snapshot: Borrador/revision2, subtotal200, discount20, tax37.8, total217.8; metadata onlyA/writerA retained and onlyB absent. This snapshot was subsequently advanced by the explicitly recorded browser actions below, not by a second race write.

## Browser (real server5000)
- One headed named Chromium session, temporary storageState outside Git; user completed manual login. Actual application's company /me preflight200, then state saved and reused. No credentials/tokens/cookies copied into artifacts.
- Session opened09:13:43UTC and closed before20minutes. No server stopped/restarted, no Auth modification.
- Actual UI creation attempted from New Presupuesto → select existing synthetic demo CX-DEV-2026-0001 → fill commercial fields and synthetic item → Save. Actual POST returned404/surgery_not_found because payload surgeryId was visible number CX-DEV-2026-0001, not backend sgdevsurgery1000000000000. No created row, no fake success; input remained for review. Blocked full requested create→edit journey.
- No visible edit entry in budget row menu, and sales page only renders creation dialog (no presupuestoId/edit callback). Existing form edit branch also does not supply expectedRevision; static evidence in FINDINGS.md. No UI reimplementation attempted.
- Safe independent downstream check used only the already exact-owned PostgreSQL draft (not a fabricated replacement for failed UI creation). Actual UI Emit → backend200, visible PR-00001; then Approve → PATCH200 with expectedRevision3 → Aprobado/revision4/total217.8. First emit waiter timed out during cold route compilation; later actual resource status200 and UI state confirmed success; no second emit was submitted.
- Navigate actual Pendientes de facturar: exact-owned candidate shown with backend surgery sgdevsurgery1000000000000 and presupuesto cmuqqsez70000nshuaexh7tyx, total217.8 ARS. Actual UI create operational draft → invoice POST500/internal_error. No fiscal emission or payment attempted.
- Read-only DB check after failure: invoice count for exact-owned presupuesto0; approved presupuesto retained correct surgery, metadata/revision4/total217.8. Invoice creation/deduplication not passed.

## Diagnose: runtime blockers (not fixed outside bounded test scope)
- Reproduce creation404: UI selected visible CX and actual captured POST sent that same visible ID. Source PresupuestoFormDialog.tsx104/113 and SurgerySelector.tsx43 confirm identity leak. Expected backend ID; actual visible number. User cannot save surgery-linked draft. Smallest correction: resolve selected UI surgery to its existing backendId at API boundary, with honest missing-identity failure, and add real form/client HTTP test. Do not touch core Cirugías/store/schema.
- Edit/token gap: sales page has no edit action; form edit branch108 sends payload without expectedRevision or loaded revision. Needs bounded form hydration/token wiring, not backend rewrite. This remains static evidence, not a claimed executed edit failure.
- Reproduce invoice500: actual POST source exact-owned approved presupuesto returned500. Invoice service361 uses queryRaw SELECT pg_advisory_xact_lock (void result). On confirmed PostgreSQL, same parameterized statement via queryRaw reproduced P2010/UnsupportedNativeDataType/void; same statement via executeRaw succeeded. Both diagnostic transactions took/released advisory lock only, persistent writes0. Smallest proposed correction: execute advisory-lock statement without decoding void while preserving the lock and source deduplication; add real PG regression. Invoice service was NOT changed.

## Build
- Active user DEV process19652/parent19264 serves port5000 from this worktree; postcss workers execute from .next/dev/build. Shared output is in active use.
- Production build/typegen NOT run against active server output. Other sessions paused does not imply permission to disrupt the user server or clear its .next files. Need an exclusive build window before executing `npm run build`.
- next.config.ts currently ignores build TypeScript errors; this package does not modify config or rely on that waiver: separate TypeScript is required and passed.
