-- FASE 1C — Presupuesto core versionable + items

CREATE TABLE "presupuesto" (
  "id" TEXT NOT NULL,
  "visibleNumber" INTEGER,
  "companyId" TEXT NOT NULL,
  "surgeryId" TEXT,
  "parentPresupuestoId" TEXT,
  "versionNumber" INTEGER NOT NULL DEFAULT 1,
  "state" TEXT NOT NULL DEFAULT 'Borrador',
  "title" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "subtotal" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "total" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "validUntil" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "presupuesto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "presupuesto_item" (
  "id" TEXT NOT NULL,
  "presupuestoId" TEXT NOT NULL,
  "sku" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(18, 4) NOT NULL,
  "unit" TEXT,
  "unitPrice" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "discount" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "tax" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "total" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "presupuesto_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "presupuesto_companyId_visibleNumber_key" ON "presupuesto"("companyId", "visibleNumber");
CREATE INDEX "presupuesto_companyId_surgeryId_state_idx" ON "presupuesto"("companyId", "surgeryId", "state");
CREATE INDEX "presupuesto_companyId_state_idx" ON "presupuesto"("companyId", "state");
CREATE INDEX "presupuesto_parentPresupuestoId_idx" ON "presupuesto"("parentPresupuestoId");
CREATE INDEX "presupuesto_item_presupuestoId_idx" ON "presupuesto_item"("presupuestoId");
CREATE INDEX "presupuesto_item_sku_idx" ON "presupuesto_item"("sku");

ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_parentPresupuestoId_fkey" FOREIGN KEY ("parentPresupuestoId") REFERENCES "presupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "presupuesto_item" ADD CONSTRAINT "presupuesto_item_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
