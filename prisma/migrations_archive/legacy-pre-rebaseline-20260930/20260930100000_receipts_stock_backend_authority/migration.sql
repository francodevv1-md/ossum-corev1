-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PREPARED', 'IN_CONTROL', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiptScanStatus" AS ENUM ('RESOLVED', 'PENDING');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT_IN', 'DISPATCH_OUT', 'ADJUSTMENT', 'RETURN_IN');

-- CreateTable
CREATE TABLE "receipt" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "document_reference" TEXT,
    "supplier_id" TEXT,
    "idempotency_key" TEXT,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PREPARED',
    "notes" TEXT,
    "metadata" JSONB,
    "confirmed_at" TIMESTAMPTZ(6),
    "confirmed_by_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_line" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "article_id" TEXT,
    "expected_code" TEXT,
    "expected_description" TEXT,
    "expected_quantity" DECIMAL(18,4),
    "received_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "lot_code" TEXT,
    "serial_number" TEXT,
    "expiration_date" DATE,
    "resolution_status" "ReceiptScanStatus" NOT NULL DEFAULT 'RESOLVED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "receipt_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_scan" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "receipt_line_id" TEXT,
    "raw_value" TEXT NOT NULL,
    "resolution_status" "ReceiptScanStatus" NOT NULL DEFAULT 'RESOLVED',
    "article_id" TEXT,
    "lot_code" TEXT,
    "serial_number" TEXT,
    "expiration_date" DATE,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "movement_type" "StockMovementType" NOT NULL DEFAULT 'RECEIPT_IN',
    "quantity" DECIMAL(18,4) NOT NULL,
    "lot_code" TEXT,
    "serial_number" TEXT,
    "expiration_date" DATE,
    "receipt_id" TEXT,
    "receipt_line_id" TEXT,
    "idempotency_key" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_receipt_company_id" ON "receipt"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_receipt_idempotency" ON "receipt"("company_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);

-- CreateIndex
CREATE INDEX "ix_receipt_company_status" ON "receipt"("company_id", "status");

-- CreateIndex
CREATE INDEX "ix_receipt_company_created" ON "receipt"("company_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_receipt_line_company_id" ON "receipt_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_receipt_line_receipt_number" ON "receipt_line"("receipt_id", "line_number");

-- CreateIndex
CREATE INDEX "ix_receipt_line_receipt" ON "receipt_line"("company_id", "receipt_id");

-- CreateIndex
CREATE INDEX "ix_receipt_line_article" ON "receipt_line"("company_id", "article_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_receipt_scan_company_id" ON "receipt_scan"("company_id", "id");

-- CreateIndex
CREATE INDEX "ix_receipt_scan_receipt" ON "receipt_scan"("company_id", "receipt_id");

-- CreateIndex
CREATE INDEX "ix_receipt_scan_line" ON "receipt_scan"("company_id", "receipt_line_id");

-- CreateIndex
CREATE INDEX "ix_receipt_scan_status" ON "receipt_scan"("company_id", "resolution_status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_stock_movement_company_id" ON "stock_movement"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_stock_movement_idempotency" ON "stock_movement"("company_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);

-- CreateIndex
CREATE INDEX "ix_stock_movement_article" ON "stock_movement"("company_id", "article_id");

-- CreateIndex
CREATE INDEX "ix_stock_movement_receipt" ON "stock_movement"("company_id", "receipt_id");

-- CreateIndex
CREATE INDEX "ix_stock_movement_created" ON "stock_movement"("company_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line" ADD CONSTRAINT "receipt_line_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line" ADD CONSTRAINT "receipt_line_company_id_receipt_id_fkey" FOREIGN KEY ("company_id", "receipt_id") REFERENCES "receipt"("company_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line" ADD CONSTRAINT "receipt_line_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_scan" ADD CONSTRAINT "receipt_scan_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_scan" ADD CONSTRAINT "receipt_scan_company_id_receipt_id_fkey" FOREIGN KEY ("company_id", "receipt_id") REFERENCES "receipt"("company_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_scan" ADD CONSTRAINT "receipt_scan_receipt_line_id_fkey" FOREIGN KEY ("receipt_line_id") REFERENCES "receipt_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_scan" ADD CONSTRAINT "receipt_scan_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_receipt_line_id_fkey" FOREIGN KEY ("receipt_line_id") REFERENCES "receipt_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
