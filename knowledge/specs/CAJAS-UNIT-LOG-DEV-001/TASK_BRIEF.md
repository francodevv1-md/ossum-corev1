# TASK BRIEF — CAJAS-UNIT-LOG-DEV-001

## Objective

Deliver a minimal DEV log for each physical Box that answers:

- how many performed surgeries used it;
- which dispatched instruments were used or sterilized;
- which instrument reported a problem;
- which instrument was sent to repair and how many times.

## Approved product rule

A physical Box counts one use for each distinct Surgery where it was assigned and the Surgery reached `performed` or `finalized`. Consumption is not required because the Box and its instruments were still used or sterilized.

## Elon/Musk simplification

- Derive uses from `CajasAssignment + Surgery`; never ask the operator to register a use.
- Derive used instruments from accepted dispatch evidence; never duplicate that capture.
- Persist only exception events: problem reported, sent to repair, returned from repair.
- Derive totals and repair recurrence from history; do not persist counters.
- Exclude monetary profitability until revenue and cost allocation rules exist.

## Scope

- Append-only, company-scoped physical-Box log entries.
- Minimal capture in `Expediente → Cajas`.
- Read-only aggregate and chronology in `/cajas` physical-unit detail.
- Focused schema artifact, service/API/component tests, Prisma validation and UI validation.

## Allowed files

- `prisma/schema.prisma`
- `prisma/migrations/20260826123000_cajas_unit_log_v1/migration.sql`
- `src/lib/validators/cajas.ts`
- `src/lib/services/cajas-assignment-preparation.service.ts`
- `src/lib/services/cajas-operational.service.ts`
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/cajas/log/route.ts`
- `src/components/expediente/CajasTabContent.tsx`
- `src/components/boxes/PhysicalUnitDetail.tsx`
- `src/app/cajas/page.tsx`
- `src/features/boxes/presentation/boxes-presentation-fixtures.ts`
- focused Cajas tests
- this Change Pack

## Exclusions

- Monetary profitability, billing, costs, depreciation, or fiscal behavior.
- New Auth roles or permission rules.
- Production/staging/deploy or real-data mutation.
- Independent maintenance, sterilization, or repair workflow.
- Refactor of `/cirugias`, remittance, return, consumption, or stock movement logic.
- New dependency.

## Validation

- Prisma format and validate/generate.
- Focused service, route, and component tests.
- TypeScript/ESLint focused validation.
- Browser QA for `Expediente → Cajas` and physical-unit history when available.

## Approval evidence

Franco approved the DEV schema/migration and `Expediente → Cajas` flow in chat on 2026-08-26 after confirming the use-count rule.
