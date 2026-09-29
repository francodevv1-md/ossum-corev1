-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ArticleIdentifierType') THEN
        CREATE TYPE "ArticleIdentifierType" AS ENUM ('MANUFACTURER_REF', 'GTIN_EAN', 'GS1_AI_22', 'SUPPLIER_CODE', 'ALTERNATIVE_CODE', 'OSSUM_CODE');
    END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ArticleTraceabilityPolicyKind') THEN
        CREATE TYPE "ArticleTraceabilityPolicyKind" AS ENUM ('NONE', 'LOT', 'LOT_EXPIRY', 'SERIAL', 'SERIAL_EXPIRY', 'LOT_SERIAL_EXPIRY');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "article" (
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
    "vatTreatment" TEXT NOT NULL DEFAULT 'GRAVADO',
    "vatRate" DECIMAL(18,4) NOT NULL DEFAULT 21.0000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "article_identifier" (
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

    CONSTRAINT "article_identifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "article_supplier_mapping" (
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

    CONSTRAINT "article_supplier_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "article_traceability_policy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "policy" "ArticleTraceabilityPolicyKind" NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_traceability_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "stock_article_eligibility" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_article_eligibility_pkey" PRIMARY KEY ("id")
);

-- Ensure VAT columns exist and are deterministically backfilled if table pre-existed
ALTER TABLE "article" ADD COLUMN IF NOT EXISTS "vatTreatment" TEXT NOT NULL DEFAULT 'GRAVADO';
ALTER TABLE "article" ADD COLUMN IF NOT EXISTS "vatRate" DECIMAL(18,4) NOT NULL DEFAULT 21.0000;
UPDATE "article" SET "vatTreatment" = 'GRAVADO', "vatRate" = 21.0000 WHERE "vatRate" IS NULL OR "vatTreatment" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_article_org_sku" ON "article"("organizationId", "sku");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_article_org_id" ON "article"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_article_identifier_global_active" ON "article_identifier"("organizationId", "type", "normalizedValue", "scopeKey") WHERE "isActive" = true AND "companyId" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_article_identifier_company_active" ON "article_identifier"("organizationId", "companyId", "type", "normalizedValue", "scopeKey") WHERE "isActive" = true AND "companyId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "ix_article_identifier_search" ON "article_identifier"("organizationId", "companyId", "normalizedValue", "isActive");
CREATE INDEX IF NOT EXISTS "ix_article_identifier_resolution" ON "article_identifier"("organizationId", "companyId", "type", "normalizedValue", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_article_supplier_mapping_active" ON "article_supplier_mapping"("organizationId", "companyId", "supplierId", "normalizedCode") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS "ix_article_supplier_mapping_search" ON "article_supplier_mapping"("organizationId", "companyId", "normalizedCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_article_trace_policy_effective" ON "article_traceability_policy"("organizationId", "articleId", "effectiveAt");
CREATE INDEX IF NOT EXISTS "ix_article_trace_policy_article" ON "article_traceability_policy"("organizationId", "articleId", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_stock_article_eligibility" ON "stock_article_eligibility"("companyId", "articleId");
CREATE INDEX IF NOT EXISTS "ix_stock_article_eligibility_company_version" ON "stock_article_eligibility"("companyId", "version");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_article_organization') THEN
        ALTER TABLE "article" ADD CONSTRAINT "fk_article_organization" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_article_identifier_article') THEN
        ALTER TABLE "article_identifier" ADD CONSTRAINT "fk_article_identifier_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_article_identifier_supplier_link') THEN
        ALTER TABLE "article_identifier" ADD CONSTRAINT "fk_article_identifier_supplier_link" FOREIGN KEY ("supplierId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE RESTRICT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_article_supplier_mapping_article') THEN
        ALTER TABLE "article_supplier_mapping" ADD CONSTRAINT "fk_article_supplier_mapping_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_article_supplier_mapping_supplier_link') THEN
        ALTER TABLE "article_supplier_mapping" ADD CONSTRAINT "fk_article_supplier_mapping_supplier_link" FOREIGN KEY ("supplierId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE RESTRICT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_article_trace_policy_article') THEN
        ALTER TABLE "article_traceability_policy" ADD CONSTRAINT "fk_article_trace_policy_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sae_company') THEN
        ALTER TABLE "stock_article_eligibility" ADD CONSTRAINT "fk_sae_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sae_article') THEN
        ALTER TABLE "stock_article_eligibility" ADD CONSTRAINT "fk_sae_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
