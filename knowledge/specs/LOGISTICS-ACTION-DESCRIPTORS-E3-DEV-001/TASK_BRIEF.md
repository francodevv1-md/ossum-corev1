# Task Brief — E3 Logistics Action Descriptors

## Objective

Extend the E1/E2 read-only Surgery logistics projection with server-authoritative descriptors for every currently available Phase D receive and reconciliation command.

## Scope

- Reuse only the existing `logistics/phase-d` route, Phase D validator/service contracts, and projection facts.
- Describe available consumption, identified return, unidentified return, receipt control, unidentified-return resolution, reconciliation close, and admin-only reopen commands.
- Include route/method/action, immutable targets, quantity limits, required human inputs, valid outcomes, preconditions/blockers, concurrency, and idempotency metadata.
- Verify the full Prepare → Control → Dispatch → Receive → Reconcile action inventory has a descriptor source.

## Exclusions

No mutation behavior, schema/migration, UI, Auth architecture, stock-rule, configuration, dependency, deployment, or Git change.

## Validation

Focused runtime tests prove descriptors are available only when the existing command predicate is satisfied, carry no secrets, retain tenant/read-only and scanner guarantees, cover complete action inventory, and pass TypeScript typecheck.
