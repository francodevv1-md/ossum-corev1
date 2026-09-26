# FISCAL-TUSFACTURAS-DEV-001 — Lock

- task: FISCAL-07 — Expediente Comercial read-only fiscal evidence
- agent role: MiniMax UI/test/docs owner
- selected model: openai/gpt-5.6-terra
- status: editing
- acquired: 2026-09-25
- owned files: `src/components/expediente/ComprobantesAsociados.tsx`, `src/__tests__/components/ComprobantesAsociados.test.tsx`, and `knowledge/specs/FISCAL-TUSFACTURAS-DEV-001/{LOCK.md,FISCAL-07_TASK_BRIEF.md,FISCAL-07_HANDOFF.md}`
- scope: obtain authoritative invoices with existing `useInvoices(surgery.backendId ?? surgery.id, activeCompanyId)`; expose a read-only accessible action only for matching authoritative rows and pass only `InvoiceApiRow.id` to existing `FiscalEvidenceDialog`.
- exclusions: legacy `Comprobante` table/data contract, API/routes/services/validators, Prisma/schema/migrations, Auth/permissions, provider integration, environment/secrets, `ExpedienteFullView`, `FiscalEvidenceDialog`, `useFiscalEvidence`, issuance/mutation/retry controls, dependencies, Browser QA, commit, push, PR.
- gate: never join using a visible invoice field and never pass `Comprobante.id` or a legacy visible number as the fiscal invoice ID.
