# Confirmed blockers and bounded proposed follow-up

## P1 — surgery-visible-number sent as primary ID
- Location: src/components/presupuestos/PresupuestoFormDialog.tsx104/113; selected IDs from SurgerySelector.tsx43; populateFromSurgery stores UI identity.
- Reproduction: New Presupuesto in real DEV5000, select CX-DEV-2026-0001, fill required fields/synthetic item and save. Payload surgeryId=CX-DEV-2026-0001; API404/surgery_not_found. Existing persisted surgery primary ID is sgdevsurgery1000000000000.
- Expected: send selected surgery.backendId scoped to active company. Actual: visible/UI identity reaches backend.
- Impact: active surgery-linked draft creation cannot complete.
- Minimal follow-up: existing identity resolution at the form's API boundary, reject missing backendId; no core surgery/store/schema change. Required regression: real form/client HTTP-boundary test with deliberately different visible/backend IDs, plus actual browser repeat.

## P1 — operational invoice draft500 on real PostgreSQL
- Location: src/lib/services/invoice.service.ts361 (lockAndAssertSourcesNotInvoiced).
- Reproduction: exact-owned approved source cmuqqsez70000nshuaexh7tyx visible in Pendientes; actual Guardar borrador invoicePOST500/internal_error. Scoped DB check confirms0 invoices.
- Root cause evidence: queryRaw on SELECT pg_advisory_xact_lock(hashtextextended($1,0)) reproducibly throws P2010 with UnsupportedNativeDataType/void using installed adapter; executeRaw same statement accepts. No data writes needed for diagnosis.
- Expected: acquire source advisory lock, check duplicates and create operative nonfiscal draft. Actual: void result decoding aborts transaction before invoice creation.
- Minimal follow-up: execute same advisory lock without reading its void result, preserve lock/transaction/deduplication. Required regression: actual PostgreSQL invoice create + duplicate rejection; unit mock alone will not expose adapter decode failure.
- No invoice code modified in this package.

## Static gap — draft edit/token wiring
- Location: src/app/ventas/presupuestos/page.tsx606 creation-only dialog; no rendered edit action despite backend actions including edit. src/components/presupuestos/PresupuestoFormDialog.tsx108 sends buildEstimative payload without expectedRevision when presupuestoId is provided.
- Evidence: actual Borrador row menu offered detail/emit/annul/delete/expediente, no edit. Existing form has no backend draft hydration/revision load; shared payload builder does not supply token.
- Impact: required edit/reload journey unproven and not reachable from active sales page. Do not claim a live edit request failed: it was not executed.
- Minimal follow-up: wire existing edit affordance to backend-loaded fields/revision and send displayed revision, preserve dirty input on conflict; focused component/client tests and actual repeat. This exceeds the explicitly reserved test-only correction scope; no silent reimplementation.

## Missing gate — exclusive build output
- Live port5000 process uses .next/dev. No build executed against shared output; requires coordination, not an inferred pass.
