# RESEND-BUDGET-INVOICE-EMAIL-DEV-001

## Task Brief

- **Objective:** Send existing Presupuestos and existing sales Facturas through Resend as private PDF attachments in DEV.
- **Owner / lock:** OpenCode · GPT-5.6 · final review PASS · `released`.
- **Approved scope:** backend reads for existing records, private PDF rendering, explicit recipient, optional copy to authenticated user, company scoping, existing role checks, fixed-length idempotency, audit, minimal UI integration and focused tests.
- **Sender:** `OSSUM COR | Districorr <sistemas@districorr.com.ar>` with the same Reply-To.
- **Reuse:** `src/lib/outbound-email.ts` and the accepted partial-audit behavior from `RESEND-DOCUMENT-EMAIL-DEV-001`.
- **Forbidden:** fiscal issuance, invoice creation/state mutation, schema/migrations, Auth changes, Gmail scopes/send, production/staging, deployment, real email sends, Órdenes de Compra backend, and converting unrelated mock/local screens.
- **Validation:** focused Vitest, package TypeScript, ESLint, private PDF render tests, UI contract tests and independent read-only review.
- **Stop conditions:** existing backend cannot provide a company-scoped document, fiscal semantics are required, file ownership overlaps, or the same blocker survives two minimal Diagnose cycles.

## Decision

This package only delivers documents that already exist in the backend. Email acceptance never emits, authorizes, fiscalizes, changes state, or creates a Presupuesto/Factura. Órdenes de Compra remain a separate backend package.

The visible tables remain legacy/local. Their row IDs are never sent to the new endpoints. Each page exposes a separate “Enviar existente” dialog that loads authoritative backend records and submits only the selected backend ID.

## Validation evidence

- Focused Vitest: 8 files / 44 tests passed.
- Real private PDF-buffer tests pass for Presupuesto and operational non-fiscal Invoice.
- Package-owned TypeScript: no errors.
- Focused ESLint on new runtime/test files: no errors or warnings.
- Existing page lint still contains unrelated legacy warnings and a pre-existing `Date.now()` purity error; this package did not introduce them.
- Real email delivery was not executed and remains outside this package without a new explicit authorization.
- Independent read-only re-review: PASS in both Argentina and UTC timezone runs; no material findings.
