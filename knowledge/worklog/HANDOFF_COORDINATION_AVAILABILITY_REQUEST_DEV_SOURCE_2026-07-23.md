# Coordination Availability Request DEV Source Handoff

Date: 2026-07-23  
Status: DEV source-only closure; default-disabled; not DB-validated or production-ready

Done:
- Closed FT1 schema and migration source statically (`#3700/#3701`); the migration was not applied.
- Closed FT2 disabled backend/API (`#3719/#3722`) and FT4 source-inert recipient UI (`#3733/#3736/#3737`).
- Executed FT5 final DEV source QA (`#3738`) with focused Availability gates passing.
- Included the Remito `companyId` fix evidence (`#3727/#3728`).
- Left FT3 deferred and unapplied.

Changed:
- Added source definitions for Availability persistence, request lifecycle, material-availability correction, recipient assignment, notifications, and company-scoped API boundaries.
- Added fail-closed Availability capabilities with a literal `false` source flag and an empty runtime grants provider.
- Added source-inert recipient action client, hook, and dialog coverage.
- No real PÍVOT or grants were configured, and no request, correction, or configuration UI was activated.

Files:
- `prisma/schema.prisma` — approved FT1 source definitions.
- `prisma/migrations/20260722160000_add_availability_request_foundation/migration.sql` — reviewed migration source; not applied.
- `src/lib/permissions/availability-request.ts` — literal-disabled capability boundary and empty provider.
- `src/lib/services/availability-request.service.ts` — request lifecycle.
- `src/lib/services/material-availability.service.ts` — canonical availability-date lifecycle.
- `src/app/api/companies/[companyId]/surgeries/[surgeryId]/availability-requests/route.ts` — request API boundary.
- `src/app/api/companies/[companyId]/availability-requests/[requestId]/complete/route.ts` — recipient completion API boundary.
- `src/lib/api/availability-request-client.ts` — source-inert recipient client.
- `src/hooks/useAvailabilityRequestAction.ts` — recipient action state.
- `src/components/notifications/AvailabilityRequestActionDialog.tsx` — source-inert recipient dialog.
- `knowledge/specs/COORDINATION-AVAILABILITY-REQUEST-001/TASKS.md` — FT closure and deferral record.
- FT5 report topic `#3738` — final DEV source-only QA evidence.

Validations:
- FT2 focused suite at FT5 — PASS, 100/100.
- FT4 focused suite — PASS, 86/86.
- Remito `companyId` fix — PASS, 25/25; typecheck PASS (`#3727/#3728`).
- Typecheck — PASS.
- Production build — PASS, 53 static pages.
- Exact Availability lint scope — PASS, 0 findings.
- Full repository suite — FAIL: 143/148 files completed; 1,750 tests passed and 16 skipped. Five DB-backed integration files failed because the DEV DB baseline lacks `devolucion_item.company_id` and `Surgery.createdById`.
- Global lint — FAIL: 260 errors and 786 warnings outside the exact Availability scope.
- No DB readiness validation, browser QA, production validation, or rollout validation was performed.

Risks:
- The DEV DB baseline is stale; FT3 remains an explicit, unapplied gate.
- Global lint debt remains outside this closure.
- DB behavior, browser behavior, mobile/accessibility behavior, and race scenarios remain deferred.
- Source provenance remains untracked and requires future review before any delivery workflow.
- Success-close behavior remains P2.
- Notification-count observability remains P2.
- `npm test` unexpectedly accesses Supabase DEV when credentials exist (`#3739`); do not repeat it in no-DB gates.
- The feature remains default-disabled with no real PÍVOT, runtime grants, request UI, correction UI, or configuration UI.

Next:
- Package 1: run an explicitly approved FT3 DEV DB baseline/migration gate naming the non-production target, window, operator, and reviewed migration checksum.
- Package 2: remediate global lint independently from Availability scope.
- Package 3: run separately approved browser, mobile, and accessibility QA.
- Any production migration, enablement, pilot, or rollout requires separate approval and evidence.
