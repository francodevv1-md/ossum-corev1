-- Add normalized lot/serial/expiration traceability fields to Remito/Consumo/Devolucion item rows.
-- Safe additive migration only; keeps existing metadata-based trace data intact.

ALTER TABLE "RemitoItem"
  ADD COLUMN "lotNumber" TEXT,
  ADD COLUMN "serialNumber" TEXT,
  ADD COLUMN "expirationDate" TIMESTAMP(3);

ALTER TABLE "consumo_item"
  ADD COLUMN "lotNumber" TEXT,
  ADD COLUMN "serialNumber" TEXT,
  ADD COLUMN "expirationDate" TIMESTAMP(3);

ALTER TABLE "devolucion_item"
  ADD COLUMN "lotNumber" TEXT,
  ADD COLUMN "serialNumber" TEXT,
  ADD COLUMN "expirationDate" TIMESTAMP(3);

CREATE INDEX "RemitoItem_lotNumber_idx" ON "RemitoItem"("lotNumber");
CREATE INDEX "RemitoItem_expirationDate_idx" ON "RemitoItem"("expirationDate");
CREATE INDEX "consumo_item_lotNumber_idx" ON "consumo_item"("lotNumber");
CREATE INDEX "consumo_item_expirationDate_idx" ON "consumo_item"("expirationDate");
CREATE INDEX "devolucion_item_lotNumber_idx" ON "devolucion_item"("lotNumber");
CREATE INDEX "devolucion_item_expirationDate_idx" ON "devolucion_item"("expirationDate");
