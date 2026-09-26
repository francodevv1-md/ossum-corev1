# Change Pack — Presupuesto Authority Unification DEV

Status: **COMPLETED T3 DEV — APPLY AND VALIDATION PASSED**
Change ID: `PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001`
Risk: **T3 — schema/migration, commercial invariants, multi-company persistence, Cirugías/Expediente integration**
Approval evidence: Franco's 2026-08-30 request and Engram #6118.

This pack governed the completed DEV replacement of visible Presupuesto local authority. Production, deployment, publication, fiscal behavior, and unrelated scopes remain excluded.

## 1. Canonical contract

### Authority and identity

- Prisma/API is the only operational authority. Zustand/localStorage may not remain a fallback, cache with writes, dual-write target, or source for any visible Presupuesto action.
- Every read/write is scoped by authenticated `companyId`; raw client-supplied company, totals, state, version, actor, or Surgery display IDs are never trusted.
- A Presupuesto may be standalone. A Surgery may have zero Presupuesto or one active family with immutable historical versions.

### Commercial record

Persist and project: visible number; company and branch snapshot/reference; client/payer snapshot/reference; optional Surgery; date; responsible user; currency; items with quantity, unit price, discount, VAT rate/amount and total; discriminated subtotal/discount/tax/total; payment terms; price list; validity; legend/clarifications; notes; state/version lineage. For firm-price use, support intermediary/coordinator, quotation contact, included/excluded materials, availability conditions, operational clarifications, and surgical assumptions. Estimative Districorr quotations use the exact legend in `knowledge/domain/PRESUPUESTOS.md`.

### Lifecycle

- New family starts at version 1 `Borrador`; drafts alone may be edited or draft-deleted.
- Draft edits replace the intended commercial snapshot transactionally, recalculate totals server-side, increment an optimistic revision, and audit old/new header plus item snapshots.
- No emitted version's commercial fields/items may be updated or cascade-deleted.
- Revising a non-draft current version copies it into exactly one later draft in the same family. Creating that draft does **not** change the prior state.
- Emitting a replacement is one transaction: validate expected revision/current family, allocate its visible number/version, set draft `Emitido`, and set only its prior current version `Reemplazado`.
- `Aprobado`, `Rechazado`, `Vencido`, and `Anulado` follow explicit service transitions; no generic state update may bypass family rules.
- Email route and selector re-read authority at send time and accept only `Emitido`/`Aprobado`.

### Concurrency and audit

- Database uniqueness must enforce one active family per Surgery and at most one draft/current slot per family; service-only checks are insufficient.
- Every draft mutation and state command carries expected revision/version and returns `409` on stale input.
- Family creation, revision creation, emission/replacement, state changes, and deletion are transactionally race-safe; retry is bounded.
- Audit records the real actor, company, family/version IDs, source/replacement lineage, old/new state, commercial/item diffs or complete bounded snapshots, and accepted/conflict outcome as required by existing policy. Secrets and email body content are not logged.

## 2. Current-state evidence

- `Presupuesto`/`PresupuestoItem`, service, validators, company-scoped routes, tests, PDF, and email foundations exist.
- Backend lacks branch/client/payer/payment-term/price-list/legend/notes fields and explicit active-family/current-draft constraints.
- Version creation currently marks the source `Reemplazado` too early and computes next version without sufficient race protection.
- Visible Sales/New Surgery/Expediente behavior still uses the local store and a divergent `Enviado` contract; the email selector is the only visible backend-ID consumer and currently over-allows non-draft states.
- The current root worktree has overlapping dirty/untracked changes. No application lock is available at proposal time.

## 3. Ownership and locks

| Slice | Owner/lock | Owned boundary |
|---|---|---|
| CP-0 docs | proposal writer; `editing → released` | this directory only |
| CP-1 persistence | one Backend/DB writer | schema + single named migration + persistence tests |
| CP-2 backend | one backend writer | Presupuesto validator/service/API/API-client chain + tests |
| CP-3 UI | one integration writer | Sales, Presupuesto components/hooks, scoped New Surgery and Expediente seams + tests |
| CP-4 QA | read-only validator | all owned diffs; no fixes during review |

No slice starts until its owned paths are clean or their current owner provides an exact handoff. Use an isolated worktree from an accepted prerequisite commit when possible; never copy stale files over the dirty root. Schema and migration execution are strictly sequential.

## 4. Allowed files

### Governance

- `knowledge/specs/PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001/{PROPOSAL,TASK_BRIEF,CHANGE_PACK}.md`
- `knowledge/worklog/WORKLOG.md` only at a completed T3 milestone.

### Persistence/backend

- `prisma/schema.prisma`
- the applied `prisma/migrations/20260831010000_presupuesto_authority_unification_dev_001/migration.sql` plus one narrowly reviewed roll-forward corrective migration if independent review proves a database invariant gap
- `src/lib/services/presupuesto.service.ts`
- `src/lib/validators/presupuesto.ts`
- `src/lib/api/presupuestos.ts` (new if needed)
- existing routes under `src/app/api/companies/[companyId]/presupuestos/**`
- `src/app/api/companies/[companyId]/branches/route.ts` (new read-only company-scoped catalog endpoint; reuses existing branch service)
- `src/lib/permissions/financial-document-email.ts` only to reuse current roles and add state eligibility; role membership must not change.

### Integration

- `src/app/ventas/presupuestos/page.tsx`
- `src/hooks/usePresupuestoForm.ts`; `src/hooks/usePresupuestos.ts` (new if needed)
- existing `src/components/presupuestos/**`
- `src/components/email/SendExistingFinancialDocumentDialog.tsx`
- `src/components/expediente/{PresupuestoPanel,ComercialTabContent,ExpedienteFullView}.tsx`
- `src/components/expediente/ExpedienteHeader.tsx` only to apply the existing Presupuesto mutation-role gate to “Generar PR”
- `src/components/cirugias/dialogs/{NewSurgeryDialog,PresupuestoDialog}.tsx`
- `src/hooks/useCirugiaActions.ts`
- `src/app/cirugias/page.tsx`, `src/hooks/{useCirugiasFilters,useCirugiaSelection}.ts`, and `src/lib/circuit-progress.ts` only to remove visible local Presupuesto reads
- `src/components/cirugias/SmartSurgerySearch.tsx`, `src/app/tablero/page.tsx`, and `src/components/coordinadores/workspace/CaseDetail.tsx` only to remove residual local/stale Presupuesto identity reads
- `src/app/expediente/page.tsx` and existing `src/components/expediente/{ResumenExpediente,FichaTabContent,ComprobantesAsociados}.tsx` only to consume canonical Presupuesto projections
- `src/app/ventas/{facturacion,pendientes-facturar}/page.tsx` and `src/components/facturacion/FacturarDialog.tsx` only to replace local Presupuesto reads
- `src/components/remitos/RemitoFormDialog.tsx`, `src/hooks/useConsumo.ts`, and `src/components/consumos/consumos/ConsumoFormDialog.tsx` only to replace local Presupuesto reads; no Remito/Consumo business-rule mutation
- `src/lib/store.ts` and `src/types/index.ts` only for the minimum removal/adaptation of legacy Presupuesto authority; no unrelated refactor.

### Tests

- existing Presupuesto unit/integration/component tests and narrowly named new `presupuesto-authority*` tests under `src/__tests__/**`.
- a narrowly named Presupuesto Playwright spec under the repository's configured `e2e/` directory.

Any additional path requires stop and an explicit pack amendment.

## 5. Forbidden files and systems

- Auth providers, role mappings, membership policy, RLS, secrets, environment files, package manifests/lockfiles, unrelated shared types/store logic, and unrelated Cirugías/Expediente modules.
- Invoice/fiscal/TusFacturasAPP behavior, Orden/Pedido backend, Remito/Consumo/Stock/Cajas behavior, provider changes, production/staging, deploy, and publication.
- Existing migration edits, automatic legacy backfill, seed/reset/data deletion, or generated artifacts retained outside normal ignored output.

## 6. Allowed and forbidden commands

### Allowed

- Read/search and path-limited Git inspection (`status`, `diff`, `log`, `show`, `diff --check`).
- Existing `npm run typecheck`, `npm run build`, focused `npm test -- ...`, focused `npx eslint ...`, local `npm run dev`, and Playwright/browser QA.
- `npx prisma format --schema prisma/schema.prisma`, `validate`, `generate`, and `migrate status`.
- Author and apply the one reviewed migration only when runtime preflight proves the disposable target in §7.

### Forbidden

- `prisma db push`; migrate/reset/seed/backfill against any other target; destructive SQL; dependency installation/update; secret printing.
- stash, reset, clean, checkout restoration, force operations, amend/rebase/merge/tag, commit, push, PR, or deploy.
- Commands that mutate files outside the active slice allowlist.

## 7. Disposable DEV database boundary

- Authorized target: Supabase DEV project ref `yywqcdromnmmelijvspi`, previously confirmed disposable; expected company evidence includes `Districorr DEV`.
- Before any DB command, prove from safe metadata that the loaded environment tier is `development`, project ref matches exactly, migration history is understood, and no production/staging hostname/project is selected. Never print connection strings or credentials.
- Run a read-only violation inventory before migration: duplicate active Surgery families, duplicate draft/current slots, broken lineage/version ordering, and mutable-history anomalies.
- Stop rather than delete or silently rewrite rows if deterministic non-destructive migration is impossible. This approval does not authorize reset, seed, mass deletion, or production-like data repair.
- Apply exactly the reviewed migration, run runtime invariant/race tests with rollback or isolated fixtures, prove migration status current, and prove no unintended data mutation.

## 8. Implementation acceptance gates

### Persistence/backend

- Database constraints reject duplicate active families/drafts and invalid lineage; immutable emitted snapshots cannot be mutated through supported commands.
- Concurrent family/revision/emission tests yield one accepted result and deterministic conflicts; no orphaned draft, duplicate number/version, or premature replacement.
- Server recomputes monetary totals with decimal semantics and validates every mandatory commercial field.
- Wrong-company, missing membership, stale revision, invalid transition, delete, and email-state tests pass.
- Audit proves real actor and complete lineage/item/commercial evidence for accepted mutations.

### UI/end to end

- `/ventas/presupuestos` lists, filters, creates, edits drafts, revises, emits, transitions, opens Surgery/Expediente, and refreshes from API data.
- New Surgery uses the persisted canonical Surgery ID; a Presupuesto failure leaves the valid Surgery intact and presents a recoverable retry because Surgery may exist without a Presupuesto.
- Active Expediente commercial UI reads the same family/history and exposes only valid actions; no hidden/local Presupuesto panel remains authoritative.
- PDF/email use the same immutable backend projection; selector and route permit only `Emitido`/`Aprobado`.
- Repository search and runnable regression prove visible Presupuesto actions no longer use `store.presupuestos`, legacy budget mutation methods, or `ortotrack-v2-storage` as authority.

### Repository quality

- Prisma format/validate/generate, focused tests/lint, typecheck, build, `git diff --check`, authenticated browser QA, changed-path allowlist, and no-secret/no-unrelated-diff checks pass.
- Diagnose is mandatory before every fix to a failed test/build/Prisma/browser gate.

## 9. Stop conditions

Stop and ask one precise question if:

- dirty ownership or an unexplained blob overlaps any active slice;
- disposable target identity or migration history is not exact;
- current DEV data violates the migration and requires destructive repair;
- family/current semantics conflict with a higher authority or require an unapproved business choice;
- work requires Auth/roles, fiscal, Orden/Pedido, provider/dependency, production/staging/deploy, unrelated Cirugías refactor, or another file;
- a database invariant cannot be enforced without weakening the approved rule;
- a validation/review fails after bounded minimal Diagnose correction.

## 10. Rollback and completion

- Before migration: discard only owned unstaged edits through explicit reverse patches; never restore or overwrite unrelated files.
- After migration on disposable DEV: stop writes and roll forward with a corrective reviewed migration. Rebuilding the disposable target is allowed only under a separate explicit destructive confirmation; no down migration is inferred.
- Before UI cutover completes, the old UI may remain untouched; dual writes are forbidden. After cutover, rollback disables Presupuesto mutations and restores the last accepted API-backed slice, never local authority.
- Emitted history and audit are never deleted or rewritten as rollback.

Completion requires every acceptance gate, all locks released, and a Caveman handoff. It authorizes no commit, push, PR, deploy, staging, or production action.

## 11. Approval record and review budget

Franco explicitly approved the canonical lifecycle and this T3 DEV outcome in the request that created this pack. Engram #6118 records the same state/version/email rules and DEV-only exclusions. The confirmed disposable target evidence is Engram #5306; later DEV applications are evidenced by #5980 and #6019.

`400-line budget risk: High`
`Chained review slices recommended: Yes`
`Decision needed before apply: No, unless a stop condition occurs`
