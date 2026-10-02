CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'RELEASED');
CREATE TABLE "stock_reservation" (
  "id" TEXT NOT NULL, "company_id" TEXT NOT NULL, "article_id" TEXT NOT NULL,
  "physical_unit_id" TEXT NOT NULL, "assignment_id" TEXT NOT NULL, "active_slot" INTEGER DEFAULT 1,
  "status" "StockReservationStatus" NOT NULL DEFAULT 'ACTIVE', "semantic_key" TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL, "released_at" TIMESTAMPTZ(6), "released_by_id" TEXT,
  "release_cause" TEXT, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_reservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_stock_reservation_company_semantic" ON "stock_reservation"("company_id", "semantic_key");
CREATE UNIQUE INDEX "uq_stock_reservation_active_unit" ON "stock_reservation"("company_id", "physical_unit_id", "active_slot");
CREATE INDEX "ix_stock_reservation_assignment_status" ON "stock_reservation"("company_id", "assignment_id", "status");
ALTER TABLE "stock_reservation" ADD CONSTRAINT "fk_sr_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_reservation" ADD CONSTRAINT "fk_sr_article" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_reservation" ADD CONSTRAINT "fk_sr_unit" FOREIGN KEY ("physical_unit_id") REFERENCES "stock_physical_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_reservation" ADD CONSTRAINT "fk_sr_created_by" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_reservation" ADD CONSTRAINT "fk_sr_released_by" FOREIGN KEY ("released_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
