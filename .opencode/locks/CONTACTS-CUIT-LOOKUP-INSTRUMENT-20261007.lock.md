---
task: CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007
agent_role: implementation-owner
selected_model: minimax/MiniMax-M3
status: editing
owned_files:
  - src/lib/log/redacted.ts (new)
  - src/lib/services/cuit-lookup.governance.ts (new — rate limit + budget + audit emission helpers)
  - src/lib/services/cuit-lookup.service.ts (instrumented: redaction, governance, audit)
  - src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts (pass actorUserId/companyId/requestId from ctx)
  - src/__tests__/unit/cuit-lookup-governance.test.ts (new, 12+ tests)
  - src/__tests__/unit/cuit-lookup-audit.test.ts (new, 8+ tests)
  - src/__tests__/unit/cuit-lookup-log.test.ts (new, 6+ tests)
  - knowledge/specs/CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007/TASK_BRIEF.md
  - knowledge/specs/CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007/run-checks.mjs (new)
  - knowledge/specs/CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007/typecheck.mjs (new)
  - knowledge/specs/CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007/HANDOFF.md
  - knowledge/worklog/CONTACTS_CUIT_LOOKUP_INSTRUMENT_2026-10-07.md (new)
created: 2026-10-07
parent_approval: ADR-027G + ADR-027H (both approved 2026-10-07 by Franco)
previous_adr: ADR-027H-FISCAL-CONSULTA-CUIT-USO-PRODUCTIVO (approved 2026-10-07)
notes:
  - Instrument-only: rate limit, log redaction, audit emission, per-actor + per-company + per-company-day budget.
  - No schema migration. No Auth/roles change. No persistent cache.
  - No commit, no push, no deploy, no browser, no real DB writes, no ARCA smoke.
  - All prior 23 suites / 259 tests must still pass.
  - Tests use injected logger / audit sink seams; no real Prisma in unit tests.
