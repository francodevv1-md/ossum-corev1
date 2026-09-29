## Handoff

### Done

- Created the canonical `0_antigravity_dev_baseline` from the exact Git HEAD pre-fiscal schema.
- Preserved `20260928120000_add_fiscal_dev_only_evidence` byte-for-byte as the next migration.
- Archived the 22 replaced migration directories with raw SQL unchanged.
- Reset the explicitly confirmed disposable DEV database and applied both active migrations without seeding.

### Changed

- Active migration lineage is now exactly:
  1. `0_antigravity_dev_baseline`
  2. `20260928120000_add_fiscal_dev_only_evidence`
- The baseline SQL SHA-256 is `e463410babb81b424236b1268896e51332c8005f1674d93c633c6e54d8a56701`.
- The fiscal migration SQL SHA-256 remains `006a504524c565cb6be2894422d946d894ead91f26ef10f3d2c47a53315c8f65`.

### Files

- `prisma/migrations/0_antigravity_dev_baseline/migration.sql`
- `prisma/migrations/20260928120000_add_fiscal_dev_only_evidence/migration.sql`
- `knowledge/archive/antigravity-prebaseline-migrations-20260928/`
- `knowledge/specs/ANTIGRAVITY-DEV-BASELINE-RESET-001/{TASK_BRIEF.md,LOCK.md,HANDOFF.md}`

### Validations

- `git show HEAD:prisma/schema.prisma` was used as the pre-fiscal source; `prisma validate` passed for that temporary schema.
- `prisma migrate diff --from-empty --to-schema <pre-fiscal HEAD> --script` generated the active baseline.
- The baseline excludes fiscal objects.
- `prisma migrate diff --from-schema <pre-fiscal HEAD> --to-schema prisma/schema.prisma --script` matches the canonical fiscal migration after newline normalization; no schema discrepancy emerged.
- Archive SQL blobs match Git HEAD for all 22 archived migration directories.
- `prisma validate --schema prisma/schema.prisma` passed.
- `prisma migrate reset --help` on Prisma 7.8 exposes no `--skip-seed` option.
- Diagnose correction: Prisma's v7 documentation states automatic seeding was removed from `migrate reset`; seeds run only through explicit `prisma db seed`. The installed 7.8 CLI exposes `migrate reset --force` and no seed flag, consistent with this v7 behavior.
- `prisma.config.ts` registers `tsx prisma/seed.ts`, but registration alone does not execute it under Prisma 7 reset behavior.
- Static inspection of `prisma/seed.ts`: it is idempotent and uses deterministic CUIDs/upserts for DEV organization, company, branch, user/access, contacts, address/group, one demo surgery, eight mock surgeries, and an audit event. It connects only to `DIRECT_URL` through `pg`/Prisma; it has no provider SDK, Auth API, HTTP client, secret output, or external-service call.
- `npx prisma migrate reset --force` completed successfully and applied `0_antigravity_dev_baseline` then `20260928120000_add_fiscal_dev_only_evidence`; no `prisma db seed` command ran.
- `npx prisma migrate status` reports `Database schema is up to date!` with exactly two local migrations.
- `npx prisma validate --schema prisma/schema.prisma` passed.
- `npx prisma generate --schema prisma/schema.prisma` passed.
- Focused fiscal Vitest suite passed: 31 tests across 7 files.
- Scoped ESLint and `git diff --check` passed.

### Risks

- The DEV database was intentionally emptied and has no seeded operational data yet.
- No provider/API, Auth, real-data, or seed action ran.

### Next

The baseline is ready for DEV data to be created deliberately. Do not run `prisma db seed` unless an explicit seed request is approved.
