# Design — Cajas Maintenance Control DEV

Status: **IMPLEMENTED — DEV migration applied; final independent review PASS.**

## Approach

Add one mutable current-case projection plus immutable transition evidence (Cajas Option A). A case belongs to one `StockIdentifiedUnit`; nullable `articleId` identifies at most one company Article. Do not change `CajasUnitLogEntry`, Usos/CX derivation, `CajasConditionProjection`, availability, assignments, Stock or Cirugías.

## Persistence contract

Add mapped enums `CajasMaintenanceKind { REPAIR @map("repair"), PREVENTIVE_MAINTENANCE @map("preventive_maintenance") }` and `CajasMaintenanceStatus { OPEN @map("open"), SENT @map("sent"), RETURNED_PENDING_REVIEW @map("returned_pending_review"), CLOSED @map("closed"), CANCELLED @map("cancelled") }`.

`CajasMaintenanceCase` (`cajas_maintenance_case`): `id String @id @default(cuid())`, `companyId String`, `boxIdentifiedUnitId String`, `articleId String?`, `kind CajasMaintenanceKind`, `status CajasMaintenanceStatus`, `description String @db.Text`, `version Int`, `openedAt DateTime @db.Timestamptz(6)`, `openedById String`, `createdAt DateTime @default(now()) @db.Timestamptz(6)`, `updatedAt DateTime @updatedAt @db.Timestamptz(6)`.

`CajasMaintenanceTransition` (`cajas_maintenance_transition`): `id String @id @default(cuid())`, `companyId String`, `caseId String`, `sequence Int`, `fromStatus CajasMaintenanceStatus?`, `toStatus CajasMaintenanceStatus`, `note String? @db.Text`, `acceptedAt DateTime @db.Timestamptz(6)`, `acceptedById String`, `commandAcceptanceId String`, `auditEventId String`, `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Map every camelCase field to snake_case. `RESTRICT/CASCADE` FKs: `fk_cmc_company`; `fk_cmc_unit` `(companyId,boxIdentifiedUnitId)`→`StockIdentifiedUnit(companyId,id)`; optional `fk_cmc_article` `(companyId,articleId)`→eligibility; `fk_cmc_opened_by`; `fk_cmt_case` `(companyId,caseId)`→case; `fk_cmt_actor`; `fk_cmt_command`/`fk_cmt_audit` by `(companyId,id)`. Add required inverse relations only.

Uniques: `uq_cmc_company_id`, `uq_cmt_company_id`, `uq_cmt_case_sequence`, `uq_cmt_command`, `uq_cmt_audit`. Indexes: `ix_cmc_unit_status_updated`, `ix_cmt_case_time`. Checks `ck_cmc_version_description` and `ck_cmt_sequence_note_edge` enforce version/trim, sequence/trim, and only `NULL→OPEN`, `OPEN→SENT`, `SENT→RETURNED_PENDING_REVIEW`, `RETURNED_PENDING_REVIEW→CLOSED`, `OPEN→CANCELLED`. `trg_cmc_guard` rejects DELETE, identity/kind/article/opening changes, and invalid status/version steps; `trg_cmt_append_only` rejects UPDATE/DELETE. Deferred `ctrg_cmc_transition_consistency` and `ctrg_cmt_case_consistency` require case `(version,status)` to equal latest transition `(sequence,toStatus)`. No one-active-case uniqueness.

## Commands and API

Routes: `GET|POST /api/companies/{companyId}/cajas/units/{unitId}/maintenance`; `POST .../maintenance/{caseId}/transition`. GET uses `requireCompanyReadAccess`; POST uses unchanged `requireStockOperationAccess`. Query by trusted `ctx.companyId`; inaccessible/missing units/cases return uniform `404`.

Create `{kind,articleId?:string|null,description,idempotencyKey}`; transition `{toStatus,expectedVersion,note?:string,idempotencyKey}`. Strict Zod: IDs/key 1..200, description/note 1..4000, positive integer version. `{data:{replayed,case}}`: create `201`, replay/transition `200`. Case DTO has every case field, optional article `{id,sku,description}`, opening actor, and ordered transitions `{id,sequence,fromStatus,toStatus,note,acceptedAt,actor}`. GET returns `{data:{unit:{id,code},cases:[...]}}`, newest updated first.

Order: normalize/hash; replay lookup; transaction/replay; company-scoped Box and optional eligibility validation; transition locks case `FOR UPDATE`, then verifies unit path/version/edge; create AuditEvent and command acceptance (`domain=cajas`, checkpoint `maintenance-case-create|maintenance-case-transition`, scope unit/case); create case v1 then `NULL→OPEN`, or CAS-update status/version then append sequence `expectedVersion+1`; map. Unique races resolve replay, else `409`. Errors: `400 invalid_json_body|invalid_cajas_maintenance_body`; `403 company_mutation_access_denied`; `404 cajas_unit_not_found|cajas_maintenance_case_not_found|cajas_maintenance_article_not_found`; `409 idempotency_key_reused|cajas_maintenance_version_conflict|cajas_maintenance_transition_not_allowed|cajas_maintenance_conflict`.

## Read model and UI

`getOperationalIndex` adds active-case count and latest active `{id,kind,status,articleDescription,version,updatedAt}`; current counters remain. Index shows Mantenimiento, never condition. `OperationTab` loads evidence+maintenance; `PhysicalUnitDetail` has loading/error/empty history, create dialog (kind, optional expected-content Article, description), timeline, and legal actions: Send/Cancel, Mark returned, Close. `canPerformStockOperations(currentAccess.role)` disables actions with explanation; API remains authority. Keep one `crypto.randomUUID()` through retries; refetch on version conflict and after success. Remove live demo/test copy/controls. Production `cajas/presentacion/page.tsx` renders nothing and redirects to `/cajas`; DEV stays unchanged.

## Tests, migration, rollback, risks

Matrix: artifact/FKs/checks/triggers; create/replay/key reuse/company isolation/optional Article; every edge; stale/concurrent version; append-only/no-delete; audit/actor/server time; route guards/statuses; projection with unchanged Usos/CX/condition; UI permission, empty/loading/error, retry UUID, stale refetch, actions/a11y; production presentation hidden/DEV retained. Run focused Vitest, Prisma format/validate/generate, typecheck/lint, build, browser QA.

Create only `20260827010000_cajas_maintenance_control_v1`; prove sole pending, apply to disposable DEV, inspect invariants, smoke create/transition. Before use, rollback drops triggers/functions, tables, enums; after data, restore-only—no destructive reverse migration. Risk: client hiding is not HTTP 404; a server 404 requires extracting its client body to a newly locked file. Never change Article/Stock-owned code or semantics.
