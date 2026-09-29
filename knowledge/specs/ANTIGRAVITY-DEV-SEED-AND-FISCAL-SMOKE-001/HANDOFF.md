## Handoff

### Done
- Reproduced the migration-status discrepancy in the exact Antigravity worktree: two migrations, up to date.
- Applied the approved minimal root-cause correction in `prisma/seed.ts` under an explicit lock.
- Reran the seed successfully and completed read-only operational/fiscal Prisma smoke.
- Ran the seed a second time with no edits; it completed successfully, proving idempotence after the unique-code correction.

### Changed
- `ContactCompanyLink` seed upserts now set distinct deterministic `DEV-PATIENT`, `DEV-DOCTOR`, `DEV-INSTITUTION`, and `DEV-PAYER` codes in both `update` and `create` data.
- No schema, migration, test, environment, provider, Auth, browser, or direct-SQL changes.

### Files
- `prisma/seed.ts`
- `knowledge/specs/ANTIGRAVITY-DEV-SEED-AND-FISCAL-SMOKE-001/TASK_BRIEF.md`
- `knowledge/specs/ANTIGRAVITY-DEV-SEED-AND-FISCAL-SMOKE-001/LOCK.md`
- `knowledge/specs/ANTIGRAVITY-DEV-SEED-AND-FISCAL-SMOKE-001/HANDOFF.md`

### Validations
- `npx prisma migrate status --schema prisma/schema.prisma`: two migrations; database schema up to date.
- `npx prisma db seed --schema prisma/schema.prisma`: passed; all four contact links and nine surgeries completed.
- Read-only project-Prisma smoke: seeded Company found; Surgery count `9`; `FiscalDocument` delegate readable; fiscal document count `0`.
- Focused fiscal tests: 8/8 passed across fiscal service, fiscal evidence service/route, fiscal evidence dialog, hook, and Facturación integration. This exact worktree contains 8 directly fiscal-focused tests; no test additions were allowed or made.
- Scoped lint: `npx eslint prisma/seed.ts` completed with 0 errors and 7 pre-existing unused-variable warnings in the seed.
- `git diff --check`: passed with no whitespace errors; Git emitted line-ending warnings for existing modified files.
- Second-seed idempotence: `npx prisma db seed --schema prisma/schema.prisma` passed unchanged, preserving the deterministic fixture set.
- Full fiscal suite: 31/31 tests passed across 7 files, including invoice service, fiscal service/evidence/route, hook, dialog, and Facturación integration.
- Repeated migration status: two migrations; database schema up to date.
- Repeated read-only project-Prisma smoke: seeded Company found; Surgery count exactly `9`; `FiscalDocument` delegate readable; fiscal document count `0`.

### Diagnose
- Reproduce: the first seed run returned `P2002` at the second same-company contact-link upsert.
- Scope: deterministic seed data only; no schema or provider failure was observed.
- Evidence: `code` defaults to `""` and unique `[companyId, code]`; seed link creates previously omitted it.
- Hypothesis: all four seed link creates resolved to the same empty company code.
- Minimal Fix: assign four deterministic unique codes in the four upsert `update` and `create` payloads.
- Validate: the seed rerun completed successfully; the existing partial patient link was repaired through its `update` payload.
- Regression Check: nine seeded surgeries and fiscal delegate read were confirmed; migration status remains current.
- Handoff: complete.

### Risks
- No fiscal records were intentionally created; the smoke proves delegate reachability, not fiscal issuance.
- Existing unrelated working-tree changes and seed lint warnings remain outside this task.
- No provider, Auth, browser, or external call was made.

### Next
- Ready for the separate browser/Auth task if needed; no browser session was started here.
