# Coordination Availability Request DEV DB-Aligned Handoff

Date: 2026-07-23  
Status: DEV source and database alignment closed; feature default-disabled; not production-ready  
Supersedes: `HANDOFF_COORDINATION_AVAILABILITY_REQUEST_DEV_SOURCE_2026-07-23.md`, which remains historical evidence of the prior source-only state.

Done:
- Closed FT0–FT5 as checked in `knowledge/specs/COORDINATION-AVAILABILITY-REQUEST-001/TASKS.md`.
- Applied `20260722150000_repair_availability_prerequisites`, `20260722160000_add_availability_request_foundation`, and `20260723113000_repair_item_tenant_baseline` successfully to Supabase DEV.
- Confirmed Prisma is up to date with 16 migrations.
- Closed FT3 with evidence `#3775`; source verification evidence is recorded in `#3757` and `#3770`.

Changed:
- Replaced legacy foreign keys with the reviewed tenant-aligned foreign keys and confirmed the repair indexes and foreign keys are present.
- Preserved fail-closed behavior: the feature remains default-disabled and the runtime grants provider remains empty.
- No real per-company PÍVOT, capability grants, request UI, correction UI, or configuration UI was added or enabled.

Files:
- `knowledge/specs/COORDINATION-AVAILABILITY-REQUEST-001/TASKS.md` — authoritative FT0–FT5 closure state.
- `prisma/migrations/20260722150000_repair_availability_prerequisites/migration.sql` — applied DEV prerequisite repair.
- `prisma/migrations/20260722160000_add_availability_request_foundation/migration.sql` — applied DEV Availability foundation.
- `prisma/migrations/20260723113000_repair_item_tenant_baseline/migration.sql` — applied DEV item-tenant baseline repair.
- `knowledge/worklog/HANDOFF_COORDINATION_AVAILABILITY_REQUEST_DEV_SOURCE_2026-07-23.md` — superseded source-only handoff retained as historical evidence.
- `knowledge/worklog/HANDOFF_COORDINATION_AVAILABILITY_REQUEST_DEV_DB_ALIGNED_2026-07-23.md` — current DEV DB-aligned handoff.

Validations:
- Manual targeted checkpoint covered Surgery, AuditEvent, Prisma migration history, Remito, and a RemitoItem CSV. Devolucion/DevolucionItem and Consumo/ConsumoItem were empty where verified. This checkpoint was not a full logical backup.
- Principal catalog checks confirmed Availability tables and columns, 10 CHECK constraints, 23 foreign keys, required repair indexes and foreign keys, and replacement of legacy foreign keys.
- Focused DB integration rerun — PASS: 5/5 files and 6/6 tests.
- Cleanup verification — PASS: 25/25 counts were zero.
- Availability PÍVOT, request, assignment, and command test-prefix counts — zero (`#3767/#3774`).
- Source verification — PASS (`#3757/#3770`); FT3 closure — PASS (`#3775`).
- Documentation-only preparation of this handoff: no code, DB, Git, or test commands were run.

Risks:
- The entire full suite was not rerun after the repairs; only the focused DB integration rerun is proven.
- Global lint debt remains.
- No Availability-specific custom DEV runtime fixture or browser, mobile, or accessibility QA is proven.
- Production migration, enablement, and readiness are not proven or approved.
- The feature has no real PÍVOT or grants and remains default-disabled with an empty runtime provider.

Next:
1. Obtain human approval for the real per-company PÍVOT designation.
2. Obtain human approval for explicit capability grants and provider enablement.
3. Run an Availability-specific DEV runtime fixture and browser, mobile, and accessibility QA.
4. Only then enable the feature in DEV. Production requires fresh approval and evidence.
