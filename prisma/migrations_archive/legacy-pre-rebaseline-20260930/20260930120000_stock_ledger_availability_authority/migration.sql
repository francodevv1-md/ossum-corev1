-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'TRANSFER';

-- AlterTable
ALTER TABLE "stock_movement"
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "box_id" TEXT,
  ADD COLUMN IF NOT EXISTS "remito_id" TEXT,
  ADD COLUMN IF NOT EXISTS "remito_item_id" TEXT,
  ADD COLUMN IF NOT EXISTS "consumo_id" TEXT,
  ADD COLUMN IF NOT EXISTS "consumo_item_id" TEXT,
  ADD COLUMN IF NOT EXISTS "devolucion_id" TEXT,
  ADD COLUMN IF NOT EXISTS "devolucion_item_id" TEXT,
  ADD COLUMN IF NOT EXISTS "surgery_id" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ix_stock_movement_remito" ON "stock_movement"("company_id", "remito_id");
CREATE INDEX IF NOT EXISTS "ix_stock_movement_surgery" ON "stock_movement"("company_id", "surgery_id");
CREATE INDEX IF NOT EXISTS "ix_stock_movement_lot" ON "stock_movement"("company_id", "lot_code");
