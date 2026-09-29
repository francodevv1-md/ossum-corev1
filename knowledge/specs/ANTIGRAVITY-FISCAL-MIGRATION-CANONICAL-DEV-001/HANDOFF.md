## Handoff

### Done

Created the canonical forward-only DEV_ONLY fiscal migration without historical migration edits.
Executed the approved disposable-DEV preflight only; migration application was stopped safely before any schema or data change.

#### Execution update — 2026-09-28

The approved disposable DEV database was subsequently reset through the clean Antigravity baseline. Prisma applied `0_antigravity_dev_baseline` followed by `20260928120000_add_fiscal_dev_only_evidence` successfully. `prisma migrate status` reports the schema up to date. No seed, provider/API, Auth, raw SQL, or real-data action ran.

### Changed

- Added `FiscalDocumentState`.
- Added `FiscalDocument`: one immutable snapshot per invoice with company scope.
- Added `FiscalIssuanceAttempt`: ordered attempt evidence with company scope.
- Added Company and Invoice relation fields plus fiscal-only indexes and restrictive foreign keys.
- Set the ownership lock to `editing` for the database execution phase. It remains held because the required safe preflight gate did not pass.

### Files

- `prisma/schema.prisma`
- `prisma/migrations/20260928120000_add_fiscal_dev_only_evidence/migration.sql`
- `knowledge/specs/ANTIGRAVITY-FISCAL-MIGRATION-CANONICAL-DEV-001/{TASK_BRIEF.md,LOCK.md,HANDOFF.md}`

### Validations

- `npx prisma format --schema prisma/schema.prisma` passed.
- `npx prisma validate --schema prisma/schema.prisma` passed.
- `npx prisma generate --schema prisma/schema.prisma` passed without database access.
- Offline `prisma migrate diff --from-schema ... --to-schema ... --script` produced the migration SQL; byte comparison passed.
- Migration SQL contains only enum/table/index/foreign-key additions; no destructive statements were found on manual inspection.
- `git diff --check` passed.
- Diagnose: Prisma 7.8 rejects the removed `--from-schema-datamodel` flag; the documented replacement `--from-schema` produced the reviewed diff. No schema or migration correction was needed.
- `npx prisma migrate status --schema prisma/schema.prisma` stopped before deploy: the last common migration is `20260903130000_contacts_backend_authority`; the only local unapplied migration is `20260928120000_add_fiscal_dev_only_evidence`; however, the connected database reports migration-history entries absent from this worktree. Per task stop conditions, no `migrate deploy`, Prisma client generation, tests, persistence smoke, provider call, seed, raw SQL, or real-data action ran.
- Diagnose cycle #2 (read-only): repeated `npx prisma migrate status --schema prisma/schema.prisma`; result unchanged. The database reports 21 unique migration identifiers missing from Antigravity, all present as root directories, plus repeated history rows for `20260811000000_remito_qr_barcode_001` and `20260820190000_receipt_preparation_v1`.
- Root-versus-Antigravity directory comparison: Antigravity is missing those 21 database-reported directories, but root also contains two directories that the database did not report (`20260921020000_stock_reservation_evidence_command_reservation_unique` and `20260923134500_fiscal_tusfacturas_dev`). Copying every root-only directory would therefore introduce unrelated pending migrations rather than leave only `20260928120000_add_fiscal_dev_only_evidence` pending.
- Checksum evidence: the recorded DEV checksum for `20260820190000_receipt_preparation_v1` is `f044745e16341711f17796b9439bf7ff51941c76f669e075f9307ec2ebd2f963`; root's exact file is `f8d954774f3850eac90932f02954327774f00eaf9e180d67aabb117d7f6169c1`. The recorded DEV checksum for the already-local `20260903030000_surgery_visible_number_uniqueness` is `efa3d2e676fdd9f68048024a6fa2538abf18ce84622049fd54228f09064caa2b`; neither root nor Antigravity's local copy matches it. Therefore checksum/schema divergence already exists independently of the missing directories.
- No existing safe read-only Prisma mechanism in this worktree exposes `_prisma_migrations` checksums. No direct database query was introduced. No migration, schema, SQL, application, provider, or real-data mutation occurred.

### Risks

Fiscal runtime/services/UI remain intentionally absent from Antigravity. The migration is unexecuted. The connected database's migration history must be reconciled or an explicitly disposable DEV database with a compatible migration lineage must be provided before this migration can be safely applied.
Copying root migration directories is unsafe: it cannot restore the exact applied history while the two known checksum mismatches remain, and a bulk copy would add two unrelated root-only pending migrations.

### Next

Do not run `migrate deploy` or copy migration directories against this connection. Minimal recovery action: obtain authoritative raw-byte artifacts matching the recorded DEV checksums for `20260820190000_receipt_preparation_v1` and `20260903030000_surgery_visible_number_uniqueness`, then use an approved read-only migration-metadata report to verify every remaining database-reported identifier before restoring only exact directories. If artifacts cannot be recovered, use the controlled new disposable fiscal-reconciliation baseline route instead.
