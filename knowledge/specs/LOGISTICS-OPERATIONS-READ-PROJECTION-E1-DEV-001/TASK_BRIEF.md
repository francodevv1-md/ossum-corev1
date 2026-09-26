# Task Brief — E1 Logistics Operations Read Projection

## Objective

Expose a company-scoped, backend-authoritative, read-only logistics projection for one Surgery and an ambiguity-safe code resolver as defined in `DESIGN.md`.

## Scope

- Compose persisted Phase B/C/D physical facts without writes, schema changes, or a persisted read model.
- Derive tenant-scoped read access and action capabilities on the server.
- Return `none`, `exact`, or `ambiguous` scan outcomes without silently selecting a candidate.
- Keep missing/legacy aggregate facts explicit as blockers or unavailable.

## Exclusions

Mutations, UI, Prisma schema/migrations, Auth architecture, billing, purchase/replenishment, dependencies, deployment, and Git actions.

## Validation

Focused unit and route tests for isolation, physical mapping, unavailable facts, capabilities, all resolver outcomes, and no write side effects; then TypeScript typecheck.
