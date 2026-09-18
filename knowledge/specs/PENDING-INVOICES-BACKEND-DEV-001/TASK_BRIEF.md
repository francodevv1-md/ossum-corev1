# TASK BRIEF — PENDING-INVOICES-BACKEND-DEV-001

## Objective

Implement the approved DEV-only, backend-authoritative **Pendientes de facturar** flow. Eligible sources are approved CURRENT budgets and validated consumptions; creating a pending row produces only an operational, non-fiscal Invoice draft.

## Approval and canonical rules

- Franco's explicit implementation request on 2026-09-02 is the initial DEV approval under the Fast Delivery Contract.
- Documentation is alert-only and never blocks billing.
- A budget source is eligible only when `state = Aprobado` and `slot = CURRENT`.
- A consumption source is eligible only when `state = Validado` and an approved CURRENT budget exists for the same backend surgery.
- Any active Invoice (`state != Anulada`) referencing a source removes that source from pending.
- Backend PostgreSQL data is authoritative; no Zustand, localStorage, surgery mock, or client-supplied financial item is authoritative.

## Task declaration

- **Task ID / Name:** PENDING-INVOICES-BACKEND-DEV-001 / Pendientes de facturar
- **Agent Role:** SDD apply executor / senior full-stack
- **Selected LLM:** openai/gpt-5.6-sol
- **Mode:** implementation + focused testing
- **Scope:** source-backed Invoice draft service/route/client/hook, company-scoped pending-source hook, pending page, focused tests
- **Allowed files:** files listed in `LOCK.md`
- **Forbidden files:** `AGENTS.md`, Prisma schema/migrations, Auth/security/roles, package files, deploy configuration, unrelated dirty files
- **Allowed commands:** focused Vitest, scoped ESLint, read-only Git inspection
- **Forbidden commands:** schema/migration commands, dependency installation, deploy, commit, stage, push, destructive Git commands
- **Validation required:** focused unit/component tests and scoped ESLint
- **Output:** Caveman handoff with exact files and commands
- **Stop conditions:** scope expansion into forbidden areas, incompatible lock, destructive action, unresolved business rule

## Tasks

- [x] Add source-specific draft validation and backend service creation.
- [x] Dispatch source payloads in the existing Invoice route without changing manual creation.
- [x] Add typed API/hook operation with stale-company protection.
- [x] Add fully paginated company-scoped pending-source hook.
- [x] Replace the legacy pending page with backend-authoritative candidates and draft creation.
- [x] Add focused tests for authority, source IDs, Decimal(18,4), stale scope, refresh, and frontend isolation.
- [x] Run focused tests and scoped ESLint.
- [x] Release ownership lock.

## Validation evidence

- Final focused suite: 42/42 tests passed across seven files.
- Scoped ESLint and `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed with Next.js 16.2.6 (`next build --webpack`).
- Authenticated Browser QA passed in the visible persistent Playwright session `billing-qa` at `/ventas/pendientes-facturar`: the page rendered three real backend candidates, operational/non-fiscal copy, backend IDs and exact four-decimal amounts; Invoice, Presupuesto and Consumo requests returned 200 with no console errors. No financial data was mutated.
- Final `gga run --no-cache`: passed after lifecycle, transaction, source-authority, and compatibility corrections.

## GGA lifecycle correction — 2026-09-02

- Consumption-linked Invoice drafts now leave Consumo in `Validado`.
- Invoice emission transitions the linked Consumo `Validado → Facturado` in the same transaction.
- Annulling an emitted consumption-linked Invoice conditionally restores the company-linked Consumo `Facturado → Validado` in the same transaction.
- Draft deletion and draft annulment do not restore Consumo because drafts never transition it.
- Validation: 29/29 focused tests, scoped ESLint, and `npx tsc --noEmit --pretty false` passed.

## GGA transactional source correction — 2026-09-02

- Source-specific creation now opens one transaction before any eligibility or pricing read.
- Exact company-scoped Presupuesto and optional Consumo rows are locked with `FOR UPDATE` before revalidation.
- Approved/CURRENT and Validado source reads, duplicate active-Invoice checks, exact Decimal pricing, Invoice creation, and audit now share that transaction.
- A small internal create-record helper avoids nested Prisma transactions while preserving the generic/manual contract.
- Validation: 31/31 focused tests, scoped ESLint, and `npx tsc --noEmit --pretty false` passed.

## GGA total reconciliation and Invoice serialization — 2026-09-02

- Presupuesto-only drafts reuse persisted item discounts, which already include line and general discounts, and reconcile their exact calculated total against authoritative `Presupuesto.total` before creation.
- Total drift aborts with `invoice_presupuesto_total_mismatch` (409); no second general-discount calculation is applied.
- State changes and payment recomputation both lock the same exact company-scoped Invoice row with tagged `SELECT ... FOR UPDATE` before reading.
- Payment recomputation remains transaction-only and preserves `Anulada`, preventing it from overwriting cancellation after Consumo restoration.
- Validation: 35/35 focused tests, 4/4 payment-service regression tests, scoped ESLint, and `npx tsc --noEmit --pretty false` passed.

## GGA source payload and delete serialization — 2026-09-02

- Invoice POST routes every payload containing `presupuestoId` or `consumoId` through strict source validation, regardless of `items` presence.
- Source payloads reject client-supplied `items` and other unknown fields; the strict manual schema no longer accepts source IDs.
- `deleteInvoice` now locks the exact company-scoped Invoice row and re-reads/validates `Borrador` inside the deletion transaction before deleting and auditing.
- Concurrent emission therefore wins through the shared row lock and stale deletion rejects the now-emitted Invoice.
- Validation: 37/37 focused tests, 4/4 payment-service regression tests, scoped ESLint, and `npx tsc --noEmit --pretty false` passed.

## GGA emission serialization — 2026-09-02

- `emitInvoice` now acquires the same exact company-scoped Invoice `FOR UPDATE` lock before reading `Borrador` state.
- Emission, deletion, state changes, and payment recomputation therefore share lock-before-read ordering.
- Existing Serializable isolation and P2034 retry behavior remain unchanged.
- Validation: 37/37 focused tests, 4/4 payment-service regression tests, scoped ESLint, and `npx tsc --noEmit --pretty false` passed.

## GGA sole emission path — 2026-09-02

- Generic state transitions now reject `Borrador → Emitida`; `emitInvoice` is the sole operational emission path.
- `Borrador → Anulada` remains valid.
- Emission therefore cannot bypass visible-number allocation or the linked Consumo transition.
- Validation: 38/38 focused tests, 4/4 payment-service regression tests, scoped ESLint, and `npx tsc --noEmit --pretty false` passed.

## Review workload forecast

- 400-line budget risk: High
- Chained PRs recommended: No
- Decision needed before apply: No
- Delivery boundary: one approved end-to-end DEV worktree outcome; Franco explicitly requested the local commit on 2026-09-02. Push and PR remain excluded.

## Exclusions

Fiscal issuance, ARCA/AFIP/CAE, schema, migrations, Auth/roles/security, production/staging, real data operations, deployment, dependencies, push, and PR.
