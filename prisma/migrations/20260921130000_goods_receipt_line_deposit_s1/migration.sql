-- The historical receipt migration is absent from this clean chain. Create the
-- schema-declared receipt base before adding the S1 deposit destination.
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "supplierId" TEXT,
    "documentReference" TEXT,
    "idempotencyKey" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoodsReceiptLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "articleId" TEXT,
    "depositId" TEXT,
    "requestedQuantity" DECIMAL(24,4) NOT NULL,
    "expectedQuantity" DECIMAL(24,4),
    "receivedQuantity" DECIMAL(24,4) NOT NULL DEFAULT 0,
    "expectedCode" TEXT,
    "expectedDescription" TEXT,
    "lotCode" TEXT,
    "serialNumber" TEXT,
    "expirationDate" DATE,
    "receivedLotCode" TEXT,
    "receivedSerialNumber" TEXT,
    "receivedExpirationDate" DATE,
    "rawScan" TEXT,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "pendingReason" TEXT,
    "confirmedEvidenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "lineId" TEXT,
    "articleId" TEXT,
    "rawValue" TEXT NOT NULL,
    "normalizedValue" TEXT,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "candidates" JSONB,
    "lotCode" TEXT,
    "serialNumber" TEXT,
    "expirationDate" DATE,
    "captureHistory" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_goods_receipt_company_id" ON "GoodsReceipt"("companyId", "id");
CREATE UNIQUE INDEX "uq_goods_receipt_idempotency" ON "GoodsReceipt"("companyId", "idempotencyKey");
CREATE INDEX "GoodsReceipt_companyId_status_createdAt_idx" ON "GoodsReceipt"("companyId", "status", "createdAt");
CREATE UNIQUE INDEX "uq_goods_receipt_line_company_id" ON "GoodsReceiptLine"("companyId", "id");
CREATE UNIQUE INDEX "uq_goods_receipt_line_number" ON "GoodsReceiptLine"("receiptId", "lineNumber");
CREATE UNIQUE INDEX "uq_goods_receipt_line_receipt_id" ON "GoodsReceiptLine"("companyId", "receiptId", "id");
CREATE INDEX "GoodsReceiptLine_companyId_articleId_resolutionStatus_idx" ON "GoodsReceiptLine"("companyId", "articleId", "resolutionStatus");
CREATE INDEX "ix_grl_company_deposit" ON "GoodsReceiptLine"("companyId", "depositId");
CREATE UNIQUE INDEX "uq_scan_event_company_id" ON "ScanEvent"("companyId", "id");
CREATE INDEX "ScanEvent_companyId_receiptId_createdAt_idx" ON "ScanEvent"("companyId", "receiptId", "createdAt");
CREATE INDEX "ScanEvent_companyId_receiptId_resolutionStatus_idx" ON "ScanEvent"("companyId", "receiptId", "resolutionStatus");
CREATE INDEX "ScanEvent_articleId_idx" ON "ScanEvent"("articleId");

ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_companyId_receiptId_fkey" FOREIGN KEY ("companyId", "receiptId") REFERENCES "GoodsReceipt"("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_companyId_articleId_fkey" FOREIGN KEY ("companyId", "articleId") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "fk_grl_deposit" FOREIGN KEY ("companyId", "depositId") REFERENCES "StockDeposit"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_companyId_receiptId_fkey" FOREIGN KEY ("companyId", "receiptId") REFERENCES "GoodsReceipt"("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_companyId_receiptId_lineId_fkey" FOREIGN KEY ("companyId", "receiptId", "lineId") REFERENCES "GoodsReceiptLine"("companyId", "receiptId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_companyId_articleId_fkey" FOREIGN KEY ("companyId", "articleId") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
