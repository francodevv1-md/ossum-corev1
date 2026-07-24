-- CreateEnum
CREATE TYPE "DigitalReceiptStatus" AS ENUM ('draft', 'issued', 'signed', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "DigitalReceiptAccessStatus" AS ENUM ('active', 'consumed', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "DigitalReceiptSignerRole" AS ENUM ('patient', 'authorized_payer');

-- CreateEnum
CREATE TYPE "DigitalReceiptEventType" AS ENUM ('created', 'issued', 'access_created', 'access_opened', 'access_consumed', 'signed', 'snapshot_created', 'artifact_created', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "DigitalReceiptArtifactType" AS ENUM ('receipt_html', 'receipt_pdf', 'audit_trail', 'snapshot_payload', 'signature_evidence');

-- CreateEnum
CREATE TYPE "DigitalReceiptDeliveryChannel" AS ENUM ('whatsapp', 'email', 'sms', 'internal');

-- CreateTable
CREATE TABLE "DigitalReceipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "status" "DigitalReceiptStatus" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "issuedBy" JSONB,
    "signedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "latestAccessVersion" INTEGER,
    "activeAccessId" TEXT,
    "currentSignerRole" "DigitalReceiptSignerRole" NOT NULL,
    "signers" JSONB NOT NULL,
    "latestSnapshotId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalReceiptAccess" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "DigitalReceiptAccessStatus" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenLastFour" TEXT,
    "channel" "DigitalReceiptDeliveryChannel",
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "signerRole" "DigitalReceiptSignerRole" NOT NULL,
    "signerId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "firstOpenedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "supersededByAccessId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalReceiptAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalReceiptEvent" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "accessId" TEXT,
    "snapshotId" TEXT,
    "artifactId" TEXT,
    "type" "DigitalReceiptEventType" NOT NULL,
    "happenedAt" TIMESTAMP(3) NOT NULL,
    "actor" JSONB,
    "detail" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalReceiptEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalReceiptSnapshot" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "capturedBy" JSONB,
    "checksum" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalReceiptSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalReceiptArtifact" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "accessId" TEXT,
    "type" "DigitalReceiptArtifactType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" JSONB,
    "fileName" TEXT,
    "mimeType" TEXT,
    "storageKey" TEXT,
    "checksum" TEXT,
    "metadata" JSONB,

    CONSTRAINT "DigitalReceiptArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigitalReceipt_activeAccessId_key" ON "DigitalReceipt"("activeAccessId");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalReceipt_latestSnapshotId_key" ON "DigitalReceipt"("latestSnapshotId");

-- CreateIndex
CREATE INDEX "DigitalReceipt_companyId_surgeryId_idx" ON "DigitalReceipt"("companyId", "surgeryId");

-- CreateIndex
CREATE INDEX "DigitalReceipt_companyId_status_idx" ON "DigitalReceipt"("companyId", "status");

-- CreateIndex
CREATE INDEX "DigitalReceipt_surgeryId_issuedAt_idx" ON "DigitalReceipt"("surgeryId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalReceipt_companyId_receiptNumber_key" ON "DigitalReceipt"("companyId", "receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalReceiptAccess_tokenHash_key" ON "DigitalReceiptAccess"("tokenHash");

-- CreateIndex
CREATE INDEX "DigitalReceiptAccess_receiptId_status_idx" ON "DigitalReceiptAccess"("receiptId", "status");

-- CreateIndex
CREATE INDEX "DigitalReceiptAccess_status_issuedAt_idx" ON "DigitalReceiptAccess"("status", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalReceiptAccess_receiptId_version_key" ON "DigitalReceiptAccess"("receiptId", "version");

-- CreateIndex
CREATE INDEX "DigitalReceiptEvent_receiptId_happenedAt_idx" ON "DigitalReceiptEvent"("receiptId", "happenedAt");

-- CreateIndex
CREATE INDEX "DigitalReceiptEvent_type_happenedAt_idx" ON "DigitalReceiptEvent"("type", "happenedAt");

-- CreateIndex
CREATE INDEX "DigitalReceiptEvent_accessId_idx" ON "DigitalReceiptEvent"("accessId");

-- CreateIndex
CREATE INDEX "DigitalReceiptEvent_snapshotId_idx" ON "DigitalReceiptEvent"("snapshotId");

-- CreateIndex
CREATE INDEX "DigitalReceiptEvent_artifactId_idx" ON "DigitalReceiptEvent"("artifactId");

-- CreateIndex
CREATE INDEX "DigitalReceiptSnapshot_receiptId_capturedAt_idx" ON "DigitalReceiptSnapshot"("receiptId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalReceiptSnapshot_receiptId_version_key" ON "DigitalReceiptSnapshot"("receiptId", "version");

-- CreateIndex
CREATE INDEX "DigitalReceiptArtifact_receiptId_createdAt_idx" ON "DigitalReceiptArtifact"("receiptId", "createdAt");

-- CreateIndex
CREATE INDEX "DigitalReceiptArtifact_snapshotId_idx" ON "DigitalReceiptArtifact"("snapshotId");

-- CreateIndex
CREATE INDEX "DigitalReceiptArtifact_accessId_idx" ON "DigitalReceiptArtifact"("accessId");

-- CreateIndex
CREATE INDEX "DigitalReceiptArtifact_type_idx" ON "DigitalReceiptArtifact"("type");

-- AddForeignKey
ALTER TABLE "DigitalReceipt" ADD CONSTRAINT "DigitalReceipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceipt" ADD CONSTRAINT "DigitalReceipt_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceipt" ADD CONSTRAINT "DigitalReceipt_activeAccessId_fkey" FOREIGN KEY ("activeAccessId") REFERENCES "DigitalReceiptAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceipt" ADD CONSTRAINT "DigitalReceipt_latestSnapshotId_fkey" FOREIGN KEY ("latestSnapshotId") REFERENCES "DigitalReceiptSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceiptAccess" ADD CONSTRAINT "DigitalReceiptAccess_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "DigitalReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceiptAccess" ADD CONSTRAINT "DigitalReceiptAccess_supersededByAccessId_fkey" FOREIGN KEY ("supersededByAccessId") REFERENCES "DigitalReceiptAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceiptEvent" ADD CONSTRAINT "DigitalReceiptEvent_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "DigitalReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceiptEvent" ADD CONSTRAINT "DigitalReceiptEvent_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "DigitalReceiptAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceiptEvent" ADD CONSTRAINT "DigitalReceiptEvent_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DigitalReceiptSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceiptEvent" ADD CONSTRAINT "DigitalReceiptEvent_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "DigitalReceiptArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceiptSnapshot" ADD CONSTRAINT "DigitalReceiptSnapshot_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "DigitalReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceiptArtifact" ADD CONSTRAINT "DigitalReceiptArtifact_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "DigitalReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceiptArtifact" ADD CONSTRAINT "DigitalReceiptArtifact_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "DigitalReceiptSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalReceiptArtifact" ADD CONSTRAINT "DigitalReceiptArtifact_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "DigitalReceiptAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;
