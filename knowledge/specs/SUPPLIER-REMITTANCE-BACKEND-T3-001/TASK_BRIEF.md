# Task Brief — Supplier Remittance Backend T3 DEV

## Objective

Replace the `remitosProveedor` Zustand authority with persisted, company-scoped Supplier Remittances linked explicitly to Goods Receipts.

## Approved scope

- Supplier remittance header and expected lines, supplier company validation through `ContactCompanyLink`, list/detail/create API and UI.
- Exactly one optional Goods Receipt per Supplier Remittance. A receipt is opened only by explicit user action from a persisted remittance.
- Free receipts remain unlinked. A later link is explicit/manual, audited, and never inferred from reference, supplier, date, or lines.
- Reuse existing S1 confirmation semantics so confirmed receipt stock increments once only.

## Exclusions

Auth/global permissions, purchase orders, purchase invoices, payment orders, boxes, surgeries, fiscal scope, C13/C14/WCB-06 changes, new dependencies, production/staging, deploy, commit, push, merge, and PR.

## Delivery

- `size:exception` explicitly approved by Franco.
- Additive schema migration `20260922150000_supplier_remittance_backend_t3` applies only to the confirmed disposable DEV database.
