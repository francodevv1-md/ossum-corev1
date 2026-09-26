# Task Brief — Ficha CX Logistics Information Surface

**Task ID:** FICHA-CX-LOGISTICS-INFORMATION-DEV-001  
**Status:** DEV implementation approved — Ficha CX surface only  
**Owner:** Frontend / Expediente  
**Mode:** UI implementation after separate approval  

## 1. Decision and Objective

Redesign **Ficha CX → Logística** as a compact, read-only information surface. It must let a user understand a surgery's logistics condition without operating it:

- current logistics stage and status;
- preparation and control;
- assigned Caja and materials;
- expected, assigned, dispatched, consumed, returned, pending, and quarantined quantities;
- Remito and dispatch condition;
- active differences and operational blockers;
- receipt, return, and reconciliation condition;
- latest available event and concise lineage;
- one clear navigation link to **Ver gestión logística**.

The page remains a case summary. Operational execution belongs to `/logistica`; Ficha CX must not duplicate it.

## 2. Current-Screen Diagnosis

`LogisticaTabContent` currently replaces the legacy compact Remito/Transit composition with `LogisticsOperationsWorkspace` whenever a server-side Surgery ID and active company exist. The workspace is a Phase E **operations** board, not an informational tab:

- it uses an isolated dark cyan/slate visual system that conflicts with the light OSSUM surfaces used by Stock, Artículos, Cajas, and Remitos;
- it exposes internal technical vocabulary and identifiers: projection terminology, allocation, lineage, position IDs, Remito IDs, capability/grant reasons, and raw stage values;
- it includes scanner controls, camera access, filter input, selected allocation state, operational action rail, mutation confirmation dialog, idempotency handling, and direct POST/DELETE calls;
- it makes its own process-stage display from the first assignment/allocation only, so it cannot be presented as the complete surgery status;
- the current `/logistica` page is a legacy Zustand-backed status editor. It is not yet the approved server-authoritative management destination for the new link.

The existing E1 projection is the correct authoritative read boundary for physical logistics facts. E2/E3 action descriptors are explicitly excluded from this new Ficha CX surface.

## 3. Scope

### In scope

- Replace the current Phase E operational workspace in the Ficha CX Logística tab with a read-only surgery summary sourced from the existing E1 operations projection.
- Translate available persisted/projection facts into operational Spanish; keep unavailable data explicit without technical labels.
- Follow the current visual language of Stock, Artículos, Cajas, and Remitos: `--ossum-*` surfaces/lines/action color, compact headers, 10–13px metadata, tabular numbers, light bordered tables, semantic badges, responsive stacking, and restrained empty/error surfaces.
- Provide one navigation-only **Ver gestión logística** link when its destination is confirmed.
- Preserve existing backend, Prisma schema, endpoints, validators, projection contract, Phase B/C/D logic, and action-descriptor contracts unchanged.

### Explicit exclusions

- No scanner, camera, manual-code entry, filters, forms, mutation buttons, dialogs, confirmations, idempotency keys, or API calls other than the existing read projection request.
- No direct operation from Ficha CX: prepare, control, resolve difference, dispatch, consume, return, receive, reconcile, reopen, or retry/action management.
- No internal IDs, permission/grant/role names, routes, contracts, source-code labels, or technical errors rendered to users.
- No backend, schema, migration, Auth, authorization-policy, stock-rule, or API-contract change.
- No rebuilding `/logistica`, no copying a future management workspace into Ficha CX, and no change to the legacy standalone route under this task.
- No navigation fallback that opens a different surgery, sends an unauthenticated user into a loop, or treats the current legacy `/logistica` editor as authoritative management.

## 4. Authoritative Sources and Display Mapping

The display reads exactly one company- and surgery-scoped E1 projection:

`GET /api/companies/{companyId}/surgeries/{surgeryId}/logistics/operations`

The server's `getSurgeryLogisticsOperations` service composes persisted Phase B/C/D facts. The browser must not derive physical quantities from legacy Zustand, Remito panel fallbacks, or selected-row state.

| Visual data | Projection source | Operational presentation / rule |
| --- | --- | --- |
| Last update | `generatedAt` | “Actualizado [fecha y hora]”. It indicates projection generation, not a business event. |
| Logistics stages | `assignments.preparations`, `assignments.dispatches`, allocation `receipt` and `reconciliation` | Show only the authoritative stages/facts that E1 publishes. If assignments differ, show **Resumen mixto** with the available count; do not create a frontend global logistics-state rule or select the first assignment as surgery truth. |
| Preparation | assignment `preparations[].status`, `expected.quantity`, `assigned.quantity`, `requiresRecontrol` | Display expected vs. assigned and operational wording such as “requiere nuevo control”. Do not expose `DRAFT`, `COMPLETE`, version, or internal preparation IDs. |
| Control | assignment preparation and dispatch facts; only facts currently published | Show “Control registrado” only when the authoritative projection exposes a current accepted control through dispatch eligibility/history. Otherwise show “Sin información de control disponible”; do not infer control from an action capability. |
| Caja assigned | assignment `caja.code` and allocation `cajaCode` | Visible Caja code/name only. If multiple Cajas exist, show count/list of visible codes; never display assignment or unit IDs. |
| Materials | `allocations[]` and each allocation `lot`, `serial`, `identifiedCode`, `unit` | Read-only material table/cards. Show article/description only if the current projection publishes it; it currently does not, so this is a concrete dependency below. Lot/serial/code appear only as operator-relevant trace detail, never as internal IDs. |
| Quantity strip | `summary.expected`, `assigned`, `dispatched`, `consumed`, `returned`, `pending`, `quarantine` | One fixed ordered quantity summary with units labeled from allocations where unambiguous. When units are mixed or unavailable, label quantity without inventing a common unit and explain that quantities are separated in detail. |
| Remito and dispatch | allocation `remito` plus assignment `dispatches[].acceptedAt` | Show a user-facing Remito reference only if E1 publishes one. Current `remito.id` is internal and must not render. Otherwise omit the reference or show “No disponible”; dispatch time may display when present. |
| Differences and blockers | allocation `differences[]`, `blockers[]` | Count and operational explanations only. Map known codes to human language in the display adapter; unknown codes become “Hay una condición pendiente de revisión logística”, never raw snake_case. Closed differences are historical, open differences are active. |
| Returns / receipt | allocation `returns[]`, `receipt` | Display quantity/state in operational language and receipt result/time when published. Actor IDs are not rendered. |
| Reconciliation | allocation `reconciliation` | Display the most recent available reconciliation state/time in operational language. Do not expose event, acceptance, audit, or dispatch IDs. |
| Last update / trace summary | latest published `acceptedAt`, `receipt.at`, `reconciliation.at`, and preparation/dispatch facts | Select the latest timestamp among published, user-meaningful events; label the event type. If no timestamp is published, say “Sin novedades registradas disponibles”. |
| Trace summary | published Caja, Remito, lot/serial/code, and event timestamps | A concise read-only chain: Caja → preparación → despacho → devolución/recepción → conciliación. Omit unavailable nodes; do not show internal lineage IDs. |
| Management link | confirmed `/logistica` management route contract | Navigation only. Keep it hidden until the authoritative same-surgery management destination exists and is verified. |

### Source hierarchy

1. E1 operations projection is the only data source in this task and is authoritative for physical preparation, allocation, dispatch, consumption, return, receipt, reconciliation, quantity totals, blockers, and differences.
2. Legacy `LogisticsDetail`, `materialTransito`, Zustand, Remito, Trace, and the current `/logistica` page are not inputs for this surface.

## 5. Information Architecture

1. **Case logistics header** — title “Logística” and last projection update. Keep the navigation link hidden in this task.
2. **Situation at a glance** — quantity strip in canonical order: Esperado, Asignado, Despachado, Consumido, Devuelto, Pendiente. Quarantine remains an exception signal rather than a primary business total.
3. **Current flow** — compact five-step read-only line: Preparación → Control → Despacho → Recepción/devolución → Conciliación. Each step has status and, where available, date/time; no action affordance.
4. **Caja y materiales** — Caja summary followed by a responsive physical-materials table/card list. Quantity columns stay visible before trace metadata.
5. **Remito y despacho** — user-facing Remito reference, dispatch condition/time, and explicit unavailable message where the visible reference is absent.
6. **Differences and blockers** — only if present, before history; concise labels and counts, with no permission explanation.
7. **Recepción, devolución y conciliación** — aggregate condition plus per-material facts only where they are authoritative.
8. **Última novedad y trazabilidad** — latest available event and compressed visible chain.

The tab has no allocation inspector, no selected-row state, and no local operation rail. Details must fit in the listed sections rather than creating a second management console.

## 6. State Design

| State | Required behavior and wording |
| --- | --- |
| Loading | Light-surface skeleton for header, quantity strip, flow, and material rows. Use `role=status`; retain the tab shell. |
| Empty | “Todavía no hay preparación ni materiales asignados para esta cirugía.” Explain that logistics information will appear when it is registered; no call to action inside Ficha CX. |
| Partial | Show every available section. Each absent fact says, for example, “Aún no se registró despacho” or “Sin datos de recepción disponibles”; do not substitute zero for unknown. |
| Stale | Preserve the last successful read with a neutral/amber banner: “La información puede no estar al día. Se mostrará la última actualización disponible.” Revalidation is automatic only; no manual refresh button. |
| Error | “No pudimos cargar la información logística de esta cirugía.” Do not render API message/code. The only optional control is browser-standard retry through tab revisit/reload, not a logistics action. |
| No active company | “Seleccioná una empresa para consultar la logística de esta cirugía.” |
| No server-side surgery | “La información logística todavía no está disponible para esta cirugía.” |
| No read permission | Preserve any authorized read state; otherwise show “No tenés acceso para consultar la información logística de esta cirugía.” Never reveal grants, roles, capability names, or denial internals. |

## 7. Desktop and Mobile Wireframe

### Desktop

```txt
┌ Logística · [Estado]                         Ver gestión logística ┐
│ Actualizado …                                                  │
├ Esperado | Asignado | Despachado | Consumido | Devuelto | Pendiente ┤
├ Preparación ─ Control ─ Despacho ─ Recepción/Devolución ─ Conciliación ┤
├ Caja y materiales                                                   ┤
│ Caja · Material · Esperado · Asig. · Desp. · Cons. · Dev. · Pend. │
├ Remito y despacho        │ Diferencias y bloqueos                  ┤
├ Recepción / devolución / conciliación                              ┤
└ Última novedad · trazabilidad resumida                             ┘
```

- Use the Stock/Cajas dense light table: `--ossum-surface` background, `--ossum-line` borders, navy table header, tabular numeric columns, and semantic badges with text.
- No isolated dark panel, cyan operational console treatment, decorative shadows, sticky action rail, or full-width KPI cards.
- Horizontal scrolling is allowed only for the material table, with the identity column visible first.

### Mobile

```txt
Logística                         Ver gestión logística
[Estado] · Actualizado …
Esperado / Asignado / Despachado
Consumido / Devuelto / Pendiente
Preparación → Control → Despacho → Recepción → Conciliación
Caja y materiales (one material card per allocation)
Diferencias y bloqueos
Recepción, devolución y conciliación
Última novedad y trazabilidad
```

- Stack summary values in two/three-column groups; preserve canonical order.
- Material rows become non-interactive cards; show identity, quantities, then optional lot/serial.
- Keep the management link hidden. No scanner or action controls appear above the fold.
- Use semantic text and icons in addition to color; preserve readable contrast and keyboard navigation for the navigation link.

## 8. Planned Files (Implementation Phase Only)

| File | Intended change |
| --- | --- |
| `src/components/expediente/LogisticaTabContent.tsx` | Keep the tab boundary and replace the operational workspace mount with the read-only surface. Retire unused operational/legacy composition only when proven unused. |
| `src/components/expediente/LogisticsOperationsWorkspace.tsx` | No change. Preserve the complete Phase E operations workspace intact for the future `/logistica` module. |
| `src/components/expediente/LogisticsInformationSurface.tsx` | New presentational/read-fetch surface, if needed, with no mutation descriptors, scanners, or dialogs. |
| `src/components/expediente/logistics-information.ts` | Optional small display adapter for operational labels and source-safe aggregation; no business rules or server authority. |
| `src/__tests__/components/LogisticsInformationSurface.test.tsx` | Focused rendering/state/no-mutation/responsive tests. |
| `src/__tests__/components/LogisticaTabContent.test.tsx` | Update integration coverage for the new tab boundary if current tests cover it. |

Do not change `prisma/schema.prisma`, services, validators, routes, permissions, or Phase B/C/D/E1/E2/E3 contracts under this task.

## 9. Acceptance Criteria

1. Ficha CX → Logística renders only information and navigation; it contains no scanner, camera request, input, filter, form, dialog, POST/PUT/PATCH/DELETE request, or mutation/action label.
2. All shown logistics quantities come from E1's server projection; unknown quantities are not presented as zero.
3. No raw internal ID, internal stage enum, capability/grant/role name, route, contract name, or backend error text is visible.
4. Preparation, Caja/materials, Remito/dispatch, differences/blockers, returns/receipt/reconciliation, and last available trace are understandable from the tab when their source facts exist.
5. Multiple assignments/allocations show their authoritative stages or an explicit **Resumen mixto**; no frontend global-state derivation or first-row shortcut is allowed.
6. Missing data uses concise operational language. Empty, partial, stale, error, no-company, no-server-surgery, and no-read-access states meet §6.
7. The visual system matches existing Stock/Artículos/Cajas/Remitos light surfaces, compact density, borders, tables, badges, and responsive behavior; the dark isolated Phase E console is gone from Ficha CX.
8. Desktop and 390px mobile layouts preserve the reading order and have no horizontal page overflow. Material-table overflow is contained.
9. **Ver gestión logística** remains hidden until its same-surgery authoritative management destination exists and is verified.
10. Existing E1/E2/E3 route/service/validator tests continue passing unchanged; no existing operation behavior is altered.

## 10. Required Validation (Implementation Phase Only)

- Focused component tests for each state, quantity source presentation, mixed assignments, unavailable/source-safe labels, and the absence of scanner/forms/dialogs/mutation requests.
- Focused integration test that confirms the Ficha CX tab fetches only the existing read projection and does not call action/resolve-code endpoints.
- TypeScript typecheck and the existing relevant E1/E2/E3 test suites.
- Browser QA using an authenticated disposable DEV session: one surgery with B/C/D lineage on desktop and 390px mobile; verify no console errors, no page overflow, no operation controls, and no visible management link.
- Independent diff review: ensure no backend/schema/contract changes and no user-visible technical data.

## 11. Real Dependencies and Risks

1. **Management destination is not ready:** `/logistica` currently mutates legacy Zustand state and has no proven server-authoritative, surgery-scoped management route. Keep **Ver gestión logística** hidden; defining that destination belongs to a separate task.
2. **Visible Remito reference is absent from E1:** E1 returns `remito.id`, which is internal. Omit the reference or show “No disponible”; do not add a Remito read source or render the ID.
3. **Material identity is absent from E1:** allocations provide physical trace fields and quantities but no article code/name. Omit the article field or show “No disponible”; do not add a source or infer it from legacy data.
4. **Some stage facts are incomplete:** current E1 deliberately exposes unavailable control actor/time and may not publish enough event detail to determine a global last novelty. Use explicit partial-state wording, never fabricated chronology.
5. **Quantity units can differ:** summary quantities are scalar strings. Do not add quantities across heterogeneous units in the UI; present the summary only when unit interpretation is safe and retain per-allocation detail.
6. **Sensitive Ficha CX boundary:** `LogisticaTabContent.tsx` and the present operations workspace are shared/sensitive. An implementation needs an explicit ownership lock and must preserve `LogisticsOperationsWorkspace` unchanged for the future `/logistica` module.

## 12. Evidence Reviewed

- Phase B — `LOGISTICS-PHYSICAL-PREPARATION-REAL-DEV-001/TASK_BRIEF.md` and `LOGISTICS-PHYSICAL-PREPARATION-REAL-T3-DESIGN-001/DESIGN.md`: physical preparation, immutable allocation trace, expected-vs-found states.
- Phase C — `LOGISTICS-CONTROL-ATOMIC-DISPATCH-T3-DEV-001/{TASK_BRIEF,VERIFY_REPORT}.md`, `LOGISTICS-CONTROL-ATOMIC-DISPATCH-T3-DESIGN-001/DESIGN.md`, and `STOCK-CAJAS-C14-CX-CONTINUOUS-EXECUTION-001/CHANGE_PACK.md`: control/difference/atomic dispatch and preserved lineage.
- Phase D — `LOGISTICS-CONSUMPTION-RETURNS-RECONCILIATION-T3-DEV-001/{TASK_BRIEF,VERIFY_REPORT}.md`, `LOGISTICS-CONSUMPTION-RETURNS-RECONCILIATION-T3-DESIGN-001/DESIGN.md`, and `STOCK-CAJAS-C13-CONTINUOUS-EXECUTION-001/CHANGE_PACK.md`: consumption, return, receipt, reconciliation invariants.
- E1 — `LOGISTICS-OPERATIONS-READ-PROJECTION-E1-DEV-001/{TASK_BRIEF,DESIGN,VERIFY_REPORT}.md`: company-scoped read projection and explicit unavailable facts.
- E2/E3 — `LOGISTICS-ACTION-DESCRIPTORS-E2-DEV-001/{TASK_BRIEF,VERIFY_REPORT}.md`, `LOGISTICS-ACTION-DESCRIPTORS-E3-DEV-001/{TASK_BRIEF,ACTION_INVENTORY,VERIFY_REPORT}.md`: server-authoritative action metadata, intentionally excluded from the informational surface.
- Existing implementation — `src/app/api/companies/[companyId]/surgeries/[surgeryId]/logistics/operations/route.ts`, `src/lib/services/logistics-operations-read.service.ts`, `src/components/expediente/LogisticaTabContent.tsx`, and `src/components/expediente/LogisticsOperationsWorkspace.tsx`.
- Visual precedents — `src/components/stock/StockArticleView.tsx`, `src/components/stock/BoxFicha.tsx`, `src/components/boxes/BoxesOperationalIndex.tsx`, `src/components/remitos/RemitoStateSurface.tsx`, and `src/components/remitos/OperationalRemitoWorkspace.tsx`.
