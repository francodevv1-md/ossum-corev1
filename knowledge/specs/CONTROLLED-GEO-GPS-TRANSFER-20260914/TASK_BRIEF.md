# Controlled Geography/GPS Recovery — Task Brief

## Active bounded correction — 2026-09-16 (supersedes historical scope below for this batch)

Execution addendum: user supplied independent PASS and confirmed pin `78d1320aafd9d18313b821af541bbe80accb26b0e6524da6ef9aa5ed6ffefe01`, explicitly authorizing execution NOW on the already-confirmed disposable DEV target through the isolated single-new-migration Prisma runner with normal recording. This supersedes the artifact-only execution hold below, not any other exclusion. Fresh preflight, unchanged source DIRECT_URL in memory, default Prisma advisory locking, SQL locks/timeouts, full rowset/history preservation verification required. No auto retry on failure. Only temporary scripts/configs under the preapproved temp root and recovery documentation may change; release lock only after verified success. Durable clean `.env` is not repaired by this operation.

- Task: `controlled-geo-gps-forward-correction`; T3; owner: sdd-apply executor, `openai/gpt-6-astra` (runtime-declared model); implementation/testing.
- Approval: user confirmed disposable DEV migration execution and answered `si pa pisalo y sigamos bien` to the explicit no-other-session/package-owner reassignment question. Prior lock is reassigned; no concurrent package editor reported by the user.
- This batch ONLY creates correction SQL/tests and runs synthetic temporary-table tests. Application-table execution remains prohibited until independent review. Source worktree remains read-only.
- Allowed writes: new `prisma/migrations/20260916143000_geo_gps_tenant_forward_correction/migration.sql`, `src/__tests__/integration/geo-gps-forward-correction.test.ts`, and this recovery brief/LOCK/HANDOFF.
- Forbidden: schema/application/Auth/RLS/dependencies/env/old migrations; checksum/history edits, reset, resolve, blanket deploy, commits/push/staging/production.
- Commands: read-only Git/catalog inspection, installed test tools, synthetic session-local PostgreSQL fixtures with connection-close cleanup. Source DIRECT_URL may be loaded unmodified into child memory only; no secret output or TLS overrides.
- Diagnose evidence: diagnostic session `ses_f54f87f6effewLIGugvq55WwAX`, Engram #6867–6869: existing geography/GPS applied, three addresses (two enriched), exactly one link each; old vehicle device uniqueness; no incoming address FKs/custom scoped triggers. Root cause is physical tenant/index drift, not unapplied old geography/GPS migrations.
- Design: locked transaction; exact bounded legacy state or validated target no-op; in-place single-link backfill; preserve every ID/non-tenant field/link/vehicle/position; reject orphan, multi-link, duplicate device, partial state. No cloning/deletion.
- Validation: actual unchanged SQL on synthetic temporary tables; enriched preservation, FKs/main/device uniqueness, negative prestates, target no-op and rollback. SQL-only change: application build/browser and Prisma format/generate not applicable (schema unchanged).
- Tasks: [x] forward artifact; [x] synthetic integration evidence; [x] scoped Prisma execution/recording procedure; [x] independent review PASS and pinned hash; [x] approved disposable DEV execution and exact pre/post verification. Lock released after success; durable clean environment repair remains outside this package.
- Review workload: one bounded artifact/test work unit, target below 400 changed lines; no PR requested. 400-line budget risk: Low. Chained PRs recommended: No. Decision needed before apply: No.
- Stop: unexpected schema/data state, ownership overlap, secret/TLS change needed, unrelated history repair, or required application mutation during this batch.
- Handoff: Done / Changed / Files / Validations / Risks / Next. Artifact phase ended in `review`; subsequent explicitly approved execution ended in `released` after successful verification.

## Objective

Recover the authorized institution geography and Vehicle GPS/map scopes from source into this clean worktree at `ce61937`, without touching source or executing database changes.

## Authorization

Approval record — Franco, 2026-09-14: explicitly authorized the controlled GPS/geolocation transfer to `E:\OSSUM_COR_WORKTREES\ossum-clean`, then confirmed the schema/migration/multiempresa/dependency items as one task. This finite DEV authorization covers the two listed map dependencies, unexecuted schema/migration artifacts, and the smallest ContactAddress `companyId` tenant-isolation correction required by GGA. Franco then explicitly authorized duplicating every historical `ContactAddress` for every company linked to its contact, resolving the GGA multi-company backfill blocker. It does not extend to migration execution, database/data changes, production, staging, deploy, push, additional dependencies, providers, secrets, or unrelated source changes.

## Scope and ownership

- Owner: `sdd-apply / openai/gpt-5.6-terra`
- Mode: `implementation`
- Destination-only writes. Source is read-only.
- Preserve `.gga` and `knowledge/workflow/GGA_COMMIT_ROUTINE.md`.
- Never copy secrets, storage state, `node_modules`, generated output, screenshots, logs, or unrelated dirty source changes.
- No migration/database execution, push, or deploy.

## Execution declaration

- Allowed files: only the artifacts enumerated in Authorized scope, their focused tests, this Task Brief, `AGENTS.md`, and the existing ownership lock.
- Forbidden files: original source worktree files, secrets, storage state, generated output, unrelated application code, and GGA configuration except preservation of its existing policy.
- Allowed commands: Prisma `format`/`generate`, focused tests, `typecheck`, `build`, staged GGA review, Git staging and local commits.
- Forbidden commands: Prisma migration/DB commands, database writes, push, deploy, destructive Git commands, and source-worktree writes.
- Output: Caveman handoff with validation evidence and baseline-only failures.
- Expected handoff: update lock status, report committed hashes, risks, and next action.
- Stop/escalate: scope expansion, conflicting ownership, unapproved migration/database execution, unclear business policy, or any external validation blocker.

## Authorized scope

| Capability | Destination deltas |
| --- | --- |
| Dependencies | Only `maplibre-gl@^6.9.0`, `react-map-gl@^8.1.3`, and destination `package-lock.json` resolution |
| Geography | Recovered `20260910120000_contact_address_geography` migration, amended only for authorized `companyId` tenant isolation and deterministic legacy-address duplication per `ContactCompanyLink`, plus ContactAddress schema, API/service/validator/form/map-preview and focused tests |
| GPS/map | Exact `20260914093000_logistics_vehicle_gps_rest_v1` migration plus Vehicle schema, API/service/validator/map/selector/SVG route and focused tests |

## Guardrails

- Source remains read-only. No wholesale package/schema copy.
- Do not run migrations, DB writes, push, deploy, or use secrets/storage states.
- Preserve source migration content except the explicitly authorized `companyId` tenant-isolation amendment; exclude screenshots, logs, generated output, `node_modules`, and unrelated source changes.

## Validation

Run Prisma format/generate only, focused geography/map/selector/SVG tests, then typecheck and build. GGA runs on each staged commit.
