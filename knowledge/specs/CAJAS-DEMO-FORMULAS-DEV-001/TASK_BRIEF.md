# Cajas Demo Formulas DEV

## Approval

Franco requested 10 cases from `docs/CAJAS.XLS` with fictional formulas on 2026-08-25. The target is the confirmed disposable DEV database.

## Objective

Create ten clearly identified DEMO box formulas inspired by legacy families so `/cajas` has realistic catalog data for functional testing.

## Scope

- Target only `Districorr DEV` (`codevdistricorr100000000000`).
- Create reusable `DEMO-COMP-*` component articles when absent.
- Create ten `DEMO-*` box formulas through existing article/formula services and audit paths.
- Be idempotent: existing component articles and formulas are skipped.
- Fail closed unless the exact DEV tier, one-run enable flag, approved Supabase project identity, active organization, and active company all match.
- Reject existing DEMO records whose catalog fields or formula lines drift from this seed definition.

## Exclusions

- No schema, migration, Auth, permissions, production, staging, deploy, commit, or real fiscal data.
- No claim that fictional formula contents match the physical boxes in `CAJAS.XLS`.
- No physical identified units or operational assignments.

## Validation

- Script lint.
- Negative DEV-boundary check without `OSSUM_ENABLE_CAJAS_DEMO_SEED=true`.
- Execute against disposable DEV.
- Verify ten formulas and their line counts through `getOperationalIndex`.
- Focused Cajas tests and production build.
