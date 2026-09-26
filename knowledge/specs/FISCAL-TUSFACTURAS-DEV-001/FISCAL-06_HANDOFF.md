# FISCAL-06 Handoff — Fiscal evidence UI QA/hardening

## Done

- Hardened the `Evidencia fiscal` dialog and its caller UI without touching API routes, services, schema, Auth, or the provider.
- Confirmed the dialog renders **`displayState` only as supplied by the server**, never infers or mutates it. `SIMULATED`, `AUTHORIZED`, `REJECTED` come straight from `getFiscalEvidence` and `deriveTusFacturasDevDisplayState`.
- Confirmed `AUTHORIZED` requires `response.cae?.trim() && external_reference match` server-side; the UI only paints green when the server-provided `displayState === "AUTHORIZED"`.
- PDF DEV anchor now uses `rel="noopener noreferrer"` with an sr-only `(se abre en una nueva pestaña)` notice (also reachable via `aria-label` on the anchor).
- Removed the unconditional `document!` non-null assertion in the dialog body by inlining `providerDocument(data.attempts)`.
- Added `Evidencia fiscal` action button in `FacturacionPage` (ghost-styled, `FileSearch` icon) — **no Emitir/Reemitir/Retry controls are wired to fiscal state**.

## Changed

- `src/components/facturacion/FiscalEvidenceDialog.tsx` — PDF link security/accessibility; dropped non-null assertion; safe-array read for the latest attempt timestamp.
- `src/hooks/useFiscalEvidence.ts` — refactored to keep results keyed by `requestUrl`; on URL change, `data: null, loading: true` until the new fetch resolves. This is the active-company switch fix on the hook side (defence in depth alongside the page-level gate).
- `src/app/ventas/facturacion/page.tsx` — added `fiscalEvidenceSelection` state with `{companyId, invoice}` shape; computed `fiscalEvidenceSelectionForActiveCompany = fiscalEvidenceSelection?.companyId === invoicesApi.companyId ? fiscalEvidenceSelection : null`; renders the dialog only when the selection still matches the active company. Its company-keyed effect cleanup clears the selection when `invoicesApi.companyId` changes, so returning to a previous company cannot re-open a stale dialog. Same pattern already used for `paymentInvoice`.
- `src/__tests__/components/FiscalEvidenceDialog.test.tsx` — added AUTHORIZED without DEV disclaimer, REJECTED with empty attempts, REJECTED with provider errorCode, and PDF link `rel`/`target`/sr-only assertions.
- `src/__tests__/unit/useFiscalEvidence.test.tsx` — added focused test that asserts stale evidence is cleared when the URL (`companyId`) changes.
- `src/__tests__/components/FacturacionPage.backend.test.tsx` — added focused coverage for opening evidence under company A, switching to B, then returning to A without re-opening the dialog.

## Files

- `src/components/facturacion/FiscalEvidenceDialog.tsx`
- `src/hooks/useFiscalEvidence.ts`
- `src/app/ventas/facturacion/page.tsx`
- `src/__tests__/components/FiscalEvidenceDialog.test.tsx`
- `src/__tests__/unit/useFiscalEvidence.test.tsx`
- `src/__tests__/components/FacturacionPage.backend.test.tsx`
- `knowledge/specs/FISCAL-TUSFACTURAS-DEV-001/LOCK.md`
- `knowledge/specs/FISCAL-TUSFACTURAS-DEV-001/FISCAL-06_HANDOFF.md` (this file)

## Validations

- Focused Vitest run: **`npx vitest run` over the four files** → 4 test files / 13 tests passed (FiscalEvidenceDialog 6, useFiscalEvidence 1, fiscal-evidence-read.service 1, fiscal-evidence-read.route 5).
- Scoped ESLint: **`npx eslint <5 files>`** → exit 0, no warnings.
- Follow-up focused Vitest run: **5 test files / 15 tests passed**, including the Facturación page company-switch regression; scoped ESLint for the page and its test passed; `git diff --check` passed.
- Diff check: no unintended tracked changes outside the allowed page/test pair; the existing FISCAL-06 application files and handoff artifacts remain untracked against `HEAD` (baseline absent in Git). No drift from FISCAL-03/FISCAL-05 baseline inside owned files.
- Browser QA precondition NOT met: 3000/3001 dev servers respond 200 but no authenticatable session storage exists in scope, and the task forbids touching Auth/login/session. Per the task rule, the browser session was not opened; focused Vitest covered the same render paths.

## Risks

- Browser QA deferred (precondition): a Playwright headed session on 3001 could not be authorised without touching Auth, which is out of scope. Validation rests on focused Vitest; surface should be re-checked in browser after a fresh Auth preflight in a separate QA slice.
- Hook clearing behaviour: when `companyId` changes, the dialog briefly renders loading state with `data: null`. That is the intended behaviour, but if a future slice introduces a different transient expectation on `useFiscalEvidence`, the hook test must be re-evaluated.
- Resolved: the company-keyed cleanup clears the selection on `invoicesApi.companyId` changes; switching away and returning does not re-open a stale evidence dialog.
- `FiscalEvidenceDialog.tsx` has a `key={fiscalEvidenceSelectionForActiveCompany.invoice.id}`. If a future slice reuses the dialog with the same invoice id but a different `companyId` (e.g., admin cross-tenant view), the key may need to include the company id.
- Provider PDF URL with embedded token in its query string is rendered as-is (URL is not redacted by the read-side sanitizer). This was a known FISCAL-05 decision (documented in the read-only review handoff). The `rel="noopener noreferrer"` + sr-only new-tab notice reduces the surface, but does not redact the URL. Future slices that ship persisted document retrieval should download + persist under their own storage.

## Next

- Browser QA in a separate slice after a fresh Auth preflight against 3001 is captured into a reusable `storageState`. Do **not** repurpose this slice for it.
- No additional follow-up for the active-company dialog selection is required.
- If FISCAL-04 (webhook) lands and persists `hook_id` into `FiscalIssuanceAttempt.responsePayload`, the dialog's sanitizer key regex (`/token|apikey|api_key|authorization|credentials|password|secret/i`) does **not** cover `hook_id`; `hook_id` is not sensitive but exposes a provider-side identifier. Treat as a future contract check.
- The next FISCAL-06 review or a FISCAL-07 slice may want to expose `externalReference` and `snapshotHash` in the UI as audit anchors; they are already server-projected.

## Skipped

- Browser QA on the running dev app: no extractable authenticated session in scope; per task rule, browser not opened.
- Schema, migrations, Prisma, Auth, secrets, TusFacturas provider calls, webhooks, dependencies, deploy, push, commit, PR — all out of scope by §11 of `AGENTS.md` and the explicit forbidden list.
- Re-authoring changes already in the worktree: source and tests were already pre-applied by prior session work. Verified, did not rewrite.
