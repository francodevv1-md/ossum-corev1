-- OSSUM COR — Consumo y Devolución (Fase 1B)
-- Catálogos controlados en src/lib/validators/consumo.ts y devolucion.ts (NO enums Prisma).
-- Consumo.state  ∈ Borrador | Pendiente | Validado | Facturado | Anulado
-- Devolucion.state ∈ Borrador | Pendiente | Confirmada | Rechazada | Anulada
-- remitoId en Consumo es FK OBLIGATORIA (RESTRICT) — repara conflicto C6:
--   en el store viejo consumo.remitoId no se guardaba. Aquí es columna NOT NULL con FK.
-- Devolucion es entidad propia: NO muta Remito items (separation of concerns).
--   Integración con RemitoItem.returnedQuantity queda diferida a Fase 1A.2.
-- remitoItemId / consumoItemId en items son FK blandas opcionales (SET NULL on delete).

-- CreateTable
CREATE TABLE "consumo" (
    "id" TEXT NOT NULL,
    "visibleNumber" INTEGER,
    "companyId" TEXT NOT NULL,
    "surgeryId" TEXT,
    "remitoId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Borrador',
    "validatedAt" TIMESTAMP(3),
    "facturedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumo_item" (
    "id" TEXT NOT NULL,
    "consumoId" TEXT NOT NULL,
    "remitoItemId" TEXT,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(18,4) NOT NULL,
    "consumedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumo_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devolucion" (
    "id" TEXT NOT NULL,
    "visibleNumber" INTEGER,
    "companyId" TEXT NOT NULL,
    "surgeryId" TEXT,
    "remitoId" TEXT NOT NULL,
    "consumoId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Borrador',
    "reason" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devolucion_item" (
    "id" TEXT NOT NULL,
    "devolucionId" TEXT NOT NULL,
    "remitoItemId" TEXT,
    "consumoItemId" TEXT,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "returnedQuantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devolucion_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consumo_companyId_surgeryId_state_idx" ON "consumo"("companyId", "surgeryId", "state");

-- CreateIndex
CREATE INDEX "consumo_companyId_remitoId_idx" ON "consumo"("companyId", "remitoId");

-- CreateIndex
CREATE INDEX "consumo_companyId_state_idx" ON "consumo"("companyId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "consumo_companyId_visibleNumber_key" ON "consumo"("companyId", "visibleNumber");

-- CreateIndex
CREATE INDEX "consumo_item_consumoId_idx" ON "consumo_item"("consumoId");

-- CreateIndex
CREATE INDEX "consumo_item_remitoItemId_idx" ON "consumo_item"("remitoItemId");

-- CreateIndex
CREATE INDEX "devolucion_companyId_surgeryId_state_idx" ON "devolucion"("companyId", "surgeryId", "state");

-- CreateIndex
CREATE INDEX "devolucion_companyId_remitoId_idx" ON "devolucion"("companyId", "remitoId");

-- CreateIndex
CREATE INDEX "devolucion_companyId_consumoId_idx" ON "devolucion"("companyId", "consumoId");

-- CreateIndex
CREATE UNIQUE INDEX "devolucion_companyId_visibleNumber_key" ON "devolucion"("companyId", "visibleNumber");

-- CreateIndex
CREATE INDEX "devolucion_item_devolucionId_idx" ON "devolucion_item"("devolucionId");

-- CreateIndex
CREATE INDEX "devolucion_item_remitoItemId_idx" ON "devolucion_item"("remitoItemId");

-- CreateIndex
CREATE INDEX "devolucion_item_consumoItemId_idx" ON "devolucion_item"("consumoItemId");

-- AddForeignKey
ALTER TABLE "consumo" ADD CONSTRAINT "consumo_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo" ADD CONSTRAINT "consumo_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo" ADD CONSTRAINT "consumo_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo" ADD CONSTRAINT "consumo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo" ADD CONSTRAINT "consumo_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo_item" ADD CONSTRAINT "consumo_item_consumoId_fkey" FOREIGN KEY ("consumoId") REFERENCES "consumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo_item" ADD CONSTRAINT "consumo_item_remitoItemId_fkey" FOREIGN KEY ("remitoItemId") REFERENCES "RemitoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_consumoId_fkey" FOREIGN KEY ("consumoId") REFERENCES "consumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_item" ADD CONSTRAINT "devolucion_item_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "devolucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_item" ADD CONSTRAINT "devolucion_item_remitoItemId_fkey" FOREIGN KEY ("remitoItemId") REFERENCES "RemitoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_item" ADD CONSTRAINT "devolucion_item_consumoItemId_fkey" FOREIGN KEY ("consumoItemId") REFERENCES "consumo_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;