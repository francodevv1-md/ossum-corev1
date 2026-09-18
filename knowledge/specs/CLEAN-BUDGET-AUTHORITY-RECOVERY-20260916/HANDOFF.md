# Phase 1 — Budget Authority Recovery

## Done
- **Status: bounded backend recovery ACCEPTED**, Standard-mode apply; sole executor, `openai/gpt-6-astra` (runtime declaration). Independent reviewer `condemned-yellow-lobster` / Engram **#6942** found no introduced blockers. The current bounded candidate on HEAD `cc0cabb461ac42a1d55f08fb3b4965741654cd6c` passed its package review and the lock is **released**.
- Restored already-approved source backend contract consumed by unchanged Invoice. No new business decision; no weakened eligibility, inferred rates, historical promotion or fabricated persistence defaults.
- Internal auto-chain A persistence / B backend / C checks; accepted narrow `size:exception` for exact source recovery above 400 lines. No PR/commit actions.

## Changed
- Family, required commercial header/snapshot, ordered rate-based items, optimistic revisions and DRAFT/CURRENT/HISTORY lifecycle.
- Revision copies immutable current without replacing it. Replacement emission atomically moves prior current to HISTORY/Reemplazado. Accepted mutations and conflicts retain source audit behavior.
- RED before implementation: 4/4 contract checks failed (`200` vs `206.91`, missing canonical create export, missing branch accepted). Root cause was partial legacy producer recovery, not Invoice.

## Files
All paths relative to `E:/OSSUM_COR_WORKTREES/ossum-clean`:

| Unit | Inventory | Recovery |
| --- | --- | --- |
| A | `prisma/schema.prisma` | PresupuestoFamily + full Presupuesto/Item; Company/Surgery/Branch/ContactCompanyLink reverse relations; Branch tenant unique. Unrelated pending Article/stock declarations and reverse relations excluded; other declarations preserved. |
| A | `prisma/migrations/20260831010000_presupuesto_authority_unification_dev_001/migration.sql` | Exact original bytes; SHA-256 `0da18309cf6f09917bf35963888282e9c43a88fbf37013ab63865c908f8bfc58`. Not executed during this recovery; historical verification evidence #6145 remains authoritative. |
| A | `prisma/migrations/20260831073000_presupuesto_authority_corrective_dev_001/migration.sql` | Exact original bytes; SHA-256 `aa026921293d5120e18b565caeff07e6c9c6a4a3f42fc6a9e784f075aefa9340`. Not executed during this recovery; historical verification evidence #6145 remains authoritative. |
| B | `src/lib/services/presupuesto.service.ts`, `src/lib/validators/presupuesto.ts` | Exact-byte source restoration. Role arrays unchanged; no Auth/guard changes. |
| B | `src/app/api/companies/[companyId]/presupuestos/route.ts` | Canonical create and validated list. |
| B | `src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/route.ts` | Canonical read/replace/delete. |
| B | `src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/emitir/route.ts` | Revision-protected emit. |
| B | `src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/versions/route.ts` | Immutable revision command. |
| B | `src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/state/route.ts` | Strict named state commands. All five routes have no source content diff; target newline bytes retained. |
| C | `src/__tests__/unit/presupuesto-service.test.ts` | Exact source canonical unit tests. |
| C | `src/__tests__/integration/presupuesto-authority-migration.test.ts` | Exact source STATIC SQL tests, no connection. |
| C | `src/__tests__/unit/recovered-schema-contract.test.ts` | Historical recovery validation only; excluded from the current staging candidate. |
| C | `src/__tests__/unit/presupuesto-invoice-contract-recovery.test.ts` | Six offline producer-consumer/validation/lifecycle/hash checks; actual create/emit/approve writes feed unchanged Invoice, not a handcrafted approved row. |
| Docs | This directory `CHANGE_PACK.md`, `LOCK.md`, `SOURCE_BASELINE.md`, `HANDOFF.md` | Scope, provenance, Diagnose, evidence and next gates. The historical worklog milestone is excluded from the current staging candidate and was not modified during this review. |

Original workspace remains read-only. The prior recovery rechecked all 13 nonsecret source hashes and its HEAD; the current schema differs only by the intentional removal of the unrelated pending Article/stock cluster described in `SOURCE_BASELINE.md`. No env file/hash inspection. All other pre-existing uncommitted work remains. Invoice/client adapter/Auth/guards/store/UI/packages/stock/email files were untouched during this review.

## Validations
- Independent review #6942: **46/46 offline tests in five files** (producer-consumer, budget service, static SQL, recovered schema, Invoice service); full tsc **0**, diff-check **PASS**, all 13 original source hashes and HEAD unchanged. Reviewer did **not** wholly rerun the implementer's 111-test suite below. No tests or source changes during this docs-only release.
- Prisma **7.8.0** `format` + `generate` exit 0 using inspected datasource-free `C:/Users/franc/AppData/Local/Temp/opencode/clean-compile-recovery-prisma.config.ts` (schema path only; no dotenv). No new Prisma config or environment changes.
- Full `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false`: **0 diagnostics**. Initial new fixture `1n` reproduced TS2737; minimal test-only change to `BigInt(1)` fixed it. No tsconfig/target changes.
- **111/111 tests passed, 19 files**, 3.52s. Original geo/contact eight-file regression set included. Node emits pre-existing nonfatal localstorage-file warning, no storage errors.
- Vitest run through `startVitest('test', files, {watch:false, envFile:false}, {envFile:false, envDir:false})`, not full discovery. Close context afterward; derive exit code from failed count. Exact file list:

```text
src/__tests__/unit/presupuesto-invoice-contract-recovery.test.ts
src/__tests__/unit/presupuesto-service.test.ts
src/__tests__/integration/presupuesto-authority-migration.test.ts
src/__tests__/unit/recovered-schema-contract.test.ts
src/__tests__/unit/invoice-service.test.ts
src/__tests__/unit/invoice-create-route.test.ts
src/__tests__/unit/payment-service.test.ts
src/__tests__/unit/pending-invoice-sources-hook.test.tsx
src/__tests__/unit/pending-invoices-page.test.tsx
src/__tests__/components/FacturacionPage.backend.test.tsx
src/__tests__/unit/recovered-financial-client.test.ts
src/__tests__/unit/argentina-geography.test.ts
src/__tests__/unit/contact-geography.test.ts
src/__tests__/unit/logistics-geography-read.test.ts
src/__tests__/unit/logistics-vehicle-gps.test.ts
src/__tests__/unit/logistics-vehicle-gps-ui.test.tsx
src/__tests__/components/InstitutionGeographySection.test.tsx
src/__tests__/integration/contact-address-geography-migration-artifact.test.ts
src/__tests__/unit/contact-backend-authority-service.test.ts
```

- New producer regression proves both budget-only `206.91` and consumption repricing `103.455` from real producer persisted 10% line/5% general/21% VAT rates; ignores injected consumer price/total fields; rejects draft/emitted/history, duplicates, stale revisions and foreign-company revision reads. Source unit tests retain audit failure/replacement snapshot coverage.
- Focused ESLint (all changed TS files): **0 errors**, two unused-variable warnings for intentionally omitted company/actor fields in new validator fixture.
- `git diff --check`: PASS; Git CRLF advisories only. SQL/source byte hashes separately verified (including untracked files). Applied geography SQL SHA remains `78d1320aafd9d18313b821af541bbe80accb26b0e6524da6ef9aa5ed6ffefe01`.
- **Build deferred to parent** as explicitly permitted: only run with known preflighted network guard (DB/external denied except public font GET/HEAD; forward-slash quoted preload and sanitized output). No unguarded build attempted. No browser.
- **Not run**: connected `presupuestos-api.test.ts` (loads dotenv, creates/deletes real fixtures), synthetic PostgreSQL geo runner, any migrate/status/db/query command. Test doubles' raw-query functions do not connect.

## Risks
- **Recovered SQL is NON-EXECUTABLE against existing data until a separately authorized compatibility audit.** NOT NULL fields have no backfill and may fail populated legacy tables; historical migration order/checksum debt remains. No migration execution occurred during this recovery, and historical verification evidence #6145 is not superseded; this package does not certify DB compatibility or repair old history.
- Offline mocks/static SQL validate application contracts and artifact content, not actual FK/unique/locking/rollback enforcement or DB compatibility. Source partial indexes/slot checks/lineage trigger remain SQL-only enforcement.
- Sales still uses local authority: `src/app/ventas/presupuestos/page.tsx:105` reads store; `:192` creates local budgets with client totals/MANUAL ID/default list; `:226–264` performs local send/approve/reject/block/order actions. This phase does NOT make that UI functional against recovered backend.
- `PresupuestoFormDialog.tsx:10,31,37–59,73` uses store/legacy types, client amount mapping and `onSubmit(Presupuesto)`. Canonical API instead requires branch/client/payer IDs, commercial mode/snapshot inputs, dates, terms/list/legend, rate inputs; all commands require `expectedRevision`, state body uses `command`, not `newState`. Legacy Enviado/block/order actions cannot be mapped by inventing backend rules.
- Minimal `lib/api/presupuestos.ts` remains unchanged read projection and is compatible with pending Invoice; mutation client/form DTO helpers still absent. Its unrecovered-family comment is historical and should be updated with the next client/UI slice, not mistaken for backend status.
- Existing connected budget test still targets legacy bodies; it was deliberately neither modified nor executed. Future live QA needs separately scoped canonical fixtures and compatibility audit, not blanket full-suite execution.
- Prior email/receipt API gaps and traceability baseline risks remain outside scope.

## Next
1. Independent Phase 1 review accepted; ownership lock released for the next nonoverlapping UI owner.
2. Parent consumes the active read-only catalog audit and UI explorer results (not duplicated here), then bounded Sales page/form API-authority recovery without core Cirugias hooks/store refactor; guarded build remains a parent gate if required.
3. No live budget mutations or migrations based solely on these offline checks; establish compatible live contract under explicit authorization first.
