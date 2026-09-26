# FISCAL-05 Handoff — Read-only fiscal evidence UI

## Done
- Added a Facturación-only, read-only fiscal evidence dialog for invoices with an authoritative `companyId` and `invoiceId`.
- Displayed the server `displayState` verbatim, including `SIMULATED`, provider document type/number, DEV PDF only when available, last-attempt timestamp, and attempt/error history.
- Added the exact DEV disclaimer: `Comprobante de prueba — no autorizado por ARCA`.

## Changed
- Consumes only `GET /api/companies/:companyId/invoices/:invoiceId/fiscal-evidence` through the existing authenticated client API pattern.
- Includes accessible loading, no-evidence (`404 fiscal_evidence_not_found`) and API-error states. There is no issue, reissue, or retry control.
- The legacy Expediente/Comercial surfaces were not integrated: their `Comprobante` projections carry legacy numbers but not an authoritative backend `Invoice.id`; deriving one would require an out-of-scope data-contract change.

## Files
- `src/hooks/useFiscalEvidence.ts`
- `src/components/facturacion/FiscalEvidenceDialog.tsx`
- `src/app/ventas/facturacion/page.tsx`
- `src/__tests__/components/FiscalEvidenceDialog.test.tsx`
- `knowledge/specs/FISCAL-TUSFACTURAS-DEV-001/LOCK.md`

## Validations
- Focused Vitest: 4 passed (`FiscalEvidenceDialog` and Facturación regression).
- Focused ESLint: passed.
- Diff check: passed.
- `npm run typecheck`: blocked by four pre-existing ContactAddress `companyId` errors in `prisma/seed.ts`, `src/lib/services/contact.service.ts`, and `contacts-code-concurrency-postgres.test.ts`; no FISCAL-05 error was reported.
- Browser QA not run: no local application listener was running on port 3000, and no login/session state was changed.

## Risks
- This slice reads only server-projected evidence; it does not issue, retry, reconcile, or contact TusFacturasAPP.
- The DEV PDF URL is a provider artifact and may expire; the UI only exposes it when the server returns a URL.

## Next
- FISCAL-06 may review the UI with the existing read-only contract. Do not add issuance controls, provider calls, or an Expediente mapping without a separately approved data contract.

---

# FISCAL-06 addendum — UI QA/hardening (2026-09-24)

## Done
- Verified the external DEV PDF link carries `target="_blank"` with `rel="noopener noreferrer"` and an accessible new-tab disclosure in its accessible name (`Abrir PDF DEV (se abre en una nueva pestaña)`); covered by test assertions on `href`, `target`, `rel`, and role/name.
- Removed the remaining unnecessary non-null assertion in `page.tsx` (`surgery.backendId!` → inline `surgery.backendId ? … : null` guard); zero `!` non-null assertions remain in the FISCAL-06 owned files.
- Confirmed coverage for AUTHORIZED (no DEV disclaimer), REJECTED error display, empty attempts, absent provider artifacts (no PDF/type/number), and external-link safety/accessibility: focused Vitest 7/7 in FISCAL files, 11/11 including Facturación page regressions.
- Evaluated active-company switching: already safe in the allowed UI files — `fiscalEvidenceSelectionForActiveCompany` unmounts the dialog the moment `invoicesApi.companyId` (= `activeCompany?.id`) diverges from the selection's company, `useFiscalEvidence` keys its request URL by `companyId`+`invoiceId` and discards stale responses (`cancelled` flag + `requestUrl` mismatch), and the dialog is remounted via `key={invoice.id}`. Covered by `useFiscalEvidence.test.tsx` company-switch test. No data-contract change needed → not deferred.

## Changed
- `src/app/ventas/facturacion/page.tsx`: replaced `surgeries.filter(…).map(… value={surgery.backendId!} …)` with a single map guarded by `surgery.backendId ? … : null` (same rendered output, no assertion).
- No backend/API, schema, Auth, provider, dependency, fiscal-state logic, or Cirugías change. UI renders only the server `displayState`; no issue/reissue/retry controls exist.

## Validations
- Focused Vitest: 11 passed (FiscalEvidenceDialog 6, useFiscalEvidence 1, Facturación page regressions 4).
- ESLint on all five FISCAL-06 files: passed.
- `npm run typecheck`: only the same 4 pre-existing ContactAddress errors (`prisma/seed.ts`, `src/lib/services/contact.service.ts` ×2, `contacts-code-concurrency-postgres.test.ts`); zero FISCAL errors.
- Diff review: `page.tsx` hunk is the intended guard change; other fiscal hunks are the FISCAL-05 wiring.
- Browser QA not run: local app is up on `localhost:3000` (page 200) but no authenticated session exists — `GET /api/me/companies` returns `401 missing_actor_user_id` and no `storageState` (`CORE_FLOW_STORAGE_STATE`) is present. Per the E2E Auth Session Policy, login must be manual and credentials must never be typed by the agent.

## Risks
- Browser QA of the dialog against real data remains open until a fresh human login produces a temporary `storageState` resolved by env var.
- Active-company guard hides the dialog on mismatch but leaves the selection in state; re-selecting the original company re-opens it. Harmless (modal blocks company switching) and UI-only.

## Next
- FISCAL-06 closed. Any Expediente/Comercial surface integration still requires a separately approved data contract.
