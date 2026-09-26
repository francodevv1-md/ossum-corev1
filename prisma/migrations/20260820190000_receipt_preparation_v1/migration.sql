-- Receipt + Surgery Preparation V1. Applied to the confirmed disposable DEV database.
CREATE TABLE "GoodsReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "confirmedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "supplierId" TEXT,
  "documentReference" TEXT,
  "idempotencyKey" TEXT,
  "confirmedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "uq_goods_receipt_company_id" UNIQUE ("companyId", "id"),
  CONSTRAINT "uq_goods_receipt_idempotency" UNIQUE ("companyId", "idempotencyKey"),
  CONSTRAINT "fk_goods_receipt_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_goods_receipt_created_by" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_goods_receipt_confirmed_by" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT
);
CREATE TABLE "GoodsReceiptLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "articleId" TEXT,
  "requestedQuantity" DECIMAL(24,4) NOT NULL,
  "lotCode" TEXT,
  "serialNumber" TEXT,
  "expirationDate" DATE,
  "rawScan" TEXT,
  "resolutionStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "pendingReason" TEXT,
  "confirmedEvidenceId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "uq_goods_receipt_line_company_id" UNIQUE ("companyId", "id"),
  CONSTRAINT "uq_goods_receipt_line_number" UNIQUE ("receiptId", "lineNumber"),
  CONSTRAINT "fk_goods_receipt_line_receipt" FOREIGN KEY ("companyId", "receiptId") REFERENCES "GoodsReceipt"("companyId", "id") ON DELETE CASCADE,
  CONSTRAINT "fk_goods_receipt_line_article" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "uq_goods_receipt_line_receipt_id" ON "GoodsReceiptLine" ("companyId", "receiptId", "id");
CREATE TABLE "ScanEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "lineId" TEXT,
  "rawValue" TEXT NOT NULL,
  "normalizedValue" TEXT,
  "resolutionStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "candidates" JSONB,
  "lotCode" TEXT,
  "serialNumber" TEXT,
  "expirationDate" DATE,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uq_scan_event_company_id" UNIQUE ("companyId", "id"),
  CONSTRAINT "fk_scan_event_receipt" FOREIGN KEY ("companyId", "receiptId") REFERENCES "GoodsReceipt"("companyId", "id") ON DELETE CASCADE,
  CONSTRAINT "fk_scan_event_line" FOREIGN KEY ("companyId", "receiptId", "lineId") REFERENCES "GoodsReceiptLine"("companyId", "receiptId", "id") ON DELETE RESTRICT,
  CONSTRAINT "fk_scan_event_created_by" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT
);
CREATE TABLE "SurgeryPreparation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "surgeryId" TEXT NOT NULL,
  "cajasAssignmentId" TEXT,
  "createdById" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "uq_surgery_preparation_company_id" UNIQUE ("companyId", "id"),
  CONSTRAINT "uq_surgery_preparation_surgery" UNIQUE ("companyId", "surgeryId"),
  CONSTRAINT "uq_surgery_preparation_idempotency" UNIQUE ("companyId", "idempotencyKey"),
  CONSTRAINT "fk_surgery_preparation_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_surgery_preparation_surgery" FOREIGN KEY ("companyId", "surgeryId") REFERENCES "Surgery"("companyId", "id") ON DELETE RESTRICT,
  CONSTRAINT "fk_surgery_preparation_cajas" FOREIGN KEY ("companyId", "cajasAssignmentId") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "fk_surgery_preparation_created_by" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT
);
CREATE TABLE "SurgeryPreparationLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "preparationId" TEXT NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "articleId" TEXT NOT NULL,
  "requestedQuantity" DECIMAL(24,4) NOT NULL,
  "preparedQuantity" DECIMAL(24,4) NOT NULL DEFAULT 0,
  "stockUnit" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "uq_surgery_preparation_line_company_id" UNIQUE ("companyId", "id"),
  CONSTRAINT "uq_surgery_preparation_line_number" UNIQUE ("preparationId", "lineNumber"),
  CONSTRAINT "fk_surgery_preparation_line_preparation" FOREIGN KEY ("companyId", "preparationId") REFERENCES "SurgeryPreparation"("companyId", "id") ON DELETE CASCADE,
  CONSTRAINT "fk_surgery_preparation_line_article" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT
);
ALTER TABLE "StockReservation" ADD COLUMN "preparationLineId" TEXT;
CREATE INDEX "ix_goods_receipt_company_status" ON "GoodsReceipt" ("companyId", "status", "createdAt");
CREATE INDEX "ix_scan_event_company_receipt" ON "ScanEvent" ("companyId", "receiptId", "createdAt");
CREATE INDEX "ix_surgery_preparation_company_status" ON "SurgeryPreparation" ("companyId", "status", "updatedAt");
CREATE INDEX "ix_stock_reservation_preparation_line" ON "StockReservation" ("companyId", "preparationLineId");
ALTER TABLE "StockReservation" ADD CONSTRAINT "fk_stock_reservation_preparation_line" FOREIGN KEY ("companyId", "preparationLineId") REFERENCES "SurgeryPreparationLine"("companyId", "id") ON DELETE RESTRICT;
