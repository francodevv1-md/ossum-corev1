ALTER TABLE "Surgery"
  ADD COLUMN "visibleNumber" TEXT,
  ADD COLUMN "payerContactId" TEXT,
  ADD COLUMN "classification" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "priority" TEXT,
  ADD COLUMN "cxStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "prepStatus" TEXT,
  ADD COLUMN "probableDate" TIMESTAMP(3),
  ADD COLUMN "scheduledDate" TIMESTAMP(3),
  ADD COLUMN "performedDate" TIMESTAMP(3),
  ADD COLUMN "cancelledDate" TIMESTAMP(3),
  ADD COLUMN "source" TEXT;

UPDATE "Surgery"
SET "cxStatus" = COALESCE("status", 'pending')
WHERE "cxStatus" = 'pending';

ALTER TABLE "Surgery"
  ALTER COLUMN "surgeryDate" DROP NOT NULL,
  DROP COLUMN "status";

ALTER TABLE "Surgery"
  ADD CONSTRAINT "Surgery_payerContactId_fkey"
  FOREIGN KEY ("payerContactId") REFERENCES "Contact"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SurgeryContactAssignment" (
  "id" TEXT NOT NULL,
  "surgeryId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SurgeryContactAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SurgeryContactAssignment_surgeryId_contactId_role_key"
ON "SurgeryContactAssignment"("surgeryId", "contactId", "role");

CREATE INDEX "SurgeryContactAssignment_surgeryId_idx"
ON "SurgeryContactAssignment"("surgeryId");

CREATE INDEX "SurgeryContactAssignment_contactId_idx"
ON "SurgeryContactAssignment"("contactId");

ALTER TABLE "SurgeryContactAssignment"
  ADD CONSTRAINT "SurgeryContactAssignment_surgeryId_fkey"
  FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SurgeryContactAssignment"
  ADD CONSTRAINT "SurgeryContactAssignment_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
