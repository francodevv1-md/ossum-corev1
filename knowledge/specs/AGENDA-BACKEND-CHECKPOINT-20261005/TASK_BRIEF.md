# Agenda backend checkpoint

- Task: AGENDA-BACKEND-CHECKPOINT-20261005; implementation/focused QA owner; model `openai/gpt-6.1-sol` (host-reported).
- Approval: Franco's “autorizo lo de gpt, avancemos”; bounded DEV preparation, validation and proven partial-PATCH correction only.
- Source writes: `src/lib/services/personal-calendar.service.ts`, `src/__tests__/unit/personal-calendar.service.test.ts`. Artifacts: this folder only.
- Outcome: HEAD `2540980e431aa77caaf68c1ff7af263c4ca73a9b` plus the ten existing Agenda source/test/migration files; isolated schema contains only Company/User personalCalendarEvents relations and PersonalCalendarEvent model.
- Checks: reproduce invalid one-bound updates with mocked Prisma; reject with 400/validation_failed without update; preserve equality, valid partial/title edits and cancellation; run only three named unit suites. Isolated Prisma validation/generation and TypeScript/build subject to baseline gates.
- Exclusions: original schema/config/index, foreign locks/docs/worklog, shared .next/DEV5000, Auth/permissions/UI/core surgery/Articles, DB/network/install/seeds, environment/secrets reads, commits/staging, integration execution. Preparation→Remito remains DB_TESTS_BLOCKED.
- Commands: read/search tools, apply_patch, read-only Git/hash/status, installed local vitest/prisma/tsc/next; HEAD archive export/unpack in approved temp only.
- Stop: ownership overlap, baseline foreign schema defects (no Stock fixes), unsafe integration target, unsupported filesystem isolation; at most two Diagnose attempts per blocker. Parent independent review required.
