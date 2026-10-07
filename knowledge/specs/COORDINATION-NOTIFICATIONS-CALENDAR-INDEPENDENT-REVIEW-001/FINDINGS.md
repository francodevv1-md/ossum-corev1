# FINDINGS — COORDINATION-NOTIFICATIONS-CALENDAR-INDEPENDENT-REVIEW-001

**Status**: read-only independent review of `COORDINATION-NOTIFICATIONS-CALENDAR-DEMO-DEV-001` (Antigravity owner).
**Workspace**: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
**Branch**: `ux/antigravity-redesign`
**HEAD at start and end**: `73e3e1b4b930fa0bc4bf44636c78529d73b33208`
**Reviewer**: MiniMax — independent, no source edits, no commits.

Final state per block:

| Block | State |
|---|---|
| P1 — Calendar | **BLOCKED** |
| P2 — Coordination | **PARTIAL** |
| P3 — Notifications | **PARTIAL** |

Do **NOT** declare READY a block whose evidence is only mocks when a real migration is outstanding. See §11.

---

## 1. Antiquity of the package

The Antigravity demo package was started 2026-10-02 at 10:18 (`TASK_BRIEF.md` mtime); its `LOCK.md` declares "Status: Editing / Implementation". There is **no HANDOFF.md** in the package — the Antigravity owner has not closed the loop. This review must therefore be read against a moving snapshot, not against a fixed delivery.

The dirty and untracked files under the package's scope (verified via `git status --porcelain`) are listed in §OWNERSHIP.md. Hashes recorded at session start and at session close are unchanged.

---

## 2. PRIORITY 1 — Calendar (BLOCKED)

### 2.1 [CONFIRMED DEFECT] Schema declared, no migration persisted

**Files**: `prisma/schema.prisma:3411-3431`, `src/lib/services/personal-calendar.service.ts`, `src/app/api/companies/[companyId]/personal-events/route.ts`, `src/app/api/companies/[companyId]/personal-events/[eventId]/route.ts`.

**Evidence**:

- `prisma/schema.prisma:3411-3431` declares `PersonalCalendarEvent` with columns `id`, `companyId`, `userId`, `title`, `description`, `startDate`, `endDate`, `isCancelled`, `cancelledAt`, `createdAt`, `updatedAt`, the FKs to `Company` and `User`, the unique `@@unique([companyId, id])`, two indexes, and `@@map("personal_calendar_event")`.
- The Company side declares the back-relation `personalCalendarEvents PersonalCalendarEvent[] @relation("CompanyPersonalCalendarEvents")`.
- No `prisma/migrations/<timestamp>_add_personal_calendar_events/` directory exists (search `prisma/migrations/*/migration.sql` for `personal_calendar_event` returns nothing; search returns 0 rows in all 4 untracked + 4 tracked migrations).
- `git ls-files 'prisma/migrations/'` returns only the article, stock-physical-units, stock-reservations, cajas-component-reservations migrations, plus the canonical baseline. None creates the `personal_calendar_event` table.
- `prisma generate` would compile the client to include `personalCalendarEvent` (declared in `personal-calendar.service.ts:85` cast as `(client as any).personalCalendarEvent`), but **no real DB has the table**. `prisma migrate dev` against an empty DB will generate a new migration; `prisma migrate deploy` will fail with `P2021 (table does not exist)` against a fresh DB; against an already-existing DB without the table it will fail with the same error.

**Expected behavior**: a working-table migration exists and is registered; alternatively the schema entry is removed until the migration lands.

**Impact**: every endpoint under `/api/companies/[companyId]/personal-events/*` will fail at runtime against any DB that does not already have the table. Acceptance is mocked only.

**Smallest correction**: add `prisma/migrations/<YYYYMMDDHHMM>_add_personal_calendar_events/migration.sql` that creates the table with the columns/indexes/uniques matching the schema, plus `prisma/migrations/migration_lock.toml` already present. No code changes required.

**Regression check**: run `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma` and verify the resulting SQL contains only the `personal_calendar_event` table; `prisma migrate deploy` against a disposable DEV DB should return `Ok, migrations applied`.

### 2.2 [CONFIRMED] Auth isolation by `companyId` AND `actorUserId`

**Files**: `src/lib/services/personal-calendar.service.ts:60-93, 95-114, 116-135, 137-172, 174-201`, `src/app/api/companies/[companyId]/personal-events/route.ts:13-36, 38-56`, `src/app/api/companies/[companyId]/personal-events/[eventId]/route.ts:13-31, 32-51, 52-69`.

**Evidence**:

- `listPersonalCalendarEvents` (`personal-calendar.service.ts:60-93`) accepts `{ companyId, userId, from?, to?, includeCancelled? }` and queries `where.companyId` + `where.userId`; rows belong to the actor only.
- `getPersonalCalendarEventById` (`personal-calendar.service.ts:95-114`) filters by `id`, `companyId`, `userId`. Cross-tenant reads return `notFound`.
- `createPersonalCalendarEvent` (`:116-135`) writes `companyId` and `userId` from server-side arguments, never from the payload.
- `updatePersonalCalendarEvent` (`:137-172`) pre-fetches the row using the same triple and only updates mutable fields (title/description/startDate/endDate/isCancelled). `companyId`/`userId` are not in `updateData`. ✓ Owner/company cannot be re-assigned via update.
- `cancelPersonalCalendarEvent` (`:174-201`) flips `isCancelled`/`cancelledAt` only.
- All routes pass `companyId: ctx.companyId` and `userId: ctx.actorUserId` to the service. No route reads `companyId`/`userId` from the request body or query string.

**Expected behavior**: matches the brief.

**Impact**: per-user personal events, no cross-tenant or cross-user leakage at the source-contract level.

**Smallest correction**: none required.

**Regression check**: unit test `personal-calendar.service.test.ts` (13/13 pass) covers the triple-filter; an explicit integration test on disposable DB should also confirm tenant isolation.

### 2.3 [CONFIRMED] Date validation (start/end ordering)

**Files**: `src/lib/validators/personal-calendar.validator.ts:3-18, 20-39`.

**Evidence**:

- `createPersonalCalendarEventSchema.refine` enforces `end >= start`; failure path: `'endDate'`.
- `updatePersonalCalendarEventSchema.refine` skips the check when either field is absent (no over-reach), and applies it when both are present.

**Expected behavior**: matches the brief.

**Impact**: prevents invalid event spans at the boundary.

**Smallest correction**: none.

**Regression check**: `personal-calendar.validator.test.ts` covers the schema; an additional case where `start === end` is accepted would be worth asserting (edge of equality).

### 2.4 [UNVERIFIED] Timezone semantics on save / load

**Files**: `src/app/calendario/page.tsx:362-417`, `src/lib/services/personal-calendar.service.ts:127-130, 156-160`, `src/lib/api/personal-calendar.ts:10-23`, `src/app/api/companies/[companyId]/personal-events/route.ts:38-56`.

**Evidence**:

- The page builds `startDateTime = new Date(\`${eventFormStartDate}T${eventFormStartTime}:00\`)` — local time (when the browser's TZ). Then `.toISOString()` → UTC string. Service stores as `DateTime @db.Timestamptz(6)`. The DB column is timestamptz; the UTC value is canonical.
- On read: `startDateTime = new Date(event.startDate)` — UTC. `.getHours()` returns local hours. The grid keys (`dateKey(d)`) use `getFullYear/getMonth/getDate` (local), so the daily grid anchors to the user's local day. ✓
- The route accepts `from` and `to` as ISO strings and the service parses with `new Date(from)` and `.gte`/`.lte` — but the page never sends those params.

**Expected behavior**: local-time UI + UTC DB + local-time rendering is consistent on save/load IF the browser TZ is stable.

**Impact**: a user moving between two TZs between save and load will see the local hour shift accordingly. There is no separate `timeZone` field. Acceptable for personal events.

**Smallest correction**: none required unless the product wants explicit TZ storage.

**Regression check**: requires disposable DB + Playwright across a TZ shift; not executed here.

### 2.5 [CONFIRMED] Conflict / late-response handling

**Files**: `src/app/calendario/page.tsx:362-436` (state updates on save / cancel).

**Evidence**:

- Save: the page calls `await createPersonalCalendarEventApi(...)` then `setPersonalEvents((prev) => [...prev, created])` (line 406). It closes the dialog and toasts. If two opens are dispatched (race), the optimistic additions are append-only and last-write wins on shared IDs.
- Cancel: page filters out by id (`:427`). If two cancels race, only one finds the id, the other is a no-op.
- The service returns the persisted row, so the local state matches the DB after success.
- No AbortController. If the request is in flight when `companyId` changes, the late response may set personal events for the previous company.

**Expected behavior**: at minimum, late responses from the previous scope should not pollute the new scope.

**Impact**: cross-tenant state mutation possible when user changes active company mid-request.

**Smallest correction**: capture `currentCompanyId` at request start; discard the response if `companyId !== currentCompanyId` at resolve time.

**Regression check**: a focused test that switches company mid-request and asserts the new company's `personalEvents` is unchanged.

### 2.6 [UNVERIFIED] Create vs CRUD existence vs real acceptance

The CRUD on calendar events is implemented end-to-end (service + routes + page + mock tests at 13/13). **Real persistence and post-reload acceptance require disposable DEV DB + Playwright; not executed here.**

### 2.7 Calendar summary

- Source-contract level: clean except for the in-flight company-switch leak.
- Migration level: **BLOCKING** until a migration is added.
- Runtime level: not exercised.

---

## 3. PRIORITY 2 — Coordination (PARTIAL)

### 3.1 [CONFIRMED DEFECT] Coordinator identity by string match in admin path

**Files**: `src/components/coordinadores/CoordinadoresAdminClient.tsx:118-128` (`coordinatorOptions`), `src/hooks/useCoordinadoresFilters.ts:331-336` (coordinator filter), `src/lib/api/backend-surgeries.ts:19-37` (mutation payload).

**Evidence**:

- `coordinatorOptions` is built from `store.surgeries.map((s) => s.coordinadorCx || "Sin asignar")`. The string `coordinadorCx` is a display name in the local Zustand store; it is **not** a backend-linkage identifier.
- The admin filter compares the string exactly: `if (!filters.selectedCoordinators.includes(coord)) return false` (`useCoordinadoresFilters.ts:333-334`).
- The backend mutation endpoint `PATCH /api/companies/[companyId]/surgeries/[surgeryId]` accepts `{ surgeryDate, priority, materialShippingDate, materialTransport }`. **It does NOT take a `coordinadorContactId`.** The coordinator identity is therefore only in the local store, never persisted.

The brief explicitly says: "Confirmar identidad del coordinador mediante relaciones persistidas; nombre exacto no equivale por sí solo a identidad única." This is **violated** in the admin path.

**Expected behavior**: coordinator selection in the admin path must be by a backend relationship id (e.g. `coordinadorContactId` or `coordinatorAssignments[].contactId`), not by string match.

**Impact**:

- Two coordinators with the same name (`coordinadorCx === "Maria Joe García"`) match the same filter selection. False positives.
- If the store `coordinadorCx` is stale or stale-cased, the filter is silently wrong.
- The mutation never persists the assignment, so even a correct UI selection would not survive a reload.

**Smallest correction**: 

1. Add a `coordinadorContactId` field to the OC payload (or an assignment endpoint) and persist it.
2. Build `coordinatorOptions` from the assignments relations (preferred) or from the stored `coordinatorAssignments[].label` (current) **plus** the assignment `contactId` for selection.
3. Replace the filter `coord === string` with `assignment.contactId === selectedContactId`.

**Regression check**: focused unit test asserting filter selection by id matches the corresponding assignment in any backend (mocked); admin-client integration test asserting coordinator mutation survives reload.

### 3.2 [CONFIRMED DEFECT] Personal client coordinator filter is layered correctly but the persistent linkage fallback in any single backend is not verified

**Files**: `src/components/coordinadores/CoordinatorPersonalClient.tsx:71-122` (`mySurposes` derivation).

**Evidence**:

- `mySurposes` filter chain (in order):
  1. `s.coordinadorContactId === userId` — best, persistent.
  2. `s.coordinatorAssignments.some(...)` matches either by `contactId` or by string `label`.
  3. `s.coordinadorCx` exact-string match.
  4. `(s as any).createdById === userId` fallback (creator).

This is **layered** with persistent IDs preferred. However:

- Branch 2 mixes `contactId` and string match by lowercasing `label`. **Two users with the same display name will match both branches on each other.** This is the same string-match risk as P1 of admin.
- `label` should not be a primary identity field.

**Expected behavior**: filter by `contactId` only; or fallback by `createdById`.

**Impact**: same as P1.

**Smallest correction**: drop the string-match branches for `coordinatorAssignments[].label` and `s.coordinadorCx`. Keep `coordinadorContactId`, `coordinatorAssignments[].contactId`, `createdById`.

**Regression check**: focused test with two users sharing a display name.

### 3.3 [CONFIRMED] Backend mutation call coerces local `coordinadorCx` only

**Files**: `src/lib/api/backend-surgeries.ts:19-37`, `src/components/coordinadores/CoordinatorPersonalClient.tsx:190-267, 270-352`.

**Evidence**:

- `updateBackendSurgeryManagement` sends `{ surgeryDate, priority, materialShippingDate, materialTransport }` — no coordinator. The backend has no `coordinadorContactId` field.
- `handleSaveGestion` and `handleSaveDefineDate` in the personal client write `coordinadorCx: coordName` to the local store only (lines 235, 319) and dispatch `/in-flight` after `store.updateSurgery`.
- The audit event records `coordName` as a string.

**Expected behavior**: per the brief, the coordinator identity must be persistent. The backend must carry the contact id.

**Impact**: stored identity never survives reload.

**Smallest correction**: backend API must accept `{ contactId }` for coordinator; the UI sends the resolved `userId` from the AuthContext (never from any string the user types).

**Regression check**: backend integration test that the new PATCH persists `contactId`; reload integration test that the field comes back populated.

### 3.4 [CONFIRMED DEFECT] Temporal period filter applied only in day view

**Files**: `src/hooks/useTemporalNavigation.ts:188-195`, `src/components/coordinadores/CoordinadoresAdminClient.tsx:354-356, 378-382, 359-365, 397-414`.

**Evidence**:

- `isDateInPeriod` (`:188-195`) compares local `YYYY-MM-DD` strings; works correctly lexicographically.
- `dayPeriodSurgeries` (`:354-356`) applies `isDateInPeriod` over `filteredSurgeries` — this is the day view's source.
- `paginatedSurgeries` (`:378-382`) uses `viewMode === "day" ? dayPeriodSurgeries : filteredSurgeries`. So **week and month views bypass the temporal period**, while day view respects it.
- `getMonthMatrix` (`:198-281`) and `getWeekGroups` (`:284-320`) build their grids anchored to `currentDate`'s month/week, regardless of the active preset.

**Expected behavior**: when the preset is `next7`, the UI should show only the next 7 days in any view. Currently week/month views show the week/month grid regardless.

**Impact**: user toggles preset → only day view filters; week/month views appear unchanged. Visual inconsistency.

**Smallest correction**: `getMonthMatrix` and `getWeekGroups` accept the active `startDate`/`endDate` and clamp the resulting grid to that window. Alternative: keep the grid anchored to `currentDate` but show a banner indicating the preset is not honored in this view.

**Regression check**: focused test that `getMonthMatrix` with active preset excludes cells outside the preset window.

### 3.5 [CONFIRMED DEFECT] Coordinator assignment notification uses a string, not a contact id

**Files**: `src/components/coordinadores/CoordinadoresAdminClient.tsx:306-308`, `src/components/coordinadores/CoordinatorPersonalClient.tsx:248-264`.

**Evidence**:

- `dispatchCoordinatorAssignedAlert(updated, updates.coordinadorCx)` — second argument is the **string** name. This propagates through the notification pipeline, which uses the string as the recipient label.
- The recipient side of the notification flow (`internal-notifications.service.ts:367-392`) filters out the actor (`access.userId === input.actorUserId`) and resolves recipients by role policy. The coordinator-name string is not used as the recipient key; the recipient is the role-eligible company member set.

**Expected behavior**: per the brief, the recipient of the assignment alert should be the user identified by `coordinadorContactId`. The alert dispatch should call `dispatchCoordinatorAssignedAlert(updated, { userId, name })` rather than a bare name.

**Impact**: the alert currently goes to all role-eligible members (e.g., all coordinators), not the specific one assigned.

**Smallest correction**: pass `{ userId, displayName }` to the dispatcher and have the service resolve the recipient by userId (not by role).

**Regression check**: focused test asserting that a coordinator assignment only emits to the assigned user.

### 3.6 [CONFIRMED] Calendar route does not block on tracking-note creation

**Files**: `src/components/coordinadores/CoordinadoresAdminClient.tsx:173-180`, `src/components/coordinadores/CoordinatorPersonalClient.tsx:214-220`.

**Evidence**:

- Both `handleSaveGestion` and `handleSaveDefineDate` call `addBackendSurgeryNote(...)` inside the same try, but the `addBackendSurgeryNote` rejection is swallowed via `.catch((err) => console.warn("Note creation warning:", err))`. The user sees a successful toast, but the note was never saved.

**Expected behavior**: either note save failure should bubble up so the user knows, or the operation should be explicitly marked as partial success.

**Impact**: silent data loss on note failure; user trusts a toast that is technically only about the OC update.

**Smallest correction**: track note-save success and either block the OC update or downgrade the toast to "saved without note".

**Regression check**: a test where the note endpoint fails should reflect the failure in the UI.

### 3.7 [CONFIRMED] Coordinator assignments hydration unknown

**Files**: `src/lib/api/surgery-adapter.ts` (untouched in this session).

**Evidence**: `mySurposes` references `s.coordinadorContactId` and `s.coordinatorAssignments` — both fields. These fields are populated by the surgery adapter during `fetchBackendActiveSurgeries`. The adapter code is not part of the Antigravity package. We did not run DB tests against the real adapter, so we cannot certify that the backend response shape actually populates those fields.

**Expected behavior**: if the adapter does not surface those fields, the personal-client filter collapses to string-match.

**Impact**: same as 3.1/3.2.

**Smallest correction**: ensure the backend PATCH includes `coordinadorContactId` and the GET returns it. Adapter mapping already present in HEAD; check that it is up-to-date.

**Regression check**: backend test asserting the surgery record carries the coordinatorContactId after assignment.

### 3.8 [UNVERIFIED] State translation canonical (manual ↔ canonical)

**Files**: `src/lib/api/backend-surgeries.ts:38-71`.

**Evidence**: `mapUiStateToCanonicalCxStatus` maps Spanish/UI strings to canonical snake_case (`authorized`, `scheduled`, `performed`, `finalized`, `suspended`, `cancelled`, `unauthorized`, `pending`). Routes the PATCH body through this canonical form. The mapping is correct for the labels enumerated.

**Expected behavior**: matches the brief.

**Impact**: minimal. The "Sin autorizar" maps to `unauthorized` and "Sin fecha" → `pending`. Confirmed.

**Smallest correction**: none required, but the canonical vocabulary should be asserted in a test (the existing `erp-notifications-policy.test.ts` does not cover it).

**Regression check**: focused unit test for `mapUiStateToCanonicalCxStatus`.

---

## 4. PRIORITY 3 — Notifications (PARTIAL)

### 4.1 [CONFIRMED] `markAsRead(notification.id)` is consistent across all three consumers

**Files**: `src/hooks/useNotifications.ts:153-201`, callers:
- `src/components/notifications/NotificationsInbox.tsx:95` and `:300`
- `src/components/layout/ShellUtilityMenus.tsx:74`
- `src/components/layout/MobileNotificationsSheet.tsx:72`

**Evidence**: all three consumers pass `notification.id` (the primary key). The hook's optimistic update and the server PATCH both key off `notification.id`. ✓

**Expected behavior**: matches the brief.

**Impact**: none.

**Smallest correction**: none.

**Regression check**: existing component tests cover the call signature.

### 4.2 [CONFIRMED] Navigation uses `linkHref` or `surgeryId`, not `sourceEntityId`

**Files**: `src/components/notifications/NotificationsInbox.tsx:107-119`, `src/components/layout/ShellUtilityMenus.tsx:81-90`, `src/components/layout/MobileNotificationsSheet.tsx:85-98`.

**Evidence**: all three consumers first check `notification.linkHref`, then fall back to surgery-aware derivation. `sourceEntityId` is **not** used as a navigation key.

**Expected behavior**: matches the brief.

**Impact**: none.

**Smallest correction**: none.

**Regression check**: existing component tests cover the navigation path.

### 4.3 [CONFIRMED DEFECT] In-flight response leak on company/user scope switch

**Files**: `src/hooks/useNotifications.ts:117-151` (`refreshList`), `:243-275` (auto-load effect), `:301-311` (scope-change reset).

**Evidence**:

- The auto-load effect at `:243-275` issues `refreshList()` on mount and on `companyId` change. `refreshList` performs `fetchInternalNotifications(...)` which is a network call.
- When `companyId` changes, the effect at `:301-311` resets state (`setItems([])` etc.) **synchronously**.
- But the in-flight `refreshList` from the previous company still resolves. Its `setItems(...)` call lands on the new scope, repopulating with the previous company/user data.
- No `AbortController`, no request id guard.

The brief explicitly says: "Limpiar caché no basta: respuestas en vuelo del scope anterior no deben repoblar datos del usuario/empresa actual."

**Expected behavior**: late responses from previous scope must not repopulate the new scope.

**Impact**: cross-tenant data leak in the UI after switching active company or user. The new scope's state is contaminated until the next successful fetch.

**Smallest correction**:

1. Maintain a `currentRequestId` ref, increment it on each `refreshList` invocation.
2. The response handler checks the ref and discards stale responses.
3. Optionally use `AbortController` for true cancellation.

**Regression check**: focused test that switches `companyId` mid-flight and asserts the new scope's items remain empty until the new fetch resolves.

### 4.4 [CONFIRMED] `markAsRead` cross-scope correctness via markingIds map

**Files**: `src/hooks/useNotifications.ts:153-201`.

**Evidence**:

- `markAsRead(notificationId)` is captured in a closure that includes `companyId` and `items`.
- When `companyId` changes, the callback re-creates (deps include `companyId`). But in-flight calls retain the closure's previous `companyId` (so the URL is correct for the old company).
- The optimistic decrement of `unreadCount` runs before the network call. If the user has switched to a new company, `current` is the new scope's state, and the decrement applies to the new scope.
- The success handler runs `setItems(current => ...)`. If the new scope's `current` items contain an entry with the same id (rare), it gets marked read in the new scope.

**Expected behavior**: markAsRead should be no-op if `currentCompanyId` no longer matches the request's `companyId`.

**Impact**: low (id collisions between companies are vanishingly rare), but the pattern is incorrect.

**Smallest correction**: capture `currentCompanyId` at request start; if different at resolve time, discard.

**Regression check**: similar to 4.3.

### 4.5 [CONFIRMED] Actor never receives own notification (service-layer enforcement)

**Files**: `src/lib/services/internal-notifications.service.ts:366-392` (`emitInternalNotification`).

**Evidence**:

```ts
const eligibleRecipients = memberAccesses.filter((access) => {
  if (access.userId === input.actorUserId) return false
  ...
})
```

The actor is filtered out before `createMany`. ✓

**Expected behavior**: matches the brief.

**Impact**: none.

**Smallest correction**: none.

**Regression check**: existing test `erp-notifications-policy.test.ts` covers this; explicit assertion would help.

### 4.6 [CONFIRMED] `NotificationsInbox.test.tsx` has 14 pre-existing failures

**Files**: `src/__tests__/components/NotificationsInbox.test.tsx`.

**Evidence**: ran `npx vitest run src/__tests__/components/NotificationsInbox.test.tsx` → `19 tests | 14 failed`. Failures are in data flow assertions (mock state mismatches). The file is **not dirty** in this session (it was failing before this session).

**Expected behavior**: the Antigravity owner did not own these tests; they may be out of scope for the demo closure.

**Impact**: not blocking this package; recorded for transparency.

**Smallest correction**: out of scope here; another owner or session can address.

**Regression check**: n/a — failures are documented above.

### 4.7 [CONFIRMED] NotificationMenu tests pass

**Files**: `src/__tests__/components/NotificationMenu.test.tsx`.

**Evidence**: `npx vitest run src/__tests__/components/NotificationMenu.test.tsx` → `19 tests | 19 passed`.

**Expected behavior**: the desktop dropdown component behaves correctly.

**Impact**: none.

**Smallest correction**: none.

### 4.8 [CONFIRMED] No link points to a non-existent route

**Files**: `src/components/notifications/NotificationsInbox.tsx`, `ShellUtilityMenus.tsx`, `MobileNotificationsSheet.tsx`, `src/lib/expediente-navigation.ts`.

**Evidence**: all `router.push` destinations resolve to existing routes:
- `/expediente` ✓
- `/cirugias` ✓
- `/coordinadores` ✓
- `/calendario` ✓
- `/notificaciones` ✓
- `/notificaciones?accion=informar-disponibilidad&solicitud=…` ✓ (used as a deep-link param, accepted by the page).

Sidebar navigation links (already in HEAD, not modified by this session) all point to existing routes (`src/app/...` directories confirmed present).

**Expected behavior**: matches the brief.

**Impact**: none.

**Smallest correction**: none.

---

## 5. Cross-cutting checks

### 5.1 [CONFIRMED] Permission / boundary crossings — none detected

The new code in the Antigravity package:

- `requireCompanyReadAccess` for personal-events routes (line 17, 18, 34, 35, 53 of `route.ts`). Acceptable for per-user personal data.
- Service-level filters by `companyId` + `userId` (see §2.2). ✓
- No new roles, no new capabilities, no Auth changes.

The pre-existing coordinator mutation flow uses `updateBackendSurgeryManagement` which goes through the standard surgery PATCH route (`requireCompanyMutationAccess`). No expansion.

**Expected behavior**: matches the brief.

**Impact**: none.

### 5.2 [PARTIAL] Approval evidence — not directly visible

The Antigravity package's `LOCK.md` declares the implementation owner. The brief says "no asumirla" (do not assume). There is no separate approval artifact for the new Personal Calendar endpoint in the owned folder. The acceptance criteria in the brief (§1.3 of the package's TASK_BRIEF.md) is implemented at the source-contract level only — runtime acceptance depends on a disposable DEV DB apply.

**Expected behavior**: the new calendar surface introduces a new persisted entity (`PersonalCalendarEvent`), a new mutation API, and a new route family. This is a schema + endpoint expansion. Per AGENTS.md §11 / §9.5, this requires a Task Brief + Franco approval before migration apply. The brief acknowledges "Personal calendar event contracts, APIs, services, and additive schema/migration if needed on confirmed disposable DEV target" but I see no approval artifact in the artifact folder.

**Expected behavior**: an approval artifact should be present before the migration is declared ready to apply.

**Impact**: BLOCKED for the literal acceptance path.

**Smallest correction**: surface the approval requirement explicitly; require Franco's sign-off for the schema additivity + new endpoint surface before any DB apply.

---

## 6. Suite inspection — five suites relevant to the package

| Suite | What it simulates | Verdict |
|---|---|---|
| `src/__tests__/unit/personal-calendar.validator.test.ts` | Zod schema validation only. No DB. | Run: 13/13 pass. Confidence: high for schema. |
| `src/__tests__/unit/personal-calendar.service.test.ts` | Service with mocked Prisma. Cross-tenant filter assertions. | Cover: positive paths. Negative paths for "another user's event" not enumerated. |
| `src/__tests__/unit/personal-calendar-routes.test.ts` | Route handlers with mocked service. Auth context mocked. | Run: included in 13/13. |
| `src/__tests__/components/NotificationMenu.test.tsx` | Dropdown component with mocked hook. | Run: 19/19 pass. |
| `src/__tests__/components/NotificationsInbox.test.tsx` | Inbox component with mocked hook. | Run: **14/19 fail**. Out of Antigravity scope. |

### 6.1 [CONFIRMED] Service-level cross-tenant negative test not enumerated

`personal-calendar.service.test.ts` exercises the triple-filter but I did not see a negative case where one user attempts to read / update / cancel another user's event. This is part of the privacy model.

**Expected behavior**: explicit negative assertion that `getPersonalCalendarEventById` of another user's event throws `notFound`.

**Smallest correction**: add a `notFound`-on-cross-user test.

**Regression check**: the new test fails before the fix.

### 6.2 [CONFIRMED] No integration test

There is no `src/__tests__/integration/personal-calendar-postgres.test.ts` (per the brief, no integration tests are required, so this is informational only).

---

## 7. Files inspected (file:line)

### 7.1 Calendar

- `src/app/calendario/page.tsx` — full file, 1228 lines
- `src/lib/validators/personal-calendar.validator.ts` — full file, 42 lines
- `src/lib/services/personal-calendar.service.ts` — full file, 201 lines
- `src/lib/api/personal-calendar.ts` — full file, 61 lines
- `src/app/api/companies/[companyId]/personal-events/route.ts` — full file, 56 lines
- `src/app/api/companies/[companyId]/personal-events/[eventId]/route.ts` — full file, 69 lines
- `prisma/schema.prisma:3411-3431` — model declaration

### 7.2 Coordination

- `src/components/coordinadores/CoordinadoresAdminClient.tsx` — full file, 608 lines
- `src/components/coordinadores/CoordinatorPersonalClient.tsx` — full file, 652 lines
- `src/hooks/useCoordinadoresFilters.ts` — full file, 513 lines (no diff in this session)
- `src/hooks/useTemporalNavigation.ts` — full file, 342 lines (no diff in this session)
- `src/lib/api/backend-surgeries.ts` — full file, 113 lines

### 7.3 Notifications

- `src/hooks/useNotifications.ts` — full file, 419 lines
- `src/components/layout/MobileNotificationsSheet.tsx` — full file (240 lines, partial read)
- `src/components/layout/ShellUtilityMenus.tsx` — full file (251 lines, partial read)
- `src/components/notifications/NotificationsInbox.tsx` — partial (lines 1-339)
- `src/lib/expediente-navigation.ts` — full file, 78 lines
- `src/lib/services/internal-notifications.service.ts:366-392, 808-869` — `emitInternalNotification`, `listInternalNotifications`

---

## 8. Searches / traces

- `git status --porcelown` / `git status` — dirty files enumerated
- `git hash-object` — initial + final hashes recorded
- `git diff --name-only` for the package's dirty scope
- `Get-ChildItem prisma/migrations -Recurse` — enumerated migrations
- `Select-String -Path 'prisma/migrations/*/migration.sql' -Pattern 'personal_calendar_event|PersonalCalendarEvent'` → 0 hits
- `grep` for `ordenCompraId.*Receipt|Receipt.*ordenCompraId|receiptId.*OrdenCompra|OrdenCompra.*receiptId` → 0 hits (cross-confirmation)
- `grep markAsRead(` → 4 hits across 3 consumers (all pass `notification.id`)
- `grep sourceEntityId` → `sourceEntityId` is NOT used as a navigation key
- `grep linkHref` → used as primary key in 3 consumers
- `grep requireCompanyReadAccess` / `requireCompanyMutationAccess` — boundary checks
- `grep requireReceiptMutationAccess` / similar — none in the new code
- `npx vitest run src/__tests__/unit/personal-calendar.*` → 13/13 pass
- `npx vitest run src/__tests__/components/NotificationMenu.test.tsx` → 19/19 pass
- `npx vitest run src/__tests__/components/NotificationsInbox.test.tsx` → 5/19 pass; 14 pre-existing failures out of scope

---

## 9. Browser validation, DB validation: not performed

Explicitly out of scope per the task brief.

---

## 10. Permission / security / segregation correctness

Per §5.1. The Antigravity package introduces no permission boundary expansion. The `requireCompanyReadAccess` on personal-events routes is appropriate for per-user personal data. No Auth or role changes.

---

## 11. Do not declare READY with outstanding migration or only by mocks

P1 is **BLOCKED**, not READY. The migration is missing. The validator / service / route mocks pass, but a real DB apply is required to certify the table exists and persistence works. The user-facing acceptance criterion "Visitar al Dr. Colman" cannot be verified without a disposable DEV DB apply + a Playwright session.

P2 is **PARTIAL**. Source-contract defects identified (coordinator identity by string, period filter partial, silent note-save failures). Runtime acceptance depends on backend contract verification.

P3 is **PARTIAL**. Source-contract is mostly correct. In-flight leak and pre-existing NotificationsInbox test failures noted.

---

## 12. Recommended corrections (out-of-scope for this review; for the Antigravity owner)

These are the smallest corrections the Antigravity owner should consider before declaring the package ready:

### T1 (Calendar — BLOCKING)

- Add `prisma/migrations/<YYYYMMDDHHMM>_add_personal_calendar_events/migration.sql` that creates the `personal_calendar_event` table matching the schema.
- Surface the approval artifact (per AGENTS.md §11) before DB apply.

### T2 (Calendar — desirable)

- Capture `currentCompanyId` in the page's `loadEvents` and `handleSavePersonalEvent` to discard stale responses on scope change.
- Add a focused test asserting cross-tenant negative cases (`getPersonalCalendarEventById` of another user's event → `notFound`).

### T3 (Coordination — partial)

- Replace the string-match `coordinadorCx` filter in the admin path with a `coordinadorContactId` (or `coordinatorAssignments[].contactId`) identifier backed by a backend-persisted relation.
- Apply the same change to the coordinator assignment alert dispatcher (`dispatchCoordinatorAssignedAlert`).
- Apply `isDateInPeriod` consistently in week/month grids, or surface the preset as informational.
- Bubble up `addBackendSurgeryNote` failures (or mark toast as partial).

### T4 (Notifications — partial)

- Add a `currentRequestId` (or `AbortController`) guard in `useNotifications.refreshList` and `markAsRead` so that late responses from the previous company/user scope do not repopulate the new scope.
- Fix the pre-existing `NotificationsInbox.test.tsx` failures (out of scope here; flagged for the owner of that test file).

### T5 (Approval)

- Document a clear approval artifact for the new `PersonalCalendarEvent` entity and the corresponding endpoints, per §11 of AGENTS.md. Do not apply the migration against any DB until the approval is recorded.

---

## 13. Status per block — final

| Block | State | Source of state |
|---|---|---|
| P1 — Calendar | **BLOCKED** | Schema declared; migration not present; tests are mock-only; runtime acceptance against a disposable DEV DB + Playwright not executed. |
| P2 — Coordination | **PARTIAL** | Source-contract mostly correct; string-match coordinator identity in admin path; partial temporal period; silent note failures; backend linkage not verified. |
| P3 — Notifications | **PARTIAL** | `markAsRead(notification.id)` consistent; navigation uses `linkHref` / `surgeryId` correctly; in-flight response leak on company/user scope switch confirmed. |

The Antigravity package is **not READY** in any block; only P3 is closest to a working source contract. Do not declare overall READY until P1 has a real migration applied against a disposable DEV DB and runtime behavior is observed in a browser session.

Lock released.