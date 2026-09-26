# CX13 Exact Rendering Proposal

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Purpose and boundary

This directory proposes 16 byte-exact CX13 object blocks: six functions, three ordinary triggers, six constraint triggers, and one exclusion constraint. It contains no CHECK object. It is documentary candidate material only and authorizes no SQL execution, migration, schema mutation, runner input, database or network access, global-root mutation, deployment, staging, production, publication, or commit.

## 2. Bound authority

| Parent | Exact binding |
|---|---|
| C13 | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`; schema blob `47313a8a85ac71ac56df93ce212593820cb95a13`; exact Stock and mapped Cajas physical names. |
| P01-P19 / P16-B / U | Blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`; selected P16-B, U01-A, and U02-A; exact 16-object CX13 inventory and P19 gate. |
| A-D / D8a | Blob `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`; Addendum D fixes three minimum-line functions, six constraint triggers, and nine events. Engram #4762 and `RECOMMENDED_PACKAGES.md` blob `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71` fix `ex_sab_position_window` as `NOT DEFERRABLE`. |
| SFO | Blob `1e5a4df989b9831343a54cd3c62237e4c8916614`; each minimum-line function owns its exact ordered two-relation set and has exactly two calling triggers. |
| J1 / D3 | Blob `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`; opening uses accepted ORIGINAL `OPENING` evidence and the approved immutable-evidence boundary. |
| TEI | Blob `237c7c5e18e4a3cf22d223c3d77b117efa400014`; six raised sites use exact C14E1 diagnostics and R0001. |
| DT | Blob `fdbdaa1da1fe97d4cac24ae347c94c6a3dff6947`; dependencies are generated-object `EXECUTES` and deduplicated company-scoped `PHYSICAL_RELATION` reads only. |
| PCA2 | `POST_EAV_CANDIDATE_ADOPTION_ADDENDUM.md`, current blob `d4ec678a129e85dcfff75283b224395dc80368ff`; inventory hash `2a7a0d519ec426249e7fcf2385f3046e8f09a802f4462aea7acd8c774520f3aa`; this candidate remains pending and creates no final root. |

## 3. Non-severable rendering decisions

| Cell | Exact decision |
|---|---|
| CX13-R01 | Emit exactly the 16 selected identities in filename order: `6 function / 3 ordinary trigger / 6 constraint trigger / 1 exclusion`, with zero CHECKs and no helper object. |
| CX13-R02 | Render `ex_sab_position_window` on `StockActivationBoundary` with equal company and position plus overlap of half-open `[cutoffAt,validUntil)` ranges; null upper bound is infinity; it is `NOT DEFERRABLE`. |
| CX13-R03 | Opening guard accepts only a same-company boundary, position, accepted ORIGINAL `OPENING` evidence header, and its exact destination-only line; header acceptance is at/after cutoff and byte-value-equal to the opening checkpoint; line quantity/unit/scale and position unit/scale match. |
| CX13-R04 | Opening rows are append-only through one unconditional APPEND_ONLY TEI site on all-column `BEFORE UPDATE OR DELETE`. |
| CX13-R05 | Policy current guard accepts only initial version 1 with no predecessor or one same-owner contiguous direct advance whose target predecessor is OLD current, target version is prior plus one, and projection version is OLD plus one. Timestamps are evidence, not ordering authority. |
| CX13-R06 | Dispatch, Return, and Consumption minimum-line functions each validate the header parent on INSERT and every OLD/NEW parent affected by line UPDATE/DELETE; zero lines rejects at deferred check time. |
| CX13-R07 | Apply Addendum D and P16-B exactly: header `AFTER INSERT`; line `AFTER UPDATE OR DELETE`; every minimum-line attachment is a `FOR EACH ROW DEFERRABLE INITIALLY DEFERRED` constraint trigger with deterministic split name. |
| CX13-R08 | Ordinary guards use U02-A all-column `BEFORE INSERT OR UPDATE`; append-only uses all-column UPDATE/DELETE. No `UPDATE OF` list exists. |
| CX13-R09 | The three minimum-line functions use SFO01-B exact no-primary relation sets; all trigger objects remain singly relation-owned and each has one EXECUTES edge. |
| CX13-R10 | Functions are `LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''`, use `$c14fn$`, write no rows, acquire no lock, and consult no projection. |
| CX13-R11 | Each function has exactly one R0001 TEI raised site; ordinary/minimum guards accept only `v_valid IS TRUE`, so FALSE and UNKNOWN reject. Native exclusion conflict remains PostgreSQL `23P01`. |
| CX13-R12 | Hashing is acyclic: direct leaf hashes cover this proposal and 16 fragments, manifest core is hashed next, and the detached root covers only the exact LF-terminated data lines excluding its own comment. |

## 4. Exact object and owner inventory

| # | Object ID | Owner / relation-use set |
|---:|---|---|
| 1 | `exclusion:ex_sab_position_window` | `"public"."StockActivationBoundary"` |
| 2 | `function:fn_stock_opening_guard` | `"public"."StockOpeningPosition"` |
| 3 | `function:fn_stock_opening_append_only` | `"public"."StockOpeningPosition"` |
| 4 | `function:fn_stock_policy_current_guard` | `"public"."StockArticleEligibility"` |
| 5 | `function:fn_cajas_dispatch_min_line` | [`"public"."cajas_dispatch"`,`"public"."cajas_dispatch_line"`] |
| 6 | `function:fn_cajas_return_min_line` | [`"public"."cajas_return_confirmation"`,`"public"."cajas_return_line"`] |
| 7 | `function:fn_cajas_consumption_min_line` | [`"public"."cajas_consumption_confirmation"`,`"public"."cajas_consumption_line"`] |
| 8 | `trigger:trg_stock_opening_guard` | `"public"."StockOpeningPosition"` |
| 9 | `trigger:trg_stock_opening_append_only` | `"public"."StockOpeningPosition"` |
| 10 | `trigger:trg_stock_policy_current_guard` | `"public"."StockArticleEligibility"` |
| 11 | `constraintTrigger:ctrg_cajas_dispatch_min_line_on_dispatch` | `"public"."cajas_dispatch"` |
| 12 | `constraintTrigger:ctrg_cajas_dispatch_min_line_on_line` | `"public"."cajas_dispatch_line"` |
| 13 | `constraintTrigger:ctrg_cajas_return_min_line_on_return` | `"public"."cajas_return_confirmation"` |
| 14 | `constraintTrigger:ctrg_cajas_return_min_line_on_line` | `"public"."cajas_return_line"` |
| 15 | `constraintTrigger:ctrg_cajas_consumption_min_line_on_consumption` | `"public"."cajas_consumption_confirmation"` |
| 16 | `constraintTrigger:ctrg_cajas_consumption_min_line_on_line` | `"public"."cajas_consumption_line"` |

## 5. Complete derived inventories and forecast

- Events: opening guard INSERT/UPDATE; opening append-only UPDATE/DELETE; policy guard INSERT/UPDATE; each of three minimum-line families has header INSERT plus line UPDATE/DELETE. Total: 15 scalar outcomes (`INSERT=5`, `UPDATE=6`, `DELETE=4`).
- EXECUTES: exactly nine trigger-to-function edges. The three shared functions each receive two; the three dedicated functions each receive one.
- READS: opening guard reads `StockActivationBoundary`, `StockEvidenceLine`, `StockEvidence`, and `StockPosition`; policy guard reads `StockArticlePolicyVersion`; each minimum-line function reads only its line relation. Repeated source occurrences deduplicate per function/target.
- Writes and CHECKs: zero. Raised sites: six, one R0001 site per function. Branches: five guarded functions each have TRUE return and ELSE raise; append-only has one unconditional raise.
- The exact fragment LF total and P19 wrapper forecast are recorded in `rendering-manifest.cj1`. Required equation: `4 + fragmentLfTotal + 15 separators + 1`; point/lower/upper are equal and MUST be `<=350`.

## 6. Static review and approval

Independent read-only review must reproduce every leaf hash, manifest-core hash, detached root, exact class/order/owner inventory, D8a half-open exclusion, opening and contiguous-policy predicates, SFO caller sets, Addendum D/P16-B event matrix, TEI sites, DT dependencies, UTF-8/NFC/LF profile, placeholder absence, and exact P19 forecast. It must execute no SQL, Prisma, migration, runner, database, catalog, network operation, global-file mutation, staging, or publication.

After independent PASS, does Franco approve the detached root in `hashes.sha256` and CX13-R01..R12 as one non-severable byte-exact documentary proposal, granting no execution, migration, schema, database, global-root, deployment, staging, production, publication, or commit authority?
