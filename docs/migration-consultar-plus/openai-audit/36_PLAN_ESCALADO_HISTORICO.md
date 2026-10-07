# One pipeline from first core cohort to all available history

**Decision:** same staging validator, resolver and identity ledger for every wave. Contact→Surgery is the only required dependency edge; Article is independent until documents or material refs are imported. No first-wave shortcut may mint IDs based on year or reuse CIRCOD as visibleNumber.

| Wave | Core scope | Required checks |
|---|---|---|
| 0 | read-only candidate pipeline, source manifests, core mappings + TEST exclusion, native DEV matching policy when available | deterministic 50/10 controls, invariant counts, hashes, no writes |
| 1 | Jun–Sep 2026 by CIRFEC (or whole 2026 if chosen), FIN/REA first; other status/undated cases separately classified | per-ID source/tenant/contact/date/state reconciliation; rejects explicit |
| 2 | remainder 2026 by CIRFEC plus independently defined loaded-undated open cases; avoid overlap via ledger | same hash→SKIPPED; changed hash→REVIEW; no duplicate Contact/Article/Surgery |
| 3 | CIRFECCAR 2025 and/or CIRFEC 2025 with explicit union manifest | close historical Contact refs, check inactive links and notes availability |
| 4 | 2024 by explicitly versioned union | blank status record, older incomplete fields and inactive refs, no invented date |
| N | earlier usable source if later supplied | snapshot hash and schema-compat gate; current CIRFECCAR starts 2024, pre-2024 full core not demonstrated |

Era evidence in `core_closure.json.era_usage_by_load_year`: load-year rows 1,730/3,243/2,539; CIRFEC nonempty 467/1,478/1,161; CIRFECLOG 176/1,501/1,191; CIRTIP 654/1,296/832 for 2024/25/26 respectively. REA count 0/1/50, TRA 2/0/30 and PEN 2/0/18. CIRNOTAS spans 2025–26 only (`profiles.json.CIRNOTAS.years`). **These demonstrate changes of usage/completeness, not a DBF schema version change**: a single current snapshot cannot prove historical DDL. Do not invent legacy-v1/v2/v3 until a semantic break is observed by cohort on a common field.

Idempotency proof for waves: unique `(companyId,source,entityType,legacyId)` independent of period/run; “seen again” logs SKIPPED only if same source hash/strategy **and target still exists within the correct tenant/organization without conflicting native edits**; changed hash or missing target => REVIEW before controlled update/repair. Shared Contact/Article resolutions can map multiple references to one native target without creating duplicates. Each run stores predicate+snapshot hash and produces source/eligible/rejected/reused/created/updated/skipped/error counts plus field-level sample checks. Rollback never removes native or shared later-wave entities. Historical stock, Invoice and Payment have separate future writers and are not allowed to mutate or backfill core statuses implicitly.

**Next technical step after Franco approves the specification:** implement/test **only the local read-only `migration:dry-run` for Contact/Article/Surgery** using the frozen 50/10 fixture and deterministic source manifest, produce reconciliation and review the results. No schema, network DB write or migrator writer in that next step; a later explicit approved DEV package would be needed to design ledger DDL and historical writer.
