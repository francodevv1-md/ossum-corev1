# C14 Rendering Completion Proposal

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

Proposal ID: `C14-SIMPLIFICATION-001-RENDERING-COMPLETION`

## 1. Boundary, lock, and authority

This proposal closes exactly the 27 token-level blockers reported by Engram #5039 and the source-writer report: 21 CHECK objects and six GUARD functions. It proposes `RC01–RC12` as one non-severable rendering decision. It introduces no object, relation, event, business branch, write, lock, or execution authority. The approved semantic proposal remains bound by Git blob `b1921bc7189108620197df45a4d47538dd3bbf6e`; C13 remains commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`, schema blob `47313a8a85ac71ac56df93ce212593820cb95a13`.

The sole-writer lock for this artifact is `reserved → editing → review → released`. Only this file is writable. Every SQL block below is documentary UTF-8/LF source data, not a command. No database, Prisma, network, migration, runner, or runtime assumption is used.

Independent review Engram #5041 reproduced six bounded defects in prior blob `3b35fc8cbc7b9d7338a437625d6b82453a29494f`: SC11 omitted the RC06 overflow guard; SC12 overstated ATM counts; SC53 enforced only per-row rather than cumulative controlled-scope ceilings and omitted header sequence from ordering; SC54 misclassified trigger owners as READS; and SC06 used collation-sensitive text equality for the unchanged token. This revision changes only those six contracts and their derived identities/forecasts.

Follow-up Diagnose of that revision found two serialization defects: SC11's protective SQL `CASE` created an unapproved decision site, and the explicit outer EXISTS/FILTER Boolean roots required by the P19 parser model were not fully source-span bound. The present bytes replace only that CASE arithmetic and add the six missing root/span/hash records; all previously corrected business predicates remain unchanged.

## 2. Non-severable RC decisions

1. **RC01 — physical rendering.** Use exact C13 physical names; quote every schema, relation, column, constraint, and function identifier; schema-qualify every relation/function with `"public"`; uppercase SQL keywords; two-space body indentation; `$c14fn$`; one terminal LF.
2. **RC02 — CHECK truth.** Every complete predicate is enclosed by `CHECK ((predicate) IS TRUE)`. SQL UNKNOWN therefore rejects. No predicate relies on CHECK's default UNKNOWN acceptance.
3. **RC03 — equality.** Use `=`/`<>` for required non-null scalars, `IS NOT DISTINCT FROM`/`IS DISTINCT FROM` for nullable scalar/row equality, and explicit `IS NULL`/`IS NOT NULL` for shape.
4. **RC04 — decimal representability.** A nullable `numeric(24,4)` quantity is representable at `scale_snapshot` exactly when `scale_snapshot BETWEEN 0 AND 4` and `quantity = trunc(quantity, scale_snapshot)`. No text conversion or floating arithmetic is used.
5. **RC05 — bytewise text comparison.** Exact token equality/inequality is respectively `convert_to(NEW."evidenceWatermark", 'UTF8') = convert_to(OLD."evidenceWatermark", 'UTF8')` and `convert_to(NEW."evidenceWatermark", 'UTF8') <> convert_to(OLD."evidenceWatermark", 'UTF8')`; deterministic text ordering uses `convert_to(text, 'UTF8')`. Every operand is `bytea`; no text collation participates.
6. **RC06 — integer overflow.** Trigger-row one-step advance is `OLD."version" < 2147483647 AND NEW."version" = OLD."version" + 1`; CHECK arithmetic first casts both operands and the increment literal to `bigint`, constrains the prior value to `1..2147483646` and the result to `1..2147483647`, then compares the exact `+1`. Both forms are branch-free and cannot overflow their evaluated addition.
7. **RC07 — guard execution.** Each GUARD is `VOLATILE SECURITY INVOKER SET search_path = ''`, reads transaction-visible rows without acquiring locks, uses no dynamic SQL, and accepts only `v_valid IS TRUE`; FALSE/NULL reaches one R0001 raise.
8. **RC08 — guard diagnostics.** Every raise uses SQLSTATE `23514`, message `C14 invariant violation`, exact C14E1 DETAIL, function-derived HINT, and runtime `CONSTRAINT/SCHEMA/TABLE`; families are `ROW_OR_CROSS_ROW_GUARD` for SC05/06/54/56 and `AGGREGATE_OR_SERIALIZATION_GUARD` for SC53/55.
9. **RC09 — aggregate ordering and scope.** Dispatch lineage is grouped by the controlled physical identity `(source_control_line_id,article_id,stock_position_id,stock_unit,scale_snapshot)` and ordered by header `sequence`, then line `line_number`, then UTF-8 bytes of line `id`; prefix windows use that total order. Every prefix and final grouped net must be within `[0,control.quantity]`. No unspecified row order is semantically consulted.
10. **RC10 — shared dispatch and command lookup.** SC54 dispatches solely by exact `(TG_TABLE_SCHEMA,TG_TABLE_NAME)` to the two SFO owners. Any other caller yields `v_valid=false` and the same R0001 site. The dispatch-line arm reads `cajas_dispatch` solely to compare the immutable header `command_acceptance_id` with `StockEvidence.commandAcceptanceId`; this narrowly corrects SC54's prose dependency list, which omitted the relation required by its already-approved same-command rule. It changes no business predicate.
11. **RC11 — parser closure.** The inventories in §§4–5 are exact source-preserving ASTs. Parentheses are GROUP nodes and are never flattened. Every SQL Boolean clause (`ON`, `WHERE`, `FILTER`, `HAVING`), assignment Boolean, and PL/pgSQL `IF` condition is a root; every comparison, null test, membership test, regex, `EXISTS`, and scalar Boolean reference is an ATM leaf.
12. **RC12 — atomicity.** Approval selects all RC decisions and all 27 blocks together. No row-level approval exists. Any byte change requires a new whole-file identity and independent review.

## 3. Exact blocker inventory

| # | SC / ordinal | Object ID |
|---:|---|---|
| 1–3 | `SC02/01`, `SC03/02`, `SC04/03` | `check:ck_sp_trace_axis`; `check:ck_sp_scale_range`; `check:ck_siuo_version_positive` |
| 4–21 | `SC11/01` … `SC28/18` | `check:ck_cchg_version_step`; `check:ck_cchl_change_shape`; `check:ck_cchl_quantity_scale`; `check:ck_cd_origin_shape`; `check:ck_cdp_record_shape`; `check:ck_cdl_record_sign_shape`; `check:ck_cdl_quantity_scale`; `check:ck_cda_version_positive`; `check:ck_cdla_balance_scale_version`; `check:ck_crcfn_record_slot_version`; `check:ck_crl_dispatch_kind_shape`; `check:ck_crl_quantity_scale`; `check:ck_ccc_record_slot_version`; `check:ck_ccln_quantity_scale`; `check:ck_cdis_owner_shape`; `check:ck_cdis_record_sign_shape`; `check:ck_cdis_quantity_scale`; `check:ck_ccp_counts_version` |
| 22–27 | `SC05/04`, `SC06/05`, `SC53/31`, `SC54/32`, `SC55/33`, `SC56/34` | `function:fn_stock_position_parent_guard`; `function:fn_stock_identified_unit_exclusivity`; `function:fn_cajas_dispatch_ceiling`; `function:fn_cajas_stock_link_guard`; `function:fn_cajas_disposition_fold_guard`; `function:fn_cajas_condition_assignment_guard` |

Each ID occurs once. Class counts are `21 CHECK + 6 FUNCTION = 27`.

## 4. Exact CHECK bytes and closed ASTs

Each fenced block's payload is the exact fragment bytes from its first `ALTER` through its LF after `;`; Markdown fences are excluded. For every block: `OBJECT=[0,byteLength)`; `PREDICATE` is the half-open UTF-8 span beginning at the first token after `CHECK (` and ending immediately before `) IS TRUE`; `ROOT` equals `PREDICATE`; each leaf span is the exact first unmatched source occurrence represented by the ordered S-expression. `AND[n]`, `OR[n]`, and `GROUP[x]` preserve displayed source order; `ATOM[x]` is one parser ATM occurrence. Expected inventory is exactly one object, one predicate root, the displayed Boolean tree/ATM occurrences, no decision point, branch, event, dependency, or TEI error, and one native `23514` error.

### SC02–SC04

```sql
ALTER TABLE "public"."StockPosition"
  ADD CONSTRAINT "ck_sp_trace_axis"
  CHECK ((("traceMode" = 'NONE' AND "lotId" IS NULL AND "identifiedUnitId" IS NULL) OR ("traceMode" = 'LOT' AND "lotId" IS NOT NULL AND "identifiedUnitId" IS NULL) OR ("traceMode" = 'IDENTIFIED_UNIT' AND "lotId" IS NULL AND "identifiedUnitId" IS NOT NULL)) IS TRUE);
```
AST: `OR[GROUP(AND[=(traceMode,'NONE'),IS_NULL(lotId),IS_NULL(identifiedUnitId)]),GROUP(AND[=(traceMode,'LOT'),IS_NOT_NULL(lotId),IS_NULL(identifiedUnitId)]),GROUP(AND[=(traceMode,'IDENTIFIED_UNIT'),IS_NULL(lotId),IS_NOT_NULL(identifiedUnitId)])]`; 9 ATM occurrences.

```sql
ALTER TABLE "public"."StockPosition"
  ADD CONSTRAINT "ck_sp_scale_range"
  CHECK (("quantityScale" BETWEEN 0 AND 4) IS TRUE);
```
AST: `BETWEEN(quantityScale,0,4)`; 1 ATM.

```sql
ALTER TABLE "public"."StockIdentifiedUnitOccupancy"
  ADD CONSTRAINT "ck_siuo_version_positive"
  CHECK (("version" > 0) IS TRUE);
```
AST: `>(version,0)`; 1 ATM.

### SC11–SC14

```sql
ALTER TABLE "public"."cajas_composition_change"
  ADD CONSTRAINT "ck_cchg_version_step"
  CHECK ((("prior_preparation_version"::bigint >= 1::bigint) AND ("prior_preparation_version"::bigint <= 2147483646::bigint) AND ("resulting_preparation_version"::bigint = "prior_preparation_version"::bigint + 1::bigint) AND ("resulting_preparation_version"::bigint BETWEEN 1::bigint AND 2147483647::bigint)) IS TRUE);
```
AST: `AND[>=(CAST_BIGINT(prior_preparation_version),CAST_BIGINT(1)),<=(CAST_BIGINT(prior_preparation_version),CAST_BIGINT(2147483646)),=(CAST_BIGINT(resulting_preparation_version),+(CAST_BIGINT(prior_preparation_version),CAST_BIGINT(1))),BETWEEN(CAST_BIGINT(resulting_preparation_version),CAST_BIGINT(1),CAST_BIGINT(2147483647))]`; 4 ATM occurrences, one `AND[4]`, one bigint `+`, 10 explicit `::bigint` cast occurrences, zero CASE/DECISION_POINT/BRN. The addition operands are bigint and the explicit canonical ranges make overflow impossible.

```sql
ALTER TABLE "public"."cajas_composition_change_line"
  ADD CONSTRAINT "ck_cchl_change_shape"
  CHECK ((("kind" = 'add' AND "prior_preparation_line_id" IS NULL AND "prior_article_id" IS NULL AND "prior_stock_position_id" IS NULL AND "prior_quantity" IS NULL AND "prior_trace_capture" IS NULL AND "resulting_preparation_line_id" IS NOT NULL AND "resulting_article_id" IS NOT NULL AND "resulting_quantity" > 0) OR ("kind" = 'remove' AND "prior_preparation_line_id" IS NOT NULL AND "prior_article_id" IS NOT NULL AND "prior_quantity" > 0 AND "resulting_preparation_line_id" IS NULL AND "resulting_article_id" IS NULL AND "resulting_stock_position_id" IS NULL AND "resulting_quantity" IS NULL AND "resulting_trace_capture" IS NULL) OR ("kind" = 'replace' AND "prior_preparation_line_id" IS NOT NULL AND "prior_article_id" IS NOT NULL AND "prior_quantity" > 0 AND "resulting_preparation_line_id" IS NOT NULL AND "resulting_article_id" IS NOT NULL AND "resulting_quantity" > 0 AND ("prior_article_id" IS DISTINCT FROM "resulting_article_id" OR "prior_stock_position_id" IS DISTINCT FROM "resulting_stock_position_id") AND "prior_quantity" = "resulting_quantity" AND "prior_trace_capture" IS NOT DISTINCT FROM "resulting_trace_capture") OR ("kind" = 'quantity' AND "prior_preparation_line_id" IS NOT NULL AND "resulting_preparation_line_id" = "prior_preparation_line_id" AND "prior_article_id" IS NOT NULL AND "resulting_article_id" = "prior_article_id" AND "prior_stock_position_id" IS NOT DISTINCT FROM "resulting_stock_position_id" AND "prior_quantity" > 0 AND "resulting_quantity" > 0 AND "prior_quantity" <> "resulting_quantity" AND "prior_trace_capture" IS NOT DISTINCT FROM "resulting_trace_capture") OR ("kind" = 'traceability' AND "prior_preparation_line_id" IS NOT NULL AND "resulting_preparation_line_id" = "prior_preparation_line_id" AND "prior_article_id" IS NOT NULL AND "resulting_article_id" = "prior_article_id" AND "prior_stock_position_id" IS NOT DISTINCT FROM "resulting_stock_position_id" AND "prior_quantity" > 0 AND "resulting_quantity" = "prior_quantity" AND "prior_trace_capture" IS DISTINCT FROM "resulting_trace_capture")) IS TRUE);
```
AST: `OR[AND[ADD,5 prior-absent,3 result-present],AND[REMOVE,3 prior-present,5 result-absent],AND[REPLACE,6 side-present,OR[article-distinct,position-distinct],quantity-equal,trace-null-safe-equal],AND[QUANTITY,line-equal,article-equal,position-null-safe-equal,prior-positive,result-positive,quantity-distinct,trace-null-safe-equal],AND[TRACEABILITY,line-equal,article-equal,position-null-safe-equal,prior-positive,quantity-equal,trace-null-safe-distinct]]`; exact ATM counts by arm `9/9/11/10/9`, total 48. This is the closed SC12 equality map.

```sql
ALTER TABLE "public"."cajas_composition_change_line"
  ADD CONSTRAINT "ck_cchl_quantity_scale"
  CHECK ((("scale_snapshot" BETWEEN 0 AND 4) AND ("prior_quantity" IS NULL OR ("prior_quantity" > 0 AND "prior_quantity" = trunc("prior_quantity", "scale_snapshot"))) AND ("resulting_quantity" IS NULL OR ("resulting_quantity" > 0 AND "resulting_quantity" = trunc("resulting_quantity", "scale_snapshot")))) IS TRUE);
```
AST: `AND[BETWEEN(scale_snapshot,0,4),OR[IS_NULL(prior_quantity),AND[prior>0,prior=trunc(prior,scale)]],OR[IS_NULL(resulting_quantity),AND[result>0,result=trunc(result,scale)]]]`; 7 ATM. This is the exact SC13 decimal formula.

```sql
ALTER TABLE "public"."cajas_difference"
  ADD CONSTRAINT "ck_cd_origin_shape"
  CHECK ((("kind" = 'CONTROL' AND "control_line_id" IS NOT NULL AND "origin_dispatch_id" IS NULL AND "origin_remito_id" IS NULL AND "dispatch_line_id" IS NULL AND "return_confirmation_id" IS NULL AND "return_line_id" IS NULL) OR ("kind" = 'DISPATCH' AND "control_line_id" IS NULL AND "origin_dispatch_id" IS NOT NULL AND "origin_remito_id" IS NOT NULL AND "dispatch_line_id" IS NOT NULL AND "return_confirmation_id" IS NULL AND "return_line_id" IS NULL) OR ("kind" = 'RETURN' AND "control_line_id" IS NULL AND "origin_dispatch_id" IS NOT NULL AND "origin_remito_id" IS NULL AND "dispatch_line_id" IS NULL AND "return_confirmation_id" IS NOT NULL AND "return_line_id" IS NOT NULL)) IS TRUE);
```
AST: `OR[AND[CONTROL,control!,dispatch/remito/dispatchLine/confirmation/returnLine null],AND[DISPATCH,control null,dispatch/remito/dispatchLine!,confirmation/returnLine null],AND[RETURN,control/remito/dispatchLine null,dispatch/confirmation/returnLine!]]`; 21 ATM. CHECK owns only kind/nullability. C13 FKs `fk_cd_control_line`, `fk_cd_dispatch`, `fk_cd_dispatch_line`, and `fk_cd_return_line` exclusively own composite company/assignment/dispatch/remito/confirmation equality; no equality atom is falsely attributed to this CHECK.

### SC15–SC21

```sql
ALTER TABLE "public"."cajas_dispatch"
  ADD CONSTRAINT "ck_cdp_record_shape"
  CHECK ((("record_kind" = 'ORIGINAL' AND "corrects_dispatch_id" IS NULL AND "sequence" > 0) OR ("record_kind" = 'CORRECTION' AND "corrects_dispatch_id" IS NOT NULL AND "sequence" > 0)) IS TRUE);
```
AST: `OR[AND[ORIGINAL,corrects-null,sequence>0],AND[CORRECTION,corrects-not-null,sequence>0]]`; 6 ATM.

```sql
ALTER TABLE "public"."cajas_dispatch_line"
  ADD CONSTRAINT "ck_cdl_record_sign_shape"
  CHECK ((("record_kind" = 'ORIGINAL' AND "accounting_sign" = 1 AND "neutralizes_dispatch_line_id" IS NULL) OR ("record_kind" = 'REVERSAL' AND "accounting_sign" = -1 AND "neutralizes_dispatch_line_id" IS NOT NULL)) IS TRUE);
```
AST: two three-ATM arms; 6 ATM.

```sql
ALTER TABLE "public"."cajas_dispatch_line"
  ADD CONSTRAINT "ck_cdl_quantity_scale"
  CHECK ((("quantity" > 0) AND ("scale_snapshot" BETWEEN 0 AND 4)) IS TRUE);
```
AST: `AND[quantity>0,BETWEEN(scale,0,4)]`; 2 ATM.

```sql
ALTER TABLE "public"."cajas_dispatch_accounting"
  ADD CONSTRAINT "ck_cda_version_positive"
  CHECK (("version" > 0) IS TRUE);
```
AST: 1 ATM.

```sql
ALTER TABLE "public"."cajas_dispatch_line_accounting"
  ADD CONSTRAINT "ck_cdla_balance_scale_version"
  CHECK ((("dispatched_quantity" >= 0) AND ("disposed_quantity" >= 0) AND ("pending_quantity" >= 0) AND ("pending_quantity" = "dispatched_quantity" - "disposed_quantity") AND ("scale_snapshot" BETWEEN 0 AND 4) AND ("version" > 0)) IS TRUE);
```
AST: one six-child AND; 6 ATM.

```sql
ALTER TABLE "public"."cajas_return_confirmation"
  ADD CONSTRAINT "ck_crcfn_record_slot_version"
  CHECK ((("record_kind" = 'ORIGINAL' AND "original_slot" = 1 AND "corrects_confirmation_id" IS NULL AND "observed_accounting_version" > 0) OR ("record_kind" = 'CORRECTION' AND "original_slot" IS NULL AND "corrects_confirmation_id" IS NOT NULL AND "observed_accounting_version" > 0)) IS TRUE);
```
AST: two four-ATM arms; 8 ATM.

```sql
ALTER TABLE "public"."cajas_return_line"
  ADD CONSTRAINT "ck_crl_dispatch_kind_shape"
  CHECK ((("kind" = 'unchanged' AND "dispatch_line_id" IS NOT NULL) OR ("kind" = 'consumed' AND "dispatch_line_id" IS NOT NULL) OR ("kind" = 'missing' AND "dispatch_line_id" IS NOT NULL) OR ("kind" = 'damaged' AND "dispatch_line_id" IS NOT NULL) OR ("kind" = 'under_review' AND "dispatch_line_id" IS NOT NULL) OR ("kind" = 'added' AND "dispatch_line_id" IS NULL) OR ("kind" = 'replacement' AND "dispatch_line_id" IS NULL)) IS TRUE);
```
AST: exact seven ordered two-ATM arms with literals `unchanged,consumed,missing,damaged,under_review,added,replacement`; 14 ATM. This is SC21's exact seven-literal expression.

### SC22–SC28

```sql
ALTER TABLE "public"."cajas_return_line"
  ADD CONSTRAINT "ck_crl_quantity_scale"
  CHECK ((("quantity" > 0) AND ("scale_snapshot" BETWEEN 0 AND 4)) IS TRUE);
```
AST: 2 ATM.

```sql
ALTER TABLE "public"."cajas_consumption_confirmation"
  ADD CONSTRAINT "ck_ccc_record_slot_version"
  CHECK ((("record_kind" = 'ORIGINAL' AND "original_slot" = 1 AND "corrects_confirmation_id" IS NULL AND "observed_accounting_version" > 0) OR ("record_kind" = 'CORRECTION' AND "original_slot" IS NULL AND "corrects_confirmation_id" IS NOT NULL AND "observed_accounting_version" > 0)) IS TRUE);
```
AST: two four-ATM arms; 8 ATM.

```sql
ALTER TABLE "public"."cajas_consumption_line"
  ADD CONSTRAINT "ck_ccln_quantity_scale"
  CHECK ((("quantity" > 0) AND ("scale_snapshot" BETWEEN 0 AND 4)) IS TRUE);
```
AST: 2 ATM; no kind atom exists.

```sql
ALTER TABLE "public"."cajas_disposition"
  ADD CONSTRAINT "ck_cdis_owner_shape"
  CHECK ((("return_confirmation_id" IS NOT NULL AND "return_line_id" IS NOT NULL AND "consumption_confirmation_id" IS NULL AND "consumption_line_id" IS NULL) OR ("return_confirmation_id" IS NULL AND "return_line_id" IS NULL AND "consumption_confirmation_id" IS NOT NULL AND "consumption_line_id" IS NOT NULL)) IS TRUE);
```
AST: two four-ATM owner arms; 8 ATM.

```sql
ALTER TABLE "public"."cajas_disposition"
  ADD CONSTRAINT "ck_cdis_record_sign_shape"
  CHECK ((("record_kind" = 'ORIGINAL' AND "accounting_sign" = 1 AND "neutralizes_disposition_id" IS NULL) OR ("record_kind" = 'REVERSAL' AND "accounting_sign" = -1 AND "neutralizes_disposition_id" IS NOT NULL)) IS TRUE);
```
AST: two three-ATM arms; 6 ATM.

```sql
ALTER TABLE "public"."cajas_disposition"
  ADD CONSTRAINT "ck_cdis_quantity_scale"
  CHECK ((("quantity" > 0) AND ("scale_snapshot" BETWEEN 0 AND 4)) IS TRUE);
```
AST: 2 ATM.

```sql
ALTER TABLE "public"."cajas_condition_projection"
  ADD CONSTRAINT "ck_ccp_counts_version"
  CHECK ((("open_difference_count" >= 0) AND ("pending_dispatch_scope_count" >= 0) AND ("version" > 0)) IS TRUE);
```
AST: one three-child AND; 3 ATM. No condition, eligibility, reason, lifecycle, or operation-end atom exists.

## 5. Exact GUARD bytes and closed AST contracts

Every fenced payload is exact documentary function bytes. Full-span locator is `[0,byteLength)`. `DECLARE` spans from `DECLARE` through the LF before `BEGIN`; each query span begins at its `SELECT`/`WITH` and ends after its semicolon; each branch locator is the exact `IF…END IF;` span; RETURN and RAISE locators are their exact statement spans. The independent parser computes numeric UTF-8 offsets by exact substring search and MUST find each named locator exactly once; ambiguity is failure. Query roots are every displayed `ON`, `WHERE`, `FILTER`, `HAVING`, SELECT Boolean expression, assignment Boolean expression, and `IF` condition. The dependency inventory is exactly the unique READS list stated after each block; no WRITES/lock dependency exists.

### SC05 — `function:fn_stock_position_parent_guard`

```sql
CREATE FUNCTION "public"."fn_stock_position_parent_guard"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "public"."StockArticleEligibility" AS "eligibility"
    JOIN "public"."StockArticlePolicyVersion" AS "policy"
      ON "policy"."companyId" = "eligibility"."companyId"
     AND "policy"."eligibilityId" = "eligibility"."id"
     AND "policy"."id" = NEW."policyVersionId"
    JOIN "public"."StockContext" AS "context"
      ON "context"."companyId" = NEW."companyId"
     AND "context"."id" = NEW."contextId"
    LEFT JOIN "public"."StockLot" AS "lot"
      ON "lot"."companyId" = NEW."companyId"
     AND "lot"."articleId" = NEW."articleId"
     AND "lot"."id" = NEW."lotId"
    LEFT JOIN "public"."StockIdentifiedUnit" AS "unit"
      ON "unit"."companyId" = NEW."companyId"
     AND "unit"."articleId" = NEW."articleId"
     AND "unit"."id" = NEW."identifiedUnitId"
    WHERE "eligibility"."companyId" = NEW."companyId"
      AND "eligibility"."articleId" = NEW."articleId"
      AND "eligibility"."id" = NEW."eligibilityId"
      AND "eligibility"."currentPolicyVersionId" = NEW."policyVersionId"
      AND "policy"."eligible" IS TRUE
      AND "policy"."traceMode" = NEW."traceMode"
      AND "policy"."stockUnit" = NEW."stockUnit"
      AND "policy"."quantityScale" = NEW."quantityScale"
      AND ((NEW."traceMode" = 'NONE' AND NEW."lotId" IS NULL AND NEW."identifiedUnitId" IS NULL) OR (NEW."traceMode" = 'LOT' AND NEW."lotId" IS NOT NULL AND NEW."identifiedUnitId" IS NULL AND "lot"."id" IS NOT NULL) OR (NEW."traceMode" = 'IDENTIFIED_UNIT' AND NEW."lotId" IS NULL AND NEW."identifiedUnitId" IS NOT NULL AND "unit"."id" IS NOT NULL))
  ) INTO v_valid;
  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_position_parent_guard;function=fn_stock_position_parent_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_POSITION_PARENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
```
AST inventory: declaration `v_valid:boolean`; SELECT root `EXISTS(query)`; JOIN roots `policy(3),context(2),lot(3),unit(3)`; WHERE root `AND[eligibility company/article/id/current-policy,policy eligible/trace/unit/scale,OR[NONE(3),LOT(4),IDENTIFIED_UNIT(4)]]`; IF root `IS_TRUE(v_valid)`; outcomes `RETURN_NEW`, `ELSE_RAISE`; one R0001. READS exactly `StockArticleEligibility,StockArticlePolicyVersion,StockContext,StockLot,StockIdentifiedUnit`.

### SC06 — `function:fn_stock_identified_unit_exclusivity`

```sql
CREATE FUNCTION "public"."fn_stock_identified_unit_exclusivity"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  SELECT (NEW."evidenceWatermark" ~ '^cx04:[0-9a-f]{64}$') AND EXISTS (
    SELECT 1 FROM "public"."StockPosition" AS "position"
    WHERE "position"."companyId" = NEW."companyId"
      AND "position"."id" = NEW."currentPositionId"
      AND "position"."identifiedUnitId" = NEW."identifiedUnitId"
  ) AND ((TG_OP = 'INSERT' AND NEW."version" = 1) OR (TG_OP = 'UPDATE' AND NEW."id" = OLD."id" AND NEW."companyId" = OLD."companyId" AND NEW."identifiedUnitId" = OLD."identifiedUnitId" AND NEW."createdAt" = OLD."createdAt" AND ((NEW."currentPositionId" = OLD."currentPositionId" AND convert_to(NEW."evidenceWatermark", 'UTF8') = convert_to(OLD."evidenceWatermark", 'UTF8') AND NEW."version" = OLD."version") OR (NEW."currentPositionId" <> OLD."currentPositionId" AND convert_to(NEW."evidenceWatermark", 'UTF8') <> convert_to(OLD."evidenceWatermark", 'UTF8') AND OLD."version" < 2147483647 AND NEW."version" = OLD."version" + 1 AND NEW."version" > 0)))) INTO v_valid;
  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_identified_unit_exclusivity;function=fn_stock_identified_unit_exclusivity;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_IDENTIFIED_UNIT_EXCLUSIVITY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
```
AST inventory: SELECT root `AND[regex,EXISTS(position WHERE company/id/unit),OR[INSERT(version=1),UPDATE(immutable4,OR[same-position(position-text-equal,bytea-token-equal,version-equal),changed-position(position-text-distinct,bytea-token-distinct,old<INT_MAX,new=old+1,new>0)])]]`; nested WHERE root has 3 ATM; IF root and two outcomes as RC07. READS exactly `StockPosition`. Token operators are exactly bytea `=`/`<>` after `convert_to(...,'UTF8')`; neither token arm invokes text collation. Overflow is exactly RC06.

### SC53 — `function:fn_cajas_dispatch_ceiling`

```sql
CREATE FUNCTION "public"."fn_cajas_dispatch_ceiling"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  WITH "currentHeader" AS (
    SELECT "header".* FROM "public"."cajas_dispatch" AS "header"
    WHERE "header"."company_id" = NEW."company_id" AND "header"."id" = NEW."dispatch_id"
      AND NOT EXISTS (SELECT 1 FROM "public"."cajas_dispatch" AS "child" WHERE "child"."company_id" = "header"."company_id" AND "child"."corrects_dispatch_id" = "header"."id")
  ), "candidateLines" AS (
    SELECT "header"."sequence" AS "header_sequence", "line"."id", "line"."line_number", "line"."record_kind", "line"."accounting_sign", "line"."neutralizes_dispatch_line_id", "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."quantity", "line"."stock_unit", "line"."scale_snapshot", "line"."stock_evidence_line_id"
    FROM "currentHeader" AS "header"
    JOIN "public"."cajas_dispatch_line" AS "line" ON "line"."company_id" = "header"."company_id" AND "line"."dispatch_id" = "header"."id"
    WHERE "line"."id" <> NEW."id"
    UNION ALL
    SELECT "header"."sequence", NEW."id", NEW."line_number", NEW."record_kind", NEW."accounting_sign", NEW."neutralizes_dispatch_line_id", NEW."source_control_line_id", NEW."article_id", NEW."stock_position_id", NEW."quantity", NEW."stock_unit", NEW."scale_snapshot", NEW."stock_evidence_line_id"
    FROM "currentHeader" AS "header"
  ), "ordered" AS (
    SELECT "line".*, SUM("line"."accounting_sign" * "line"."quantity") OVER (PARTITION BY "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."stock_unit", "line"."scale_snapshot" ORDER BY "line"."header_sequence", "line"."line_number", convert_to("line"."id", 'UTF8') ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "prefix_net"
    FROM "candidateLines" AS "line"
  ), "scopeTotals" AS (
    SELECT "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."stock_unit", "line"."scale_snapshot", SUM("line"."accounting_sign" * "line"."quantity") AS "net"
    FROM "candidateLines" AS "line"
    GROUP BY "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."stock_unit", "line"."scale_snapshot"
  )
  SELECT EXISTS (
    SELECT 1 FROM "currentHeader" AS "header"
    JOIN "public"."cajas_control_line" AS "control" ON "control"."company_id" = NEW."company_id" AND "control"."assignment_id" = "header"."assignment_id" AND "control"."id" = NEW."source_control_line_id"
    JOIN "public"."StockEvidenceLine" AS "evidence" ON "evidence"."companyId" = NEW."company_id" AND "evidence"."id" = NEW."stock_evidence_line_id"
    WHERE NEW."assignment_id" = "header"."assignment_id" AND NEW."remito_id" = "header"."remito_id" AND NEW."article_id" = "control"."articleId" AND NEW."stock_position_id" IS NOT DISTINCT FROM "control"."stockPositionId" AND NEW."stock_unit" = "control"."stockUnit" AND NEW."scale_snapshot" = "control"."scaleSnapshot" AND NEW."article_id" = "evidence"."articleId" AND NEW."stock_position_id" = "evidence"."fromPositionId" AND NEW."quantity" = "evidence"."quantity" AND NEW."stock_unit" = "evidence"."stockUnit" AND NEW."scale_snapshot" = "evidence"."scaleSnapshot" AND NEW."record_kind" IN ('ORIGINAL','REVERSAL') AND ((NEW."record_kind" = 'ORIGINAL' AND NEW."accounting_sign" = 1 AND NEW."neutralizes_dispatch_line_id" IS NULL) OR (NEW."record_kind" = 'REVERSAL' AND NEW."accounting_sign" = -1 AND NEW."neutralizes_dispatch_line_id" IS NOT NULL AND EXISTS (SELECT 1 FROM "candidateLines" AS "target" WHERE "target"."id" = NEW."neutralizes_dispatch_line_id" AND "target"."record_kind" = 'ORIGINAL' AND "target"."source_control_line_id" = NEW."source_control_line_id" AND "target"."article_id" = NEW."article_id" AND "target"."stock_position_id" IS NOT DISTINCT FROM NEW."stock_position_id" AND "target"."quantity" = NEW."quantity" AND "target"."stock_unit" = NEW."stock_unit" AND "target"."scale_snapshot" = NEW."scale_snapshot"))) AND ("header"."record_kind" <> 'CORRECTION' OR (NEW."record_kind" = 'ORIGINAL' AND NEW."accounting_sign" = 1 AND NEW."neutralizes_dispatch_line_id" IS NULL)) AND NOT EXISTS (SELECT 1 FROM "candidateLines" AS "line" LEFT JOIN "public"."cajas_control_line" AS "source" ON "source"."company_id" = NEW."company_id" AND "source"."assignment_id" = "header"."assignment_id" AND "source"."id" = "line"."source_control_line_id" LEFT JOIN "public"."StockEvidenceLine" AS "sourceEvidence" ON "sourceEvidence"."companyId" = NEW."company_id" AND "sourceEvidence"."id" = "line"."stock_evidence_line_id" WHERE "source"."id" IS NULL OR "sourceEvidence"."id" IS NULL OR "line"."article_id" <> "source"."articleId" OR "line"."stock_position_id" IS DISTINCT FROM "source"."stockPositionId" OR "line"."stock_unit" <> "source"."stockUnit" OR "line"."scale_snapshot" <> "source"."scaleSnapshot" OR "line"."article_id" <> "sourceEvidence"."articleId" OR "line"."stock_position_id" IS DISTINCT FROM "sourceEvidence"."fromPositionId" OR "line"."quantity" <> "sourceEvidence"."quantity" OR "line"."stock_unit" <> "sourceEvidence"."stockUnit" OR "line"."scale_snapshot" <> "sourceEvidence"."scaleSnapshot") AND NOT EXISTS (SELECT 1 FROM "ordered" AS "line" JOIN "public"."cajas_control_line" AS "source" ON "source"."company_id" = NEW."company_id" AND "source"."assignment_id" = "header"."assignment_id" AND "source"."id" = "line"."source_control_line_id" WHERE "line"."prefix_net" < 0 OR "line"."prefix_net" > "source"."quantity") AND NOT EXISTS (SELECT 1 FROM "scopeTotals" AS "scope" JOIN "public"."cajas_control_line" AS "source" ON "source"."company_id" = NEW."company_id" AND "source"."assignment_id" = "header"."assignment_id" AND "source"."id" = "scope"."source_control_line_id" WHERE "scope"."net" < 0 OR "scope"."net" > "source"."quantity")
  ) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_dispatch_ceiling;function=fn_cajas_dispatch_ceiling;branch=R0001;family=AGGREGATE_OR_SERIALIZATION_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_DISPATCH_CEILING', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
```
AST inventory: CTEs `currentHeader,candidateLines,ordered,scopeTotals`; one `UNION ALL`; one window `SUM(sign×quantity) OVER (PARTITION BY source_control_line_id,article_id,stock_position_id,stock_unit,scale_snapshot ORDER BY header_sequence,line_number,convert_to(id,'UTF8') ROWS UNBOUNDED PRECEDING…CURRENT ROW)`; one grouped `SUM(sign×quantity)` over the same five-key physical identity. Roots are current-header WHERE, child NOT EXISTS WHERE, candidate JOIN/WHERE, NEW-shape control/evidence JOINs, main WHERE, reversal-target WHERE, all-line coherence LEFT JOIN/WHERE, prefix-cap JOIN/WHERE, grouped-final-cap JOIN/WHERE, and IF. Missing control/evidence rows reject explicitly; SQL NULL from aggregates cannot authorize because candidateLines contains NEW, every scope is nonempty, inner cap joins must resolve, and only `v_valid IS TRUE` succeeds. Unique neutralization remains C13 `uq_cdl_neutralizes`; correction headers remain full replacement. READS exactly `cajas_dispatch,cajas_dispatch_line,cajas_control_line,StockEvidenceLine`; WRITES and in-function locks are empty. Transaction-visible reads rely on the external BIND/ISO locked-writer contract; this function issues no `FOR UPDATE`, table lock, advisory lock, or projection read.

Required outer-query Boolean root: `SC53-ROOT-OUTER-EXISTS` is owned by `function:fn_cajas_dispatch_ceiling` BODY and its sole `WITH…SELECT EXISTS(...) INTO v_valid` query. Its exact block-local UTF-8 span is `[2314,5882)`, coordinates `27:10–32:4`, beginning with `EXISTS (` and ending with the closing `)` immediately before ` INTO v_valid;`. AST is `ATOM[EXISTS_SUBQUERY]`; operators are exactly one `EXISTS`; ATM/occurrence inventory is exactly one reusable-forbidden single occurrence. Nested `ON`/`WHERE` roots listed above remain independently owned strict subspans and are not duplicated into this root. P19 `SOURCE_SPAN.rawSha256=c3b7909b11467fe23c77c3d70723c236d22daf7c345a997ae211b9b779110e4d`; `lfTerminatedSha256=87def0ee132a912d0f07c293f6bf028410b5bf00749a61b1c19023ea238d7f8b`; `normalizedSha256=d7d35ab0929d7a370302e6a66c4f7dd8e55c8111f54d5742e589c85fcfdef12c`.

### SC54 — `function:fn_cajas_stock_link_guard`

```sql
CREATE FUNCTION "public"."fn_cajas_stock_link_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'cajas_dispatch_line' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."StockEvidenceLine" AS "line" JOIN "public"."StockEvidence" AS "evidence" ON "evidence"."companyId" = "line"."companyId" AND "evidence"."id" = "line"."evidenceId" WHERE "line"."companyId" = NEW."company_id" AND "line"."id" = NEW."stock_evidence_line_id" AND "evidence"."kind" = 'DISPATCH' AND "line"."articleId" = NEW."article_id" AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL AND "line"."quantity" = NEW."quantity" AND "line"."stockUnit" = NEW."stock_unit" AND "line"."scaleSnapshot" = NEW."scale_snapshot" AND "evidence"."commandAcceptanceId" = (SELECT "header"."command_acceptance_id" FROM "public"."cajas_dispatch" AS "header" WHERE "header"."company_id" = NEW."company_id" AND "header"."id" = NEW."dispatch_id")) INTO v_valid;
  ELSIF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'cajas_disposition' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."StockEvidenceLine" AS "line" JOIN "public"."StockEvidence" AS "evidence" ON "evidence"."companyId" = "line"."companyId" AND "evidence"."id" = "line"."evidenceId" WHERE "line"."companyId" = NEW."company_id" AND "line"."id" = NEW."stock_evidence_line_id" AND "line"."articleId" = NEW."article_id" AND "line"."quantity" = NEW."quantity" AND "line"."stockUnit" = NEW."stock_unit" AND "line"."scaleSnapshot" = NEW."scale_snapshot" AND "evidence"."commandAcceptanceId" = NEW."command_acceptance_id" AND ((NEW."kind" = 'returned' AND NEW."stock_position_id" IS NULL AND "evidence"."kind" = 'RETURN' AND "line"."fromPositionId" IS NULL AND "line"."toPositionId" IS NOT NULL) OR (NEW."kind" = 'consumed' AND "evidence"."kind" = 'CONSUMPTION' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL) OR (NEW."kind" IN ('missing','damaged') AND "evidence"."kind" = 'COUNT_OBSERVATION' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL) OR (NEW."kind" = 'under_review' AND NEW."record_kind" = 'ORIGINAL' AND "evidence"."kind" = 'REVIEW_HOLD' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL) OR (NEW."kind" = 'under_review' AND NEW."record_kind" = 'REVERSAL' AND "evidence"."kind" = 'REVIEW_RELEASE' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL))) INTO v_valid;
  ELSE v_valid := false;
  END IF;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_stock_link_guard;function=fn_cajas_stock_link_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_STOCK_LINK_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
```
AST inventory: outer caller decision has three outcomes `dispatch,disposition,unknown-false`; dispatch query has one JOIN root, one WHERE AND root, and nested header scalar WHERE; disposition query has one JOIN root and WHERE `AND[owner/quantity/unit/scale/command,OR[returned,consumed,missing-damaged,hold,release]]`; acceptance IF is separate and has RETURN/RAISE outcomes. READS exactly `StockEvidenceLine,StockEvidence,cajas_dispatch`. OWNER/ATTACHMENT relations remain exactly `cajas_dispatch_line` and `cajas_disposition`, but `NEW` pseudo-record access and trigger ownership emit no READS edge. The `cajas_dispatch` scalar read is the exact command-equality lookup selected by RC10.

Required outer-query roots are complete and ordered by source position:

| Root | Query/body owner | Block-local UTF-8 span | Closed root AST / ATM occurrence | `rawSha256` / `lfTerminatedSha256` / `normalizedSha256` |
|---|---|---:|---|---|
| `SC54-ROOT-DISPATCH-EXISTS` | SC54 BODY; dispatch-owner `SELECT…INTO` | `[267,1057)`; `7:12–7:802` | `ATOM[EXISTS_SUBQUERY]`; one `EXISTS`, one ATM, one occurrence | `f70688c9584195297c93ca34bb2cd24254e106e02ca6076e017bb7f6485d13e0` / `6e20fc45d92a32d1ae64d52e889eccca8b04e7d3615a1340e7ad74bf5355f5bb` / `f47f8d2dda08b47cb96f0596a999424a0c4b8db18265c1a94aa80f61fee1eea1` |
| `SC54-ROOT-DISPOSITION-EXISTS` | SC54 BODY; disposition-owner `SELECT…INTO` | `[1163,2582)`; `9:12–9:1431` | `ATOM[EXISTS_SUBQUERY]`; one `EXISTS`, one ATM, one occurrence | `e3f206c1b8e04ab765bf0d6d070e92fa0c93eeb21ca70e69cf9c5e96e70011bb` / `6d4c6c26501123d2bda807c143f1e7ac50503776f9b6836bdca2e91a274a4024` / `3bfc42ddae3c61b745a71ece6a0ec02dc8150a4138eca716f81e88f010c2569e` |

Each span starts at its exact `EXISTS (` and ends at its matching `)` before ` INTO v_valid;`. Nested JOIN/WHERE/scalar-subquery roots are strict subspans, remain separately inventoried, and contribute no duplicate outer ATM occurrence.

### SC55 — `function:fn_cajas_disposition_fold_guard`

```sql
CREATE FUNCTION "public"."fn_cajas_disposition_fold_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  WITH "rows" AS (SELECT "d".* FROM "public"."cajas_disposition" AS "d" WHERE "d"."company_id" = NEW."company_id" AND "d"."dispatch_line_id" = NEW."dispatch_line_id" AND "d"."id" <> NEW."id" UNION ALL SELECT NEW.*), "fold" AS (SELECT COALESCE(SUM("accounting_sign" * "quantity") FILTER (WHERE "kind" IN ('returned','consumed','missing','damaged')),0::numeric) AS "final", COALESCE(SUM("accounting_sign" * "quantity") FILTER (WHERE "kind" = 'under_review'),0::numeric) AS "hold" FROM "rows"), "dispatchNet" AS (SELECT COALESCE(SUM("line"."accounting_sign" * "line"."quantity"),0::numeric) AS "net" FROM "public"."cajas_dispatch_line" AS "line" WHERE "line"."company_id" = NEW."company_id" AND "line"."dispatch_id" = NEW."dispatch_id" AND ("line"."id" = NEW."dispatch_line_id" OR "line"."neutralizes_dispatch_line_id" = NEW."dispatch_line_id"))
  SELECT EXISTS (SELECT 1 FROM "public"."cajas_dispatch" AS "header" CROSS JOIN "fold" CROSS JOIN "dispatchNet" WHERE "header"."company_id" = NEW."company_id" AND "header"."id" = NEW."dispatch_id" AND "fold"."final" >= 0 AND "fold"."hold" >= 0 AND "dispatchNet"."net" - "fold"."final" - "fold"."hold" >= 0 AND ((NEW."return_confirmation_id" IS NOT NULL AND NEW."return_line_id" IS NOT NULL AND NEW."consumption_confirmation_id" IS NULL AND NEW."consumption_line_id" IS NULL) OR (NEW."return_confirmation_id" IS NULL AND NEW."return_line_id" IS NULL AND NEW."consumption_confirmation_id" IS NOT NULL AND NEW."consumption_line_id" IS NOT NULL)) AND ((NEW."record_kind" = 'ORIGINAL' AND NEW."accounting_sign" = 1 AND NEW."neutralizes_disposition_id" IS NULL) OR (NEW."record_kind" = 'REVERSAL' AND NEW."accounting_sign" = -1 AND NEW."neutralizes_disposition_id" IS NOT NULL AND EXISTS (SELECT 1 FROM "rows" AS "target" WHERE "target"."id" = NEW."neutralizes_disposition_id" AND "target"."record_kind" = 'ORIGINAL' AND "target"."kind" = NEW."kind" AND "target"."article_id" = NEW."article_id" AND "target"."stock_position_id" IS NOT DISTINCT FROM NEW."stock_position_id" AND "target"."quantity" = NEW."quantity" AND "target"."stock_unit" = NEW."stock_unit" AND "target"."scale_snapshot" = NEW."scale_snapshot" AND "target"."return_confirmation_id" IS NOT DISTINCT FROM NEW."return_confirmation_id" AND "target"."return_line_id" IS NOT DISTINCT FROM NEW."return_line_id" AND "target"."consumption_confirmation_id" IS NOT DISTINCT FROM NEW."consumption_confirmation_id" AND "target"."consumption_line_id" IS NOT DISTINCT FROM NEW."consumption_line_id" AND NOT EXISTS (SELECT 1 FROM "rows" AS "other" WHERE "other"."neutralizes_disposition_id" = "target"."id" AND "other"."id" <> NEW."id"))))) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_disposition_fold_guard;function=fn_cajas_disposition_fold_guard;branch=R0001;family=AGGREGATE_OR_SERIALIZATION_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_DISPOSITION_FOLD_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
```
AST inventory: CTE `rows` with one UNION ALL; `fold` has two filtered SUM/COALESCE expressions; `dispatchNet` has one SUM/COALESCE; main root `AND[header owner,final>=0,hold>=0,remainder>=0,owner-XOR,OR[original,compatible once-only reversal]]`; nested reversal target and second-neutralizer NOT EXISTS roots; IF root and two outcomes. READS exactly `cajas_dispatch,cajas_dispatch_line,cajas_disposition`. `under_review` contributes only to hold.

Required query roots are complete and source ordered:

| Root | Query/body owner | Block-local UTF-8 span | Closed root AST / ATM occurrence | `rawSha256` / `lfTerminatedSha256` / `normalizedSha256` |
|---|---|---:|---|---|
| `SC55-ROOT-FILTER-FINAL` | SC55 BODY; `fold.final` aggregate FILTER | `[476,529)`; `6:294–6:347` | `ATOM[IN(kind,returned,consumed,missing,damaged)]`; one `IN`, one ATM, one occurrence | `978bfbdb650012c336b840526597b3946694018f9cd6c98ea417fa4150d8d904` / `8e204f1ae43eddea6fc13174fa3203797927f7ac8e305d0917ae8af595c384b4` / `928791d61dfdc12ed20af876056b6c64521748459569fde0d59f57633a7123ac` |
| `SC55-ROOT-FILTER-HOLD` | SC55 BODY; `fold.hold` aggregate FILTER | `[614,637)`; `6:432–6:455` | `ATOM[=(kind,under_review)]`; one `=`, one ATM, one occurrence | `571538b086a1c59b34ad2b9f6f4511cba0f8aecae6beb6995b8eab3f0bd616e0` / `a565c87ac711afba01a110701ae58932ab0c79bc062c707bab6713da9a376c49` / `e65f55c383bdc21b7a45294da9bc08381bd511ea83d7acb6262cd75b650f3dca` |
| `SC55-ROOT-OUTER-EXISTS` | SC55 BODY; outer `SELECT…INTO` | `[1035,2812)`; `7:10–7:1787` | `ATOM[EXISTS_SUBQUERY]`; one `EXISTS`, one ATM, one occurrence | `a298957943cc8ce2d83537a9ad5fa8e85572220ea278c3d961261cea075adde9` / `64b13c679f93fe51ac86837bf5839cd7c346d6a689bf3b003f4be23ba1fe70e1` / `8193eb17745f283331ba74b0cc64913041aeeca7f6891e237c5e3733d178ebf9` |

FILTER spans exclude the `FILTER (WHERE ` wrapper and its closing `)` and contain exactly the predicate bytes shown by their AST. The outer span begins at `EXISTS (` and ends at its matching `)` before ` INTO v_valid;`. Nested main/reversal/neutralizer roots are strict subspans and are not duplicated. Therefore the three added roots, three ATM rows, and three ATM occurrences have a bijection with these spans; no query Boolean-bearing source span is missing or multiply owned.

### SC56 — `function:fn_cajas_condition_assignment_guard`

```sql
CREATE FUNCTION "public"."fn_cajas_condition_assignment_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  SELECT NEW."assignment_id" IS NULL OR EXISTS (SELECT 1 FROM "public"."cajas_assignment" AS "assignment" WHERE "assignment"."company_id" = NEW."company_id" AND "assignment"."id" = NEW."assignment_id" AND "assignment"."box_identified_unit_id" = NEW."box_identified_unit_id") INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_condition_assignment_guard;function=fn_cajas_condition_assignment_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_CONDITION_ASSIGNMENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
```
AST inventory: SELECT root `OR[assignment-null,EXISTS(assignment WHERE company/id/unit)]`; nested WHERE has 3 ATM; IF root and two outcomes. READS exactly `cajas_assignment`. No projection semantic field is read.

## 6. APP/TRG mechanical rendering after guard closure

The remaining 33 rows need no new semantic choice:

- For each of 13 APP rows, substitute only `F`, invariant `function:F`, local function name, and `C14_INV_FN_<uppercase F>` into the passed exact 23-LF APP shape; preserve `LANGUAGE plpgsql`, `VOLATILE`, `SECURITY INVOKER`, empty search path, one unconditional R0001, family `APPEND_ONLY`, and no RETURN.
- For each of 20 TRG rows, render exactly `CREATE TRIGGER "T"\nBEFORE <events> ON "public"."R"\nFOR EACH ROW\nEXECUTE FUNCTION "public"."F"();\n`; APP callers use `UPDATE OR DELETE`, ordinary guards use `INSERT OR UPDATE`. SC54 generates two caller blocks but one function/error source.
- Parser formulas are mechanical: APP has one full BODY, one unconditional RAISE ACTION/ERROR/BRANCH and zero Boolean root/read/write; TRG has one OBJECT, one EXECUTES occurrence and one EVT per scalar event, with no BODY/branch/error.

## 7. Hash/preimage, byte profile, and P19 forecast

Let `B` be this exact file bytes and `F_i` the exact payload bytes of fenced object block `i` in blocker order.

```text
renderingCompletionRawSha256 = SHA256(B)
renderingCompletionGitBlob = SHA1("blob " || ASCII(decimal(byteLength(B))) || NUL || B)
fragmentSha256(i) = SHA256(ASCII("C14P-OBJECT-BLOCK-V2") || NUL || F_i)
fragmentSetSha256 = SHA256(ASCII("C14-RENDERING-COMPLETION-FRAGMENT-SET-V1") || NUL || concat(CJ1({ordinal,objectId,byteLength,lfCount,fragmentSha256})))
rcDecisionSha256(n) = SHA256(ASCII("C14-RENDERING-COMPLETION-RC-DECISION-V1") || NUL || CJ1({decisionId:"RCnn",decisionTextUtf8:<exact numbered RC paragraph>}))
rcDecisionSetSha256 = SHA256(ASCII("C14-RENDERING-COMPLETION-RC-DECISION-SET-V1") || NUL || concat(CJ1({decisionId,rcDecisionSha256}) in RC01..RC12 order))
```

`B` and every `F_i` must be strict UTF-8, NFC, no BOM/NUL/CR, LF-only, no trailing horizontal whitespace, and exactly one terminal LF. Self-identities are reported externally; they are not embedded.

P19 line forecasting uses `finalLines(c)=4+ΣLF(F_i)+(objectCount(c)-1)+1`. With the 23-LF APP and 4-LF TRG formulas, exact forecasts are: CX04 `C14-10=123`; CX12 `33A=148`, `33B=70`, `33C=74`, `33D=99`, `33E=45`, `33F=47`, `33G=31`, `33H=22`, `33I=25`. Every child is `<=350`. These figures are regenerated from fenced payload LF counts; no compression is assumed. A changed byte/LF count requires recomputation and blocks if any child exceeds 350.

## 8. Offline validation and traceability

Independent review must prove: exact 27-ID bijection and `21/6` count; all C13 names/types/FK boundaries; exact SQL lexical balance, dollar delimiters, statement count, forbidden dynamic/DDL-in-body tokens, and one declaration per block; all CHECK AST/ATM counts and TRUE-only roots; all GUARD query/control ASTs, declarations, aliases, dependencies, NULL behavior, order/tie-breaks, no lock/write, and exact TEI fields; SC05/06/53–56 specific closure; APP/TRG formulas; P19 child equations; source trace to `b1921bc...`, C13/J1/P3/CX04W/SFO/TEI/DT/ISO/RTS; byte profile; `git diff --check`; and external Git blob/raw SHA-256. Validation is lexical/structural and standard-library-only; it executes no SQL and accesses no DB/network.

Residual choices after PASS: **none**. A parser disagreement, unsupported construct, duplicate locator substring, C13 mismatch, line-gate failure, or source contradiction is a hard stop, not discretion.

## 9. One approval statement

After independent read-only PASS reports this file's exact Git blob and raw SHA-256, does Franco approve **this entire exact `C14-SIMPLIFICATION-001-RENDERING-COMPLETION` proposal and RC01–RC12 together as one non-severable decision**, selecting all 21 CHECK and six GUARD exact documentary SQL blocks, closed AST/parser/locator contracts, APP/TRG mechanical formulas, byte/hash rules, P19 forecasts, fail-closed residual rule, and exclusions solely as input to the same single final C14 simplification approval, with no per-row approval and no SQL, database, migration, schema, runtime, Git-publication, deployment, staging, or production authority?
