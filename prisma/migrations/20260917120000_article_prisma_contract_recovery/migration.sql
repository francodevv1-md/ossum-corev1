-- CreateEnum
CREATE TYPE "ArticleIdentifierType" AS ENUM ('MANUFACTURER_REF', 'GTIN_EAN', 'GS1_AI_22', 'SUPPLIER_CODE', 'ALTERNATIVE_CODE', 'OSSUM_CODE');

-- CreateEnum
CREATE TYPE "ArticleTraceabilityPolicyKind" AS ENUM ('NONE', 'LOT', 'LOT_EXPIRY', 'SERIAL', 'SERIAL_EXPIRY', 'LOT_SERIAL_EXPIRY');

-- Required by the organization-scoped StockArticleEligibility foreign key.
CREATE UNIQUE INDEX "uq_company_organization_id" ON "Company"("organizationId", "id");

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "articleType" TEXT,
    "brand" TEXT,
    "manufacturer" TEXT,
    "family" TEXT,
    "modelVariant" TEXT,
    "measure" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'u',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleIdentifier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" "ArticleIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "sourcePayload" TEXT,
    "scopeKey" TEXT NOT NULL DEFAULT '',
    "manufacturerContext" TEXT,
    "supplierId" TEXT,
    "companyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleIdentifier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_article_identifier_supplier_company_pair" CHECK (("supplierId" IS NULL AND "companyId" IS NULL) OR ("supplierId" IS NOT NULL AND "companyId" IS NOT NULL))
);

-- CreateTable
CREATE TABLE "ArticleSupplierMapping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "normalizedCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleSupplierMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleTraceabilityPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "policy" "ArticleTraceabilityPolicyKind" NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleTraceabilityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockArticleEligibility" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StockArticleEligibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_article_org_sku" ON "Article"("organizationId", "sku");
CREATE UNIQUE INDEX "uq_article_org_id" ON "Article"("organizationId", "id");
CREATE UNIQUE INDEX "uq_article_identifier_global_active" ON "ArticleIdentifier"("organizationId", "type", "normalizedValue", "scopeKey") WHERE "isActive" = true AND "companyId" IS NULL;
CREATE UNIQUE INDEX "uq_article_identifier_company_active" ON "ArticleIdentifier"("organizationId", "companyId", "type", "normalizedValue", "scopeKey") WHERE "isActive" = true AND "companyId" IS NOT NULL;
CREATE INDEX "ix_article_identifier_search" ON "ArticleIdentifier"("organizationId", "companyId", "normalizedValue", "isActive");
CREATE INDEX "ix_article_identifier_resolution" ON "ArticleIdentifier"("organizationId", "companyId", "type", "normalizedValue", "isActive");
CREATE UNIQUE INDEX "uq_article_supplier_mapping_active" ON "ArticleSupplierMapping"("organizationId", "companyId", "supplierId", "normalizedCode") WHERE "isActive" = true;
CREATE INDEX "ix_article_supplier_mapping_search" ON "ArticleSupplierMapping"("organizationId", "companyId", "normalizedCode", "isActive");
CREATE UNIQUE INDEX "uq_article_trace_policy_effective" ON "ArticleTraceabilityPolicy"("organizationId", "articleId", "effectiveAt");
CREATE INDEX "ix_article_trace_policy_article" ON "ArticleTraceabilityPolicy"("organizationId", "articleId", "effectiveAt");
CREATE UNIQUE INDEX "uq_sae_company_id" ON "StockArticleEligibility"("companyId", "id");
CREATE UNIQUE INDEX "uq_sae_company_article" ON "StockArticleEligibility"("companyId", "articleId");
CREATE INDEX "ix_sae_company_updated" ON "StockArticleEligibility"("companyId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "fk_article_organization" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArticleIdentifier" ADD CONSTRAINT "fk_article_identifier_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "Article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArticleIdentifier" ADD CONSTRAINT "fk_article_identifier_supplier_link" FOREIGN KEY ("supplierId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ArticleIdentifier" ADD CONSTRAINT "fk_article_identifier_company" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ArticleSupplierMapping" ADD CONSTRAINT "fk_article_supplier_mapping_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "Article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArticleSupplierMapping" ADD CONSTRAINT "fk_article_supplier_mapping_supplier_link" FOREIGN KEY ("supplierId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ArticleSupplierMapping" ADD CONSTRAINT "fk_article_supplier_mapping_company" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ArticleTraceabilityPolicy" ADD CONSTRAINT "fk_article_trace_policy_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "Article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockArticleEligibility" ADD CONSTRAINT "fk_sae_company" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockArticleEligibility" ADD CONSTRAINT "fk_sae_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "Article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
