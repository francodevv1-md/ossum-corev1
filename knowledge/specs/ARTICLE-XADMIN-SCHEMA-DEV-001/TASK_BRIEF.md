# Task Brief — Article XADMIN Additive Schema

Status: **CLOSED — implementation and independent review PASS; migration intentionally unapplied.**

- **Task:** `ARTICLE-XADMIN-SCHEMA-DEV-001`
- **Risk:** T3 schema/migration artifact
- **Approval:** Franco explicitly authorized the first DEV implementation package for additive schema and migration artifacts on 2026-08-26, without applying it to any database.
- **Owner:** Backend/DB implementation agent

## Objective

Implement only the additive persistence foundation from `ARTICLE-XADMIN-TECHNICAL-DESIGN-001`:

- organization-scoped Product Category, Clinical Family, Brand, Manufacturer, and Product Line catalogs;
- catalog aliases with tenant-safe typed targets;
- nullable Article catalog references;
- lossless XADMIN import-run, stage-row, and mapping structures;
- PostgreSQL constraints/indexes/triggers required for tenancy, hierarchy, hashes, and mapping integrity.

## Transitional boundary

Do not change existing `Article.articleType String?` in this slice. Existing values (`Caja`, `Instrumental`, null) remain runtime-compatible. `STANDARD | COMPOSITE`, Cajas guard compatibility, backfill, enum cutover, and legacy-column cleanup belong to later separately approved slices.

## Allowed files

- `prisma/schema.prisma`
- `prisma/migrations/20260826190000_article_xadmin_taxonomy_v1/migration.sql`
- `src/__tests__/integration/article-xadmin-taxonomy-persistence-artifact.test.ts`
- `knowledge/specs/ARTICLE-XADMIN-SCHEMA-DEV-001/**`

## Forbidden files/actions

- all other source, test, config, schema-design, and migration files;
- Cajas services, API, UI, validators, permissions, Auth, scripts, seeds, worklog, or closed specs;
- migration execution, DB access, backfill, data mutation, deploy, commit, push, or PR.

## Required implementation

1. Reuse current Prisma naming, mapped constraints, organization composite FKs, and PostgreSQL partial-index conventions.
2. Add only nullable Article FKs; preserve existing scalar brand/manufacturer/family fields for later reconciliation.
3. Make root/child category active-name uniqueness NULL-safe with two partial unique indexes.
4. Keep CHECK constraints row-local; use a deferred constraint trigger for parent depth, active parent, cycle, and subtree depth <=3.
5. Separate immutable file hash and row hash fields; require 64-character lowercase hex and tenant-safe run/stage/mapping chains.
6. Enforce alias kind/target and mapping status/axis/target integrity with SQL CHECKs.
7. Preserve Fabricado/Reventa and absent Sector only as stage evidence/status; no automatic mapping or seed data.

## Validation

- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- focused persistence artifact test
- `git diff --check`
- independent review

## Stop conditions

- Any migration execution or DB access is required.
- Existing dirty schema changes must be reverted or reformatted outside the owned additions.
- A requirement needs permission, API, UI, Cajas, backfill, or business-semantic decisions.

## Closure

- Prisma format, validate, and generate: PASS.
- Focused persistence artifact test: PASS.
- Independent review: PASS after correcting source-file idempotency.
- No DB access, migration execution, seed, backfill, or data mutation occurred.
- This closure does not authorize migration execution or later API/UI/Cajas slices.
