# Prisma P1014 Fresh-Target Diagnose Report — 2026-09-24

## Reproduce

- Created one new disposable probe database: `ossum_fiscal_reconciliation_probe_dev_20260924` from `template0`; no legacy data was copied.
- Applied only the existing reviewed baseline migration with sanitized, minimal Prisma engine diagnostics.
- Prisma reproduced the same failure after `Applying migration 20260924000000_legacy_dev_reconciliation_baseline`:

```txt
Error: P1014
The underlying table for model `_prisma_migrations` does not exist.
```

No connection string, credential, or token was retained in the diagnostic artifact.

## Scope

The failure is limited to the isolated baseline deployment process. Legacy DEV, the original failed target, FISCAL-02, and provider integrations were not touched.

## Evidence

1. Both isolated targets reach full schema-object parity before the error: 123 tables, 90 triggers, 128 checks, one exclusion constraint, and 18 deferrable objects.
2. Both targets have a standard Prisma `_prisma_migrations` ledger table with exactly one unfinished baseline row and null logs.
3. The baseline has no executable source `_prisma_migrations` DDL; only pg_dump comments remain.
4. The baseline executes this session-scoped command before Prisma writes its ledger completion:

```sql
SELECT pg_catalog.set_config('search_path', '', false);
```

`false` makes the empty `search_path` persist for the migration connection. The subsequent Prisma ledger operation addresses `_prisma_migrations` without a schema and cannot resolve the existing `public._prisma_migrations` table, producing P1014.
5. The many `SET search_path TO ''` clauses inside dumped function definitions are function-local configuration and do not change the migration connection's session path.

## Concrete minimal process fix — not applied

In the isolated baseline generator only, remove the single session command:

```sql
SELECT pg_catalog.set_config('search_path', '', false);
```

Keep function-local `SET search_path TO ''` clauses, extension declarations, and all schema objects unchanged. This preserves source parity while allowing Prisma's post-migration ledger write to resolve `public._prisma_migrations`.

## Validate

- The fresh probe reproduced P1014, so the original failure is reproducible.
- No fix was applied, no fiscal delta was generated, and neither failed target may be reused.

## Regression check

- The proposed one-line generator exclusion does not remove any schema object, constraint, trigger, function, extension declaration, or data boundary.
- It affects only the Prisma migration connection's session state after the baseline's fully qualified pg_dump DDL executes.
