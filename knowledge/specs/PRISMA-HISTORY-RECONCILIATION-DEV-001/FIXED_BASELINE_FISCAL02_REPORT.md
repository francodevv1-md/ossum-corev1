# Fixed Baseline and FISCAL-02 Report — 2026-09-24

## Baseline fix applied

The isolated baseline generator removed exactly one pg_dump preamble command:

```sql
SELECT pg_catalog.set_config('search_path', '', false);
```

All 53 function-local `SET search_path TO ''` clauses, extensions, tables, functions, triggers, checks, exclusions, deferrable constraints, indexes, and foreign keys remain in the baseline.

Fixed baseline SHA-256: `496696888e7431f980dceeb1d65e8710bcb83c9a94f82ffae50d14168e1883d0`.

## Verified target

- Database: `ossum_fiscal_reconciliation_dev_fixed_20260924`.
- Purpose: new disposable fiscal-reconciliation DEV target only; created from `template0` without legacy data.
- Baseline migration: `20260924000000_legacy_dev_reconciliation_baseline` — applied.
- Baseline parity: 123 tables, 90 triggers, 128 checks, one exclusion constraint, 18 deferrable objects, and five explicit extensions. These match the legacy schema-only parity report.

## FISCAL-02 delta

The broad Prisma schema diff was reviewed and rejected because it proposed unrelated GoodsReceipt, StockReservation, SurgeryPreparation, Presupuesto, Remito, article and constraint/index changes.

Instead, the isolated delta `20260924002000_fiscal_tusfacturas_dev_rebased` was created solely from the approved FISCAL-02 schema artifact: one fiscal enum, `fiscal_document`, `fiscal_issuance_attempt`, their fiscal-only indexes, and four fiscal foreign keys. It was then applied only to the verified target.

### Diagnose note — temporary staging P3015

The rejected broad-diff directory had its `migration.sql` removed but left an empty migration directory. Prisma reproduced `P3015: Could not find the migration file at migration.sql` before executing any target migration. The minimal fix was a new temporary migration root containing only the already-applied baseline and the reviewed fiscal-only delta. Re-running `migrate deploy` then applied only `20260924002000_fiscal_tusfacturas_dev_rebased`; no schema repair, reset, resolve, or ledger write was used.

Target post-apply state:

- 125 public tables (baseline 123 plus two fiscal tables).
- Both fiscal tables and `FiscalDocumentState` exist.
- `prisma migrate status` reports the two isolated migrations applied and the target up to date.

## Validation

- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- Focused fiscal/invoice tests: 28/28 passed.
- `npm run typecheck`: still fails only at the pre-existing out-of-scope ContactAddress `companyId` omissions in `prisma/seed.ts`, `contacts-code-concurrency-postgres.test.ts`, and two `contact.service.ts` paths.
- Prisma format was not run against the shared dirty active schema because it could rewrite files outside this task's allowed scope.

## Boundary

No provider calls, credentials, FISCAL-03 work, webhook work, data copy, legacy source write, reset, resolve, or manual migration-ledger action occurred.

FISCAL-02 is complete on the isolated disposable target, subject only to the documented unrelated repository-wide typecheck baseline. FISCAL-03 remains separately blocked by DEV provider credentials.

## Reproducible lineage evidence

Exact raw SQL copies for the two target-applied isolated migrations are preserved under `artifacts/`, outside `prisma/migrations`:

| Migration | Artifact SHA-256 | Read-only target checksum |
| --- | --- | --- |
| `20260924000000_legacy_dev_reconciliation_baseline` | `496696888e7431f980dceeb1d65e8710bcb83c9a94f82ffae50d14168e1883d0` | `496696888e7431f980dceeb1d65e8710bcb83c9a94f82ffae50d14168e1883d0` |
| `20260924002000_fiscal_tusfacturas_dev_rebased` | `592a023de0aeb920cc564c3250bd1520315fa6e648f99090016ef8e116a187c8` | `592a023de0aeb920cc564c3250bd1520315fa6e648f99090016ef8e116a187c8` |

`artifacts/MANIFEST.json` records the approved Temp source paths, source provenance, target identifier, raw SHA-256 values, and target migration checksums. These copies are immutable reconciliation evidence only: they are not active Prisma migration history, do not replace any missing legacy artifact, and must not be moved into `prisma/migrations`.
