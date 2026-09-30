-- Availability Request persistence foundation.
-- Additive DDL only: no seed, designation, creator/date backfill, or feature enablement.

-- ExtendEnum
ALTER TYPE "InternalNotificationType" ADD VALUE 'availability_request_actionable';
ALTER TYPE "InternalNotificationType" ADD VALUE 'availability_request_completed';
ALTER TYPE "InternalNotificationType" ADD VALUE 'availability_pivot_reassigned';

-- CreateEnum
CREATE TYPE "CompanyOperationalDesignation" AS ENUM ('PIVOT');

-- CreateEnum
CREATE TYPE "AvailabilityRequestStatus" AS ENUM ('OPEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AvailabilityCreatorResolution" AS ENUM (
    'IDENTIFIED_ELIGIBLE',
    'NOT_IDENTIFIED',
    'IDENTIFIED_INACTIVE',
    'IDENTIFIED_NO_COMPANY_ACCESS'
);

-- CreateEnum
CREATE TYPE "AvailabilityRecipientReason" AS ENUM ('CREATOR', 'PIVOT');

-- CreateEnum
CREATE TYPE "AvailabilityCommandType" AS ENUM (
    'REQUEST',
    'COMPLETE',
    'CORRECT',
    'REASSIGN_PIVOT'
);

-- AlterTable
ALTER TABLE "Surgery"
    ADD COLUMN "createdById" TEXT,
    ADD COLUMN "materialAvailabilityDate" DATE;

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

-- AlterTable
ALTER TABLE "InternalNotification"
    ADD COLUMN "availabilityRequestId" TEXT;

-- CreateIndex
CREATE INDEX "ix_surgery_company_material_availability"
ON "Surgery"("companyId", "materialAvailabilityDate");

-- CreateIndex
CREATE INDEX "ix_surgery_company_created_by"
ON "Surgery"("companyId", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "uq_company_operational_assignee_designation"
ON "CompanyOperationalAssignee"("companyId", "designation");

-- CreateIndex
CREATE INDEX "ix_company_operational_assignee_user_company"
ON "CompanyOperationalAssignee"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_request_company_id"
ON "AvailabilityRequest"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_request_company_surgery_id"
ON "AvailabilityRequest"("companyId", "surgeryId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_request_completion_command"
ON "AvailabilityRequest"("companyId", "completionCommandId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_request_correlation"
ON "AvailabilityRequest"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX availability_request_one_open_per_surgery
ON "AvailabilityRequest"("companyId", "surgeryId")
WHERE "status" = 'OPEN';

-- CreateIndex
CREATE INDEX "ix_availability_request_company_surgery_status"
ON "AvailabilityRequest"("companyId", "surgeryId", "status");

-- CreateIndex
CREATE INDEX "ix_availability_request_company_requester_requested"
ON "AvailabilityRequest"("companyId", "requesterUserId", "requestedAt");

-- CreateIndex
CREATE INDEX "ix_availability_request_company_status_requested"
ON "AvailabilityRequest"("companyId", "status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_assignment_company_id"
ON "AvailabilityRequestRecipientAssignment"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX availability_request_one_active_reason
ON "AvailabilityRequestRecipientAssignment"("availabilityRequestId", "reason")
WHERE "revokedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX availability_request_assignment_episode
ON "AvailabilityRequestRecipientAssignment"(
    "availabilityRequestId",
    "reason",
    "userId",
    "assignedAt"
);

-- CreateIndex
CREATE INDEX "ix_availability_assignment_company_user_revoked"
ON "AvailabilityRequestRecipientAssignment"("companyId", "userId", "revokedAt");

-- CreateIndex
CREATE INDEX "ix_availability_assignment_request_reason_revoked"
ON "AvailabilityRequestRecipientAssignment"(
    "availabilityRequestId",
    "reason",
    "revokedAt"
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_command_company_id"
ON "AvailabilityCommand"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_command_idempotency"
ON "AvailabilityCommand"("companyId", "actorUserId", "type", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ix_availability_command_company_request"
ON "AvailabilityCommand"("companyId", "requestId");

-- CreateIndex
CREATE INDEX "ix_availability_command_company_surgery"
ON "AvailabilityCommand"("companyId", "surgeryId");

-- CreateIndex
CREATE INDEX "ix_internal_notification_company_availability_request"
ON "InternalNotification"("companyId", "availabilityRequestId", "createdAt");

-- AddCheckConstraint
ALTER TABLE "CompanyOperationalAssignee"
ADD CONSTRAINT "CompanyOperationalAssignee_version_check"
CHECK ("version" > 0);

-- AddCheckConstraint
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "AvailabilityRequest_creator_resolution_check"
CHECK (
    (
        "creatorResolution" = 'NOT_IDENTIFIED'
        AND "creatorUserIdSnapshot" IS NULL
        AND "creatorAuditEventId" IS NULL
    )
    OR
    (
        "creatorResolution" IN (
            'IDENTIFIED_ELIGIBLE',
            'IDENTIFIED_INACTIVE',
            'IDENTIFIED_NO_COMPANY_ACCESS'
        )
        AND "creatorUserIdSnapshot" IS NOT NULL
    )
);

-- AddCheckConstraint
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "AvailabilityRequest_pivot_mapping_version_check"
CHECK ("pivotMappingVersion" > 0);

-- AddCheckConstraint
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "AvailabilityRequest_terminal_consistency_check"
CHECK (
    (
        "status" = 'OPEN'
        AND "completedAt" IS NULL
        AND "completedByUserId" IS NULL
        AND "submittedDate" IS NULL
        AND "completionCommandId" IS NULL
    )
    OR
    (
        "status" = 'COMPLETED'
        AND "completedAt" IS NOT NULL
        AND "completedByUserId" IS NOT NULL
        AND "submittedDate" IS NOT NULL
        AND "completionCommandId" IS NOT NULL
    )
);

-- AddCheckConstraint
ALTER TABLE "AvailabilityRequestRecipientAssignment"
ADD CONSTRAINT "AvailabilityRequestRecipientAssignment_lifecycle_check"
CHECK (
    (
        "reason" = 'CREATOR'
        AND "revokedAt" IS NULL
        AND "revokedByUserId" IS NULL
        AND "revokeReason" IS NULL
    )
    OR
    (
        "reason" = 'PIVOT'
        AND "revokedAt" IS NULL
        AND "revokedByUserId" IS NULL
        AND "revokeReason" IS NULL
    )
    OR
    (
        "reason" = 'PIVOT'
        AND "revokedAt" IS NOT NULL
        AND "revokedByUserId" IS NOT NULL
        AND "revokeReason" IS NOT NULL
        AND BTRIM("revokeReason") <> ''
        AND "revokedAt" >= "assignedAt"
    )
);

-- AddCheckConstraint
ALTER TABLE "AvailabilityCommand"
ADD CONSTRAINT "AvailabilityCommand_payload_hash_check"
CHECK ("payloadHash" ~ '^[0-9a-f]{64}$');

-- AddCheckConstraint
ALTER TABLE "AvailabilityCommand"
ADD CONSTRAINT "AvailabilityCommand_idempotency_key_check"
CHECK (
    CHAR_LENGTH("idempotencyKey") BETWEEN 16 AND 128
    AND "idempotencyKey" ~ '^[!-~]+$'
);

-- AddCheckConstraint
ALTER TABLE "AvailabilityCommand"
ADD CONSTRAINT "AvailabilityCommand_terminal_consistency_check"
CHECK (
    ("completedAt" IS NULL AND "resultCode" IS NULL)
    OR
    ("completedAt" IS NOT NULL AND "resultCode" IS NOT NULL)
);

-- AddCheckConstraint
ALTER TABLE "AvailabilityCommand"
ADD CONSTRAINT "AvailabilityCommand_target_consistency_check"
CHECK (
    "completedAt" IS NULL
    OR
    (
        "type" IN ('REQUEST', 'COMPLETE')
        AND "requestId" IS NOT NULL
        AND "surgeryId" IS NOT NULL
    )
    OR
    (
        "type" = 'CORRECT'
        AND "requestId" IS NULL
        AND "surgeryId" IS NOT NULL
    )
    OR
    (
        "type" = 'REASSIGN_PIVOT'
        AND "requestId" IS NULL
        AND "surgeryId" IS NULL
    )
);

-- AddCheckConstraint
ALTER TABLE "InternalNotification"
ADD CONSTRAINT "InternalNotification_availability_request_link_check"
CHECK (
    "type" NOT IN (
        'availability_request_actionable',
        'availability_request_completed',
        'availability_pivot_reassigned'
    )
    OR "availabilityRequestId" IS NOT NULL
);

-- AddForeignKey
ALTER TABLE "Surgery"
ADD CONSTRAINT "fk_surgery_created_by"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOperationalAssignee"
ADD CONSTRAINT "fk_company_operational_assignee_company"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOperationalAssignee"
ADD CONSTRAINT "fk_company_operational_assignee_user_access"
FOREIGN KEY ("userId", "companyId")
REFERENCES "UserCompanyAccess"("userId", "companyId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOperationalAssignee"
ADD CONSTRAINT "fk_company_operational_assignee_created_by"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOperationalAssignee"
ADD CONSTRAINT "fk_company_operational_assignee_updated_by"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "fk_availability_request_company"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "fk_availability_request_surgery"
FOREIGN KEY ("companyId", "surgeryId")
REFERENCES "Surgery"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "fk_availability_request_requester"
FOREIGN KEY ("requesterUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "fk_availability_request_completer"
FOREIGN KEY ("completedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "fk_availability_request_creator_snapshot_user"
FOREIGN KEY ("creatorUserIdSnapshot") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "fk_availability_request_pivot_snapshot_user"
FOREIGN KEY ("pivotUserIdAtCreation") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "fk_availability_request_creator_audit"
FOREIGN KEY ("companyId", "creatorAuditEventId")
REFERENCES "AuditEvent"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequestRecipientAssignment"
ADD CONSTRAINT "fk_availability_assignment_company"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequestRecipientAssignment"
ADD CONSTRAINT "fk_availability_assignment_request"
FOREIGN KEY ("companyId", "availabilityRequestId")
REFERENCES "AvailabilityRequest"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequestRecipientAssignment"
ADD CONSTRAINT "fk_availability_assignment_user_access"
FOREIGN KEY ("userId", "companyId")
REFERENCES "UserCompanyAccess"("userId", "companyId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequestRecipientAssignment"
ADD CONSTRAINT "fk_availability_assignment_assigned_by"
FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequestRecipientAssignment"
ADD CONSTRAINT "fk_availability_assignment_revoked_by"
FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCommand"
ADD CONSTRAINT "fk_availability_command_company"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCommand"
ADD CONSTRAINT "fk_availability_command_actor"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCommand"
ADD CONSTRAINT "fk_availability_command_request"
FOREIGN KEY ("companyId", "surgeryId", "requestId")
REFERENCES "AvailabilityRequest"("companyId", "surgeryId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCommand"
ADD CONSTRAINT "fk_availability_command_surgery"
FOREIGN KEY ("companyId", "surgeryId")
REFERENCES "Surgery"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRequest"
ADD CONSTRAINT "fk_availability_request_completion_command"
FOREIGN KEY ("companyId", "completionCommandId")
REFERENCES "AvailabilityCommand"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNotification"
ADD CONSTRAINT "fk_internal_notification_availability_request"
FOREIGN KEY ("companyId", "surgeryId", "availabilityRequestId")
REFERENCES "AvailabilityRequest"("companyId", "surgeryId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
