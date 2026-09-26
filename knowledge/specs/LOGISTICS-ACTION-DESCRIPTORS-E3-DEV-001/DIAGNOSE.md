# Diagnose — E3 Descriptor Fidelity

## Reproduce

Added executable boundary coverage, then ran `npx vitest run src/__tests__/unit/logistics-operations-read.service.test.ts`. The authorized, fully settled allocation produced no `REGISTER_UNIDENTIFIED_RETURN` descriptor.

## Scope and Evidence

`return_unidentified` requires only a dispatched surgery/dispatch plus the `REGISTER_RETURN` grant; it explicitly has no dispatch-line or pending-quantity predicate. The projection incorrectly nested its descriptor under the identified-return capability. Reconciliation close in the projection also used one allocation's pending state, while the mutation uses `reconciliationTotals` over every line and operation of the dispatch.

## Hypothesis

Separating unidentified-return availability from identified physical-return availability and calculating close eligibility over the complete dispatch will match the existing Phase D service contract.

## Minimal Fix

- Added the independent `unidentifiedReturn` capability: grant plus dispatched lineage only.
- Read all lines and Phase D operations for projection-owned dispatch IDs and reuse `reconciliationTotals` for close eligibility.
- Added a boundary test for a settled unidentified return and a two-line same-dispatch close denial.

## Validate and Regression Check

- Focused suite: 3 files, 19 tests passed.
- `npm run typecheck` passed.
- Route tenant/read-only and scanner regression tests remain in the focused passing suite.
