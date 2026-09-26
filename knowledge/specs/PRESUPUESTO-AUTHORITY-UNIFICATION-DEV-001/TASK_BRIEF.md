# Task Brief — Presupuesto Authority Unification DEV

## Approval and objective

- **Change:** `PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001`
- **Status:** **COMPLETED T3 DEV — implementation and validation passed**
- **Approval:** Franco explicitly approved this finite DEV package on 2026-08-30. Canonical rules are recorded in Engram #6118.
- **Objective:** make Prisma/API the sole visible Presupuesto authority across `/ventas/presupuestos`, New Surgery, and Expediente while enforcing the approved commercial, version, state, concurrency, and audit contract.
- **Exclusions:** production/staging/deploy, Auth/role changes, fiscal billing, unrelated Cirugías refactors, Orden/Pedido backend, provider/dependency changes, commit, push, and PR.

## Task declaration and ownership lock

| Field | Binding value |
|---|---|
| Owner | Backend/DB + integration implementer |
| Selected LLM | `openai/gpt-5.6-sol` |
| Mode | proposal now; later implementation/testing/QA under this pack |
| Current application/docs lock | `released`; S7.1d application/test/docs writer is complete and remaining S0.2/S7.3 work is read-only |
| Application lock lifecycle | one writer, `reserved → editing → review → released` per slice |
| Concurrency | no parallel writer in schema, Presupuesto API/service/validator, store/types, New Surgery, or Expediente chain |
| Handoff | Caveman `Done / Changed / Files / Validations / Risks / Next` |

## Approved behavior

1. A Surgery has at most one active Presupuesto family; a Presupuesto may remain standalone.
2. `Borrador` is editable. Any version that has been emitted is immutable.
3. A later revision creates a new `Borrador` in the same family without changing the prior version.
4. Emitting the replacement atomically marks the prior current version `Reemplazado` and the draft `Emitido`.
5. Only authoritative `Emitido`/`Aprobado` records may be emailed.
6. Every accepted mutation is company-scoped, expected-revision protected, server-calculated, and audited in the same transaction.
7. Required commercial data follows `knowledge/domain/PRESUPUESTOS.md`; the canonical Districorr estimative legend is preserved when applicable.

## Delivery slices

1. **Persistence:** schema + one migration artifact; prove existing DEV data compatibility; apply only to the confirmed disposable DEV target.
2. **Backend:** validator/service/routes, immutable commands, audit, email eligibility, focused unit/integration tests.
3. **UI cutover:** API client/hook; Sales, New Surgery, and active Expediente commercial surface; remove Presupuesto local writes only after parity.
4. **Validation:** regression, build/typecheck, authenticated browser QA, no-local-authority proof.

Each slice requires focused review before releasing its lock. The package is expected to exceed 400 changed lines, so review must remain sliced even though commit/PR creation is forbidden.

## Command boundary

**Allowed:** read/search; path-limited `git status/diff/log/diff --check`; existing npm scripts; focused Vitest/ESLint; `npx prisma format`, `validate`, `generate`, `migrate status`, migration authoring/application against the confirmed disposable DEV database; local dev server and Playwright/browser QA.

**Forbidden:** production/staging/deploy; any unconfirmed database; `prisma db push`; seed/backfill/reset or destructive SQL without a new exact approval; dependency install/update; secret output; destructive Git, stash/reset/checkout restoration, commit/amend/push/PR/merge; edits outside the Change Pack allowlist.

## Validation required

- Prisma format/validate/generate; migration static review and disposable-DEV runtime proof.
- Focused unit/integration/component/E2E tests for commercial totals, states, immutable versions, stale revision/races, tenant isolation, audit, and email eligibility.
- Typecheck, focused lint, build, `git diff --check`, and changed-path proof.
- Authenticated browser QA for Sales → Surgery → Expediente continuity and refresh persistence.
- Search/test evidence that visible Presupuesto actions no longer read or write Zustand/localStorage.

## Stop conditions

Stop on ownership overlap, target identity uncertainty, legacy data violating a non-destructive migration, missing business semantics, required Auth/role/fiscal/Orden scope, unrelated Cirugías refactor, dependency/provider need, failed invariant review, or validation failure not resolved by a minimal Diagnose cycle.

## Rollback

Reverse only owned, unaccepted edits. After disposable-DEV migration, stop writes and use a reviewed roll-forward correction; any reset/rebuild needs separate destructive confirmation. Never restore local authority, rewrite emitted history, or overwrite unrelated work.

## Current preflight note

The root worktree is heavily dirty. Relevant overlaps already exist in `prisma/schema.prisma`, `/ventas/presupuestos`, New Surgery, `ExpedienteFullView`, and `useCirugiaActions`; migration directories and email/PDF files are also untracked. These paths are read-only until ownership and exact baseline are proven. Do not overwrite or “clean” them.
