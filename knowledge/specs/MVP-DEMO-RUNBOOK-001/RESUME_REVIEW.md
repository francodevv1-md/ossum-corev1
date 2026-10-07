# MVP resumption — independent correction recheck, 2026-10-02

## Done
- Task: RESUME-MVP-COORDINATION-RECHECK-20261002; independent reviewer: xenophobic-sapphire-ermine, openai/gpt-6.1-sol, read-only. Application ownership remains Antigravity.
- Current corrections reviewed against the earlier independent findings. Overall READY is not supported; do not reuse either the old missing-migration conclusion or the new unconditional READY claim.
- Cajas DB execution remains blocked. Incident recovery remains closed.

## Changed
- Confirmed in source: additive calendar migration, PostgreSQL lifecycle test, mocked cross-user rejection test, partial-note warnings, notification list/count/single-read scope guards, calendar load scope guard.
- No application edits or QA executions in this resumption. Existing valid QA is retained rather than repeated.

## Files
- HEAD: `73e3e1b4b930fa0bc4bf44636c78529d73b33208`; reviewer confirmed 17 primary file hashes unchanged before/after inspection.

| Reviewed file | Git blob |
| --- | --- |
| Coordination package HANDOFF.md | 630e30195f311521c83b63f6c848a891e3d559f8 |
| CoordinadoresAdminClient.tsx | e723ae71339b7b9fc49854259ff99b7b10932dd8 |
| CoordinatorPersonalClient.tsx | 475e3962a39bef909d5e6722aa350687cd5eb915 |
| src/hooks/useNotifications.ts | a9dbc03ccb82dd54bbe4b1b54e064045965cfcac |
| src/app/calendario/page.tsx | 066fad503179658e505932fdb2bbd05be6846fa7 |
| 20261002110500_add_personal_calendar_events/migration.sql | efca312c9cb9b456b04599b45748088f25779918 |
| personal-calendar-postgres.test.ts | 6913cdf1305d190aa3f9554ca5bcf149f89fa401 |

## Validations
- Independent source/test/SQL inspection only. No tests, Node, DB, browser, build, server restart, secrets access, cleanup, or Git mutation.
- Migration deployment, PostgreSQL 1/1, unit 37/37 and TypeScript pass are owner-reported in the current package HANDOFF.md:59–68, not execution observed by this reviewer. No linked raw execution artifact was found in the package.
- Orchestrator matched all eight Sol1 UI_REVIEW.md blobs and all five Movements production blobs against existing evidence. No QA rerun.

## Risks
- Coordinator identity unresolved: personal client :94–112 compares contact IDs directly with currentUser.id and still permits name/label matches. Admin options :119–128 and useCoordinadoresFilters.ts:331–334 remain name-based. backend-surgeries.ts:22–27 management payload contains no assignment identifier. Do not invent a user/contact mapping or change access/recipient policy.
- Temporal filtering incomplete: week/month views still consume unrestricted filteredSurgeries; useTemporalNavigation.ts:198–320 generators ignore the selected period.
- Partial-note feedback incomplete: CaseDetailModal.tsx:86–90 and DefineDateModal.tsx:310–327 announce success/close without awaiting saves. DefineDate handlers also insert notes locally after server failure; preserved drafts and truthful persistence are not established.
- Calendar mutation scope unguarded: calendario/page.tsx:407–451 create/update/cancel can update state/dialogs after scope replacement. Only loading is guarded.
- Notification rollback unguarded: useNotifications.ts:232–269 markAllAsRead can restore old-scope items on rejection. The new race test covers only late list responses.
- Calendar PostgreSQL service test is not authenticated browser acceptance. Disposable-target confirmation/approval linkage for the reported apply is missing from package artifacts; missing evidence does not prove absence of approval.

## Next
- Antigravity owns the bounded corrections and evidence linkage above. Re-review only the subsequent stable delta; do not rerun valid QA unchanged.
- Keep Coordination, Notifications and Calendar PARTIAL for demo acceptance until remaining defects and required evidence are closed.
- Movements runtime requires a separately confirmed safe context. Cajas live acceptance remains excluded until explicit scoped authorization lifts its package-specific DB gate.
- Shared build output requires an exclusive window; no server may be stopped without coordination. No commit, push or deployment requested.
