-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CompanyOperationalDesignation" AS ENUM ('PIVOT');

-- CreateEnum
CREATE TYPE "AvailabilityRequestStatus" AS ENUM ('OPEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AvailabilityCreatorResolution" AS ENUM ('IDENTIFIED_ELIGIBLE', 'NOT_IDENTIFIED', 'IDENTIFIED_INACTIVE', 'IDENTIFIED_NO_COMPANY_ACCESS');

-- CreateEnum
CREATE TYPE "AvailabilityRecipientReason" AS ENUM ('CREATOR', 'PIVOT');

-- CreateEnum
CREATE TYPE "AvailabilityCommandType" AS ENUM ('REQUEST', 'COMPLETE', 'CORRECT', 'REASSIGN_PIVOT');

-- CreateEnum
CREATE TYPE "InternalNotificationType" AS ENUM ('seguimiento_mention', 'availability_request_actionable', 'availability_request_completed', 'availability_pivot_reassigned');

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

-- CreateEnum
CREATE TYPE "cajas_stock_scope_kind" AS ENUM ('fungible_position', 'lot', 'identified_unit');

-- CreateEnum
CREATE TYPE "cajas_stock_record_kind" AS ENUM ('reservation', 'effect');

-- CreateEnum
CREATE TYPE "cajas_line_role" AS ENUM ('expected', 'unexpected', 'substitution');

-- CreateEnum
CREATE TYPE "cajas_control_kind" AS ENUM ('control', 'recontrol');

-- CreateEnum
CREATE TYPE "cajas_control_result" AS ENUM ('clean', 'with_differences');

-- CreateEnum
CREATE TYPE "cajas_change_kind" AS ENUM ('add', 'remove', 'replace', 'quantity', 'traceability');

-- CreateEnum
CREATE TYPE "cajas_evidence_record_kind" AS ENUM ('original', 'correction', 'reversal', 'annulment');

-- CreateEnum
CREATE TYPE "cajas_disposition_kind" AS ENUM ('returned', 'consumed', 'missing', 'damaged', 'under_review');

-- CreateEnum
CREATE TYPE "cajas_return_line_kind" AS ENUM ('unchanged', 'consumed', 'missing', 'damaged', 'added', 'replacement', 'under_review');

-- CreateEnum
CREATE TYPE "cajas_current_condition" AS ENUM ('available', 'with_differences');

-- CreateEnum
CREATE TYPE "cajas_checkpoint" AS ENUM ('formula_version', 'assignment', 'preparation_change', 'control', 'recontrol', 'dispatch', 'return_confirmation', 'consumption_confirmation', 'difference_resolution', 'projection_repair');

-- CreateEnum
CREATE TYPE "cajas_attempt_outcome" AS ENUM ('accepted', 'denied', 'validation_failed', 'conflict', 'failed', 'unknown');

-- CreateEnum
CREATE TYPE "cajas_projection_kind" AS ENUM ('preparation', 'dispatch_accounting', 'condition');

-- CreateEnum
CREATE TYPE "cajas_reconciliation_result" AS ENUM ('match', 'mismatch');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "taxId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'rastreo_satelital',
    "trackingDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleLatestPosition" (
    "vehicleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleLatestPosition_pkey" PRIMARY KEY ("vehicleId")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseAuthId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModuleViewPreference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "preferences" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModuleViewPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompanyAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCompanyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "legalName" TEXT,
    "tradeName" TEXT,
    "notes" TEXT,
    "isCompany" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "phone" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "contactType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactCompanyLink" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "role" TEXT,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPayer" BOOLEAN,
    "vatCondition" TEXT,
    "paymentTerms" TEXT,
    "defaultPriceList" TEXT,
    "usualDiscount" DECIMAL(9,4),
    "doctorLicense" TEXT,
    "specialty" TEXT,
    "deliveryNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactCompanyLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGroup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGroupMembership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactAddress" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "street" TEXT,
    "number" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'AR',
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "addressType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surgery" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "visibleNumber" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "institutionId" TEXT,
    "payerContactId" TEXT,
    "classification" TEXT,
    "description" TEXT,
    "priority" TEXT,
    "cxStatus" TEXT NOT NULL DEFAULT 'pending',
    "prepStatus" TEXT,
    "probableDate" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "surgeryDate" TIMESTAMP(3),
    "performedDate" TIMESTAMP(3),
    "cancelledDate" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archiveReason" TEXT,
    "archivePolicySnapshot" JSONB,
    "createdById" TEXT,
    "materialAvailabilityDate" DATE,
    "materialShippingDate" DATE,
    "materialTransport" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Surgery_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
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
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
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

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "visibleNumber" INTEGER,
    "companyId" TEXT NOT NULL,
    "surgeryId" TEXT,
    "presupuestoId" TEXT,
    "consumoId" TEXT,
    "base" TEXT NOT NULL DEFAULT 'manual',
    "state" TEXT NOT NULL DEFAULT 'Borrador',
    "type" TEXT NOT NULL DEFAULT 'FV',
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paidTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_item" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "sourceType" TEXT,
    "sourceItemId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "visibleNumber" INTEGER,
    "companyId" TEXT NOT NULL,
    "surgeryId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Registrado',
    "method" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "amount" DECIMAL(18,4) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_imputation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_imputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_item" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presupuesto_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyOperationalAssignee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designation" "CompanyOperationalDesignation" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyOperationalAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityCapabilityGrant" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capability" VARCHAR(64) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "status" "AvailabilityRequestStatus" NOT NULL DEFAULT 'OPEN',
    "creatorResolution" "AvailabilityCreatorResolution" NOT NULL,
    "creatorUserIdSnapshot" TEXT,
    "creatorAuditEventId" TEXT,
    "pivotUserIdAtCreation" TEXT NOT NULL,
    "pivotMappingVersion" INTEGER NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "submittedDate" DATE,
    "completionCommandId" TEXT,
    "correlationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRequestRecipientAssignment" (
    "id" TEXT NOT NULL,
    "availabilityRequestId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" "AvailabilityRecipientReason" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByUserId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revokeReason" TEXT,
    "correlationId" TEXT NOT NULL,

    CONSTRAINT "AvailabilityRequestRecipientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityCommand" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "type" "AvailabilityCommandType" NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "requestId" TEXT,
    "surgeryId" TEXT,
    "completedAt" TIMESTAMP(3),
    "resultCode" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalNotification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "availabilityRequestId" TEXT,
    "type" "InternalNotificationType" NOT NULL,
    "eventKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalNotification_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
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

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "module" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

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
    "company_id" TEXT NOT NULL,
    "remitoId" TEXT NOT NULL,
    "itemId" TEXT,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "boxId" TEXT,
    "presupuestoItemId" TEXT,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "returnedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemitoItem_pkey" PRIMARY KEY ("id")
);

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
    "company_id" TEXT NOT NULL,
    "consumoId" TEXT NOT NULL,
    "remitoItemId" TEXT,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(18,4) NOT NULL,
    "consumedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit" TEXT,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
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
    "company_id" TEXT NOT NULL,
    "devolucionId" TEXT NOT NULL,
    "remitoItemId" TEXT,
    "consumoItemId" TEXT,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "returnedQuantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devolucion_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_article_reference" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "source_article_id" TEXT NOT NULL,
    "sku_snapshot" TEXT,
    "description_snapshot" TEXT,
    "unit" TEXT NOT NULL,
    "verified_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_article_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_stock_scope_reference" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "article_reference_id" TEXT NOT NULL,
    "source_stock_scope_id" TEXT NOT NULL,
    "kind" "cajas_stock_scope_kind" NOT NULL,
    "identified_code_snapshot" TEXT,
    "serial_number_snapshot" TEXT,
    "lot_number_snapshot" TEXT,
    "expiration_date_snapshot" DATE,
    "verified_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_stock_scope_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_stock_record_reference" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "kind" "cajas_stock_record_kind" NOT NULL,
    "source_stock_record_id" TEXT NOT NULL,
    "source_checkpoint" TEXT NOT NULL,
    "verified_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_stock_record_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_box_formula" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "box_article_reference_id" TEXT NOT NULL,
    "next_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_box_formula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_formula_current" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "formula_id" TEXT NOT NULL,
    "current_formula_version_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_formula_current_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_formula_version" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "formula_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "previous_version_id" TEXT,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_by_id" TEXT NOT NULL,
    "cause" TEXT,
    "command_acceptance_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_formula_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_formula_line" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "formula_version_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "article_reference_id" TEXT NOT NULL,
    "expected_quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "sku_snapshot" TEXT,
    "description_snapshot" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_formula_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_assignment" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "surgery_id" TEXT NOT NULL,
    "box_stock_scope_reference_id" TEXT NOT NULL,
    "active_slot" INTEGER DEFAULT 1,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "ended_at" TIMESTAMPTZ(6),
    "ended_by_id" TEXT,
    "end_cause" TEXT,
    "assignment_command_acceptance_id" TEXT NOT NULL,
    "end_command_acceptance_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_preparation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "formula_version_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "latest_control_id" TEXT,
    "requires_recontrol" BOOLEAN NOT NULL DEFAULT false,
    "last_accepted_change_id" TEXT,
    "evidence_watermark" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_preparation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_preparation_line" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "preparation_id" TEXT NOT NULL,
    "line_key" TEXT NOT NULL,
    "expected_formula_line_id" TEXT,
    "role" "cajas_line_role" NOT NULL,
    "article_reference_id" TEXT NOT NULL,
    "stock_scope_reference_id" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "lot_number_snapshot" TEXT,
    "serial_number_snapshot" TEXT,
    "expiration_date_snapshot" DATE,
    "traceability_snapshot" JSONB,
    "difference_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "dispatched_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_preparation_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_reservation_correlation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "preparation_line_id" TEXT,
    "stock_scope_reference_id" TEXT NOT NULL,
    "stock_reservation_reference_id" TEXT NOT NULL,
    "source_checkpoint" TEXT NOT NULL,
    "semantic_key" TEXT NOT NULL,
    "quantity" DECIMAL(18,4),
    "unit" TEXT,
    "replaces_correlation_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_reservation_correlation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_control" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "formula_version_id" TEXT NOT NULL,
    "kind" "cajas_control_kind" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "source_preparation_version" INTEGER NOT NULL,
    "result" "cajas_control_result" NOT NULL,
    "prior_control_id" TEXT,
    "acknowledgement_summary" TEXT,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_by_id" TEXT NOT NULL,
    "cause" TEXT,
    "command_acceptance_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_control_line" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "source_preparation_line_id" TEXT NOT NULL,
    "expected_formula_line_id" TEXT,
    "role" "cajas_line_role" NOT NULL,
    "article_reference_id" TEXT NOT NULL,
    "stock_scope_reference_id" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "sku_snapshot" TEXT,
    "description_snapshot" TEXT,
    "lot_number_snapshot" TEXT,
    "serial_number_snapshot" TEXT,
    "expiration_date_snapshot" DATE,
    "traceability_snapshot" JSONB,
    "difference_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_control_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_composition_change" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "prior_preparation_version" INTEGER NOT NULL,
    "resulting_preparation_version" INTEGER NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_by_id" TEXT NOT NULL,
    "cause" TEXT,
    "command_acceptance_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_composition_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_composition_change_line" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "change_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "kind" "cajas_change_kind" NOT NULL,
    "prior_preparation_line_id" TEXT,
    "resulting_preparation_line_id" TEXT,
    "prior_article_reference_id" TEXT,
    "resulting_article_reference_id" TEXT,
    "prior_stock_scope_reference_id" TEXT,
    "resulting_stock_scope_reference_id" TEXT,
    "prior_quantity" DECIMAL(18,4),
    "resulting_quantity" DECIMAL(18,4),
    "unit" TEXT NOT NULL,
    "prior_traceability_snapshot" JSONB,
    "resulting_traceability_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_composition_change_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_difference" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "control_line_id" TEXT,
    "dispatch_line_id" TEXT,
    "return_line_id" TEXT,
    "kind" TEXT NOT NULL,
    "observed_facts" TEXT NOT NULL,
    "opened_at" TIMESTAMPTZ(6) NOT NULL,
    "opened_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_difference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_difference_resolution" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "difference_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "closes_difference" BOOLEAN NOT NULL,
    "explanation" TEXT NOT NULL,
    "supporting_reference" TEXT,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_by_id" TEXT NOT NULL,
    "cause" TEXT,
    "command_acceptance_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_difference_resolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_dispatch" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "remito_id" TEXT NOT NULL,
    "source_control_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "record_kind" "cajas_evidence_record_kind" NOT NULL DEFAULT 'original',
    "corrects_dispatch_id" TEXT,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_by_id" TEXT NOT NULL,
    "cause" TEXT,
    "command_acceptance_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_dispatch_line" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "remito_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "record_kind" "cajas_evidence_record_kind" NOT NULL DEFAULT 'original',
    "accounting_sign" INTEGER NOT NULL DEFAULT 1,
    "neutralizes_dispatch_line_id" TEXT,
    "remito_item_id" TEXT NOT NULL,
    "source_control_line_id" TEXT NOT NULL,
    "source_preparation_line_id" TEXT NOT NULL,
    "article_reference_id" TEXT NOT NULL,
    "stock_scope_reference_id" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "sku_snapshot" TEXT,
    "description_snapshot" TEXT NOT NULL,
    "lot_number_snapshot" TEXT,
    "serial_number_snapshot" TEXT,
    "expiration_date_snapshot" DATE,
    "traceability_snapshot" JSONB,
    "stock_effect_reference_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_dispatch_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_dispatch_accounting" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "evidence_watermark" TEXT NOT NULL,
    "reconciled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_dispatch_accounting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_dispatch_line_accounting" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "accounting_id" TEXT NOT NULL,
    "dispatch_line_id" TEXT NOT NULL,
    "dispatched_quantity" DECIMAL(18,4) NOT NULL,
    "disposed_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "pending_quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_dispatch_line_accounting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_disposition" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "dispatch_line_id" TEXT NOT NULL,
    "slice_key" TEXT NOT NULL,
    "record_kind" "cajas_evidence_record_kind" NOT NULL DEFAULT 'original',
    "accounting_sign" INTEGER NOT NULL DEFAULT 1,
    "kind" "cajas_disposition_kind" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "stock_scope_reference_id" TEXT,
    "return_confirmation_id" TEXT,
    "consumption_confirmation_id" TEXT,
    "return_line_id" TEXT,
    "consumption_line_id" TEXT,
    "neutralizes_disposition_id" TEXT,
    "stock_effect_reference_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "command_acceptance_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_disposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_return_confirmation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "remito_id" TEXT NOT NULL,
    "devolucion_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "record_kind" "cajas_evidence_record_kind" NOT NULL DEFAULT 'original',
    "original_slot" INTEGER DEFAULT 1,
    "corrects_confirmation_id" TEXT,
    "observed_accounting_version" INTEGER NOT NULL,
    "result" "cajas_control_result" NOT NULL,
    "note" TEXT,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_by_id" TEXT NOT NULL,
    "cause" TEXT,
    "command_acceptance_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_return_confirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_return_line" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "return_confirmation_id" TEXT NOT NULL,
    "devolucion_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "devolucion_item_id" TEXT NOT NULL,
    "dispatch_line_id" TEXT,
    "kind" "cajas_return_line_kind" NOT NULL,
    "article_reference_id" TEXT NOT NULL,
    "stock_scope_reference_id" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "sku_snapshot" TEXT,
    "description_snapshot" TEXT,
    "lot_number_snapshot" TEXT,
    "serial_number_snapshot" TEXT,
    "expiration_date_snapshot" DATE,
    "traceability_snapshot" JSONB,
    "human_validated" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_return_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_replacement_pair" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "return_confirmation_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "return_line_id" TEXT NOT NULL,
    "original_dispatch_line_id" TEXT NOT NULL,
    "received_article_reference_id" TEXT NOT NULL,
    "received_stock_scope_reference_id" TEXT,
    "explanation" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_replacement_pair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_consumption_confirmation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "remito_id" TEXT NOT NULL,
    "consumo_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "record_kind" "cajas_evidence_record_kind" NOT NULL DEFAULT 'original',
    "original_slot" INTEGER DEFAULT 1,
    "corrects_confirmation_id" TEXT,
    "observed_accounting_version" INTEGER NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_by_id" TEXT NOT NULL,
    "cause" TEXT,
    "command_acceptance_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_consumption_confirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_consumption_line" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "consumption_confirmation_id" TEXT NOT NULL,
    "consumo_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "consumo_item_id" TEXT NOT NULL,
    "dispatch_line_id" TEXT NOT NULL,
    "article_reference_id" TEXT NOT NULL,
    "stock_scope_reference_id" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "lot_number_snapshot" TEXT,
    "serial_number_snapshot" TEXT,
    "expiration_date_snapshot" DATE,
    "traceability_snapshot" JSONB,
    "recognized_return_disposition_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_consumption_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_condition_projection" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "box_stock_scope_reference_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "condition" "cajas_current_condition",
    "open_difference_count" INTEGER NOT NULL DEFAULT 0,
    "pending_dispatch_scope_count" INTEGER NOT NULL DEFAULT 0,
    "requires_recontrol" BOOLEAN NOT NULL DEFAULT false,
    "operation_ended_at" TIMESTAMPTZ(6),
    "dispatch_eligible" BOOLEAN NOT NULL DEFAULT false,
    "reuse_eligible" BOOLEAN NOT NULL DEFAULT false,
    "eligibility_reasons" JSONB NOT NULL,
    "evidence_watermark" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_condition_projection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_command_acceptance" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "source_operation_id" TEXT NOT NULL,
    "checkpoint" "cajas_checkpoint" NOT NULL,
    "semantic_key" TEXT NOT NULL,
    "intent_hash" TEXT NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_by_id" TEXT NOT NULL,
    "result_entity_type" TEXT NOT NULL,
    "result_entity_id" TEXT NOT NULL,
    "audit_event_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_command_acceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_command_effect" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "command_acceptance_id" TEXT NOT NULL,
    "effect_key" TEXT NOT NULL,
    "effect_type" TEXT NOT NULL,
    "result_entity_type" TEXT NOT NULL,
    "result_entity_id" TEXT NOT NULL,
    "stock_record_reference_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_command_effect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_command_attempt" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "command_acceptance_id" TEXT,
    "transport_correlation_id" TEXT NOT NULL,
    "intent_hash" TEXT NOT NULL,
    "outcome" "cajas_attempt_outcome" NOT NULL,
    "attempted_at" TIMESTAMPTZ(6) NOT NULL,
    "actor_id" TEXT NOT NULL,
    "audit_event_id" TEXT,
    "detail" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_command_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_projection_reconciliation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "projection_kind" "cajas_projection_kind" NOT NULL,
    "scope_id" TEXT NOT NULL,
    "observed_version" INTEGER NOT NULL,
    "evidence_watermark" TEXT NOT NULL,
    "result" "cajas_reconciliation_result" NOT NULL,
    "compared_at" TIMESTAMPTZ(6) NOT NULL,
    "compared_by_id" TEXT,
    "detail" TEXT,
    "repair_command_acceptance_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_projection_reconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "uq_vehicle_tracking_device" ON "Vehicle"("trackingDeviceId");

-- CreateIndex
CREATE INDEX "ix_vehicle_company_provider" ON "Vehicle"("companyId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "uq_vehicle_company_id" ON "Vehicle"("companyId", "id");

-- CreateIndex
CREATE INDEX "ix_vehicle_latest_position_company_recorded" ON "VehicleLatestPosition"("companyId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_vehicle_latest_position_company_vehicle" ON "VehicleLatestPosition"("companyId", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseAuthId_key" ON "User"("supabaseAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserModuleViewPreference_companyId_moduleKey_idx" ON "UserModuleViewPreference"("companyId", "moduleKey");

-- CreateIndex
CREATE INDEX "UserModuleViewPreference_userId_moduleKey_idx" ON "UserModuleViewPreference"("userId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserModuleViewPreference_companyId_userId_moduleKey_key" ON "UserModuleViewPreference"("companyId", "userId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompanyAccess_userId_companyId_key" ON "UserCompanyAccess"("userId", "companyId");

-- CreateIndex
CREATE INDEX "ix_contact_company_active_created" ON "ContactCompanyLink"("companyId", "isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactCompanyLink_contactId_companyId_key" ON "ContactCompanyLink"("contactId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_contact_company_code" ON "ContactCompanyLink"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_contact_group_company_slug" ON "ContactGroup"("companyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGroupMembership_groupId_contactId_key" ON "ContactGroupMembership"("groupId", "contactId");

-- CreateIndex
CREATE INDEX "ix_contact_address_main" ON "ContactAddress"("contactId", "isMain");

-- CreateIndex
CREATE UNIQUE INDEX "uq_contact_address_one_main" ON "ContactAddress"("contactId") WHERE ("isMain" = true);

-- CreateIndex
CREATE INDEX "Surgery_companyId_archivedAt_idx" ON "Surgery"("companyId", "archivedAt");

-- CreateIndex
CREATE INDEX "ix_surgery_company_material_availability" ON "Surgery"("companyId", "materialAvailabilityDate");

-- CreateIndex
CREATE INDEX "ix_surgery_company_created_by" ON "Surgery"("companyId", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "uq_surgery_company_id" ON "Surgery"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Surgery_companyId_visibleNumber_key" ON "Surgery"("companyId", "visibleNumber");

-- CreateIndex
CREATE INDEX "ix_sdc_company_updated_at" ON "SurgeryDocumentChecklist"("companyId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sdc_company_surgery" ON "SurgeryDocumentChecklist"("companyId", "surgeryId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sdc_company_id" ON "SurgeryDocumentChecklist"("companyId", "id");

-- CreateIndex
CREATE INDEX "ix_sdi_company_checklist_order" ON "SurgeryDocumentItem"("companyId", "checklistId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sdi_checklist_type" ON "SurgeryDocumentItem"("checklistId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sdi_company_id" ON "SurgeryDocumentItem"("companyId", "id");

-- CreateIndex
CREATE INDEX "presupuesto_companyId_surgeryId_state_idx" ON "presupuesto"("companyId", "surgeryId", "state");

-- CreateIndex
CREATE INDEX "presupuesto_companyId_state_idx" ON "presupuesto"("companyId", "state");

-- CreateIndex
CREATE INDEX "presupuesto_parentPresupuestoId_idx" ON "presupuesto"("parentPresupuestoId");

-- CreateIndex
CREATE UNIQUE INDEX "presupuesto_companyId_visibleNumber_key" ON "presupuesto"("companyId", "visibleNumber");

-- CreateIndex
CREATE INDEX "invoice_companyId_surgeryId_state_idx" ON "invoice"("companyId", "surgeryId", "state");

-- CreateIndex
CREATE INDEX "invoice_companyId_state_idx" ON "invoice"("companyId", "state");

-- CreateIndex
CREATE INDEX "invoice_presupuestoId_idx" ON "invoice"("presupuestoId");

-- CreateIndex
CREATE INDEX "invoice_consumoId_idx" ON "invoice"("consumoId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_companyId_visibleNumber_key" ON "invoice"("companyId", "visibleNumber");

-- CreateIndex
CREATE INDEX "invoice_item_invoiceId_idx" ON "invoice_item"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_item_sku_idx" ON "invoice_item"("sku");

-- CreateIndex
CREATE INDEX "invoice_item_sourceType_sourceItemId_idx" ON "invoice_item"("sourceType", "sourceItemId");

-- CreateIndex
CREATE INDEX "payment_companyId_surgeryId_state_idx" ON "payment"("companyId", "surgeryId", "state");

-- CreateIndex
CREATE INDEX "payment_companyId_receivedAt_idx" ON "payment"("companyId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_companyId_visibleNumber_key" ON "payment"("companyId", "visibleNumber");

-- CreateIndex
CREATE INDEX "payment_imputation_invoiceId_idx" ON "payment_imputation"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_imputation_paymentId_invoiceId_key" ON "payment_imputation"("paymentId", "invoiceId");

-- CreateIndex
CREATE INDEX "presupuesto_item_presupuestoId_idx" ON "presupuesto_item"("presupuestoId");

-- CreateIndex
CREATE INDEX "presupuesto_item_sku_idx" ON "presupuesto_item"("sku");

-- CreateIndex
CREATE INDEX "ix_company_operational_assignee_user_company" ON "CompanyOperationalAssignee"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_company_operational_assignee_designation" ON "CompanyOperationalAssignee"("companyId", "designation");

-- CreateIndex
CREATE INDEX "ix_availability_capability_grant_lookup" ON "AvailabilityCapabilityGrant"("companyId", "capability", "isActive");

-- CreateIndex
CREATE INDEX "ix_availability_capability_grant_user_company" ON "AvailabilityCapabilityGrant"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_capability_grant_scope" ON "AvailabilityCapabilityGrant"("companyId", "userId", "capability");

-- CreateIndex
CREATE INDEX "ix_availability_request_company_surgery_status" ON "AvailabilityRequest"("companyId", "surgeryId", "status");

-- CreateIndex
CREATE INDEX "ix_availability_request_company_requester_requested" ON "AvailabilityRequest"("companyId", "requesterUserId", "requestedAt");

-- CreateIndex
CREATE INDEX "ix_availability_request_company_status_requested" ON "AvailabilityRequest"("companyId", "status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_request_company_id" ON "AvailabilityRequest"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_request_company_surgery_id" ON "AvailabilityRequest"("companyId", "surgeryId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_request_completion_command" ON "AvailabilityRequest"("companyId", "completionCommandId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_request_correlation" ON "AvailabilityRequest"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "availability_request_one_open_per_surgery" ON "AvailabilityRequest"("companyId", "surgeryId") WHERE ("status" = 'OPEN');

-- CreateIndex
CREATE INDEX "ix_availability_assignment_company_user_revoked" ON "AvailabilityRequestRecipientAssignment"("companyId", "userId", "revokedAt");

-- CreateIndex
CREATE INDEX "ix_availability_assignment_request_reason_revoked" ON "AvailabilityRequestRecipientAssignment"("availabilityRequestId", "reason", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_assignment_company_id" ON "AvailabilityRequestRecipientAssignment"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "availability_request_one_active_reason" ON "AvailabilityRequestRecipientAssignment"("availabilityRequestId", "reason") WHERE ("revokedAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "availability_request_assignment_episode" ON "AvailabilityRequestRecipientAssignment"("availabilityRequestId", "reason", "userId", "assignedAt");

-- CreateIndex
CREATE INDEX "ix_availability_command_company_request" ON "AvailabilityCommand"("companyId", "requestId");

-- CreateIndex
CREATE INDEX "ix_availability_command_company_surgery" ON "AvailabilityCommand"("companyId", "surgeryId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_command_company_id" ON "AvailabilityCommand"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_command_idempotency" ON "AvailabilityCommand"("companyId", "actorUserId", "type", "idempotencyKey");

-- CreateIndex
CREATE INDEX "InternalNotification_companyId_recipientUserId_readAt_creat_idx" ON "InternalNotification"("companyId", "recipientUserId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "InternalNotification_recipientUserId_createdAt_idx" ON "InternalNotification"("recipientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalNotification_surgeryId_createdAt_idx" ON "InternalNotification"("surgeryId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalNotification_sourceEntityId_idx" ON "InternalNotification"("sourceEntityId");

-- CreateIndex
CREATE INDEX "ix_internal_notification_company_availability_request" ON "InternalNotification"("companyId", "availabilityRequestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InternalNotification_companyId_eventKey_key" ON "InternalNotification"("companyId", "eventKey");

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

-- CreateIndex
CREATE INDEX "SurgeryContactAssignment_surgeryId_idx" ON "SurgeryContactAssignment"("surgeryId");

-- CreateIndex
CREATE INDEX "SurgeryContactAssignment_contactId_idx" ON "SurgeryContactAssignment"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "SurgeryContactAssignment_surgeryId_contactId_role_key" ON "SurgeryContactAssignment"("surgeryId", "contactId", "role");

-- CreateIndex
CREATE INDEX "SeguimientoEntry_surgeryId_createdAt_idx" ON "SeguimientoEntry"("surgeryId", "createdAt");

-- CreateIndex
CREATE INDEX "SeguimientoEntry_companyId_idx" ON "SeguimientoEntry"("companyId");

-- CreateIndex
CREATE INDEX "SeguimientoEntry_entryType_idx" ON "SeguimientoEntry"("entryType");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_companyId_createdAt_idx" ON "AuditEvent"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_audit_event_company_id" ON "AuditEvent"("companyId", "id");

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
CREATE UNIQUE INDEX "uq_remito_company_id" ON "Remito"("companyId", "id");

-- CreateIndex
CREATE INDEX "RemitoItem_remitoId_idx" ON "RemitoItem"("remitoId");

-- CreateIndex
CREATE INDEX "ix_remito_item_company_owner" ON "RemitoItem"("company_id", "remitoId");

-- CreateIndex
CREATE INDEX "RemitoItem_itemId_idx" ON "RemitoItem"("itemId");

-- CreateIndex
CREATE INDEX "RemitoItem_presupuestoItemId_idx" ON "RemitoItem"("presupuestoItemId");

-- CreateIndex
CREATE INDEX "RemitoItem_lotNumber_idx" ON "RemitoItem"("lotNumber");

-- CreateIndex
CREATE INDEX "RemitoItem_expirationDate_idx" ON "RemitoItem"("expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "uq_remito_item_company_id" ON "RemitoItem"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_remito_item_owner_id" ON "RemitoItem"("company_id", "remitoId", "id");

-- CreateIndex
CREATE INDEX "consumo_companyId_surgeryId_state_idx" ON "consumo"("companyId", "surgeryId", "state");

-- CreateIndex
CREATE INDEX "consumo_companyId_remitoId_idx" ON "consumo"("companyId", "remitoId");

-- CreateIndex
CREATE INDEX "consumo_companyId_state_idx" ON "consumo"("companyId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "consumo_companyId_visibleNumber_key" ON "consumo"("companyId", "visibleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "uq_consumo_company_id" ON "consumo"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_consumo_id_remito" ON "consumo"("companyId", "id", "remitoId");

-- CreateIndex
CREATE INDEX "consumo_item_consumoId_idx" ON "consumo_item"("consumoId");

-- CreateIndex
CREATE INDEX "ix_consumo_item_company_owner" ON "consumo_item"("company_id", "consumoId");

-- CreateIndex
CREATE INDEX "consumo_item_remitoItemId_idx" ON "consumo_item"("remitoItemId");

-- CreateIndex
CREATE INDEX "consumo_item_lotNumber_idx" ON "consumo_item"("lotNumber");

-- CreateIndex
CREATE INDEX "consumo_item_expirationDate_idx" ON "consumo_item"("expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "uq_consumo_item_company_id" ON "consumo_item"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_consumo_item_owner_id" ON "consumo_item"("company_id", "consumoId", "id");

-- CreateIndex
CREATE INDEX "devolucion_companyId_surgeryId_state_idx" ON "devolucion"("companyId", "surgeryId", "state");

-- CreateIndex
CREATE INDEX "devolucion_companyId_remitoId_idx" ON "devolucion"("companyId", "remitoId");

-- CreateIndex
CREATE INDEX "devolucion_companyId_consumoId_idx" ON "devolucion"("companyId", "consumoId");

-- CreateIndex
CREATE UNIQUE INDEX "devolucion_companyId_visibleNumber_key" ON "devolucion"("companyId", "visibleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "uq_devolucion_company_id" ON "devolucion"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_devolucion_id_remito" ON "devolucion"("companyId", "id", "remitoId");

-- CreateIndex
CREATE INDEX "devolucion_item_devolucionId_idx" ON "devolucion_item"("devolucionId");

-- CreateIndex
CREATE INDEX "ix_devolucion_item_company_owner" ON "devolucion_item"("company_id", "devolucionId");

-- CreateIndex
CREATE INDEX "devolucion_item_remitoItemId_idx" ON "devolucion_item"("remitoItemId");

-- CreateIndex
CREATE INDEX "devolucion_item_consumoItemId_idx" ON "devolucion_item"("consumoItemId");

-- CreateIndex
CREATE INDEX "devolucion_item_lotNumber_idx" ON "devolucion_item"("lotNumber");

-- CreateIndex
CREATE INDEX "devolucion_item_expirationDate_idx" ON "devolucion_item"("expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "uq_devolucion_item_company_id" ON "devolucion_item"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_devolucion_item_owner_id" ON "devolucion_item"("company_id", "devolucionId", "id");

-- CreateIndex
CREATE INDEX "ix_car_company_sku" ON "cajas_article_reference"("company_id", "sku_snapshot");

-- CreateIndex
CREATE INDEX "ix_car_verifier_time" ON "cajas_article_reference"("verified_by_id", "verified_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_car_company_id" ON "cajas_article_reference"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_car_company_source" ON "cajas_article_reference"("company_id", "source_article_id");

-- CreateIndex
CREATE INDEX "ix_cssr_company_article_kind" ON "cajas_stock_scope_reference"("company_id", "article_reference_id", "kind");

-- CreateIndex
CREATE INDEX "ix_cssr_company_code" ON "cajas_stock_scope_reference"("company_id", "identified_code_snapshot");

-- CreateIndex
CREATE INDEX "ix_cssr_company_serial" ON "cajas_stock_scope_reference"("company_id", "serial_number_snapshot");

-- CreateIndex
CREATE INDEX "ix_cssr_company_lot_exp" ON "cajas_stock_scope_reference"("company_id", "lot_number_snapshot", "expiration_date_snapshot");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cssr_company_id" ON "cajas_stock_scope_reference"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cssr_company_source" ON "cajas_stock_scope_reference"("company_id", "source_stock_scope_id");

-- CreateIndex
CREATE INDEX "ix_csrr_company_checkpoint_time" ON "cajas_stock_record_reference"("company_id", "source_checkpoint", "created_at");

-- CreateIndex
CREATE INDEX "ix_csrr_verifier_time" ON "cajas_stock_record_reference"("verified_by_id", "verified_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_csrr_company_id" ON "cajas_stock_record_reference"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_csrr_company_kind_source" ON "cajas_stock_record_reference"("company_id", "kind", "source_stock_record_id");

-- CreateIndex
CREATE INDEX "ix_cbf_company_updated" ON "cajas_box_formula"("company_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cbf_company_id" ON "cajas_box_formula"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cbf_company_article" ON "cajas_box_formula"("company_id", "box_article_reference_id");

-- CreateIndex
CREATE INDEX "ix_cfc_company_updated" ON "cajas_formula_current"("company_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfc_company_id" ON "cajas_formula_current"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfc_formula" ON "cajas_formula_current"("company_id", "formula_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfc_current_version" ON "cajas_formula_current"("company_id", "current_formula_version_id");

-- CreateIndex
CREATE INDEX "ix_cfv_company_accepted" ON "cajas_formula_version"("company_id", "accepted_at");

-- CreateIndex
CREATE INDEX "ix_cfv_previous" ON "cajas_formula_version"("previous_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfv_company_id" ON "cajas_formula_version"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfv_formula_number" ON "cajas_formula_version"("formula_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfv_command" ON "cajas_formula_version"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_cfl_version_article" ON "cajas_formula_line"("formula_version_id", "article_reference_id");

-- CreateIndex
CREATE INDEX "ix_cfl_company_article" ON "cajas_formula_line"("company_id", "article_reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfl_company_id" ON "cajas_formula_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfl_version_line" ON "cajas_formula_line"("formula_version_id", "line_number");

-- CreateIndex
CREATE INDEX "ix_ca_company_surgery_active" ON "cajas_assignment"("company_id", "surgery_id", "active_slot");

-- CreateIndex
CREATE INDEX "ix_ca_company_assigned" ON "cajas_assignment"("company_id", "assigned_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_company_id" ON "cajas_assignment"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_active_box" ON "cajas_assignment"("company_id", "box_stock_scope_reference_id", "active_slot");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_start_command" ON "cajas_assignment"("company_id", "assignment_command_acceptance_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_end_command" ON "cajas_assignment"("company_id", "end_command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_cp_company_assignment" ON "cajas_preparation"("company_id", "assignment_id");

-- CreateIndex
CREATE INDEX "ix_cp_company_recontrol_updated" ON "cajas_preparation"("company_id", "requires_recontrol", "updated_at");

-- CreateIndex
CREATE INDEX "ix_cp_formula_version" ON "cajas_preparation"("formula_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cp_company_id" ON "cajas_preparation"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cp_assignment" ON "cajas_preparation"("company_id", "assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cp_latest_control" ON "cajas_preparation"("company_id", "latest_control_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cp_last_change" ON "cajas_preparation"("company_id", "last_accepted_change_id");

-- CreateIndex
CREATE INDEX "ix_cpl_company_active" ON "cajas_preparation_line"("company_id", "preparation_id", "is_active");

-- CreateIndex
CREATE INDEX "ix_cpl_company_scope" ON "cajas_preparation_line"("company_id", "stock_scope_reference_id");

-- CreateIndex
CREATE INDEX "ix_cpl_expected_line" ON "cajas_preparation_line"("expected_formula_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cpl_company_id" ON "cajas_preparation_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cpl_preparation_key" ON "cajas_preparation_line"("preparation_id", "line_key");

-- CreateIndex
CREATE INDEX "ix_crc_checkpoint_scope" ON "cajas_reservation_correlation"("company_id", "source_checkpoint", "stock_scope_reference_id");

-- CreateIndex
CREATE INDEX "ix_crc_assignment_time" ON "cajas_reservation_correlation"("company_id", "assignment_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_crc_prep_line" ON "cajas_reservation_correlation"("preparation_line_id");

-- CreateIndex
CREATE INDEX "ix_crc_stock_record" ON "cajas_reservation_correlation"("stock_reservation_reference_id");

-- CreateIndex
CREATE INDEX "ix_crc_replaces" ON "cajas_reservation_correlation"("replaces_correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crc_company_id" ON "cajas_reservation_correlation"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crc_company_semantic" ON "cajas_reservation_correlation"("company_id", "semantic_key");

-- CreateIndex
CREATE INDEX "ix_cc_assignment_time" ON "cajas_control"("company_id", "assignment_id", "accepted_at");

-- CreateIndex
CREATE INDEX "ix_cc_prior" ON "cajas_control"("prior_control_id");

-- CreateIndex
CREATE INDEX "ix_cc_result_time" ON "cajas_control"("company_id", "result", "accepted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cc_company_id" ON "cajas_control"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cc_assignment_sequence" ON "cajas_control"("assignment_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cc_command" ON "cajas_control"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_ccl_company_article" ON "cajas_control_line"("company_id", "article_reference_id");

-- CreateIndex
CREATE INDEX "ix_ccl_stock_scope" ON "cajas_control_line"("stock_scope_reference_id");

-- CreateIndex
CREATE INDEX "ix_ccl_source_line" ON "cajas_control_line"("source_preparation_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccl_company_id" ON "cajas_control_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccl_control_line" ON "cajas_control_line"("control_id", "line_number");

-- CreateIndex
CREATE INDEX "ix_cchg_assignment_time" ON "cajas_composition_change"("company_id", "assignment_id", "accepted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchg_company_id" ON "cajas_composition_change"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchg_assignment_version" ON "cajas_composition_change"("assignment_id", "resulting_preparation_version");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchg_command" ON "cajas_composition_change"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_cchl_company_change" ON "cajas_composition_change_line"("company_id", "change_id");

-- CreateIndex
CREATE INDEX "ix_cchl_prior_line" ON "cajas_composition_change_line"("prior_preparation_line_id");

-- CreateIndex
CREATE INDEX "ix_cchl_result_line" ON "cajas_composition_change_line"("resulting_preparation_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchl_company_id" ON "cajas_composition_change_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchl_change_line" ON "cajas_composition_change_line"("change_id", "line_number");

-- CreateIndex
CREATE INDEX "ix_cd_assignment_opened" ON "cajas_difference"("company_id", "assignment_id", "opened_at");

-- CreateIndex
CREATE INDEX "ix_cd_control_line" ON "cajas_difference"("control_line_id");

-- CreateIndex
CREATE INDEX "ix_cd_dispatch_line" ON "cajas_difference"("dispatch_line_id");

-- CreateIndex
CREATE INDEX "ix_cd_return_line" ON "cajas_difference"("return_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cd_company_id" ON "cajas_difference"("company_id", "id");

-- CreateIndex
CREATE INDEX "ix_cdr_difference_time" ON "cajas_difference_resolution"("company_id", "difference_id", "accepted_at");

-- CreateIndex
CREATE INDEX "ix_cdr_actor_time" ON "cajas_difference_resolution"("accepted_by_id", "accepted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdr_company_id" ON "cajas_difference_resolution"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdr_difference_sequence" ON "cajas_difference_resolution"("difference_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdr_command" ON "cajas_difference_resolution"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_cdp_remito_kind" ON "cajas_dispatch"("company_id", "remito_id", "record_kind");

-- CreateIndex
CREATE INDEX "ix_cdp_assignment_time" ON "cajas_dispatch"("company_id", "assignment_id", "accepted_at");

-- CreateIndex
CREATE INDEX "ix_cdp_control" ON "cajas_dispatch"("source_control_id");

-- CreateIndex
CREATE INDEX "ix_cdp_corrects" ON "cajas_dispatch"("corrects_dispatch_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdp_company_id" ON "cajas_dispatch"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdp_owner_lineage" ON "cajas_dispatch"("company_id", "id", "remito_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdp_assignment_sequence" ON "cajas_dispatch"("assignment_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdp_command" ON "cajas_dispatch"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_cdl_remito_item" ON "cajas_dispatch_line"("company_id", "remito_id", "remito_item_id");

-- CreateIndex
CREATE INDEX "ix_cdl_company_control" ON "cajas_dispatch_line"("company_id", "source_control_line_id");

-- CreateIndex
CREATE INDEX "ix_cdl_prep_line" ON "cajas_dispatch_line"("source_preparation_line_id");

-- CreateIndex
CREATE INDEX "ix_cdl_stock_scope" ON "cajas_dispatch_line"("stock_scope_reference_id");

-- CreateIndex
CREATE INDEX "ix_cdl_stock_effect" ON "cajas_dispatch_line"("stock_effect_reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdl_company_id" ON "cajas_dispatch_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdl_dispatch_id" ON "cajas_dispatch_line"("company_id", "dispatch_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdl_dispatch_line" ON "cajas_dispatch_line"("dispatch_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdl_source_scope" ON "cajas_dispatch_line"("dispatch_id", "remito_item_id", "source_control_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdl_neutralizes" ON "cajas_dispatch_line"("company_id", "neutralizes_dispatch_line_id");

-- CreateIndex
CREATE INDEX "ix_cda_company_updated" ON "cajas_dispatch_accounting"("company_id", "updated_at");

-- CreateIndex
CREATE INDEX "ix_cda_company_watermark" ON "cajas_dispatch_accounting"("company_id", "evidence_watermark");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cda_company_id" ON "cajas_dispatch_accounting"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cda_dispatch" ON "cajas_dispatch_accounting"("company_id", "dispatch_id");

-- CreateIndex
CREATE INDEX "ix_cdla_pending" ON "cajas_dispatch_line_accounting"("company_id", "accounting_id", "pending_quantity");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdla_company_id" ON "cajas_dispatch_line_accounting"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdla_dispatch_line" ON "cajas_dispatch_line_accounting"("company_id", "dispatch_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdla_accounting_line" ON "cajas_dispatch_line_accounting"("accounting_id", "dispatch_line_id");

-- CreateIndex
CREATE INDEX "ix_cdis_dispatch_time" ON "cajas_disposition"("company_id", "dispatch_line_id", "accepted_at");

-- CreateIndex
CREATE INDEX "ix_cdis_return_confirmation" ON "cajas_disposition"("return_confirmation_id");

-- CreateIndex
CREATE INDEX "ix_cdis_consumption_confirmation" ON "cajas_disposition"("consumption_confirmation_id");

-- CreateIndex
CREATE INDEX "ix_cdis_return_line" ON "cajas_disposition"("return_line_id");

-- CreateIndex
CREATE INDEX "ix_cdis_consumption_line" ON "cajas_disposition"("consumption_line_id");

-- CreateIndex
CREATE INDEX "ix_cdis_stock_effect" ON "cajas_disposition"("stock_effect_reference_id");

-- CreateIndex
CREATE INDEX "ix_cdis_command" ON "cajas_disposition"("command_acceptance_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdis_company_id" ON "cajas_disposition"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdis_dispatch_id" ON "cajas_disposition"("company_id", "dispatch_line_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdis_slice" ON "cajas_disposition"("company_id", "dispatch_line_id", "slice_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdis_neutralizes" ON "cajas_disposition"("company_id", "neutralizes_disposition_id");

-- CreateIndex
CREATE INDEX "ix_crcfn_dispatch_time" ON "cajas_return_confirmation"("company_id", "dispatch_id", "accepted_at");

-- CreateIndex
CREATE INDEX "ix_crcfn_source" ON "cajas_return_confirmation"("devolucion_id");

-- CreateIndex
CREATE INDEX "ix_crcfn_corrects" ON "cajas_return_confirmation"("corrects_confirmation_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crcfn_company_id" ON "cajas_return_confirmation"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crcfn_owner_lineage" ON "cajas_return_confirmation"("company_id", "id", "devolucion_id", "dispatch_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crcfn_dispatch_source_seq" ON "cajas_return_confirmation"("dispatch_id", "devolucion_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crcfn_source_dispatch_original" ON "cajas_return_confirmation"("company_id", "devolucion_id", "dispatch_id", "original_slot");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crcfn_command" ON "cajas_return_confirmation"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_crl_company_dispatch" ON "cajas_return_line"("company_id", "dispatch_id", "dispatch_line_id");

-- CreateIndex
CREATE INDEX "ix_crl_source_item" ON "cajas_return_line"("company_id", "devolucion_id", "devolucion_item_id");

-- CreateIndex
CREATE INDEX "ix_crl_stock_scope" ON "cajas_return_line"("stock_scope_reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crl_company_id" ON "cajas_return_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crl_dispatch_id" ON "cajas_return_line"("company_id", "return_confirmation_id", "dispatch_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crl_confirmation_line" ON "cajas_return_line"("return_confirmation_id", "line_number");

-- CreateIndex
CREATE INDEX "ix_crp_return_lineage" ON "cajas_replacement_pair"("company_id", "return_confirmation_id", "dispatch_id", "return_line_id");

-- CreateIndex
CREATE INDEX "ix_crp_original_line" ON "cajas_replacement_pair"("company_id", "dispatch_id", "original_dispatch_line_id");

-- CreateIndex
CREATE INDEX "ix_crp_received_scope" ON "cajas_replacement_pair"("received_stock_scope_reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crp_company_id" ON "cajas_replacement_pair"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crp_return_line" ON "cajas_replacement_pair"("company_id", "return_confirmation_id", "dispatch_id", "return_line_id");

-- CreateIndex
CREATE INDEX "ix_ccc_dispatch_time" ON "cajas_consumption_confirmation"("company_id", "dispatch_id", "accepted_at");

-- CreateIndex
CREATE INDEX "ix_ccc_source" ON "cajas_consumption_confirmation"("consumo_id");

-- CreateIndex
CREATE INDEX "ix_ccc_corrects" ON "cajas_consumption_confirmation"("corrects_confirmation_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccc_company_id" ON "cajas_consumption_confirmation"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccc_owner_lineage" ON "cajas_consumption_confirmation"("company_id", "id", "consumo_id", "dispatch_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccc_dispatch_source_seq" ON "cajas_consumption_confirmation"("dispatch_id", "consumo_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccc_source_dispatch_original" ON "cajas_consumption_confirmation"("company_id", "consumo_id", "dispatch_id", "original_slot");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccc_command" ON "cajas_consumption_confirmation"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_ccln_company_dispatch" ON "cajas_consumption_line"("company_id", "dispatch_id", "dispatch_line_id");

-- CreateIndex
CREATE INDEX "ix_ccln_source_item" ON "cajas_consumption_line"("company_id", "consumo_id", "consumo_item_id");

-- CreateIndex
CREATE INDEX "ix_ccln_stock_scope" ON "cajas_consumption_line"("stock_scope_reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccln_company_id" ON "cajas_consumption_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccln_confirmation_line" ON "cajas_consumption_line"("consumption_confirmation_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccln_recognized_disposition" ON "cajas_consumption_line"("company_id", "dispatch_line_id", "recognized_return_disposition_id");

-- CreateIndex
CREATE INDEX "ix_ccp_company_condition" ON "cajas_condition_projection"("company_id", "condition");

-- CreateIndex
CREATE INDEX "ix_ccp_company_dispatch" ON "cajas_condition_projection"("company_id", "dispatch_eligible");

-- CreateIndex
CREATE INDEX "ix_ccp_company_reuse" ON "cajas_condition_projection"("company_id", "reuse_eligible");

-- CreateIndex
CREATE INDEX "ix_ccp_company_watermark" ON "cajas_condition_projection"("company_id", "evidence_watermark");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccp_company_id" ON "cajas_condition_projection"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccp_box_scope" ON "cajas_condition_projection"("company_id", "box_stock_scope_reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccp_assignment" ON "cajas_condition_projection"("company_id", "assignment_id");

-- CreateIndex
CREATE INDEX "ix_cca_company_accepted" ON "cajas_command_acceptance"("company_id", "accepted_at");

-- CreateIndex
CREATE INDEX "ix_cca_result" ON "cajas_command_acceptance"("result_entity_type", "result_entity_id");

-- CreateIndex
CREATE INDEX "ix_cca_intent" ON "cajas_command_acceptance"("intent_hash");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cca_company_id" ON "cajas_command_acceptance"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cca_semantic" ON "cajas_command_acceptance"("company_id", "source_operation_id", "checkpoint", "semantic_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cca_audit" ON "cajas_command_acceptance"("company_id", "audit_event_id");

-- CreateIndex
CREATE INDEX "ix_cce_company_type_time" ON "cajas_command_effect"("company_id", "effect_type", "created_at");

-- CreateIndex
CREATE INDEX "ix_cce_stock_record" ON "cajas_command_effect"("stock_record_reference_id");

-- CreateIndex
CREATE INDEX "ix_cce_result" ON "cajas_command_effect"("result_entity_type", "result_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cce_company_id" ON "cajas_command_effect"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cce_command_effect" ON "cajas_command_effect"("command_acceptance_id", "effect_key");

-- CreateIndex
CREATE INDEX "ix_ccat_intent_time" ON "cajas_command_attempt"("company_id", "intent_hash", "attempted_at");

-- CreateIndex
CREATE INDEX "ix_ccat_command_time" ON "cajas_command_attempt"("command_acceptance_id", "attempted_at");

-- CreateIndex
CREATE INDEX "ix_ccat_audit_time" ON "cajas_command_attempt"("company_id", "audit_event_id", "attempted_at");

-- CreateIndex
CREATE INDEX "ix_ccat_expires" ON "cajas_command_attempt"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccat_company_id" ON "cajas_command_attempt"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccat_transport" ON "cajas_command_attempt"("company_id", "transport_correlation_id");

-- CreateIndex
CREATE INDEX "ix_cpr_scope_time" ON "cajas_projection_reconciliation"("company_id", "projection_kind", "scope_id", "compared_at");

-- CreateIndex
CREATE INDEX "ix_cpr_result_time" ON "cajas_projection_reconciliation"("company_id", "result", "compared_at");

-- CreateIndex
CREATE INDEX "ix_cpr_repair_command" ON "cajas_projection_reconciliation"("repair_command_acceptance_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cpr_company_id" ON "cajas_projection_reconciliation"("company_id", "id");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLatestPosition" ADD CONSTRAINT "VehicleLatestPosition_companyId_vehicleId_fkey" FOREIGN KEY ("companyId", "vehicleId") REFERENCES "Vehicle"("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleViewPreference" ADD CONSTRAINT "UserModuleViewPreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleViewPreference" ADD CONSTRAINT "UserModuleViewPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompanyAccess" ADD CONSTRAINT "UserCompanyAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompanyAccess" ADD CONSTRAINT "UserCompanyAccess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCompanyLink" ADD CONSTRAINT "ContactCompanyLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCompanyLink" ADD CONSTRAINT "ContactCompanyLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroupMembership" ADD CONSTRAINT "ContactGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ContactGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroupMembership" ADD CONSTRAINT "ContactGroupMembership_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactAddress" ADD CONSTRAINT "ContactAddress_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_payerContactId_fkey" FOREIGN KEY ("payerContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "fk_surgery_created_by" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentChecklist" ADD CONSTRAINT "fk_sdc_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentChecklist" ADD CONSTRAINT "fk_sdc_surgery_tenant" FOREIGN KEY ("companyId", "surgeryId") REFERENCES "Surgery"("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentChecklist" ADD CONSTRAINT "fk_sdc_created_by_access" FOREIGN KEY ("createdById", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentChecklist" ADD CONSTRAINT "fk_sdc_updated_by_access" FOREIGN KEY ("updatedById", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentItem" ADD CONSTRAINT "fk_sdi_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentItem" ADD CONSTRAINT "fk_sdi_checklist_tenant" FOREIGN KEY ("companyId", "checklistId") REFERENCES "SurgeryDocumentChecklist"("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentItem" ADD CONSTRAINT "fk_sdi_created_by_access" FOREIGN KEY ("createdById", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryDocumentItem" ADD CONSTRAINT "fk_sdi_updated_by_access" FOREIGN KEY ("updatedById", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_parentPresupuestoId_fkey" FOREIGN KEY ("parentPresupuestoId") REFERENCES "presupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto" ADD CONSTRAINT "presupuesto_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_consumoId_fkey" FOREIGN KEY ("consumoId") REFERENCES "consumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_imputation" ADD CONSTRAINT "payment_imputation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_imputation" ADD CONSTRAINT "payment_imputation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_item" ADD CONSTRAINT "presupuesto_item_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOperationalAssignee" ADD CONSTRAINT "fk_company_operational_assignee_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOperationalAssignee" ADD CONSTRAINT "fk_company_operational_assignee_user_access" FOREIGN KEY ("userId", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOperationalAssignee" ADD CONSTRAINT "fk_company_operational_assignee_created_by" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOperationalAssignee" ADD CONSTRAINT "fk_company_operational_assignee_updated_by" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCapabilityGrant" ADD CONSTRAINT "fk_availability_capability_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCapabilityGrant" ADD CONSTRAINT "fk_availability_capability_user_access" FOREIGN KEY ("userId", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCapabilityGrant" ADD CONSTRAINT "fk_availability_capability_granted_by" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCapabilityGrant" ADD CONSTRAINT "fk_availability_capability_revoked_by" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "fk_availability_request_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "fk_availability_request_surgery" FOREIGN KEY ("companyId", "surgeryId") REFERENCES "Surgery"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "fk_availability_request_requester" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "fk_availability_request_completer" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "fk_availability_request_creator_snapshot_user" FOREIGN KEY ("creatorUserIdSnapshot") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "fk_availability_request_pivot_snapshot_user" FOREIGN KEY ("pivotUserIdAtCreation") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "fk_availability_request_creator_audit" FOREIGN KEY ("companyId", "creatorAuditEventId") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest" ADD CONSTRAINT "fk_availability_request_completion_command" FOREIGN KEY ("companyId", "completionCommandId") REFERENCES "AvailabilityCommand"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequestRecipientAssignment" ADD CONSTRAINT "fk_availability_assignment_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequestRecipientAssignment" ADD CONSTRAINT "fk_availability_assignment_request" FOREIGN KEY ("companyId", "availabilityRequestId") REFERENCES "AvailabilityRequest"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequestRecipientAssignment" ADD CONSTRAINT "fk_availability_assignment_user_access" FOREIGN KEY ("userId", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequestRecipientAssignment" ADD CONSTRAINT "fk_availability_assignment_assigned_by" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequestRecipientAssignment" ADD CONSTRAINT "fk_availability_assignment_revoked_by" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCommand" ADD CONSTRAINT "fk_availability_command_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCommand" ADD CONSTRAINT "fk_availability_command_actor" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCommand" ADD CONSTRAINT "fk_availability_command_request" FOREIGN KEY ("companyId", "surgeryId", "requestId") REFERENCES "AvailabilityRequest"("companyId", "surgeryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCommand" ADD CONSTRAINT "fk_availability_command_surgery" FOREIGN KEY ("companyId", "surgeryId") REFERENCES "Surgery"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNotification" ADD CONSTRAINT "InternalNotification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNotification" ADD CONSTRAINT "InternalNotification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNotification" ADD CONSTRAINT "InternalNotification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNotification" ADD CONSTRAINT "InternalNotification_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNotification" ADD CONSTRAINT "fk_internal_notification_availability_request" FOREIGN KEY ("companyId", "surgeryId", "availabilityRequestId") REFERENCES "AvailabilityRequest"("companyId", "surgeryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "SurgeryContactAssignment" ADD CONSTRAINT "SurgeryContactAssignment_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgeryContactAssignment" ADD CONSTRAINT "SurgeryContactAssignment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoEntry" ADD CONSTRAINT "SeguimientoEntry_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoEntry" ADD CONSTRAINT "SeguimientoEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoEntry" ADD CONSTRAINT "SeguimientoEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "RemitoItem" ADD CONSTRAINT "fk_remito_item_owner" FOREIGN KEY ("company_id", "remitoId") REFERENCES "Remito"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "consumo_item" ADD CONSTRAINT "fk_consumo_item_owner" FOREIGN KEY ("company_id", "consumoId") REFERENCES "consumo"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "devolucion_item" ADD CONSTRAINT "fk_devolucion_item_owner" FOREIGN KEY ("company_id", "devolucionId") REFERENCES "devolucion"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_item" ADD CONSTRAINT "devolucion_item_remitoItemId_fkey" FOREIGN KEY ("remitoItemId") REFERENCES "RemitoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_item" ADD CONSTRAINT "devolucion_item_consumoItemId_fkey" FOREIGN KEY ("consumoItemId") REFERENCES "consumo_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_article_reference" ADD CONSTRAINT "fk_car_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_article_reference" ADD CONSTRAINT "fk_car_verified_by" FOREIGN KEY ("verified_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_stock_scope_reference" ADD CONSTRAINT "fk_cssr_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_stock_scope_reference" ADD CONSTRAINT "fk_cssr_article" FOREIGN KEY ("company_id", "article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_stock_scope_reference" ADD CONSTRAINT "fk_cssr_verified_by" FOREIGN KEY ("verified_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_stock_record_reference" ADD CONSTRAINT "fk_csrr_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_stock_record_reference" ADD CONSTRAINT "fk_csrr_verified_by" FOREIGN KEY ("verified_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_box_formula" ADD CONSTRAINT "fk_cbf_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_box_formula" ADD CONSTRAINT "fk_cbf_article" FOREIGN KEY ("company_id", "box_article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_current" ADD CONSTRAINT "fk_cfc_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_current" ADD CONSTRAINT "fk_cfc_formula" FOREIGN KEY ("company_id", "formula_id") REFERENCES "cajas_box_formula"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_current" ADD CONSTRAINT "fk_cfc_version" FOREIGN KEY ("company_id", "current_formula_version_id") REFERENCES "cajas_formula_version"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_version" ADD CONSTRAINT "fk_cfv_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_version" ADD CONSTRAINT "fk_cfv_formula" FOREIGN KEY ("company_id", "formula_id") REFERENCES "cajas_box_formula"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_version" ADD CONSTRAINT "fk_cfv_previous" FOREIGN KEY ("company_id", "previous_version_id") REFERENCES "cajas_formula_version"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_version" ADD CONSTRAINT "fk_cfv_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_version" ADD CONSTRAINT "fk_cfv_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_line" ADD CONSTRAINT "fk_cfl_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_line" ADD CONSTRAINT "fk_cfl_version" FOREIGN KEY ("company_id", "formula_version_id") REFERENCES "cajas_formula_version"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_line" ADD CONSTRAINT "fk_cfl_article" FOREIGN KEY ("company_id", "article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_surgery" FOREIGN KEY ("company_id", "surgery_id") REFERENCES "Surgery"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_box_scope" FOREIGN KEY ("company_id", "box_stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_assigned_by" FOREIGN KEY ("assigned_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_ended_by" FOREIGN KEY ("ended_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_start_command" FOREIGN KEY ("company_id", "assignment_command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_end_command" FOREIGN KEY ("company_id", "end_command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation" ADD CONSTRAINT "fk_cp_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation" ADD CONSTRAINT "fk_cp_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation" ADD CONSTRAINT "fk_cp_formula_version" FOREIGN KEY ("company_id", "formula_version_id") REFERENCES "cajas_formula_version"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation" ADD CONSTRAINT "fk_cp_latest_control" FOREIGN KEY ("company_id", "latest_control_id") REFERENCES "cajas_control"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation" ADD CONSTRAINT "fk_cp_last_change" FOREIGN KEY ("company_id", "last_accepted_change_id") REFERENCES "cajas_composition_change"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation_line" ADD CONSTRAINT "fk_cpl_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation_line" ADD CONSTRAINT "fk_cpl_preparation" FOREIGN KEY ("company_id", "preparation_id") REFERENCES "cajas_preparation"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation_line" ADD CONSTRAINT "fk_cpl_expected_line" FOREIGN KEY ("company_id", "expected_formula_line_id") REFERENCES "cajas_formula_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation_line" ADD CONSTRAINT "fk_cpl_article" FOREIGN KEY ("company_id", "article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation_line" ADD CONSTRAINT "fk_cpl_stock_scope" FOREIGN KEY ("company_id", "stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_prep_line" FOREIGN KEY ("company_id", "preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_stock_scope" FOREIGN KEY ("company_id", "stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_stock_record" FOREIGN KEY ("company_id", "stock_reservation_reference_id") REFERENCES "cajas_stock_record_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_replaces" FOREIGN KEY ("company_id", "replaces_correlation_id") REFERENCES "cajas_reservation_correlation"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_formula_version" FOREIGN KEY ("company_id", "formula_version_id") REFERENCES "cajas_formula_version"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_prior" FOREIGN KEY ("company_id", "prior_control_id") REFERENCES "cajas_control"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_control" FOREIGN KEY ("company_id", "control_id") REFERENCES "cajas_control"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_source_line" FOREIGN KEY ("company_id", "source_preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_expected_line" FOREIGN KEY ("company_id", "expected_formula_line_id") REFERENCES "cajas_formula_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_article" FOREIGN KEY ("company_id", "article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_stock_scope" FOREIGN KEY ("company_id", "stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change" ADD CONSTRAINT "fk_cchg_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change" ADD CONSTRAINT "fk_cchg_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change" ADD CONSTRAINT "fk_cchg_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change" ADD CONSTRAINT "fk_cchg_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_change" FOREIGN KEY ("company_id", "change_id") REFERENCES "cajas_composition_change"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_prior_line" FOREIGN KEY ("company_id", "prior_preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_result_line" FOREIGN KEY ("company_id", "resulting_preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_prior_article" FOREIGN KEY ("company_id", "prior_article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_result_article" FOREIGN KEY ("company_id", "resulting_article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_prior_scope" FOREIGN KEY ("company_id", "prior_stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_result_scope" FOREIGN KEY ("company_id", "resulting_stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_control_line" FOREIGN KEY ("company_id", "control_line_id") REFERENCES "cajas_control_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_dispatch_line" FOREIGN KEY ("company_id", "dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_return_line" FOREIGN KEY ("company_id", "return_line_id") REFERENCES "cajas_return_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_opened_by" FOREIGN KEY ("opened_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference_resolution" ADD CONSTRAINT "fk_cdr_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference_resolution" ADD CONSTRAINT "fk_cdr_difference" FOREIGN KEY ("company_id", "difference_id") REFERENCES "cajas_difference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference_resolution" ADD CONSTRAINT "fk_cdr_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference_resolution" ADD CONSTRAINT "fk_cdr_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_remito" FOREIGN KEY ("company_id", "remito_id") REFERENCES "Remito"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_control" FOREIGN KEY ("company_id", "source_control_id") REFERENCES "cajas_control"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_corrects" FOREIGN KEY ("company_id", "corrects_dispatch_id", "remito_id") REFERENCES "cajas_dispatch"("company_id", "id", "remito_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_dispatch" FOREIGN KEY ("company_id", "dispatch_id", "remito_id") REFERENCES "cajas_dispatch"("company_id", "id", "remito_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_neutralizes" FOREIGN KEY ("company_id", "neutralizes_dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_remito_item" FOREIGN KEY ("company_id", "remito_id", "remito_item_id") REFERENCES "RemitoItem"("company_id", "remitoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_control_line" FOREIGN KEY ("company_id", "source_control_line_id") REFERENCES "cajas_control_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_prep_line" FOREIGN KEY ("company_id", "source_preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_article" FOREIGN KEY ("company_id", "article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_stock_scope" FOREIGN KEY ("company_id", "stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_stock_effect" FOREIGN KEY ("company_id", "stock_effect_reference_id") REFERENCES "cajas_stock_record_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_accounting" ADD CONSTRAINT "fk_cda_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_accounting" ADD CONSTRAINT "fk_cda_dispatch" FOREIGN KEY ("company_id", "dispatch_id") REFERENCES "cajas_dispatch"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line_accounting" ADD CONSTRAINT "fk_cdla_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line_accounting" ADD CONSTRAINT "fk_cdla_accounting" FOREIGN KEY ("company_id", "accounting_id") REFERENCES "cajas_dispatch_accounting"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line_accounting" ADD CONSTRAINT "fk_cdla_dispatch_line" FOREIGN KEY ("company_id", "dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_dispatch_line" FOREIGN KEY ("company_id", "dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_stock_scope" FOREIGN KEY ("company_id", "stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_return_confirmation" FOREIGN KEY ("company_id", "return_confirmation_id") REFERENCES "cajas_return_confirmation"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_consumption_confirmation" FOREIGN KEY ("company_id", "consumption_confirmation_id") REFERENCES "cajas_consumption_confirmation"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_return_line" FOREIGN KEY ("company_id", "return_line_id") REFERENCES "cajas_return_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_consumption_line" FOREIGN KEY ("company_id", "consumption_line_id") REFERENCES "cajas_consumption_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_neutralizes" FOREIGN KEY ("company_id", "neutralizes_disposition_id") REFERENCES "cajas_disposition"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_stock_effect" FOREIGN KEY ("company_id", "stock_effect_reference_id") REFERENCES "cajas_stock_record_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_dispatch" FOREIGN KEY ("company_id", "dispatch_id", "remito_id") REFERENCES "cajas_dispatch"("company_id", "id", "remito_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_devolucion" FOREIGN KEY ("company_id", "devolucion_id", "remito_id") REFERENCES "devolucion"("companyId", "id", "remitoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_corrects" FOREIGN KEY ("company_id", "corrects_confirmation_id", "devolucion_id", "dispatch_id") REFERENCES "cajas_return_confirmation"("company_id", "id", "devolucion_id", "dispatch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_confirmation" FOREIGN KEY ("company_id", "return_confirmation_id", "devolucion_id", "dispatch_id") REFERENCES "cajas_return_confirmation"("company_id", "id", "devolucion_id", "dispatch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_devolucion_item" FOREIGN KEY ("company_id", "devolucion_id", "devolucion_item_id") REFERENCES "devolucion_item"("company_id", "devolucionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_dispatch_line" FOREIGN KEY ("company_id", "dispatch_id", "dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_article" FOREIGN KEY ("company_id", "article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_stock_scope" FOREIGN KEY ("company_id", "stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_replacement_pair" ADD CONSTRAINT "fk_crp_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_replacement_pair" ADD CONSTRAINT "fk_crp_return_line" FOREIGN KEY ("company_id", "return_confirmation_id", "dispatch_id", "return_line_id") REFERENCES "cajas_return_line"("company_id", "return_confirmation_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_replacement_pair" ADD CONSTRAINT "fk_crp_original_line" FOREIGN KEY ("company_id", "dispatch_id", "original_dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_replacement_pair" ADD CONSTRAINT "fk_crp_received_article" FOREIGN KEY ("company_id", "received_article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_replacement_pair" ADD CONSTRAINT "fk_crp_received_scope" FOREIGN KEY ("company_id", "received_stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_dispatch" FOREIGN KEY ("company_id", "dispatch_id", "remito_id") REFERENCES "cajas_dispatch"("company_id", "id", "remito_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_consumo" FOREIGN KEY ("company_id", "consumo_id", "remito_id") REFERENCES "consumo"("companyId", "id", "remitoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_corrects" FOREIGN KEY ("company_id", "corrects_confirmation_id", "consumo_id", "dispatch_id") REFERENCES "cajas_consumption_confirmation"("company_id", "id", "consumo_id", "dispatch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_confirmation" FOREIGN KEY ("company_id", "consumption_confirmation_id", "consumo_id", "dispatch_id") REFERENCES "cajas_consumption_confirmation"("company_id", "id", "consumo_id", "dispatch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_consumo_item" FOREIGN KEY ("company_id", "consumo_id", "consumo_item_id") REFERENCES "consumo_item"("company_id", "consumoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_dispatch_line" FOREIGN KEY ("company_id", "dispatch_id", "dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_article" FOREIGN KEY ("company_id", "article_reference_id") REFERENCES "cajas_article_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_stock_scope" FOREIGN KEY ("company_id", "stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_recognized_disp" FOREIGN KEY ("company_id", "dispatch_line_id", "recognized_return_disposition_id") REFERENCES "cajas_disposition"("company_id", "dispatch_line_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_condition_projection" ADD CONSTRAINT "fk_ccp_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_condition_projection" ADD CONSTRAINT "fk_ccp_box_scope" FOREIGN KEY ("company_id", "box_stock_scope_reference_id") REFERENCES "cajas_stock_scope_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_condition_projection" ADD CONSTRAINT "fk_ccp_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_command_acceptance" ADD CONSTRAINT "fk_cca_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_command_acceptance" ADD CONSTRAINT "fk_cca_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_command_acceptance" ADD CONSTRAINT "fk_cca_audit" FOREIGN KEY ("company_id", "audit_event_id") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_command_effect" ADD CONSTRAINT "fk_cce_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_command_effect" ADD CONSTRAINT "fk_cce_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_command_effect" ADD CONSTRAINT "fk_cce_stock_record" FOREIGN KEY ("company_id", "stock_record_reference_id") REFERENCES "cajas_stock_record_reference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_command_attempt" ADD CONSTRAINT "fk_ccat_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_command_attempt" ADD CONSTRAINT "fk_ccat_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_command_attempt" ADD CONSTRAINT "fk_ccat_actor" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_command_attempt" ADD CONSTRAINT "fk_ccat_audit" FOREIGN KEY ("company_id", "audit_event_id") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_projection_reconciliation" ADD CONSTRAINT "fk_cpr_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_projection_reconciliation" ADD CONSTRAINT "fk_cpr_compared_by" FOREIGN KEY ("compared_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_projection_reconciliation" ADD CONSTRAINT "fk_cpr_repair_command" FOREIGN KEY ("company_id", "repair_command_acceptance_id") REFERENCES "cajas_command_acceptance"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

