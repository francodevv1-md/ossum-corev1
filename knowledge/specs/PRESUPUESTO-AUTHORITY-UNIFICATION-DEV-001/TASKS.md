# Tasks: Presupuesto Authority Unification DEV

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,500 |
| Delivery strategy | auto-chain (sequential review slices; publication forbidden) |
| Suggested split | S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7 |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## Lock Contract

One writer per slice; lock moves `reserved → editing → review → released`. Preserve HEAD `cea200ae3c181b7f50f69b4cc36a4e49eeee177d` and accepted dirty/untracked baseline; never clean, restore, stash, or overwrite. Stop on overlap or unallowed paths.

## S0 — Preflight and evidence

- [x] 0.1 **QA owner (read-only):** capture status, staged/unstaged path-limited diffs, untracked ownership, HEAD, migration list, and later-owned file hashes; obtain owner handoffs before locking.
- [x] 0.2 Safe metadata identified development ref `yywqcdromnmmelijvspi`, `Districorr DEV`, and understood migration history. A DEV credential was exposed in internal tool output during the original probe; Franco explicitly accepted that disposable-DEV risk, later secret scans passed, and no value is recorded in artifacts.

## S1 — Persistence

- [x] 1.1 **DB owner:** lock `prisma/schema.prisma`, `prisma/migrations/<timestamp>_presupuesto_authority_unification_dev_001/migration.sql`, `src/__tests__/integration/presupuesto-authority-migration.test.ts`; add minimum family/version/commercial fields and constraints.
- [x] 1.2 Static-review SQL, then run read-only DEV inventories for duplicate Surgery families/slots, lineage/version conflicts, mutable history, and missing deterministic data; stop rather than repair.
- [x] 1.3 Re-prove identity, apply exactly the reviewed migration to disposable DEV, verify status/invariants and data evidence; review and release.

## S2 — Domain backend

- [x] 2.1 **Backend owner:** lock `src/lib/validators/presupuesto.ts`, `src/lib/services/presupuesto.service.ts`, `src/__tests__/unit/presupuesto-service.test.ts`; implement validated snapshots, Decimal totals, explicit commands, expected revisions, serializable races, immutable history, and transactional audits.
- [x] 2.2 Prove fields, isolation, transitions, one-winner races, stale `409`, audit atomicity, and no premature replacement; review and release.

## S3 — HTTP, email, and PDF

- [x] 3.1 **API owner:** lock `src/app/api/companies/[companyId]/presupuestos/route.ts`, `src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/route.ts`, `src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/versions/route.ts`, `src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/emitir/route.ts`, `src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/state/route.ts`, `src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/email/route.ts`, `src/lib/permissions/financial-document-email.ts`, `src/__tests__/integration/presupuestos-api.test.ts`, `src/__tests__/unit/presupuesto-email-route.test.ts`; expose explicit commands and canonical DTOs.
- [x] 3.2 Lock `src/components/presupuestos/PresupuestoPDFDocument.tsx`, `src/__tests__/unit/presupuesto-pdf-document.test.tsx`; project authoritative immutable data and restrict selector/route email to `Emitido`/`Aprobado`; review and release.

## S4 — Sales cutover

- [x] 4.0 **Catalog seam:** add the minimum read-only company-scoped branches route by reusing `branch.service.ts`; reuse the existing contacts route for client/payer IDs.
- [x] 4.1 **UI owner:** lock `src/lib/api/presupuestos.ts`, `src/hooks/usePresupuestos.ts`, `src/hooks/usePresupuestoForm.ts`, `src/app/ventas/presupuestos/page.tsx`, `src/components/presupuestos/PresupuestoFormDialog.tsx`; reuse `apiFetch`, map DTOs, refetch commands, show errors without fallback.
- [x] 4.2 Add focused adapter/component coverage under `src/__tests__/unit/presupuesto-authority-sales.test.tsx`; review and release.

## S5 — New Surgery seam

- [x] 5.1 **Surgery owner:** lock `src/components/cirugias/dialogs/NewSurgeryDialog.tsx`, `src/components/cirugias/dialogs/PresupuestoDialog.tsx`, `src/hooks/useCirugiaActions.ts`, `src/__tests__/components/NewSurgeryDialog.test.tsx`; use persisted Surgery ID, retain failed draft in memory, retry without duplicates; review and release.

## S6 — Expediente and local-authority removal

- [x] 6.1 **Integration owner:** lock `src/components/expediente/ExpedienteFullView.tsx`, `src/components/expediente/ComercialTabContent.tsx`, `src/components/expediente/PresupuestoPanel.tsx`; load family/history by persisted Surgery ID and expose server-valid actions.
- [x] 6.2 Lock `src/lib/store.ts`, `src/types/index.ts`, `src/components/email/SendExistingFinancialDocumentDialog.tsx`, `src/__tests__/unit/presupuesto-authority-expediente.test.tsx`; remove only visible local authority/divergent states; prove API failure leaves local data untouched; review and release.
  - The allowlist now includes residual Cirugías, legacy Expediente, Facturación, Remito, and Consumo read seams strictly to replace local Presupuesto reads. Preserve downstream business behavior and do not add Orden/Pedido backend scope.
  - The approved residual identity amendment adds exactly `src/components/cirugias/SmartSurgerySearch.tsx`, `src/app/tablero/page.tsx`, and `src/components/coordinadores/workspace/CaseDetail.tsx`; all use bulk canonical reads and show not-loaded state instead of local fallback.
  - Evidence: focused authority suite 50/50 passing, amended-path ESLint 0 errors, production build passing, source regression covers active integration seams, and API failure does not render a fabricated local-empty result or invoke mutation commands.

## S7 — Gates and release

- [x] 7.1 Run Prisma format/validate/generate, focused tests/lint, typecheck, build, diff-check, path/secret checks, and local-authority searches; Diagnose before fixes.
- [x] 7.1a Diagnose independent-review findings; apply only confirmed minimal fixes and a roll-forward migration for proven DB invariant gaps, then rerun S7.1 gates.
  - Diagnose correction evidence: focused suite 187/187 passing; package-focused ESLint 0 errors (80 existing warnings intentionally not chased); changed-path TypeScript diagnostics clean; Prisma validate/generate passing; production build passing; diff check passing.
  - Repository-wide `tsc --noEmit` still exits 2 only on unrelated baseline scripts/tests/Remito/AI/notification/worker paths. This is documented separately and was not treated as a package-owned S7.1 failure.
  - Added runtime proof for standalone families, foreign-company non-disclosure/mutations, mandatory/conditional validation, immutable emitted history, accepted transactional audit evidence and rollback, New Surgery retry without duplicate creation, and Sales/Expediente reload/refetch persistence.
  - Independent-review corrections confirmed and covered: tenant-switch stale-response suppression; Decimal(18,4) quantization before row/header persistence; finite decimal rejection; complete replacement-emission audit snapshots; ambiguous retry reconciliation; and existing-role Sales mutation gating.
  - Conflict-audit failure remains fail-closed: the spec requires stale outcomes to be recorded, so an unavailable required audit must not return an unaudited accepted `409` outcome.
  - Applied reviewed roll-forward `20260831073000_presupuesto_authority_corrective_dev_001` only after safe DEV identity, migration-history, and zero-violation inventory checks. DEV now has company-scoped branch/contact/surgery FKs, same-family parent/source FKs, exact family/Surgery lineage enforcement, 34 migrations current, and zero post-apply violations.
  - Dormant Zustand compatibility remains because no rendered source imports/calls `useComparativa`; exhaustive method searches find legacy Presupuesto mutations only inside `store.ts` plus a negative regression test, while every active visible Presupuesto projection uses the API hook.
  - Final rerun: 16 focused files / 195 tests passing; package ESLint 0 errors (80 baseline warnings); no package-owned TypeScript diagnostics; Prisma format/validate/generate passing; build passing; diff check and migration status passing. Authenticated E2E remains intentionally deferred to S7.2.
- [x] 7.1b Diagnose final-review blockers: mutation tenant-switch race, Expediente role affordances, and concurrent family-creation conflict audit; add focused regressions and rerun package gates.
  - Mutation/refetch work is bound to the active company/filter generation; stale captured mutations cannot refetch or overwrite the current company.
  - Expediente Presupuesto writes and “Generar PR” reuse the existing `admin`/`coordinador`/`vendedor` gate; read-only access remains unchanged.
  - A linked-family uniqueness loser records `presupuesto_conflict` before deterministic `409`; audit failure remains fail-closed.
  - Final evidence: 16 focused files / 199 tests passing; package ESLint 0 errors (3 existing warnings); no S7.1b-path TypeScript diagnostics; Prisma validate/generate, production build, and `git diff --check` passing.
- [x] 7.1c Diagnose the residual tenant-switch disclosure by scope-tagging stored hook rows; old-company rows are immediately hidden while the new-company request is pending, while same-scope refreshes may retain rows.
  - Evidence: tenant-switch regression failed before the fix and passed after it; 16 focused files / 198 tests passing; changed-path ESLint clean; no changed-path TypeScript diagnostics; production build and diff check passing.
- [x] 7.1d Diagnose the still-routable legacy `/expediente` Presupuesto controls; reuse `canMutatePresupuesto` to hide Emit/Approve/Reject and empty-state creation affordances from read-only roles without changing roles or API behavior.
  - Evidence: the ungated baseline controls were reproduced from HEAD; focused legacy-route regression and adjacent authority suite passed (4 files / 27 tests); changed-path ESLint reported 0 errors (19 existing warnings); no changed-path TypeScript diagnostics (repository-wide `tsc --noEmit` remains blocked only by unrelated baseline paths); production build and `git diff --check` passed.
- [x] 7.2 **Browser QA owner:** added and passed `e2e/presupuesto-authority.spec.ts` in Chromium with the explicitly authorized package-specific DEV admin credentials, loaded through `@next/env` without displaying values. The test attests server/project/company/admin context; creates unique disposable Contact → Surgery → linked Presupuesto fixtures; proves Sales rendering and hard-refresh persistence; performs Emitido → Aprobado → revision-draft reconciliation with one family; verifies the Expediente `Comprobantes` panel shows the same approved/current and draft history; verifies the email selector exposes the approved record but no Borrador and identifies the non-fiscal PDF projection without sending; and proves visible lifecycle actions do not write non-auth localStorage or Zustand authority. Final evidence: Chromium 1/1 PASS in 24.5s (28.4s total), focused ESLint and diff-check PASS.
- [x] 7.3 **Independent reviewer (read-only):** final PASS after S7.1d; all Presupuesto mutation affordances, including the routable legacy `/expediente`, use the existing role gate; application/docs lock is `released`; focused review suite 27/27 PASS, ESLint 0 errors, diff check PASS, and prior authenticated Chromium evidence remains valid. No commit, PR, deploy, or publication.
