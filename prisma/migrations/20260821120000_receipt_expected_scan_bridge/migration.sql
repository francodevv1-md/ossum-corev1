-- Receipt expected-vs-received bridge for supplier-remit OCR and physical scanning.
ALTER TABLE "GoodsReceiptLine"
  ADD COLUMN "expectedQuantity" DECIMAL(24,4),
  ADD COLUMN "receivedQuantity" DECIMAL(24,4) NOT NULL DEFAULT 0,
  ADD COLUMN "expectedCode" TEXT,
  ADD COLUMN "expectedDescription" TEXT,
  ADD COLUMN "receivedLotCode" TEXT,
  ADD COLUMN "receivedSerialNumber" TEXT,
  ADD COLUMN "receivedExpirationDate" DATE;

UPDATE "GoodsReceiptLine"
SET "receivedQuantity" = "requestedQuantity"
WHERE "resolutionStatus" = 'RESOLVED';

CREATE INDEX "ix_goods_receipt_line_expected_code"
  ON "GoodsReceiptLine" ("companyId", "expectedCode");
