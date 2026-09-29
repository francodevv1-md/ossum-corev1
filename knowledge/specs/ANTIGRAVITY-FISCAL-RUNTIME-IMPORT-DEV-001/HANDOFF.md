## Handoff

### Done
- Imported the DEV-only, server-authoritative fiscal evidence read runtime and the fiscal cancellation guard into Antigravity.
- Added a read-only Facturación evidence action using the selected backend invoice ID and current company scope.

### Changed
- Added no provider client, credentials/configuration, issuance/retry/webhook route, database call, or fiscal state mutation UI.
- Deliberately excluded root `fiscal-tusfacturas.service.ts`, `validators/fiscal-tusfacturas.ts`, `FacturarDialog`, Presupuesto authority, logistics/stock/contact changes, and all schema/migration files.

### Files
- Imported: `fiscal.service.ts`, `fiscal-evidence-read.service.ts`, fiscal evidence route, `useFiscalEvidence.ts`, `FiscalEvidenceDialog.tsx`.
- Updated minimally: `invoice.service.ts`, Facturación page, focused invoice service test.
- Added focused fiscal service/evidence/route/hook/dialog/page tests and task artifacts.

### Validations
- `npx prisma generate` passed without DB access.
- Focused Vitest: 31 tests across 7 files passed.
- Scoped ESLint passed.
- `git diff --check` passed.
- No database, provider, app-server, secret/environment-inspection, or external request ran.

### Risks
- The approved fiscal migration remains unapplied; evidence endpoints require a future explicitly confirmed disposable DEV migration application before runtime data exists.
- TypeScript was not run because the available project command is whole-project only and the task permits it only when scoped.

### Next
- On a future explicit disposable-DEV confirmation: apply the already-approved fiscal migration, run Prisma client generation, then perform an authenticated read-only evidence smoke against seeded DEV evidence. Do not add issuance/retry/provider behavior without a separate approved task.
