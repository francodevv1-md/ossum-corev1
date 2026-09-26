# Spec — Logistics Inbox Responsive UX Redesign

**Change:** `LOGISTICS-INBOX-RESPONSIVE-UX-REDESIGN-DEV-001`  
**Status:** Ready for apply

## Requirements

### R1 — Preserve authority

The redesign MUST preserve the existing Inbox GET request, filter values, cursor pagination, server order, local selection/return behavior, E1 loading, E2/E3 descriptors, B/C/D bodies, idempotency, permissions, and refresh callback. It MUST NOT add API calls, client sorting, authority inference, IDs/payloads, or new dependencies.

**Scenario: existing permitted detail action**
- **Given** a server-published descriptor in the selected workspace
- **When** the redesigned surface renders it
- **Then** its availability, fields, route, method, and existing refresh path remain governed by `LogisticsOperationsWorkspace`.

### R2 — Inbox hierarchy and filters (P1)

The Inbox MUST show only published summary signals (news, priority, exceptions) and MUST leave unsupported overdue unavailable. Search, preparation, logistics state, blocker state, and date context (when currently supported) MUST be visible; institution, locality, surgery state, stage, and other existing filters MUST be under an accessible “Más filtros” disclosure. Filter semantics and query construction MUST remain unchanged.

**Scenario: secondary filters**
- **Given** the Inbox at 390px or 1024px
- **When** the user opens “Más filtros”
- **Then** supported secondary controls are reachable without clipped content and closing it does not clear active filters.

### R3 — Prioritized responsive Inbox (P2)

At 1920px the semantic table MUST show reference, date, patient, institution, preparation, logistics state, blockers/exceptions, and next task. At tablet widths it MUST remove only lower-priority published facts from the permanent list. At 390px it MUST render cards containing identity, the three independent states, blocker/next-task signal, and one clear detail-opening affordance. The page MUST NOT horizontally overflow.

**Scenario: direct open and return**
- **Given** a visible row/card and active filters/cursor
- **When** the user activates its direct detail control by pointer, Enter, or Space and then returns
- **Then** the existing selected surgery opens and the Inbox state and return position are retained.

### R4 — Detail integration (P3)

The selected detail MUST present identity, three states, blockers/next published task, material/caja facts, remito/difference facts, consumption/returns/reconciliation facts, traceability, and only descriptor-authorized actions in that order. Missing or unavailable facts MUST remain explicit. P3 MAY change layout/classes and progressive disclosure only; it MUST NOT alter workspace requests, descriptor parsing, action payload construction, modal/focus mechanics, scanner behavior, or refresh behavior.

**Scenario: unavailable next task**
- **Given** an Inbox or E1 projection without a published next action
- **When** the detail renders
- **Then** it says the task is unavailable and does not infer an operational action.

### R5 — Cross-surface quality (P4)

All semantic colors MUST have Spanish text and, where used, existing icons. Interactive mobile controls MUST be at least 44px. Loading, error, empty, focus-visible, and no-console-error behavior MUST remain available. Required browser evidence is named `1920`, `1366`, `1024`, and `390`.

## Guardrails

- Zero touch: `prisma/**`, `src/app/api/**`, `src/lib/services/**`, `src/lib/validators/**`, Auth/permissions, hooks request semantics, schema, migrations, providers, C14, and dependencies.
- `LogisticsGlobalInbox.tsx` and `LogisticsOperationsWorkspace.tsx` require an ownership lock before edit; sequential ownership only.
- A missing safe live action is DEV fixture debt, not a reason to create/mutate data.

## Acceptance

- R1 is proven by focused regressions and diff inspection.
- R2–R4 are proven at all four required viewport widths plus keyboard/detail-return browser smoke.
- R5 is proven by focused tests, `npm run typecheck`, console/overflow inspection, and independent review.
