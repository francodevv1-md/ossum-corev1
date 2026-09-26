# Article XADMIN Migration Matrix

Status: read-only migration design; no schema, migration, backfill, or data mutation authorized.

## Scope and ownership

This artifact translates observed legacy Article classifications into the approved conceptual model without editing files owned by the parallel Article-taxonomy session.

Approved target separation:

- operational: `articleType = STANDARD | COMPOSITE`;
- product: Category → Subcategory → optional third level;
- clinical: independent Clinical Family;
- commercial: independent Brand, Manufacturer, and optional Product Line catalogs;
- a box model is identified by `CajasBoxFormula`;
- a physical box is identified by `StockIdentifiedUnit`;
- XADMIN `Fabricado/Reventa` remains unmodified legacy evidence until its exact semantics are proven.

## Source evidence

### Legacy export

- File: `docs/CAJAS.XLS`
- SHA-256: `783CB0FE07F6C4DE17A7785B76DB76360395292CB4EC9F8F1EB653877B88C04A`
- Export timestamp printed in workbook: 2026-08-25 09:23:22
- Rows: 236
- Article codes: 236 unique, no nulls
- Descriptions: no nulls
- Brand: 103 nulls
- Product Line: 231 nulls
- No `Sector` column exists. The available columns are `Departamento`, `Rubro`, and `Sección`.

### Current configured DEV database

| Current `Article.articleType` | Rows | Formula/unit evidence |
| --- | ---: | --- |
| `Caja` | 10 | each has one `CajasBoxFormula` and one `StockIdentifiedUnit` |
| `Instrumental` | 12 | no formula and no identified unit in the inspected dataset |
| `null` | 6 | no formula and no identified unit in the inspected dataset |

These counts describe the configured DEV database only; they are not a production inventory.

## Field migration matrix

| Legacy/current source | Observed semantics | Canonical destination | Automatic? | Rule |
| --- | --- | --- | --- | --- |
| XADMIN `TIPO = Fabricado (F)` | Present on boxes, sets, implants/instrumental, motors/equipment, and disposables | `legacyXadminType` evidence only | Yes, lossless copy | Never infer `COMPOSITE`, Caja, formula, or physical-unit behavior from it |
| XADMIN `TIPO = Reventa (R)` | Two rows; one motor/saw and one implant | `legacyXadminType` evidence only | Yes, lossless copy | Never infer `STANDARD` or procurement behavior until XADMIN rules are proven |
| Current `articleType = Caja` | Exact service-layer assignment discriminator | Keep `Caja` during compatibility rollout; later migrate to `COMPOSITE` only when a `CajasBoxFormula.currentVersionId` exists | Conditional, two-phase | Formula/current-version evidence is authoritative, but services must accept the target model before any value changes |
| Current `articleType = Instrumental` | No server behavior; UI classification only | `STANDARD` unless formula evidence exists | Conditional | Product meaning moves to Category; trace behavior remains in traceability policy |
| Current `articleType = null` | Generic article | `STANDARD` unless formula evidence exists | Conditional | Flag missing Category separately; do not invent product classification |
| XADMIN `Rubro` | Broad product grouping; five values in this export | Category hierarchy candidate | Curated map | Map to canonical category IDs through aliases; do not store free text after cutover |
| XADMIN `Sección` | One-to-one with Rubro in all 236 rows | Category/Subcategory alias or discarded after verified mapping | Curated map | Do not create a permanent second axis from this export alone |
| XADMIN `Departamento` | Distinguishes six operational groups, including `CAJAS` versus `IMPLANTES E INSTRUMENTAL` inside the same Rubro/Sección | Preserve as `legacyDepartment`; promote only if workflow ownership is proven | No | Do not silently treat it as Category or Sector |
| XADMIN `Sector` | Not present in available source | Unmapped | No | Require an authoritative export or labelled XADMIN evidence |
| XADMIN `Marca` | Commercial brand; 133 populated rows | `brandId` | Alias-assisted | Normalize aliases, preserve raw value and confidence |
| XADMIN `Línea` | Sparse commercial field; only five populated rows | `productLineId?` | Manual/alias-assisted | Do not infer Manufacturer; preserve unmapped values |
| Current `family` | Free text and currently overloaded with values such as `Trauma · Clavos` | `clinicalFamilyId` plus optional clinical descendants | Curated map | Never derive automatically from Rubro/Departamento alone |

## Observed legacy groups

| Departamento | Rubro | Sección | Fabricado | Reventa | Suggested migration treatment |
| --- | --- | --- | ---: | ---: | --- |
| `CAJAS` | Implantes e instrumental quirúrgico | Implantes e instrumental quirúrgico | 69 | 0 | Candidate box/set records; require formula/composition confirmation per row |
| Implantes e instrumental quirúrgico | Implantes e instrumental quirúrgico | Implantes e instrumental quirúrgico | 71 | 1 | Mixed group; classify per article, never bulk-map to one leaf |
| Sets de implantes | Sets de implantes armados | Set de implantes armados | 39 | 0 | Candidate `Cajas y sets → Sets de implantes`; validate each composition |
| Solo SAI | Artroscopia | SAI | 36 | 0 | Candidate Artroscopia branch; determine box/set/product leaf per row |
| Motores y equipos médicos | Motores y equipos médicos | Motores y equipos médicos | 14 | 1 | Candidate Equipment branch; serial identity is trace policy, not category |
| Departamento de descartables | Descartables | Descartables | 5 | 0 | All descriptions are sets in this export; validate before mapping to set leaf |

Rubro and Sección contribute no independent split in this source: each Rubro maps to exactly one Sección and vice versa. This does not prove global XADMIN redundancy; it proves redundancy only for this export.

## Operational type derivation

After service compatibility is deployed and validated, derive behavior from relations instead of labels:

```text
if Article has a CajasBoxFormula with currentVersionId:
  articleType = COMPOSITE
else:
  articleType = STANDARD
```

Additional rules:

1. `CajasBoxFormula` identifies a box model; `COMPOSITE` alone does not.
2. `StockIdentifiedUnit` identifies physical units; neither `COMPOSITE` nor `Fabricado` creates them.
3. Lot/serial/expiry behavior comes from `ArticleTraceabilityPolicy`, not Category or operational type.
4. A source row without enough evidence remains `REVIEW_REQUIRED`; no description-only inference may become authoritative silently.

Compatibility order is mandatory:

1. Keep existing `articleType = "Caja"` values unchanged.
2. Change Cajas candidate selection and assignment guards to use formula/current-version evidence, with temporary compatibility for `"Caja"`.
3. Validate that existing physical units remain visible and assignable.
4. Only then backfill eligible rows to `COMPOSITE`.
5. Remove the legacy literal compatibility in a later reviewed change.

## Suggested row outcomes

The following paths are classification candidates for human review, not authoritative mappings from the workbook:

| Source article | Legacy evidence | Candidate operational type | Candidate product path | Candidate clinical family | Required status/evidence |
| --- | --- | --- | --- | --- | --- |
| `TR-T35TCU-003` — Caja tornillo titanio 3.5 canulado | Fabricado; Brand BIOPROTECE | `COMPOSITE` only after current-version formula confirmation | Cajas y sets → Caja quirúrgica → Tornillos canulados | Trauma | `REVIEW_REQUIRED`; confirm canonical IDs and `CajasBoxFormula.currentVersionId` |
| `CL-T00HRP-001` — Clavo de húmero titanio | Reventa | `STANDARD` unless composition evidence appears | Implantes → Clavos intramedulares → Húmero | Trauma | `REVIEW_REQUIRED`; proposed paths come from description, not an XLS taxonomy field |
| `MS-UNIOFB-001` — Motor canulado OVERFIX | Fabricado; Brand OVERFIX | `STANDARD` unless current-version formula evidence exists | Equipos → Motores quirúrgicos → Motor canulado | none proposed | `REVIEW_REQUIRED`; serial policy and canonical Category require separate evidence |

## Migration statuses

Every source row must end in exactly one status:

- `MAPPED`: canonical IDs resolved without ambiguity;
- `REVIEW_REQUIRED`: multiple candidates or missing composition evidence;
- `UNMAPPED`: no canonical destination exists yet;
- `REJECTED`: structurally invalid source row;
- `UNCHANGED_LEGACY`: preserved source evidence with no canonical semantic claim.

No migration may silently convert `REVIEW_REQUIRED` or `UNMAPPED` into a guessed category.

## Validation gates for a future implementation

1. Verify the source hash before processing.
2. Stage all 236 rows losslessly before canonical mapping.
3. Preserve source code, description, type, Departamento, Rubro, Sección, Marca, Línea, and source row identity.
4. Assert `Fabricado` never directly determines `articleType`.
5. Assert every `COMPOSITE` row has `CajasBoxFormula.currentVersionId` evidence.
6. Assert every migrated Category points to an active leaf and retains its source alias.
7. Assert Clinical Family is independent from Category.
8. Assert Brand/Manufacturer/Product Line mappings are independently resolvable.
9. Deploy and validate compatibility for current exact `articleType = "Caja"` service guards before changing any persisted values; verify existing physical units remain visible and assignable.
10. Produce counts by status and require zero silent drops.

## Known documentation conflict

`knowledge/specs/STOCK-V1-E01-SCHEMA-DESIGN-001/V1.1-ARTICLE-MASTER-FUNCTIONAL-SPEC.md:17-19` still describes implant/instrument/equipment as Article types. The parallel taxonomy owner must reconcile that text with the newer approved separation before implementation. This matrix does not edit that foreign-owned artifact.

## Next gate

The next safe step is a reviewed mapping catalog containing canonical Category and Clinical Family IDs plus explicit aliases. Schema, migration SQL, backfill execution, API, UI, Auth, permissions, and real data remain out of scope.
