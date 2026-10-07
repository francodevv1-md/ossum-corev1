# TASK BRIEF — COORDINATION-NOTIFICATIONS-CALENDAR-DEMO-DEV-001

**Task ID:** COORDINATION-NOTIFICATIONS-CALENDAR-DEMO-DEV-001  
**Status:** In Progress / Implementation  
**Workspace:** `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`  
**Branch:** `ux/antigravity-redesign`  
**Owner:** Antigravity (Implementation owner — UI, hooks, contracts, server-side logic)

---

## 1. Objective

Implement and validate the complete DEV closure for:
1. **Coordinación y Estados**: Connect active global and personal screens directly to backend reading, resolve coordinator by backend identity, persist date/assignment/status mutations via existing durable endpoints, fix UI state translations, preserve inputs on conflict/error, and fix temporal period filtering in views.
2. **Notificaciones**: Fix mark as read using `notification.id`, resolve target destinations with valid `surgeryId` and context without treating `sourceEntityId` as surgery ID, fix navigation links pointing to valid routes, and ensure list/unread counts remain synchronized.
3. **Calendario Personal V1**: Load surgeries directly from backend without depending on visiting another screen, add personal calendar events (title, start, end, description) with full CRUD (create, edit, cancel), persist and recover after reload, distinguish personal events from surgeries in existing views (Acceptance: "Visitar al Dr. Colman").

---

## 2. Scope & Boundaries

### In Scope
- `src/components/coordinadores/CoordinadoresAdminClient.tsx`
- `src/components/coordinadores/CoordinatorPersonalClient.tsx`
- `src/hooks/useCoordinadoresFilters.ts` / `useTemporalNavigation.ts` / coordination controls
- `src/hooks/useNotifications.ts`
- `src/components/layout/MobileNotificationsSheet.tsx`
- `src/components/layout/ShellUtilityMenus.tsx`
- `src/components/notifications/NotificationsInbox.tsx`
- `src/lib/expediente-navigation.ts`
- `src/app/calendario/page.tsx`
- Personal calendar event contracts, APIs, services, and additive schema/migration if needed on confirmed disposable DEV target.

### Out of Scope / Prohibitions
- No changes to Auth, roles, permissions, secrets, or production systems.
- No touching Sol's files or Preparation/Remitos / Stock / Movimientos active locks.
- No WebSockets, external push, or Google Calendar / recurrence / external reminders.
- No broad refactoring of Cirugías core or converting Zustand store into authority.
