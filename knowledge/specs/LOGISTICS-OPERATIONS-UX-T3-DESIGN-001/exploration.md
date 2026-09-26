## Exploration: LOGISTICS-OPERATIONS-UX-T3-DESIGN-001-EXPLORE

### Current State
The active Ficha CX already provides the correct containment surface: compact header, horizontally scrollable tabs, one scrollable content region, and refresh coordination (`src/components/expediente/ExpedienteFullView.tsx`). Logistics is currently split between Cajas assignment, Remitos, Consumo/Devoluciones, and backend-derived Trace; the legacy `/expediente` route is explicitly deprecated (`src/app/expediente/page.tsx:236-239`).

Reusable operational grammar is established: OSSUM navy headers/tables, compact filters, monospace identifiers, border-led dense surfaces, explicit loading/error/empty states, and a stacked mobile alternative (`DESIGN.md`; `src/app/remitos/page.tsx`; `src/components/expediente/RemitosPanel.tsx`). The supplied dark blue-black/graphite/cyan character should be scoped to the consolidated logistics workspace; it must retain the existing semantic amber/emerald/red signals and not replace the app-wide canonical light operational shells.

**Backend available now**
- Preparation/control/dispatch lineage exists for Cajas and physical dispatch; Phase-D commands accept consume, identified/unidentified return, receipt control, resolution, close, and admin reopen (`src/app/api/companies/[companyId]/surgeries/[surgeryId]/logistics/phase-d/route.ts`; `src/lib/services/phase-d-logistics.service.ts`).
- Trace GET exposes aggregate sent/consumed/returned/pending quantities, lot/serial/expiry when available, warnings, timeline, actors as IDs, and source references (`src/lib/api/trazabilidad.ts`).
- Remitos expose commercial and physical detail items, including identified code/group labels; the scan surface resolves a remito read-only via QR/code (`src/components/expediente/LogisticaTabContent.tsx`; `src/components/remitos/RemitoScanWorkspace.tsx`).

**UX projections, not currently readable from an API**
- A single Phase-D operational read model: dispatch-line IDs, expected versus assigned allocation quantities, per-return receipt outcome/state, unidentified-return queue, reconciliation closure/reopen status, authorized actions, and actor names.
- Physical lineage drill-down linking one consolidated Remito item to every physical dispatch allocation and its command/audit history. Trace is explicitly `v0-derived`, aggregate by item, and has no Phase-D operation/read projection (`src/lib/api/trazabilidad.ts:114-123`; Phase-D route is POST-only).
- Barcode-driven consume/return/control action selection. Existing camera flows scan only Remito locators or stock receipt identifiers, not dispatch allocations (`src/components/remitos/RemitoScanWorkspace.tsx`; `src/components/stock/ReceiptOperationalWorkspace.tsx`).

### Affected Areas
- `DESIGN.md` — canonical density, table, overlay, state, and responsive rules.
- `src/components/expediente/ExpedienteFullView.tsx` — existing Ficha CX logistics entry and refresh boundary.
- `src/components/expediente/LogisticaTabContent.tsx` — reusable logistical shell, Remitos/trace aggregation, and honest backend-unavailable state.
- `src/components/expediente/CajasTabContent.tsx` — assignment/preparation candidate, permission-disabled, load/error/success patterns.
- `src/components/expediente/RemitosPanel.tsx` — consolidated Remito summary/detail, physical detail, print, responsive rows, and contextual actions.
- `src/components/expediente/ConsumoPanel.tsx`, `src/components/expediente/DevolucionesPanel.tsx`, `src/components/comparativa/ComparativaOperativaV0.tsx` — quantity comparison, discrepancy disclosure, return lifecycle and explicit confirmation patterns.
- `src/components/expediente/TrazabilidadPanel.tsx`, `src/lib/api/trazabilidad.ts` — read-only lineage/timeline and its data ceiling.
- `src/components/remitos/RemitoScanWorkspace.tsx`, `src/components/stock/ReceiptOperationalWorkspace.tsx` — manual/USB/camera barcode fallbacks, scan states, focus management, and camera-denied/offline handling.
- `src/lib/permissions/phase-d-logistics.ts`, `src/lib/permissions/stock-operations-policy.ts` — separate explicit Phase-D grants versus admin/operator stock controls; UI must never infer permission from role alone.

### Approaches
1. **Extend the existing fragmented panels** — add summaries/actions independently to Cajas, Logística, Consumo, and Trazabilidad.
   - Pros: lowest visual displacement; reuses mounted data hooks.
   - Cons: operators must cross tabs; cannot present one dispatch-centric control surface or a coherent physical lineage.
   - Effort: Medium.

2. **Consolidated Logistics Operations workspace inside Ficha CX Logística** — one dispatch-centric workspace composed from existing compact shell/table/inspector patterns, with sections for quick signals, allocation/control table, Remito physical detail, differences, lineage/history, and contextual actions.
   - Pros: one operational view; preserves Ficha CX context and current responsive navigation; reuses established Remito/Cajas/Trace/scanner patterns without redesigning the app shell.
   - Cons: requires a clearly marked unavailable/projection state until Phase-D read data exists; must not mix legacy aggregate writers with Phase-D actions.
   - Effort: Medium UX; implementation depends on the listed read-model limitations.

### Recommendation
Use approach 2. Design one compact, dark-scoped Logistics Operations workspace under the existing **Logística** tab: navy-black ground, graphite panels, cyan filter/selection affordances, semantic amber for pending/control, emerald for consumed/FIT return, red for blocked/difference, and neutral slate for history. Keep a central dispatch map/timeline and a dense allocation table as the decision surface.

The table should distinguish expected, assigned, dispatched, consumed, returned, held/quarantine, and pending; row expansion/inspector should show immutable lot/serial/expiry, Caja, Remito, actors, timestamps, and command lineage. Reuse `RemitosPanel` detail/print conventions; group commercial Remito rows above physical allocations rather than conflating them. Surface close/reopen and mutation actions only when an explicit action grant/read capability says they are allowed; otherwise show the reason and preserve read access. Use confirmation dialogs for irreversible commands, reusing the bordered header/body/footer grammar in `DESIGN.md`.

On mobile, retain the quick signals and active task, replace the dense table with compact allocation cards, keep scanner/manual input at 44px targets, and preserve a horizontal table escape hatch for audit detail. Every section needs loading, filtered-empty, no-dispatch, camera-denied, API-error/retry, no-company/no-server-surgery, denied, and stale/projection states.

### Risks
- Existing Trace and legacy Consumption/Return UI aggregate commercial items; presenting them as physical Phase-D truth would misstate lineage and reconciliation.
- The Phase-D endpoint has command capability but no read projection, so expected-versus-assigned, quarantine, dispatch blocks, closure, actors, and history cannot be rendered authoritatively yet.
- Scanner reuse is conceptual only: present components do not resolve a dispatch line or submit a Phase-D operation from a scan.
- Permission models differ: stock UI uses `admin|operator`, Phase D uses per-action grants, and reopen additionally requires `admin`.
- Working tree is already highly modified by other work; this exploration created only the allowed new artifact.

### Ready for Proposal
Yes — for one consolidated Phase-E UX design artifact. The design must label the Phase-D read model, dispatch-allocation scanner resolution, and action-capability projection as implementation dependencies, not backend proposals.
