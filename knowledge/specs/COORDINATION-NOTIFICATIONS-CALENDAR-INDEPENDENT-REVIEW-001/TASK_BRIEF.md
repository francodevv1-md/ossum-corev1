# TASK BRIEF — COORDINATION-NOTIFICATIONS-CALENDAR-INDEPENDENT-REVIEW-001

**Role**: MiniMax — independent read-only reviewer.
**Mode**: review only; no implementation, no fixes, no source edits, no
commits, no deploy, no DB pressure.
**Workspace**: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
**Branch**: `ux/antigravity-redesign`
**HEAD at start and end**: `73e3e1b4b930fa0bc4bf44636c78529d73b33208`
**Package under review**: `COORDINATION-NOTIFICATIONS-CALENDAR-DEMO-DEV-001` (Antigravity owner)
**Owner of this review**: MiniMax (independent review) — `knowledge/specs/COORDINATION-NOTIFICATIONS-CALENDAR-INDEPENDENT-REVIEW-001/**`.

---

## 1. Scope

Independent, read-only review of the Antigravity demo package covering:

- **P1 — Calendar (PRIORITY 1)**: `src/app/calendario/page.tsx`,
  `src/lib/validators/personal-calendar.validator.ts`,
  `src/lib/services/personal-calendar.service.ts`,
  `src/lib/api/personal-calendar.ts`,
  `src/app/api/companies/[companyId]/personal-events/route.ts`,
  `src/app/api/companies/[companyId]/personal-events/[eventId]/route.ts`,
  the schema model `PersonalCalendarEvent`, and the migration state.
- **P2 — Coordination/States (PRIORITY 2)**: `src/components/coordinadores/CoordinadoresAdminClient.tsx`,
  `src/components/coordinadores/CoordinatorPersonalClient.tsx`,
  `src/hooks/useCoordinadoresFilters.ts`,
  `src/hooks/useTemporalNavigation.ts`,
  coordinator identity resolution, and the
  `src/lib/api/backend-surgeries.ts` mutation path.
- **P3 — Notifications (PRIORITY 3)**: `src/hooks/useNotifications.ts`,
  `src/components/layout/MobileNotificationsSheet.tsx`,
  `src/components/layout/ShellUtilityMenus.tsx`,
  `src/components/notifications/NotificationsInbox.tsx`,
  `src/lib/expediente-navigation.ts`, and the underlying
  `markInternalNotificationAsRead` API.

Out of scope: any other session (Sol1, Compras, Cajas, Pres, Doc, etc.). Files not listed remain untouched.

---

## 2. Boundaries

- No source, schema, configuration or test edits.
- No DB / migrations / integration tests; mocks only.
- No Playwright.
- No edits to artifacts owned by other sessions.
- No commits, push, deploy, or PR.
- Findings are recorded in this owned folder with explicit ownership.

---

## 3. Final state per block

| Block | State |
|---|---|
| P1 — Calendar | **BLOCKED**: schema declared, no migration persisted; service/route/mock tests pass; runtime acceptance requires disposable DEV DB apply + browser verification. |
| P2 — Coordination | **PARTIAL**: source contract is at the surface; coordinator identity by string match in admin path; temporal period only applied on day view (not week/month). Hidden failures not exercised against a real DB. |
| P3 — Notifications | **PARTIAL**: `markAsRead(notification.id)` is correct on all three consumers; navigation uses `linkHref` or `surgeryId` (not `sourceEntityId`); in-flight responses on company/user scope switch can repopulate the previous scope; 14 pre-existing `NotificationsInbox.test.tsx` failures are out of scope. |

---

## 4. Exit criteria for this review

- `FINDINGS.md` written with file:line evidence, expected vs actual, smallest correction and regression check for every finding.
- Each finding classified: CONFIRMED defect, WITHDRAWN, DEFERRED, or UNVERIFIED.
- Status per block.
- Ownership released at end.

No commits, no deletes, no installation of dependencies, no DB writes.