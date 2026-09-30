-- Fase 1D — Facturación operacional, cobros e imputaciones por FK real.
-- Sin integración fiscal TusFacturasAPP/AFIP: Invoice guarda verdad operacional.

CREATE TABLE "invoice" (
  "id" TEXT NOT NULL,
  "visibleNumber" INTEGER,
  "companyId" TEXT NOT NULL,
  "surgeryId" TEXT,
  "presupuestoId" TEXT,
  "consumoId" TEXT,
  "base" TEXT NOT NULL DEFAULT 'manual',
  "state" TEXT NOT NULL DEFAULT 'Borrador',
  "type" TEXT NOT NULL DEFAULT 'FV',
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "paidTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "issuedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_item" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "sku" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "unit" TEXT,
  "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "sourceType" TEXT,
  "sourceItemId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoice_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment" (
  "id" TEXT NOT NULL,
  "visibleNumber" INTEGER,
  "companyId" TEXT NOT NULL,
  "surgeryId" TEXT,
  "state" TEXT NOT NULL DEFAULT 'Registrado',
  "method" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "amount" DECIMAL(18,4) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_imputation" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_imputation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoice_companyId_visibleNumber_key" ON "invoice"("companyId", "visibleNumber");
CREATE INDEX "invoice_companyId_surgeryId_state_idx" ON "invoice"("companyId", "surgeryId", "state");
CREATE INDEX "invoice_companyId_state_idx" ON "invoice"("companyId", "state");
CREATE INDEX "invoice_presupuestoId_idx" ON "invoice"("presupuestoId");
CREATE INDEX "invoice_consumoId_idx" ON "invoice"("consumoId");

CREATE INDEX "invoice_item_invoiceId_idx" ON "invoice_item"("invoiceId");
CREATE INDEX "invoice_item_sku_idx" ON "invoice_item"("sku");
CREATE INDEX "invoice_item_sourceType_sourceItemId_idx" ON "invoice_item"("sourceType", "sourceItemId");

CREATE UNIQUE INDEX "payment_companyId_visibleNumber_key" ON "payment"("companyId", "visibleNumber");
CREATE INDEX "payment_companyId_surgeryId_state_idx" ON "payment"("companyId", "surgeryId", "state");
CREATE INDEX "payment_companyId_receivedAt_idx" ON "payment"("companyId", "receivedAt");

CREATE UNIQUE INDEX "payment_imputation_paymentId_invoiceId_key" ON "payment_imputation"("paymentId", "invoiceId");
CREATE INDEX "payment_imputation_invoiceId_idx" ON "payment_imputation"("invoiceId");

ALTER TABLE "invoice" ADD CONSTRAINT "invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_consumoId_fkey" FOREIGN KEY ("consumoId") REFERENCES "consumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment" ADD CONSTRAINT "payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment" ADD CONSTRAINT "payment_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment" ADD CONSTRAINT "payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment" ADD CONSTRAINT "payment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_imputation" ADD CONSTRAINT "payment_imputation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_imputation" ADD CONSTRAINT "payment_imputation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
