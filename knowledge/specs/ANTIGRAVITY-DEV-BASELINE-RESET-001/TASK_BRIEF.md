# Task Brief — ANTIGRAVITY-DEV-BASELINE-RESET-001

## Objective

Replace the incompatible local Prisma migration lineage with a clean Antigravity DEV baseline and retain `20260928120000_add_fiscal_dev_only_evidence` as the sole forward migration.

## Scope

- Derive `0_antigravity_dev_baseline` from `git show HEAD:prisma/schema.prisma`.
- Archive the exact pre-baseline migration directories outside `prisma/migrations`.
- Verify that baseline plus the unchanged fiscal migration equals the current schema.
- Reset only the explicitly confirmed disposable DEV database if Prisma can skip the configured seed.

## Guardrails

- No `db push`, `migrate dev`, raw SQL execution, `migrate resolve`, seed, provider, auth, production, staging, or real-data action.
- Stop before reset if `migrate reset --force --skip-seed` is unsupported.
