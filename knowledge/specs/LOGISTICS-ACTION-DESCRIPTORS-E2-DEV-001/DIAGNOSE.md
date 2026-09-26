# Diagnose — E2 Action Descriptors

## Reproduce

Independent E2 verification reproduced descriptor availability failures by inspecting the current projection against the existing Phase B/C services: an inactive reservation could receive `RELEASE_ALLOCATION`; inactive/ended assignments could receive control/resolution actions; a malformed-but-present trace could receive control.

## Scope

The defect is bounded to read-only descriptor eligibility in `logistics-operations-read.service.ts` and its focused unit fixture. Mutation routes and services are unchanged.

## Evidence

`releaseCajasPhysicalAllocation` rejects non-active reservation projections with `cajas_allocation_not_active`; control/difference services scope assignments to `activeSlot: 1, endedAt: null`; physical allocation trace validation requires every immutable trace field plus position/unit/quantity equality.

## Hypothesis

E2 had replicated only nominal eligibility, not these source-enforced state constraints. Matching those predicates in the read projection removes the false availability without changing any command.

## Minimal Fix

Filter current correlations to active positive reservation projections, scope assignment reads to active/unended rows, and require a complete immutable trace before emitting release/control descriptors. Add runtime boundary tests for each case.

## Validate

`npx vitest run src/__tests__/unit/logistics-operations-read.service.test.ts src/__tests__/integration/logistics-operations-read.route.test.ts src/__tests__/integration/logistics-operations-read.source-route.test.ts` passed: 3 files, 16 tests.

`npm run typecheck` passed.

## Regression Check

E1 `none|exact|ambiguous` resolver cases and the read-only tenant route tests remain green in the focused suite.

## Handoff

Descriptors now omit actions that the authoritative Phase B/C commands would reject for inactive reservation/assignment or incomplete trace state.

---

## Reproduce — Control Freshness Follow-up

Independent re-verification found that `EMIT_REMITO_DISPATCH` could appear with a current control ID whose `sourcePreparationVersion` differed from the current preparation version.

## Scope

Only dispatch descriptor availability and its E2 unit fixture are affected.

## Evidence

`emitirRemito` rejects a surgical Remito unless the accepted control exists, has `CLEAN` or `WITH_DIFFERENCES` result, and `sourcePreparationVersion === preparation.version` (`remito_dispatch_control_stale`).

## Hypothesis

E2 only checked `latestControlId`, which proves control existence but not its required freshness.

## Minimal Fix

Require the exact `emitirRemito` control result/version predicate before emitting `EMIT_REMITO_DISPATCH`; add a stale-version runtime test.

## Validate

Focused E2 suite passed: 3 files, 17 tests. `npm run typecheck` passed.

## Regression Check

A matching `CLEAN` control at the current preparation version still emits the dispatch descriptor; E1 scan and read-only route coverage remain green in the same suite.

## Handoff

The descriptor now follows the current Remito dispatch control freshness gate without changing any mutation contract.
