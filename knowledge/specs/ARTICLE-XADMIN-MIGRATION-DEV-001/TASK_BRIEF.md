# Task Brief — Apply Article XADMIN Migration to Disposable DEV

Status: **CLOSED — migration applied to disposable DEV and independently verified PASS.**

- **Task:** `ARTICLE-XADMIN-MIGRATION-DEV-001`
- **Risk:** T3 DEV database mutation
- **Approval:** Franco explicitly authorized applying the previously closed migration to the confirmed disposable DEV database on 2026-08-26.
- **Target:** environment loaded from `.env.local`; DEV only.

## Objective

Apply exactly `20260826190000_article_xadmin_taxonomy_v1` to the disposable DEV database and validate its persisted topology without seeding, staging XADMIN rows, backfilling Article fields, or changing application behavior.

## Allowed files/actions

- Read migration status and target metadata without exposing credentials.
- Apply the authorized migration only if no unrelated pending migration would also execute.
- Run Prisma status/validate and read-only topology queries after execution.
- Run the focused persistence artifact test.
- Update only `knowledge/specs/ARTICLE-XADMIN-MIGRATION-DEV-001/**` and `knowledge/worklog/WORKLOG.md`.

## Forbidden

- Production/staging or any non-disposable database.
- Applying unrelated pending migrations.
- Reset, rollback, resolve-as-applied, force, drop, truncate, delete, seed, import, or backfill.
- Application/schema/migration edits, Auth, permissions, API, UI, Cajas, deploy, commit, push, or PR.

## Stop conditions

- Target cannot be demonstrated as the confirmed DEV environment.
- More than the authorized migration is pending.
- Migration fails or schema state diverges after two minimal Diagnose cycles.

## Closure

- `.env.local`: `OSSUM_DEPLOYMENT_TIER=development`; Company `Districorr DEV` independently confirmed.
- Exactly `20260826190000_article_xadmin_taxonomy_v1` was pending and applied successfully.
- Prisma migration status and schema validation: PASS.
- All nine new tables are accessible and empty.
- Legacy Article distribution remains `Caja=10`, `Instrumental=12`, `null=6`; all new Article catalog FKs remain null.
- Focused artifact test and independent review: PASS.
- No seed, XADMIN import, alias insertion, Article backfill, reset, or unrelated migration occurred.
