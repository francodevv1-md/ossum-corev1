# Task Plan — LOGISTICS-CONSUMPTION-RETURNS-RECONCILIATION-T3-DEV-001

## Review Workload Forecast

- Delivery strategy: working-tree DEV package, no PR
- Decision needed before apply: No
- Chained PRs recommended: No
- 400-line budget risk: Not applicable (no PR requested or allowed)
- Chain strategy: not applicable

## Tasks

- [x] 1. Add the minimal additive Phase-D persistence model and unapplied migration artifact for pending identification, receipt disposition, and immutable reconciliation snapshots.
- [x] 2. Add narrow Phase-D action permissions, command validation, and C14-shaped consumption/return/reconciliation service operations.
- [x] 3. Add company-scoped API routes for Phase-D commands without altering legacy consumption/return flows.
- [x] 4. Add focused invariant, replay, authorization, rollback, concurrency-equivalent same-key, lineage, migration, and Phase-C regression coverage.
- [x] 5. Run Prisma/type/test validation, self-review, persist apply progress, and release the ownership lock.
- [x] 6. Correct close/reopen reconciliation dispatch route-scope validation and add focused no-write runtime coverage.

## Apply state

Completed DEV-only apply. Registration writes REVIEW_HOLD evidence with no availability change; controlled FIT writes RETURN evidence and then restores the immutable traced position. Unidentified returns remain quarantined and resolve through append-only incident records. The additive migration is artifact-tested only; no database command was run.

The Phase E review correction validates the reconciliation dispatch against the active company and route surgery before replay or writes; foreign company/surgery requests use the existing non-disclosing Phase D error. Focused runtime coverage proves valid authorized close/reopen, foreign route rejection, and zero reconciliation/audit/acceptance writes on validation failure.
