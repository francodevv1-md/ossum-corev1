-- CreateTable
CREATE TABLE "article_company_commercial_profile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "referenceCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "referenceSalePrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "priceListCode" TEXT,
    "preferredSupplierId" TEXT,
    "leadTimeDays" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "article_company_commercial_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_accp_org_company" ON "article_company_commercial_profile"("organizationId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_article_company_commercial_profile" ON "article_company_commercial_profile"("companyId", "articleId");

-- AddForeignKey
ALTER TABLE "article_company_commercial_profile" ADD CONSTRAINT "fk_accp_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_company_commercial_profile" ADD CONSTRAINT "fk_accp_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_company_commercial_profile" ADD CONSTRAINT "fk_accp_preferred_supplier" FOREIGN KEY ("preferredSupplierId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE RESTRICT;
