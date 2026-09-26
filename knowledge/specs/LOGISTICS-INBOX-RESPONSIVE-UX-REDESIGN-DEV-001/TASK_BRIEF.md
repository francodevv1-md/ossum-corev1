# Task Brief — Logistics Inbox Responsive UX/UI Redesign

**Task ID:** LOGISTICS-INBOX-RESPONSIVE-UX-REDESIGN-DEV-001  
**Status:** Design brief only — implementation requires its own approved DEV execution package  
**Audience:** OSSUM COR product, frontend, QA, and reviewer agents  
**Scope:** `/logistica` presentation and interaction design only

## Decision and Objective

Redesign `/logistica` as a compact operational desk organized like Coordinadores, specialized for preparation, dispatch, transit, returns, and exceptions. The redesign must improve scanability and responsive decision-making while preserving all current backend authority, E1/E2/E3 projections, B/C/D descriptor actions, tenant boundaries, and existing detail workflow.

This brief does **not** authorize implementation, contract changes, or operational mutations.

## Current Functional Baseline

- The global Inbox remains the company-scoped, paginated source for list-level logistics facts.
- Selecting a desktop row or mobile card opens the surgery logistics detail without Ficha CX.
- The detail hosts the existing `LogisticsOperationsWorkspace`, which consumes E1 and E2/E3 descriptors and submits only existing authoritative B/C/D operations.
- The three status dimensions are independent: `Surgery.cxStatus`, `Surgery.prepStatus`, and surgical `Remito.state`. `En_transito` belongs only to Remito.
- A live descriptor-mutation E2E is deferred as **DEV fixture debt**: the currently inspected Inbox data has no safe surgery with both physical allocation and permitted action. No data may be created or mutated merely to make this redesign pass.

## Non-Negotiable Authority Boundaries

- Preserve `GET /api/companies/{companyId}/logistics/inbox` and E1/E2/E3 contracts unchanged.
- Preserve existing B/C/D routes, descriptor targets, idempotency fields, validation, permissions, audit, and refresh behavior unchanged.
- The UI must not manufacture IDs, payloads, roles, permissions, action availability, state transitions, counts, priorities, or next actions.
- No backend, schema, migration, provider, Auth, RLS/permissions, C14, billing, map, scanner, or dependency changes.
- Surgery lifecycle controls remain outside this redesign. If ever presented later, suspension/cancellation use `updateSurgeryCxStatus`; performed uses `executeScheduledSurgery`; no logistics event may transition Surgery automatically.

## Information Architecture

### 1. Operational hierarchy

1. Compact summary: new items, priorities, exceptions, and only approved contextual signals.
2. Frequent filters always visible: search, preparation, logistics state, blocker state, and date context when present.
3. Secondary filters under **Más filtros**: institution, locality, surgery state, stage, and other server-supported filters.
4. Prioritized Inbox: urgency, date, missing material/trace, and blockers must be visible through the existing server order and published fields. The UI must not re-sort client-side.
5. Selecting a row/card opens the contextual detail while retaining filters, cursor, and return position.
6. Secondary facts stay in detail or an expandable complement, never as permanent wide-table noise.

### 2. Inbox composition

The main desktop table shows only:

- surgery reference;
- date;
- patient;
- institution;
- preparation;
- logistics state;
- blockers/exceptions;
- next task.

Do not show technical IDs, raw enum tokens, descriptor metadata, permission explanations, raw event payloads, or quantity columns without operational context.

Desktop uses a dense, semantic table with a navy header, readable row focus/selection, and no page-level horizontal scroll. Tablet progressively hides lower-priority columns and uses the detail complement for omitted facts. Mobile uses operational cards with identity, the three status dimensions, blocker/next-task signal, and one clear primary opening action.

### 3. Detail composition

The selected detail is an operational continuation, not a second Inbox. It contains, in this order:

1. Surgery identity: reference, patient, institution, date, and the three separate states.
2. Next authoritative task and current blockers.
3. Caja/material summary, quantities with explicit labels, positions, lots, and series.
4. Remitos, dispatch/transit evidence, and differences.
5. Consumption, returns, receipt, and reconciliation facts.
6. Derived/read-only traceability.
7. Only E2/E3-authorized actions already provided by descriptors: prepare, control, dispatch, consume, return, receive, and reconcile.

Unavailable or partial facts must remain explicit and actionable only through existing server descriptors. No visual state may imply permission or completion that is not published.

## Visual Direction

- Reuse the established operational language of Stock, Cajas, and Remitos.
- Replace absolute white and the isolated black detail panel with a restrained blue-gray workspace, differentiated neutral surfaces, and navy table/section headers.
- Semantic color is support, not the only signal:
  - cyan: active process;
  - amber: pending;
  - red: blocker/exception;
  - green: completed/healthy;
  - gray: unavailable.
- Every semantic color must include clear Spanish text and, where useful, an existing icon.
- Prefer compact bordered surfaces, calm spacing, dense controls, visible keyboard focus, and operational typography. Avoid decorative cards, generic dashboards, and a second visual system.

## Responsive Acceptance Matrix

| Viewport | Required behavior |
| --- | --- |
| 1920 px | Dense table with all primary Inbox columns; detail can complement without crowding the list. |
| 1366 px | Compact table; useful primary columns remain legible; no clipped controls or page-level horizontal overflow. |
| 1024 px | Lower-priority fields move to detail/complement; filter controls wrap intentionally; selection remains obvious. |
| 390 px | Cards replace table; 44 px touch targets where interaction requires them; one primary open-detail action; no overlap, clipping, or horizontal page overflow. |

Across all viewports, preserve filters, cursor pagination, loading/error/empty states, focus behavior, and no-console-error baseline. Native table-region scrolling is allowed only where the information cannot be responsibly compressed; the document page itself must never scroll horizontally.

## Future Implementation Packages

### P1 — Inbox hierarchy and filters

**Scope:** summary strip, visible/secondary filter split, responsive filter behavior, and state/priority presentation.  
**Must not change:** hook, server query parameters, filter semantics, counts, pagination, or data contracts.  
**Verification:** focused UI tests for visible vs secondary filters; screenshots at 1920, 1366, 1024, and 390; keyboard focus review.

### P2 — Responsive prioritized Inbox

**Scope:** desktop/tablet table columns, mobile cards, row/card selection affordance, blockers and next task presentation.  
**Must not change:** server sort/cursor, selected-detail state behavior, published facts, or action authority.  
**Verification:** focused UI tests; screenshots at all four viewports; no page horizontal overflow; table/card selection and return-position browser check.

### P3 — Detail visual integration

**Scope:** visual shell around the existing operational detail, identity/state hierarchy, progressive disclosure, and light-theme integration with Stock/Cajas/Remitos.  
**Must not change:** `LogisticsOperationsWorkspace` action execution protocol, E1/E2/E3 contracts, B/C/D route/body submission, or descriptor availability.  
**Verification:** focused component tests; screenshots at all four viewports; detail states for partial, blocked, unavailable, and permitted action.

### P4 — Cross-surface polish and QA

**Scope:** accessibility, focus, loading/error/empty states, mobile density, console/network review, and visual regression corrections only.  
**Must not change:** feature scope, authority, contracts, or operational rules.  
**Verification:** typecheck, focused tests, independent review, browser screenshots at all four viewports, and Inbox → detail → return smoke test. The descriptor mutation E2E remains fixture debt unless a pre-existing safe DEV case is available.

## Required Evidence for Every Package

- A focused test command and result.
- Typecheck when TypeScript changes.
- Four named screenshots: 1920, 1366, 1024, and 390.
- Browser evidence for no page-level horizontal overflow, no overlapping controls, no clipped primary copy, and no console errors caused by the surface.
- Independent review against this brief and the existing Stock/Cajas/Remitos visual language.
- Caveman handoff: Done, Changed, Files, Validations, Risks, Next.

## Explicit Exclusions

- New operational features or descriptors.
- New filters, columns, ranking algorithms, fields, services, API calls, or client-side data composition.
- Ficha CX redesign, Coordinadores redesign, navigation redesign, map, billing, Auth, schema/migrations, C14 work, provider changes, data seeds, deploy, commit, push, or PR.

## Exit Criteria for the Later Execution Package

The redesign is complete only when the four responsive viewports meet the acceptance matrix, existing Inbox/detail behavior is preserved, all colors remain text/icon-backed, UI submits no invented operation data, and independent visual/technical review passes. The separate real-action E2E is recorded as fixture debt until an eligible disposable DEV surgery already exists.
