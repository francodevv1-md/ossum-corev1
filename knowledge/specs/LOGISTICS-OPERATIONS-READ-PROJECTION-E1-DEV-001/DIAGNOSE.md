# Diagnose — E1 Verification Blockers

## Reproduce

Ran `npm test -- --run src/__tests__/unit/logistics-operations-read.service.test.ts` after adding the missing policy scenarios. It failed because an admin without a CLOSE grant was denied reconciliation reopen and a pre-dispatch allocation resolved as `exact`.

## Scope

E1 read projection capability derivation, scan candidate eligibility, and focused runtime proof only. No mutation, schema, UI, or Auth changes.

## Evidence

- `phase-d-logistics.ts` requires only `admin` for reopen; E1 additionally required `CLOSE_RECONCILIATION`.
- The resolver admitted any allocation with any globally allowed capability, including pre-dispatch `prepare`.
- The original focused tests only asserted synthetic outcomes and did not instrument all source reads or writes.

## Hypothesis

Capabilities were derived before allocation state was known, and resolver eligibility used that global capability set instead of the Phase-D action state for the exact allocation.

## Minimal Fix

- Derive Caja capabilities from their explicit role arrays and allocation state.
- Derive Phase-D consume/return/receive/close/reopen from explicit grants plus persisted allocation/reconciliation state; reopen is admin plus closed reconciliation, with no invented CLOSE grant.
- Restrict scan candidates to dispatched allocations with a currently allowed consume, return, or receipt action.
- Add runtime source/route tenant scope, missing snapshot blocker, no-write, capability, and scan tests.

## Validate

`npm test -- --run src/__tests__/unit/logistics-operations-read.service.test.ts src/__tests__/integration/logistics-operations-read.route.test.ts src/__tests__/integration/logistics-operations-read.source-route.test.ts` passed: 3 files / 11 tests.

`npm run typecheck` passed.

## Regression Check

Focused tests retain exact and ambiguous eligible scan results, authoritative route tenant substitution, B/C/D physical lineage and decimal accounting, missing-source blockers, and no transaction/create/update/delete invocation assertions.

## Handoff

All four E1 verification blockers were corrected within E1 scope. The lock is released and the package is ready for independent re-verification.
