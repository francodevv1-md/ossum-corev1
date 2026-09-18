-- Fix: fn_stock_policy_current_guard blocked all article creation.
-- The BEFORE INSERT trigger required currentPolicyVersionId to reference an
-- existing StockArticlePolicyVersion, but the FK on StockArticlePolicyVersion
-- (eligibilityId -> StockArticleEligibility) is not deferrable, creating a
-- circular dependency that made it impossible to insert either row first.
--
-- This amendment allows an initial eligibility row (version=1) to be created
-- without a currentPolicyVersionId. The policy version is created lazily
-- later (see receipt.service.ts lines 206-213), which is the existing pattern.
-- The invariant is still enforced for:
--   - INSERT with a non-null currentPolicyVersionId (must reference valid v1)
--   - Bootstrap UPDATE: setting currentPolicyVersionId from NULL to a valid v1
--   - Chain UPDATE: incrementing version with prior policy version reference

CREATE OR REPLACE FUNCTION "public"."fn_stock_policy_current_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  -- Allow initial eligibility creation without policy version
  IF TG_OP = 'INSERT' AND NEW."currentPolicyVersionId" IS NULL AND NEW."version" = 1 THEN
    RETURN NEW;
  END IF;

  -- Allow no-op UPDATE on unbootstrapped eligibility (currentPolicyVersionId stays NULL)
  IF TG_OP = 'UPDATE' AND OLD."currentPolicyVersionId" IS NULL AND NEW."currentPolicyVersionId" IS NULL
     AND NEW."version" = OLD."version"
     AND NEW."companyId" = OLD."companyId"
     AND NEW."organizationId" = OLD."organizationId"
     AND NEW."articleId" = OLD."articleId" THEN
    RETURN NEW;
  END IF;

  -- Allow bootstrap UPDATE: setting currentPolicyVersionId from NULL to a valid v1 policy
  IF TG_OP = 'UPDATE' AND OLD."currentPolicyVersionId" IS NULL AND NEW."currentPolicyVersionId" IS NOT NULL
     AND NEW."version" = 1 AND NEW."companyId" = OLD."companyId"
     AND NEW."organizationId" = OLD."organizationId" AND NEW."articleId" = OLD."articleId" THEN
    SELECT EXISTS (
      SELECT 1
      FROM "public"."StockArticlePolicyVersion" AS "target"
      WHERE "target"."companyId" = NEW."companyId" AND "target"."eligibilityId" = NEW."id"
        AND "target"."id" = NEW."currentPolicyVersionId"
        AND "target"."versionNumber" = 1 AND "target"."previousVersionId" IS NULL
    ) INTO v_valid;
    IF v_valid IS TRUE THEN RETURN NEW; ELSE
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_policy_current_guard;function=fn_stock_policy_current_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_POLICY_CURRENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM "public"."StockArticlePolicyVersion" AS "target"
    LEFT JOIN "public"."StockArticlePolicyVersion" AS "prior"
      ON TG_OP = 'UPDATE' AND "prior"."companyId" = OLD."companyId"
     AND "prior"."eligibilityId" = OLD."id" AND "prior"."id" = OLD."currentPolicyVersionId"
    WHERE "target"."companyId" = NEW."companyId" AND "target"."eligibilityId" = NEW."id"
      AND "target"."id" = NEW."currentPolicyVersionId"
      AND ((TG_OP = 'INSERT' AND "target"."versionNumber" = 1 AND "target"."previousVersionId" IS NULL AND NEW."version" = 1)
        OR (TG_OP = 'UPDATE' AND NEW."companyId" = OLD."companyId" AND NEW."organizationId" = OLD."organizationId"
          AND NEW."articleId" = OLD."articleId" AND "target"."previousVersionId" = OLD."currentPolicyVersionId"
          AND "target"."versionNumber" = "prior"."versionNumber" + 1 AND NEW."version" = OLD."version" + 1))
  ) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_policy_current_guard;function=fn_stock_policy_current_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_POLICY_CURRENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
