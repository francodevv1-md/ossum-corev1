# Surgery core: ready for LOCAL read-only candidate dry run — 2026-10-01

**Decision:** YES without Remito, Consumo, Devolucion, Invoice or StockMovement: none is required by `Surgery` fields/FKs (`prisma/schema.prisma:393–457`). Contact resolution is required because `patientId` is NOT NULL and tenant-validated. Article is optional/nonblocking. This is **not** approval to write Surgery. 1,193 records surgery-dated 2026: 7 structurally missing patient, 357 with at least one warning; these sets overlap. 2,539 loaded 2026: 53 with at least one structural error (52 missing patient, 1 nonunique/missing ref), 1,731 with warnings. WARNINGS ≠ write-ready. `CIREMPCOD=PRINC` in 7,511 active rows and TEST in 1 (the TEST row is outside 2026 cohorts).

## Canonical field mapping for candidate construction

| Legacy field (meaning) | OSSUM destination | Required? / transformation | Absence or uncertainty |
|---|---|---|---|
| CIRCOD (technical source identity) | proposed LegacyEntityRef.legacyId (`entityType=Surgery`) | YES; preserve lexical value; do not set visibleNumber | ERROR |
| CIREMPCOD | mapped Company.id in writer, company code in staging | YES; PRINC/TEST explicit lookup, no implicit default | ERROR |
| CIRFECCAR (load day) | proposed LegacyEntityRef.sourceLoadedOn (`@db.Date`) | YES for observed cohort, source civil date | Missing/invalid ERROR; NEVER alias to `Surgery.createdAt` |
| CIRFEC (surgery day) | `Surgery.surgeryDate` **as civil-day semantic target** | optional only for undated open records; parse YYYYMMDD as calendar date | blank→null + WARNING; malformed→ERROR/REVIEW; DateTime storage policy must be approved before write |
| CIRFECLOG (material shipping day) | `Surgery.materialShippingDate @db.Date` | optional, parse civil date | blank→null; impossible value→WARNING/REVIEW |
| CIRESTADO | `Surgery.cxStatus`, with raw legacyState in staging/ledger | YES; mapping table below | unknown/SCO/TRA unresolved→REVIEW before write |
| CIRPACCOD | `Surgery.patientId` via company Contact ledger | YES; unique contact+company link needed | missing/orphan/ambiguous→ERROR per case |
| CIRMEDCOD | `Surgery.doctorId` | optional; match unique Contact | blank→null+WARNING, ambiguous→REVIEW |
| CIRHOSCOD | `Surgery.institutionId` | optional; match unique Contact | blank→null+WARNING, orphan→REVIEW |
| CIROSCOD | `Surgery.payerContactId` | optional in OSSUM, expected in legacy; unique company link | blank/orphan→REVIEW, not patient substitution |
| CIRCLICOD | **staging only**, commercial client source reference | optional; fifth Contact reference measured in dependency counts, but no verified Surgery destination | preserve raw code + match diagnostics; do NOT replace payerContactId |
| CIRTIP | `Surgery.classification` after CIRTIP code/description lookup | optional | blank→null+WARNING; unknown→REVIEW |
| VIACOD | SurgeryContactAssignment(role=salesperson) **only after identity verification** | optional, not User nor coordinator by default | keep raw ref in staging; no assignment yet |
| AUSRID | migration source actor provenance | optional source user reference, NOT createdById without explicit mapping | preserve raw; migration AuditEvent must identify controlled OSSUM actor |
| CIROBS, CIRNOTAS | historical notes source staging | optional; FPT not decoded | defer; no invented text, no dependence for core |
| CIRAUT, CIRAUTNRO | historical authorization evidence in staging | optional; don't override CIRESTADO or invent SeguimientoEntry | preserve raw; store in approved future document mechanism |
| CIRPAC/CIRMED free text | comparison-only fallback | optional; no silent Contact creation | ambiguous→REVIEW |

`Surgery.visibleNumber`: keep NULL until separately approved generation policy; CIRCOD is not the UI number (normal create generates `CX-####` from company max, `surgery.service.ts:360–386`). `createdAt` = OSSUM import time, `performedDate`/`cancelledDate` = NULL absent a proven actual event day; FIN and CAN state alone cannot supply a timestamp. `Surgery.source` = stable migration marker (e.g. `legacy:consultar-plus`), not an identity key. PrepStatus **NULL** throughout this core pass.

## State mapping: CIRESTADO is authoritative

OSSUM allowed `CX_STATUS`: unauthorized, authorized, pending, scheduled, performed, finalized, suspended, cancelled; `PREP_STATUS` is independently preparing/frozen/frozen_with_missing/shipped/delivered/returned (`validators/surgery.validator.ts:51–69`).

| Legacy | cxStatus candidate | prepStatus | Confidence / loss |
|---|---|---|---|
| SAU | unauthorized | null | CF meaning; safe semantic counterpart |
| AUT | authorized | null | CF |
| PEN | pending | null | CF |
| REA | performed | null | CF, but actual performedDate not known |
| FIN | finalized | null | CF by UI (realized + billed), no fiscal or payment state implied |
| CAN | cancelled | null | CF; cancelledDate unknown |
| SUS | suspended | null | CF |
| TRA | **UNRESOLVED for write** | null | transit may be material or surgical progression; never auto-map to shipped or scheduled |
| SCO | **UNRESOLVED for write** | null | “sin consumo” has no cxStatus equivalent; cannot assume performed or cancelled |

For TRA/SCO the dry-run records `sourceStatus` and `statusMapping=REVIEW` with `cxStatus=null`, no wouldCreate true. These cases do not block the FIN/REA subset. Do not infer surgery state from CUENTAS or STOCK.

## Calendar and timezone policy (write gate)

DBF D contains YYYYMMDD with **no time and no timezone**. `CIRFECCAR→sourceLoadedOn @db.Date`; `CIRFECLOG→materialShippingDate @db.Date`. `CIRFEC→surgeryDate` is a semantic mapping to a *civil date*, but existing `Surgery.surgeryDate DateTime?` stores an instant. A read-only dry-run carries `YYYY-MM-DD` and no `Date` JS fabricated time. **Before write**, approve either a dedicated date-only Surgery column / planned schema adjustment and UI reader compatibility, or a documented UTC-midnight *storage encoding* which is explicitly NOT an observed time and is round-tripped as a calendar day. Never call midnight the actual surgery hour; never use locale-dependent parsing. Future planned dates stay valid; impossible dates fail; unusual old/far-future dates go to REVIEW, not silent correction. Earlier frozen 13 proposed `scheduledDate`; this document resolves it to `surgeryDate` because current UI/API adapter reads `surgeryDate` as `fechaCirugia` (`surgery-adapter.ts:336`); `scheduledDate` remains a separate OSSUM planning field.
