# Task Brief — E2 Logistics Action Descriptors

## Objective

Extend the E1 read-only Surgery logistics projection with server-authoritative descriptors for currently available Phase B/C preparation, control, difference-resolution, and dispatch commands.

## Scope

- Derive descriptors solely from existing command routes, validators, and persisted E1 facts.
- Include only currently available commands, authoritative target IDs, quantity limits, required human fields, current blockers/preconditions, and idempotency/concurrency metadata.
- Preserve E1 projection and resolver read-only behavior, including `none`, `exact`, and `ambiguous` scan outcomes.

## Exclusions

No mutation endpoint or command behavior change, schema/migration, UI, Auth architecture, secrets/configuration, dependencies, deployment, or Git actions.

## Validation

Focused service and route tests prove availability gating, server-originated IDs/quantities, blocker handling, secret exclusion, tenant isolation, scan regression, and no write side effects; run TypeScript typecheck.
