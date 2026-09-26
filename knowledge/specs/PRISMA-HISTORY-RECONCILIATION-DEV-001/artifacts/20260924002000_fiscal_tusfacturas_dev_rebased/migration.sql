-- FISCAL-02 rebased onto the verified DEV reconciliation baseline.
-- Additive DEV_ONLY fiscal evidence. No provider configuration or real fiscal data.
CREATE TYPE "FiscalDocumentState" AS ENUM ('READY', 'SUBMITTED', 'PENDING', 'AUTHORIZED', 'REJECTED', 'UNKNOWN');

CREATE TABLE "fiscal_document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'DEV_ONLY',
    "state" "FiscalDocumentState" NOT NULL DEFAULT 'READY',
    "externalReference" TEXT NOT NULL,
    "snapshotHash" CHAR(64) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "authorizedAt" TIMESTAMP(3),
    "createdById" TEXT,
    CONSTRAINT "fiscal_document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fiscal_issuance_attempt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalDocumentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "state" "FiscalDocumentState" NOT NULL DEFAULT 'READY',
    "externalReference" TEXT NOT NULL,
    "correlationId" TEXT,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fiscal_issuance_attempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_fiscal_document_invoice" ON "fiscal_document"("invoiceId");
CREATE UNIQUE INDEX "fiscal_document_externalReference_key" ON "fiscal_document"("externalReference");
CREATE INDEX "ix_fiscal_document_company_state" ON "fiscal_document"("companyId", "state");
CREATE INDEX "ix_fiscal_document_invoice" ON "fiscal_document"("invoiceId");
CREATE UNIQUE INDEX "uq_fiscal_attempt_document_number" ON "fiscal_issuance_attempt"("fiscalDocumentId", "attemptNumber");
CREATE INDEX "ix_fiscal_attempt_company_state" ON "fiscal_issuance_attempt"("companyId", "state");
CREATE INDEX "ix_fiscal_attempt_external_reference" ON "fiscal_issuance_attempt"("externalReference");

ALTER TABLE "fiscal_document" ADD CONSTRAINT "fiscal_document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_document" ADD CONSTRAINT "fiscal_document_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_issuance_attempt" ADD CONSTRAINT "fiscal_issuance_attempt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_issuance_attempt" ADD CONSTRAINT "fiscal_issuance_attempt_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES "fiscal_document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
