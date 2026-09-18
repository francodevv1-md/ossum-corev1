-- Surgery documentation V0 normalized metadata.
-- Additive DDL only: no rows, backfill, seed, provider change, or feature enablement.

-- CreateTable
CREATE TABLE "SurgeryDocumentChecklist" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL DEFAULT 'documentation-v0.1',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgeryDocumentChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgeryDocumentItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "observation" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgeryDocumentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_sdc_company_surgery"
ON "SurgeryDocumentChecklist"("companyId", "surgeryId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sdc_company_id"
ON "SurgeryDocumentChecklist"("companyId", "id");

-- CreateIndex
CREATE INDEX "ix_sdc_company_updated_at"
ON "SurgeryDocumentChecklist"("companyId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sdi_checklist_type"
ON "SurgeryDocumentItem"("checklistId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sdi_company_id"
ON "SurgeryDocumentItem"("companyId", "id");

-- CreateIndex
CREATE INDEX "ix_sdi_company_checklist_order"
ON "SurgeryDocumentItem"("companyId", "checklistId", "sortOrder");

-- AddForeignKey
ALTER TABLE "SurgeryDocumentChecklist"
ADD CONSTRAINT "fk_sdc_company"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentChecklist"
ADD CONSTRAINT "fk_sdc_surgery_tenant"
FOREIGN KEY ("companyId", "surgeryId") REFERENCES "Surgery"("companyId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentChecklist"
ADD CONSTRAINT "fk_sdc_created_by_access"
FOREIGN KEY ("createdById", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentChecklist"
ADD CONSTRAINT "fk_sdc_updated_by_access"
FOREIGN KEY ("updatedById", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentItem"
ADD CONSTRAINT "fk_sdi_company"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentItem"
ADD CONSTRAINT "fk_sdi_checklist_tenant"
FOREIGN KEY ("companyId", "checklistId") REFERENCES "SurgeryDocumentChecklist"("companyId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentItem"
ADD CONSTRAINT "fk_sdi_created_by_access"
FOREIGN KEY ("createdById", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentItem"
ADD CONSTRAINT "fk_sdi_updated_by_access"
FOREIGN KEY ("updatedById", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId")
ON DELETE RESTRICT ON UPDATE CASCADE;
