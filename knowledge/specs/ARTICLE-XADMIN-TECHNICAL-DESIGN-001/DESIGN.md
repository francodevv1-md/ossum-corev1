# Design — ARTICLE-XADMIN-TECHNICAL-DESIGN-001

**Status:** CLOSED — independent review PASS; design-only, no implementation authority.

## Evidence and approach

Article/catalog tenancy is organization-scoped; Stock/Cajas evidence is company-scoped (`prisma/schema.prisma:16-27,1581-1608,1697-1709`). Formula and physical units differ (`:1892-1910,2390-2408`). Routes retain company context/envelopes (`src/app/api/companies/[companyId]/articles/route.ts:12-29`; `src/lib/api/responses.ts:15-37`).

## Physical contract

- Enums: `ArticleType { STANDARD COMPOSITE }`; `CatalogKind { CATEGORY CLINICAL_FAMILY BRAND MANUFACTURER PRODUCT_LINE }`; `LegacyMappingStatus { MAPPED REVIEW_REQUIRED UNMAPPED REJECTED UNCHANGED_LEGACY }`; `LegacyAxis { ARTICLE CATEGORY CLINICAL_FAMILY BRAND MANUFACTURER PRODUCT_LINE DEPARTMENT SECTION SECTOR XADMIN_TYPE }`.
- `ProductCategory(id,organizationId,parentId,code,name,normalizedName,depth,isActive,deactivatedAt,version,createdAt,updatedAt)`; `ClinicalFamily`, `Brand`, `Manufacturer`, `ProductLine` use the same fields minus parent/depth. Each has organization FK, `unique(organizationId,id)`, `unique(organizationId,code)`, and active/name indexes. Category active-name uniqueness uses exactly two PostgreSQL indexes: `UNIQUE(organizationId,normalizedName) WHERE isActive AND parentId IS NULL` and `UNIQUE(organizationId,parentId,normalizedName) WHERE isActive AND parentId IS NOT NULL`.
- `CatalogAlias(id,organizationId,kind,normalizedAlias,rawAlias,categoryId?,clinicalFamilyId?,brandId?,manufacturerId?,productLineId?,source,isActive,deactivatedAt,createdAt)`: CHECK one `kind`-matching target; composite FKs; partial unique `(organizationId,kind,normalizedAlias)`.
- `Article.articleType ArticleType @default(STANDARD)` plus optional catalog IDs use composite organization FKs/indexes. `COMPOSITE` is system-managed; a deferred trigger requires same-organization `CajasBoxFormula.currentVersionId`. Legacy text remains through reconciliation and drops only after zero discrepancies.
- `XadminImportRun(id,organizationId,sourceName,sourceFileSha256,runKey,status,createdAt,finishedAt)` has uniques `(organizationId,id)` and `(organizationId,runKey)`, where `runKey=sha256(UTF8("xadmin-article-v1\0"+organizationId+"\0"+sourceFileSha256))`. `XadminArticleStageRow(id,organizationId,runId,sourceRowKey,sourceRowNumber,sourceRowSha256,sourceCode,sourceDescription,legacyXadminType,legacyDepartment,legacyRubro,legacySection,legacySector,legacyBrand,legacyLine,rawPayload)` has unique `(organizationId,id)`, unique `(organizationId,runId,sourceRowKey)`, and FK `(organizationId,runId)→XadminImportRun(organizationId,id)`. `sourceRowSha256` hashes UTF-8 `JSON.stringify` of a fixed-order array `[sourceRowNumber,code,description,type,department,rubro,section,sector,brand,line]`, preserving extracted strings exactly and using `null` for absent cells.
- `XadminArticleMapping(id,organizationId,stageRowId,axis,status,targetArticleId?,targetCategoryId?,targetClinicalFamilyId?,targetBrandId?,targetManufacturerId?,targetProductLineId?,confidence?,reviewReason?,decidedById?,decidedAt?)` has unique `(organizationId,stageRowId,axis)` and FK `(organizationId,stageRowId)→XadminArticleStageRow(organizationId,id)`. Every target uses FK `(organizationId,targetXId)→Target(organizationId,id)`. CHECK: `MAPPED` has one axis-matching target; other statuses have none. Fabricado/Reventa is only `UNCHANGED_LEGACY`; absent Sector is `UNMAPPED`; no deletes.

Row-local CHECKs enforce `depth BETWEEN 1 AND 3`, `parentId IS NULL OR parentId<>id`, and `(parentId IS NULL AND depth=1) OR (parentId IS NOT NULL AND depth IN (2,3))`. A deferred constraint trigger reads parent/descendants and enforces same-organization active parent, `child.depth=parent.depth+1`, no cycle, and `newDepth+maxRelativeSubtreeDepth<=3` on insert/reparent. Deactivate/merge/reparent is audited, version-checked, and blocked if references become invalid; no hard delete.

## API contracts

| Endpoint | Contract |
|---|---|
| `GET /api/companies/{companyId}/article-catalogs/{categories|clinical-families|brands|manufacturers|product-lines}?q&ids&parentId&includeInactive=false` | `200 {data:[{id,code,name,parentId?,depth?,isActive}]}`; aliases resolve IDs. |
| `POST .../article-catalogs/{catalog}` | Quick create `{name,parentId?}` → `201 {data:item}`; category quick-create requires active parent and creates only a leaf. |
| `PATCH .../article-catalogs/{catalog}/{id}` | Settings `{name?,isActive?,expectedVersion}`. |
| `POST .../categories/{id}/reparent` / `POST .../article-catalogs/{catalog}/{id}/merge` | `{newParentId|targetId,expectedVersion}` → `200 {data:item}`; atomic audit. |
| existing `POST/PATCH .../articles[/{id}]` | Request uses catalog IDs; create omits `articleType` or sends `STANDARD`; PATCH cannot change it. Response includes canonical catalog objects and `articleType`. |
| existing `GET .../articles` | Add `categoryIds=id,id&includeCategoryDescendants=true`; OR selected roots after server-side descendant expansion. |

Errors retain the current envelope: `400 invalid_catalog|invalid_parent|article_type_managed`, `403 forbidden`, `404 catalog_item_not_found`, `409 duplicate_catalog_name|catalog_cycle|category_depth_exceeded|catalog_in_use|version_conflict|composite_formula_required`, `422 legacy_mapping_invalid`. Role/capability selection is a separate human approval gate; routes expose guard extension points only.

## UI/data flow

Reuse Article dialog/states (`src/app/stock/page.tsx:182-225,390-475`); no redesign. `CatalogCombobox` provides single selection, keyboard search, labelled states, `aria-activedescendant`, quick-create. Stock replaces exact filtering (`:489-535,608-632`) with descendant-querying `CategoryMultiSelect`. Settings confirms governed actions; API stays authoritative. Update the adapter discarding Category/coercing types (`src/lib/stock/article-adapter.ts:55-76,144-175`).

## Cajas rollout, migration, rollback

1. Deploy `isBoxCandidate = hasCurrentVersion || articleType=='Caja'`; assignment also requires `hasCurrentVersion`; creation keeps `Caja` (`src/lib/services/cajas.service.ts:49-63`; `src/lib/services/cajas-assignment-preparation.service.ts:223-284`). Formula listing (`src/lib/services/cajas-operational.service.ts:48-93`) exposes `family ?? articleType ?? "Caja"` (`:184-191`): instead select `boxEligibility.article.category.name`, returning it or `"Sin categoría"`, never `STANDARD|COMPOSITE`.
2. Prove every existing unit remains listed and assignable with unchanged rejection reasons.
3. Dry-run/stage: verify `sourceFileSha256`, recompute each independent `sourceRowSha256`, upsert only by `(organizationId,runId,sourceRowKey)`, and reject changed row hashes; emit source=staged rows and, per axis, staged=sum(statuses), duplicates, missing targets, zero silent drops.
4. Once all versions are compatible, backfill current-formula Articles to `COMPOSITE`, others to `STANDARD`; then constrain/enum. Beforehand mixed versions see `Caja`; compatible versions accept both. Abort/revert before constraint on mismatch; afterward roll back application only and forward-fix. New formula creation sets `COMPOSITE` after its current pointer transactionally.
5. Later reviewed release removes literal compatibility. `CajasBoxFormula` remains the box model; `StockIdentifiedUnit` remains the physical box.

## Slices, tests, observability, gates

1. DB owner: schema/additive migrations; tenant/index/trigger tests. 2. Cajas owner: three services/tests, including a rollback-floor fixture proving current-formula `Caja|COMPOSITE` units stay visible/assignable, non-formula `STANDARD` is excluded, and display is canonical category or `Sin categoría`, never operational type. 3. API owner: catalog/article chain/tests. 4. UI owner: Stock/adapter/accessibility tests. 5. Data owner: dry-run/backfill/reconciliation. Ownership never overlaps.

Emit `catalog_mutation_total`, `catalog_lookup_error_total`, `legacy_rows_total{status,axis}`, `legacy_reconciliation_mismatch_total`, `cajas_candidate_total{evidence}`, and structured audit IDs. Human gates: schema/migrations; permission policy (no new role names here); DEV data execution; Cajas backfill; destructive cleanup; production/deploy.

## Decisions and tradeoffs

| Decision | Rejected alternative / reason |
|---|---|
| Typed catalogs + one alias table | Free text loses identity; polymorphic catalog weakens FKs. |
| Organization catalogs, company Cajas evidence | Company catalogs duplicate shared Article identity. |
| Adjacency tree + guarded depth | Closure table is unnecessary at depth 3. |
| Lossless staging first | Direct import cannot reconcile or roll back safely. |

Governing semantics remain: Rubro is curated only; Sección is not automatically permanent; Sector is unresolved; Fabricado/Reventa never maps automatically (`knowledge/specs/ARTICLE-XADMIN-MIGRATION-MATRIX-001/MIGRATION_MATRIX.md:43-58,73-97,109-132`).

## Closure

- Independent implementation-readiness review: PASS after correcting all confirmed blockers.
- Design ownership is released.
- Any schema, migration, Cajas compatibility, API, UI, permission, backfill, or DEV data action requires a separately approved implementation package and new ownership locks.
