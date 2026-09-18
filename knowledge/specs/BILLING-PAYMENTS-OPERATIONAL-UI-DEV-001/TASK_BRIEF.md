# BILLING-PAYMENTS-OPERATIONAL-UI-DEV-001

- Objective: replace mock financial authority in `/ventas/facturacion` and `/ventas/cobros` with the existing company-scoped operational Invoice/Payment backend.
- Owner: SDD apply agent; final validation/review by orchestrator.
- Mode: implementation + QA.
- Approval evidence: after GGA requested precise business-rule authorization, Franco explicitly approved the bounded package on 2026-09-02 by answering “Apruebo” to: “¿Aprobás el paquete DEV de Facturación/Cobros operativos —borradores, emisión no fiscal, cobros imputados y anulaciones— excluyendo fiscalización, schema, Auth, deploy y datos reales?”. Canonical governance record: root `AGENTS.md`, active approval §16. Operational record: Engram #6269.
- Scope: typed API clients/hooks; backend-backed invoice list/manual draft/explicit emit; invoice-bound payment registration; payment list/cancel; focused tests.
- Preserve: existing non-fiscal Invoice email dialog and navigation to digital receipts/expediente where identifiers are valid.
- Exclude: TusFacturasAPP, ARCA/AFIP, CAE, fiscal claims, schema/migrations/DB mutation, Auth/roles/permissions, customer account/current-account authority, unallocated/general payments, later imputation, due-date/overdue claims, multi-surgery invoices, dependencies, deploy and push. The local package commit is separately approved above.
- UX truth: label documents as operational/non-fiscal; do not show mock customer, due date, overdue, or string-number imputation as authoritative.
- Validation: focused tests, scoped lint, root typecheck and build; Browser QA only if an authenticated DEV session is already available without Auth changes.
- Stop: payer/customer identity becomes required, permission behavior must change, schema/API contract must change, or another writer owns a scoped file.
