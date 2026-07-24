# Cajas B01 D3 — Physical Prisma Schema Design Proposal

## 1. Purpose, status, and authorization boundary

| Item | Value |
| --- | --- |
| Status | **D3 PROPOSED — substantive review and Franco approval pending** |
| Date | 2026-07-21 |
| Task | `CAJAS-B01-D3-PHYSICAL-SCHEMA-DESIGN-001/P01-WRITER` |
| Review correction | Revises V07 DB/domain FAIL and preserves V08 governance PASS for reviewed blob `1ad8ec612a2c69f2ac214f09782a8865907fd551`; new independent review required |
| Selected direction | D1 Option A: normalized typed immutable evidence with transactional current projections |
| Input decision state | D2-01–D2-12 closed as recorded; D2-13 unresolved |
| Authorized write set | This file only |
| Implementation write set | `∅` |

This document recommends one physical Prisma mapping for the approved Cajas B01 logical design. It is precise enough to be reviewed before a separately authorized schema edit, but it is not a schema edit, migration, database operation, implementation plan, permission design, rollout, or APPLY authorization.

Creation or review of this proposal does **not** authorize edits to `prisma/schema.prisma`, migration artifacts, migration execution, database access, seed/backfill, Stock implementation, Auth or permission changes, Cirugías/Expediente changes, APIs, services, UI, cutover, production, or APPLY. D3 substantive approval, D4 schema editing, D5 migration authoring, migration execution, and implementation/APPLY are independent gates.

### 1.1 Source-of-truth precedence

Conflicts are resolved exactly in the `AGENTS.md` authority order:

1. `Contexto Maestro v8.2 saneado`;
2. current/accepted ADRs (`ADRs vigentes`);
3. `knowledge/KNOWLEDGE_INDEX.md`;
4. current `knowledge/core`, `knowledge/domain`, `knowledge/architecture`, and `knowledge/workflow` documents;
5. SDD/OpenSpec specifications, including D1, D2, and this subordinate D3 proposal;
6. worklog and handoffs;
7. Engram as operational memory; and
8. `knowledge/archive` as non-authoritative history.

The current read-only repository structure is compatibility evidence only and does not alter that precedence.

The current Prisma schema is not allowed to override approved product/domain decisions. Conversely, this proposal does not claim that a proposed constraint already exists in Prisma or in any database.

## 2. Frozen inputs, preflight, assumptions, and non-goals

### 2.1 Fresh preflight

The original writer preflight created this target from absence. Before this V07/V08 review-driven correction, the branch was still `master` at `4a25cf63a1dd8ddd2696f0d6601ad078cef5e37e`; `.git/index.lock` was absent; the target matched reviewed blob `1ad8ec612a2c69f2ac214f09782a8865907fd551`; the writer resumed exclusive ownership of this target only; the protected schema remained modified and read-only; and exactly eleven untracked migration directories remained foreign-owned and untouched. All 25 frozen hashes below and the four context hashes matched. Any later source, hash, branch, migration set, ownership, or target-overlap change requires a fresh preflight.

### 2.2 Frozen governing inventory

Hashes are Git working-tree blob IDs (`git hash-object`), not filesystem SHA-1 digests.

| Source | Blob |
| --- | --- |
| D2 logical proposal | `e4d355f333353c60af5678003b4716aa04176e91` |
| D1 persistence contract | `076220771a96959bfc4d2bb46864ffb704c34b28` |
| Cajas `PROPOSAL.md` | `6c4f5e238f0db1af2033b63772be3cfec4aa1fe2` |
| Cajas `SPEC.md` | `a1ba19cbb4d0d7a2ac9f49be4a9f03d038ca372a` |
| Cajas `DESIGN.md` | `01f1dad68dc7316690c04e96cecb7cfeab5496f7` |
| Cajas `TASKS.md` | `6118355d71e941fe665566e90c07a57421bdd446` |
| `DECISIONS-CD01-CD10.md` | `5fa640ebf8fee9bb01d138c52a0b483aab401e49` |
| Cajas Core Persistence ADR | `48258985953127836170550a000159e5641083b4` |
| Cajas Authorization ADR | `ca772cb8034a2e55be6e43855dd79a1e2ddfa651` |
| Cajas Operational Integrations ADR | `bee2397680d7ab1cf64fdf4b1edc85f2b63377b3` |
| Cajas Stock Transactions ADR | `4e0bab03137a51d8dede83ee2e68b8c3d6001bef` |
| Stock domain decisions | `926476e1d5e275768296329e099e32e04069224e` |
| Stock SDD proposal/spec/design/tasks | `37a55267e3342fcf74128b5a597ada4aa62cf74b` / `a45230fec13b359dd90d5e64ad358563419f150a` / `457d0eb2f7222b3c45aa3fb7752dc962d7344c03` / `d4810235020b429a338ca6a867469a3cbbca1699` |
| Stock Core Persistence ADR | `9ef0d9a7c1f667fdf71635ed9d4423aaa412a7a8` |
| Stock Effects/Reservations/Projections ADR | `0a0744999174f2f58f2cc5c33685b5a59e2ec55e` |
| Stock Authorization/Audit ADR | `82c30231d56293d5ee98bf27fe3758237d0bd495` |
| Stock Operational Integration/Adoption ADR | `8277cb1710de84fd000f3487e91b709ca8a28244` |
| `STOCK_CAJAS_TRAZABILIDAD.md` | `4fb54edcb118107e07f21b51bbf6b37b5ceddeff` |
| `DATA_MODEL_RULES.md` | `c63360274b4ab48fe3dc935a97093a8a1c5da5f5` |
| `MULTI_COMPANY_ACCESS.md` | `328a7efbd255ee6620e1fad7e9cd0f1527f66226` |
| `AUDIT_EVENT_POLICY.md` | `42b56f4eb2f5c1a4acbdf8de8b2730b013fac43d` |
| Read-only `prisma/schema.prisma` | `6678c6fb9751af53bcd005c5e28301457c7fbcdd` |

Context-only blobs read for this task were `AGENTS.md` `a4e92e81a806fe33b6f46ab3d35e290648884cf3`, `PROJECT_BRIEF.md` `e045b4e3846ed6a1b88fddbe6560114ecba927ab`, `CANONICAL_DECISIONS.md` `f8ec5dd8705435fd6c0bb7c770a263f90af0e728`, and `CURRENT_STATE.md` `25f9c85bcde02c1444e9ab6ebc35b0341441e4c5`.

### 2.3 Explicit assumptions

1. PostgreSQL remains the provider and Prisma remains the ORM; no provider change is proposed.
2. Existing IDs use `String @id @default(cuid())`; the proposed mapping preserves that convention.
3. Company, Surgery, User, Remito/RemitoItem, Devolucion/DevolucionItem, Consumo/ConsumoItem, and AuditEvent remain existing owners and are referenced rather than duplicated.
4. A small verified-reference adapter is necessary because the current schema has no authoritative Article or Stock models. It records identity linkage only; it is not an Article catalog, Stock ledger, balance, position, reservation, or movement implementation.
5. New authoritative Cajas evidence starts write-forward after a separately approved boundary. Existing soft references are not automatically promoted.
6. Prisma schema syntax cannot express every required PostgreSQL check or append-only rule. Those constraints are identified for a later D5 migration artifact; no SQL is authored here.

### 2.4 Non-goals

This proposal does not design full Stock V1, locations/warehouses, valuation, costing, purchasing, replenishment, billing, fiscal behavior, a general incident workflow, role/capability mappings, RLS, Auth, APIs, services, transaction APIs, lock/isolation primitives, archive schedules, environment rollout, or legacy backfill. It does not create a third public Cajas return-control result.

## 3. Recommended physical conventions

This proposal contains one recommendation, not alternatives.

### 3.1 Prisma and database naming

- Prisma models and fields use PascalCase/camelCase.
- Every new model uses the exact singular snake-case `@@map` table name printed beside its model heading in §5.
- Section 5.10 enumerates the physical column name for every scalar field, including every `id` column.
- Enum types use PascalCase in Prisma, lower snake-case database type names through `@@map`, and camelCase Prisma values mapped to lower snake-case database values where needed.
- Every primary key, non-PK unique/index, and FK has its literal mapped PostgreSQL name in §§6–7.1; D5-only checks/triggers have literal names and table assignments in §7.2. No physical identifier is derived downstream.

### 3.2 Scalar, timestamp, and quantity rules

- IDs and foreign keys: `String`; IDs default to `cuid()`.
- Business quantities: `Decimal @db.Decimal(18, 4)`. This is quantity precision, **not monetary precision**.
- There are no monetary or currency fields in the Cajas mapping. No financial consequence is inferred.
- Business instants: `DateTime @db.Timestamptz(6)`. Accepted instants have no default and must be supplied by the trusted acceptance boundary; technical `createdAt` defaults to `now()`.
- Expiration is date-only: `DateTime? @db.Date`; no timezone conversion may shift it.
- Immutable evidence has `createdAt` but no `updatedAt`. Mutable projections have `updatedAt @updatedAt` and an integer optimistic `version`.
- Human explanation fields use `String @db.Text` where unbounded; controlled codes remain `String` only when approved vocabulary is intentionally open.
- Supplemental traceability/correlation is `Json?` only where it cannot replace normalized company, Article-reference, Stock-scope-reference, source-document, quantity, or unit fields.

### 3.3 Referential actions

There is no global or inferred referential-action default. Section 6.3 enumerates `onDelete`, `onUpdate`, and FK map for each relation. No relation uses cascade deletion. Historical correction is append-only, not delete-and-recreate.

## 4. Proposed enums

The following are exactly the 14 Prisma enums recommended for D4. Open/extensible classifications such as difference kind, cause, and unit remain validated strings rather than prematurely rigid Prisma enums.

| Enum | Exact Prisma values | Database mapping |
| --- | --- | --- |
| `CajasStockScopeKind` | `fungiblePosition`, `lot`, `identifiedUnit` | `fungible_position`, `lot`, `identified_unit`; `@@map("cajas_stock_scope_kind")` |
| `CajasStockRecordKind` | `reservation`, `effect` | `reservation`, `effect`; `@@map("cajas_stock_record_kind")` |
| `CajasLineRole` | `expected`, `unexpected`, `substitution` | `expected`, `unexpected`, `substitution`; `@@map("cajas_line_role")` |
| `CajasControlKind` | `control`, `recontrol` | `control`, `recontrol`; `@@map("cajas_control_kind")` |
| `CajasControlResult` | `clean`, `withDifferences` | `clean`, `with_differences`; `@@map("cajas_control_result")` |
| `CajasChangeKind` | `add`, `remove`, `replace`, `quantity`, `traceability` | `add`, `remove`, `replace`, `quantity`, `traceability`; `@@map("cajas_change_kind")` |
| `CajasEvidenceRecordKind` | `original`, `correction`, `reversal`, `annulment` | `original`, `correction`, `reversal`, `annulment`; `@@map("cajas_evidence_record_kind")` |
| `CajasDispositionKind` | `returned`, `consumed`, `missing`, `damaged`, `underReview` | last value maps to `under_review`; `@@map("cajas_disposition_kind")` |
| `CajasReturnLineKind` | `unchanged`, `consumed`, `missing`, `damaged`, `added`, `replacement`, `underReview` | last value maps to `under_review`; `@@map("cajas_return_line_kind")` |
| `CajasCurrentCondition` | `available`, `withDifferences` | `available`, `with_differences`; `@@map("cajas_current_condition")` |
| `CajasCheckpoint` | `formulaVersion`, `assignment`, `preparationChange`, `control`, `recontrol`, `dispatch`, `returnConfirmation`, `consumptionConfirmation`, `differenceResolution`, `projectionRepair` | `formula_version`, `assignment`, `preparation_change`, `control`, `recontrol`, `dispatch`, `return_confirmation`, `consumption_confirmation`, `difference_resolution`, `projection_repair`; `@@map("cajas_checkpoint")` |
| `CajasAttemptOutcome` | `accepted`, `denied`, `validationFailed`, `conflict`, `failed`, `unknown` | `accepted`, `denied`, `validation_failed`, `conflict`, `failed`, `unknown`; `@@map("cajas_attempt_outcome")` |
| `CajasProjectionKind` | `preparation`, `dispatchAccounting`, `condition` | `preparation`, `dispatch_accounting`, `condition`; `@@map("cajas_projection_kind")` |
| `CajasReconciliationResult` | `match`, `mismatch` | `match`, `mismatch`; `@@map("cajas_reconciliation_result")` |

`available` and `withDifferences` are persistence terms for the approved public labels `Disponible` and `Con diferencias`; they do not form a complete lifecycle state machine. A nullable current condition means neither approved result currently applies.

## 5. Exact proposed model mapping

The mapping contains exactly 32 models. Field signatures below are exact Prisma scalar signatures. Section 5.10 enumerates every scalar field's physical column. Section 6 enumerates every relation and §6.3 gives every FK's actions and map. No D4 naming or action decision is implicit.

### 5.1 Verified external-reference adapter — minimal Stock contract

These three models are the entire Stock-facing persistence proposed here. They contain no balances, availability, custody logic, movement semantics, reservation lifecycle, Stock status, or Stock writer.

#### `CajasArticleReference` → `@@map("cajas_article_reference")`

`id String @id @default(cuid())`; `companyId String`; `sourceArticleId String`; `skuSnapshot String?`; `descriptionSnapshot String? @db.Text`; `unit String`; `verifiedAt DateTime @db.Timestamptz(6)`; `verifiedById String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, sourceArticleId])`; `@@index([companyId, skuSnapshot])`; `@@index([verifiedById, verifiedAt])`.

#### `CajasStockScopeReference` → `@@map("cajas_stock_scope_reference")`

`id String @id @default(cuid())`; `companyId String`; `articleReferenceId String`; `sourceStockScopeId String`; `kind CajasStockScopeKind`; `identifiedCodeSnapshot String?`; `serialNumberSnapshot String?`; `lotNumberSnapshot String?`; `expirationDateSnapshot DateTime? @db.Date`; `verifiedAt DateTime @db.Timestamptz(6)`; `verifiedById String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, sourceStockScopeId])`; `@@index([companyId, articleReferenceId, kind])`; `@@index([companyId, identifiedCodeSnapshot])`; `@@index([companyId, serialNumberSnapshot])`; `@@index([companyId, lotNumberSnapshot, expirationDateSnapshot])`.

#### `CajasStockRecordReference` → `@@map("cajas_stock_record_reference")`

`id String @id @default(cuid())`; `companyId String`; `kind CajasStockRecordKind`; `sourceStockRecordId String`; `sourceCheckpoint String`; `verifiedAt DateTime @db.Timestamptz(6)`; `verifiedById String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, kind, sourceStockRecordId])`; `@@index([companyId, sourceCheckpoint, createdAt])`; `@@index([verifiedById, verifiedAt])`.

### 5.2 Box formula and immutable versions

#### `CajasBoxFormula` → `@@map("cajas_box_formula")`

`id String @id @default(cuid())`; `companyId String`; `boxArticleReferenceId String`; `nextVersion Int @default(1)`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`; `updatedAt DateTime @updatedAt @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, boxArticleReferenceId])`; `@@index([companyId, updatedAt])`.

#### `CajasFormulaCurrent` → `@@map("cajas_formula_current")`

`id String @id @default(cuid())`; `companyId String`; `formulaId String`; `currentFormulaVersionId String`; `version Int @default(1)`; `updatedAt DateTime @updatedAt @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, formulaId])`; `@@unique([companyId, currentFormulaVersionId])`; `@@index([companyId, updatedAt])`.

This narrow mutable selector is catalog coordination, not accepted formula evidence and not one of the three D2-03 Cajas operation projections. A formula save atomically inserts an immutable version and lines, then compare-and-advances this selector. Prior `CajasFormulaVersion` rows are never updated.

#### `CajasFormulaVersion` → `@@map("cajas_formula_version")`

`id String @id @default(cuid())`; `companyId String`; `formulaId String`; `versionNumber Int`; `previousVersionId String?`; `acceptedAt DateTime @db.Timestamptz(6)`; `acceptedById String`; `cause String? @db.Text`; `commandAcceptanceId String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([formulaId, versionNumber])`; `@@unique([companyId, commandAcceptanceId])`; `@@index([companyId, acceptedAt])`; `@@index([previousVersionId])`.

`CajasFormulaCurrent.currentFormulaVersionId` is the exclusive current version for future starts. It is mutable projection state with optimistic `version`; the accepted version and its lines remain append-only. A preparation binds the pointed version once and never follows later pointer changes.

#### `CajasFormulaLine` → `@@map("cajas_formula_line")`

`id String @id @default(cuid())`; `companyId String`; `formulaVersionId String`; `lineNumber Int`; `articleReferenceId String`; `expectedQuantity Decimal @db.Decimal(18, 4)`; `unit String`; `skuSnapshot String?`; `descriptionSnapshot String? @db.Text`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([formulaVersionId, lineNumber])`; `@@index([formulaVersionId, articleReferenceId])`; `@@index([companyId, articleReferenceId])`.

### 5.3 Assignment and narrow current preparation projection

#### `CajasAssignment` → `@@map("cajas_assignment")`

`id String @id @default(cuid())`; `companyId String`; `surgeryId String`; `boxStockScopeReferenceId String`; `activeSlot Int? @default(1)`; `assignedAt DateTime @db.Timestamptz(6)`; `assignedById String`; `endedAt DateTime? @db.Timestamptz(6)`; `endedById String?`; `endCause String? @db.Text`; `assignmentCommandAcceptanceId String`; `endCommandAcceptanceId String?`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, boxStockScopeReferenceId, activeSlot])`; `@@unique([companyId, assignmentCommandAcceptanceId])`; `@@unique([companyId, endCommandAcceptanceId])`; `@@index([companyId, surgeryId, activeSlot])`; `@@index([companyId, assignedAt])`.

`activeSlot = 1` means active and becomes `NULL` on end. Ending is one accepted command that atomically writes `endedAt`, `endedById`, `endCause`, and `endCommandAcceptanceId`; the start attribution remains unchanged. A D5 check must require all four end fields null while active and all four non-null when ended. The referenced scope kind must be `identifiedUnit` through trusted transactional validation.

#### `CajasPreparation` → `@@map("cajas_preparation")`

`id String @id @default(cuid())`; `companyId String`; `assignmentId String`; `formulaVersionId String`; `version Int @default(1)`; `latestControlId String?`; `requiresRecontrol Boolean @default(false)`; `lastAcceptedChangeId String?`; `evidenceWatermark String?`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`; `updatedAt DateTime @updatedAt @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, assignmentId])`; `@@unique([companyId, latestControlId])`; `@@unique([companyId, lastAcceptedChangeId])`; `@@index([companyId, assignmentId])`; `@@index([companyId, requiresRecontrol, updatedAt])`; `@@index([formulaVersionId])`.

#### `CajasPreparationLine` → `@@map("cajas_preparation_line")`

`id String @id @default(cuid())`; `companyId String`; `preparationId String`; `lineKey String`; `expectedFormulaLineId String?`; `role CajasLineRole`; `articleReferenceId String`; `stockScopeReferenceId String?`; `quantity Decimal @db.Decimal(18, 4)`; `unit String`; `lotNumberSnapshot String?`; `serialNumberSnapshot String?`; `expirationDateSnapshot DateTime? @db.Date`; `traceabilitySnapshot Json?`; `differenceAcknowledged Boolean @default(false)`; `dispatchedQuantity Decimal @default(0) @db.Decimal(18, 4)`; `version Int @default(1)`; `isActive Boolean @default(true)`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`; `updatedAt DateTime @updatedAt @db.Timestamptz(6)`.

Keys/indexes: `@@unique([preparationId, lineKey])`; `@@index([companyId, preparationId, isActive])`; `@@index([companyId, stockScopeReferenceId])`; `@@index([expectedFormulaLineId])`.

#### `CajasReservationCorrelation` → `@@map("cajas_reservation_correlation")`

`id String @id @default(cuid())`; `companyId String`; `assignmentId String`; `preparationLineId String?`; `stockScopeReferenceId String`; `stockReservationReferenceId String`; `sourceCheckpoint String`; `semanticKey String`; `quantity Decimal? @db.Decimal(18, 4)`; `unit String?`; `replacesCorrelationId String?`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, semanticKey])`; `@@index([companyId, sourceCheckpoint, stockScopeReferenceId])`; `@@index([companyId, assignmentId, createdAt])`; `@@index([preparationLineId])`; `@@index([stockReservationReferenceId])`; `@@index([replacesCorrelationId])`.

This is correlation only. `CajasStockRecordReference.kind` must equal `reservation`; Stock remains owner of commitment truth.

### 5.4 Immutable control, change, difference, and resolution evidence

#### `CajasControl` → `@@map("cajas_control")`

`id String @id @default(cuid())`; `companyId String`; `assignmentId String`; `formulaVersionId String`; `kind CajasControlKind`; `sequence Int`; `sourcePreparationVersion Int`; `result CajasControlResult`; `priorControlId String?`; `acknowledgementSummary String? @db.Text`; `acceptedAt DateTime @db.Timestamptz(6)`; `acceptedById String`; `cause String? @db.Text`; `commandAcceptanceId String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([assignmentId, sequence])`; `@@unique([companyId, commandAcceptanceId])`; `@@index([companyId, assignmentId, acceptedAt])`; `@@index([priorControlId])`; `@@index([companyId, result, acceptedAt])`.

#### `CajasControlLine` → `@@map("cajas_control_line")`

`id String @id @default(cuid())`; `companyId String`; `controlId String`; `lineNumber Int`; `sourcePreparationLineId String`; `expectedFormulaLineId String?`; `role CajasLineRole`; `articleReferenceId String`; `stockScopeReferenceId String?`; `quantity Decimal @db.Decimal(18, 4)`; `unit String`; `skuSnapshot String?`; `descriptionSnapshot String? @db.Text`; `lotNumberSnapshot String?`; `serialNumberSnapshot String?`; `expirationDateSnapshot DateTime? @db.Date`; `traceabilitySnapshot Json?`; `differenceAcknowledged Boolean @default(false)`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([controlId, lineNumber])`; `@@index([companyId, articleReferenceId])`; `@@index([stockScopeReferenceId])`; `@@index([sourcePreparationLineId])`.

#### `CajasCompositionChange` → `@@map("cajas_composition_change")`

`id String @id @default(cuid())`; `companyId String`; `assignmentId String`; `priorPreparationVersion Int`; `resultingPreparationVersion Int`; `acceptedAt DateTime @db.Timestamptz(6)`; `acceptedById String`; `cause String? @db.Text`; `commandAcceptanceId String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([assignmentId, resultingPreparationVersion])`; `@@unique([companyId, commandAcceptanceId])`; `@@index([companyId, assignmentId, acceptedAt])`.

#### `CajasCompositionChangeLine` → `@@map("cajas_composition_change_line")`

`id String @id @default(cuid())`; `companyId String`; `changeId String`; `lineNumber Int`; `kind CajasChangeKind`; `priorPreparationLineId String?`; `resultingPreparationLineId String?`; `priorArticleReferenceId String?`; `resultingArticleReferenceId String?`; `priorStockScopeReferenceId String?`; `resultingStockScopeReferenceId String?`; `priorQuantity Decimal? @db.Decimal(18, 4)`; `resultingQuantity Decimal? @db.Decimal(18, 4)`; `unit String`; `priorTraceabilitySnapshot Json?`; `resultingTraceabilitySnapshot Json?`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([changeId, lineNumber])`; `@@index([companyId, changeId])`; `@@index([priorPreparationLineId])`; `@@index([resultingPreparationLineId])`.

#### `CajasDifference` → `@@map("cajas_difference")`

`id String @id @default(cuid())`; `companyId String`; `assignmentId String`; `controlLineId String?`; `dispatchLineId String?`; `returnLineId String?`; `kind String`; `observedFacts String @db.Text`; `openedAt DateTime @db.Timestamptz(6)`; `openedById String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@index([companyId, assignmentId, openedAt])`; `@@index([controlLineId])`; `@@index([dispatchLineId])`; `@@index([returnLineId])`.

A D5 check must require exactly one origin FK. There is deliberately no mutable `status`, `ownerId`, `role`, or `capability`: open/closed interpretation is derived from appended resolutions.

#### `CajasDifferenceResolution` → `@@map("cajas_difference_resolution")`

`id String @id @default(cuid())`; `companyId String`; `differenceId String`; `sequence Int`; `closesDifference Boolean`; `explanation String @db.Text`; `supportingReference String?`; `acceptedAt DateTime @db.Timestamptz(6)`; `acceptedById String`; `cause String? @db.Text`; `commandAcceptanceId String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([differenceId, sequence])`; `@@unique([companyId, commandAcceptanceId])`; `@@index([companyId, differenceId, acceptedAt])`; `@@index([acceptedById, acceptedAt])`.

This model records neutral evidence only. It does not encode who is allowed or organizationally responsible to resolve a difference.

### 5.5 Immutable dispatch and shared pending accounting

#### `CajasDispatch` → `@@map("cajas_dispatch")`

`id String @id @default(cuid())`; `companyId String`; `assignmentId String`; `remitoId String`; `sourceControlId String`; `sequence Int`; `recordKind CajasEvidenceRecordKind @default(original)`; `correctsDispatchId String?`; `acceptedAt DateTime @db.Timestamptz(6)`; `acceptedById String`; `cause String? @db.Text`; `commandAcceptanceId String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([assignmentId, sequence])`; `@@unique([companyId, commandAcceptanceId])`; `@@index([companyId, remitoId, recordKind])`; `@@index([companyId, assignmentId, acceptedAt])`; `@@index([sourceControlId])`; `@@index([correctsDispatchId])`.

One Remito may own multiple original Cajas dispatches when approved operation multiplicity requires them. No Remito-scoped original-slot uniqueness is imposed. Distinct identity remains `CajasDispatch.id`; order within one assignment remains `@@unique([assignmentId, sequence])`; correction/annulment rows must target one prior dispatch through `correctsDispatchId`.

#### `CajasDispatchLine` → `@@map("cajas_dispatch_line")`

`id String @id @default(cuid())`; `companyId String`; `dispatchId String`; `remitoId String`; `lineNumber Int`; `recordKind CajasEvidenceRecordKind @default(original)`; `accountingSign Int @default(1)`; `neutralizesDispatchLineId String?`; `remitoItemId String`; `sourceControlLineId String`; `sourcePreparationLineId String`; `articleReferenceId String`; `stockScopeReferenceId String?`; `quantity Decimal @db.Decimal(18, 4)`; `unit String`; `skuSnapshot String?`; `descriptionSnapshot String @db.Text`; `lotNumberSnapshot String?`; `serialNumberSnapshot String?`; `expirationDateSnapshot DateTime? @db.Date`; `traceabilitySnapshot Json?`; `stockEffectReferenceId String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([dispatchId, lineNumber])`; `@@unique([dispatchId, remitoItemId, sourceControlLineId])`; `@@unique([companyId, neutralizesDispatchLineId])`; `@@index([companyId, remitoId, remitoItemId])`; `@@index([companyId, sourceControlLineId])`; `@@index([sourcePreparationLineId])`; `@@index([stockScopeReferenceId])`; `@@index([stockEffectReferenceId])`.

`CajasStockRecordReference.kind` must equal `effect`. Original and corrected positive lines use `accountingSign = 1` and no neutralization target. A correction/annulment appends a reversal line with `recordKind = reversal`, `accountingSign = -1`, and `neutralizesDispatchLineId` pointing to one prior positive line; the target can be neutralized once. The reversal copies target dispatch scope, Article/Stock scope, quantity, unit, traceability, control/preparation source, and Remito item and carries its own reversal Stock effect. A quantity correction atomically appends the reversal plus a new positive correction line. Authoritative dispatched scope is `SUM(accountingSign × quantity)` over the original/correction/reversal chain; it may never be negative or exceed controlled/reserved scope. Pending-accounting projection updates and Stock effects occur in the same accepted command. Prior lines remain immutable.

`remitoId` is immutable lineage evidence copied from the owning dispatch. The dispatch-line relation and Remito-item relation both include it: a line cannot satisfy both FKs unless its `RemitoItem` belongs to the exact `Remito` owned by its `CajasDispatch`.

#### `CajasDispatchAccounting` → `@@map("cajas_dispatch_accounting")`

`id String @id @default(cuid())`; `companyId String`; `dispatchId String`; `version Int @default(1)`; `evidenceWatermark String`; `reconciledAt DateTime? @db.Timestamptz(6)`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`; `updatedAt DateTime @updatedAt @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, dispatchId])`; `@@index([companyId, updatedAt])`; `@@index([companyId, evidenceWatermark])`.

#### `CajasDispatchLineAccounting` → `@@map("cajas_dispatch_line_accounting")`

`id String @id @default(cuid())`; `companyId String`; `accountingId String`; `dispatchLineId String`; `dispatchedQuantity Decimal @db.Decimal(18, 4)`; `disposedQuantity Decimal @default(0) @db.Decimal(18, 4)`; `pendingQuantity Decimal @db.Decimal(18, 4)`; `unit String`; `version Int @default(1)`; `updatedAt DateTime @updatedAt @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, dispatchLineId])`; `@@unique([accountingId, dispatchLineId])`; `@@index([companyId, accountingId, pendingQuantity])`.

D5 checks must enforce all quantities non-negative and `dispatchedQuantity = disposedQuantity + pendingQuantity`.

#### `CajasDisposition` → `@@map("cajas_disposition")`

`id String @id @default(cuid())`; `companyId String`; `dispatchLineId String`; `sliceKey String`; `recordKind CajasEvidenceRecordKind @default(original)`; `accountingSign Int @default(1)`; `kind CajasDispositionKind`; `quantity Decimal @db.Decimal(18, 4)`; `unit String`; `stockScopeReferenceId String?`; `returnConfirmationId String?`; `consumptionConfirmationId String?`; `returnLineId String?`; `consumptionLineId String?`; `neutralizesDispositionId String?`; `stockEffectReferenceId String`; `acceptedAt DateTime @db.Timestamptz(6)`; `commandAcceptanceId String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, dispatchLineId, sliceKey])`; `@@unique([companyId, neutralizesDispositionId])`; `@@index([companyId, dispatchLineId, acceptedAt])`; `@@index([returnConfirmationId])`; `@@index([consumptionConfirmationId])`; `@@index([returnLineId])`; `@@index([consumptionLineId])`; `@@index([stockEffectReferenceId])`; `@@index([commandAcceptanceId])`.

Every disposition, including a reversal, has exactly one owning Return or Consumption confirmation **and exactly one owning line from that same confirmation**. Original and corrected positive evidence use `accountingSign = 1` and do not set `neutralizesDispositionId`. A reversal uses `recordKind = reversal`, `accountingSign = -1`, keeps its correction/annulment owning line, and references exactly one prior positive disposition through `neutralizesDispositionId`; the unique FK allows each positive fact to be neutralized at most once. The reversal must copy the target's dispatch line, disposition kind, quantity, unit, and Stock scope and must link a separately accepted reversal Stock effect and command. The target linkage is separate from, and never substitutes for, owning-line linkage.

The authoritative fold is `netDisposed = SUM(accountingSign × quantity)` and `pending = dispatchedQuantity - netDisposed`. A correction is one atomic command that appends (a) one reversal row neutralizing the prior positive row and (b) one new positive row with `recordKind = correction`, a new semantic `sliceKey`, and the corrected owning line/effect. An annulment appends only the reversal when the still-reversible scope permits it. The original and all corrective rows remain immutable; a reversal cannot make net disposed negative, exceed the target, or contradict later accepted evidence. These structures make correction possible but do not authorize a correction business action.

### 5.6 Separate immutable Return evidence

#### `CajasReturnConfirmation` → `@@map("cajas_return_confirmation")`

`id String @id @default(cuid())`; `companyId String`; `dispatchId String`; `remitoId String`; `devolucionId String`; `sequence Int`; `recordKind CajasEvidenceRecordKind @default(original)`; `originalSlot Int? @default(1)`; `correctsConfirmationId String?`; `observedAccountingVersion Int`; `result CajasControlResult`; `note String? @db.Text`; `acceptedAt DateTime @db.Timestamptz(6)`; `acceptedById String`; `cause String? @db.Text`; `commandAcceptanceId String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([dispatchId, devolucionId, sequence])`; `@@unique([companyId, devolucionId, dispatchId, originalSlot])`; `@@unique([companyId, commandAcceptanceId])`; `@@index([companyId, dispatchId, acceptedAt])`; `@@index([devolucionId])`; `@@index([correctsConfirmationId])`.

Each original Cajas Return confirmation references exactly one owning `Devolucion` and exactly one dispatch. One `Devolucion` may decompose cross-dispatch input into at most one original confirmation per dispatch; it cannot collapse those dispatch boundaries or create two originals for the same source+dispatch. Later corrections/annulments set `originalSlot = NULL` and link the prior confirmation.

`remitoId` is immutable lineage evidence shared by the dispatch and Devolucion composite FKs. Therefore a confirmation cannot join a dispatch and Devolucion from different Remitos while remaining same-company.

#### `CajasReturnLine` → `@@map("cajas_return_line")`

`id String @id @default(cuid())`; `companyId String`; `returnConfirmationId String`; `devolucionId String`; `dispatchId String`; `lineNumber Int`; `devolucionItemId String`; `dispatchLineId String?`; `kind CajasReturnLineKind`; `articleReferenceId String`; `stockScopeReferenceId String?`; `quantity Decimal @db.Decimal(18, 4)`; `unit String`; `skuSnapshot String?`; `descriptionSnapshot String? @db.Text`; `lotNumberSnapshot String?`; `serialNumberSnapshot String?`; `expirationDateSnapshot DateTime? @db.Date`; `traceabilitySnapshot Json?`; `humanValidated Boolean`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([returnConfirmationId, lineNumber])`; `@@index([companyId, dispatchId, dispatchLineId])`; `@@index([companyId, devolucionId, devolucionItemId])`; `@@index([stockScopeReferenceId])`.

`dispatchLineId` is required for every line that consumes dispatched pending scope and is nullable only for `added` or the received side of `replacement`; a D5 check enforces that distinction.

`devolucionId` and `dispatchId` are immutable copies from the owning confirmation. Composite FKs bind the line to that exact confirmation and Devolucion item; when `dispatchLineId` is present, it must identify a line from that exact dispatch. Replacement-pair lineage carries the same confirmation and dispatch identifiers, so its original dispatched side cannot escape the Return boundary.

#### `CajasReplacementPair` → `@@map("cajas_replacement_pair")`

`id String @id @default(cuid())`; `companyId String`; `returnConfirmationId String`; `dispatchId String`; `returnLineId String`; `originalDispatchLineId String`; `receivedArticleReferenceId String`; `receivedStockScopeReferenceId String?`; `explanation String? @db.Text`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, returnConfirmationId, dispatchId, returnLineId])`; `@@index([companyId, returnConfirmationId, dispatchId, returnLineId])`; `@@index([companyId, dispatchId, originalDispatchLineId])`; `@@index([receivedStockScopeReferenceId])`.

This relation is evidence-only and custody-neutral. It creates no implicit Stock effect.

### 5.7 Separate immutable Consumption evidence

#### `CajasConsumptionConfirmation` → `@@map("cajas_consumption_confirmation")`

`id String @id @default(cuid())`; `companyId String`; `dispatchId String`; `remitoId String`; `consumoId String`; `sequence Int`; `recordKind CajasEvidenceRecordKind @default(original)`; `originalSlot Int? @default(1)`; `correctsConfirmationId String?`; `observedAccountingVersion Int`; `acceptedAt DateTime @db.Timestamptz(6)`; `acceptedById String`; `cause String? @db.Text`; `commandAcceptanceId String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([dispatchId, consumoId, sequence])`; `@@unique([companyId, consumoId, dispatchId, originalSlot])`; `@@unique([companyId, commandAcceptanceId])`; `@@index([companyId, dispatchId, acceptedAt])`; `@@index([consumoId])`; `@@index([correctsConfirmationId])`.

Each original Cajas Consumption confirmation references exactly one owning `Consumo` and exactly one dispatch. One `Consumo` may decompose cross-dispatch input into at most one original confirmation per dispatch; it cannot collapse those dispatch boundaries or create two originals for the same source+dispatch. Later corrections/annulments set `originalSlot = NULL` and link the prior confirmation.

`remitoId` is immutable lineage evidence shared by the dispatch and Consumo composite FKs. Therefore a confirmation cannot join a dispatch and Consumo from different Remitos while remaining same-company.

#### `CajasConsumptionLine` → `@@map("cajas_consumption_line")`

`id String @id @default(cuid())`; `companyId String`; `consumptionConfirmationId String`; `consumoId String`; `dispatchId String`; `lineNumber Int`; `consumoItemId String`; `dispatchLineId String`; `articleReferenceId String`; `stockScopeReferenceId String?`; `quantity Decimal @db.Decimal(18, 4)`; `unit String`; `lotNumberSnapshot String?`; `serialNumberSnapshot String?`; `expirationDateSnapshot DateTime? @db.Date`; `traceabilitySnapshot Json?`; `recognizedReturnDispositionId String?`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([consumptionConfirmationId, lineNumber])`; `@@unique([companyId, dispatchLineId, recognizedReturnDispositionId])`; `@@index([companyId, dispatchId, dispatchLineId])`; `@@index([companyId, consumoId, consumoItemId])`; `@@index([stockScopeReferenceId])`.

If a Return already created the consumed disposition, `recognizedReturnDispositionId` points to it and this line creates no second disposition or Stock effect.

`consumoId` and `dispatchId` are immutable copies from the owning confirmation. Composite FKs bind the line to that exact confirmation, Consumo item, and dispatch line. The recognized Return disposition FK also includes `dispatchLineId`, so recognition cannot cross dispatched scope.

### 5.8 Narrow current condition/eligibility projection

#### `CajasConditionProjection` → `@@map("cajas_condition_projection")`

`id String @id @default(cuid())`; `companyId String`; `boxStockScopeReferenceId String`; `assignmentId String?`; `version Int @default(1)`; `condition CajasCurrentCondition?`; `openDifferenceCount Int @default(0)`; `pendingDispatchScopeCount Int @default(0)`; `requiresRecontrol Boolean @default(false)`; `operationEndedAt DateTime? @db.Timestamptz(6)`; `dispatchEligible Boolean @default(false)`; `reuseEligible Boolean @default(false)`; `eligibilityReasons Json`; `evidenceWatermark String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`; `updatedAt DateTime @updatedAt @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, boxStockScopeReferenceId])`; `@@unique([companyId, assignmentId])`; `@@index([companyId, condition])`; `@@index([companyId, dispatchEligible])`; `@@index([companyId, reuseEligible])`; `@@index([companyId, evidenceWatermark])`.

This is not Stock availability. A clean validated Return under `RETURN-07` may establish `available` directly when no difference or other approved checkpoint blocks it. If the current condition is `withDifferences`, closing resolutions alone does not establish `available`: a subsequent clean explicit re-control is mandatory. Reuse then requires the operation ended, pending scope zero, no open differences, and current condition `available`; it does not require an extra re-control after an already clean direct Return.

### 5.9 Hierarchical semantic idempotency, attempts, audit, and reconciliation

#### `CajasCommandAcceptance` → `@@map("cajas_command_acceptance")`

`id String @id @default(cuid())`; `companyId String`; `sourceOperationId String`; `checkpoint CajasCheckpoint`; `semanticKey String`; `intentHash String`; `acceptedAt DateTime @db.Timestamptz(6)`; `acceptedById String`; `resultEntityType String`; `resultEntityId String`; `auditEventId String`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, sourceOperationId, checkpoint, semanticKey])`; `@@unique([companyId, auditEventId])`; `@@index([companyId, acceptedAt])`; `@@index([resultEntityType, resultEntityId])`; `@@index([intentHash])`.

The row is permanent for the lifetime of immutable evidence. Reuse with a different `intentHash` conflicts; identical intent resolves to the original result.

#### `CajasCommandEffect` → `@@map("cajas_command_effect")`

`id String @id @default(cuid())`; `companyId String`; `commandAcceptanceId String`; `effectKey String`; `effectType String`; `resultEntityType String`; `resultEntityId String`; `stockRecordReferenceId String?`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([commandAcceptanceId, effectKey])`; `@@index([companyId, effectType, createdAt])`; `@@index([stockRecordReferenceId])`; `@@index([resultEntityType, resultEntityId])`.

#### `CajasCommandAttempt` → `@@map("cajas_command_attempt")`

`id String @id @default(cuid())`; `companyId String`; `commandAcceptanceId String?`; `transportCorrelationId String`; `intentHash String`; `outcome CajasAttemptOutcome`; `attemptedAt DateTime @db.Timestamptz(6)`; `actorId String`; `auditEventId String?`; `detail String? @db.Text`; `expiresAt DateTime? @db.Timestamptz(6)`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@unique([companyId, transportCorrelationId])`; `@@index([companyId, intentHash, attemptedAt])`; `@@index([commandAcceptanceId, attemptedAt])`; `@@index([companyId, auditEventId, attemptedAt])`; `@@index([expiresAt])`.

Attempt details may be archived/removed under a later retention decision; semantic acceptance remains permanent. Any number of accepted retry/replay attempts may reference the same `CajasCommandAcceptance` and the same success `AuditEvent`; no uniqueness exists on attempt `commandAcceptanceId` or `auditEventId`. Every `outcome = accepted` attempt requires exactly one non-null command and audit, and the audit must equal the linked command's audit. Every persisted `outcome = denied` attempt has null command, requires one denial audit, and creates no domain success evidence. Other non-accepted outcomes have null command and may carry audit only when policy requires. `ck_ccat_outcome_shape` enforces nullability; `trg_cajas_attempt_audit_guard` enforces company and accepted command/audit equality before commit.

#### `CajasProjectionReconciliation` → `@@map("cajas_projection_reconciliation")`

`id String @id @default(cuid())`; `companyId String`; `projectionKind CajasProjectionKind`; `scopeId String`; `observedVersion Int`; `evidenceWatermark String`; `result CajasReconciliationResult`; `comparedAt DateTime @db.Timestamptz(6)`; `comparedById String?`; `detail String? @db.Text`; `repairCommandAcceptanceId String?`; `createdAt DateTime @default(now()) @db.Timestamptz(6)`.

Keys/indexes: `@@index([companyId, projectionKind, scopeId, comparedAt])`; `@@index([companyId, result, comparedAt])`; `@@index([repairCommandAcceptanceId])`.

This records comparison evidence only. A mismatch does not mutate evidence or authorize repair.

### 5.10 Exhaustive scalar-field physical-column manifest

The scalar signatures in §§5.1–5.9 and this manifest are jointly normative: each scalar below has the exact Prisma type/nullability/default/ID/unique participation printed in its model signature and the exact physical column printed here. In this compact manifest, `field→column` mandates appending the literal Prisma annotation `@map("column")` to that field's complete signature, including `id→id` as `@map("id")`. No field uses an implicit column-name decision.

| Model / physical table | Exact `Prisma field → physical column` inventory |
| --- | --- |
| `CajasArticleReference` / `cajas_article_reference` | `id→id`; `companyId→company_id`; `sourceArticleId→source_article_id`; `skuSnapshot→sku_snapshot`; `descriptionSnapshot→description_snapshot`; `unit→unit`; `verifiedAt→verified_at`; `verifiedById→verified_by_id`; `createdAt→created_at` |
| `CajasStockScopeReference` / `cajas_stock_scope_reference` | `id→id`; `companyId→company_id`; `articleReferenceId→article_reference_id`; `sourceStockScopeId→source_stock_scope_id`; `kind→kind`; `identifiedCodeSnapshot→identified_code_snapshot`; `serialNumberSnapshot→serial_number_snapshot`; `lotNumberSnapshot→lot_number_snapshot`; `expirationDateSnapshot→expiration_date_snapshot`; `verifiedAt→verified_at`; `verifiedById→verified_by_id`; `createdAt→created_at` |
| `CajasStockRecordReference` / `cajas_stock_record_reference` | `id→id`; `companyId→company_id`; `kind→kind`; `sourceStockRecordId→source_stock_record_id`; `sourceCheckpoint→source_checkpoint`; `verifiedAt→verified_at`; `verifiedById→verified_by_id`; `createdAt→created_at` |
| `CajasBoxFormula` / `cajas_box_formula` | `id→id`; `companyId→company_id`; `boxArticleReferenceId→box_article_reference_id`; `nextVersion→next_version`; `createdAt→created_at`; `updatedAt→updated_at` |
| `CajasFormulaCurrent` / `cajas_formula_current` | `id→id`; `companyId→company_id`; `formulaId→formula_id`; `currentFormulaVersionId→current_formula_version_id`; `version→version`; `updatedAt→updated_at` |
| `CajasFormulaVersion` / `cajas_formula_version` | `id→id`; `companyId→company_id`; `formulaId→formula_id`; `versionNumber→version_number`; `previousVersionId→previous_version_id`; `acceptedAt→accepted_at`; `acceptedById→accepted_by_id`; `cause→cause`; `commandAcceptanceId→command_acceptance_id`; `createdAt→created_at` |
| `CajasFormulaLine` / `cajas_formula_line` | `id→id`; `companyId→company_id`; `formulaVersionId→formula_version_id`; `lineNumber→line_number`; `articleReferenceId→article_reference_id`; `expectedQuantity→expected_quantity`; `unit→unit`; `skuSnapshot→sku_snapshot`; `descriptionSnapshot→description_snapshot`; `createdAt→created_at` |
| `CajasAssignment` / `cajas_assignment` | `id→id`; `companyId→company_id`; `surgeryId→surgery_id`; `boxStockScopeReferenceId→box_stock_scope_reference_id`; `activeSlot→active_slot`; `assignedAt→assigned_at`; `assignedById→assigned_by_id`; `endedAt→ended_at`; `endedById→ended_by_id`; `endCause→end_cause`; `assignmentCommandAcceptanceId→assignment_command_acceptance_id`; `endCommandAcceptanceId→end_command_acceptance_id`; `createdAt→created_at` |
| `CajasPreparation` / `cajas_preparation` | `id→id`; `companyId→company_id`; `assignmentId→assignment_id`; `formulaVersionId→formula_version_id`; `version→version`; `latestControlId→latest_control_id`; `requiresRecontrol→requires_recontrol`; `lastAcceptedChangeId→last_accepted_change_id`; `evidenceWatermark→evidence_watermark`; `createdAt→created_at`; `updatedAt→updated_at` |
| `CajasPreparationLine` / `cajas_preparation_line` | `id→id`; `companyId→company_id`; `preparationId→preparation_id`; `lineKey→line_key`; `expectedFormulaLineId→expected_formula_line_id`; `role→role`; `articleReferenceId→article_reference_id`; `stockScopeReferenceId→stock_scope_reference_id`; `quantity→quantity`; `unit→unit`; `lotNumberSnapshot→lot_number_snapshot`; `serialNumberSnapshot→serial_number_snapshot`; `expirationDateSnapshot→expiration_date_snapshot`; `traceabilitySnapshot→traceability_snapshot`; `differenceAcknowledged→difference_acknowledged`; `dispatchedQuantity→dispatched_quantity`; `version→version`; `isActive→is_active`; `createdAt→created_at`; `updatedAt→updated_at` |
| `CajasReservationCorrelation` / `cajas_reservation_correlation` | `id→id`; `companyId→company_id`; `assignmentId→assignment_id`; `preparationLineId→preparation_line_id`; `stockScopeReferenceId→stock_scope_reference_id`; `stockReservationReferenceId→stock_reservation_reference_id`; `sourceCheckpoint→source_checkpoint`; `semanticKey→semantic_key`; `quantity→quantity`; `unit→unit`; `replacesCorrelationId→replaces_correlation_id`; `createdAt→created_at` |
| `CajasControl` / `cajas_control` | `id→id`; `companyId→company_id`; `assignmentId→assignment_id`; `formulaVersionId→formula_version_id`; `kind→kind`; `sequence→sequence`; `sourcePreparationVersion→source_preparation_version`; `result→result`; `priorControlId→prior_control_id`; `acknowledgementSummary→acknowledgement_summary`; `acceptedAt→accepted_at`; `acceptedById→accepted_by_id`; `cause→cause`; `commandAcceptanceId→command_acceptance_id`; `createdAt→created_at` |
| `CajasControlLine` / `cajas_control_line` | `id→id`; `companyId→company_id`; `controlId→control_id`; `lineNumber→line_number`; `sourcePreparationLineId→source_preparation_line_id`; `expectedFormulaLineId→expected_formula_line_id`; `role→role`; `articleReferenceId→article_reference_id`; `stockScopeReferenceId→stock_scope_reference_id`; `quantity→quantity`; `unit→unit`; `skuSnapshot→sku_snapshot`; `descriptionSnapshot→description_snapshot`; `lotNumberSnapshot→lot_number_snapshot`; `serialNumberSnapshot→serial_number_snapshot`; `expirationDateSnapshot→expiration_date_snapshot`; `traceabilitySnapshot→traceability_snapshot`; `differenceAcknowledged→difference_acknowledged`; `createdAt→created_at` |
| `CajasCompositionChange` / `cajas_composition_change` | `id→id`; `companyId→company_id`; `assignmentId→assignment_id`; `priorPreparationVersion→prior_preparation_version`; `resultingPreparationVersion→resulting_preparation_version`; `acceptedAt→accepted_at`; `acceptedById→accepted_by_id`; `cause→cause`; `commandAcceptanceId→command_acceptance_id`; `createdAt→created_at` |
| `CajasCompositionChangeLine` / `cajas_composition_change_line` | `id→id`; `companyId→company_id`; `changeId→change_id`; `lineNumber→line_number`; `kind→kind`; `priorPreparationLineId→prior_preparation_line_id`; `resultingPreparationLineId→resulting_preparation_line_id`; `priorArticleReferenceId→prior_article_reference_id`; `resultingArticleReferenceId→resulting_article_reference_id`; `priorStockScopeReferenceId→prior_stock_scope_reference_id`; `resultingStockScopeReferenceId→resulting_stock_scope_reference_id`; `priorQuantity→prior_quantity`; `resultingQuantity→resulting_quantity`; `unit→unit`; `priorTraceabilitySnapshot→prior_traceability_snapshot`; `resultingTraceabilitySnapshot→resulting_traceability_snapshot`; `createdAt→created_at` |
| `CajasDifference` / `cajas_difference` | `id→id`; `companyId→company_id`; `assignmentId→assignment_id`; `controlLineId→control_line_id`; `dispatchLineId→dispatch_line_id`; `returnLineId→return_line_id`; `kind→kind`; `observedFacts→observed_facts`; `openedAt→opened_at`; `openedById→opened_by_id`; `createdAt→created_at` |
| `CajasDifferenceResolution` / `cajas_difference_resolution` | `id→id`; `companyId→company_id`; `differenceId→difference_id`; `sequence→sequence`; `closesDifference→closes_difference`; `explanation→explanation`; `supportingReference→supporting_reference`; `acceptedAt→accepted_at`; `acceptedById→accepted_by_id`; `cause→cause`; `commandAcceptanceId→command_acceptance_id`; `createdAt→created_at` |
| `CajasDispatch` / `cajas_dispatch` | `id→id`; `companyId→company_id`; `assignmentId→assignment_id`; `remitoId→remito_id`; `sourceControlId→source_control_id`; `sequence→sequence`; `recordKind→record_kind`; `correctsDispatchId→corrects_dispatch_id`; `acceptedAt→accepted_at`; `acceptedById→accepted_by_id`; `cause→cause`; `commandAcceptanceId→command_acceptance_id`; `createdAt→created_at` |
| `CajasDispatchLine` / `cajas_dispatch_line` | `id→id`; `companyId→company_id`; `dispatchId→dispatch_id`; `remitoId→remito_id`; `lineNumber→line_number`; `recordKind→record_kind`; `accountingSign→accounting_sign`; `neutralizesDispatchLineId→neutralizes_dispatch_line_id`; `remitoItemId→remito_item_id`; `sourceControlLineId→source_control_line_id`; `sourcePreparationLineId→source_preparation_line_id`; `articleReferenceId→article_reference_id`; `stockScopeReferenceId→stock_scope_reference_id`; `quantity→quantity`; `unit→unit`; `skuSnapshot→sku_snapshot`; `descriptionSnapshot→description_snapshot`; `lotNumberSnapshot→lot_number_snapshot`; `serialNumberSnapshot→serial_number_snapshot`; `expirationDateSnapshot→expiration_date_snapshot`; `traceabilitySnapshot→traceability_snapshot`; `stockEffectReferenceId→stock_effect_reference_id`; `createdAt→created_at` |
| `CajasDispatchAccounting` / `cajas_dispatch_accounting` | `id→id`; `companyId→company_id`; `dispatchId→dispatch_id`; `version→version`; `evidenceWatermark→evidence_watermark`; `reconciledAt→reconciled_at`; `createdAt→created_at`; `updatedAt→updated_at` |
| `CajasDispatchLineAccounting` / `cajas_dispatch_line_accounting` | `id→id`; `companyId→company_id`; `accountingId→accounting_id`; `dispatchLineId→dispatch_line_id`; `dispatchedQuantity→dispatched_quantity`; `disposedQuantity→disposed_quantity`; `pendingQuantity→pending_quantity`; `unit→unit`; `version→version`; `updatedAt→updated_at` |
| `CajasDisposition` / `cajas_disposition` | `id→id`; `companyId→company_id`; `dispatchLineId→dispatch_line_id`; `sliceKey→slice_key`; `recordKind→record_kind`; `accountingSign→accounting_sign`; `kind→kind`; `quantity→quantity`; `unit→unit`; `stockScopeReferenceId→stock_scope_reference_id`; `returnConfirmationId→return_confirmation_id`; `consumptionConfirmationId→consumption_confirmation_id`; `returnLineId→return_line_id`; `consumptionLineId→consumption_line_id`; `neutralizesDispositionId→neutralizes_disposition_id`; `stockEffectReferenceId→stock_effect_reference_id`; `acceptedAt→accepted_at`; `commandAcceptanceId→command_acceptance_id`; `createdAt→created_at` |
| `CajasReturnConfirmation` / `cajas_return_confirmation` | `id→id`; `companyId→company_id`; `dispatchId→dispatch_id`; `remitoId→remito_id`; `devolucionId→devolucion_id`; `sequence→sequence`; `recordKind→record_kind`; `originalSlot→original_slot`; `correctsConfirmationId→corrects_confirmation_id`; `observedAccountingVersion→observed_accounting_version`; `result→result`; `note→note`; `acceptedAt→accepted_at`; `acceptedById→accepted_by_id`; `cause→cause`; `commandAcceptanceId→command_acceptance_id`; `createdAt→created_at` |
| `CajasReturnLine` / `cajas_return_line` | `id→id`; `companyId→company_id`; `returnConfirmationId→return_confirmation_id`; `devolucionId→devolucion_id`; `dispatchId→dispatch_id`; `lineNumber→line_number`; `devolucionItemId→devolucion_item_id`; `dispatchLineId→dispatch_line_id`; `kind→kind`; `articleReferenceId→article_reference_id`; `stockScopeReferenceId→stock_scope_reference_id`; `quantity→quantity`; `unit→unit`; `skuSnapshot→sku_snapshot`; `descriptionSnapshot→description_snapshot`; `lotNumberSnapshot→lot_number_snapshot`; `serialNumberSnapshot→serial_number_snapshot`; `expirationDateSnapshot→expiration_date_snapshot`; `traceabilitySnapshot→traceability_snapshot`; `humanValidated→human_validated`; `createdAt→created_at` |
| `CajasReplacementPair` / `cajas_replacement_pair` | `id→id`; `companyId→company_id`; `returnConfirmationId→return_confirmation_id`; `dispatchId→dispatch_id`; `returnLineId→return_line_id`; `originalDispatchLineId→original_dispatch_line_id`; `receivedArticleReferenceId→received_article_reference_id`; `receivedStockScopeReferenceId→received_stock_scope_reference_id`; `explanation→explanation`; `createdAt→created_at` |
| `CajasConsumptionConfirmation` / `cajas_consumption_confirmation` | `id→id`; `companyId→company_id`; `dispatchId→dispatch_id`; `remitoId→remito_id`; `consumoId→consumo_id`; `sequence→sequence`; `recordKind→record_kind`; `originalSlot→original_slot`; `correctsConfirmationId→corrects_confirmation_id`; `observedAccountingVersion→observed_accounting_version`; `acceptedAt→accepted_at`; `acceptedById→accepted_by_id`; `cause→cause`; `commandAcceptanceId→command_acceptance_id`; `createdAt→created_at` |
| `CajasConsumptionLine` / `cajas_consumption_line` | `id→id`; `companyId→company_id`; `consumptionConfirmationId→consumption_confirmation_id`; `consumoId→consumo_id`; `dispatchId→dispatch_id`; `lineNumber→line_number`; `consumoItemId→consumo_item_id`; `dispatchLineId→dispatch_line_id`; `articleReferenceId→article_reference_id`; `stockScopeReferenceId→stock_scope_reference_id`; `quantity→quantity`; `unit→unit`; `lotNumberSnapshot→lot_number_snapshot`; `serialNumberSnapshot→serial_number_snapshot`; `expirationDateSnapshot→expiration_date_snapshot`; `traceabilitySnapshot→traceability_snapshot`; `recognizedReturnDispositionId→recognized_return_disposition_id`; `createdAt→created_at` |
| `CajasConditionProjection` / `cajas_condition_projection` | `id→id`; `companyId→company_id`; `boxStockScopeReferenceId→box_stock_scope_reference_id`; `assignmentId→assignment_id`; `version→version`; `condition→condition`; `openDifferenceCount→open_difference_count`; `pendingDispatchScopeCount→pending_dispatch_scope_count`; `requiresRecontrol→requires_recontrol`; `operationEndedAt→operation_ended_at`; `dispatchEligible→dispatch_eligible`; `reuseEligible→reuse_eligible`; `eligibilityReasons→eligibility_reasons`; `evidenceWatermark→evidence_watermark`; `createdAt→created_at`; `updatedAt→updated_at` |
| `CajasCommandAcceptance` / `cajas_command_acceptance` | `id→id`; `companyId→company_id`; `sourceOperationId→source_operation_id`; `checkpoint→checkpoint`; `semanticKey→semantic_key`; `intentHash→intent_hash`; `acceptedAt→accepted_at`; `acceptedById→accepted_by_id`; `resultEntityType→result_entity_type`; `resultEntityId→result_entity_id`; `auditEventId→audit_event_id`; `createdAt→created_at` |
| `CajasCommandEffect` / `cajas_command_effect` | `id→id`; `companyId→company_id`; `commandAcceptanceId→command_acceptance_id`; `effectKey→effect_key`; `effectType→effect_type`; `resultEntityType→result_entity_type`; `resultEntityId→result_entity_id`; `stockRecordReferenceId→stock_record_reference_id`; `createdAt→created_at` |
| `CajasCommandAttempt` / `cajas_command_attempt` | `id→id`; `companyId→company_id`; `commandAcceptanceId→command_acceptance_id`; `transportCorrelationId→transport_correlation_id`; `intentHash→intent_hash`; `outcome→outcome`; `attemptedAt→attempted_at`; `actorId→actor_id`; `auditEventId→audit_event_id`; `detail→detail`; `expiresAt→expires_at`; `createdAt→created_at` |
| `CajasProjectionReconciliation` / `cajas_projection_reconciliation` | `id→id`; `companyId→company_id`; `projectionKind→projection_kind`; `scopeId→scope_id`; `observedVersion→observed_version`; `evidenceWatermark→evidence_watermark`; `result→result`; `comparedAt→compared_at`; `comparedById→compared_by_id`; `detail→detail`; `repairCommandAcceptanceId→repair_command_acceptance_id`; `createdAt→created_at` |

## 6. Exact relation map and relation names

All tenant-owned Cajas targets expose `@@unique([companyId, id])` using the exact mapped names in §7.1. Internal and source-domain relations use composite `[companyId, foreignId] → [companyId, id]`; a simple `id` FK is not claimed to enforce tenant equality. Relations to global `User` use `id` and remain subject to company-membership policy. Relations to `Company` use `companyId → id`.

Every singular Prisma inverse backed by a relation with composite `fields` requires uniqueness over the complete defining `fields` tuple; scalar-only uniqueness on one member of that tuple is not a valid representation of the approved singular cardinality.

Each entry below is complete: `childRelation(fields → references; inverse; relation name; FK map)`.

- **`CajasArticleReference`** — `company([companyId] → Company[id]; Company.cajasArticleReferences; CajasCompanyArticleReferences; fk_car_company)`; `verifiedBy([verifiedById] → User[id]; User.verifiedCajasArticleReferences; CajasArticleReferenceVerifiedBy; fk_car_verified_by)`.
- **`CajasStockScopeReference`** — `company([companyId] → Company[id]; Company.cajasStockScopeReferences; CajasCompanyStockScopeReferences; fk_cssr_company)`; `articleReference([companyId, articleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.stockScopeReferences; CajasStockScopeArticle; fk_cssr_article)`; `verifiedBy([verifiedById] → User[id]; User.verifiedCajasStockScopeReferences; CajasStockScopeVerifiedBy; fk_cssr_verified_by)`.
- **`CajasStockRecordReference`** — `company([companyId] → Company[id]; Company.cajasStockRecordReferences; CajasCompanyStockRecordReferences; fk_csrr_company)`; `verifiedBy([verifiedById] → User[id]; User.verifiedCajasStockRecordReferences; CajasStockRecordVerifiedBy; fk_csrr_verified_by)`.
- **`CajasBoxFormula`** — `company([companyId] → Company[id]; Company.cajasBoxFormulas; CajasCompanyBoxFormulas; fk_cbf_company)`; `boxArticleReference([companyId, boxArticleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.boxFormulas; CajasFormulaBoxArticle; fk_cbf_article)`.
- **`CajasFormulaCurrent`** — `company([companyId] → Company[id]; Company.cajasFormulaCurrents; CajasCompanyFormulaCurrents; fk_cfc_company)`; `formula([companyId, formulaId] → CajasBoxFormula[companyId, id]; CajasBoxFormula.currentSelector; CajasFormulaCurrentFormula; fk_cfc_formula)`; `currentFormulaVersion([companyId, currentFormulaVersionId] → CajasFormulaVersion[companyId, id]; CajasFormulaVersion.currentSelector; CajasFormulaCurrentVersion; fk_cfc_version)`.
- **`CajasFormulaVersion`** — `company([companyId] → Company[id]; Company.cajasFormulaVersions; CajasCompanyFormulaVersions; fk_cfv_company)`; `formula([companyId, formulaId] → CajasBoxFormula[companyId, id]; CajasBoxFormula.versions; CajasFormulaVersions; fk_cfv_formula)`; `previousVersion([companyId, previousVersionId] → CajasFormulaVersion[companyId, id]; CajasFormulaVersion.nextVersions; CajasFormulaVersionChain; fk_cfv_previous)`; `acceptedBy([acceptedById] → User[id]; User.acceptedCajasFormulaVersions; CajasFormulaVersionAcceptedBy; fk_cfv_accepted_by)`; `commandAcceptance([companyId, commandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.formulaVersionResult; CajasCommandFormulaVersion; fk_cfv_command)`.
- **`CajasFormulaLine`** — `company([companyId] → Company[id]; Company.cajasFormulaLines; CajasCompanyFormulaLines; fk_cfl_company)`; `formulaVersion([companyId, formulaVersionId] → CajasFormulaVersion[companyId, id]; CajasFormulaVersion.lines; CajasFormulaVersionLines; fk_cfl_version)`; `articleReference([companyId, articleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.formulaLines; CajasFormulaLineArticle; fk_cfl_article)`.
- **`CajasAssignment`** — `company([companyId] → Company[id]; Company.cajasAssignments; CajasCompanyAssignments; fk_ca_company)`; `surgery([companyId, surgeryId] → Surgery[companyId, id]; Surgery.cajasAssignments; CajasSurgeryAssignments; fk_ca_surgery)`; `boxStockScopeReference([companyId, boxStockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.boxAssignments; CajasBoxAssignments; fk_ca_box_scope)`; `assignedBy([assignedById] → User[id]; User.startedCajasAssignments; CajasAssignmentStartedBy; fk_ca_assigned_by)`; `endedBy([endedById] → User[id]; User.endedCajasAssignments; CajasAssignmentEndedBy; fk_ca_ended_by)`; `assignmentCommandAcceptance([companyId, assignmentCommandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.assignmentStartResult; CajasCommandAssignmentStart; fk_ca_start_command)`; `endCommandAcceptance([companyId, endCommandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.assignmentEndResult; CajasCommandAssignmentEnd; fk_ca_end_command)`.
- **`CajasPreparation`** — `company([companyId] → Company[id]; Company.cajasPreparations; CajasCompanyPreparations; fk_cp_company)`; `assignment([companyId, assignmentId] → CajasAssignment[companyId, id]; CajasAssignment.preparation; CajasAssignmentPreparation; fk_cp_assignment)`; `formulaVersion([companyId, formulaVersionId] → CajasFormulaVersion[companyId, id]; CajasFormulaVersion.preparations; CajasPreparationFormulaVersion; fk_cp_formula_version)`; `latestControl([companyId, latestControlId] → CajasControl[companyId, id]; CajasControl.latestForPreparation; CajasPreparationLatestControl; fk_cp_latest_control)`; `lastAcceptedChange([companyId, lastAcceptedChangeId] → CajasCompositionChange[companyId, id]; CajasCompositionChange.latestForPreparation; CajasPreparationLastChange; fk_cp_last_change)`.
- **`CajasPreparationLine`** — `company([companyId] → Company[id]; Company.cajasPreparationLines; CajasCompanyPreparationLines; fk_cpl_company)`; `preparation([companyId, preparationId] → CajasPreparation[companyId, id]; CajasPreparation.lines; CajasPreparationLines; fk_cpl_preparation)`; `expectedFormulaLine([companyId, expectedFormulaLineId] → CajasFormulaLine[companyId, id]; CajasFormulaLine.preparationLines; CajasPreparationExpectedLine; fk_cpl_expected_line)`; `articleReference([companyId, articleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.preparationLines; CajasPreparationLineArticle; fk_cpl_article)`; `stockScopeReference([companyId, stockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.preparationLines; CajasPreparationLineStockScope; fk_cpl_stock_scope)`.
- **`CajasReservationCorrelation`** — `company([companyId] → Company[id]; Company.cajasReservationCorrelations; CajasCompanyReservationCorrelations; fk_crc_company)`; `assignment([companyId, assignmentId] → CajasAssignment[companyId, id]; CajasAssignment.reservationCorrelations; CajasAssignmentReservations; fk_crc_assignment)`; `preparationLine([companyId, preparationLineId] → CajasPreparationLine[companyId, id]; CajasPreparationLine.reservationCorrelations; CajasPreparationLineReservation; fk_crc_prep_line)`; `stockScopeReference([companyId, stockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.reservationCorrelations; CajasReservationStockScope; fk_crc_stock_scope)`; `stockReservationReference([companyId, stockReservationReferenceId] → CajasStockRecordReference[companyId, id]; CajasStockRecordReference.reservationCorrelations; CajasReservationStockRecord; fk_crc_stock_record)`; `replacesCorrelation([companyId, replacesCorrelationId] → CajasReservationCorrelation[companyId, id]; CajasReservationCorrelation.followingCorrelations; CajasReservationChain; fk_crc_replaces)`.
- **`CajasControl`** — `company([companyId] → Company[id]; Company.cajasControls; CajasCompanyControls; fk_cc_company)`; `assignment([companyId, assignmentId] → CajasAssignment[companyId, id]; CajasAssignment.controls; CajasAssignmentControls; fk_cc_assignment)`; `formulaVersion([companyId, formulaVersionId] → CajasFormulaVersion[companyId, id]; CajasFormulaVersion.controls; CajasControlFormulaVersion; fk_cc_formula_version)`; `priorControl([companyId, priorControlId] → CajasControl[companyId, id]; CajasControl.followingControls; CajasControlChain; fk_cc_prior)`; `acceptedBy([acceptedById] → User[id]; User.acceptedCajasControls; CajasControlAcceptedBy; fk_cc_accepted_by)`; `commandAcceptance([companyId, commandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.controlResult; CajasCommandControl; fk_cc_command)`.
- **`CajasControlLine`** — `company([companyId] → Company[id]; Company.cajasControlLines; CajasCompanyControlLines; fk_ccl_company)`; `control([companyId, controlId] → CajasControl[companyId, id]; CajasControl.lines; CajasControlLines; fk_ccl_control)`; `sourcePreparationLine([companyId, sourcePreparationLineId] → CajasPreparationLine[companyId, id]; CajasPreparationLine.controlLines; CajasControlSourceLine; fk_ccl_source_line)`; `expectedFormulaLine([companyId, expectedFormulaLineId] → CajasFormulaLine[companyId, id]; CajasFormulaLine.controlLines; CajasControlExpectedLine; fk_ccl_expected_line)`; `articleReference([companyId, articleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.controlLines; CajasControlLineArticle; fk_ccl_article)`; `stockScopeReference([companyId, stockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.controlLines; CajasControlLineStockScope; fk_ccl_stock_scope)`.
- **`CajasCompositionChange`** — `company([companyId] → Company[id]; Company.cajasCompositionChanges; CajasCompanyCompositionChanges; fk_cchg_company)`; `assignment([companyId, assignmentId] → CajasAssignment[companyId, id]; CajasAssignment.compositionChanges; CajasAssignmentChanges; fk_cchg_assignment)`; `acceptedBy([acceptedById] → User[id]; User.acceptedCajasCompositionChanges; CajasCompositionChangeAcceptedBy; fk_cchg_accepted_by)`; `commandAcceptance([companyId, commandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.compositionChangeResult; CajasCommandCompositionChange; fk_cchg_command)`.
- **`CajasCompositionChangeLine`** — `company([companyId] → Company[id]; Company.cajasCompositionChangeLines; CajasCompanyCompositionChangeLines; fk_cchl_company)`; `change([companyId, changeId] → CajasCompositionChange[companyId, id]; CajasCompositionChange.lines; CajasCompositionChangeLines; fk_cchl_change)`; `priorPreparationLine([companyId, priorPreparationLineId] → CajasPreparationLine[companyId, id]; CajasPreparationLine.priorChangeLines; CajasChangePriorPreparationLine; fk_cchl_prior_line)`; `resultingPreparationLine([companyId, resultingPreparationLineId] → CajasPreparationLine[companyId, id]; CajasPreparationLine.resultingChangeLines; CajasChangeResultPreparationLine; fk_cchl_result_line)`; `priorArticleReference([companyId, priorArticleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.priorChangeLines; CajasChangePriorArticle; fk_cchl_prior_article)`; `resultingArticleReference([companyId, resultingArticleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.resultingChangeLines; CajasChangeResultArticle; fk_cchl_result_article)`; `priorStockScopeReference([companyId, priorStockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.priorChangeLines; CajasChangePriorStockScope; fk_cchl_prior_scope)`; `resultingStockScopeReference([companyId, resultingStockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.resultingChangeLines; CajasChangeResultStockScope; fk_cchl_result_scope)`.
- **`CajasDifference`** — `company([companyId] → Company[id]; Company.cajasDifferences; CajasCompanyDifferences; fk_cd_company)`; `assignment([companyId, assignmentId] → CajasAssignment[companyId, id]; CajasAssignment.differences; CajasAssignmentDifferences; fk_cd_assignment)`; `controlLine([companyId, controlLineId] → CajasControlLine[companyId, id]; CajasControlLine.differences; CajasDifferenceControlOrigin; fk_cd_control_line)`; `dispatchLine([companyId, dispatchLineId] → CajasDispatchLine[companyId, id]; CajasDispatchLine.differences; CajasDifferenceDispatchOrigin; fk_cd_dispatch_line)`; `returnLine([companyId, returnLineId] → CajasReturnLine[companyId, id]; CajasReturnLine.differences; CajasDifferenceReturnOrigin; fk_cd_return_line)`; `openedBy([openedById] → User[id]; User.openedCajasDifferences; CajasDifferenceOpenedBy; fk_cd_opened_by)`.
- **`CajasDifferenceResolution`** — `company([companyId] → Company[id]; Company.cajasDifferenceResolutions; CajasCompanyDifferenceResolutions; fk_cdr_company)`; `difference([companyId, differenceId] → CajasDifference[companyId, id]; CajasDifference.resolutions; CajasDifferenceResolutions; fk_cdr_difference)`; `acceptedBy([acceptedById] → User[id]; User.acceptedCajasDifferenceResolutions; CajasDifferenceResolutionAcceptedBy; fk_cdr_accepted_by)`; `commandAcceptance([companyId, commandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.differenceResolutionResult; CajasCommandDifferenceResolution; fk_cdr_command)`.
- **`CajasDispatch`** — `company([companyId] → Company[id]; Company.cajasDispatches; CajasCompanyDispatches; fk_cdp_company)`; `assignment([companyId, assignmentId] → CajasAssignment[companyId, id]; CajasAssignment.dispatches; CajasAssignmentDispatches; fk_cdp_assignment)`; `remito([companyId, remitoId] → Remito[companyId, id]; Remito.cajasDispatches; CajasDispatchRemito; fk_cdp_remito)`; `sourceControl([companyId, sourceControlId] → CajasControl[companyId, id]; CajasControl.dispatches; CajasDispatchSourceControl; fk_cdp_control)`; `correctsDispatch([companyId, correctsDispatchId, remitoId] → CajasDispatch[companyId, id, remitoId]; CajasDispatch.corrections; CajasDispatchCorrectionChain; fk_cdp_corrects)`; `acceptedBy([acceptedById] → User[id]; User.acceptedCajasDispatches; CajasDispatchAcceptedBy; fk_cdp_accepted_by)`; `commandAcceptance([companyId, commandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.dispatchResult; CajasCommandDispatch; fk_cdp_command)`.
- **`CajasDispatchLine`** — `company([companyId] → Company[id]; Company.cajasDispatchLines; CajasCompanyDispatchLines; fk_cdl_company)`; `dispatch([companyId, dispatchId, remitoId] → CajasDispatch[companyId, id, remitoId]; CajasDispatch.lines; CajasDispatchLines; fk_cdl_dispatch)`; `neutralizesDispatchLine([companyId, neutralizesDispatchLineId] → CajasDispatchLine[companyId, id]; CajasDispatchLine.neutralizedBy; CajasDispatchLineNeutralization; fk_cdl_neutralizes)`; `remitoItem([companyId, remitoId, remitoItemId] → RemitoItem[companyId, remitoId, id]; RemitoItem.cajasDispatchLines; CajasDispatchLineRemitoItem; fk_cdl_remito_item)`; `sourceControlLine([companyId, sourceControlLineId] → CajasControlLine[companyId, id]; CajasControlLine.dispatchLines; CajasDispatchLineControl; fk_cdl_control_line)`; `sourcePreparationLine([companyId, sourcePreparationLineId] → CajasPreparationLine[companyId, id]; CajasPreparationLine.dispatchLines; CajasDispatchLinePreparation; fk_cdl_prep_line)`; `articleReference([companyId, articleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.dispatchLines; CajasDispatchLineArticle; fk_cdl_article)`; `stockScopeReference([companyId, stockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.dispatchLines; CajasDispatchLineStockScope; fk_cdl_stock_scope)`; `stockEffectReference([companyId, stockEffectReferenceId] → CajasStockRecordReference[companyId, id]; CajasStockRecordReference.dispatchLines; CajasDispatchLineStockEffect; fk_cdl_stock_effect)`.
- **`CajasDispatchAccounting`** — `company([companyId] → Company[id]; Company.cajasDispatchAccountings; CajasCompanyDispatchAccountings; fk_cda_company)`; `dispatch([companyId, dispatchId] → CajasDispatch[companyId, id]; CajasDispatch.accounting; CajasDispatchAccounting; fk_cda_dispatch)`.
- **`CajasDispatchLineAccounting`** — `company([companyId] → Company[id]; Company.cajasDispatchLineAccountings; CajasCompanyDispatchLineAccountings; fk_cdla_company)`; `accounting([companyId, accountingId] → CajasDispatchAccounting[companyId, id]; CajasDispatchAccounting.lines; CajasAccountingLines; fk_cdla_accounting)`; `dispatchLine([companyId, dispatchLineId] → CajasDispatchLine[companyId, id]; CajasDispatchLine.accounting; CajasDispatchLineAccounting; fk_cdla_dispatch_line)`.
- **`CajasDisposition`** — `company([companyId] → Company[id]; Company.cajasDispositions; CajasCompanyDispositions; fk_cdis_company)`; `dispatchLine([companyId, dispatchLineId] → CajasDispatchLine[companyId, id]; CajasDispatchLine.dispositions; CajasDispositionDispatchLine; fk_cdis_dispatch_line)`; `stockScopeReference([companyId, stockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.dispositions; CajasDispositionStockScope; fk_cdis_stock_scope)`; `returnConfirmation([companyId, returnConfirmationId] → CajasReturnConfirmation[companyId, id]; CajasReturnConfirmation.dispositions; CajasDispositionReturnConfirmation; fk_cdis_return_confirmation)`; `consumptionConfirmation([companyId, consumptionConfirmationId] → CajasConsumptionConfirmation[companyId, id]; CajasConsumptionConfirmation.dispositions; CajasDispositionConsumptionConfirmation; fk_cdis_consumption_confirmation)`; `returnLine([companyId, returnLineId] → CajasReturnLine[companyId, id]; CajasReturnLine.dispositions; CajasDispositionReturnLine; fk_cdis_return_line)`; `consumptionLine([companyId, consumptionLineId] → CajasConsumptionLine[companyId, id]; CajasConsumptionLine.dispositions; CajasDispositionConsumptionLine; fk_cdis_consumption_line)`; `neutralizesDisposition([companyId, neutralizesDispositionId] → CajasDisposition[companyId, id]; CajasDisposition.neutralizedBy; CajasDispositionNeutralization; fk_cdis_neutralizes)`; `stockEffectReference([companyId, stockEffectReferenceId] → CajasStockRecordReference[companyId, id]; CajasStockRecordReference.dispositions; CajasDispositionStockEffect; fk_cdis_stock_effect)`; `commandAcceptance([companyId, commandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.dispositions; CajasCommandDispositions; fk_cdis_command)`.
- **`CajasReturnConfirmation`** — `company([companyId] → Company[id]; Company.cajasReturnConfirmations; CajasCompanyReturnConfirmations; fk_crcfn_company)`; `dispatch([companyId, dispatchId, remitoId] → CajasDispatch[companyId, id, remitoId]; CajasDispatch.returnConfirmations; CajasDispatchReturns; fk_crcfn_dispatch)`; `devolucion([companyId, devolucionId, remitoId] → Devolucion[companyId, id, remitoId]; Devolucion.cajasReturnConfirmations; CajasReturnDevolucion; fk_crcfn_devolucion)`; `correctsConfirmation([companyId, correctsConfirmationId, devolucionId, dispatchId] → CajasReturnConfirmation[companyId, id, devolucionId, dispatchId]; CajasReturnConfirmation.corrections; CajasReturnCorrectionChain; fk_crcfn_corrects)`; `acceptedBy([acceptedById] → User[id]; User.acceptedCajasReturnConfirmations; CajasReturnConfirmationAcceptedBy; fk_crcfn_accepted_by)`; `commandAcceptance([companyId, commandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.returnConfirmationResult; CajasCommandReturnConfirmation; fk_crcfn_command)`.
- **`CajasReturnLine`** — `company([companyId] → Company[id]; Company.cajasReturnLines; CajasCompanyReturnLines; fk_crl_company)`; `returnConfirmation([companyId, returnConfirmationId, devolucionId, dispatchId] → CajasReturnConfirmation[companyId, id, devolucionId, dispatchId]; CajasReturnConfirmation.lines; CajasReturnLines; fk_crl_confirmation)`; `devolucionItem([companyId, devolucionId, devolucionItemId] → DevolucionItem[companyId, devolucionId, id]; DevolucionItem.cajasReturnLines; CajasReturnLineDevolucionItem; fk_crl_devolucion_item)`; `dispatchLine([companyId, dispatchId, dispatchLineId] → CajasDispatchLine[companyId, dispatchId, id]; CajasDispatchLine.returnLines; CajasReturnLineDispatchLine; fk_crl_dispatch_line)`; `articleReference([companyId, articleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.returnLines; CajasReturnLineArticle; fk_crl_article)`; `stockScopeReference([companyId, stockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.returnLines; CajasReturnLineStockScope; fk_crl_stock_scope)`.
- **`CajasReplacementPair`** — `company([companyId] → Company[id]; Company.cajasReplacementPairs; CajasCompanyReplacementPairs; fk_crp_company)`; `returnLine([companyId, returnConfirmationId, dispatchId, returnLineId] → CajasReturnLine[companyId, returnConfirmationId, dispatchId, id]; CajasReturnLine.replacementPair; CajasReplacementReturnLine; fk_crp_return_line)`; `originalDispatchLine([companyId, dispatchId, originalDispatchLineId] → CajasDispatchLine[companyId, dispatchId, id]; CajasDispatchLine.replacementPairs; CajasReplacementOriginalDispatch; fk_crp_original_line)`; `receivedArticleReference([companyId, receivedArticleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.receivedReplacementPairs; CajasReplacementReceivedArticle; fk_crp_received_article)`; `receivedStockScopeReference([companyId, receivedStockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.receivedReplacementPairs; CajasReplacementReceivedScope; fk_crp_received_scope)`.
- **`CajasConsumptionConfirmation`** — `company([companyId] → Company[id]; Company.cajasConsumptionConfirmations; CajasCompanyConsumptionConfirmations; fk_ccc_company)`; `dispatch([companyId, dispatchId, remitoId] → CajasDispatch[companyId, id, remitoId]; CajasDispatch.consumptionConfirmations; CajasDispatchConsumptions; fk_ccc_dispatch)`; `consumo([companyId, consumoId, remitoId] → Consumo[companyId, id, remitoId]; Consumo.cajasConsumptionConfirmations; CajasConsumptionConsumo; fk_ccc_consumo)`; `correctsConfirmation([companyId, correctsConfirmationId, consumoId, dispatchId] → CajasConsumptionConfirmation[companyId, id, consumoId, dispatchId]; CajasConsumptionConfirmation.corrections; CajasConsumptionCorrectionChain; fk_ccc_corrects)`; `acceptedBy([acceptedById] → User[id]; User.acceptedCajasConsumptionConfirmations; CajasConsumptionConfirmationAcceptedBy; fk_ccc_accepted_by)`; `commandAcceptance([companyId, commandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.consumptionConfirmationResult; CajasCommandConsumptionConfirmation; fk_ccc_command)`.
- **`CajasConsumptionLine`** — `company([companyId] → Company[id]; Company.cajasConsumptionLines; CajasCompanyConsumptionLines; fk_ccln_company)`; `consumptionConfirmation([companyId, consumptionConfirmationId, consumoId, dispatchId] → CajasConsumptionConfirmation[companyId, id, consumoId, dispatchId]; CajasConsumptionConfirmation.lines; CajasConsumptionLines; fk_ccln_confirmation)`; `consumoItem([companyId, consumoId, consumoItemId] → ConsumoItem[companyId, consumoId, id]; ConsumoItem.cajasConsumptionLines; CajasConsumptionLineConsumoItem; fk_ccln_consumo_item)`; `dispatchLine([companyId, dispatchId, dispatchLineId] → CajasDispatchLine[companyId, dispatchId, id]; CajasDispatchLine.consumptionLines; CajasConsumptionLineDispatchLine; fk_ccln_dispatch_line)`; `articleReference([companyId, articleReferenceId] → CajasArticleReference[companyId, id]; CajasArticleReference.consumptionLines; CajasConsumptionLineArticle; fk_ccln_article)`; `stockScopeReference([companyId, stockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.consumptionLines; CajasConsumptionLineStockScope; fk_ccln_stock_scope)`; `recognizedReturnDisposition([companyId, dispatchLineId, recognizedReturnDispositionId] → CajasDisposition[companyId, dispatchLineId, id]; CajasDisposition.recognizedByConsumptionLine; CajasConsumptionRecognizedDisposition; fk_ccln_recognized_disp)`.
- **`CajasConditionProjection`** — `company([companyId] → Company[id]; Company.cajasConditionProjections; CajasCompanyConditionProjections; fk_ccp_company)`; `boxStockScopeReference([companyId, boxStockScopeReferenceId] → CajasStockScopeReference[companyId, id]; CajasStockScopeReference.conditionProjection; CajasStockScopeCondition; fk_ccp_box_scope)`; `assignment([companyId, assignmentId] → CajasAssignment[companyId, id]; CajasAssignment.conditionProjection; CajasAssignmentCondition; fk_ccp_assignment)`.
- **`CajasCommandAcceptance`** — `company([companyId] → Company[id]; Company.cajasCommandAcceptances; CajasCompanyCommandAcceptances; fk_cca_company)`; `acceptedBy([acceptedById] → User[id]; User.acceptedCajasCommands; CajasCommandAcceptedBy; fk_cca_accepted_by)`; `auditEvent([companyId, auditEventId] → AuditEvent[companyId, id]; AuditEvent.cajasAcceptedCommand; CajasCommandAudit; fk_cca_audit)`.
- **`CajasCommandEffect`** — `company([companyId] → Company[id]; Company.cajasCommandEffects; CajasCompanyCommandEffects; fk_cce_company)`; `commandAcceptance([companyId, commandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.effects; CajasCommandEffects; fk_cce_command)`; `stockRecordReference([companyId, stockRecordReferenceId] → CajasStockRecordReference[companyId, id]; CajasStockRecordReference.commandEffects; CajasCommandEffectStockRecord; fk_cce_stock_record)`.
- **`CajasCommandAttempt`** — `company([companyId] → Company[id]; Company.cajasCommandAttempts; CajasCompanyCommandAttempts; fk_ccat_company)`; `commandAcceptance([companyId, commandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.attempts; CajasCommandAttempts; fk_ccat_command)`; `actor([actorId] → User[id]; User.cajasCommandAttempts; CajasAttemptActor; fk_ccat_actor)`; `auditEvent([companyId, auditEventId] → AuditEvent[companyId, id]; AuditEvent.cajasCommandAttempts; CajasAttemptAudit; fk_ccat_audit)`.
- **`CajasProjectionReconciliation`** — `company([companyId] → Company[id]; Company.cajasProjectionReconciliations; CajasCompanyProjectionReconciliations; fk_cpr_company)`; `comparedBy([comparedById] → User[id]; User.cajasProjectionReconciliations; CajasReconciliationComparedBy; fk_cpr_compared_by)`; `repairCommandAcceptance([companyId, repairCommandAcceptanceId] → CajasCommandAcceptance[companyId, id]; CajasCommandAcceptance.projectionRepairs; CajasReconciliationRepairCommand; fk_cpr_repair_command)`.

### 6.1 Existing-target composite keys and inverse fields

D4 must add these exact candidate keys before composite Cajas FKs: `Surgery @@unique([companyId,id], map: "uq_surgery_company_id")`; `Remito @@unique([companyId,id], map: "uq_remito_company_id")`; `RemitoItem @@unique([companyId,id], map: "uq_remito_item_company_id")` and `@@unique([companyId,remitoId,id], map: "uq_remito_item_owner_id")`; `Devolucion @@unique([companyId,id], map: "uq_devolucion_company_id")` and `@@unique([companyId,id,remitoId], map: "uq_devolucion_id_remito")`; `DevolucionItem @@unique([companyId,id], map: "uq_devolucion_item_company_id")` and `@@unique([companyId,devolucionId,id], map: "uq_devolucion_item_owner_id")`; `Consumo @@unique([companyId,id], map: "uq_consumo_company_id")` and `@@unique([companyId,id,remitoId], map: "uq_consumo_id_remito")`; `ConsumoItem @@unique([companyId,id], map: "uq_consumo_item_company_id")` and `@@unique([companyId,consumoId,id], map: "uq_consumo_item_owner_id")`; `AuditEvent @@unique([companyId,id], map: "uq_audit_event_company_id")`.

The three existing item-owner chains receive these exact physical additions/replacements:

| Existing item model/table | Exact scalar addition | Exact owner relation replacement | Exact owner inverse | Exact owner candidate key | Exact FK/actions | Exact lookup index |
| --- | --- | --- | --- | --- | --- | --- |
| `RemitoItem` / existing `RemitoItem` table | `companyId String @map("company_id")` required after verified population | `remito Remito @relation("RemitoItemsTenant", fields:[companyId,remitoId], references:[companyId,id], onDelete:Restrict, onUpdate:Cascade, map:"fk_remito_item_owner")` | `Remito.items RemitoItem[] @relation("RemitoItemsTenant")` | `@@unique([companyId,remitoId,id], map:"uq_remito_item_owner_id")` | `fk_remito_item_owner=Restrict/Cascade` | `@@index([companyId,remitoId], map:"ix_remito_item_company_owner")` |
| `ConsumoItem` / `consumo_item` | `companyId String @map("company_id")` required after verified population | `consumo Consumo @relation("ConsumoItemsTenant", fields:[companyId,consumoId], references:[companyId,id], onDelete:Restrict, onUpdate:Cascade, map:"fk_consumo_item_owner")` | `Consumo.items ConsumoItem[] @relation("ConsumoItemsTenant")` | `@@unique([companyId,consumoId,id], map:"uq_consumo_item_owner_id")` | `fk_consumo_item_owner=Restrict/Cascade` | `@@index([companyId,consumoId], map:"ix_consumo_item_company_owner")` |
| `DevolucionItem` / `devolucion_item` | `companyId String @map("company_id")` required after verified population | `devolucion Devolucion @relation("DevolucionItemsTenant", fields:[companyId,devolucionId], references:[companyId,id], onDelete:Restrict, onUpdate:Cascade, map:"fk_devolucion_item_owner")` | `Devolucion.items DevolucionItem[] @relation("DevolucionItemsTenant")` | `@@unique([companyId,devolucionId,id], map:"uq_devolucion_item_owner_id")` | `fk_devolucion_item_owner=Restrict/Cascade` | `@@index([companyId,devolucionId], map:"ix_devolucion_item_company_owner")` |

Each composite owner FK makes an item/company mismatch physically unrepresentable: an item company different from its owner finds no `(companyId,id)` candidate row and the write fails. The owner-qualified candidate keys additionally let Cajas evidence prove exact same-owner lineage, not merely tenant equality. No simple owner-ID FK remains for these three relations. Adding non-null `companyId` requires the separately gated parent-derived compatibility step in §12; any orphan or mismatch blocks migration.

### 6.2 Exact relation-field and inverse cardinality

| Child model | Exact child relation field types | Exact target inverse field types |
| --- | --- | --- |
| `CajasArticleReference` | `company Company`; `verifiedBy User` | `Company.cajasArticleReferences CajasArticleReference[]`; `User.verifiedCajasArticleReferences CajasArticleReference[]` |
| `CajasStockScopeReference` | `company Company`; `articleReference CajasArticleReference`; `verifiedBy User` | `Company.cajasStockScopeReferences CajasStockScopeReference[]`; `CajasArticleReference.stockScopeReferences CajasStockScopeReference[]`; `User.verifiedCajasStockScopeReferences CajasStockScopeReference[]` |
| `CajasStockRecordReference` | `company Company`; `verifiedBy User` | `Company.cajasStockRecordReferences CajasStockRecordReference[]`; `User.verifiedCajasStockRecordReferences CajasStockRecordReference[]` |
| `CajasBoxFormula` | `company Company`; `boxArticleReference CajasArticleReference` | `Company.cajasBoxFormulas CajasBoxFormula[]`; `CajasArticleReference.boxFormulas CajasBoxFormula[]` |
| `CajasFormulaCurrent` | `company Company`; `formula CajasBoxFormula`; `currentFormulaVersion CajasFormulaVersion` | `Company.cajasFormulaCurrents CajasFormulaCurrent[]`; `CajasBoxFormula.currentSelector CajasFormulaCurrent?`; `CajasFormulaVersion.currentSelector CajasFormulaCurrent?` |
| `CajasFormulaVersion` | `company Company`; `formula CajasBoxFormula`; `previousVersion CajasFormulaVersion?`; `acceptedBy User`; `commandAcceptance CajasCommandAcceptance` | `Company.cajasFormulaVersions CajasFormulaVersion[]`; `CajasBoxFormula.versions CajasFormulaVersion[]`; `CajasFormulaVersion.nextVersions CajasFormulaVersion[]`; `User.acceptedCajasFormulaVersions CajasFormulaVersion[]`; `CajasCommandAcceptance.formulaVersionResult CajasFormulaVersion?` |
| `CajasFormulaLine` | `company Company`; `formulaVersion CajasFormulaVersion`; `articleReference CajasArticleReference` | `Company.cajasFormulaLines CajasFormulaLine[]`; `CajasFormulaVersion.lines CajasFormulaLine[]`; `CajasArticleReference.formulaLines CajasFormulaLine[]` |
| `CajasAssignment` | `company Company`; `surgery Surgery`; `boxStockScopeReference CajasStockScopeReference`; `assignedBy User`; `endedBy User?`; `assignmentCommandAcceptance CajasCommandAcceptance`; `endCommandAcceptance CajasCommandAcceptance?` | `Company.cajasAssignments CajasAssignment[]`; `Surgery.cajasAssignments CajasAssignment[]`; `CajasStockScopeReference.boxAssignments CajasAssignment[]`; `User.startedCajasAssignments CajasAssignment[]`; `User.endedCajasAssignments CajasAssignment[]`; `CajasCommandAcceptance.assignmentStartResult CajasAssignment?`; `CajasCommandAcceptance.assignmentEndResult CajasAssignment?` |
| `CajasPreparation` | `company Company`; `assignment CajasAssignment`; `formulaVersion CajasFormulaVersion`; `latestControl CajasControl?`; `lastAcceptedChange CajasCompositionChange?` | `Company.cajasPreparations CajasPreparation[]`; `CajasAssignment.preparation CajasPreparation?`; `CajasFormulaVersion.preparations CajasPreparation[]`; `CajasControl.latestForPreparation CajasPreparation?`; `CajasCompositionChange.latestForPreparation CajasPreparation?` |
| `CajasPreparationLine` | `company Company`; `preparation CajasPreparation`; `expectedFormulaLine CajasFormulaLine?`; `articleReference CajasArticleReference`; `stockScopeReference CajasStockScopeReference?` | `Company.cajasPreparationLines CajasPreparationLine[]`; `CajasPreparation.lines CajasPreparationLine[]`; `CajasFormulaLine.preparationLines CajasPreparationLine[]`; `CajasArticleReference.preparationLines CajasPreparationLine[]`; `CajasStockScopeReference.preparationLines CajasPreparationLine[]` |
| `CajasReservationCorrelation` | `company Company`; `assignment CajasAssignment`; `preparationLine CajasPreparationLine?`; `stockScopeReference CajasStockScopeReference`; `stockReservationReference CajasStockRecordReference`; `replacesCorrelation CajasReservationCorrelation?` | `Company.cajasReservationCorrelations CajasReservationCorrelation[]`; `CajasAssignment.reservationCorrelations CajasReservationCorrelation[]`; `CajasPreparationLine.reservationCorrelations CajasReservationCorrelation[]`; `CajasStockScopeReference.reservationCorrelations CajasReservationCorrelation[]`; `CajasStockRecordReference.reservationCorrelations CajasReservationCorrelation[]`; `CajasReservationCorrelation.followingCorrelations CajasReservationCorrelation[]` |
| `CajasControl` | `company Company`; `assignment CajasAssignment`; `formulaVersion CajasFormulaVersion`; `priorControl CajasControl?`; `acceptedBy User`; `commandAcceptance CajasCommandAcceptance` | `Company.cajasControls CajasControl[]`; `CajasAssignment.controls CajasControl[]`; `CajasFormulaVersion.controls CajasControl[]`; `CajasControl.followingControls CajasControl[]`; `User.acceptedCajasControls CajasControl[]`; `CajasCommandAcceptance.controlResult CajasControl?` |
| `CajasControlLine` | `company Company`; `control CajasControl`; `sourcePreparationLine CajasPreparationLine`; `expectedFormulaLine CajasFormulaLine?`; `articleReference CajasArticleReference`; `stockScopeReference CajasStockScopeReference?` | `Company.cajasControlLines CajasControlLine[]`; `CajasControl.lines CajasControlLine[]`; `CajasPreparationLine.controlLines CajasControlLine[]`; `CajasFormulaLine.controlLines CajasControlLine[]`; `CajasArticleReference.controlLines CajasControlLine[]`; `CajasStockScopeReference.controlLines CajasControlLine[]` |
| `CajasCompositionChange` | `company Company`; `assignment CajasAssignment`; `acceptedBy User`; `commandAcceptance CajasCommandAcceptance` | `Company.cajasCompositionChanges CajasCompositionChange[]`; `CajasAssignment.compositionChanges CajasCompositionChange[]`; `User.acceptedCajasCompositionChanges CajasCompositionChange[]`; `CajasCommandAcceptance.compositionChangeResult CajasCompositionChange?` |
| `CajasCompositionChangeLine` | `company Company`; `change CajasCompositionChange`; `priorPreparationLine CajasPreparationLine?`; `resultingPreparationLine CajasPreparationLine?`; `priorArticleReference CajasArticleReference?`; `resultingArticleReference CajasArticleReference?`; `priorStockScopeReference CajasStockScopeReference?`; `resultingStockScopeReference CajasStockScopeReference?` | `Company.cajasCompositionChangeLines CajasCompositionChangeLine[]`; `CajasCompositionChange.lines CajasCompositionChangeLine[]`; `CajasPreparationLine.priorChangeLines CajasCompositionChangeLine[]`; `CajasPreparationLine.resultingChangeLines CajasCompositionChangeLine[]`; `CajasArticleReference.priorChangeLines CajasCompositionChangeLine[]`; `CajasArticleReference.resultingChangeLines CajasCompositionChangeLine[]`; `CajasStockScopeReference.priorChangeLines CajasCompositionChangeLine[]`; `CajasStockScopeReference.resultingChangeLines CajasCompositionChangeLine[]` |
| `CajasDifference` | `company Company`; `assignment CajasAssignment`; `controlLine CajasControlLine?`; `dispatchLine CajasDispatchLine?`; `returnLine CajasReturnLine?`; `openedBy User` | `Company.cajasDifferences CajasDifference[]`; `CajasAssignment.differences CajasDifference[]`; `CajasControlLine.differences CajasDifference[]`; `CajasDispatchLine.differences CajasDifference[]`; `CajasReturnLine.differences CajasDifference[]`; `User.openedCajasDifferences CajasDifference[]` |
| `CajasDifferenceResolution` | `company Company`; `difference CajasDifference`; `acceptedBy User`; `commandAcceptance CajasCommandAcceptance` | `Company.cajasDifferenceResolutions CajasDifferenceResolution[]`; `CajasDifference.resolutions CajasDifferenceResolution[]`; `User.acceptedCajasDifferenceResolutions CajasDifferenceResolution[]`; `CajasCommandAcceptance.differenceResolutionResult CajasDifferenceResolution?` |
| `CajasDispatch` | `company Company`; `assignment CajasAssignment`; `remito Remito`; `sourceControl CajasControl`; `correctsDispatch CajasDispatch?`; `acceptedBy User`; `commandAcceptance CajasCommandAcceptance` | `Company.cajasDispatches CajasDispatch[]`; `CajasAssignment.dispatches CajasDispatch[]`; `Remito.cajasDispatches CajasDispatch[]`; `CajasControl.dispatches CajasDispatch[]`; `CajasDispatch.corrections CajasDispatch[]`; `User.acceptedCajasDispatches CajasDispatch[]`; `CajasCommandAcceptance.dispatchResult CajasDispatch?` |
| `CajasDispatchLine` | `company Company`; `dispatch CajasDispatch`; `neutralizesDispatchLine CajasDispatchLine?`; `remitoItem RemitoItem`; `sourceControlLine CajasControlLine`; `sourcePreparationLine CajasPreparationLine`; `articleReference CajasArticleReference`; `stockScopeReference CajasStockScopeReference?`; `stockEffectReference CajasStockRecordReference` | `Company.cajasDispatchLines CajasDispatchLine[]`; `CajasDispatch.lines CajasDispatchLine[]`; `CajasDispatchLine.neutralizedBy CajasDispatchLine?`; `RemitoItem.cajasDispatchLines CajasDispatchLine[]`; `CajasControlLine.dispatchLines CajasDispatchLine[]`; `CajasPreparationLine.dispatchLines CajasDispatchLine[]`; `CajasArticleReference.dispatchLines CajasDispatchLine[]`; `CajasStockScopeReference.dispatchLines CajasDispatchLine[]`; `CajasStockRecordReference.dispatchLines CajasDispatchLine[]` |
| `CajasDispatchAccounting` | `company Company`; `dispatch CajasDispatch` | `Company.cajasDispatchAccountings CajasDispatchAccounting[]`; `CajasDispatch.accounting CajasDispatchAccounting?` |
| `CajasDispatchLineAccounting` | `company Company`; `accounting CajasDispatchAccounting`; `dispatchLine CajasDispatchLine` | `Company.cajasDispatchLineAccountings CajasDispatchLineAccounting[]`; `CajasDispatchAccounting.lines CajasDispatchLineAccounting[]`; `CajasDispatchLine.accounting CajasDispatchLineAccounting?` |
| `CajasDisposition` | `company Company`; `dispatchLine CajasDispatchLine`; `stockScopeReference CajasStockScopeReference?`; `returnConfirmation CajasReturnConfirmation?`; `consumptionConfirmation CajasConsumptionConfirmation?`; `returnLine CajasReturnLine?`; `consumptionLine CajasConsumptionLine?`; `neutralizesDisposition CajasDisposition?`; `stockEffectReference CajasStockRecordReference`; `commandAcceptance CajasCommandAcceptance` | `Company.cajasDispositions CajasDisposition[]`; `CajasDispatchLine.dispositions CajasDisposition[]`; `CajasStockScopeReference.dispositions CajasDisposition[]`; `CajasReturnConfirmation.dispositions CajasDisposition[]`; `CajasConsumptionConfirmation.dispositions CajasDisposition[]`; `CajasReturnLine.dispositions CajasDisposition[]`; `CajasConsumptionLine.dispositions CajasDisposition[]`; `CajasDisposition.neutralizedBy CajasDisposition?`; `CajasStockRecordReference.dispositions CajasDisposition[]`; `CajasCommandAcceptance.dispositions CajasDisposition[]` |
| `CajasReturnConfirmation` | `company Company`; `dispatch CajasDispatch`; `devolucion Devolucion`; `correctsConfirmation CajasReturnConfirmation?`; `acceptedBy User`; `commandAcceptance CajasCommandAcceptance` | `Company.cajasReturnConfirmations CajasReturnConfirmation[]`; `CajasDispatch.returnConfirmations CajasReturnConfirmation[]`; `Devolucion.cajasReturnConfirmations CajasReturnConfirmation[]`; `CajasReturnConfirmation.corrections CajasReturnConfirmation[]`; `User.acceptedCajasReturnConfirmations CajasReturnConfirmation[]`; `CajasCommandAcceptance.returnConfirmationResult CajasReturnConfirmation?` |
| `CajasReturnLine` | `company Company`; `returnConfirmation CajasReturnConfirmation`; `devolucionItem DevolucionItem`; `dispatchLine CajasDispatchLine?`; `articleReference CajasArticleReference`; `stockScopeReference CajasStockScopeReference?` | `Company.cajasReturnLines CajasReturnLine[]`; `CajasReturnConfirmation.lines CajasReturnLine[]`; `DevolucionItem.cajasReturnLines CajasReturnLine[]`; `CajasDispatchLine.returnLines CajasReturnLine[]`; `CajasArticleReference.returnLines CajasReturnLine[]`; `CajasStockScopeReference.returnLines CajasReturnLine[]` |
| `CajasReplacementPair` | `company Company`; `returnLine CajasReturnLine`; `originalDispatchLine CajasDispatchLine`; `receivedArticleReference CajasArticleReference`; `receivedStockScopeReference CajasStockScopeReference?` | `Company.cajasReplacementPairs CajasReplacementPair[]`; `CajasReturnLine.replacementPair CajasReplacementPair?`; `CajasDispatchLine.replacementPairs CajasReplacementPair[]`; `CajasArticleReference.receivedReplacementPairs CajasReplacementPair[]`; `CajasStockScopeReference.receivedReplacementPairs CajasReplacementPair[]` |
| `CajasConsumptionConfirmation` | `company Company`; `dispatch CajasDispatch`; `consumo Consumo`; `correctsConfirmation CajasConsumptionConfirmation?`; `acceptedBy User`; `commandAcceptance CajasCommandAcceptance` | `Company.cajasConsumptionConfirmations CajasConsumptionConfirmation[]`; `CajasDispatch.consumptionConfirmations CajasConsumptionConfirmation[]`; `Consumo.cajasConsumptionConfirmations CajasConsumptionConfirmation[]`; `CajasConsumptionConfirmation.corrections CajasConsumptionConfirmation[]`; `User.acceptedCajasConsumptionConfirmations CajasConsumptionConfirmation[]`; `CajasCommandAcceptance.consumptionConfirmationResult CajasConsumptionConfirmation?` |
| `CajasConsumptionLine` | `company Company`; `consumptionConfirmation CajasConsumptionConfirmation`; `consumoItem ConsumoItem`; `dispatchLine CajasDispatchLine`; `articleReference CajasArticleReference`; `stockScopeReference CajasStockScopeReference?`; `recognizedReturnDisposition CajasDisposition?` | `Company.cajasConsumptionLines CajasConsumptionLine[]`; `CajasConsumptionConfirmation.lines CajasConsumptionLine[]`; `ConsumoItem.cajasConsumptionLines CajasConsumptionLine[]`; `CajasDispatchLine.consumptionLines CajasConsumptionLine[]`; `CajasArticleReference.consumptionLines CajasConsumptionLine[]`; `CajasStockScopeReference.consumptionLines CajasConsumptionLine[]`; `CajasDisposition.recognizedByConsumptionLine CajasConsumptionLine?` |
| `CajasConditionProjection` | `company Company`; `boxStockScopeReference CajasStockScopeReference`; `assignment CajasAssignment?` | `Company.cajasConditionProjections CajasConditionProjection[]`; `CajasStockScopeReference.conditionProjection CajasConditionProjection?`; `CajasAssignment.conditionProjection CajasConditionProjection?` |
| `CajasCommandAcceptance` | `company Company`; `acceptedBy User`; `auditEvent AuditEvent` | `Company.cajasCommandAcceptances CajasCommandAcceptance[]`; `User.acceptedCajasCommands CajasCommandAcceptance[]`; `AuditEvent.cajasAcceptedCommand CajasCommandAcceptance?` |
| `CajasCommandEffect` | `company Company`; `commandAcceptance CajasCommandAcceptance`; `stockRecordReference CajasStockRecordReference?` | `Company.cajasCommandEffects CajasCommandEffect[]`; `CajasCommandAcceptance.effects CajasCommandEffect[]`; `CajasStockRecordReference.commandEffects CajasCommandEffect[]` |
| `CajasCommandAttempt` | `company Company`; `commandAcceptance CajasCommandAcceptance?`; `actor User`; `auditEvent AuditEvent?` | `Company.cajasCommandAttempts CajasCommandAttempt[]`; `CajasCommandAcceptance.attempts CajasCommandAttempt[]`; `User.cajasCommandAttempts CajasCommandAttempt[]`; `AuditEvent.cajasCommandAttempts CajasCommandAttempt[]` |
| `CajasProjectionReconciliation` | `company Company`; `comparedBy User?`; `repairCommandAcceptance CajasCommandAcceptance?` | `Company.cajasProjectionReconciliations CajasProjectionReconciliation[]`; `User.cajasProjectionReconciliations CajasProjectionReconciliation[]`; `CajasCommandAcceptance.projectionRepairs CajasProjectionReconciliation[]` |

### 6.3 Exact per-FK referential actions

Each FK name below is individually assigned `onDelete: Restrict` and `onUpdate: Cascade`; no FK inherits an unstated action.

| Child model | Exact FK maps with actions |
| --- | --- |
| `CajasArticleReference` | `fk_car_company=Restrict/Cascade`; `fk_car_verified_by=Restrict/Cascade` |
| `CajasStockScopeReference` | `fk_cssr_company=Restrict/Cascade`; `fk_cssr_article=Restrict/Cascade`; `fk_cssr_verified_by=Restrict/Cascade` |
| `CajasStockRecordReference` | `fk_csrr_company=Restrict/Cascade`; `fk_csrr_verified_by=Restrict/Cascade` |
| `CajasBoxFormula` | `fk_cbf_company=Restrict/Cascade`; `fk_cbf_article=Restrict/Cascade` |
| `CajasFormulaCurrent` | `fk_cfc_company=Restrict/Cascade`; `fk_cfc_formula=Restrict/Cascade`; `fk_cfc_version=Restrict/Cascade` |
| `CajasFormulaVersion` | `fk_cfv_company=Restrict/Cascade`; `fk_cfv_formula=Restrict/Cascade`; `fk_cfv_previous=Restrict/Cascade`; `fk_cfv_accepted_by=Restrict/Cascade`; `fk_cfv_command=Restrict/Cascade` |
| `CajasFormulaLine` | `fk_cfl_company=Restrict/Cascade`; `fk_cfl_version=Restrict/Cascade`; `fk_cfl_article=Restrict/Cascade` |
| `CajasAssignment` | `fk_ca_company=Restrict/Cascade`; `fk_ca_surgery=Restrict/Cascade`; `fk_ca_box_scope=Restrict/Cascade`; `fk_ca_assigned_by=Restrict/Cascade`; `fk_ca_ended_by=Restrict/Cascade`; `fk_ca_start_command=Restrict/Cascade`; `fk_ca_end_command=Restrict/Cascade` |
| `CajasPreparation` | `fk_cp_company=Restrict/Cascade`; `fk_cp_assignment=Restrict/Cascade`; `fk_cp_formula_version=Restrict/Cascade`; `fk_cp_latest_control=Restrict/Cascade`; `fk_cp_last_change=Restrict/Cascade` |
| `CajasPreparationLine` | `fk_cpl_company=Restrict/Cascade`; `fk_cpl_preparation=Restrict/Cascade`; `fk_cpl_expected_line=Restrict/Cascade`; `fk_cpl_article=Restrict/Cascade`; `fk_cpl_stock_scope=Restrict/Cascade` |
| `CajasReservationCorrelation` | `fk_crc_company=Restrict/Cascade`; `fk_crc_assignment=Restrict/Cascade`; `fk_crc_prep_line=Restrict/Cascade`; `fk_crc_stock_scope=Restrict/Cascade`; `fk_crc_stock_record=Restrict/Cascade`; `fk_crc_replaces=Restrict/Cascade` |
| `CajasControl` | `fk_cc_company=Restrict/Cascade`; `fk_cc_assignment=Restrict/Cascade`; `fk_cc_formula_version=Restrict/Cascade`; `fk_cc_prior=Restrict/Cascade`; `fk_cc_accepted_by=Restrict/Cascade`; `fk_cc_command=Restrict/Cascade` |
| `CajasControlLine` | `fk_ccl_company=Restrict/Cascade`; `fk_ccl_control=Restrict/Cascade`; `fk_ccl_source_line=Restrict/Cascade`; `fk_ccl_expected_line=Restrict/Cascade`; `fk_ccl_article=Restrict/Cascade`; `fk_ccl_stock_scope=Restrict/Cascade` |
| `CajasCompositionChange` | `fk_cchg_company=Restrict/Cascade`; `fk_cchg_assignment=Restrict/Cascade`; `fk_cchg_accepted_by=Restrict/Cascade`; `fk_cchg_command=Restrict/Cascade` |
| `CajasCompositionChangeLine` | `fk_cchl_company=Restrict/Cascade`; `fk_cchl_change=Restrict/Cascade`; `fk_cchl_prior_line=Restrict/Cascade`; `fk_cchl_result_line=Restrict/Cascade`; `fk_cchl_prior_article=Restrict/Cascade`; `fk_cchl_result_article=Restrict/Cascade`; `fk_cchl_prior_scope=Restrict/Cascade`; `fk_cchl_result_scope=Restrict/Cascade` |
| `CajasDifference` | `fk_cd_company=Restrict/Cascade`; `fk_cd_assignment=Restrict/Cascade`; `fk_cd_control_line=Restrict/Cascade`; `fk_cd_dispatch_line=Restrict/Cascade`; `fk_cd_return_line=Restrict/Cascade`; `fk_cd_opened_by=Restrict/Cascade` |
| `CajasDifferenceResolution` | `fk_cdr_company=Restrict/Cascade`; `fk_cdr_difference=Restrict/Cascade`; `fk_cdr_accepted_by=Restrict/Cascade`; `fk_cdr_command=Restrict/Cascade` |
| `CajasDispatch` | `fk_cdp_company=Restrict/Cascade`; `fk_cdp_assignment=Restrict/Cascade`; `fk_cdp_remito=Restrict/Cascade`; `fk_cdp_control=Restrict/Cascade`; `fk_cdp_corrects=Restrict/Cascade`; `fk_cdp_accepted_by=Restrict/Cascade`; `fk_cdp_command=Restrict/Cascade` |
| `CajasDispatchLine` | `fk_cdl_company=Restrict/Cascade`; `fk_cdl_dispatch=Restrict/Cascade`; `fk_cdl_neutralizes=Restrict/Cascade`; `fk_cdl_remito_item=Restrict/Cascade`; `fk_cdl_control_line=Restrict/Cascade`; `fk_cdl_prep_line=Restrict/Cascade`; `fk_cdl_article=Restrict/Cascade`; `fk_cdl_stock_scope=Restrict/Cascade`; `fk_cdl_stock_effect=Restrict/Cascade` |
| `CajasDispatchAccounting` | `fk_cda_company=Restrict/Cascade`; `fk_cda_dispatch=Restrict/Cascade` |
| `CajasDispatchLineAccounting` | `fk_cdla_company=Restrict/Cascade`; `fk_cdla_accounting=Restrict/Cascade`; `fk_cdla_dispatch_line=Restrict/Cascade` |
| `CajasDisposition` | `fk_cdis_company=Restrict/Cascade`; `fk_cdis_dispatch_line=Restrict/Cascade`; `fk_cdis_stock_scope=Restrict/Cascade`; `fk_cdis_return_confirmation=Restrict/Cascade`; `fk_cdis_consumption_confirmation=Restrict/Cascade`; `fk_cdis_return_line=Restrict/Cascade`; `fk_cdis_consumption_line=Restrict/Cascade`; `fk_cdis_neutralizes=Restrict/Cascade`; `fk_cdis_stock_effect=Restrict/Cascade`; `fk_cdis_command=Restrict/Cascade` |
| `CajasReturnConfirmation` | `fk_crcfn_company=Restrict/Cascade`; `fk_crcfn_dispatch=Restrict/Cascade`; `fk_crcfn_devolucion=Restrict/Cascade`; `fk_crcfn_corrects=Restrict/Cascade`; `fk_crcfn_accepted_by=Restrict/Cascade`; `fk_crcfn_command=Restrict/Cascade` |
| `CajasReturnLine` | `fk_crl_company=Restrict/Cascade`; `fk_crl_confirmation=Restrict/Cascade`; `fk_crl_devolucion_item=Restrict/Cascade`; `fk_crl_dispatch_line=Restrict/Cascade`; `fk_crl_article=Restrict/Cascade`; `fk_crl_stock_scope=Restrict/Cascade` |
| `CajasReplacementPair` | `fk_crp_company=Restrict/Cascade`; `fk_crp_return_line=Restrict/Cascade`; `fk_crp_original_line=Restrict/Cascade`; `fk_crp_received_article=Restrict/Cascade`; `fk_crp_received_scope=Restrict/Cascade` |
| `CajasConsumptionConfirmation` | `fk_ccc_company=Restrict/Cascade`; `fk_ccc_dispatch=Restrict/Cascade`; `fk_ccc_consumo=Restrict/Cascade`; `fk_ccc_corrects=Restrict/Cascade`; `fk_ccc_accepted_by=Restrict/Cascade`; `fk_ccc_command=Restrict/Cascade` |
| `CajasConsumptionLine` | `fk_ccln_company=Restrict/Cascade`; `fk_ccln_confirmation=Restrict/Cascade`; `fk_ccln_consumo_item=Restrict/Cascade`; `fk_ccln_dispatch_line=Restrict/Cascade`; `fk_ccln_article=Restrict/Cascade`; `fk_ccln_stock_scope=Restrict/Cascade`; `fk_ccln_recognized_disp=Restrict/Cascade` |
| `CajasConditionProjection` | `fk_ccp_company=Restrict/Cascade`; `fk_ccp_box_scope=Restrict/Cascade`; `fk_ccp_assignment=Restrict/Cascade` |
| `CajasCommandAcceptance` | `fk_cca_company=Restrict/Cascade`; `fk_cca_accepted_by=Restrict/Cascade`; `fk_cca_audit=Restrict/Cascade` |
| `CajasCommandEffect` | `fk_cce_company=Restrict/Cascade`; `fk_cce_command=Restrict/Cascade`; `fk_cce_stock_record=Restrict/Cascade` |
| `CajasCommandAttempt` | `fk_ccat_company=Restrict/Cascade`; `fk_ccat_command=Restrict/Cascade`; `fk_ccat_actor=Restrict/Cascade`; `fk_ccat_audit=Restrict/Cascade` |
| `CajasProjectionReconciliation` | `fk_cpr_company=Restrict/Cascade`; `fk_cpr_compared_by=Restrict/Cascade`; `fk_cpr_repair_command=Restrict/Cascade` |

## 7. Physical identifier and database constraint registry

### 7.0 Exact primary-key physical names

The second column is the literal `map:` value on that row's `id String @id`; no PK name is generated or derived during D4.

| Model / table | Exact PK name |
| --- | --- |
| `CajasArticleReference` / `cajas_article_reference` | `cajas_article_reference_pkey` |
| `CajasStockScopeReference` / `cajas_stock_scope_reference` | `cajas_stock_scope_reference_pkey` |
| `CajasStockRecordReference` / `cajas_stock_record_reference` | `cajas_stock_record_reference_pkey` |
| `CajasBoxFormula` / `cajas_box_formula` | `cajas_box_formula_pkey` |
| `CajasFormulaCurrent` / `cajas_formula_current` | `cajas_formula_current_pkey` |
| `CajasFormulaVersion` / `cajas_formula_version` | `cajas_formula_version_pkey` |
| `CajasFormulaLine` / `cajas_formula_line` | `cajas_formula_line_pkey` |
| `CajasAssignment` / `cajas_assignment` | `cajas_assignment_pkey` |
| `CajasPreparation` / `cajas_preparation` | `cajas_preparation_pkey` |
| `CajasPreparationLine` / `cajas_preparation_line` | `cajas_preparation_line_pkey` |
| `CajasReservationCorrelation` / `cajas_reservation_correlation` | `cajas_reservation_correlation_pkey` |
| `CajasControl` / `cajas_control` | `cajas_control_pkey` |
| `CajasControlLine` / `cajas_control_line` | `cajas_control_line_pkey` |
| `CajasCompositionChange` / `cajas_composition_change` | `cajas_composition_change_pkey` |
| `CajasCompositionChangeLine` / `cajas_composition_change_line` | `cajas_composition_change_line_pkey` |
| `CajasDifference` / `cajas_difference` | `cajas_difference_pkey` |
| `CajasDifferenceResolution` / `cajas_difference_resolution` | `cajas_difference_resolution_pkey` |
| `CajasDispatch` / `cajas_dispatch` | `cajas_dispatch_pkey` |
| `CajasDispatchLine` / `cajas_dispatch_line` | `cajas_dispatch_line_pkey` |
| `CajasDispatchAccounting` / `cajas_dispatch_accounting` | `cajas_dispatch_accounting_pkey` |
| `CajasDispatchLineAccounting` / `cajas_dispatch_line_accounting` | `cajas_dispatch_line_accounting_pkey` |
| `CajasDisposition` / `cajas_disposition` | `cajas_disposition_pkey` |
| `CajasReturnConfirmation` / `cajas_return_confirmation` | `cajas_return_confirmation_pkey` |
| `CajasReturnLine` / `cajas_return_line` | `cajas_return_line_pkey` |
| `CajasReplacementPair` / `cajas_replacement_pair` | `cajas_replacement_pair_pkey` |
| `CajasConsumptionConfirmation` / `cajas_consumption_confirmation` | `cajas_consumption_confirmation_pkey` |
| `CajasConsumptionLine` / `cajas_consumption_line` | `cajas_consumption_line_pkey` |
| `CajasConditionProjection` / `cajas_condition_projection` | `cajas_condition_projection_pkey` |
| `CajasCommandAcceptance` / `cajas_command_acceptance` | `cajas_command_acceptance_pkey` |
| `CajasCommandEffect` / `cajas_command_effect` | `cajas_command_effect_pkey` |
| `CajasCommandAttempt` / `cajas_command_attempt` | `cajas_command_attempt_pkey` |
| `CajasProjectionReconciliation` / `cajas_projection_reconciliation` | `cajas_projection_reconciliation_pkey` |

### 7.1 Exact mapped unique/index identifier registry

The key/index field lists in §5 use these exact PostgreSQL names through Prisma `map:`. Each row also names the mandatory composite tenant candidate key. There are no ORM-generated non-PK index/unique names left unspecified.

| Model | Exact mapped identifiers (`name(fields)`) |
| --- | --- |
| `CajasArticleReference` | `uq_car_company_id(companyId,id)`; `uq_car_company_source(companyId,sourceArticleId)`; `ix_car_company_sku(companyId,skuSnapshot)`; `ix_car_verifier_time(verifiedById,verifiedAt)` |
| `CajasStockScopeReference` | `uq_cssr_company_id(companyId,id)`; `uq_cssr_company_source(companyId,sourceStockScopeId)`; `ix_cssr_company_article_kind(companyId,articleReferenceId,kind)`; `ix_cssr_company_code(companyId,identifiedCodeSnapshot)`; `ix_cssr_company_serial(companyId,serialNumberSnapshot)`; `ix_cssr_company_lot_exp(companyId,lotNumberSnapshot,expirationDateSnapshot)` |
| `CajasStockRecordReference` | `uq_csrr_company_id(companyId,id)`; `uq_csrr_company_kind_source(companyId,kind,sourceStockRecordId)`; `ix_csrr_company_checkpoint_time(companyId,sourceCheckpoint,createdAt)`; `ix_csrr_verifier_time(verifiedById,verifiedAt)` |
| `CajasBoxFormula` | `uq_cbf_company_id(companyId,id)`; `uq_cbf_company_article(companyId,boxArticleReferenceId)`; `ix_cbf_company_updated(companyId,updatedAt)` |
| `CajasFormulaCurrent` | `uq_cfc_company_id(companyId,id)`; `uq_cfc_formula(companyId,formulaId)`; `uq_cfc_current_version(companyId,currentFormulaVersionId)`; `ix_cfc_company_updated(companyId,updatedAt)` |
| `CajasFormulaVersion` | `uq_cfv_company_id(companyId,id)`; `uq_cfv_formula_number(formulaId,versionNumber)`; `uq_cfv_command(companyId,commandAcceptanceId)`; `ix_cfv_company_accepted(companyId,acceptedAt)`; `ix_cfv_previous(previousVersionId)` |
| `CajasFormulaLine` | `uq_cfl_company_id(companyId,id)`; `uq_cfl_version_line(formulaVersionId,lineNumber)`; `ix_cfl_version_article(formulaVersionId,articleReferenceId)`; `ix_cfl_company_article(companyId,articleReferenceId)` |
| `CajasAssignment` | `uq_ca_company_id(companyId,id)`; `uq_ca_active_box(companyId,boxStockScopeReferenceId,activeSlot)`; `uq_ca_start_command(companyId,assignmentCommandAcceptanceId)`; `uq_ca_end_command(companyId,endCommandAcceptanceId)`; `ix_ca_company_surgery_active(companyId,surgeryId,activeSlot)`; `ix_ca_company_assigned(companyId,assignedAt)` |
| `CajasPreparation` | `uq_cp_company_id(companyId,id)`; `uq_cp_assignment(companyId,assignmentId)`; `uq_cp_latest_control(companyId,latestControlId)`; `uq_cp_last_change(companyId,lastAcceptedChangeId)`; `ix_cp_company_assignment(companyId,assignmentId)`; `ix_cp_company_recontrol_updated(companyId,requiresRecontrol,updatedAt)`; `ix_cp_formula_version(formulaVersionId)` |
| `CajasPreparationLine` | `uq_cpl_company_id(companyId,id)`; `uq_cpl_preparation_key(preparationId,lineKey)`; `ix_cpl_company_active(companyId,preparationId,isActive)`; `ix_cpl_company_scope(companyId,stockScopeReferenceId)`; `ix_cpl_expected_line(expectedFormulaLineId)` |
| `CajasReservationCorrelation` | `uq_crc_company_id(companyId,id)`; `uq_crc_company_semantic(companyId,semanticKey)`; `ix_crc_checkpoint_scope(companyId,sourceCheckpoint,stockScopeReferenceId)`; `ix_crc_assignment_time(companyId,assignmentId,createdAt)`; `ix_crc_prep_line(preparationLineId)`; `ix_crc_stock_record(stockReservationReferenceId)`; `ix_crc_replaces(replacesCorrelationId)` |
| `CajasControl` | `uq_cc_company_id(companyId,id)`; `uq_cc_assignment_sequence(assignmentId,sequence)`; `uq_cc_command(companyId,commandAcceptanceId)`; `ix_cc_assignment_time(companyId,assignmentId,acceptedAt)`; `ix_cc_prior(priorControlId)`; `ix_cc_result_time(companyId,result,acceptedAt)` |
| `CajasControlLine` | `uq_ccl_company_id(companyId,id)`; `uq_ccl_control_line(controlId,lineNumber)`; `ix_ccl_company_article(companyId,articleReferenceId)`; `ix_ccl_stock_scope(stockScopeReferenceId)`; `ix_ccl_source_line(sourcePreparationLineId)` |
| `CajasCompositionChange` | `uq_cchg_company_id(companyId,id)`; `uq_cchg_assignment_version(assignmentId,resultingPreparationVersion)`; `uq_cchg_command(companyId,commandAcceptanceId)`; `ix_cchg_assignment_time(companyId,assignmentId,acceptedAt)` |
| `CajasCompositionChangeLine` | `uq_cchl_company_id(companyId,id)`; `uq_cchl_change_line(changeId,lineNumber)`; `ix_cchl_company_change(companyId,changeId)`; `ix_cchl_prior_line(priorPreparationLineId)`; `ix_cchl_result_line(resultingPreparationLineId)` |
| `CajasDifference` | `uq_cd_company_id(companyId,id)`; `ix_cd_assignment_opened(companyId,assignmentId,openedAt)`; `ix_cd_control_line(controlLineId)`; `ix_cd_dispatch_line(dispatchLineId)`; `ix_cd_return_line(returnLineId)` |
| `CajasDifferenceResolution` | `uq_cdr_company_id(companyId,id)`; `uq_cdr_difference_sequence(differenceId,sequence)`; `uq_cdr_command(companyId,commandAcceptanceId)`; `ix_cdr_difference_time(companyId,differenceId,acceptedAt)`; `ix_cdr_actor_time(acceptedById,acceptedAt)` |
| `CajasDispatch` | `uq_cdp_company_id(companyId,id)`; `uq_cdp_owner_lineage(companyId,id,remitoId)`; `uq_cdp_assignment_sequence(assignmentId,sequence)`; `uq_cdp_command(companyId,commandAcceptanceId)`; `ix_cdp_remito_kind(companyId,remitoId,recordKind)`; `ix_cdp_assignment_time(companyId,assignmentId,acceptedAt)`; `ix_cdp_control(sourceControlId)`; `ix_cdp_corrects(correctsDispatchId)` |
| `CajasDispatchLine` | `uq_cdl_company_id(companyId,id)`; `uq_cdl_dispatch_id(companyId,dispatchId,id)`; `uq_cdl_dispatch_line(dispatchId,lineNumber)`; `uq_cdl_source_scope(dispatchId,remitoItemId,sourceControlLineId)`; `uq_cdl_neutralizes(companyId,neutralizesDispatchLineId)`; `ix_cdl_remito_item(companyId,remitoId,remitoItemId)`; `ix_cdl_company_control(companyId,sourceControlLineId)`; `ix_cdl_prep_line(sourcePreparationLineId)`; `ix_cdl_stock_scope(stockScopeReferenceId)`; `ix_cdl_stock_effect(stockEffectReferenceId)` |
| `CajasDispatchAccounting` | `uq_cda_company_id(companyId,id)`; `uq_cda_dispatch(companyId,dispatchId)`; `ix_cda_company_updated(companyId,updatedAt)`; `ix_cda_company_watermark(companyId,evidenceWatermark)` |
| `CajasDispatchLineAccounting` | `uq_cdla_company_id(companyId,id)`; `uq_cdla_dispatch_line(companyId,dispatchLineId)`; `uq_cdla_accounting_line(accountingId,dispatchLineId)`; `ix_cdla_pending(companyId,accountingId,pendingQuantity)` |
| `CajasDisposition` | `uq_cdis_company_id(companyId,id)`; `uq_cdis_dispatch_id(companyId,dispatchLineId,id)`; `uq_cdis_slice(companyId,dispatchLineId,sliceKey)`; `uq_cdis_neutralizes(companyId,neutralizesDispositionId)`; `ix_cdis_dispatch_time(companyId,dispatchLineId,acceptedAt)`; `ix_cdis_return_confirmation(returnConfirmationId)`; `ix_cdis_consumption_confirmation(consumptionConfirmationId)`; `ix_cdis_return_line(returnLineId)`; `ix_cdis_consumption_line(consumptionLineId)`; `ix_cdis_stock_effect(stockEffectReferenceId)`; `ix_cdis_command(commandAcceptanceId)` |
| `CajasReturnConfirmation` | `uq_crcfn_company_id(companyId,id)`; `uq_crcfn_owner_lineage(companyId,id,devolucionId,dispatchId)`; `uq_crcfn_dispatch_source_seq(dispatchId,devolucionId,sequence)`; `uq_crcfn_source_dispatch_original(companyId,devolucionId,dispatchId,originalSlot)`; `uq_crcfn_command(companyId,commandAcceptanceId)`; `ix_crcfn_dispatch_time(companyId,dispatchId,acceptedAt)`; `ix_crcfn_source(devolucionId)`; `ix_crcfn_corrects(correctsConfirmationId)` |
| `CajasReturnLine` | `uq_crl_company_id(companyId,id)`; `uq_crl_dispatch_id(companyId,returnConfirmationId,dispatchId,id)`; `uq_crl_confirmation_line(returnConfirmationId,lineNumber)`; `ix_crl_company_dispatch(companyId,dispatchId,dispatchLineId)`; `ix_crl_source_item(companyId,devolucionId,devolucionItemId)`; `ix_crl_stock_scope(stockScopeReferenceId)` |
| `CajasReplacementPair` | `uq_crp_company_id(companyId,id)`; `uq_crp_return_line(companyId,returnConfirmationId,dispatchId,returnLineId)`; `ix_crp_return_lineage(companyId,returnConfirmationId,dispatchId,returnLineId)`; `ix_crp_original_line(companyId,dispatchId,originalDispatchLineId)`; `ix_crp_received_scope(receivedStockScopeReferenceId)` |
| `CajasConsumptionConfirmation` | `uq_ccc_company_id(companyId,id)`; `uq_ccc_owner_lineage(companyId,id,consumoId,dispatchId)`; `uq_ccc_dispatch_source_seq(dispatchId,consumoId,sequence)`; `uq_ccc_source_dispatch_original(companyId,consumoId,dispatchId,originalSlot)`; `uq_ccc_command(companyId,commandAcceptanceId)`; `ix_ccc_dispatch_time(companyId,dispatchId,acceptedAt)`; `ix_ccc_source(consumoId)`; `ix_ccc_corrects(correctsConfirmationId)` |
| `CajasConsumptionLine` | `uq_ccln_company_id(companyId,id)`; `uq_ccln_confirmation_line(consumptionConfirmationId,lineNumber)`; `uq_ccln_recognized_disposition(companyId,dispatchLineId,recognizedReturnDispositionId)`; `ix_ccln_company_dispatch(companyId,dispatchId,dispatchLineId)`; `ix_ccln_source_item(companyId,consumoId,consumoItemId)`; `ix_ccln_stock_scope(stockScopeReferenceId)` |
| `CajasConditionProjection` | `uq_ccp_company_id(companyId,id)`; `uq_ccp_box_scope(companyId,boxStockScopeReferenceId)`; `uq_ccp_assignment(companyId,assignmentId)`; `ix_ccp_company_condition(companyId,condition)`; `ix_ccp_company_dispatch(companyId,dispatchEligible)`; `ix_ccp_company_reuse(companyId,reuseEligible)`; `ix_ccp_company_watermark(companyId,evidenceWatermark)` |
| `CajasCommandAcceptance` | `uq_cca_company_id(companyId,id)`; `uq_cca_semantic(companyId,sourceOperationId,checkpoint,semanticKey)`; `uq_cca_audit(companyId,auditEventId)`; `ix_cca_company_accepted(companyId,acceptedAt)`; `ix_cca_result(resultEntityType,resultEntityId)`; `ix_cca_intent(intentHash)` |
| `CajasCommandEffect` | `uq_cce_company_id(companyId,id)`; `uq_cce_command_effect(commandAcceptanceId,effectKey)`; `ix_cce_company_type_time(companyId,effectType,createdAt)`; `ix_cce_stock_record(stockRecordReferenceId)`; `ix_cce_result(resultEntityType,resultEntityId)` |
| `CajasCommandAttempt` | `uq_ccat_company_id(companyId,id)`; `uq_ccat_transport(companyId,transportCorrelationId)`; `ix_ccat_intent_time(companyId,intentHash,attemptedAt)`; `ix_ccat_command_time(commandAcceptanceId,attemptedAt)`; `ix_ccat_audit_time(companyId,auditEventId,attemptedAt)`; `ix_ccat_expires(expiresAt)` |
| `CajasProjectionReconciliation` | `uq_cpr_company_id(companyId,id)`; `ix_cpr_scope_time(companyId,projectionKind,scopeId,comparedAt)`; `ix_cpr_result_time(companyId,result,comparedAt)`; `ix_cpr_repair_command(repairCommandAcceptanceId)` |

Section 7.0 lists all 32 PK names literally. All enum type names, table names, PK/FK names, unique/index names, checks, and triggers were checked at no more than 63 bytes.

The D4 P1012 Diagnose correction replaces exactly 23 scalar unique representations one-for-one with the 23 composite unique tuples required by their defining relation `fields`. It preserves all physical `map` names and the total of 199 unique/index names; it is Prisma representational only and does not change any approved 1:0..1 or optional 1:1 domain cardinality.

### 7.2 Exact future checks and append-only protections

A later D5 migration artifact should implement and independently review the following exact named constraints, without this document supplying SQL:

1. positive quantities: `ck_cfl_qty_pos`, `ck_cpl_qty_pos`, `ck_crc_qty_pos`, `ck_ccl_qty_pos`, `ck_cchl_qty_pair`, `ck_cdl_qty_pos`, `ck_cdis_qty_pos`, `ck_crl_qty_pos`, and `ck_ccln_qty_pos`;
2. non-negative projection values and positive versions: `ck_cbf_next_version`, `ck_cfc_version`, `ck_cp_version`, `ck_cpl_projection_values`, `ck_cda_version`, `ck_cdla_values`, and `ck_ccp_projection_values`;
3. accounting equality: `ck_cdla_balance` requiring `dispatchedQuantity = disposedQuantity + pendingQuantity`;
4. dispatch-accounting ownership: `ck_cda_original_dispatch` allows accounting headers only for original dispatches, and `ck_cdla_positive_line` allows line-accounting rows only for positive original/correction dispatch lines;
5. exactly one difference origin: `ck_cd_one_origin`;
6. disposition shape: `ck_cdis_record_shape` requiring exactly one owning confirmation and exactly one same-domain owning line for original, correction, and reversal rows; positive rows have no neutralization target and reversal rows have exactly one target;
7. disposition sign domain: `ck_cdis_accounting_sign` restricting `accountingSign` to `1` or `-1` with the record-kind rules in §5.5;
8. Return-line dispatch applicability: `ck_crl_dispatch_scope` permits a null `dispatchLineId` only for `added` or the received side of `replacement`; non-null dispatch lineage is enforced by `fk_crl_dispatch_line`;
9. assignment start/end completeness: `ck_ca_lifecycle_fields`;
10. one-slot domains: `ck_ca_active_slot`, `ck_crcfn_original_slot`, and `ck_ccc_original_slot`;
11. correction linkage: `ck_cdp_correction_link`, `ck_crcfn_correction_link`, and `ck_ccc_correction_link`;
12. attempt outcome nullability: `ck_ccat_outcome_shape`; accepted rows require command+audit, denied rows require audit and prohibit command, and other non-accepted rows prohibit command;
13. kind-dependent Article/Stock reference validity: `trg_cajas_reference_kind_guard`;
14. cumulative dispatch ceiling: `trg_cajas_dispatch_ceiling`;
15. dispatch-line record/sign/target shape: `ck_cdl_record_shape` and `ck_cdl_accounting_sign`;
16. cumulative signed dispatch, one-time neutralization, controlled/reserved ceiling, pending-accounting adjustment, and Stock-effect pairing: `trg_cajas_dispatch_line_fold_guard`;
17. cumulative signed disposition, single neutralization, owning-line/confirmation consistency, and non-negative pending enforcement: `trg_cajas_disposition_fold_guard`;
18. accepted-attempt audit equality with its command: `trg_cajas_attempt_audit_guard`;
19. company-scoped semantic intent conflict enforcement: `trg_cajas_semantic_intent_guard`; and
20. tenant and exact-owner lineage not covered by global User relations is enforced by the composite FKs in §6, each using the exact mapped FK name printed there; no separate lineage trigger substitutes for a representable composite FK.

`ck_cdp_correction_link` also restricts dispatch rows to `original`, `correction`, or `annulment`; `ck_crcfn_correction_link` and `ck_ccc_correction_link` do the same for confirmation headers. `ck_cdl_record_shape` and `ck_cdis_record_shape` restrict line/disposition rows to `original`, `correction`, or `reversal`; `annulment` is represented by reversal rows linked to an annulled owning header. `trg_cajas_formula_current_guard` additionally requires the pointed version to belong to the same formula/company and compare-and-advances `CajasFormulaCurrent.version` without updating accepted versions.

Exact check assignment inventory: `cajas_formula_line:{ck_cfl_qty_pos}`; `cajas_preparation_line:{ck_cpl_qty_pos,ck_cpl_projection_values}`; `cajas_reservation_correlation:{ck_crc_qty_pos}`; `cajas_control_line:{ck_ccl_qty_pos}`; `cajas_composition_change_line:{ck_cchl_qty_pair}`; `cajas_dispatch_line:{ck_cdl_qty_pos,ck_cdl_record_shape,ck_cdl_accounting_sign}`; `cajas_disposition:{ck_cdis_qty_pos,ck_cdis_record_shape,ck_cdis_accounting_sign}`; `cajas_return_line:{ck_crl_qty_pos,ck_crl_dispatch_scope}`; `cajas_consumption_line:{ck_ccln_qty_pos}`; `cajas_box_formula:{ck_cbf_next_version}`; `cajas_formula_current:{ck_cfc_version}`; `cajas_preparation:{ck_cp_version}`; `cajas_dispatch_accounting:{ck_cda_version,ck_cda_original_dispatch}`; `cajas_dispatch_line_accounting:{ck_cdla_values,ck_cdla_balance,ck_cdla_positive_line}`; `cajas_condition_projection:{ck_ccp_projection_values}`; `cajas_difference:{ck_cd_one_origin}`; `cajas_assignment:{ck_ca_lifecycle_fields,ck_ca_active_slot}`; `cajas_dispatch:{ck_cdp_correction_link}`; `cajas_return_confirmation:{ck_crcfn_original_slot,ck_crcfn_correction_link}`; `cajas_consumption_confirmation:{ck_ccc_original_slot,ck_ccc_correction_link}`; `cajas_command_attempt:{ck_ccat_outcome_shape}`. No listed check is assigned to another table.

Exact non-append guard-trigger assignment inventory: `cajas_stock_scope_reference.trg_cajas_reference_kind_guard`; `cajas_dispatch_line.trg_cajas_dispatch_ceiling`; `cajas_dispatch_line.trg_cajas_dispatch_line_fold_guard`; `cajas_disposition.trg_cajas_disposition_fold_guard`; `cajas_command_attempt.trg_cajas_attempt_audit_guard`; `cajas_command_acceptance.trg_cajas_semantic_intent_guard`; `cajas_formula_current.trg_cajas_formula_current_guard`; `cajas_assignment.trg_ca_box_scope_kind`; `cajas_reservation_correlation.trg_crc_stock_record_kind`; `cajas_dispatch_line.trg_cdl_stock_record_kind`; `cajas_disposition.trg_cdis_stock_record_kind`. No listed guard trigger is assigned to another table.

The V07 same-owner correction adds zero checks and zero triggers: its lineage is representable by the exact composite FKs and candidate keys in §§6–7.1. The existing `ck_crl_dispatch_scope` only controls nullable Return dispatch applicability; the existing dispatch/disposition fold guards retain their previously assigned cumulative and correction duties and are not substitutes for owner lineage.

Exact append-only trigger assignments, each calling `cajas_reject_evidence_mutation`, are: `cajas_article_reference→trg_car_append_only`; `cajas_stock_scope_reference→trg_cssr_append_only`; `cajas_stock_record_reference→trg_csrr_append_only`; `cajas_formula_version→trg_cfv_append_only`; `cajas_formula_line→trg_cfl_append_only`; `cajas_reservation_correlation→trg_crc_append_only`; `cajas_control→trg_cc_append_only`; `cajas_control_line→trg_ccl_append_only`; `cajas_composition_change→trg_cchg_append_only`; `cajas_composition_change_line→trg_cchl_append_only`; `cajas_difference→trg_cd_append_only`; `cajas_difference_resolution→trg_cdr_append_only`; `cajas_dispatch→trg_cdp_append_only`; `cajas_dispatch_line→trg_cdl_append_only`; `cajas_disposition→trg_cdis_append_only`; `cajas_return_confirmation→trg_crcfn_append_only`; `cajas_return_line→trg_crl_append_only`; `cajas_replacement_pair→trg_crp_append_only`; `cajas_consumption_confirmation→trg_ccc_append_only`; `cajas_consumption_line→trg_ccln_append_only`; `cajas_command_acceptance→trg_cca_append_only`; `cajas_command_effect→trg_cce_append_only`; `cajas_projection_reconciliation→trg_cpr_append_only`. No other table receives an append-only trigger. Mutable selectors/projections and bounded `CajasAssignment` lifecycle fields use their separately named checks/guards. No accepted formula-version row is mutable.

### 7.3 Exact minimum-one-line invariants

Each accepted aggregate is rejected by its named transactional service invariant before command acceptance and rechecked by its own deferred PostgreSQL constraint trigger at commit:

| Aggregate | Service invariant | Parent trigger | Child trigger | Exact rule |
| --- | --- | --- | --- | --- |
| Formula version | `INV_FORMULA_MIN_ONE_LINE` | `cajas_formula_version.trg_cfv_min_line_parent` | `cajas_formula_line.trg_cfl_min_line_child` | each accepted formula version has at least one formula line |
| Control/re-control | `INV_CONTROL_MIN_ONE_LINE` | `cajas_control.trg_cc_min_line_parent` | `cajas_control_line.trg_ccl_min_line_child` | each accepted control/recontrol has at least one control line |
| Dispatch/correction/annulment | `INV_DISPATCH_MIN_ONE_LINE` | `cajas_dispatch.trg_cdp_min_line_parent` | `cajas_dispatch_line.trg_cdl_min_line_child` | each accepted dispatch header has at least one signed dispatch line |
| Return confirmation | `INV_RETURN_MIN_ONE_LINE` | `cajas_return_confirmation.trg_crcfn_min_line_parent` | `cajas_return_line.trg_crl_min_line_child` | each accepted Return confirmation has at least one Return line |
| Consumption confirmation | `INV_CONSUMPTION_MIN_ONE_LINE` | `cajas_consumption_confirmation.trg_ccc_min_line_parent` | `cajas_consumption_line.trg_ccln_min_line_child` | each accepted Consumption confirmation has at least one Consumption line |

All ten triggers are `DEFERRABLE INITIALLY DEFERRED` constraint triggers evaluated at transaction commit. A failed parent or child check rolls back the owning command, evidence, projection, Stock effect, idempotency acceptance, and success audit together.

Prisma uniqueness accelerates and rejects obvious duplicates; service/transaction validation and D5 database constraints together own invariants that span rows. No frontend or generic AuditEvent may enforce them.

## 8. D1 and D2 traceability

### 8.1 D1 Option A

Normalized typed line models represent formula, control, dispatch, Return, Consumption, difference, resolution, and disposition evidence. `CajasPreparation`, `CajasDispatchAccounting` plus its line rows, and `CajasConditionProjection` are the three narrow mutable projection boundaries. Immutable evidence remains historical authority and each projection carries version/watermark data for reconciliation.

### 8.2 Closed D2 decisions

| Decision | Exact physical translation |
| --- | --- |
| `D2-01` | Dedicated immutable line models: `CajasFormulaLine`, `CajasControlLine`, `CajasDispatchLine`, `CajasReturnLine`, and `CajasConsumptionLine`; typed change and disposition lines remain separate. |
| `D2-02` | Control/dispatch lines retain normalized references plus immutable SKU/description/quantity/unit and applicable lot/serial/expiration/traceability captures. Live references alone are never historical evidence. |
| `D2-03` | Separate `CajasPreparation`, `CajasDispatchAccounting`/`CajasDispatchLineAccounting`, and `CajasConditionProjection`; no broad aggregate projection. |
| `D2-04` | Every critical accepted header links one `CajasCommandAcceptance`; the schema supports one atomic envelope but does not select its service/orchestrator/API/isolation implementation. |
| `D2-05` | Versioned `CajasFormulaCurrent`, `activeSlot`, preparation/accounting/condition versions, semantic-slice uniqueness, and scoped indexes provide invariant-local contention points; immutable formula versions are never updated and no global serialization is encoded. |
| `D2-06` | `CajasCommandAcceptance` + deterministic `CajasCommandEffect` keys implement hierarchical permanent semantic identity; accepted attempts require their command and matching AuditEvent, denied attempts require denial audit without a command, bounded attempt metadata remains separate, and `intentHash` detects changed intent. |
| `D2-07` | Every projection has version/watermark data; `CajasProjectionReconciliation` records continuous/scheduled comparison evidence and optional separately authorized repair correlation. No direct repair mutation is encoded. |
| `D2-08` | Verified Article/Stock references are explicit. Unverified legacy values receive no authoritative relation and remain legacy/unlinked outside these tables. |
| `D2-09` | Additive tables support write-forward evidence. Nothing backfills or activates a company/slice/environment. |
| `D2-10` | Append-only evidence, no cascade deletion, linked corrections, permanent semantic acceptance, signed dispatch-line reversals for `DISPATCH-08`, and signed disposition reversals with retained owning lines preserve original truth while deterministically neutralizing only still-reversible scope; rollout remains gated. |
| `D2-11` | `CajasReservationCorrelation` can independently reference the identified Box and each selected component scope through `CajasStockScopeReference`; exact Stock claim/ledger implementation remains Stock-owned and absent here. |
| `D2-12` | Immutable evidence and command acceptance have no expiry field; only `CajasCommandAttempt.expiresAt` supports bounded attempt-detail retention. No archive depth/schedule is selected. |
| `D2-13` | **Unresolved and non-encoded.** Resolution evidence has actor/time/cause/outcome only. No owner, assignee, role, capability, permission, or organizational responsibility field exists. |

`DISPATCH-08` is physically realized by an immutable correction/annulment `CajasDispatch` header plus one or more signed `CajasDispatchLine` rows. Each reversal line targets one prior positive line through `neutralizesDispatchLineId`, preserves its own Stock reversal effect, and adjusts the original pending-accounting scope through `trg_cajas_dispatch_line_fold_guard`; no original dispatch header, line, Remito, or Stock evidence is updated or deleted.

Frozen multiplicity permits multiple independent dispatches/remittances within an assignment and does not approve one-original-dispatch-per-Remito. Therefore `remitoId` has only `ix_cdp_remito_kind`; dispatch identity/order is `id` plus unique `(assignmentId, sequence)`, and correction chains use `correctsDispatchId`.

The owner-qualified candidate/FK chains implement D2-01, D2-10, and D2 relationship rows 8, 11, 12, and 13 without stronger multiplicity: `CajasDispatchLine` shares one `remitoId` with its dispatch and Remito item; Return/Consumption confirmations share one `remitoId` with their dispatch and source owner; each line repeats its confirmation's source-owner and dispatch IDs; replacement and recognized-disposition references remain in that dispatch. These fields prove lineage only and do not create another business owner.

## 9. Multiempresa, audit, semantics, and deletion

### 9.1 Tenant boundary

Every operational/evidence/reference/projection/correlation model carries `companyId`, and all identity, semantic uniqueness, active-slot, lookup, and history indexes begin with or retain a company-safe parent. Duplicate `companyId` fields are deliberate: they permit trusted validation and database constraints to prove same-company chains without relying on client context. They do not implement authorization.

Authentication, active membership, applicable capability, resource-company consistency, and domain validity remain separate server checks. This proposal names no role, capability identifier, provider, RLS policy, or permission mapping. Cross-company denial must remain non-disclosing and side-effect-free.

### 9.2 Monetary and quantity semantics

No Cajas model stores price, amount, currency, cost, valuation, invoice, tax, or fiscal data. `Decimal(18,4)` fields represent quantities only and always retain a unit string captured at acceptance. Cross-unit arithmetic is prohibited; no conversion engine is introduced.

### 9.3 Time semantics

Accepted business actions use explicit UTC instants stored as `timestamptz(6)`. `createdAt` is technical insertion time and cannot replace `acceptedAt`, `assignedAt`, `openedAt`, or `comparedAt`. Expiration is a calendar date (`date`). Formula applicability is determined by explicit accepted version binding, not by recalculating from wall-clock time.

### 9.4 State and status semantics

- Formula currentness uses the mutable `CajasFormulaCurrent` selector; accepted versions remain immutable. Active assignment and original-record cardinality use nullable one-slot uniqueness, not a broad state machine.
- Control/Return results are only clean/with-differences, mapped to approved public meanings.
- Difference closure is derived from immutable resolution evidence; it is not a mutable status.
- Condition may be null, `available`, or `withDifferences`; null is absence of either approved result, not a third result.
- Preparation, accounting, and eligibility are versioned projections, not history.
- Stock availability and Cajas condition remain distinct.

### 9.5 Evidence, audit, immutability, and deletion

Typed records state what was accepted. `AuditEvent`, linked once from `CajasCommandAcceptance` for success and many-to-one from accepted retry attempts to that same success event, also links denial attempts where persisted. It states actor/company/action/result context and remains complementary rather than duplicate domain evidence.

The exact append-only set is: `CajasArticleReference`, `CajasStockScopeReference`, `CajasStockRecordReference`, `CajasFormulaVersion`, `CajasFormulaLine`, `CajasReservationCorrelation`, `CajasControl`, `CajasControlLine`, `CajasCompositionChange`, `CajasCompositionChangeLine`, `CajasDifference`, `CajasDifferenceResolution`, `CajasDispatch`, `CajasDispatchLine`, `CajasDisposition`, `CajasReturnConfirmation`, `CajasReturnLine`, `CajasReplacementPair`, `CajasConsumptionConfirmation`, `CajasConsumptionLine`, `CajasCommandAcceptance`, `CajasCommandEffect`, and `CajasProjectionReconciliation`. Each receives the exact D5 append-only trigger specified in §7.2. `CajasCommandAttempt` is immutable while retained but may be archived/deleted under D2-12; it is not business evidence.

The only mutable structures are `CajasBoxFormula.nextVersion`, `CajasFormulaCurrent`, the bounded end fields and `activeSlot` on `CajasAssignment`, `CajasPreparation`, `CajasPreparationLine`, `CajasDispatchAccounting`, `CajasDispatchLineAccounting`, and `CajasConditionProjection`. Their mutation is version/command guarded and cannot rewrite accepted evidence. Corrections, annulments, reversals, and resolutions append linked records. All proposed FKs restrict deletion. Technical rollback must preserve accepted evidence and compatible readers; business neutralization requires separately approved linked correction evidence.

## 10. Minimal Stock reference contract

The contract is deliberately limited to:

1. a verified stable Article identity reference within a company;
2. a verified actionable Stock scope identity and its applicable identity kind;
3. a verified Stock reservation/effect record identity;
4. immutable descriptive/traceability captures on Cajas evidence; and
5. company and semantic correlations needed for one atomic checkpoint.

Cajas stores no Stock quantity buckets, current availability, positions, deposits, movements, reservation lifecycle, custody, or correction algorithm. `sourceArticleId`, `sourceStockScopeId`, and `sourceStockRecordId` are accepted only after the explicit verifier/time evidence on their reference row is recorded. If a later approved Stock physical design provides direct Prisma models, D4 must either bind these adapters to those models under a newly reviewed same-company FK plan or retain them as the sole verified anti-corruption boundary—never both as independent truths. That choice is a D4 dependency review, not permission to expand this proposal.

## 11. Collision and compatibility analysis

### 11.1 Current schema collisions

- None of the 32 proposed model names or 14 enum names exists in the current schema.
- The `Cajas` prefix avoids collision with financial `Payment`, generic `Invoice`, and existing Spanish operational models.
- Existing `Remito.boxId`, `RemitoItem.itemId`, and `RemitoItem.boxId` are soft strings. They must not be renamed, constrained, or backfilled by this slice.
- Existing `RemitoItem`, `ConsumoItem`, and `DevolucionItem` already contain quantity and traceability snapshots. New Cajas evidence intentionally captures its own accepted checkpoint values; it does not treat mutable/current source-line fields as immutable history.
- Existing `expirationDate DateTime?` differs from the proposed date-only evidence capture. D4 must not silently cast or backfill historical values.
- Existing status fields are mostly validated strings, while some Prisma enums exist. The proposed enums are restricted to closed approved Cajas meanings; open difference/cause/unit vocabularies remain strings to avoid rigid unapproved catalogs.
- `AuditEvent.entityType/entityId` is generic and has no FK. The new composite relations from accepted commands and persisted denied attempts to `AuditEvent(companyId,id)` add tenant-safe correlation without converting audit into domain evidence.

### 11.2 Relation and inverse-field risks

D4 will require many inverse fields on shared models. Multiple relations to `User`, preparation/control, self-correction chains, and Return/Consumption disposition origins must use the exact relation names in §6 to avoid Prisma ambiguity. `CajasPreparation.latestControlId` and `CajasControl`'s assignment relation form a legal graph but require careful inverse naming; no cascading cycle is permitted.

The prior D4 Prisma 7.8.0 P1012 Diagnose identified the 23 scalar-only unique representations corrected in §§5 and 7.1. This traceability does not revive the consumed D4 authorization: the corrected proposal is a new D3 blob requiring independent review and substantive approval, while every downstream gate remains blocked.

### 11.3 Constraint/index risks

- Prisma cannot express cross-row cumulative ceilings, XOR checks, kind-dependent nullability, append-only triggers, or all company-consistency checks.
- `@@unique([companyId, boxStockScopeReferenceId, activeSlot])`, Return `originalSlot`, and Consumption `originalSlot` intentionally rely on PostgreSQL allowing multiple NULL values while accepting only `1` as the occupied slot. Dispatch has no Remito-scoped original slot or uniqueness.
- Nullable fields in compound uniqueness require explicit tests; null must not be relied upon for semantic identities outside those four listed slot patterns.
- Index volume is substantial because evidence is history-heavy. D5 must verify the literal names in §§6.1 and 7.0–7.1 and must not substitute generated names or remove required company/history/idempotency access paths without D3 reapproval.
- Generic `resultEntityType/resultEntityId` and reconciliation `scopeId` are correlation-only, not substitutes for typed domain FKs.

### 11.4 Dirty baseline

`prisma/schema.prisma` is already modified and exactly eleven migration directories are untracked. They are foreign-owned. This proposal neither adopts nor validates their ordering, contents, database application state, or compatibility. D4/D5 require a fresh baseline, exclusive lock, and an exact diff that separates prior work from Cajas changes.

## 12. Nominal future migration preview — descriptive only

Proposed future migration name: `add_cajas_b01_physical_evidence`.

If and only if D3 is substantively approved, D4 edits the schema, and D5 is separately authorized, the nominal artifact would:

1. create the 14 mapped PostgreSQL enum types;
2. create the three verified-reference tables;
3. create command acceptance/effect/attempt tables early so later evidence can reference them;
4. create formula/version/current-selector, assignment, preparation, control/change/difference, dispatch/accounting/disposition, Return, Consumption, condition, and reconciliation tables in FK dependency order;
5. add the exact existing-target composite keys and inverse fields from §6.1; add `companyId` to RemitoItem, DevolucionItem, and ConsumoItem as nullable, deterministically populate each only from its existing owner, verify zero orphan/mismatch rows, set it non-null, replace each simple owner relation with its named composite owner FK, and add the three named owner lookup indexes plus five owner-qualified candidate keys;
6. create the nine immutable lineage columns exactly as mapped in §5.10 (`CajasDispatchLine.remitoId`; `CajasReturnConfirmation.remitoId`; `CajasReturnLine.devolucionId/dispatchId`; `CajasReplacementPair.returnConfirmationId/dispatchId`; `CajasConsumptionConfirmation.remitoId`; `CajasConsumptionLine.consumoId/dispatchId`), then add all mapped FKs, unique constraints, and indexes with the exact names in §§6–7.1; no existing business row is populated because these are new Cajas tables;
7. add the exact reviewed checks, signed dispatch/disposition fold guards, accepted-attempt audit guard, 23 individually assigned append-only triggers, and ten minimum-line constraint triggers from §§7.2–7.3; and
8. validate 32 literal PKs; 416 new-model plus 3 compatibility scalar fields; 154 new-model plus 3 owner-chain relations/FKs/actions; 183 new-model plus 16 compatibility unique/index names; 33 checks; and 44 triggers without creating Cajas evidence or mapping soft Article/Stock history.

### 12.1 Ordering/dependencies

The migration must be additive and run after all migration artifacts that define the referenced existing models. Because the current eleven migration directories are untracked and their applied state is unknown, D5 must establish one authoritative migration chain before authoring—not reorder or absorb them opportunistically. Direct Stock-model FKs, if later approved, must wait for their exact physical models and migration dependency.

### 12.2 Backfill and data compatibility

No Cajas business-evidence, Article, Stock, traceability, reservation, movement, or historical mapping backfill is proposed. The only nominal technical population is the exact parent-derived `companyId` compatibility step for existing RemitoItem, DevolucionItem, and ConsumoItem described in §12; it asserts no new business history and remains blocked pending D5 evidence. New Cajas rows begin write-forward. Existing soft IDs, text descriptions, lot/serial/expiration values, local state, and current quantities are insufficient evidence. Verified navigation-only mappings remain non-operational unless independently proven. Existing operations stay legacy/unlinked until a separate bounded write-forward gate.

### 12.3 Rollback concept

Before any accepted Cajas write, rollback may remove only the unapplied/empty candidate structures under a separately reviewed migration recovery plan. After accepted evidence exists, rollback may disable writers and restore compatible readers, but must retain all accepted evidence, Stock consequences, and audit correlations. Dropping evidence tables or deleting accepted facts is not a valid rollback. Projection repair is evidence-derived; incorrect business facts require linked correction/reversal.

No migration SQL, artifact, command, environment, or execution is authorized here.

## 13. Downstream gates

| Gate | Required next evidence | Current state |
| --- | --- | --- |
| D3 substantive approval | Independent DB/domain and SDD/governance review of this exact blob; Franco approval | **BLOCKED** |
| D4 schema edit | Fresh preflight; approved exact D3 blob; exclusive `prisma/schema.prisma` lock; schema-only Task Brief; minimal diff and Prisma validation plan | **BLOCKED** |
| D5 migration artifact | Approved D4 schema; authoritative migration baseline; migration-only Task Brief; forward/compatibility/rollback review | **BLOCKED** |
| Migration execution | Named environment, operator, commands, backup/recovery, data classification, dry-run/verification, explicit Franco go/no-go | **BLOCKED** |
| APPLY / implementation | Exact implementation slice, all applicable Auth/permissions/Cirugías/Stock/domain gates, files, validations, rollback, and explicit Franco authorization | **BLOCKED** |

Approval is non-transitive. D3 approval does not authorize D4; D4 does not authorize D5; an artifact does not authorize execution; execution does not authorize APIs/UI/rollout; no gate implies production or APPLY.

## 14. Acceptance and review checklist

### Physical mapping

- [ ] One mapping only; no competing schema alternative.
- [ ] All proposed models, fields, Prisma types, nullability, defaults, IDs, timestamps, enums, table/column mappings, relations, relation names, referential actions, unique constraints, and indexes are reviewable.
- [ ] The inventory is exactly 32 models and 14 enums; all mapped PostgreSQL identifiers are explicit and at most 63 bytes.
- [ ] All 416 new-model scalar fields and three compatibility fields have exact signatures/maps; all 154 new-model relations and three item-owner relations have exact child/inverse types, names, FK scalars/references, action pairs, FK maps, cardinality, tenant behavior, and same-owner lineage.
- [ ] All 32 PKs, 199 unique/index names, 33 checks, and 44 triggers are literally named and assigned; the 23 corrected uniques are one-for-one composite replacements with no count increase; no PostgreSQL identifier exceeds 63 bytes.
- [ ] All 32 model rows independently reconcile across scalar, physical-column, relation, cardinality, FK-action, and unique/index manifests with no collective fallback rule.
- [ ] Prisma-expressible and PostgreSQL-only constraints are clearly separated.
- [ ] Quantity precision is not represented as monetary behavior.
- [ ] Time instants and expiration dates have distinct semantics.

### Domain and evidence

- [ ] D1 Option A remains normalized, typed, append-only, and projection-aware.
- [ ] D2-01–D2-12 each have an exact physical translation.
- [ ] D2-13 remains unresolved and non-encoded.
- [ ] Formula versions are future-only; current preparations retain their bound version.
- [ ] Control/re-control is evidence-only and prior evidence remains immutable.
- [ ] Dispatch, Return, Consumption, and shared pending accounting remain separate but correlated.
- [ ] One dispatched slice receives at most one accepted disposition.
- [ ] Dispatch correction/annulment uses immutable signed line reversal, explicit one-time target linkage, Stock reversal correlation, and deterministic original-accounting fold under `DISPATCH-08`.
- [ ] Disposition correction/annulment appends a signed reversal and deterministically restores pending scope without mutating positive evidence.
- [ ] Every disposition, including reversal, retains exactly one same-domain owning confirmation and line; target neutralization is a separate relation.
- [ ] Accepted attempts require command plus matching audit; denied attempts require denial audit and prohibit command.
- [ ] Accepted retries are many-to-one to command acceptance and success AuditEvent; attempt `auditEventId` is indexed but not unique.
- [ ] Remito may own multiple original dispatches; assignment sequence and explicit correction linkage provide approved identity/order without invented Remito uniqueness.
- [ ] RemitoItem, ConsumoItem, and DevolucionItem each use a composite company+owner FK, making tenant mismatch unrepresentable.
- [ ] Dispatch, Return, Consumption, replacement, and recognized-disposition references use owner-qualified composite FKs so same-company but different-owner or different-dispatch lineage is unrepresentable.
- [ ] Formula, control, dispatch, Return, and Consumption each have separately named service and deferred DB minimum-one-line enforcement.
- [ ] Original Return and Consumption evidence is unique per owning source+dispatch while cross-dispatch input decomposes into separate confirmations.
- [ ] Assignment end preserves actor, cause, time, and accepted-command attribution independently from assignment start.
- [ ] A clean Return may establish `Disponible` directly under `RETURN-07`; after `Con diferencias`, only a subsequent clean explicit re-control may restore it.
- [ ] Corrections and annulments append links rather than rewrite history.

### Multiempresa, Stock, and compatibility

- [ ] Company is explicit on every operational/evidence/projection/reference boundary.
- [ ] Accepted-command and persisted-denial AuditEvent correlations are distinct, exact, and company-safe.
- [ ] No role, permission, capability, Auth provider, or D2-13 owner is invented.
- [ ] Stock reference models do not become a Stock ledger, balance, availability, or movement owner.
- [ ] Existing soft references are not treated as historical truth or automatic-backfill authority.
- [ ] Current dirty schema and eleven migration directories remain read-only/foreign-owned.

### Authorization

- [ ] This existing target alone was modified by the correction task.
- [ ] No Prisma/schema/migration/database/code/Auth/permissions/Cirugías/Stock implementation action occurred.
- [ ] D3 approval, D4, D5, execution, and APPLY remain independently blocked.

## 15. Open questions and risks requiring review

1. The verified-reference adapter is the minimal safe answer to absent Stock models, but D4 must confirm whether the independently approved Stock physical design will be available before schema editing. No dual identity truth is acceptable.
2. Append-only database enforcement requires D5 review of trigger/privilege strategy; application convention alone is insufficient for accepted evidence.
3. Tenant equality and exact source-owner lineage are physically specified through composite keys/FKs; the remaining risk is compatibility of adding parent-derived non-null `companyId` and owner-qualified candidate keys to the three existing item tables, which must fail closed on any orphan or mismatch during D5 review.
4. High-volume history/index growth and evidence archive implementation remain open; D2-12 prohibits expiring immutable identity/evidence but does not select hot/cold retention.
5. Current source operational records allow some mutable/deletable behavior. New restrictive FKs may expose deletion-path incompatibilities that must be resolved without weakening evidence or altering existing records silently.
6. Cumulative quantity constraints and scope-local concurrency require transaction/service design not selected here. Schema support does not itself prove race safety.
7. `CajasControlResult` is reused for Return's two approved outcomes; reviewers should confirm the shared physical enum does not imply common business ownership.
8. The exact legal/business retention schedule and audit visibility/redaction remain separate decisions.
9. D2-13 remains a hard stop for any attempt to add resolution ownership, assignee, role, capability, or permission semantics.

## 16. Exact stop conditions

Stop and return to Franco without expanding this artifact if:

1. any frozen source/hash, branch, target ownership, schema baseline, or migration set changes;
2. any second file is required;
3. D3 substantive review requires a different product or architecture decision rather than a correction of this mapping;
4. direct Stock models cannot be referenced without selecting an unapproved Stock design or creating dual truth;
5. D2-13 would require an owner, role, capability, permission, or assignment field;
6. a schema edit, migration artifact/SQL, Prisma command, database access, data mapping/backfill, implementation, provider, Auth, permissions, RLS, Cirugías/Expediente, rollout, production, or APPLY action is requested without its separate gate;
7. safe same-company and same-owner lineage, append-only evidence, no-invented-history behavior, or one-file isolation cannot be proven; or
8. a destructive migration or deletion of accepted evidence is proposed.

## 17. Closure statement

This proposal recommends one additive, company-scoped Prisma mapping for Cajas B01: verified external identity references; immutable typed formula/control/change/difference/dispatch/Return/Consumption/disposition evidence; owner-qualified dispatch/source lineage; three narrow transactional current projections; hierarchical semantic idempotency; audit correlation; and reconciliation evidence. It preserves D1 Option A and closed D2-01–D2-12, keeps Stock ownership minimal and separate, and leaves D2-13 explicitly unresolved and non-encoded. It is ready only for independent read-only verification and a later substantive D3 decision; every protected downstream action remains blocked.
