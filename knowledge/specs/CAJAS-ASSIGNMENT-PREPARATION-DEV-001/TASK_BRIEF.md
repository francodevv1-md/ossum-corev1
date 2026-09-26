# Cajas Assignment + Preparation DEV

## Approval

Franco approved this DEV package on 2026-08-25 after the scope was explained as assigning one identified physical box to one Surgery and creating its formula-backed preparation.

## Objective

Add the smallest server-backed vertical slice that lets an operator assign an available `Caja identificada` to a persisted Surgery and atomically create the corresponding `CajasPreparation` from the formula version current at acceptance time.

## Product rules

- The canonical write host is the Surgery/Record (`Expediente`) under an exact `Cajas` section; `/cajas` remains summary/read-only.
- A Surgery is eligible when it belongs to the active company, is not archived, and `cxStatus` is neither `cancelled` nor `finalized`, matching the established operational convention.
- The selected physical unit must belong to the active company, have current configuration, an active Box article, a current Box formula/version, one identified Stock position, and available quantity.
- One identified Box may have at most one active Surgery assignment. Database uniqueness remains the final concurrency authority.
- Assignment and Stock reservation writers serialize on the identified-unit row before availability checks, preventing an unrelated active reservation from racing an assignment.
- One accepted command creates, in one transaction: audit evidence, command acceptance, active `CajasAssignment`, one `CajasPreparation`, and expected preparation lines copied from the bound formula version.
- Idempotent retries with the same key and intent return the original result; the same key with different intent conflicts.
- Formula edits after acceptance do not rewrite the preparation.
- This slice assigns the Box and copies expected contents. It does not reserve each component Stock article; those DEMO components do not yet have physical availability.

## API

- `GET /api/companies/:companyId/surgeries/:surgeryId/cajas` returns current assignments and candidate identified boxes, including unavailable reasons.
- `POST /api/companies/:companyId/surgeries/:surgeryId/cajas` accepts `{ unitId, idempotencyKey }`.
- Reuse authenticated company context and the existing Stock operational mutation permission (`admin`, `operator`); do not change roles or Auth.

## Exact write set

- `src/lib/services/cajas-assignment-preparation.service.ts` (new)
- `src/lib/validators/cajas.ts`
- `src/lib/permissions/stock-operations-policy.ts` (new pure shared role policy)
- `src/lib/permissions/stock-operations.ts`
- `src/lib/services/preparation.service.ts` (review-confirmed shared identified-unit lock boundary only)
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/cajas/route.ts` (new)
- `src/components/expediente/CajasTabContent.tsx` (new)
- `src/components/expediente/ExpedienteFullView.tsx`
- `src/lib/cirugias.constants.ts`
- `src/__tests__/unit/cajas-assignment-preparation.service.test.ts` (new)
- `src/__tests__/unit/cajas-assignment-preparation-route.test.ts` (new)
- `src/__tests__/components/CajasTabContent.test.tsx` (new)
- `src/__tests__/components/ExpedienteFullView.test.tsx` (new only if required for the host assertion; otherwise keep the existing suite untouched)
- `knowledge/specs/CAJAS-ASSIGNMENT-PREPARATION-DEV-001/{TASK_BRIEF,LOCK}.md`

## Forbidden

- No Prisma schema/migration/data seed, Auth/role change, production/staging/deploy, dependency, commit/push/PR, Remito, dispatch, control, return, consumption, formula editing, component reservation, or `/cajas` mutation UI.
- Do not touch `src/app/cirugias/page.tsx`, global store/types, or unrelated dirty work.

## Validation

- Service: tenant isolation, Surgery eligibility, unit/formula/Stock eligibility, exact formula snapshot copy, idempotency intent conflict, active-assignment conflict, race behavior, rollback, and no side effects on denial.
- Route: authentication/company scope, permission denial, validation, GET and POST.
- UI: backend Surgery ID, loading/error/empty/unavailable states, disabled explanations for ineligible Surgery or unauthorized role, successful assignment refresh, and no stale-company result.
- Focused tests, scoped ESLint/TypeScript, production build, browser QA, database-free independent review.
