-- Article Master V1.1. Artifact only; never applied by this task.
ALTER TABLE "Article"
  ADD COLUMN "articleType" TEXT,
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "manufacturer" TEXT,
  ADD COLUMN "family" TEXT,
  ADD COLUMN "modelVariant" TEXT,
  ADD COLUMN "measure" TEXT,
  ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'u',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "ArticleIdentifierType" AS ENUM ('MANUFACTURER_REF', 'GTIN_EAN', 'SUPPLIER_CODE', 'ALTERNATIVE_CODE', 'OSSUM_CODE');
CREATE TYPE "ArticleTraceabilityPolicyKind" AS ENUM ('NONE', 'LOT', 'LOT_EXPIRY', 'SERIAL', 'SERIAL_EXPIRY', 'LOT_SERIAL_EXPIRY');

CREATE TABLE "ArticleIdentifier" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "type" "ArticleIdentifierType" NOT NULL,
  "value" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL DEFAULT '',
  "manufacturerContext" TEXT,
  "supplierId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deactivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArticleIdentifier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleSupplierMapping" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "supplierCode" TEXT NOT NULL,
  "normalizedCode" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deactivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArticleSupplierMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleTraceabilityPolicy" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "policy" "ArticleTraceabilityPolicyKind" NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleTraceabilityPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_article_identifier_scope_active" ON "ArticleIdentifier"("organizationId", "type", "normalizedValue", "scopeKey") WHERE "isActive" = true;
CREATE INDEX "ix_article_identifier_resolution" ON "ArticleIdentifier"("organizationId", "type", "normalizedValue", "isActive");
CREATE INDEX "ix_article_identifier_search" ON "ArticleIdentifier"("organizationId", "normalizedValue", "isActive");
CREATE UNIQUE INDEX "uq_article_supplier_mapping_active" ON "ArticleSupplierMapping"("organizationId", "supplierId", "normalizedCode") WHERE "isActive" = true;
CREATE INDEX "ix_article_supplier_mapping_search" ON "ArticleSupplierMapping"("organizationId", "normalizedCode", "isActive");
CREATE UNIQUE INDEX "uq_article_trace_policy_effective" ON "ArticleTraceabilityPolicy"("organizationId", "articleId", "effectiveAt");
CREATE INDEX "ix_article_trace_policy_article" ON "ArticleTraceabilityPolicy"("organizationId", "articleId", "effectiveAt");

ALTER TABLE "ArticleIdentifier" ADD CONSTRAINT "fk_article_identifier_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "Article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArticleIdentifier" ADD CONSTRAINT "fk_article_identifier_supplier" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArticleSupplierMapping" ADD CONSTRAINT "fk_article_supplier_mapping_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "Article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArticleSupplierMapping" ADD CONSTRAINT "fk_article_supplier_mapping_supplier" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArticleTraceabilityPolicy" ADD CONSTRAINT "fk_article_trace_policy_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "Article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
