# Task Brief — Surgery visible-number uniqueness DEV

## Objective

Prevent duplicate human-facing Surgery numbers within one company and repair existing disposable DEV duplicates deterministically.

## Approved scope

- Add database uniqueness for `(companyId, visibleNumber)`.
- Repair existing non-null duplicates before creating the unique index.
- Retry generated-number conflicts without weakening explicit legacy imports.
- Add focused unit and migration tests.
- Apply only to the confirmed disposable Districorr DEV database and verify the result.

## Human approval evidence

- Franco confirmed the affected records were test data and requested prevention: `perfecto verifica cx-0005 son todos datos de prueba pero evita que vuelva a pasar`.
- After the dirty-worktree ownership warning, Franco explicitly authorized integration: `autoriza y arregla`.
- After GGA requested approval evidence for schema and migration, Franco responded: `APRUEBO EXPLICITAMENTE`.
- Approval date: 2026-09-03. Scope remains DEV-only under the exclusions below.

## Exclusions

- Production or staging.
- Auth, roles, provider changes, fiscal behavior, or unrelated Surgery refactors.
- Deleting Surgery records.

## Validation

- Focused tests, Prisma format/generate, TypeScript, build, migration status, DEV duplicate query, independent review.
