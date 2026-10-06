# 012 rescheduling — real in-app notification

- task: SURGERY-RESCHEDULE-012-INAPP-20261006
- owner/role/model: OpenCode GPT-6.1 Sol / integration owner; one directed sole application/test writer, then independent read-only reviewer
- status: released (2026-10-06: final independent source PASS and final focused offline PASS; real DB/browser acceptance pending)
- workspace: E:/OSSUM_COR_ANTIGRAVITY/ux-ui
- HEAD: 685ef3229da012ed988388d512d91f3e3c4bad2e
- approval: Franco explicitly answered "Si confirmo" to replacing the simulation with real notifications inside OSSUM COR for Administration and Logistics/Depósito, with emails and external notices excluded.
- active files:
  - src/lib/services/surgery.service.ts (updateSurgery date-change notification only)
  - src/lib/services/internal-notifications.service.ts (bounded emitter/recipient selection only; preserve unrelated defaults/policies)
  - src/__tests__/unit/rescheduling-service.test.ts
  - src/__tests__/unit/internal-notifications.service.test.ts
  - src/__tests__/unit/surgery-management.service.test.ts (mock fixtures only if required by actual notification path)
  - src/__tests__/unit/surgeries-intake-authorization.test.ts (mock fixture only if needed)
  - new focused rescheduling notification tests in src/__tests__/unit if necessary
  - src/__tests__/components/ReschedulingNotificationNavigation.test.tsx (actual emitted notice consumed by existing inbox/menu; no general inbox rewrite)
  - this lock and knowledge/specs/SURGERY-RESCHEDULE-012-CORE/INAPP-NOTIFICATIONS-20261006.md (integration owner writes artifacts only)
- resources: offline Vitest processes and direct tsc only; no .next/runtime/server/Prisma generation.
- validation allowlist: exact offline rescheduling/notification/management suites; previous 15 unit/component rescheduling regressions; NotificationMenu/NotificationsInbox if safe; direct tsc --noEmit --incremental false; read-only Git/status/hash/diff.
- exclusions: application UI/date helpers unless proven contract blocker escalated; Auth/permissions/company policy configuration/schema/migrations/store/calendar/palette, email/ntfy/external sends, secrets/env, installs/config/build/restart, DB queries/mutations/integration tests, commits/push/PR.
- prerequisites: previous 012 source correction released with source PASS and 157 offline tests. Preserve all those changes and foreign dirty notification deltas. Same company/user recipient rules; no global notification default rewrite.
- stop: ownership conflict, need for schema/permission change, actual DB target unverified, source drift, unrelated expansion or two unsuccessful minimal corrective cycles.
- DB/browser acceptance: not authorized by localhost or old historical target; identify current disposable DEV target, fixtures/session/server ownership before actual validation. Until then report NOT RUN/BLOCKED.

## Closure evidence

- Writer modified only two service files, three existing unit test files and one new focused consumer test. Integration owner modified this lock/brief only; previous unrelated source changes retained.
- First review: FAIL for one invalid deep link; same writer corrected to existing Ficha helper and reproduced RED→GREEN consumer test. Final independent read-only SOURCE PASS, no remaining proven task blocker.
- Parent final replay: 47/47 PASS in 4 files, exit 0 at 13:46:18 local. Earlier broader parent replay: 219/219 PASS in 19 files at 13:41:29, before the link correction; do not sum overlapping tests or represent this as full final-suite acceptance.
- Parent direct TypeScript: FAIL exit 1, six diagnostics outside edited files. Scoped whitespace exit 0. Broader legacy NotificationsInbox writer suite: 14 FAIL, declared separately; actual emitted-notice→Inbox navigation test PASS.
- End HEAD: ba37dcb7b46d64d7ee7f7891371673362b34301d. Concurrent unrelated branch-selector commit did not change the six owned application/test files. Preserve it; no commit/publication performed by this package.
- Final hashes and safe replay in INAPP-NOTIFICATIONS-20261006.md. No real DB/browser validation, external notification send, schema/Auth/permission/config/build/generation changes.
