-- CreateTable
CREATE TABLE "price_list" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "price_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_company_price_version" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "price_list_id" TEXT NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_company_price_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_price_list_company_active" ON "price_list"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "uq_price_list_company_code" ON "price_list"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_price_list_company_id" ON "price_list"("company_id", "id");

-- CreateIndex
CREATE INDEX "ix_acpv_lookup" ON "article_company_price_version"("company_id", "article_id", "price_list_id", "effective_at" DESC);

-- CreateIndex
CREATE INDEX "ix_acpv_price_list" ON "article_company_price_version"("company_id", "price_list_id");

-- CreateIndex
CREATE INDEX "ix_acpv_article" ON "article_company_price_version"("company_id", "article_id");

-- AddForeignKey
ALTER TABLE "price_list" ADD CONSTRAINT "fk_price_list_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_company_price_version" ADD CONSTRAINT "fk_acpv_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_company_price_version" ADD CONSTRAINT "fk_acpv_article" FOREIGN KEY ("organization_id", "article_id") REFERENCES "article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_company_price_version" ADD CONSTRAINT "fk_acpv_price_list" FOREIGN KEY ("company_id", "price_list_id") REFERENCES "price_list"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_company_price_version" ADD CONSTRAINT "fk_acpv_created_by" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
