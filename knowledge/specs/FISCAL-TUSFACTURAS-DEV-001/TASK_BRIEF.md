# FISCAL-TUSFACTURAS-DEV-001 — Task Brief

## Approval

Franco approved continuation on 2026-09-23 after accepting `ADR-FISCAL-POLICY-TUSFACTURAS-DEV.md`, with TusFacturasAPP limited to fiscal issuance and reconciliation. Provider budgets, collections, account current and other commercial capabilities remain out of scope.

## Objective

Deliver the smallest DEV integration that issues and reconciles fiscal evidence for an existing OSSUM `Invoice`, while preserving OSSUM's exclusive operational authority over Cirugía, Presupuesto, Consumo, Cobros and Cuenta Corriente.

## Delegated tasks

| ID | Owner | Mode | Scope | Depends on | Stop / gate |
| --- | --- | --- | --- | --- | --- |
| FISCAL-01 | Fiscal/domain architect | design | Freeze the approved `DEV_ONLY` test contract: fictitious issuer/recipient, DEV PDV, one supported test type, configurable IVA case, API-required rounding/precision and configurable test due date. | None | No real data or productive tax rules; production policy stays pending accounting validation. |
| FISCAL-02 | Backend/DB agent | design + implementation | Add fiscal snapshot, document and attempt persistence; server eligibility; cancellation/Consumo guard. | FISCAL-01; explicit disposable DEV DB confirmation before migration. | `prisma/schema.prisma` lock; no migration on non-disposable DB. |
| FISCAL-03 | Backend integration agent | implementation | Add one backend-only TusFacturas client: issue, lookup by `external_reference`, classify errors and reconcile uncertain outcomes. | FISCAL-02; DEV credentials available through secret manager. | No secret inspection/output; no provider call before DEV secret authorization. |
| FISCAL-04 | Backend integration agent | implementation | Add authenticated/idempotent webhook ingestion and fiscal-evidence update only. | FISCAL-03; webhook token and provider delivery contract verified. | No webhook activation without security review and DEV configuration approval. |
| FISCAL-05 | Frontend agent | implementation | Add minimal explicit request/status/evidence UI using server API only. | FISCAL-02 and FISCAL-03 contract. | No commercial/provider screens; no secret/state authority in frontend. |
| FISCAL-06 | QA/reviewer agent | testing + review | Run focused tests and DEV reconciliation scenarios; review scope and no-double-issue guarantees. | FISCAL-02 through FISCAL-05. | Stop on unresolved fiscal mismatch, duplicate risk or expired Auth session. |

## Ownership and ordering

- FISCAL-01 is sequential and documentary; it must finish before any schema or fiscal payload is selected.
- FISCAL-02 owns `prisma/schema.prisma`, fiscal server types/validators and `invoice.service.ts` only while its lock is active.
- FISCAL-03 and FISCAL-04 are sequential because they share the provider integration boundary.
- FISCAL-05 begins only after the backend response contract is stable.
- FISCAL-06 is read-only and may run only against the completed task scope.

## Hard exclusions

- TusFacturasAPP budgets, payments, account current and all other commercial capabilities.
- NC/ND and fiscal correction policy.
- Automatic issuance from Consumo, Cobro, payment state, browser retry or webhook.
- Production/staging, real data, mass issuance, historical import, deploy, push and PR.
- Auth/role/RLS changes and refactors of the core Cirugías flow.

## Validation required

- Focused unit/integration tests for eligibility, snapshot immutability, fiscal totals, duplicate requests, timeout recovery, webhook duplicate/out-of-order events and cancellation/Consumo guard.
- Prisma format/generate/validate and migration artifact checks when schema is authorized.
- TypeScript and focused lint.
- Authenticated DEV browser smoke only after fresh preflight; no Auth modifications to pass it.
- Independent review and Caveman handoff.

## Current blockers

1. FISCAL-01 is unblocked with the approved `DEV_ONLY` test policy; the resulting configuration must reject automatic production reuse.
2. A disposable DEV database must be explicitly confirmed before FISCAL-02 can execute a migration.
3. DEV provider credentials and webhook token must be configured outside Git before FISCAL-03/FISCAL-04 can call or activate TusFacturasAPP.

## Handoff format

`Done / Changed / Files / Validations / Risks / Next`

## Fiscal status contract clarification — 2026-09-24

- `NOT_REQUESTED` is not persisted: no `FiscalDocument` or `FiscalIssuanceAttempt` means no fiscal evidence, and a later UI may derive that condition.
- A definitive received provider rejection (`response.error !== "N"`) persists `REJECTED` with sanitized error/evidence.
- Timeout, transport, HTTP failure, lost response, or missing/mismatched CAE/reference persists `UNKNOWN`; reconciliation remains mandatory before any retry.

## Fiscal simulated DEV clarification — 2026-09-24 (reversed persistence)

- `SIMULATED` is a derived `DEV_ONLY` presentation state, never `DEV_ACCEPTED` and never a production or ARCA authorization. The persisted `FiscalDocument` and `FiscalIssuanceAttempt` state remains `UNKNOWN`.
- It requires a received issuance response with TusFacturas `error="N"`, exact `external_reference`, non-empty `comprobante_nro`, non-empty `comprobante_pdf_url`, and blank/missing CAE because no ARCA connection exists.
- `AUTHORIZED` still requires non-empty CAE and exact reference. Missing number/PDF, mismatched reference, timeout, transport, HTTP/lost response, or other incomplete evidence remains derived and persisted `UNKNOWN`; `error !== "N"` remains `REJECTED`.
- `SIMULATED` preserves sanitized evidence and does not enable automatic issuance or retry. It may be persisted only after Prisma migration history is stabilized and a separate migration is approved.

## FISCAL-02 execution status — 2026-09-23

- **Status:** PARTIAL — implementation, focused tests, Prisma format/validate/generate and TypeScript check completed; migration application is blocked before FISCAL-02's new migration can be generated/applied.
- **Implemented:** additive DEV_ONLY `FiscalDocument`/`FiscalIssuanceAttempt` schema and migration artifact; immutable server-built snapshot/eligibility service; transactional cancellation and linked Consumo-restoration guard for `SUBMITTED`, `PENDING`, `UNKNOWN` and `AUTHORIZED` fiscal evidence.
- **Migration artifact:** `20260923134500_fiscal_tusfacturas_dev` (not applied).
- **Blocker:** `npx prisma migrate dev --name fiscal_tusfacturas_dev` stops in the pre-existing `20260921020000_stock_reservation_evidence_command_reservation_unique` shadow migration because PostgreSQL rejects its `name[] = text[]` comparison. No unrelated migration was changed.
- **Excluded:** FISCAL-03+, provider calls/credentials/webhooks, UI, Auth/roles, payments, NC/ND, real fiscal data, production/staging, deploy, push and PR.
