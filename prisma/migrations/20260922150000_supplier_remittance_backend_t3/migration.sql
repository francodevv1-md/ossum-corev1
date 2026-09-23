CREATE TABLE "SupplierRemittance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "documentDate" DATE NOT NULL,
    "observations" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierRemittance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierRemittanceLine" (
    "id" TEXT NOT NULL,
    "supplierRemittanceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "expectedCode" TEXT,
    "expectedDescription" TEXT NOT NULL,
    "expectedQuantity" DECIMAL(24,4) NOT NULL,
    "articleId" TEXT,
    "lotCode" TEXT,
    "expirationDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierRemittanceLine_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GoodsReceipt" ADD COLUMN "supplierRemittanceId" TEXT;
CREATE UNIQUE INDEX "uq_goods_receipt_supplier_remittance" ON "GoodsReceipt"("companyId", "supplierRemittanceId");
CREATE UNIQUE INDEX "uq_supplier_remittance_company_id" ON "SupplierRemittance"("companyId", "id");
CREATE UNIQUE INDEX "uq_supplier_remittance_number" ON "SupplierRemittance"("companyId", "number");
CREATE INDEX "ix_supplier_remittance_company_date" ON "SupplierRemittance"("companyId", "documentDate");
CREATE UNIQUE INDEX "uq_supplier_remittance_line_number" ON "SupplierRemittanceLine"("supplierRemittanceId", "lineNumber");

ALTER TABLE "SupplierRemittance" ADD CONSTRAINT "SupplierRemittance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierRemittance" ADD CONSTRAINT "SupplierRemittance_supplierId_companyId_fkey" FOREIGN KEY ("supplierId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierRemittanceLine" ADD CONSTRAINT "SupplierRemittanceLine_supplierRemittanceId_fkey" FOREIGN KEY ("supplierRemittanceId") REFERENCES "SupplierRemittance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_companyId_supplierRemittanceId_fkey" FOREIGN KEY ("companyId", "supplierRemittanceId") REFERENCES "SupplierRemittance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
