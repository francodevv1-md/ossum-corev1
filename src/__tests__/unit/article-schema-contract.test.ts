import { ArticleIdentifierType, ArticleTraceabilityPolicyKind, Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalIdentifierSelector = {
  organizationId_type_normalizedValue_scopeKey: {
    organizationId: "org",
    type: "GS1_AI_22",
    normalizedValue: "BIOPROTECE123",
    scopeKey: "MANUFACTURER:BIOPROTECE",
  },
} satisfies Prisma.ArticleIdentifierWhereUniqueInput;

const companyIdentifierSelector = {
  organizationId_companyId_type_normalizedValue_scopeKey: {
    organizationId: "org",
    companyId: "company",
    type: "SUPPLIER_CODE",
    normalizedValue: "ABC123",
    scopeKey: "SUPPLIER:supplier",
  },
} satisfies Prisma.ArticleIdentifierWhereUniqueInput;

const supplierMappingSelector = {
  organizationId_companyId_supplierId_normalizedCode: {
    organizationId: "org",
    companyId: "company",
    supplierId: "supplier",
    normalizedCode: "ABC123",
  },
} satisfies Prisma.ArticleSupplierMappingWhereUniqueInput;

describe("Article Prisma contract (no database)", () => {
  const models = new Map(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));
  const migrationSql = readFileSync("prisma/migrations/20260917120000_article_prisma_contract_recovery/migration.sql", "utf8");

  it("generates the five service models and their required scalar fields", () => {
    const expectedFields = {
      Article: ["organizationId", "sku", "description", "articleType", "brand", "manufacturer", "family", "modelVariant", "measure", "unit", "isActive"],
      ArticleIdentifier: ["organizationId", "articleId", "type", "value", "normalizedValue", "sourcePayload", "scopeKey", "manufacturerContext", "supplierId", "companyId", "isActive", "deactivatedAt"],
      ArticleSupplierMapping: ["organizationId", "articleId", "supplierId", "companyId", "supplierCode", "normalizedCode", "isActive", "deactivatedAt"],
      ArticleTraceabilityPolicy: ["organizationId", "articleId", "policy", "effectiveAt"],
      StockArticleEligibility: ["companyId", "organizationId", "articleId", "version"],
    } as const;

    for (const [name, fields] of Object.entries(expectedFields)) {
      expect(models.get(name)?.fields.map((field) => field.name)).toEqual(expect.arrayContaining([...fields]));
    }
  });

  it("generates tenant-safe supplier and company relations", () => {
    const identifier = models.get("ArticleIdentifier")!;
    const mapping = models.get("ArticleSupplierMapping")!;

    expect(identifier.fields.find(({ name }) => name === "supplierLink")).toMatchObject({
      type: "ContactCompanyLink",
      relationName: "ArticleIdentifierSupplierLink",
    });
    expect(identifier.fields.find(({ name }) => name === "company")).toMatchObject({
      type: "Company",
      relationName: "ArticleIdentifierCompany",
    });
    expect(mapping.fields.find(({ name }) => name === "supplierLink")).toMatchObject({
      type: "ContactCompanyLink",
      relationName: "ArticleSupplierMappingSupplierLink",
    });
    expect(mapping.fields.find(({ name }) => name === "company")).toMatchObject({
      type: "Company",
      relationName: "ArticleSupplierMappingCompany",
    });
    expect([...identifier.fields, ...mapping.fields].filter((field) => field.kind === "object" && field.type === "Contact")).toHaveLength(0);
  });

  it("preserves Article relations and enum values", () => {
    expect(models.get("Organization")?.fields.find(({ name }) => name === "articles")?.relationName).toBe("OrganizationArticles");
    expect(models.get("Article")?.fields.find(({ name }) => name === "organization")?.relationName).toBe("OrganizationArticles");
    expect(models.get("Article")?.fields.find(({ name }) => name === "stockEligibilities")?.type).toBe("StockArticleEligibility");
    expect(models.get("Article")?.fields.find(({ name }) => name === "identifiers")?.relationName).toBe("ArticleIdentifiers");
    expect(models.get("Article")?.fields.find(({ name }) => name === "supplierMappings")?.relationName).toBe("ArticleSupplierMappings");
    expect(models.get("Article")?.fields.find(({ name }) => name === "tracePolicies")?.relationName).toBe("ArticleTracePolicies");
    expect(Object.values(ArticleIdentifierType)).toEqual(["MANUFACTURER_REF", "GTIN_EAN", "GS1_AI_22", "SUPPLIER_CODE", "ALTERNATIVE_CODE", "OSSUM_CODE"]);
    expect(Object.values(ArticleTraceabilityPolicyKind)).toEqual(["NONE", "LOT", "LOT_EXPIRY", "SERIAL", "SERIAL_EXPIRY", "LOT_SERIAL_EXPIRY"]);
  });

  it("generates global and company-scoped compound unique selectors", () => {
    expect(Object.keys(globalIdentifierSelector)).toEqual(["organizationId_type_normalizedValue_scopeKey"]);
    expect(Object.keys(companyIdentifierSelector)).toEqual(["organizationId_companyId_type_normalizedValue_scopeKey"]);
    expect(Object.keys(supplierMappingSelector)).toEqual(["organizationId_companyId_supplierId_normalizedCode"]);
  });

  it("creates persistent tenant constraints without the rejected trigger guard", () => {
    const expectedForeignKeys = [
      'FOREIGN KEY ("supplierId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE RESTRICT',
      'FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT',
    ];

    for (const foreignKey of expectedForeignKeys) {
      expect(migrationSql.match(new RegExp(foreignKey.replace(/[()]/g, "\\$&"), "g"))).toHaveLength(2);
    }
    expect(migrationSql).toContain('CONSTRAINT "ck_article_identifier_supplier_company_pair" CHECK (("supplierId" IS NULL AND "companyId" IS NULL) OR ("supplierId" IS NOT NULL AND "companyId" IS NOT NULL))');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "uq_article_identifier_global_active"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "uq_article_identifier_company_active"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "uq_article_supplier_mapping_active" ON "ArticleSupplierMapping"("organizationId", "companyId", "supplierId", "normalizedCode")');
    expect(migrationSql).not.toContain('REFERENCES "Contact"("id")');
    expect(migrationSql).not.toContain("fn_article_supplier_tenant_guard");
    expect(migrationSql).not.toContain("CREATE TRIGGER");
  });
});
