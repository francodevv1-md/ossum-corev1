## Done
- Implemented bounded backend-only Comprobantes panel V1 with active company + `surgery.backendId`. Effective model: `openai/gpt-6.1-sol`; owner: Sol.
- Antigravity intake/authorization/coordinator files untouched. DB_TESTS_BLOCKED unchanged.

## Changed
- Real linked budgets/invoices, complete offset pagination through existing clients, distinct loading/empty/error/reload/missing-identity/missing-company states.
- Scope/reload-keyed snapshots and cleanup discard late success/errors; unexpected returned company/surgery fails closed.
- Real backend numbers/IDs, dates, states, currency and amounts. Draft and issued states remain distinct; missing number says `Sin numeración`. Budget balance says `No aplica`; invoice balance only displays backend value (including zero).
- No legacy-prop fallback, mixed-stage aggregate debt, fake actions, or fiscal-evidence action. Unsupported PE/NR/CO/NC/ND explicitly unavailable.

## Files
- `src/components/expediente/ComprobantesAsociados.tsx` — panel only; parent prop signature retained.
- `src/hooks/useSurgeryComprobantes.ts` — isolated scoped reads and stale-response protection.
- `src/__tests__/components/ComprobantesAsociados.http.test.tsx` — real API clients over mocked HTTP, GET/query-key allowlist.
- `knowledge/specs/SURGERY-COMPROBANTES-BACKEND-READ-DEV-001/` — brief, lock, validation, review and handoff.

## Validations
- Exact test allowlist: `node_modules/.bin/vitest.cmd run src/__tests__/components/ComprobantesAsociados.http.test.tsx` — 11/11 passed.
- `node_modules/.bin/tsc.cmd --noEmit --incremental false --extendedDiagnostics` — passed; first 120-second timeout diagnosed without source changes.
- Targeted `git diff --check` — passed (Git line-ending warning only).
- Independent read-only review `characteristic-purple-nightingale`: no blocking findings. Ownership released; source fingerprints unchanged since tests.
- Browser/build/DB tests: not run. No authorized browser context or exclusive shared build window; no real persistence claim.

## Risks
- Parent `ComercialTabContent.tsx:62–74` still displays legacy base-budget/balance cards outside this owned panel. This task does NOT make those cards or the whole Ficha backend-authoritative.
- Offset pages inherit server ordering and have no transactional snapshot under concurrent updates.
- Runtime/browser and persistence acceptance remain unverified; HTTP mocks certify UI/client behavior only.
- No commit, push, deploy, schema, Auth, permissions, or dependency changes.

## Next
- In an existing authorized DEV session: select company → `/cirugias` → open Ficha CX for an existing backend-linked surgery → `Comprobantes` tab → the inner `Comprobantes asociados` panel, below the parent summary cards.
- Show an existing linked budget and invoice, compare real number/ID/state/date/amount; use `Recargar` for fresh reads. No new records or mutations are needed by this delivery.
- Run only the focused test command above for a repeatable mock demonstration without DB/browser access. Do not invoke global/integration suites.
