# Cajas Demo Physical Units DEV

## Approval

Franco approved creating ten identified physical boxes in the confirmed disposable DEV database on 2026-08-25.

## Objective

Create one stock-backed `Caja identificada` for each existing `DEMO-*` formula so `/cajas` Operation renders real physical units.

## Scope

- Target only active `Districorr DEV` under active `ossum-dev` in the approved Supabase DEV project.
- Require an explicit one-run server-side enable flag and fail closed on any target mismatch.
- Give each box article a `SERIAL` traceability requirement and an alternative-code identifier when absent.
- Create each physical unit through the existing Goods Receipt confirmation service so Stock evidence, command acceptance, policy, position, projection, configuration, and audit records remain coherent.
- Create exactly one unit per formula, with stable `CAJA-DEMO-001` through `CAJA-DEMO-010` serials.
- Be idempotent and reject collisions or drift.
- Correct the shared article-identifier update path if PostgreSQL rejects Prisma's partial-index upsert during the approved flow.
- Correct the existing C14 current-configuration guard's invalid uppercase enum literal with a narrowly scoped migration, then apply it only to the confirmed disposable DEV database.
- Include the identified unit's internal-code snapshot in receipt evidence when required by the existing C14 Stock evidence guard.

## Exclusions

- No Prisma model change, Auth, permissions, production, staging, application deploy, commit, physical assignment, preparation, control, dispatch, or return.
- No claim that DEMO serials correspond to physical legacy stock.

## Validation

- Missing enable flag and wrong Supabase identity reject before database access.
- First approved run creates ten confirmed receipts and ten identified units; second run creates nothing.
- Stock projections show one available physical unit per DEMO box.
- `getOperationalIndex` returns ten DEMO formulas with one matching unit each.
- Focused tests, ESLint, TypeScript inspection, build, and independent review.
