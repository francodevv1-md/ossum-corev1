# ANTIGRAVITY-FISCAL-MIGRATION-CANONICAL-DEV-001

## Objective

Add the minimum canonical, additive DEV_ONLY fiscal persistence schema to the Antigravity worktree. Runtime fiscal services and UI are explicitly excluded.

## Approval and boundary

Franco approved a new additive canonical fiscal migration without rewriting history or applying a database. This task creates a forward migration only; it does not connect to a database, modify existing migrations, import runtime code, or inspect secrets.

## Source of truth

- Root fiscal schema slice: `E:\OSSUM_COR_PROJECT\prisma\schema.prisma`.
- Root fiscal persistence services: `src/lib/services/fiscal.service.ts`, `fiscal-tusfacturas.service.ts`, and `fiscal-evidence-read.service.ts`.
- Root validator contracts: `src/lib/validators/fiscal.ts` and `fiscal-tusfacturas.ts`.
- Reconciliation artifact was read as evidence only, never copied into migration history.

## Required persistence

- `FiscalDocumentState`: `READY`, `SUBMITTED`, `PENDING`, `AUTHORIZED`, `REJECTED`, `UNKNOWN`.
- `FiscalDocument`: one immutable fiscal snapshot per `Invoice`, scoped to `Company`.
- `FiscalIssuanceAttempt`: ordered provider-attempt evidence, scoped to `Company` and its fiscal document.
- Fiscal-only foreign keys and indexes required by the existing root fiscal services.

## Migration policy

Migration `20260928120000_add_fiscal_dev_only_evidence` is forward-only from Antigravity's latest existing migration (`20260903130000_contacts_backend_authority`). Its SQL is derived by an offline Prisma schema-to-schema diff and must remain additive.
