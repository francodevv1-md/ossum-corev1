-- Add soft-delete/archive fields for Surgery.
-- Physical hard delete remains forbidden for operational traceability.
ALTER TABLE "Surgery"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" TEXT,
  ADD COLUMN "archiveReason" TEXT,
  ADD COLUMN "archivePolicySnapshot" JSONB;

CREATE INDEX "Surgery_companyId_archivedAt_idx" ON "Surgery"("companyId", "archivedAt");
