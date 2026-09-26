import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  resolve("prisma/migrations/20260826190000_article_xadmin_taxonomy_v1/migration.sql"),
  "utf8",
);
const testSource = readFileSync(resolve("src/__tests__/integration/article-xadmin-taxonomy-persistence-artifact.test.ts"), "utf8");

describe("Article/XADMIN additive persistence artifact", () => {
  it("keeps the transitional Article contract and declares tenant-safe catalog/import integrity without DB execution", () => {
    const article = schema.match(/model Article \{[\s\S]*?\n\}/)?.[0] ?? "";

    expect(article).toMatch(/articleType\s+String\?/);
    expect(article).toMatch(/brand\s+String\?/);
    expect(article).toMatch(/manufacturer\s+String\?/);
    expect(article).toMatch(/family\s+String\?/);
    for (const field of ["categoryId", "clinicalFamilyId", "brandId", "manufacturerId", "productLineId"]) {
      expect(article).toMatch(new RegExp(`${field}\\s+String\\?`));
    }

    for (const model of [
      "ProductCategory",
      "ClinicalFamily",
      "Brand",
      "Manufacturer",
      "ProductLine",
      "CatalogAlias",
      "XadminImportRun",
      "XadminArticleStageRow",
      "XadminArticleMapping",
    ]) {
      expect(schema).toContain(`model ${model} {`);
    }
    expect(schema).toContain('@@map("product_category")');
    expect(schema).toContain('@@unique([organizationId, stageRowId, axis], map: "uq_xadmin_mapping_stage_axis")');
    expect(schema).toContain(
      '@@unique([organizationId, sourceFileSha256], map: "uq_xadmin_import_run_org_file_hash")',
    );

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "uq_product_category_root_active_name" ON "product_category" ("organization_id", "normalized_name") WHERE "is_active" = true AND "parent_id" IS NULL;',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "uq_product_category_child_active_name" ON "product_category" ("organization_id", "parent_id", "normalized_name") WHERE "is_active" = true AND "parent_id" IS NOT NULL;',
    );
    expect(migration).toContain('CONSTRAINT "ck_catalog_alias_kind_target" CHECK');
    expect(migration).toContain('CONSTRAINT "ck_xadmin_mapping_status_axis_target" CHECK');
    expect(migration).toMatch(/"source_file_sha256" ~ '\^\[0-9a-f\]\{64\}\$'/);
    expect(migration).toMatch(/"source_row_sha256" ~ '\^\[0-9a-f\]\{64\}\$'/);
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "uq_xadmin_import_run_org_file_hash" ON "xadmin_import_run" ("organization_id", "source_file_sha256");',
    );
    expect(migration).toContain('CREATE CONSTRAINT TRIGGER "ctrg_product_category_tree_guard"');
    expect(migration).toContain("DEFERRABLE INITIALLY DEFERRED");
    expect(migration).toContain("product category parent must be active and belong to the same organization");
    expect(migration).toContain("product category hierarchy cannot contain cycles");
    expect(migration).toContain("product category subtree depth cannot exceed three");
    expect(migration).toContain('FOREIGN KEY ("organization_id", "stage_row_id")');
    expect(migration).toContain('FOREIGN KEY ("organization_id", "target_article_id")');
    expect(migration).toContain('CREATE TRIGGER "trg_xadmin_import_run_identity_immutable" BEFORE UPDATE');
    expect(migration).toContain('CREATE TRIGGER "trg_xadmin_stage_row_identity_immutable" BEFORE UPDATE');
    expect(migration).toContain('CREATE TRIGGER "trg_xadmin_mapping_no_delete" BEFORE DELETE');

    expect(migration).not.toMatch(/ALTER\s+(?:TABLE\s+"Article"\s+)?(?:COLUMN\s+)?"articleType"/i);
    expect(migration).not.toMatch(/UPDATE\s+"Article"|INSERT\s+INTO\s+"Article"/i);
    expect(migration).not.toMatch(/\bSTANDARD\b|\bCOMPOSITE\b/);
    expect([...testSource.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1])).toEqual([
      "node:fs",
      "node:path",
      "vitest",
    ]);
  });
});
