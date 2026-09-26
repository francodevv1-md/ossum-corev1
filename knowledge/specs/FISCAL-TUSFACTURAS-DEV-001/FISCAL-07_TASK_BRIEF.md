# FISCAL-07 — Expediente Comercial Fiscal Evidence

## Task

Surface existing read-only fiscal evidence for invoices authoritatively associated with the current surgery in Expediente → Comercial.

## Owner and files

MiniMax UI/test/docs owner: `ComprobantesAsociados.tsx`, its focused component test, and this task's lock/handoff artifacts.

## Implementation

- Query the existing `useInvoices` with `surgery.backendId ?? surgery.id` and active company scope.
- Keep the legacy Comprobante table unchanged.
- Render an accessible evidence action only after authoritative invoices load and only for their `InvoiceApiRow.id` values.
- Reuse the existing `FiscalEvidenceDialog`; no fiscal mutations, retries, or new data layer.

## Acceptance and validation

- Prove the active company and surgery scope are supplied to `useInvoices`.
- Prove the dialog receives `InvoiceApiRow.id`, never a legacy `Comprobante.id`.
- Run focused tests, relevant lint/type command, and `git diff --check`.

## Stop conditions

Stop if this requires modifying a forbidden file or joining authoritative invoices to legacy rows through user-visible fields.
