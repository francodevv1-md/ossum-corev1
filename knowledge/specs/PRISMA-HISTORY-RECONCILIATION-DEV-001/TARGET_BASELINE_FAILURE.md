# Target Baseline Application Failure — 2026-09-24

## Source safety

- Legacy DEV was accessed only by read-only `pg_dump` schema export.
- No source DDL/DML, reset, resolve, migration-history change, data export, or provider call occurred.

## Target identity and purpose

- Database: `ossum_fiscal_reconciliation_dev_20260924`.
- Purpose: newly created, disposable fiscal-reconciliation DEV target only.
- Creation template: PostgreSQL `template0`; no legacy data was copied.

## Reviewed baseline attempt

The isolated baseline was generated from the retained public schema-only dump, with these deliberate reviewed adaptations:

1. PostgreSQL 18 `\restrict`/`\unrestrict` client directives removed because Prisma executes SQL rather than psql meta-commands.
2. `CREATE SCHEMA public` removed because the fresh target already has `public`.
3. Source `_prisma_migrations` table and primary-key SQL removed; Prisma must own its target migration ledger.
4. The five explicitly dumped extension declarations were prepended, including their required schemas.

Baseline SQL SHA-256: `debf9d9e263507bb16cafae021ee29a7fcbecfd34fe8923f64fc3c66a14f2f40`.

## Result

`prisma migrate deploy` found the isolated baseline migration and executed its schema objects, then returned `P1014: The underlying table for model _prisma_migrations does not exist`.

Read-only target inspection after the failure found:

| Check | Result |
| --- | --- |
| Public tables | 123 (matches source) |
| Triggers | 90 (matches source) |
| Checks | 128 (matches source) |
| Exclusions | 1 (matches source) |
| Deferrable constraints/triggers | 18 (matches source) |
| Explicit extensions | 5 (matches source dump declarations) |
| Prisma ledger | Exists, but baseline row is unfinished (`finished_at` is null) |

## Gate conclusion

**STOP — the target is not a valid baseline lineage.** Although the target object counts match legacy evidence, the baseline migration is recorded as failed. The task prohibits `prisma migrate resolve`, direct `_prisma_migrations` edits, reset, or any other history repair; the target must not receive FISCAL-02 or be reused as an integration database.

## Required next action

Diagnose why Prisma 7 reports `P1014` after baseline SQL execution in a separate disposable target/workspace. Do not repair this target's ledger. FISCAL-02 and FISCAL-03 remain blocked.
