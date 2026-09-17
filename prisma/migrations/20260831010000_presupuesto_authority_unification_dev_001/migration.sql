-- PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001
-- Preconditions are inventoried read-only before apply. This migration does not repair legacy data.

CREATE TABLE "presupuesto_family" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "surgeryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "presupuesto_family_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "presupuesto"
  ADD COLUMN "familyId" TEXT NOT NULL,
  ADD COLUMN "sourcePresupuestoId" TEXT,
  ADD COLUMN "slot" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "branchId" TEXT NOT NULL,
  ADD COLUMN "clientContactId" TEXT NOT NULL,
  ADD COLUMN "payerContactId" TEXT NOT NULL,
  ADD COLUMN "documentDate" DATE NOT NULL,
  ADD COLUMN "paymentTerms" TEXT NOT NULL,
  ADD COLUMN "priceListCode" TEXT NOT NULL,
  ADD COLUMN "legend" TEXT NOT NULL,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "generalDiscountRate" DECIMAL(9,4) NOT NULL DEFAULT 0,
  ADD COLUMN "commercialSnapshot" JSONB NOT NULL;

ALTER TABLE "presupuesto_item"
  ADD COLUMN "position" INTEGER NOT NULL,
  ADD COLUMN "discountRate" DECIMAL(9,4) NOT NULL DEFAULT 0,
  ADD COLUMN "taxRate" DECIMAL(9,4) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "uq_presupuesto_family_company_id" ON "presupuesto_family"("companyId", "id");
CREATE UNIQUE INDEX "uq_presupuesto_family_surgery" ON "presupuesto_family"("companyId", "surgeryId") WHERE "surgeryId" IS NOT NULL;
CREATE INDEX "ix_presupuesto_family_company" ON "presupuesto_family"("companyId");
CREATE UNIQUE INDEX "uq_presupuesto_family_version" ON "presupuesto"("familyId", "versionNumber");
CREATE UNIQUE INDEX "uq_presupuesto_company_id" ON "presupuesto"("companyId", "id");
CREATE UNIQUE INDEX "uq_presupuesto_family_draft" ON "presupuesto"("familyId") WHERE "slot" = 'DRAFT';
CREATE UNIQUE INDEX "uq_presupuesto_family_current" ON "presupuesto"("familyId") WHERE "slot" = 'CURRENT';
CREATE INDEX "ix_presupuesto_company_family_slot" ON "presupuesto"("companyId", "familyId", "slot");
CREATE INDEX "ix_presupuesto_source" ON "presupuesto"("sourcePresupuestoId");
CREATE UNIQUE INDEX "uq_presupuesto_item_position" ON "presupuesto_item"("presupuestoId", "position");

ALTER TABLE "presupuesto_family" ADD CONSTRAINT "fk_presupuesto_family_company"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto_family" ADD CONSTRAINT "fk_presupuesto_family_surgery_tenant"
  FOREIGN KEY ("companyId", "surgeryId") REFERENCES "Surgery"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_family_tenant"
  FOREIGN KEY ("companyId", "familyId") REFERENCES "presupuesto_family"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_source"
  FOREIGN KEY ("sourcePresupuestoId") REFERENCES "presupuesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_branch"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_client"
  FOREIGN KEY ("clientContactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presupuesto" ADD CONSTRAINT "fk_presupuesto_payer"
  FOREIGN KEY ("payerContactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "presupuesto" ADD CONSTRAINT "ck_presupuesto_revision_positive" CHECK ("revision" > 0);
ALTER TABLE "presupuesto" ADD CONSTRAINT "ck_presupuesto_version_positive" CHECK ("versionNumber" > 0);
ALTER TABLE "presupuesto" ADD CONSTRAINT "ck_presupuesto_slot_state" CHECK (
  ("slot" = 'DRAFT' AND "state" = 'Borrador') OR
  ("slot" = 'CURRENT' AND "state" IN ('Emitido', 'Aprobado', 'Rechazado', 'Vencido', 'Anulado')) OR
  ("slot" = 'HISTORY' AND "state" = 'Reemplazado')
);
ALTER TABLE "presupuesto" ADD CONSTRAINT "ck_presupuesto_general_discount_rate" CHECK ("generalDiscountRate" >= 0 AND "generalDiscountRate" <= 100);
ALTER TABLE "presupuesto_item" ADD CONSTRAINT "ck_presupuesto_item_position" CHECK ("position" >= 0);
ALTER TABLE "presupuesto_item" ADD CONSTRAINT "ck_presupuesto_item_discount_rate" CHECK ("discountRate" >= 0 AND "discountRate" <= 100);
ALTER TABLE "presupuesto_item" ADD CONSTRAINT "ck_presupuesto_item_tax_rate" CHECK ("taxRate" >= 0 AND "taxRate" <= 100);
