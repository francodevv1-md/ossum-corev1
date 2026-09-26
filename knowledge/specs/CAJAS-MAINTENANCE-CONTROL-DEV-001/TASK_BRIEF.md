# Task Brief — Physical Caja Maintenance Control DEV

Status: **CLOSED — implemented, migrated to Districorr DEV, and independently verified PASS.**

- **Task:** `CAJAS-MAINTENANCE-CONTROL-DEV-001`
- **Risk:** T3 additive schema + Cajas operational UI
- **Approval:** Franco requested and then explicitly said `continua` after ownership was split on 2026-08-26.
- **Target:** confirmed disposable `Districorr DEV` database through `.env.local`.

## Objective

Turn the existing physical-Caja board into a real operational control surface that:

- preserves the existing derived count of distinct performed/finalized surgeries per physical Caja;
- records independent repair or preventive-maintenance cases without requiring a Surgery assignment;
- follows explicit control states with append-only transition evidence;
- removes visible demo/test controls and wording from production Cajas surfaces.

## Product contract

- Physical Caja identity is `StockIdentifiedUnit`; `CajasBoxFormula` remains the model/formula.
- A use/CX remains one distinct assigned Surgery with `cxStatus IN (performed, finalized)`; no new counter is persisted.
- Maintenance kinds: `REPAIR | PREVENTIVE_MAINTENANCE`.
- Statuses: `OPEN → SENT → RETURNED_PENDING_REVIEW → CLOSED`; `OPEN → CANCELLED` is also allowed.
- Creation defaults to `OPEN`; transitions are explicit, server-timestamped, actor-attributed, audited, idempotent, and company-scoped.
- A case belongs to one physical Caja and may optionally identify one Article/instrument type. Per-piece serialized instrument tracking is excluded.
- Maintenance state is informational in this slice: it does not mutate Box availability, assignment eligibility, stock occupancy, or Cirugías.
- Existing Stock operation mutation guard is reused unchanged; no Auth, role, or permission-policy edits.
- `/cajas` becomes the write host only for this bounded maintenance workflow; existing assignment-bound exception capture remains intact.

## Owned files

- `prisma/schema.prisma` — additive maintenance models/relations only.
- `prisma/migrations/20260827010000_cajas_maintenance_control_v1/migration.sql`.
- `src/lib/validators/cajas.ts`.
- new `src/lib/services/cajas-maintenance.service.ts`.
- `src/lib/services/cajas-operational.service.ts`.
- new maintenance API routes below `src/app/api/companies/[companyId]/cajas/units/[unitId]/maintenance/**`.
- `src/app/cajas/page.tsx`.
- `src/components/boxes/BoxesOperationalIndex.tsx`.
- `src/components/boxes/PhysicalUnitDetail.tsx`.
- `src/features/boxes/presentation/boxes-presentation-fixtures.ts`.
- `src/app/cajas/presentacion/page.tsx` only to prevent production exposure.
- focused Cajas maintenance/operational/component tests.
- this Change Pack and `knowledge/worklog/WORKLOG.md`.

## Forbidden

- Article/Stock form, catalog API/UI, Article services/validators/adapters, or the other session's files.
- Existing schema cleanup, XADMIN, backfill, Cajas formula/type cutover, Cirugías flow changes, Auth/roles/policies.
- Seed, fixture mutation, production/staging, deploy, reset, destructive SQL, commit, push, or PR.

## Validation

- Prisma format/validate/generate and migration artifact checks.
- Focused service, route, operational projection, component, and accessibility tests.
- TypeScript/ESLint focused checks, Impeccable detector, browser QA when authenticated runtime is available.
- Apply only the package migration to the confirmed disposable DEV DB after proving it is the sole pending migration.
- Independent final review.

## Stop conditions

- Another active owner claims an owned file.
- Any implementation requires changing maintenance state into assignment availability or core Cirugías behavior.
- More than the authorized migration is pending.
- The same proven blocker survives two minimal Diagnose cycles.

## Closure

- Added independent repair/preventive-maintenance cases for physical Cajas with audited, idempotent, append-only state evidence.
- Preserved the existing derived `Usos/CX` rule and all Cirugías, assignment, availability, and stock behavior.
- Applied only `20260827010000_cajas_maintenance_control_v1` to the confirmed disposable Districorr DEV database.
- Post-migration validation: schema current, Prisma valid, 10 formulas/10 units readable, and maintenance tables accessible with zero synthetic records.
- Focused service, route, persistence, projection, component, accessibility, and no-company regressions: 9 files, 52/52 tests PASS.
- Focused ESLint, diff check, and Impeccable detector: PASS.
- Initial independent review blockers for history integrity and no-company loading were corrected; backend, UI, and post-migration reviews finished PASS.
- Browser QA remains pending only because no authenticated localhost runtime was available; this does not reopen implementation ownership.
- No Article/Stock catalog files owned by the parallel session were changed by this package.
