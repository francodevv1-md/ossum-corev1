# Task Brief — Logistics Operations Module

**Task ID:** LOGISTICS-OPERATIONS-MODULE-DEV-001  
**Status:** Design only — no implementation authorized by this brief  
**Owner:** Frontend / Logistics  
**Mode:** Operational module implementation after explicit approval and dependency gate  

## 1. Objective

Turn `/logistica` into the server-authoritative operational module for surgery logistics. It must give the logistics team one place to:

- start from a useful operational overview;
- review logistics news and exceptions;
- work a prioritized surgery inbox;
- filter and open one surgery;
- manage that surgery through the already implemented Prepare → Control → Dispatch → Receive → Reconcile workflow;
- scan only within the selected surgery context;
- return to the same selected surgery through a stable deep link.

This module becomes the future destination for Ficha CX’s hidden **Ver gestión logística** link. Ficha CX remains a read-only summary and does not duplicate this workspace.

## 2. Current-State Diagnosis

`src/app/logistica/page.tsx` is a legacy client-side page backed by `useOrtoTrackStore`. It filters and mutates local `logisticsDetails` directly, including ida/vuelta status changes. It is neither the Phase B/C/D authority nor a safe operational workspace.

The reusable server-authoritative detail already exists:

- `LogisticsOperationsWorkspace` loads one surgery’s E1 operations projection;
- it uses E2/E3 descriptors to render only server-permitted commands;
- its scanner uses the existing surgery-scoped `none | exact | ambiguous` resolver;
- all Phase B/C/D writes remain in their existing company-scoped routes/services/validators.

Do not duplicate, delete, reduce, move, or rewrite `LogisticsOperationsWorkspace` in this module task. Mount and reuse it intact after a surgery is selected.

## 3. Scope

### In scope

- Replace the legacy `/logistica` entry experience with a server-backed operational shell.
- Provide **Inicio**, **Novedades**, **Bandeja**, and **Gestión por cirugía** views.
- Preserve the current detail workspace as the sole action/scanner surface.
- Reuse the existing company-scoped surgeries list for basic case identity, dates, existing surgery priority, and coarse surgery/preparation filters where that data is sufficient.
- Establish a stable selected-surgery URL and return behavior after operational refreshes.
- Render only server-authoritative facts and descriptors; client code may order, filter, and present values already supplied by an authoritative response but may not recreate logistics eligibility, permissions, quantities, or state transitions.

### Explicit exclusions

- No Prisma schema, migration, Auth, permission-policy, Phase B/C/D mutation, validator, action descriptor, scanner resolver, or existing E1 contract change.
- No new workflow action, no new business priority rule, and no automatic transition/dispatch/receipt/reconciliation.
- No local/Zustand logistics status mutation, mock queue, or client-side fallback as an operational source.
- No refactor or reduction of `LogisticsOperationsWorkspace`; no copy of its mutation implementation into route-level components.
- No Ficha CX redesign implementation under this task.
- No deployment, production/staging access, commit, push, or PR.

## 4. Authority and Reuse Map

| Module need | Existing source / reusable component | Rule |
| --- | --- | --- |
| Selected-surgery operations | E1 `GET /api/companies/{companyId}/surgeries/{surgeryId}/logistics/operations` | Sole physical-logistics authority for a selected surgery. |
| Prepare, control, dispatch, receive, reconcile | Existing E2/E3 descriptors from E1 and existing Phase B/C/D routes | Reuse through `LogisticsOperationsWorkspace`; do not reconstruct action eligibility or call guessed routes. |
| Scanner | Existing `POST .../logistics/operations/resolve-code` | Only inside a selected surgery’s management view. It is surgery-scoped and cannot power a global queue scan. |
| Selected surgery identity/date/priority | Existing company-scoped `GET /api/companies/{companyId}/surgeries` | Reuse visible number, patient/institution, scheduled/surgery dates, `priority`, `cxStatus`, and `prepStatus` as published. |
| Basic filters | Existing surgery-list query parameters: `status`, `cxStatus`, `prepStatus`, `priority`, `branchId`, patient/doctor/institution, pagination | Use only documented/current query parameters; no client-only source of truth. |
| Per-surgery logistics updates | Existing `LogisticsOperationsWorkspace` refresh after successful descriptor execution | Preserve its existing refresh/focus behavior. |
| Novedades | Existing per-surgery Seguimiento/notifications only where a selected surgery is open | Do not claim a company-wide logistics-news inbox until a server read model supports it. |
| Ficha CX link | Future `/logistica` selected-surgery URL | Keep hidden until this module has an authoritative destination and selected-surgery behavior is validated. |

### Proven read-model gap

The existing surgeries list is company-scoped and can identify/filter cases, but it does not publish B/C/D logistics totals, active physical blockers/differences, Phase D receipt/reconciliation facts, or a server-ranked next task. E1 is strictly one-surgery-at-a-time.

Therefore a real company-wide logistics **Bandeja**, **Inicio** counts, and **Novedades** feed cannot be produced correctly by fetching E1 once per surgery in the browser or by reading Zustand. If those views must rank/filter on logistics facts, the minimum necessary dependency is one new company-scoped, read-only logistics inbox projection derived server-side from the same persisted B/C/D records. This is a demonstrated contract gap, not authorization to create it. No schema is indicated: the required facts already exist in the Phase B/C/D persistence model.

Until that dependency is explicitly approved and implemented, the module may ship only the selected-surgery management entry plus the existing coarse server-backed surgery list, clearly without logistics-derived priority/exception claims.

## 5. Information Architecture

### A. Inicio

Purpose: orient the operator without fabricating logistics KPIs.

- Selected company, date context, and a concise explanation of the active view.
- When the inbox projection exists: server-published counts for cases requiring preparation/control/dispatch/receipt/reconciliation and active exceptions.
- Before it exists: no fabricated totals. Show the server-backed surgery list entry point and an honest empty/limited-state message.
- One prominent “Abrir bandeja” navigation control; no operational action from Inicio.

### B. Novedades

Purpose: show recent logistics-relevant change, not an unbounded audit dump.

- When the inbox projection exists: server-published, company-scoped event summaries with visible surgery reference, event label, time, and severity/exception signal.
- Selected surgery: reuse the existing per-surgery timeline as supporting context; do not use it as physical authority.
- Before company-wide support exists: render no global novelty feed. State that logistics novedades are available inside each selected surgery.
- A novelty opens the selected surgery management view; it never executes an action.

### C. Bandeja de cirugías

Purpose: answer “what needs logistics attention now?”

Required row/card content when authoritative data exists:

- visible CX number, patient/institution, surgery date, existing surgery priority;
- authoritative logistics stage(s) or an explicit mixed summary;
- active exception/blocker count and the highest server-published operational attention reason;
- Caja/Remito references only when a user-safe visible value is published;
- last logistics event/time; and
- opening control to **Gestionar cirugía**.

Filters:

- text search and existing coarse surgery filters (date, priority, surgery/preparation status, branch, patient, doctor, institution) can use the current surgeries route;
- logistics stage, exception, stale control, pending return, receipt, reconciliation, Caja, Remito, and server-ranked urgency filters require the inbox projection; they must remain unavailable rather than be approximated in the browser.

Priorities and exceptions:

- preserve the existing Surgery `priority` as case metadata;
- show B/C/D blockers, differences, pending identification, and reconciliation/receipt facts only as published server facts;
- do not create a frontend scoring/priority formula or treat a permission denial as a logistics exception;
- use semantic label plus color/icon; never rely on color alone.

### D. Gestión por cirugía

Purpose: execute the existing physical workflow for exactly one selected surgery.

- Route context owns selected company and surgery identity; it passes only `companyId`, `surgeryId`, and the existing optional freshness key to `LogisticsOperationsWorkspace`.
- Keep the current workspace’s physical allocation map, restrictions, action confirmation, accessible focus management, stale/error behavior, and refresh semantics unchanged.
- Preserve the current operational stage order: Preparar → Control → Despachar → Recibir → Conciliar.
- Do not add an alternate action rail, inline mutation controls, or duplicate scanner.
- A clear back control returns to the previous Bandeja query without losing its filters; it is navigation only.

### E. Scanner

- Available only after the user has selected a surgery in Gestión por cirugía.
- Reuse the workspace’s manual/USB/camera fallback and its `none | exact | ambiguous` handling.
- A scan identifies/selects an eligible allocation; it never submits a mutation by itself.
- A global scanner is excluded: the current resolver is intentionally surgery-scoped and an unscoped lookup would require a separate, approved, ambiguity-safe server contract.

## 6. URL and Navigation Contract

Proposed UI route shape, using no new API contract:

```txt
/logistica                         → Inicio or Bandeja
/logistica?cirugia={surgeryId}     → Gestión by selected server-side surgery ID
```

- The page resolves the selected surgery through existing company-scoped reads before mounting the workspace.
- The UI shows visible CX numbers; the internal selection key may remain in the URL but is never rendered as user-facing content.
- Unknown, unauthorized, archived, or cross-company selection resolves to a neutral “Cirugía no disponible” state. It must not fall back to another case.
- Once validated, Ficha CX may link to the same URL using its known server-side surgery ID. Until then its link remains hidden.

## 7. States

| State | Required behavior |
| --- | --- |
| No active company | Block the shell with an operational explanation; fetch nothing. |
| Loading list | Skeleton rows/cards; retain current filters and selected URL context. |
| Empty coarse list | “No hay cirugías que coincidan con los filtros.” No invented logistics conclusion. |
| Inbox projection unavailable | Keep logistics ranking/counts/news absent and explain that the current view only supports case selection. |
| Selected surgery loading | Mount the existing workspace loading state. |
| Selected surgery unavailable | Neutral unavailable state; do not show another surgery or raw errors/IDs. |
| Operations partial/stale/error | Reuse the existing workspace behavior; preserve last successful physical projection where it already does so. |
| No action capability | Reuse the descriptor-provided restriction behavior in the workspace; do not calculate permissions in the shell. |

## 8. Desktop and Mobile Layout

### Desktop

```txt
┌ Logística ─ Inicio | Novedades | Bandeja ────────────────────────────┐
│ Company context · search / supported filters                         │
├ Bandeja: authoritative rows or limited existing case list             ┤
│ CX · case · date · priority · logistics summary · exception · open    │
├──────────────── Gestión de CX-XXXX ──────────────────────────────────┤
│ Back to Bandeja                                                       │
│ [existing LogisticsOperationsWorkspace, unchanged]                   │
└──────────────────────────────────────────────────────────────────────┘
```

- Use the existing Stock/Cajas/Remitos light module shell for navigation/list surfaces.
- The unchanged operations workspace keeps its current dedicated operational treatment inside Gestión por cirugía.
- Do not compress the existing physical allocation table into a global inbox row.

### Mobile

- Top-level navigation becomes compact tabs or a select-like navigation with a visible current view.
- Bandeja rows become touch-safe case cards: CX, date, priority, published logistics summary, exception signal, and a single open control.
- Gestión renders the unchanged responsive operations workspace; scanner remains after its selected-surgery context and before operational table/cards as already validated.
- No global scanner, horizontal page overflow, or hidden critical exception signal.

## 9. Planned Files (Implementation Phase Only)

| File | Intended change |
| --- | --- |
| `src/app/logistica/page.tsx` | Replace legacy Zustand logistics editor with route shell, selection, and view orchestration. |
| `src/components/logistica/LogisticsModuleShell.tsx` | New shell for Inicio/Novedades/Bandeja/Gestión navigation and URL state. |
| `src/components/logistica/LogisticsSurgeryInbox.tsx` | New server-backed case-list presentation; no frontend logistics derivation. |
| `src/components/logistica/LogisticsHome.tsx` | New limited/authoritative Inicio surface depending on the projection gate. |
| `src/components/logistica/LogisticsNews.tsx` | New novelty presentation, gated by authoritative company-wide data. |
| `src/components/expediente/LogisticsOperationsWorkspace.tsx` | No change; mount as-is for selected-surgery management. |
| `src/lib/api/backend-surgeries.ts` | Reuse/adapt only if its existing surgery-list client supports the module query needs. |
| `src/app/api/companies/[companyId]/logistics/inbox/route.ts` and a paired read service/validator/tests | Conditional only: create after explicit approval if the proven inbox projection gap must be closed. |
| `src/__tests__/components/LogisticsModuleShell.test.tsx` | Route state, selected-surgery mount, limited state, and no duplicate mutation/scanner tests. |

No Prisma/schema/migration file is planned. The conditional inbox endpoint must be read-only, company-scoped, server-authoritative, paginated, and built from existing B/C/D records; it requires a separate implementation approval before creation.

## 10. Acceptance Criteria

1. `/logistica` no longer reads or mutates `useOrtoTrackStore().logisticsDetails` as an operational source.
2. A user can select one company-scoped surgery and open its existing Phase E workspace without changing its current action, scanner, focus, or refresh behavior.
3. No existing Phase B/C/D/E1/E2/E3 action contract, endpoint, validator, schema, or permission decision changes.
4. The module does not duplicate selected-surgery mutations or scanner controls outside `LogisticsOperationsWorkspace`.
5. The queue does not claim logistics-derived state, exception, priority, next task, or count unless supplied by an authoritative server response.
6. The existing surgeries list can provide only its published coarse filtering/identity facts; unavailable logistics filters remain unavailable until the inbox projection exists.
7. Selected-surgery URLs are stable, tenant-safe, and never fall back to a different surgery.
8. The future Ficha CX link remains hidden until this selected-surgery destination is delivered and browser-validated.
9. Desktop and 390px mobile work without page overflow; all navigation/open controls are keyboard accessible and touch-safe.

## 11. Validation (Implementation Phase Only)

- Focused route/component tests for company context, query parsing, selected-surgery validation, unavailable case, back-to-inbox filter preservation, and absence of legacy store writes.
- Existing `LogisticsOperationsWorkspace` component and E1/E2/E3 route/service tests pass unchanged.
- If the conditional inbox projection is approved: service/route tests for tenant isolation, pagination, authoritative stage/exception mapping, unavailable facts, and no writes.
- TypeScript typecheck.
- Authenticated browser QA on disposable DEV: desktop and 390px mobile selection → management → scanner fallback/action flow → return to filtered inbox; no mutation occurs during shell/navigation checks.
- Independent diff review confirms no schema/auth/contract change outside the explicitly approved conditional inbox read contract.

## 12. Evidence Reviewed

- `src/app/logistica/page.tsx` — legacy Zustand editor that must not remain authoritative.
- `src/components/expediente/LogisticsOperationsWorkspace.tsx` — existing selected-surgery operational/scanner workspace to preserve unchanged.
- `src/lib/services/logistics-operations-read.service.ts` — E1 one-surgery physical projection and E2/E3 descriptor composition.
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/logistics/operations/{route,resolve-code/route}.ts` — current selected-surgery read and resolver boundaries.
- `src/app/api/companies/[companyId]/surgeries/route.ts` and `src/lib/services/surgery.service.ts` — existing company-scoped surgery list and coarse filters.
- `src/app/api/companies/[companyId]/remitos/route.ts` and `src/lib/services/cajas-operational.service.ts` — supporting document- and Caja-centric reads, explicitly insufficient as a surgery logistics inbox.
- Repository route/service search — no company-scoped logistics surgery inbox/list or cross-surgery resolver exists; all current logistics operation reads and scans require a known surgery ID.
- `knowledge/specs/LOGISTICS-OPERATIONS-READ-PROJECTION-E1-DEV-001/*`, `LOGISTICS-ACTION-DESCRIPTORS-E2-DEV-001/*`, `LOGISTICS-ACTION-DESCRIPTORS-E3-DEV-001/*`, and `LOGISTICS-OPERATIONS-UX-T3-DEV-001/TASK_BRIEF.md`.
