-- AlterTable
ALTER TABLE "fiscal_document" ALTER COLUMN "invoiceId" DROP NOT NULL;
ALTER TABLE "fiscal_document" ADD COLUMN "adjustmentDocumentId" TEXT;

-- CreateTable
CREATE TABLE "adjustment_document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "visibleNumber" INTEGER,
    "type" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Borrador',
    "originType" TEXT NOT NULL DEFAULT 'INTERNAL_INVOICE',
    "internalInvoiceId" TEXT,
    "externalDocType" TEXT,
    "externalPtoVta" INTEGER,
    "externalNumber" INTEGER,
    "externalIssueDate" TIMESTAMP(3),
    "externalIssuerCuit" TEXT,
    "externalCae" TEXT,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "surgeryId" TEXT,
    "clientName" TEXT,
    "clientDocumentType" TEXT,
    "clientDocumentNumber" TEXT,
    "clientVatCondition" TEXT,
    "modalidad" TEXT NOT NULL DEFAULT 'TOTAL',
    "motivo" TEXT NOT NULL,
    "observaciones" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adjustment_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjustment_document_item" (
    "id" TEXT NOT NULL,
    "adjustmentDocumentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "vatTreatment" TEXT NOT NULL DEFAULT 'GRAVADO',
    "vatRate" DECIMAL(18,4) NOT NULL DEFAULT 21.0000,
    "originalQuantity" DECIMAL(18,4),
    "sourceItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adjustment_document_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_fiscal_document_adjustment" ON "fiscal_document"("adjustmentDocumentId");

-- CreateIndex
CREATE INDEX "ix_fiscal_document_adjustment" ON "fiscal_document"("adjustmentDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_adjustment_company_visible_number" ON "adjustment_document"("companyId", "visibleNumber");

-- CreateIndex
CREATE INDEX "ix_adjustment_company_state_created" ON "adjustment_document"("companyId", "state", "createdAt");

-- CreateIndex
CREATE INDEX "ix_adjustment_company_origin" ON "adjustment_document"("companyId", "originType");

-- CreateIndex
CREATE INDEX "ix_adjustment_internal_invoice" ON "adjustment_document"("internalInvoiceId");

-- CreateIndex
CREATE INDEX "adjustment_document_item_adjustmentDocumentId_idx" ON "adjustment_document_item"("adjustmentDocumentId");

-- AddForeignKey
ALTER TABLE "fiscal_document" ADD CONSTRAINT "fiscal_document_adjustmentDocumentId_fkey" FOREIGN KEY ("adjustmentDocumentId") REFERENCES "adjustment_document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_document" ADD CONSTRAINT "adjustment_document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_document" ADD CONSTRAINT "adjustment_document_internalInvoiceId_fkey" FOREIGN KEY ("internalInvoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_document" ADD CONSTRAINT "adjustment_document_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_document" ADD CONSTRAINT "adjustment_document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_document" ADD CONSTRAINT "adjustment_document_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_document_item" ADD CONSTRAINT "adjustment_document_item_adjustmentDocumentId_fkey" FOREIGN KEY ("adjustmentDocumentId") REFERENCES "adjustment_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
