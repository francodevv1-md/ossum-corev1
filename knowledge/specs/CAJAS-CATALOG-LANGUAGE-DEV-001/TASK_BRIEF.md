# Cajas Catalog Language DEV

## Objective

Make `/cajas` distinguish catalog models from physical units and explain formula revisions in plain operational Spanish, while keeping DEMO data visibly identified as non-commercial reference data.

## Scope

- Replace internal `vN` language with `Revisión N` of the expected contents.
- Use the current formula version number instead of the aggregate persistence version.
- Fix date formatting for API ISO timestamps so `Invalid Date` is never rendered.
- Naturalize catalog counts, headings, metadata, history, units, and identifier labels.
- Explain that DEMO entries came from `CAJAS.XLS` and require operational confirmation.

## Write set

- `src/app/cajas/page.tsx`
- `src/app/cajas/[id]/page.tsx`
- `src/lib/services/cajas.service.ts`
- `src/lib/formatters.ts`
- Focused unit tests for Cajas mapping and dates.
- `src/__tests__/components/CajasCatalogPage.test.tsx`

## Exclusions

- No schema, migration, seed, Auth/roles, business-rule, physical-unit, assignment, preparation, Remito, production, deploy, dependency, commit, push, or PR changes.

## Validation

- Focused tests, ESLint, TypeScript inspection, build, and independent read-only review.
