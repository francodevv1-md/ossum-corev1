# Task Brief — Article XADMIN Technical Design

- **Task:** `ARTICLE-XADMIN-TECHNICAL-DESIGN-001`
- **Risk:** T3 design-only package
- **Approval:** Franco explicitly authorized opening the exact schema/API/UI/Cajas compatibility design package on 2026-08-26.
- **Mode:** architecture/design documentation only

## Objective

Produce one exact, implementable technical design for:

- `Article.articleType = STANDARD | COMPOSITE`;
- governed Product Category hierarchy, Clinical Family, Brand, Manufacturer, and optional Product Line;
- lossless XADMIN legacy evidence and mapping statuses;
- Article API contracts and reusable catalog lookup contracts;
- Article form single-selection and Stock descendant-aware multi-selection;
- safe Cajas compatibility transition from literal `articleType = "Caja"` to `CajasBoxFormula.currentVersionId` evidence.

## Governing inputs

- `knowledge/specs/ARTICLE-XADMIN-MIGRATION-MATRIX-001/MIGRATION_MATRIX.md`
- `knowledge/specs/ARTICLE-XADMIN-MIGRATION-MATRIX-001/IMPLEMENTATION_BRIEF.md`
- `knowledge/specs/STOCK-V1-E01-SCHEMA-DESIGN-001/V1.1-ARTICLE-MASTER-FUNCTIONAL-SPEC.md`
- `knowledge/specs/STOCK-V1-E01-SCHEMA-DESIGN-001/SPEC.md`
- `knowledge/specs/STOCK-V1-E01-SCHEMA-DESIGN-001/DESIGN.md`
- current `prisma/schema.prisma`, Article services/validators/routes, Stock UI, and Cajas services as read-only evidence.

## Owned files

- `knowledge/specs/ARTICLE-XADMIN-TECHNICAL-DESIGN-001/TASK_BRIEF.md`
- `knowledge/specs/ARTICLE-XADMIN-TECHNICAL-DESIGN-001/LOCK.md`
- `knowledge/specs/ARTICLE-XADMIN-TECHNICAL-DESIGN-001/DESIGN.md`

## Forbidden writes and actions

- `prisma/schema.prisma` and every migration directory;
- application, API, service, validator, UI, Auth, permission, seed, script, test, or configuration file;
- DB access, backfill, seed/import execution, data mutation, deploy, commit, push, or PR;
- edits to the closed migration-matrix package or the reconciled E01 documents.

## Required design contents

1. Exact proposed models, fields, relations, constraints, indexes, tenancy, lifecycle, aliases, and hierarchy invariants.
2. Exact request/response contracts and endpoint inventory, without implementation.
3. UI component/data-flow design for Article selectors, quick creation, governed Settings changes, and descendant filters.
4. Ordered Cajas compatibility and Article-type cutover with rollback boundaries.
5. Lossless staging/backfill design with mapping statuses and validation/reconciliation queries.
6. Ownership slices, implementation sequence, tests, observability, and explicit approval gates.
7. No invented Sector mapping and no automatic Fabricado/Reventa semantics.

## Validation

- Cross-check every relation and compatibility claim against current code/schema.
- `git diff --check` on owned artifacts.
- Independent read-only design review.

## Stop conditions

- Scope requires deciding Sector semantics, roles/permissions, production behavior, or destructive migration.
- Existing ownership overlaps appear.
- The design requires implementation or data access to resolve an ambiguity.
