# Phase 2 — Sales Presupuestos Authority Recovery

## Done
- **Offline implementation review ACCEPTED; source lock `released`.** Parent-authorized docs-only finalization after reviewer `scattered-coral-weasel` ACCEPT #6962 and final guarded post-fix build #6964. Sole implementation executor `openai/gpt-6-astra` (runtime declaration), Standard mode.
- **Correction #6953 accepted:** implementation 136/136 tests; reviewer independently 25/25 including 12 rendered and tsc0. These are separate runs, not 136 independently rerun tests. Final build current; bounded live catalog gate PASSED. Authenticated browser **READ PATH PASS** recorded below; full mutation E2E remains unvalidated.
- Continued canonical recovery after Phase1 ACCEPT #6942. Internal auto-chain client/catalog → isolated form/page → tests; accepted narrow `size:exception`, no commits/PRs.

## Changed
- Typed canonical DTO/read/detail/create/replace/delete/emit/revise/state client. `fetchPresupuestos(companyId, params?)` unchanged for Pending Invoice. All relevant commands include `expectedRevision`; state uses `command`, never `newState`.
- Complete budgets pagination (100-page size) and active-contact pagination (500-page size). Branch GET recovered byte-identically using existing guards/service; no policy widening.
- Company-scoped hook hides stale rows, rejects duplicate in-flight commands and ignores stale requests. Accepted mutation + failed refresh remains successful, with explicit read-only retry warning; no duplicate create retry.
- New isolated Sales form uses backend branches/contacts/surgeries, canonical `backendId`, cancellation/suspension and existing-family exclusions. Standalone allowed with explicit non-Invoice-flow notice. Explicit commercial dates, currency, terms/list, general/line/VAT rates, free-description lines. No fake catalogs/prices/totals.
- Existing FIRM details, foreign currency, exact unedited timestamps, legend, item units and nested metadata survive edit. New estimative drafts use canonical legend. Failures/409/catalog retries retain entered values; company changes discard old selections/results. Accessible native labels/inputs and existing Dialog/UI primitives.
- Sales reads canonical list/detail/actions/history/totals. Actions combine unchanged role policy with backend actions; edit detail rechecks backend edit eligibility. Detail includes commercial/firm data, line rates/totals, family history. Currency-specific totals, no mixed-currency aggregate. Existing `/ventas/pendientes-facturar` navigation/eligibility unchanged.
- Removed Sales store CRUD/send/block/order actions; no email/PDF expansion. No shared form/hook/core Cirugias/Expediente edits.

## Files
Paths relative to `E:/OSSUM_COR_WORKTREES/ossum-clean`:

| File | Change |
| --- | --- |
| `src/lib/api/presupuestos.ts` | Extend pre-existing untracked read adapter; local DTOs, catalog pagination and revision commands. No legacy types/form imports. |
| `src/hooks/usePresupuestos.ts` | New source-derived complete/scoped load/mutation hook. |
| `src/components/presupuestos/SalesPresupuestoFormDialog.tsx` | New isolated editor; shared form intentionally untouched. |
| `src/app/ventas/presupuestos/page.tsx` | Replace local Sales authority with source-derived canonical UI and isolated form. |
| `src/app/api/companies/[companyId]/branches/route.ts` | New exact-byte original GET. |
| `src/__tests__/unit/presupuesto-authority-sales.test.tsx` | 11 adapted source/extended adapter-hook checks. |
| `src/__tests__/components/SalesPresupuestos.backend.test.tsx` | 12 actual rendered page/form checks, including two real-validator material-line regressions; mocked transport/catalog reads, not mocked Sales form/hook or validator. |
| `src/__tests__/unit/presupuesto-branches-route.test.ts` | 2 mocked GET guard/scope checks. |
| This docs directory | CHANGE_PACK, LOCK, SOURCE_BASELINE, APPLY_PROGRESS, HANDOFF. |

Existing recovered-financial-client tests passed unchanged; no additive fixture change needed. No service/schema/migration/env/DB/Auth/permission/package/core edits. Pre-existing dirty work retained; original read-only.

## Validations
- Independent reviewer #6962: ACCEPT correction #6953, no introduced blocker in focused re-review; **25/25** in three files (12 rendered, 11 adapter/hook, 2 route), full tsc0. Other previously reviewed areas were outside this focused re-review.
- Final guarded post-fix build #6964: PASS, **56/56** static pages, compile **7.9s**, full tsc0, empty stderr. Source/prisma/docs/root/env/form byte snapshots and Git status unchanged; only build outputs. Replaces pre-fix #6954 as current build evidence. No new build or command in this docs-only finalization.
- **136/136 tests passed in 22 files**, post-correction rerun 5.26s (original 134 plus two regressions). Includes all 19 files listed in Phase1 HANDOFF plus the three new files above. Explicit selection only; no connected `presupuestos-api.test.ts`.
- Env-disabled runner: `startVitest('test', files, {watch:false, envFile:false}, {envFile:false, envDir:false})`; await completion, set exit code from failed tests, close context. No dotenv or connected test discovery.
- New tests cover rendered create409/edit failure retention, explicit retry, lossless FIRM/USD/unit/metadata/timestamps, accepted create + failed refresh, named revision command bodies, duplicate command exclusion, persisted CURRENT/HISTORY remount/detail, stale company load/mutation/detail/catalog completion, empty/rejected catalog/list retries, backendId not visible ID, standalone/invoice eligibility, role and no-local-authority checks, >100 budgets and >500 contacts, branch GET scope/denial.
- Existing budget service, actual budget-producer→Invoice, static budget SQL, recovered schema, invoice/payment/pending and eight geo/contact regression files all pass.
- Full `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false`: **0 diagnostics**.
- Focused ESLint over all eight changed/new TS/TSX files: **0 errors/warnings**.
- `git diff --check`: PASS (line-ending advisories only). New files reviewed/read through implementation/test/type/lint checks; no staging.
- Original ten source hashes plus HEAD recomputed unchanged. New branches GET exact SHA; branch service normalized text identical but newline hash differs, service untouched. Shared legacy form/hook/store/base/core paths show no diff.
- Diagnose: initial test fixture TS2352 and three effect-lint findings reproduced, scoped and minimally fixed; details in CHANGE_PACK. Nonfatal existing Node localstorage-file warnings only, no storage errors.

## Risks
- **Bounded live catalog gate PASSED** via separate read-only audits #6958 + #6966 (details below). Browser read paths passed separately; mutation behavior, application data quality, concurrency/rollback and whole-DB compatibility are NOT certified. This executor did not perform DB/browser operations; metadata audits performed no schema/data mutation.
- Authenticated read-only browser checks completed; session automatically expired/closed. No live create/emit/approve/invoice flow validated, no full mutation E2E claim. True backend-empty/error behavior was not tested live; filtered empty states are narrower evidence.
- This is bounded Sales-only recovery. Shared Cirugias/Expediente consumers remain as-is and cannot be claimed unified by this work.
- Concurrency/409 errors intentionally preserve user input and never silently update the expected revision or retry commands. User may explicitly cancel/reopen after refresh to reconcile with current authority.
- Parent retains worklog integration and runtime QA ownership; milestone evidence is contained in this package, not appended to shared worklog or Phase1 files.

### Bounded metadata evidence and Phase1 risk reference
- #6958 + final #6966 together confirm required columns/types/nullability, 14 validated FK definitions (ordered local/reference columns and actions), mapped PKs, index keys/order/predicates/uniqueness/immediacy/validity/readiness (final 21 named indexes plus family/version uniqueness), seven exact validated checks, and lineage trigger/function definitions/properties. The final 21-index comparison supersedes the earlier incomplete 20-index observation, not the retained column/check/history evidence.
- Canonical migrations `20260831010000_presupuesto_authority_unification_dev_001` and `20260831073000_presupuesto_authority_corrective_dev_001` have finished history entries and checksums matching both source and destination. Existing `20260707173000` baseline checksum matches source but not destination solely due to newline bytes; debt remains unchanged. No history repair.
- Audit harness only: startup timeout 120s/lock 0 corrected using temporary `SET LOCAL statement_timeout='5s'`, `lock_timeout='1500ms'`; read-only state and effective values verified before/after metadata queries. PostgreSQL `name[]` comparator corrected to parsed `text[]` projections. Transaction rolled back and connection closed; no DB schema/data mutations.
- Exact prior reference: `knowledge/specs/CLEAN-BUDGET-AUTHORITY-RECOVERY-20260916/HANDOFF.md`, **Risks lines 71–76**. Its missing live-metadata evidence is now resolved only for this audited contract. Its warnings about executable recovered SQL, populated-data/backfill safety, transaction enforcement, migration/history debt and legacy connected tests remain applicable: **this audit does not make migrations executable or authorize execution**. Phase1 Sales-local/adapter gaps at lines 73/75 are addressed only by this bounded Sales implementation; shared legacy form/core consumers remain excluded. Phase1 files were not edited.

## Next
1. Source lock released; offline review, final guarded build and bounded catalog gates passed.
2. Read-path browser session is closed. Any future authorized runtime/mutation QA requires fresh authentication/preflight and its own bounded scope. Migration/data actions remain subject to separate approval. Core Cirugias/receipt/email gaps unchanged.

## Correction diff — reviewer #6953
- Production: only `SalesPresupuestoFormDialog.tsx` submit call changed from `onSave(draft)` to `onSave(FIRM ? copiedDraftWithNormalizedMaterials : draft)`; both material arrays use `.map((line) => line.trim()).filter(Boolean)`. No onChange/hydration/schema/client/page changes in this correction.
- Test: import actual `presupuestoReplaceDraftSchema`; add two parameterized rendered page→form→PATCH regressions (clear both fields; trailing/whitespace-only lines). Parse real submitted body; assert valid schema, exact normalized arrays, unchanged other FIRM fields/revision/currency/dates/legend, retained raw multiline textarea values on failure and untouched original snapshot arrays. Existing lossless hydration test retained.
- RED evidence: `too_small` at both `commercial.firmPrice.*Materials.0` for cleared fields; five blank-entry errors for trailing-line case. Root cause is sending editing-only blank lines, not backend rule. No business-rule widening or source-validator edit.
- GREEN: focused 2/2; all 136/136 offline checks; full tsc0 and lint0. Same env-disabled runner. Catalog audit not duplicated; no DB/browser/commit actions.

## Authenticated browser QA — READ PATH PASS (2026-09-17 UTC)
### Done
- Evidence supplied by parent from browser agent `automatic-harlequin-aardvark`; recorded docs-only, not rerun by this executor. Completed under original 19-minute timer, last checks 84 seconds before deadline. Session now automatically expired/closed.
- Fresh manual login in existing Chrome; actual `GET /api/companies/{id}/me` returned 200 and active company was verified. Fresh storageState saved outside Git; no contents, credentials or identities recorded here.
### Changed
- No application changes or live mutations. Non-GET/HEAD application-request guard remained active; zero application writes attempted or sent.
### Files
- Evidence append only: own HANDOFF/APPLY_PROGRESS/LOCK. No code/env/test/build/DB commands or source writes in this docs task.
### Validations
- Sales: budgets GET200, 25 records and 25 rendered rows; branches GET200 with 2 options; contacts GET200 with 79 options for each client/payer selector; surgeries GET200 with 48 records and 26 eligible options.
- Nuevo form opened with catalogs ready; empty form save disabled; canceled without mutation.
- Pending Invoice: budgets GET200 with 21 records, invoices GET200 with 9, consumos GET200 with 9; 21 rows rendered.
- Filtered empty states displayed, then filters restored Sales25/Pending21 rows. This did not exercise genuinely empty backend responses or error responses.
- Desktop1440/mobile390 settled layouts fit, tables scroll internally and dialog fits. Initial brief resize overflow resolved on settled recheck; not a persistent observed defect.
- Zero page errors, console errors or HTTP500 responses; zero application writes attempted/sent.
### Risks
- Acceptance is **authenticated browser READ PATH PASS**, not full mutation E2E. Live create/emit/approve/invoice creation and true backend-empty/error paths remain untested. Core Cirugias/receipt/email gaps and existing migration/history restrictions unchanged.
### Next
- Browser session closed; any further QA requires a fresh authorized session. Source lock remains released; docs ownership released after this append.
