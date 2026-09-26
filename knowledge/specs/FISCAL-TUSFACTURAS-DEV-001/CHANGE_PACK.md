# FISCAL-TUSFACTURAS-DEV-001 — Change Pack

## Status

**APPROVED for Task Brief and DEV implementation planning by Franco on 2026-09-23.** Schema changes, migration execution, DEV secret configuration, provider calls and webhook activation remain individually gated by the preconditions below.

## Approval basis

- `ADR-FISCAL-POLICY-TUSFACTURAS-DEV.md` was accepted by Franco on 2026-09-23.
- The approved first-stage boundary is **fiscal issuance and fiscal reconciliation only**.
- TusFacturasAPP budgets, collections, account current and every other commercial capability are excluded. OSSUM retains authority over Cirugía and the commercial operation.

## Objective

Add a bounded, backend-only fiscal issuance and reconciliation capability to the existing OSSUM `Invoice` flow, preserving the current commercial invoice, `Payment`, `PaymentImputation`, Presupuesto, Consumo and account-current ownership.

## In scope

1. A versioned fiscal eligibility contract for an existing operational `Invoice`.
2. Immutable fiscal snapshots for issuer, recipient, items, IVA representation, rounding inputs and fiscal totals.
3. Persisted fiscal document/status and idempotent issuance attempts, linked to the operational invoice.
4. Server-side TusFacturas emission and lookup by stable `external_reference`.
5. Reconciliation for `PENDING` and `UNKNOWN` attempts from lookup and authenticated, idempotent webhooks.
6. A fiscal guard that blocks operational cancellation and linked Consumo restoration while fiscal evidence is `SUBMITTED`, `PENDING`, `UNKNOWN` or `AUTHORIZED`.
7. Minimal operator UI for an explicit issuance request, fiscal status and authorized evidence; no provider secrets in client code.
8. Focused tests for eligibility, totals, duplicate requests, lost responses, webhook duplicates/out-of-order events, reconciliation and the cancellation guard.

## Explicit exclusions

- Presupuestos, cobros, pagos, cuenta corriente, stock, remitos operativos, contactos and any other TusFacturasAPP commercial capability.
- NC/ND, fiscal adjustment policy and credit/debit-note issuance.
- Production/staging, real data, mass issuance, historical import or backfill.
- Auth/roles/RLS changes, changes to the core Cirugías flow, provider replacement, dependencies, deploy, push or PR.
- Automatic fiscal emission triggered by Consumo, payment, status change, browser refresh or webhook.

## Frozen policy decisions

- OSSUM owns the commercial operation; TusFacturasAPP owns fiscal authorization artifacts.
- `Invoice.visibleNumber` is internal only; fiscal type, Point of Sale and fiscal numbering are separate provider-backed evidence.
- A fiscal document snapshot is immutable. Later Contact, company, price or tax changes do not rewrite it.
- Fiscal types, IVA treatment, price basis, rounding and due-date rules require approved fiscal parameters before an invoice is eligible.
- A timeout is `UNKNOWN`, not failed. Reconcile by `external_reference` before any retry.
- A webhook updates fiscal evidence only; it never issues another document, changes a commercial invoice, changes Consumo or creates a payment.

## Required preconditions

1. Approved `DEV_ONLY` fiscal test policy: fictitious issuer/recipient, DEV Point of Sale, one supported test document type, one explicit configurable IVA case, API-required rounding/precision and configurable test due date where applicable. Productive fiscal policy remains outside this pack.
2. Task Brief T3 with exclusive file ownership and exact schema/API/UI scope.
3. Explicit confirmation that the connected database is disposable DEV before any migration.
4. DEV provider credentials and webhook token managed outside Git and never exposed to frontend/tests/logs; no real fiscal data is used.
5. Current TusFacturas contract verified immediately before implementation.

## Delivery slices

| Slice | Outcome | Must not do |
| --- | --- | --- |
| 1. Fiscal model and eligibility | Persistable snapshot/attempt design and server validation | Issue remotely or change commercial authority |
| 2. Emission and recovery | Explicit server-side issue + lookup reconciliation | Blind retry or automatic issuance |
| 3. Webhook and guard | Idempotent webhook update + cancellation/Consumo protection | Let webhook mutate commercial/payments |
| 4. UI and QA | Minimal status/evidence UX and focused tests | Build provider commercial screens |

Each slice remains DEV-only and independently verifiable. No slice activates a real fiscal provider call until its required preconditions are explicitly authorized.

## Acceptance criteria

1. A valid existing operational invoice can produce exactly one fiscal request identity without changing its payment or commercial state.
2. Snapshot data and fiscal totals persist immutably before provider submission.
3. Duplicate client requests, retries or lost responses cannot issue a second document.
4. `UNKNOWN`/`PENDING` resolves through provider lookup or a valid webhook without blind resubmission.
5. Duplicated, delayed or out-of-order webhooks cannot alter commercial state, payments, Consumo or a later fiscal result.
6. Operational cancellation and associated Consumo restoration are refused while fiscal evidence is active or authorized.
7. Frontend never receives provider credentials, raw secrets or authority to choose final fiscal state.
8. No provider budget, payment, account-current or other commercial endpoint is called.

## Stop conditions

- A requested change expands to provider commercial capability, NC/ND, Auth, permissions, production, real data or Cirugías core behavior.
- The fiscal parameter policy is incomplete or conflicts with accounting guidance.
- The provider contract cannot support safe `external_reference` reconciliation or authenticated webhook handling.
- Schema/migration or DEV secret configuration is needed without its explicit approval gate.

## References

- `knowledge/architecture/ADR-FISCAL-POLICY-TUSFACTURAS-DEV.md`
- `knowledge/domain/FISCAL_BOUNDARY_TUSFACTURAS.md`
- `knowledge/domain/FACTURACION_COBROS.md`
- TusFacturasAPP [Consulta avanzada](https://developers.tusfacturas.app/api-factura-electronica-afip-facturacion-ventas/consulta-avanzada.md) and [Webhooks](https://developers.tusfacturas.app/api-factura-electronica-afip-facturacion-ventas/webhooks-notificaciones.md)
