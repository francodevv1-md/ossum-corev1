BEGIN;
ALTER TABLE "stock_reservation"
  ALTER COLUMN "physical_unit_id" DROP NOT NULL,
  ADD COLUMN "preparation_line_id" TEXT,
  ADD COLUMN "stock_scope_reference_id" TEXT,
  ADD COLUMN "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
  ADD COLUMN "remaining_quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
  ADD COLUMN "dispatched_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "stock_reservation"
  ADD CONSTRAINT "fk_sr_company_unit" FOREIGN KEY ("company_id", "physical_unit_id") REFERENCES "stock_physical_unit"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "fk_sr_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "fk_sr_preparation_line" FOREIGN KEY ("company_id", "preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "fk_sr_stock_scope" FOREIGN KEY ("company_id", "stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ck_sr_quantities" CHECK ("quantity" > 0 AND "remaining_quantity" >= 0 AND "dispatched_quantity" >= 0 AND "remaining_quantity" + "dispatched_quantity" <= "quantity");
CREATE INDEX "ix_sr_scope_status" ON "stock_reservation"("company_id", "stock_scope_reference_id", "status");
COMMIT;
