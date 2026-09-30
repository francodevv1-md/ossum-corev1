-- CreateTable
CREATE TABLE "SeguimientoEntry" (
    "id" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "authorId" TEXT NOT NULL,
    "evidenceRef" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeguimientoEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeguimientoEntry_surgeryId_createdAt_idx" ON "SeguimientoEntry"("surgeryId", "createdAt");

-- CreateIndex
CREATE INDEX "SeguimientoEntry_companyId_idx" ON "SeguimientoEntry"("companyId");

-- CreateIndex
CREATE INDEX "SeguimientoEntry_entryType_idx" ON "SeguimientoEntry"("entryType");

-- AddForeignKey
ALTER TABLE "SeguimientoEntry" ADD CONSTRAINT "SeguimientoEntry_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoEntry" ADD CONSTRAINT "SeguimientoEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoEntry" ADD CONSTRAINT "SeguimientoEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
