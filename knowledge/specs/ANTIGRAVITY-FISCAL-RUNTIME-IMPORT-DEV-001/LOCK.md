# Lock — ANTIGRAVITY-FISCAL-RUNTIME-IMPORT-DEV-001

- Task: `ANTIGRAVITY-FISCAL-RUNTIME-IMPORT-DEV-001`
- Agent role: Backend / UI integration implementation agent
- Selected model: `openai/gpt-5.6-terra`
- Status: `released`
- Owner: fiscal runtime/evidence import executor

## Writer-owned files

- `src/lib/services/fiscal.service.ts`
- `src/lib/services/fiscal-evidence-read.service.ts`
- `src/lib/validators/fiscal.ts` (only if required)
- `src/app/api/companies/[companyId]/invoices/[invoiceId]/fiscal-evidence/route.ts`
- `src/components/facturacion/FiscalEvidenceDialog.tsx`
- `src/hooks/useFiscalEvidence.ts`
- `src/app/ventas/facturacion/page.tsx`
- `src/lib/services/invoice.service.ts`
- `src/__tests__/unit/fiscal.service.test.ts`
- `src/__tests__/unit/fiscal-evidence-read.service.test.ts`
- `src/__tests__/unit/fiscal-evidence-read.route.test.ts`
- `src/__tests__/unit/useFiscalEvidence.test.tsx`
- `src/__tests__/components/FiscalEvidenceDialog.test.tsx`
- `src/__tests__/components/FacturacionPage.fiscal-evidence.test.tsx`
- `knowledge/specs/ANTIGRAVITY-FISCAL-RUNTIME-IMPORT-DEV-001/{TASK_BRIEF.md,LOCK.md,HANDOFF.md}`

## Excluded from this lock

- `prisma/schema.prisma` and all migrations (existing fiscal migration is intentionally untouched)
- provider integration/configuration, provider calls, issuance/retry/webhook routes
- existing dirty logistics and seguimiento files

## Release evidence

- Focused fiscal tests passed (31 tests across 7 files).
- Scoped ESLint and `git diff --check` passed.
- Prisma Client generation ran without a database connection; no database, provider, or application-server request ran.
