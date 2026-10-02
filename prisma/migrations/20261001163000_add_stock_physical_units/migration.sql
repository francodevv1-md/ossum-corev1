-- Stock-owned identity for serialized physical units such as Caja identificada.
-- This is intentionally separate from the append-only stock movement ledger.
CREATE TYPE "StockPhysicalUnitStatus" AS ENUM ('ACTIVE', 'RETIRED');

CREATE TABLE "stock_physical_unit" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "unit_code" TEXT NOT NULL,
    "serial_number" TEXT,
    "location" TEXT,
    "status" "StockPhysicalUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" TEXT,
    "retired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_physical_unit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_stock_physical_unit_company_id" ON "stock_physical_unit"("company_id", "id");
CREATE UNIQUE INDEX "uq_stock_physical_unit_company_code" ON "stock_physical_unit"("company_id", "unit_code");
CREATE UNIQUE INDEX "uq_stock_physical_unit_company_serial" ON "stock_physical_unit"("company_id", "serial_number");
CREATE INDEX "ix_stock_physical_unit_company_article_status" ON "stock_physical_unit"("company_id", "article_id", "status");
CREATE INDEX "ix_stock_physical_unit_company_location" ON "stock_physical_unit"("company_id", "location");

ALTER TABLE "stock_physical_unit"
  ADD CONSTRAINT "fk_spu_company"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_physical_unit"
  ADD CONSTRAINT "fk_spu_article"
  FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_physical_unit"
  ADD CONSTRAINT "fk_spu_created_by"
  FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
