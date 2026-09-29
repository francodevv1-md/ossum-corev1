# ANTIGRAVITY-DEV-SEED-AND-FISCAL-SMOKE-001

## Objective

Run the approved deterministic Prisma seed against the confirmed disposable Antigravity DEV database and prove the seeded operational records and fiscal Prisma delegate are readable without creating fiscal evidence.

## Scope

- Seed only through `npx prisma db seed --schema prisma/schema.prisma`.
- Use the project Prisma client for read-only Company, Surgery, and `FiscalDocument` checks.
- Validate migration status, focused fiscal tests, and the working-tree diff.

## Boundaries

No source, schema, migration, environment, provider, Auth, browser, direct SQL, deployment, commit, or push activity.

## Preflight

The discrepancy was reproduced in this exact worktree: `npx prisma migrate status --schema prisma/schema.prisma` reports two migrations and an up-to-date database. The earlier mismatch came from the wrong worktree.

## Execution result

The first approved seed run blocked on `P2002` for `ContactCompanyLink(companyId, code)`. The subsequently approved minimal `prisma/seed.ts` correction assigns unique deterministic codes in both upsert paths; the rerun completed successfully. Read-only Prisma smoke confirmed the seeded company, nine surgeries, and readable `FiscalDocument` delegate without fiscal records.
