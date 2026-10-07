# Task Brief — Logistics Inbox Responsive UX

## Objective

Redesign `/logistica` into a responsive, server-authoritative operational inbox for preparation, dispatch, transit, consumption, returns, reconciliation, and exceptions.

## UX direction

Extend the existing Stock, Cajas, and Remitos operating language: a soft blue-gray workspace, distinct white operational surfaces, compact navy hierarchy, and semantic status accents. The inbox scans urgency and the next actionable fact first; selected surgery detail progressively reveals operational evidence without exposing internal tokens.

## Scope

### Package 1 — Inbox

- Replace the wide data dump with a compact desktop table and direct row/card selection.
- Show counters for: sin preparar, con faltantes, listas para despacho, en tránsito, and devolución/conciliación pendiente.
- Keep search, date, preparation, logistics, and blockers visible; move institution, locality, and surgery state into “Más filtros”.
- Remove the separate “Abrir CX” button list.

### Package 2 — Detail

- Desktop: selected-surgery integrated detail surface.
- Mobile: dedicated detail view with a clear return to the inbox.
- Reuse `LogisticsOperationsWorkspace` and its E1/E2/E3-backed actions unchanged.
- Order identity/states, next task/blockers, boxes/materials, remitos, consumption/returns, traceability, and authorized actions as provided by the workspace.

### Package 3 — Responsive and quality

- Adapt table columns at desktop/tablet widths and use cards on mobile.
- Prevent page-level horizontal scrolling and clipped content.
- Add focused regression coverage and visual validation at 1920, 1366, 1024, and 390 pixels.

## Authority constraints

- `Surgery.cxStatus`, `Surgery.prepStatus`, and `Remito.state` remain independent.
- `en_transito` is a Remito state.
- “Realizada” continues through `executeScheduledSurgery`; suspend/cancel continues through `updateSurgeryCxStatus`.
- Consume existing Inbox B/C/D and E1/E2/E3 contracts only. Do not invent states, IDs, payloads, next actions, or permissions.

## Exclusions

Schema, migrations, backend contracts, service/validator changes, Auth, tenant/security, permission changes, core Cirugías changes, new dependencies, deployment, and Git operations.

## Files and ownership

- Owned: `src/app/logistica/page.tsx`, `src/components/logistica/**`, `src/__tests__/unit/logistics-global-inbox-ui.test.tsx`, this spec folder.
- Read-only dependencies: `src/components/expediente/LogisticsOperationsWorkspace.tsx`, E1/E2/E3 routes/services/contracts, and Stock/Cajas/Remitos reference surfaces.

## Validation

- Focused component tests.
- TypeScript check limited to changed surface where full-repo baseline is unrelated.
- Chromium authenticated visual checks and screenshots at 1920, 1366, 1024, and 390 pixels.
- UI detector over changed UI files.

## Delivery

Working-tree DEV package only. No commit, push, PR, schema, or deployment.
