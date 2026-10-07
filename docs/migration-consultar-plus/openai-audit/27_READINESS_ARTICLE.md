# Article: ready for a LOCAL read-only candidate dry run — 2026-10-01

**Decision:** YES, independent of Surgery, unless a specific later-wave document needs an Article FK. NOT ready to write. `core_closure.json.article`, `schema.prisma:2782–2861`, `article.service.ts:62–143`, `validators/article.ts` are evidence; DEV match UNKNOWN.

ARTICULO 5,902 active DBF records; ARTCOD `1301-T1S` appears twice with **different descriptions**, so must NOT merge by code; a zero-only code occurs once and 3 lack ARTDES (create requires nonempty description). `ARTACT=S` 5,769 / `N` 133. 18 duplicate nontrivial barcode groups are ambiguity candidates. ARTATRI 24,169 active rows (21 deleted), 4,551 article codes affected; common attribute keys: GTING 4,360, PM 4,359, TRAZABLE 2,656. These are raw attributes, **not verified GS1 identifiers or traceability policies**. Supplementary formula/BOM, prices and historic costing are outside the core candidate writer.

En todo el STOCK1 activo se observan **5.760 ARTCOD distintos** y **289 líneas sin coincidencia exacta** con ARTICULO (`metrics.json.joins`); son evidencias de uso histórico, no necesariamente 5.760 artículos únicos importables. Resolver el duplicado y los huérfanos antes de proponer asociaciones operativas.

Surgery has no required Article FK (`schema.prisma:393–456`). Therefore minimal Surgery-only import needs **0 Article entities**. If optional material references are preserved in an external read-only report, STOCK/STOCK1 dependency closure gives 3,443 ARTCOD for `CIRFEC 2026` or 3,249 for Jun–Sep; each has 3 codes absent/ambiguous in ARTICULO, and none should cause Surgery to fail. These are optional *evidence* from 143,293/72,802 STOCK1 lines, not core lines to import.

| Action | Rule (dry-run only) |
|---|---|
| MATCH | Ledger first by `(source,companyId,Article,ARTCOD)`. Else scoped native lookup by `(organizationId,sku)` or trusted ArticleIdentifier; supplier-qualified identifiers need supplier context. |
| REUSE | Unique native Article with compatible description/type/manufacturer and company StockArticleEligibility policy resolved. Never alter native SKU/price/stock automatically. |
| CREATE | One valid nonzero ARTCOD, one nonempty description, organization resolved; proposal uses an explicit collision-safe new SKU, not ARTCOD unless uniquely approved; preserve ARTCOD in ledger. Defaults for VAT/unit/traceability require policy decision, not guessed legal attributes. |
| REVIEW | Duplicate `1301-T1S`, barcode collisions, name/identity conflict, inactives, VAT/GTIN mapping ambiguity, missing eligibility. |
| REJECT | Zero-only/empty ARTCOD or no description without approved recovery source, tenant/organization unresolved. |

OSSUM `createArticle` also creates an eligibility record, identifier/supplier mapping and traceability policy, assigns SKU if missing and writes AuditEvent (`article.service.ts:62–143`): not a neutral import. A dry-run without DEV returns unresolved candidate actions, not fabricated `wouldCreate=true`.
