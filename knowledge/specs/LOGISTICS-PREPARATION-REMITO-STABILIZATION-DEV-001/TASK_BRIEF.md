# Task Brief — WCB-06 replay integrity stabilization

## Objective

Fix only WCB-06 same-intent replay so it returns success only when the persisted audit, acceptance, stock evidence, reservation evidence, dispatch, lines, effects, counts, timestamps, company, and command-derived lineage still form the validated command result.

## Approval and scope

Franco explicitly approved this DEV-only task on 2026-09-06. The accepted scope is limited to `src/lib/services/c14/bundles/wcb-06.ts`, its focused unit test, and this Change Pack documentation.

## Exclusions

- No schema, migration, DB mutation, UI, persistent activation/config, Auth, permissions/security/RLS, billing, purchases, replenishment, deployment, commit, push, or PR.
- No change to `src/lib/services/remito.service.ts` or stock/preparation/consumption/remito behavior.

## Diagnose

### Reproduce

`npx vitest run src/__tests__/unit/c14-wcb-06.test.ts` failed red with `AssertionError: promise resolved ... instead of rejecting` after the focused test removed persisted stock evidence on a same-intent replay.

### Scope

The defect is constrained to the existing-acceptance branch in `wcb-06.ts`; it reads only a dispatch and its lines before returning replay success.

### Evidence

The prior independent review recorded the HIGH at `src/lib/services/c14/bundles/wcb-06.ts:61`: the replay path did not revalidate persisted evidence, reservation, effects, counts, timestamps, or lineage.

### Hypothesis

The replay branch lacks the deterministic final-state comparison already partially performed after initial writes. A shared, command-derived validator can make both paths fail closed without changing the initial-write sequence.

### Minimal fix

Added a single read-only `readValidResult` helper in WCB-06. It derives the expected audit, acceptance, evidence, reservation, dispatch, line, effect, count, company, timestamp, and binding values from the validated command, then returns the dispatch only for an exact persisted result. Both replay and post-write verification use it.

### Validation evidence

- `npx vitest run src/__tests__/unit/c14-wcb-06.test.ts src/__tests__/unit/c14-authorization.test.ts` — passed: 2 files, 12 tests.
- `npm run typecheck` — passed after the scoped test mock types and `Prisma.JsonNull` value import were corrected.

## Validation plan

1. Run the new focused regression red.
2. Apply the smallest WCB-06-only replay validation.
3. Run the focused test and adjacent WCB-06 regression.
4. Run typecheck and record any baseline failure exactly.
5. Independently inspect the scoped diff and release the lock.
