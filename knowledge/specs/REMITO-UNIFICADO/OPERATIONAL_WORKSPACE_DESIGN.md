# Operational Remito Workspace — Technical and UX Design

**Task:** REMITOS-OPERATIONAL-WORKSPACE-DESIGN-001
**Status:** Design specification — approved direction: Proposal 1, direct operational workspace
**Scope:** Manual Remito creation and draft editing only. This document designs a frontend migration; it does not change an API, domain rule, schema, authorization rule, or persistence contract.

## 1. Intent and guardrails

The current `RemitoDraftDialog` makes a dense, line-oriented operational task compete with a modal viewport. The replacement is a dedicated, task-focused workspace:

- `/remitos/nuevo` creates a manual Remito draft.
- `/remitos/[remitoId]/editar` edits one existing **Borrador**.

It must be calm, clinical, and data-forward: a working document rather than a dashboard, marketing page, or oversized modal. The operator needs permanent context, a fast item grid, an at-a-glance operational summary, and reliable save/leave behavior.

The canonical domain rule remains: a Remito records **what leaves**. It is not consumption, invoicing, stock movement, or an assumed copy of a budget. A surgery link is optional when the documented movement is not surgical.

### Existing capability versus designed extension

| Capability | Status in this workspace change |
| --- | --- |
| Manual draft create, draft update, emit, company-scoped authorization, audit and optimistic concurrency | **Existing contracts to reuse** |
| Manual line entry, quantity/unit, recipient snapshots, logistics fields, trace fields, and observations | **Existing payload fields to expose in the workspace** |
| Product catalog search modal | **Future placeholder only; no search API exists** |
| Import from Presupuesto, Preparation, Box, or other source | **Future placeholder only; no import/read contract is asserted** |
| Source linkage semantics or automatic origin selection | **Not designed as a real feature here; requires a business/API decision** |
| Shared cross-document implementation | **Future extraction candidate; no abstraction is mandated now** |

## 2. Navigation and document lifecycle

### 2.1 Entry points

1. The `Nuevo remito` CTA from `/remitos` navigates to `/remitos/nuevo`; it does not open a dialog.
2. `Modificar` is shown only for a `Borrador` and navigates to `/remitos/[remitoId]/editar`.
3. A future Ficha CX entry point may pass a visual initial context only after that caller is scoped separately. It must navigate to the same create route, not recreate a competing form.
4. The workspace header starts with `← Remitos`, then a compact document label: `Nuevo remito` or `Remito R-#### · Borrador`.

The back destination is browser history when it remains in the OSSUM workflow; otherwise it is `/remitos`. This prevents a deep-linked editor from returning to an unrelated site.

### 2.2 Create flow

`/remitos/nuevo` begins as local form state; it must not create a server record merely by opening the page.

1. The operator completes required context and at least one valid line.
2. `Guardar borrador` calls the existing `POST /api/companies/[companyId]/remitos` payload contract.
3. On success, the page replaces its route with `/remitos/[remitoId]/editar`, adopts the returned `updatedAt` as its clean baseline, and keeps the operator in the workspace. This avoids a duplicate create if they save again.
4. The success acknowledgement is concise and non-blocking: `Borrador guardado`.
5. Before a draft exists, `Emitir` is unavailable. There is no implicit create-and-emit request shape.

### 2.3 Edit, save, emit, and locked documents

1. `/remitos/[remitoId]/editar` loads the existing detail through the existing company-scoped `GET` route. Loading uses a structural skeleton for header, fields, grid, and summary—not a page-centred spinner.
2. Only a document whose current state is `Borrador` is editable. The workspace preserves `origin`; it is immutable in the current update contract.
3. `Guardar cambios` calls existing `PATCH /remitos/[remitoId]` and includes the original/current `expectedUpdatedAt` baseline.
4. `Emitir` is available only to a clean, valid saved draft. If a valid draft has local changes, the primary action is `Guardar cambios`; emission requires a completed successful PATCH before the existing `POST /emitir` call. The UI must never present this as one new atomic API operation.
5. After a successful emission, the document is locked. Navigate back to `/remitos` with a short success notice (`Remito R-#### emitido`). Do not leave an editable form with stale controls on screen.
6. If an edit URL resolves to `Emitido` or another non-draft state (for example, another user emitted it), show the locked state and one action, `Volver a remitos`; do not offer disabled-looking editable data as if it could be saved.

### 2.4 Unsaved changes, conflict, and failure

`dirty` is page-local and means the current form differs from its latest successful server baseline.

- A back link, in-app route change, browser Back/Forward, or closing/refreshing the tab while `dirty` requests confirmation: **Seguir editando**, **Descartar cambios**, or **Guardar borrador**. During an in-flight request, leaving is blocked and the action status remains visible.
- `beforeunload` provides the browser-native warning only for unsaved page exit. It is a safety net, not the primary interaction.
- Inline validation focuses the first invalid field and keeps the user at the relevant section. API errors remain visible beside the sticky action area and preserve all local values.
- A `409 remito_update_conflict` means the baseline is stale. Keep local values intact; explain that another user updated the draft. Offer **Actualizar desde servidor** (with a discard confirmation when local edits remain) and **Seguir revisando**. Do not silently retry, overwrite, or merge lines.
- A draft that becomes non-editable after reload/conflict is a business-state lock, not a client error. Its resolution is return to the list and inspect the now-emitted document.

## 3. Information architecture and responsive layout

### 3.1 Desktop (>= 1280 px)

Use a centered operational canvas, `max-width: 1600px`, with 24 px desktop gutters.

1. **Context header** — 64–72 px high: back navigation, document title/number, state chip, and a compact dirty/saving indicator. It is sticky below the application chrome only if the existing layout supports that safely.
2. **Main work column** — fluid, minimum 0; contains Context, Material Remitido, and optional Detail sections in this order.
3. **Operational summary rail** — 304–336 px, sticky beneath the header. It displays state, branch, movement reason, recipient, surgery reference, line count, total quantity, and prominent completion gaps. It summarizes; it never becomes a second editable form.
4. **Sticky action bar** — 64–72 px at the bottom of the viewport/workspace: left-side saving/error status; right-side `Volver`, secondary save action, and one primary action. It has a solid surface and top border, not glass or a floating gradient.

The content column uses section dividers and quiet surface changes rather than card-inside-card nesting. Use a 16 px grid gap, 24 px section rhythm, 8 px control rhythm, and a 44 px minimum touch target where a control is used on touch layouts.

### 3.2 Tablet (768–1279 px)

The context header wraps into two rows when necessary. The summary becomes a full-width, compact horizontal summary immediately after the header; it must not compress the item grid into an unusable narrow column. The action bar remains sticky and may stack status above actions below 900 px.

### 3.3 Mobile (< 768 px)

This is a structured single-column document, not a desktop table shrunk to fit.

- Header: back, title/state, and save status; no secondary metadata competing for space.
- Context: one field per row, with related fields paired only when they remain comfortably tappable.
- Summary: a collapsed `Resumen operativo` disclosure after context; it starts open only when it contains a missing-required-field warning.
- Items: each line is a bordered row-group with visible line number and remove action. Description and quantity appear first; unit and trace fields follow in the group. Horizontal scrolling is reserved for the dense desktop/tablet grid, not required for mobile completion.
- Actions: fixed bottom bar with a safe-area inset. The primary action remains visible; `Volver` moves to the header. The bar must not obscure the last item or inline validation.

## 4. Visual and interaction system

Use the current OSSUM product vocabulary: system/Inter-style sans, compact 12–14 px labels and table data, 14–16 px field text, and a 20–24 px document title. Numeric quantities use tabular figures and right alignment. Do not use display typography, decorative illustrations, gradients, glass effects, KPI tiles, or promotional hero treatment.

| Meaning | Presentation |
| --- | --- |
| Draft | Neutral/secondary state chip and clear editable wording |
| Saving/loading | Text status plus restrained progress affordance; controls disabled only while the request is active |
| Valid / saved | Text confirmation, not a persistent green decorative panel |
| Required or invalid | Inline message, field border/focus, and text; color is never the only signal |
| Conflict / lock | Error or warning surface with explicit next action and reason |
| Emitted / terminal | Semantic state chip; no edit affordances |
| Future capability | Quiet `Próximamente` label and explanatory copy; never an active control that returns fake data |

All interactive elements require visible keyboard focus, hover only for fine-pointer devices, active press feedback, disabled and loading states, and at least 4.5:1 text contrast. Page navigation and keyboard-driven grid operations have no ornamental enter/exit animation. If a transient surface is used, it is 150–250 ms, state-driven, and reduced-motion safe.

## 5. Workspace sections and manual item composition

### 5.1 Context

The first section, **Contexto de salida**, exposes the existing contract fields in this order:

1. branch of exit (required), issued branch, movement reason (required), and immutable origin;
2. optional surgery/expediente reference and recipient/contact snapshot;
3. optional box/deposit and budget reference fields, clearly identified as references rather than resolved lookups.

The current manual route defaults to `origin: manual`. The origin field is selectable only at create time among already-supported values; it stays read-only on edit. A future creation route with a real source may prefill and lock it only after a separately approved source contract exists.

### 5.2 Material grid

**Material remitido** is the operator's primary working area. On desktop/tablet it is an editable grid with sticky column labels:

`SKU | Descripción* | Cantidad* | Unidad | Lote | Serie / GTIN | Vencimiento | Remove`

- `Agregar renglón` adds a line, focuses Description, and assigns no pretend catalogue identity.
- Enter from a completed quantity moves to the next meaningful editable cell; at the final populated line, it adds/focuses the next description only when that is an intentional documented shortcut. Tab and Shift+Tab remain native and reliable.
- Remove asks for confirmation only when the line contains meaningful data; focus returns to the prior row's Description. The final remaining blank row is not removable, avoiding an empty-grid trap.
- Quantities are positive decimal values using the current maximum precision (`step=0.0001`); validation does not round them in the client.
- Line count and quantity total are derived client-side presentation values. They are not stock, valuation, or consumption calculations.

### 5.3 Future product search and import slots

The item toolbar reserves two explicit extension points beside `Agregar renglón`:

- `Buscar producto` — marked `Próximamente`. Its future interaction is a searchable product modal that returns a selected item into a line. **This change provides neither the modal nor a product/catalog API.**
- `Importar desde…` — marked `Próximamente`; its future menu may list Presupuesto, Preparación, Caja, and another approved source. **This change does not read sources, infer provenance, link IDs, replace lines, or decide merge semantics.**

Until a source-specific approved contract exists, these controls are non-operative explanatory placeholders. A keyboard/screen-reader user receives the same unavailable rationale; the page never shows demo matches, local mock products, or a false import success state.

### 5.4 Optional operational detail

A collapsed **Detalle operativo opcional** section holds existing optional logistics values: transport, packages, declared value, delivery address, and observations. Opening it does not change document state. It stays expanded if it contains an invalid field or user-entered value during the session.

## 6. Focus, keyboard, and accessibility model

1. Initial focus on create is the first required context field; on edit it is the header/title landmark, allowing the operator to orient before entering the form.
2. Landmarks are `main`, page header, Context, Material grid/region, optional detail, summary, and action bar. Headings are sequential and visible.
3. `Alt+S` may be introduced only if OSSUM has a documented global shortcut registry; otherwise do not invent a conflicting shortcut. Standard Enter/Tab behavior is sufficient for this change.
4. Escape does not discard page work. It may close a future search modal, but the workspace requires explicit leave confirmation when dirty.
5. Errors use `aria-describedby` and an announced summary/status near actions. Saving and conflict status use a polite live region; no repeated announcement on every keystroke.
6. The desktop grid retains native form semantics. It is not given a complex ARIA spreadsheet role unless a later implementation supports the full keyboard pattern.

## 7. Component boundaries and state ownership

### Page/local workspace ownership

The route page owns route resolution, GET/create/update/emit orchestration through existing API client/hook capabilities, navigation, unsaved-leave guard, `dirty`, server baseline, conflict presentation, and responsive composition. It must not duplicate service validation, authorization, state transition, or audit logic.

Local form state owns draft values, line editing, inline validation display, focused-row behavior, section disclosure state, and derived presentation totals. The immutable edit baseline supplies `expectedUpdatedAt`; it is refreshed only after a successful response or an explicit user-approved reload.

### Proposed presentational boundaries

| Boundary | Responsibility | Does not own |
| --- | --- | --- |
| `OperationalDocumentWorkspace` (conceptual shell) | Header slots, main/summary layout, responsive sticky action region, landmark order | Remito fields, API calls, route policy, document state rules |
| `RemitoContextSection` | Existing context inputs and their inline errors | Resolving contacts, surgery lookup, import semantics |
| `RemitoItemsComposer` | Manual line grid/groups, local focus actions, line errors | Product search, stock, source imports, quantity business rules beyond client feedback |
| `RemitoOperationalSummary` | Read-only derived completion and context summary | A second editable source of values |
| `RemitoWorkspaceActions` | Render page-provided action state and callbacks | Emission policy, mutation requests, navigation decisions |
| `UnsavedChangesGuard` | Confirm intentional navigation away from dirty local state | Server persistence or conflict resolution |

These names describe boundaries, not a required shared implementation in this task. Build the first Remito workspace as locally composed components. Extract a reusable operational-document shell only after Presupuestos (or another document) proves the same layout slots, responsive behavior, and leave/save lifecycle. A shared abstraction must receive page-provided labels, summary, validation/action policy, and body content; it must not encode Remito domain fields.

## 8. Existing request constraints (must remain unchanged)

- All calls remain company-scoped under `/api/companies/[companyId]/remitos` and keep existing server authorization. The workspace does not add client-side permission logic.
- Create uses the current `CreateRemitoPayload`; update uses `UpdateRemitoDraftPayload`. No API field is renamed or added.
- `expectedUpdatedAt` is sent on draft update from the loaded/last-saved server baseline. A `409` with `remito_update_conflict` is surfaced, never overwritten.
- `origin` is immutable for edit. Manual create starts with `manual`; any other origin remains only an existing supported create value, not proof of a real import.
- Only `Borrador` can be updated. Emission uses the current dedicated endpoint; emitted and later states are locked against this editor.
- Existing server validation remains authoritative for required fields, positive quantities, transitions, role access, and audit. Client validation improves correction speed but is not a business-rule substitute.
- No edit flow changes existing printing, return/devolution, transition, or list/detail contracts. Those remain on `/remitos` unless separately scoped.

## 9. Strict non-goals and approval boundaries

This change must **not**:

- modify backend routes, services, validators, schema, migrations, auth, permissions, company isolation, audit, or API payloads;
- add product-search, catalog, source-import, preparation, budget, box, stock, or document-linkage APIs;
- decide source precedence, import overwrite/merge behavior, provenance semantics, or `origin` rules beyond current contracts;
- create stock movements, consumption, returns, fiscal/PDF changes, or automatic document emission;
- install dependencies, introduce a global state store, or refactor Cirugías/Ficha CX;
- delete `RemitoDraftDialog` before all call sites migrate and focused regression coverage passes.

The following require a new Task Brief and Franco approval before implementation: source/import business semantics; a product or catalog search API; changes to Remito API contracts; schema/migration work; authorization or multi-company changes; mutation of `origin`; and a shared operational-document abstraction crossing modules.

## 10. Migration and deprecation path

1. Implement the new routes and route-local workspace without changing Remito server contracts.
2. Move `/remitos` create and draft-edit call sites from dialog requests to route navigation. Keep existing list, detail, emit, return, and print actions stable.
3. Confirm no remaining consumer imports `RemitoDraftDialog`, including Ficha CX or tests. A future caller must navigate to the workspace rather than embed a parallel editor.
4. Run focused regression and browser QA (below). Only then remove `RemitoDraftDialog` and its dialog-specific tests/exports in a separately reviewed cleanup change, or in the final migration change if ownership is explicit.
5. Do not delete the older `RemitoFormDialog` as part of this workspace work; its legacy/mock ownership requires its own call-site audit and scope.

## 11. Test plan and browser QA acceptance criteria

### Automated coverage to add when implemented

- Route rendering: create and draft-edit route loading, missing/error, and non-draft lock states.
- Manual form validation: required branch/reason/description, positive decimal quantity, focus of first invalid field, add/remove row behavior, and mobile row grouping.
- Lifecycle: create POST then route replacement; draft PATCH includes the loaded `expectedUpdatedAt`; save updates clean baseline; emit is unavailable for unsaved/new form and uses existing calls only after save.
- Safety: dirty navigation confirmation for back/link; no confirmation when clean; `409 remito_update_conflict` retains local work and offers explicit reload.
- Accessibility: labelled fields, keyboard reachability, visible focus, error association/live status, and no inaccessible table-only path on mobile.
- Regression: existing API/service tests continue to cover draft-only updates, `expectedUpdatedAt`, authorization, and emitted lock. No API test changes should be necessary for this UI migration.

### Browser acceptance

1. From `/remitos`, `Nuevo remito` opens `/remitos/nuevo` in the application workspace, not a modal.
2. A valid manual draft saves once, becomes `/remitos/[id]/editar`, and remains editable as a clean draft.
3. An existing `Borrador` opens with correct context/lines; a non-draft cannot be edited through the edit route.
4. Desktop shows header, usable dense items grid, sticky read-only summary, and sticky actions without clipped focus rings or overlapping scroll areas.
5. At tablet width the summary relocates above the work; at mobile width every required item field can be completed without horizontal table scrolling or a hidden bottom action.
6. Keyboard-only completion, inline error focus, leave confirmation, save status, and conflict handling are understandable without a mouse.
7. `Buscar producto` and `Importar desde…` clearly communicate future availability and cannot fake a search/import or alter the document.
8. A successful emit returns to `/remitos`; refresh shows the emitted state and the former editor is no longer writable.
9. Existing list, selection/detail, print, return/devolution, state-transition, and company-blocked states continue to work.

## 12. Implementation handoff

The first implementation should treat this artifact as the UX contract and keep the existing API client/hook boundary. Any discovery that requires source lookup, source linkage, a new request field, different emission atomicity, or a new authorization rule is a stop condition: leave the placeholder non-operative and escalate for a new approved decision.
