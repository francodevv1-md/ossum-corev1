# Surgery Reschedule 012-CORE — Lock

- task: SURGERY-RESCHEDULE-012-CORE
- owner/role/model: OpenCode GPT-6.1 Sol / integration owner; one directed implementation agent, then independent read-only reviewer
- status: released (2026-10-06: independent corrective source review PASS; offline tests PASS; global TypeScript FAIL and real DB/browser acceptance pending are explicitly separate)
- workspace: E:/OSSUM_COR_ANTIGRAVITY/ux-ui; base HEAD 21385527dcfbc6ebc5b1507096d03a2c402d8c4d
- reserved files:
  - prisma/schema.prisma
  - prisma/migrations/20261005_surgery_time_specified/migration.sql
  - src/app/api/companies/[companyId]/surgeries/[surgeryId]/route.ts
  - src/lib/validators/surgery.validator.ts
  - src/lib/services/surgery.service.ts
  - src/lib/services/coordination-view.service.ts
  - src/lib/api/backend-surgeries.ts
  - src/lib/api/surgery-adapter.ts
  - src/types/index.ts
  - src/hooks/useCirugiaActions.ts
  - src/components/cirugias/dialogs/ChangeDateDialog.tsx
  - src/app/cirugias/page.tsx
  - src/lib/cirugias/cirugias-columns.tsx
  - src/components/cirugias/CirugiaActionsCell.tsx
  - src/components/expediente/ExpedienteFullView.tsx
  - src/components/expediente/ExpedienteHeader.tsx
  - src/__tests__/unit/surgery-management-route.test.ts
  - src/__tests__/unit/surgery-management.service.test.ts
  - src/__tests__/unit/backend-active-surgeries-adapter.test.ts
  - src/__tests__/unit/useCirugiaActions-change-date.test.tsx
  - src/__tests__/components/ChangeDateDialog.test.tsx
  - src/__tests__/unit/useCirugiaActions-create-backend-only.test.tsx
  - src/__tests__/components/CirugiasChangeDateFlow.test.tsx
  - src/__tests__/components/CirugiasDataGrid.test.tsx
  - src/__tests__/components/ExpedienteFullView.test.tsx
  - src/__tests__/components/ExpedienteHeader.test.tsx
  - .opencode/locks/SURGERY-RESCHEDULE-012-CORE.lock.md
  - knowledge/specs/SURGERY-RESCHEDULE-012-CORE/HANDOFF.md
- bounds and exclusions:
  - Migration applied in DEV (20261005_surgery_time_specified) with explicit user approval; NO new DB operations, migrations or resets.
  - Zero DB queries, seeds, cleanup, forensics, Auth/permissions changes.
  - Zero external package installs, configuration edits, build/restart, DEV5000/.next takeover or git commit/push.
  - Exclude writers of Coordinadores, intake/new surgery, and weekly Calendar; record as pending dependencies.

## Authorized continuation — 2026-10-06

This section supersedes the historical ownership and Coordinadores exclusion for this bounded continuation only. The previous reserved-file list remains historical evidence, not permission to edit every listed file.

- current HEAD: `685ef3229da012ed988388d512d91f3e3c4bad2e`
- approval: Franco requested the rescheduling flow only, accepted notification simulation/log, excluded calendar drag, and confirmed the former owner stopped after an explicit takeover question.
- scope: surgery or shipping date changes from the active global/personal Coordinadores screens and Ficha; today-or-future dates in Argentina; optional surgery time; await actual save; common audited simulated notification for admin/logistics (Depósito is the existing logistics role).
- active source allowlist:
  - src/components/coordinadores/CoordinadoresAdminClient.tsx
  - src/components/coordinadores/CoordinatorPersonalClient.tsx
  - src/components/coordinadores/modal/DefineDateModal.tsx
  - src/components/coordinadores/modal/CaseDetailModal.tsx
  - src/components/coordinadores/modal/CaseDetailModalHeader.tsx
  - src/components/coordinadores/modal/TabPaneGestion.tsx
  - src/components/cirugias/dialogs/ChangeDateDialog.tsx
  - src/hooks/useCirugiaActions.ts
  - src/app/cirugias/page.tsx (only ChangeDateDialog props)
  - src/lib/api/backend-surgeries.ts (only shared rescheduling payload helper if needed)
  - src/lib/surgery/rescheduling.ts (small pure date helper if needed)
  - src/lib/validators/surgery.validator.ts
  - src/lib/services/surgery.service.ts
- tests: focused existing management service/route, date hook/dialog, Cirugias caller tests; new rescheduling helper and active Coordinadores/modal tests in src/__tests__/unit or components. No integration/DB test execution.
- artifacts: this lock and knowledge/specs/SURGERY-RESCHEDULE-012-CORE/CORRECTION-20261006.md.
- permitted commands: read-only Git/status/diff/hash, exact allowlisted offline Vitest commands, direct `tsc --noEmit --incremental false`, focused eslint if useful. Serialize validation with the writer; no shared builds or generators.
- forbidden: Auth/permissions/store/schema/migrations, calendar/drag, palette, inactive CoordinatorInboxView/CoordinatorManagementDialog, mail/ntfy sends, secrets/env, dependencies/config, DB queries/mutations/tests, build/restart/port takeover, git commit/push/PR.
- shared resources: no server/.next/Prisma generation used. Browser/real DB QA remains blocked until a current identified disposable DEV target/session and server ownership are verified.
- preservation: 25/26 historical hashes match; ExpedienteFullView differs and is excluded. Preserve all foreign changes. Stop on new ownership conflict or source drift during writing.
- validation: targeted offline tests, actual direct TypeScript diagnostics separated from unrelated errors, independent read-only source review. Never claim simulated notification delivery or DB/browser acceptance.

## Continuation closure

- Single implementation writer completed the first pass and one corrective pass after independent review found four blockers.
- Final independent source review: PASS for the four fixes and their direct regressions; no proven outstanding source blocker in the requested scope.
- Final integration replay: 15 offline unit/component suites, 157/157 PASS, exit 0 at 11:57:07 local. Completed tests were not repeated after the host restart.
- Interrupted TypeScript/review resumed after restart; direct TypeScript exit 1 only for unchanged next.config.ts, CoordinationPreviewBoundary.test.tsx and cirugias-api/page.tsx diagnostics. No changed-file diagnostics; not a global PASS.
- Final scoped whitespace check: exit 0. Final 18 application/test SHA-256s, exact replay and limitations recorded in CORRECTION-20261006.md.
- No DB queries/mutations, real notifications, schema/Auth/permission/calendar/config changes, build/restart or Git publication by this package. Source ownership released; future real DEV QA needs identified target/server/session prerequisites, not an assumed historical approval.
