-- Additive Article/XADMIN taxonomy foundation. Artifact only; this task must not apply it.

CREATE TYPE "catalog_kind" AS ENUM ('CATEGORY', 'CLINICAL_FAMILY', 'BRAND', 'MANUFACTURER', 'PRODUCT_LINE');
CREATE TYPE "legacy_mapping_status" AS ENUM ('MAPPED', 'REVIEW_REQUIRED', 'UNMAPPED', 'REJECTED', 'UNCHANGED_LEGACY');
CREATE TYPE "legacy_axis" AS ENUM ('ARTICLE', 'CATEGORY', 'CLINICAL_FAMILY', 'BRAND', 'MANUFACTURER', 'PRODUCT_LINE', 'DEPARTMENT', 'SECTION', 'SECTOR', 'XADMIN_TYPE');

ALTER TABLE "Article"
  ADD COLUMN "category_id" TEXT,
  ADD COLUMN "clinical_family_id" TEXT,
  ADD COLUMN "brand_id" TEXT,
  ADD COLUMN "manufacturer_id" TEXT,
  ADD COLUMN "product_line_id" TEXT;

CREATE TABLE "product_category" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "depth" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deactivated_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "product_category_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_product_category_depth" CHECK ("depth" BETWEEN 1 AND 3),
  CONSTRAINT "ck_product_category_parent_not_self" CHECK ("parent_id" IS NULL OR "parent_id" <> "id"),
  CONSTRAINT "ck_product_category_parent_depth_shape" CHECK (
    ("parent_id" IS NULL AND "depth" = 1)
    OR ("parent_id" IS NOT NULL AND "depth" IN (2, 3))
  )
);

CREATE TABLE "clinical_family" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deactivated_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "clinical_family_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "brand" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deactivated_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "manufacturer" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deactivated_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "manufacturer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_line" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deactivated_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "product_line_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_alias" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "kind" "catalog_kind" NOT NULL,
  "normalized_alias" TEXT NOT NULL,
  "raw_alias" TEXT NOT NULL,
  "category_id" TEXT,
  "clinical_family_id" TEXT,
  "brand_id" TEXT,
  "manufacturer_id" TEXT,
  "product_line_id" TEXT,
  "source" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deactivated_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalog_alias_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_catalog_alias_kind_target" CHECK (
    ("kind" = 'CATEGORY' AND "category_id" IS NOT NULL AND "clinical_family_id" IS NULL AND "brand_id" IS NULL AND "manufacturer_id" IS NULL AND "product_line_id" IS NULL)
    OR ("kind" = 'CLINICAL_FAMILY' AND "category_id" IS NULL AND "clinical_family_id" IS NOT NULL AND "brand_id" IS NULL AND "manufacturer_id" IS NULL AND "product_line_id" IS NULL)
    OR ("kind" = 'BRAND' AND "category_id" IS NULL AND "clinical_family_id" IS NULL AND "brand_id" IS NOT NULL AND "manufacturer_id" IS NULL AND "product_line_id" IS NULL)
    OR ("kind" = 'MANUFACTURER' AND "category_id" IS NULL AND "clinical_family_id" IS NULL AND "brand_id" IS NULL AND "manufacturer_id" IS NOT NULL AND "product_line_id" IS NULL)
    OR ("kind" = 'PRODUCT_LINE' AND "category_id" IS NULL AND "clinical_family_id" IS NULL AND "brand_id" IS NULL AND "manufacturer_id" IS NULL AND "product_line_id" IS NOT NULL)
  )
);

CREATE TABLE "xadmin_import_run" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "source_name" TEXT NOT NULL,
  "source_file_sha256" TEXT NOT NULL,
  "run_key" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6),
  CONSTRAINT "xadmin_import_run_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_xadmin_import_run_file_hash" CHECK ("source_file_sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_xadmin_import_run_key_hash" CHECK ("run_key" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_xadmin_import_run_status" CHECK (length(btrim("status")) > 0)
);

CREATE TABLE "xadmin_article_stage_row" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "source_row_key" TEXT NOT NULL,
  "source_row_number" INTEGER NOT NULL,
  "source_row_sha256" TEXT NOT NULL,
  "source_code" TEXT NOT NULL,
  "source_description" TEXT NOT NULL,
  "legacy_xadmin_type" TEXT,
  "legacy_department" TEXT,
  "legacy_rubro" TEXT,
  "legacy_section" TEXT,
  "legacy_sector" TEXT,
  "legacy_brand" TEXT,
  "legacy_line" TEXT,
  "raw_payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "xadmin_article_stage_row_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_xadmin_stage_row_number" CHECK ("source_row_number" > 0),
  CONSTRAINT "ck_xadmin_stage_row_hash" CHECK ("source_row_sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_xadmin_stage_row_key" CHECK (length("source_row_key") > 0)
);

CREATE TABLE "xadmin_article_mapping" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "stage_row_id" TEXT NOT NULL,
  "axis" "legacy_axis" NOT NULL,
  "status" "legacy_mapping_status" NOT NULL,
  "target_article_id" TEXT,
  "target_category_id" TEXT,
  "target_clinical_family_id" TEXT,
  "target_brand_id" TEXT,
  "target_manufacturer_id" TEXT,
  "target_product_line_id" TEXT,
  "confidence" DECIMAL(5,4),
  "review_reason" TEXT,
  "decided_by_id" TEXT,
  "decided_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "xadmin_article_mapping_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_xadmin_mapping_confidence" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1)),
  CONSTRAINT "ck_xadmin_mapping_decision_pair" CHECK (("decided_by_id" IS NULL) = ("decided_at" IS NULL)),
  CONSTRAINT "ck_xadmin_mapping_status_axis_target" CHECK (
    (
      "status" = 'MAPPED'
      AND (
        ("axis" = 'ARTICLE' AND "target_article_id" IS NOT NULL AND "target_category_id" IS NULL AND "target_clinical_family_id" IS NULL AND "target_brand_id" IS NULL AND "target_manufacturer_id" IS NULL AND "target_product_line_id" IS NULL)
        OR ("axis" = 'CATEGORY' AND "target_article_id" IS NULL AND "target_category_id" IS NOT NULL AND "target_clinical_family_id" IS NULL AND "target_brand_id" IS NULL AND "target_manufacturer_id" IS NULL AND "target_product_line_id" IS NULL)
        OR ("axis" = 'CLINICAL_FAMILY' AND "target_article_id" IS NULL AND "target_category_id" IS NULL AND "target_clinical_family_id" IS NOT NULL AND "target_brand_id" IS NULL AND "target_manufacturer_id" IS NULL AND "target_product_line_id" IS NULL)
        OR ("axis" = 'BRAND' AND "target_article_id" IS NULL AND "target_category_id" IS NULL AND "target_clinical_family_id" IS NULL AND "target_brand_id" IS NOT NULL AND "target_manufacturer_id" IS NULL AND "target_product_line_id" IS NULL)
        OR ("axis" = 'MANUFACTURER' AND "target_article_id" IS NULL AND "target_category_id" IS NULL AND "target_clinical_family_id" IS NULL AND "target_brand_id" IS NULL AND "target_manufacturer_id" IS NOT NULL AND "target_product_line_id" IS NULL)
        OR ("axis" = 'PRODUCT_LINE' AND "target_article_id" IS NULL AND "target_category_id" IS NULL AND "target_clinical_family_id" IS NULL AND "target_brand_id" IS NULL AND "target_manufacturer_id" IS NULL AND "target_product_line_id" IS NOT NULL)
      )
    )
    OR (
      "status" <> 'MAPPED'
      AND "target_article_id" IS NULL
      AND "target_category_id" IS NULL
      AND "target_clinical_family_id" IS NULL
      AND "target_brand_id" IS NULL
      AND "target_manufacturer_id" IS NULL
      AND "target_product_line_id" IS NULL
    )
  )
);

CREATE UNIQUE INDEX "uq_product_category_org_id" ON "product_category" ("organization_id", "id");
CREATE UNIQUE INDEX "uq_product_category_org_code" ON "product_category" ("organization_id", "code");
CREATE UNIQUE INDEX "uq_product_category_root_active_name" ON "product_category" ("organization_id", "normalized_name") WHERE "is_active" = true AND "parent_id" IS NULL;
CREATE UNIQUE INDEX "uq_product_category_child_active_name" ON "product_category" ("organization_id", "parent_id", "normalized_name") WHERE "is_active" = true AND "parent_id" IS NOT NULL;
CREATE INDEX "ix_product_category_parent_active" ON "product_category" ("organization_id", "parent_id", "is_active");
CREATE INDEX "ix_product_category_name_active" ON "product_category" ("organization_id", "normalized_name", "is_active");

CREATE UNIQUE INDEX "uq_clinical_family_org_id" ON "clinical_family" ("organization_id", "id");
CREATE UNIQUE INDEX "uq_clinical_family_org_code" ON "clinical_family" ("organization_id", "code");
CREATE INDEX "ix_clinical_family_name_active" ON "clinical_family" ("organization_id", "normalized_name", "is_active");
CREATE UNIQUE INDEX "uq_brand_org_id" ON "brand" ("organization_id", "id");
CREATE UNIQUE INDEX "uq_brand_org_code" ON "brand" ("organization_id", "code");
CREATE INDEX "ix_brand_name_active" ON "brand" ("organization_id", "normalized_name", "is_active");
CREATE UNIQUE INDEX "uq_manufacturer_org_id" ON "manufacturer" ("organization_id", "id");
CREATE UNIQUE INDEX "uq_manufacturer_org_code" ON "manufacturer" ("organization_id", "code");
CREATE INDEX "ix_manufacturer_name_active" ON "manufacturer" ("organization_id", "normalized_name", "is_active");
CREATE UNIQUE INDEX "uq_product_line_org_id" ON "product_line" ("organization_id", "id");
CREATE UNIQUE INDEX "uq_product_line_org_code" ON "product_line" ("organization_id", "code");
CREATE INDEX "ix_product_line_name_active" ON "product_line" ("organization_id", "normalized_name", "is_active");

CREATE UNIQUE INDEX "uq_catalog_alias_org_id" ON "catalog_alias" ("organization_id", "id");
CREATE UNIQUE INDEX "uq_catalog_alias_active" ON "catalog_alias" ("organization_id", "kind", "normalized_alias") WHERE "is_active" = true;
CREATE INDEX "ix_catalog_alias_lookup" ON "catalog_alias" ("organization_id", "kind", "normalized_alias", "is_active");

CREATE UNIQUE INDEX "uq_xadmin_import_run_org_id" ON "xadmin_import_run" ("organization_id", "id");
CREATE UNIQUE INDEX "uq_xadmin_import_run_org_file_hash" ON "xadmin_import_run" ("organization_id", "source_file_sha256");
CREATE UNIQUE INDEX "uq_xadmin_import_run_org_key" ON "xadmin_import_run" ("organization_id", "run_key");
CREATE INDEX "ix_xadmin_import_run_status" ON "xadmin_import_run" ("organization_id", "status", "created_at");
CREATE UNIQUE INDEX "uq_xadmin_stage_row_org_id" ON "xadmin_article_stage_row" ("organization_id", "id");
CREATE UNIQUE INDEX "uq_xadmin_stage_row_run_key" ON "xadmin_article_stage_row" ("organization_id", "run_id", "source_row_key");
CREATE INDEX "ix_xadmin_stage_row_number" ON "xadmin_article_stage_row" ("organization_id", "run_id", "source_row_number");
CREATE UNIQUE INDEX "uq_xadmin_mapping_org_id" ON "xadmin_article_mapping" ("organization_id", "id");
CREATE UNIQUE INDEX "uq_xadmin_mapping_stage_axis" ON "xadmin_article_mapping" ("organization_id", "stage_row_id", "axis");
CREATE INDEX "ix_xadmin_mapping_status_axis" ON "xadmin_article_mapping" ("organization_id", "status", "axis");
CREATE INDEX "ix_xadmin_mapping_decided_by" ON "xadmin_article_mapping" ("decided_by_id");

CREATE INDEX "ix_article_category" ON "Article" ("organizationId", "category_id");
CREATE INDEX "ix_article_clinical_family" ON "Article" ("organizationId", "clinical_family_id");
CREATE INDEX "ix_article_brand" ON "Article" ("organizationId", "brand_id");
CREATE INDEX "ix_article_manufacturer" ON "Article" ("organizationId", "manufacturer_id");
CREATE INDEX "ix_article_product_line" ON "Article" ("organizationId", "product_line_id");

ALTER TABLE "product_category" ADD CONSTRAINT "fk_product_category_organization" FOREIGN KEY ("organization_id") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_category" ADD CONSTRAINT "fk_product_category_parent" FOREIGN KEY ("organization_id", "parent_id") REFERENCES "product_category" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_family" ADD CONSTRAINT "fk_clinical_family_organization" FOREIGN KEY ("organization_id") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "brand" ADD CONSTRAINT "fk_brand_organization" FOREIGN KEY ("organization_id") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manufacturer" ADD CONSTRAINT "fk_manufacturer_organization" FOREIGN KEY ("organization_id") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_line" ADD CONSTRAINT "fk_product_line_organization" FOREIGN KEY ("organization_id") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_alias" ADD CONSTRAINT "fk_catalog_alias_organization" FOREIGN KEY ("organization_id") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_alias" ADD CONSTRAINT "fk_catalog_alias_category" FOREIGN KEY ("organization_id", "category_id") REFERENCES "product_category" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_alias" ADD CONSTRAINT "fk_catalog_alias_clinical_family" FOREIGN KEY ("organization_id", "clinical_family_id") REFERENCES "clinical_family" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_alias" ADD CONSTRAINT "fk_catalog_alias_brand" FOREIGN KEY ("organization_id", "brand_id") REFERENCES "brand" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_alias" ADD CONSTRAINT "fk_catalog_alias_manufacturer" FOREIGN KEY ("organization_id", "manufacturer_id") REFERENCES "manufacturer" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_alias" ADD CONSTRAINT "fk_catalog_alias_product_line" FOREIGN KEY ("organization_id", "product_line_id") REFERENCES "product_line" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Article" ADD CONSTRAINT "fk_article_category" FOREIGN KEY ("organizationId", "category_id") REFERENCES "product_category" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "fk_article_clinical_family" FOREIGN KEY ("organizationId", "clinical_family_id") REFERENCES "clinical_family" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "fk_article_brand" FOREIGN KEY ("organizationId", "brand_id") REFERENCES "brand" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "fk_article_manufacturer" FOREIGN KEY ("organizationId", "manufacturer_id") REFERENCES "manufacturer" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "fk_article_product_line" FOREIGN KEY ("organizationId", "product_line_id") REFERENCES "product_line" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "xadmin_import_run" ADD CONSTRAINT "fk_xadmin_import_run_organization" FOREIGN KEY ("organization_id") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_stage_row" ADD CONSTRAINT "fk_xadmin_stage_row_organization" FOREIGN KEY ("organization_id") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_stage_row" ADD CONSTRAINT "fk_xadmin_stage_row_run" FOREIGN KEY ("organization_id", "run_id") REFERENCES "xadmin_import_run" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_mapping" ADD CONSTRAINT "fk_xadmin_mapping_organization" FOREIGN KEY ("organization_id") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_mapping" ADD CONSTRAINT "fk_xadmin_mapping_stage_row" FOREIGN KEY ("organization_id", "stage_row_id") REFERENCES "xadmin_article_stage_row" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_mapping" ADD CONSTRAINT "fk_xadmin_mapping_article" FOREIGN KEY ("organization_id", "target_article_id") REFERENCES "Article" ("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_mapping" ADD CONSTRAINT "fk_xadmin_mapping_category" FOREIGN KEY ("organization_id", "target_category_id") REFERENCES "product_category" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_mapping" ADD CONSTRAINT "fk_xadmin_mapping_clinical_family" FOREIGN KEY ("organization_id", "target_clinical_family_id") REFERENCES "clinical_family" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_mapping" ADD CONSTRAINT "fk_xadmin_mapping_brand" FOREIGN KEY ("organization_id", "target_brand_id") REFERENCES "brand" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_mapping" ADD CONSTRAINT "fk_xadmin_mapping_manufacturer" FOREIGN KEY ("organization_id", "target_manufacturer_id") REFERENCES "manufacturer" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_mapping" ADD CONSTRAINT "fk_xadmin_mapping_product_line" FOREIGN KEY ("organization_id", "target_product_line_id") REFERENCES "product_line" ("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xadmin_article_mapping" ADD CONSTRAINT "fk_xadmin_mapping_decided_by" FOREIGN KEY ("decided_by_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "public"."fn_product_category_tree_guard"() RETURNS trigger
LANGUAGE plpgsql
AS $category_tree$
DECLARE
  parent_depth INTEGER;
  max_relative_depth INTEGER;
  has_cycle BOOLEAN;
BEGIN
  IF NEW."parent_id" IS NOT NULL THEN
    SELECT parent."depth"
      INTO parent_depth
      FROM "public"."product_category" AS parent
     WHERE parent."organization_id" = NEW."organization_id"
       AND parent."id" = NEW."parent_id"
       AND parent."is_active" = true;

    IF parent_depth IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'product category parent must be active and belong to the same organization';
    END IF;

    IF NEW."depth" <> parent_depth + 1 THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'product category depth must equal parent depth plus one';
    END IF;
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT category."id", category."parent_id", ARRAY[category."id"]::TEXT[] AS path, false AS cycle
      FROM "public"."product_category" AS category
     WHERE category."organization_id" = NEW."organization_id" AND category."id" = NEW."id"
    UNION ALL
    SELECT parent."id", parent."parent_id", ancestors.path || parent."id", parent."id" = ANY(ancestors.path)
      FROM ancestors
      JOIN "public"."product_category" AS parent
        ON parent."organization_id" = NEW."organization_id" AND parent."id" = ancestors."parent_id"
     WHERE NOT ancestors.cycle
  )
  SELECT COALESCE(bool_or(cycle), false) INTO has_cycle FROM ancestors;

  IF has_cycle THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'product category hierarchy cannot contain cycles';
  END IF;

  WITH RECURSIVE subtree AS (
    SELECT NEW."id" AS id, 0 AS relative_depth, ARRAY[NEW."id"]::TEXT[] AS path
    UNION ALL
    SELECT child."id", subtree.relative_depth + 1, subtree.path || child."id"
      FROM subtree
      JOIN "public"."product_category" AS child
        ON child."organization_id" = NEW."organization_id" AND child."parent_id" = subtree.id
     WHERE NOT child."id" = ANY(subtree.path)
  )
  SELECT COALESCE(max(relative_depth), 0) INTO max_relative_depth FROM subtree;

  IF NEW."depth" + max_relative_depth > 3 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'product category subtree depth cannot exceed three';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "public"."product_category" AS child
     WHERE child."organization_id" = NEW."organization_id"
       AND child."parent_id" = NEW."id"
       AND (NEW."is_active" = false OR child."depth" <> NEW."depth" + 1)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'product category children require an active parent at the preceding depth';
  END IF;

  RETURN NULL;
END;
$category_tree$;

CREATE CONSTRAINT TRIGGER "ctrg_product_category_tree_guard"
AFTER INSERT OR UPDATE OF "organization_id", "parent_id", "depth", "is_active" ON "public"."product_category"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_product_category_tree_guard"();

CREATE FUNCTION "public"."fn_xadmin_source_identity_immutable"() RETURNS trigger
LANGUAGE plpgsql
AS $xadmin_source_identity$
BEGIN
  IF TG_TABLE_NAME = 'xadmin_import_run' AND (
    NEW."organization_id" IS DISTINCT FROM OLD."organization_id"
    OR NEW."source_name" IS DISTINCT FROM OLD."source_name"
    OR NEW."source_file_sha256" IS DISTINCT FROM OLD."source_file_sha256"
    OR NEW."run_key" IS DISTINCT FROM OLD."run_key"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'XADMIN import source identity and file hash are immutable';
  END IF;

  IF TG_TABLE_NAME = 'xadmin_article_stage_row' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'XADMIN staged source rows and row hashes are immutable';
  END IF;

  RETURN NEW;
END;
$xadmin_source_identity$;

CREATE TRIGGER "trg_xadmin_import_run_identity_immutable" BEFORE UPDATE ON "public"."xadmin_import_run" FOR EACH ROW EXECUTE FUNCTION "public"."fn_xadmin_source_identity_immutable"();
CREATE TRIGGER "trg_xadmin_stage_row_identity_immutable" BEFORE UPDATE ON "public"."xadmin_article_stage_row" FOR EACH ROW EXECUTE FUNCTION "public"."fn_xadmin_source_identity_immutable"();

CREATE FUNCTION "public"."fn_article_catalog_no_hard_delete"() RETURNS trigger
LANGUAGE plpgsql
AS $no_hard_delete$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'article catalog and XADMIN evidence rows cannot be hard-deleted';
END;
$no_hard_delete$;

CREATE TRIGGER "trg_product_category_no_delete" BEFORE DELETE ON "public"."product_category" FOR EACH ROW EXECUTE FUNCTION "public"."fn_article_catalog_no_hard_delete"();
CREATE TRIGGER "trg_clinical_family_no_delete" BEFORE DELETE ON "public"."clinical_family" FOR EACH ROW EXECUTE FUNCTION "public"."fn_article_catalog_no_hard_delete"();
CREATE TRIGGER "trg_brand_no_delete" BEFORE DELETE ON "public"."brand" FOR EACH ROW EXECUTE FUNCTION "public"."fn_article_catalog_no_hard_delete"();
CREATE TRIGGER "trg_manufacturer_no_delete" BEFORE DELETE ON "public"."manufacturer" FOR EACH ROW EXECUTE FUNCTION "public"."fn_article_catalog_no_hard_delete"();
CREATE TRIGGER "trg_product_line_no_delete" BEFORE DELETE ON "public"."product_line" FOR EACH ROW EXECUTE FUNCTION "public"."fn_article_catalog_no_hard_delete"();
CREATE TRIGGER "trg_catalog_alias_no_delete" BEFORE DELETE ON "public"."catalog_alias" FOR EACH ROW EXECUTE FUNCTION "public"."fn_article_catalog_no_hard_delete"();
CREATE TRIGGER "trg_xadmin_import_run_no_delete" BEFORE DELETE ON "public"."xadmin_import_run" FOR EACH ROW EXECUTE FUNCTION "public"."fn_article_catalog_no_hard_delete"();
CREATE TRIGGER "trg_xadmin_stage_row_no_delete" BEFORE DELETE ON "public"."xadmin_article_stage_row" FOR EACH ROW EXECUTE FUNCTION "public"."fn_article_catalog_no_hard_delete"();
CREATE TRIGGER "trg_xadmin_mapping_no_delete" BEFORE DELETE ON "public"."xadmin_article_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."fn_article_catalog_no_hard_delete"();
