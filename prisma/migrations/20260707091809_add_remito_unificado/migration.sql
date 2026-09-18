-- OSSUM COR — Remito unificado (Fase 1A / V1 salida)
-- Catálogos controlados en la capa de servicio/validator (NO enums Prisma).
-- origin ∈ box | presupuesto | manual | mixto
-- salidaReason ∈ cirugia | venta | prestamo | traslado | ajuste | otro
-- state  ∈ Borrador | Emitido | En_transito | Entregado | Parcialmente_devuelto | Devuelto | Anulado
-- boxId / presupuestoId son stubs planos sin FK en V0 (FK blanda validada en service).
-- branchId es nullable a nivel DB para backfill no destructivo; service/API lo exige para nuevos V1.

-- CreateTable
CREATE TABLE "Remito" (
    "id" TEXT NOT NULL,
    "visibleNumber" INTEGER,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "issuedBranchId" TEXT,
    "documentType" TEXT NOT NULL DEFAULT 'REMITO_SALIDA',
    "surgeryId" TEXT,
    "origin" TEXT NOT NULL,
    "salidaReason" TEXT NOT NULL DEFAULT 'cirugia',
    "boxId" TEXT,
    "presupuestoId" TEXT,
    "destinatarioContactId" TEXT,
    "destinatarioSnapshot" JSONB,
    "shippingAddressSnapshot" JSONB,
    "transportSnapshot" JSONB,
    "packageCount" INTEGER,
    "declaredValue" DECIMAL(18,4),
    "state" TEXT NOT NULL DEFAULT 'Borrador',
    "issuedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Remito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemitoItem" (
    "id" TEXT NOT NULL,
    "remitoId" TEXT NOT NULL,
    "itemId" TEXT,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "boxId" TEXT,
    "presupuestoItemId" TEXT,
    "returnedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemitoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Remito_companyId_surgeryId_state_idx" ON "Remito"("companyId", "surgeryId", "state");

-- CreateIndex
CREATE INDEX "Remito_companyId_branchId_state_idx" ON "Remito"("companyId", "branchId", "state");

-- CreateIndex
CREATE INDEX "Remito_companyId_state_idx" ON "Remito"("companyId", "state");

-- CreateIndex
CREATE INDEX "Remito_companyId_origin_idx" ON "Remito"("companyId", "origin");

-- CreateIndex
CREATE INDEX "Remito_companyId_salidaReason_idx" ON "Remito"("companyId", "salidaReason");

-- CreateIndex
CREATE INDEX "Remito_companyId_issuedAt_idx" ON "Remito"("companyId", "issuedAt");

-- CreateIndex
CREATE INDEX "Remito_surgeryId_idx" ON "Remito"("surgeryId");

-- CreateIndex
CREATE UNIQUE INDEX "Remito_companyId_branchId_documentType_visibleNumber_key" ON "Remito"("companyId", "branchId", "documentType", "visibleNumber");

-- CreateIndex
CREATE INDEX "RemitoItem_remitoId_idx" ON "RemitoItem"("remitoId");

-- CreateIndex
CREATE INDEX "RemitoItem_itemId_idx" ON "RemitoItem"("itemId");

-- CreateIndex
CREATE INDEX "RemitoItem_presupuestoItemId_idx" ON "RemitoItem"("presupuestoItemId");

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_issuedBranchId_fkey" FOREIGN KEY ("issuedBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemitoItem" ADD CONSTRAINT "RemitoItem_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE CASCADE ON UPDATE CASCADE;
