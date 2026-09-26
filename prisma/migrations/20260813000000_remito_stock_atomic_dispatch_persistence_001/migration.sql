-- REMITO-STOCK-ATOMIC-DISPATCH-001: DEV-only forward artifact; not applied by this task.
-- Baseline: existing 19 migrations through 20260811000000_remito_qr_barcode_001.
-- C13 schema: 0faf2f55e178f1b111c5ae108380a505a68c8feb.
-- C14 observation: d04051c10343618018f4bd63d1cfa14abf1f9ce526d584893334b379e0cc78bb.
-- C14 package: bd0f00d385bbcc30c538205de177850f150476576fd7215022573b2b7c6a7d8b.
-- Additive only: canonical Stock/Cajas declarations were never present in the migration baseline.

CREATE EXTENSION btree_gist SCHEMA public VERSION '1.7';

-- CreateEnum
CREATE TYPE "StockTraceMode" AS ENUM ('NONE', 'LOT', 'IDENTIFIED_UNIT');

-- CreateEnum
CREATE TYPE "StockContextKind" AS ENUM ('DEPOSIT', 'TRANSIT', 'EXTERNAL_CUSTODY');

-- CreateEnum
CREATE TYPE "StockEvidenceKind" AS ENUM ('OPENING', 'RECEIPT', 'DISPATCH', 'RETURN', 'CONSUMPTION', 'TRANSFER_DISPATCH', 'TRANSFER_RECEIPT', 'COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE', 'CORRECTION', 'REVERSAL');

-- CreateEnum
CREATE TYPE "StockReservationEventKind" AS ENUM ('RESERVE', 'RELEASE', 'REPLACE', 'CANCEL', 'APPLY_TO_DISPATCH');

-- CreateEnum
CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'PARTIALLY_APPLIED', 'RELEASED', 'CANCELLED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "StockCompatibilityDisposition" AS ENUM ('DETERMINISTICALLY_MAPPABLE', 'DESCRIPTIVE_SNAPSHOT_ONLY', 'UNRESOLVED_LEGACY', 'INCOMPATIBLE_REJECTED');

-- CreateEnum
CREATE TYPE "EvidenceRecordKind" AS ENUM ('ORIGINAL', 'CORRECTION', 'REVERSAL', 'ANNULMENT');

-- CreateEnum
CREATE TYPE "CommandAttemptOutcome" AS ENUM ('ACCEPTED', 'DENIED', 'VALIDATION_FAILED', 'CONFLICT', 'FAILED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ProjectionKind" AS ENUM ('STOCK_POSITION', 'STOCK_RESERVATION', 'CAJAS_PREPARATION', 'CAJAS_DISPATCH_ACCOUNTING', 'CAJAS_CONDITION');

-- CreateEnum
CREATE TYPE "ReconciliationResult" AS ENUM ('MATCH', 'MISMATCH');

-- CreateEnum
CREATE TYPE "StockLotReviewResult" AS ENUM ('MATCH', 'DISCREPANCY', 'RESOLVED_EQUIVALENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "SourceScopeKind" AS ENUM ('HEADER', 'LINE');

-- CreateEnum
CREATE TYPE "OperationalEffectTargetKind" AS ENUM ('DOMAIN_ONLY', 'STOCK_EVIDENCE', 'STOCK_RESERVATION_EVIDENCE');

-- CreateEnum
CREATE TYPE "cajas_line_role" AS ENUM ('expected', 'unexpected', 'substitution');

-- CreateEnum
CREATE TYPE "cajas_control_kind" AS ENUM ('control', 'recontrol');

-- CreateEnum
CREATE TYPE "cajas_control_result" AS ENUM ('clean', 'with_differences');

-- CreateEnum
CREATE TYPE "cajas_change_kind" AS ENUM ('add', 'remove', 'replace', 'quantity', 'traceability');

-- CreateEnum
CREATE TYPE "cajas_disposition_kind" AS ENUM ('returned', 'consumed', 'missing', 'damaged', 'under_review');

-- CreateEnum
CREATE TYPE "cajas_return_line_kind" AS ENUM ('unchanged', 'consumed', 'missing', 'damaged', 'added', 'replacement', 'under_review');

-- CreateEnum
CREATE TYPE "cajas_current_condition" AS ENUM ('available', 'with_differences');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockArticleEligibility" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "currentPolicyVersionId" TEXT,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StockArticleEligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockArticlePolicyVersion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "eligibilityId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "stockUnit" TEXT NOT NULL,
    "quantityScale" SMALLINT NOT NULL,
    "traceMode" "StockTraceMode" NOT NULL,
    "previousVersionId" TEXT,
    "effectiveAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "cause" TEXT,
    "commandAcceptanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockArticlePolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockDeposit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StockDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockContext" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "StockContextKind" NOT NULL,
    "depositId" TEXT,
    "sourceDomain" TEXT,
    "sourceEntityId" TEXT,
    "externalCustodianRef" TEXT,
    "labelSnapshot" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLotObservation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "normalizedLotCode" TEXT NOT NULL,
    "displayLotCode" TEXT NOT NULL,
    "expirationDate" DATE,
    "sourceDomain" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "sourceScopeKey" TEXT NOT NULL,
    "recordKind" "EvidenceRecordKind" NOT NULL,
    "correctsObservationId" TEXT,
    "observedAt" TIMESTAMPTZ(6) NOT NULL,
    "observedById" TEXT NOT NULL,
    "cause" TEXT,
    "commandAcceptanceId" TEXT NOT NULL,
    "auditEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLotObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLotReview" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "normalizedLotCode" TEXT NOT NULL,
    "leftObservationId" TEXT NOT NULL,
    "rightObservationId" TEXT NOT NULL,
    "result" "StockLotReviewResult" NOT NULL,
    "resolutionObservationId" TEXT,
    "canonicalLotId" TEXT,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "cause" TEXT,
    "commandAcceptanceId" TEXT NOT NULL,
    "auditEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLotReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "normalizedLotCode" TEXT NOT NULL,
    "primaryObservationId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "commandAcceptanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIdentifiedUnit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockIdentifiedUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIdentifiedUnitConfigurationVersion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "identifiedUnitId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "eligibilityId" TEXT NOT NULL,
    "policyVersionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "previousVersionId" TEXT,
    "internalCode" TEXT NOT NULL,
    "serialNumber" TEXT,
    "effectiveAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "cause" TEXT,
    "commandAcceptanceId" TEXT NOT NULL,
    "auditEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockIdentifiedUnitConfigurationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIdentifiedUnitCurrentConfiguration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "identifiedUnitId" TEXT NOT NULL,
    "configurationVersionId" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "serialNumber" TEXT,
    "version" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StockIdentifiedUnitCurrentConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPosition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "eligibilityId" TEXT NOT NULL,
    "policyVersionId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "traceMode" "StockTraceMode" NOT NULL,
    "lotId" TEXT,
    "identifiedUnitId" TEXT,
    "stockUnit" TEXT NOT NULL,
    "quantityScale" SMALLINT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIdentifiedUnitOccupancy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "identifiedUnitId" TEXT NOT NULL,
    "currentPositionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "evidenceWatermark" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StockIdentifiedUnitOccupancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockActivationBoundary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "boundaryGroupKey" TEXT NOT NULL,
    "cutoffAt" TIMESTAMPTZ(6) NOT NULL,
    "validUntil" TIMESTAMPTZ(6),
    "approvedEvidenceRef" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockActivationBoundary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockOpeningPosition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "activationBoundaryId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "cutoffAt" TIMESTAMPTZ(6) NOT NULL,
    "openingEvidenceLineId" TEXT NOT NULL,
    "quantity" DECIMAL(24,4) NOT NULL,
    "stockUnit" TEXT NOT NULL,
    "scaleSnapshot" SMALLINT NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockOpeningPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockEvidence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "StockEvidenceKind" NOT NULL,
    "recordKind" "EvidenceRecordKind" NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "sourceCheckpoint" TEXT NOT NULL,
    "activationBoundaryId" TEXT,
    "correctsEvidenceId" TEXT,
    "reversesEvidenceId" TEXT,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "cause" TEXT,
    "commandAcceptanceId" TEXT NOT NULL,
    "auditEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockEvidenceLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "articleId" TEXT NOT NULL,
    "fromPositionId" TEXT,
    "toPositionId" TEXT,
    "reservationId" TEXT,
    "quantity" DECIMAL(24,4) NOT NULL,
    "stockUnit" TEXT NOT NULL,
    "scaleSnapshot" SMALLINT NOT NULL,
    "lotCodeSnapshot" TEXT,
    "expirationDateSnapshot" DATE,
    "serialNumberSnapshot" TEXT,
    "identifiedCodeSnapshot" TEXT,
    "sourceLineId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockEvidenceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "sourceLineId" TEXT,
    "sourceScopeKind" "SourceScopeKind" NOT NULL,
    "sourceScopeKey" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "identifiedUnitId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservationEvidence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" "StockReservationEventKind" NOT NULL,
    "quantity" DECIMAL(24,4) NOT NULL,
    "stockUnit" TEXT NOT NULL,
    "scaleSnapshot" SMALLINT NOT NULL,
    "replacesEvidenceId" TEXT,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "cause" TEXT,
    "commandAcceptanceId" TEXT NOT NULL,
    "auditEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReservationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservationProjection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "activeQuantity" DECIMAL(24,4) NOT NULL,
    "appliedQuantity" DECIMAL(24,4) NOT NULL,
    "status" "StockReservationStatus" NOT NULL,
    "version" INTEGER NOT NULL,
    "evidenceWatermark" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StockReservationProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPositionProjection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "physicalQuantity" DECIMAL(24,4) NOT NULL,
    "reservedQuantity" DECIMAL(24,4) NOT NULL,
    "availableQuantity" DECIMAL(24,4) NOT NULL,
    "underReviewQuantity" DECIMAL(24,4) NOT NULL,
    "finalDispositionQuantity" DECIMAL(24,4) NOT NULL,
    "version" INTEGER NOT NULL,
    "evidenceWatermark" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StockPositionProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCompatibilityReference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "sourceLineId" TEXT,
    "sourceScopeKind" "SourceScopeKind" NOT NULL,
    "sourceScopeKey" TEXT NOT NULL,
    "disposition" "StockCompatibilityDisposition" NOT NULL,
    "articleId" TEXT,
    "positionId" TEXT,
    "identifiedUnitId" TEXT,
    "evidenceSummary" TEXT NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCompatibilityReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalCommandAcceptance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "sourceOperationId" TEXT NOT NULL,
    "checkpoint" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "intentHash" TEXT NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "resultEntityType" TEXT NOT NULL,
    "resultEntityId" TEXT NOT NULL,
    "auditEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalCommandAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalCommandEffect" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "commandAcceptanceId" TEXT NOT NULL,
    "effectKey" TEXT NOT NULL,
    "effectType" TEXT NOT NULL,
    "targetKind" "OperationalEffectTargetKind" NOT NULL,
    "resultEntityType" TEXT NOT NULL,
    "resultEntityId" TEXT NOT NULL,
    "stockEvidenceId" TEXT,
    "stockReservationEvidenceId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalCommandEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalCommandAttempt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "commandAcceptanceId" TEXT,
    "transportCorrelationId" TEXT NOT NULL,
    "intentHash" TEXT NOT NULL,
    "outcome" "CommandAttemptOutcome" NOT NULL,
    "attemptedAt" TIMESTAMPTZ(6) NOT NULL,
    "actorId" TEXT NOT NULL,
    "auditEventId" TEXT,
    "detail" TEXT,
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalCommandAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectionReconciliation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "ProjectionKind" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "observedVersion" INTEGER NOT NULL,
    "evidenceWatermark" TEXT NOT NULL,
    "result" "ReconciliationResult" NOT NULL,
    "comparedAt" TIMESTAMPTZ(6) NOT NULL,
    "comparedById" TEXT,
    "detail" TEXT,
    "repairCommandAcceptanceId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectionReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_box_formula" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "box_article_id" TEXT NOT NULL,
    "current_version_id" TEXT,
    "next_version_number" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_box_formula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_formula_version" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "formula_id" TEXT NOT NULL,
    "box_article_id" TEXT NOT NULL,
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
    "article_id" TEXT NOT NULL,
    "expected_quantity" DECIMAL(24,4) NOT NULL,
    "stock_unit" TEXT NOT NULL,
    "scale_snapshot" SMALLINT NOT NULL,
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
    "box_article_id" TEXT NOT NULL,
    "box_identified_unit_id" TEXT NOT NULL,
    "active_slot" SMALLINT,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "ended_at" TIMESTAMPTZ(6),
    "ended_by_id" TEXT,
    "end_cause" TEXT,
    "start_command_acceptance_id" TEXT NOT NULL,
    "end_command_acceptance_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_preparation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "box_article_id" TEXT NOT NULL,
    "formula_version_id" TEXT NOT NULL,
    "latest_control_id" TEXT,
    "last_accepted_change_id" TEXT,
    "requires_recontrol" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL,
    "evidence_watermark" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_preparation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_preparation_line" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "preparation_id" TEXT NOT NULL,
    "formula_version_id" TEXT NOT NULL,
    "line_key" TEXT NOT NULL,
    "expected_formula_line_id" TEXT,
    "role" "cajas_line_role" NOT NULL,
    "article_id" TEXT NOT NULL,
    "stock_position_id" TEXT,
    "quantity" DECIMAL(24,4) NOT NULL,
    "stock_unit" TEXT NOT NULL,
    "scale_snapshot" SMALLINT NOT NULL,
    "trace_capture" JSONB,
    "difference_acknowledged" BOOLEAN NOT NULL,
    "dispatched_quantity" DECIMAL(24,4) NOT NULL,
    "version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_preparation_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_reservation_correlation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "preparation_id" TEXT,
    "preparation_line_id" TEXT,
    "stock_position_id" TEXT NOT NULL,
    "stock_reservation_id" TEXT NOT NULL,
    "stock_reservation_evidence_id" TEXT NOT NULL,
    "source_checkpoint" TEXT NOT NULL,
    "semantic_key" TEXT NOT NULL,
    "quantity" DECIMAL(24,4),
    "stock_unit" TEXT,
    "scale_snapshot" SMALLINT,
    "replaces_correlation_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_reservation_correlation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_control" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "box_article_id" TEXT NOT NULL,
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
    "assignment_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "source_preparation_id" TEXT NOT NULL,
    "source_preparation_line_id" TEXT NOT NULL,
    "expected_formula_line_id" TEXT,
    "role" "cajas_line_role" NOT NULL,
    "article_id" TEXT NOT NULL,
    "stock_position_id" TEXT,
    "quantity" DECIMAL(24,4) NOT NULL,
    "stock_unit" TEXT NOT NULL,
    "scale_snapshot" SMALLINT NOT NULL,
    "sku_snapshot" TEXT,
    "description_snapshot" TEXT,
    "trace_capture" JSONB,
    "difference_acknowledged" BOOLEAN NOT NULL,
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
    "assignment_id" TEXT NOT NULL,
    "preparation_id" TEXT NOT NULL,
    "change_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "kind" "cajas_change_kind" NOT NULL,
    "prior_preparation_line_id" TEXT,
    "resulting_preparation_line_id" TEXT,
    "prior_article_id" TEXT,
    "resulting_article_id" TEXT,
    "prior_stock_position_id" TEXT,
    "resulting_stock_position_id" TEXT,
    "prior_quantity" DECIMAL(24,4),
    "resulting_quantity" DECIMAL(24,4),
    "stock_unit" TEXT NOT NULL,
    "scale_snapshot" SMALLINT NOT NULL,
    "prior_trace_capture" JSONB,
    "resulting_trace_capture" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_composition_change_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_difference" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "control_line_id" TEXT,
    "origin_dispatch_id" TEXT,
    "origin_remito_id" TEXT,
    "dispatch_line_id" TEXT,
    "return_confirmation_id" TEXT,
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
    "record_kind" "EvidenceRecordKind" NOT NULL,
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
    "assignment_id" TEXT NOT NULL,
    "remito_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "record_kind" "EvidenceRecordKind" NOT NULL,
    "accounting_sign" SMALLINT NOT NULL,
    "neutralizes_dispatch_line_id" TEXT,
    "remito_item_id" TEXT NOT NULL,
    "source_control_line_id" TEXT NOT NULL,
    "source_preparation_id" TEXT NOT NULL,
    "source_preparation_line_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "stock_position_id" TEXT,
    "quantity" DECIMAL(24,4) NOT NULL,
    "stock_unit" TEXT NOT NULL,
    "scale_snapshot" SMALLINT NOT NULL,
    "sku_snapshot" TEXT,
    "description_snapshot" TEXT,
    "lot_code_snapshot" TEXT,
    "expiration_date_snapshot" DATE,
    "serial_number_snapshot" TEXT,
    "identified_code_snapshot" TEXT,
    "traceability_snapshot" JSONB,
    "stock_evidence_line_id" TEXT NOT NULL,
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
    "dispatch_id" TEXT NOT NULL,
    "dispatch_line_id" TEXT NOT NULL,
    "dispatched_quantity" DECIMAL(24,4) NOT NULL,
    "disposed_quantity" DECIMAL(24,4) NOT NULL,
    "pending_quantity" DECIMAL(24,4) NOT NULL,
    "stock_unit" TEXT NOT NULL,
    "scale_snapshot" SMALLINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_dispatch_line_accounting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_disposition" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "dispatch_line_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "slice_key" TEXT NOT NULL,
    "record_kind" "EvidenceRecordKind" NOT NULL,
    "accounting_sign" SMALLINT NOT NULL,
    "kind" "cajas_disposition_kind" NOT NULL,
    "quantity" DECIMAL(24,4) NOT NULL,
    "stock_unit" TEXT NOT NULL,
    "scale_snapshot" SMALLINT NOT NULL,
    "stock_position_id" TEXT,
    "return_confirmation_id" TEXT,
    "consumption_confirmation_id" TEXT,
    "return_line_id" TEXT,
    "consumption_line_id" TEXT,
    "neutralizes_disposition_id" TEXT,
    "stock_evidence_line_id" TEXT NOT NULL,
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
    "record_kind" "EvidenceRecordKind" NOT NULL,
    "original_slot" SMALLINT DEFAULT 1,
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
    "article_id" TEXT NOT NULL,
    "stock_position_id" TEXT,
    "quantity" DECIMAL(24,4) NOT NULL,
    "stock_unit" TEXT NOT NULL,
    "scale_snapshot" SMALLINT NOT NULL,
    "sku_snapshot" TEXT,
    "description_snapshot" TEXT,
    "lot_code_snapshot" TEXT,
    "expiration_date_snapshot" DATE,
    "serial_number_snapshot" TEXT,
    "identified_code_snapshot" TEXT,
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
    "received_article_id" TEXT NOT NULL,
    "received_stock_position_id" TEXT,
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
    "record_kind" "EvidenceRecordKind" NOT NULL,
    "original_slot" SMALLINT DEFAULT 1,
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
    "article_id" TEXT NOT NULL,
    "stock_position_id" TEXT,
    "quantity" DECIMAL(24,4) NOT NULL,
    "stock_unit" TEXT NOT NULL,
    "scale_snapshot" SMALLINT NOT NULL,
    "sku_snapshot" TEXT,
    "description_snapshot" TEXT,
    "lot_code_snapshot" TEXT,
    "expiration_date_snapshot" DATE,
    "serial_number_snapshot" TEXT,
    "identified_code_snapshot" TEXT,
    "traceability_snapshot" JSONB,
    "recognized_return_disposition_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_consumption_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas_condition_projection" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "box_identified_unit_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "condition" "cajas_current_condition",
    "open_difference_count" INTEGER NOT NULL DEFAULT 0,
    "pending_dispatch_scope_count" INTEGER NOT NULL DEFAULT 0,
    "requires_recontrol" BOOLEAN NOT NULL DEFAULT false,
    "operation_ended_at" TIMESTAMPTZ(6),
    "dispatch_eligible" BOOLEAN NOT NULL DEFAULT false,
    "reuse_eligible" BOOLEAN NOT NULL DEFAULT false,
    "eligibility_reasons" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "evidence_watermark" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_condition_projection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "durable_attempt_audit_event" (
    "event_id" CHAR(64) NOT NULL,
    "schema_version" VARCHAR(64) NOT NULL,
    "policy_id" VARCHAR(64) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "event_ordinal" INTEGER NOT NULL,
    "event_kind" VARCHAR(32) NOT NULL,
    "bundle_id" VARCHAR(16) NOT NULL,
    "contract_ids" JSONB NOT NULL,
    "company_id" TEXT NOT NULL,
    "bundle_semantic_key_sha256" CHAR(64) NOT NULL,
    "complete_payload_sha256" CHAR(64) NOT NULL,
    "policy_set_sha256" CHAR(64) NOT NULL,
    "writer_registry_sha256" CHAR(64) NOT NULL,
    "scanner_input_sha256" CHAR(64) NOT NULL,
    "attempt_ordinal" INTEGER,
    "transaction_id" UUID,
    "anchor_set_sha256" CHAR(64),
    "sqlstate" VARCHAR(5),
    "domain_commit_state" VARCHAR(16) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "predecessor_event_sha256" CHAR(64),
    "event_sha256" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "durable_attempt_audit_event_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_article_org_sku" ON "Article"("organizationId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "uq_article_org_id" ON "Article"("organizationId", "id");

-- CreateIndex
CREATE INDEX "ix_sae_company_updated" ON "StockArticleEligibility"("companyId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sae_company_id" ON "StockArticleEligibility"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sae_company_article" ON "StockArticleEligibility"("companyId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sae_current_policy" ON "StockArticleEligibility"("companyId", "currentPolicyVersionId");

-- CreateIndex
CREATE INDEX "ix_sapv_company_effective" ON "StockArticlePolicyVersion"("companyId", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sapv_company_eligibility_id" ON "StockArticlePolicyVersion"("companyId", "eligibilityId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sapv_eligibility_version" ON "StockArticlePolicyVersion"("companyId", "eligibilityId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sapv_command" ON "StockArticlePolicyVersion"("companyId", "commandAcceptanceId");

-- CreateIndex
CREATE INDEX "ix_sd_company_active" ON "StockDeposit"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sd_company_id" ON "StockDeposit"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sd_company_code" ON "StockDeposit"("companyId", "code");

-- CreateIndex
CREATE INDEX "ix_sc_company_kind" ON "StockContext"("companyId", "kind");

-- CreateIndex
CREATE INDEX "ix_sc_source" ON "StockContext"("companyId", "sourceDomain", "sourceEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sc_company_id" ON "StockContext"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sc_deposit" ON "StockContext"("companyId", "depositId") WHERE ("kind" = 'DEPOSIT');

-- CreateIndex
CREATE UNIQUE INDEX "uq_slo_source_scope" ON "StockLotObservation"("companyId", "sourceDomain", "sourceEntityType", "sourceEntityId", "sourceScopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "uq_slo_company_article_id" ON "StockLotObservation"("companyId", "articleId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_slr_observation_pair" ON "StockLotReview"("companyId", "leftObservationId", "rightObservationId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sl_company_article_code" ON "StockLot"("companyId", "articleId", "normalizedLotCode");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sl_company_article_id" ON "StockLot"("companyId", "articleId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_siu_company_id" ON "StockIdentifiedUnit"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_siu_company_article_id" ON "StockIdentifiedUnit"("companyId", "articleId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_siucv_unit_version" ON "StockIdentifiedUnitConfigurationVersion"("companyId", "identifiedUnitId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "uq_siucv_company_unit_id" ON "StockIdentifiedUnitConfigurationVersion"("companyId", "identifiedUnitId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_siucc_company_unit" ON "StockIdentifiedUnitCurrentConfiguration"("companyId", "identifiedUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_siucc_company_configuration_version" ON "StockIdentifiedUnitCurrentConfiguration"("companyId", "configurationVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_siucc_company_internal_code" ON "StockIdentifiedUnitCurrentConfiguration"("companyId", "internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "uq_siucc_company_serial_number" ON "StockIdentifiedUnitCurrentConfiguration"("companyId", "serialNumber") WHERE ("serialNumber" IS NOT NULL);

-- CreateIndex
CREATE INDEX "ix_sp_company_context" ON "StockPosition"("companyId", "contextId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sp_company_id" ON "StockPosition"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sp_company_article_id" ON "StockPosition"("companyId", "articleId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sp_company_id_unit" ON "StockPosition"("companyId", "id", "identifiedUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sp_company_scope_key" ON "StockPosition"("companyId", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sp_none_scope" ON "StockPosition"("companyId", "articleId", "policyVersionId", "contextId") WHERE ("traceMode" = 'NONE');

-- CreateIndex
CREATE UNIQUE INDEX "uq_sp_lot_scope" ON "StockPosition"("companyId", "articleId", "policyVersionId", "contextId", "lotId") WHERE ("traceMode" = 'LOT');

-- CreateIndex
CREATE UNIQUE INDEX "uq_sp_identified_unit_scope" ON "StockPosition"("companyId", "articleId", "policyVersionId", "contextId", "identifiedUnitId") WHERE ("traceMode" = 'IDENTIFIED_UNIT');

-- CreateIndex
CREATE UNIQUE INDEX "uq_siuo_company_unit" ON "StockIdentifiedUnitOccupancy"("companyId", "identifiedUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_siuo_company_position" ON "StockIdentifiedUnitOccupancy"("companyId", "currentPositionId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sab_company_id" ON "StockActivationBoundary"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sab_company_id_position_cutoff" ON "StockActivationBoundary"("companyId", "id", "positionId", "cutoffAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sop_company_activation_boundary" ON "StockOpeningPosition"("companyId", "activationBoundaryId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sop_company_position_cutoff" ON "StockOpeningPosition"("companyId", "positionId", "cutoffAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sop_company_opening_evidence_line" ON "StockOpeningPosition"("companyId", "openingEvidenceLineId");

-- CreateIndex
CREATE INDEX "ix_se_source" ON "StockEvidence"("companyId", "sourceDomain", "sourceEntityType", "sourceEntityId", "sourceCheckpoint");

-- CreateIndex
CREATE INDEX "ix_se_company_time" ON "StockEvidence"("companyId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_se_company_id" ON "StockEvidence"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_se_command" ON "StockEvidence"("companyId", "commandAcceptanceId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_se_audit" ON "StockEvidence"("companyId", "auditEventId");

-- CreateIndex
CREATE INDEX "ix_sel_from" ON "StockEvidenceLine"("companyId", "fromPositionId");

-- CreateIndex
CREATE INDEX "ix_sel_to" ON "StockEvidenceLine"("companyId", "toPositionId");

-- CreateIndex
CREATE INDEX "ix_sel_article" ON "StockEvidenceLine"("companyId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sel_company_id" ON "StockEvidenceLine"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sel_evidence_line" ON "StockEvidenceLine"("evidenceId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sel_company_to_position_id" ON "StockEvidenceLine"("companyId", "toPositionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sel_company_article_from_position_id" ON "StockEvidenceLine"("companyId", "articleId", "fromPositionId", "id");

-- CreateIndex
CREATE INDEX "ix_sr_position" ON "StockReservation"("companyId", "positionId");

-- CreateIndex
CREATE INDEX "ix_sr_unit" ON "StockReservation"("companyId", "identifiedUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sr_company_id" ON "StockReservation"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sr_company_id_position" ON "StockReservation"("companyId", "id", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sr_source_scope" ON "StockReservation"("companyId", "sourceDomain", "sourceEntityType", "sourceEntityId", "sourceScopeKind", "sourceScopeKey", "positionId");

-- CreateIndex
CREATE INDEX "ix_sre_company_time" ON "StockReservationEvidence"("companyId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sre_company_id" ON "StockReservationEvidence"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sre_company_reservation_id" ON "StockReservationEvidence"("companyId", "reservationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sre_reservation_seq" ON "StockReservationEvidence"("reservationId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sre_command" ON "StockReservationEvidence"("companyId", "commandAcceptanceId");

-- CreateIndex
CREATE INDEX "ix_srp_company_status" ON "StockReservationProjection"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_srp_reservation" ON "StockReservationProjection"("companyId", "reservationId");

-- CreateIndex
CREATE INDEX "ix_spp_company_available" ON "StockPositionProjection"("companyId", "availableQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "uq_spp_position" ON "StockPositionProjection"("companyId", "positionId");

-- CreateIndex
CREATE INDEX "ix_scr_company_disposition" ON "StockCompatibilityReference"("companyId", "disposition");

-- CreateIndex
CREATE UNIQUE INDEX "uq_scr_source" ON "StockCompatibilityReference"("companyId", "sourceDomain", "sourceEntityType", "sourceEntityId", "sourceScopeKind", "sourceScopeKey");

-- CreateIndex
CREATE INDEX "ix_oca_result" ON "OperationalCommandAcceptance"("companyId", "resultEntityType", "resultEntityId");

-- CreateIndex
CREATE INDEX "ix_oca_intent" ON "OperationalCommandAcceptance"("companyId", "intentHash");

-- CreateIndex
CREATE UNIQUE INDEX "uq_oca_company_id" ON "OperationalCommandAcceptance"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_oca_semantic" ON "OperationalCommandAcceptance"("companyId", "domain", "sourceOperationId", "checkpoint", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "uq_oca_audit" ON "OperationalCommandAcceptance"("companyId", "auditEventId");

-- CreateIndex
CREATE INDEX "ix_oce_result" ON "OperationalCommandEffect"("companyId", "resultEntityType", "resultEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_oce_effect" ON "OperationalCommandEffect"("commandAcceptanceId", "effectKey");

-- CreateIndex
CREATE INDEX "ix_ocat_intent_time" ON "OperationalCommandAttempt"("companyId", "intentHash", "attemptedAt");

-- CreateIndex
CREATE INDEX "ix_ocat_expires" ON "OperationalCommandAttempt"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ocat_transport" ON "OperationalCommandAttempt"("companyId", "transportCorrelationId");

-- CreateIndex
CREATE INDEX "ix_pr_scope_time" ON "ProjectionReconciliation"("companyId", "kind", "scopeId", "comparedAt");

-- CreateIndex
CREATE INDEX "ix_pr_result_time" ON "ProjectionReconciliation"("companyId", "result", "comparedAt");

-- CreateIndex
CREATE INDEX "ix_cbf_company_updated" ON "cajas_box_formula"("company_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cbf_company_id" ON "cajas_box_formula"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cbf_company_id_article" ON "cajas_box_formula"("company_id", "id", "box_article_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cbf_company_article" ON "cajas_box_formula"("company_id", "box_article_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cbf_current_version" ON "cajas_box_formula"("company_id", "current_version_id");

-- CreateIndex
CREATE INDEX "ix_cfv_company_accepted" ON "cajas_formula_version"("company_id", "accepted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfv_company_id" ON "cajas_formula_version"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfv_company_id_article" ON "cajas_formula_version"("company_id", "id", "box_article_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfv_company_formula_id" ON "cajas_formula_version"("company_id", "formula_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfv_company_id_formula_article" ON "cajas_formula_version"("company_id", "id", "formula_id", "box_article_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfv_formula_number" ON "cajas_formula_version"("company_id", "formula_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfv_command" ON "cajas_formula_version"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_cfl_company_article" ON "cajas_formula_line"("company_id", "article_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfl_company_id" ON "cajas_formula_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfl_company_version_id" ON "cajas_formula_line"("company_id", "formula_version_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cfl_version_line" ON "cajas_formula_line"("formula_version_id", "line_number");

-- CreateIndex
CREATE INDEX "ix_ca_company_surgery_active" ON "cajas_assignment"("company_id", "surgery_id", "active_slot");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_company_id" ON "cajas_assignment"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_company_id_article" ON "cajas_assignment"("company_id", "id", "box_article_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_company_id_unit_article" ON "cajas_assignment"("company_id", "id", "box_identified_unit_id", "box_article_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_company_id_unit" ON "cajas_assignment"("company_id", "id", "box_identified_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_active_box" ON "cajas_assignment"("company_id", "box_identified_unit_id", "active_slot");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_start_command" ON "cajas_assignment"("company_id", "start_command_acceptance_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ca_end_command" ON "cajas_assignment"("company_id", "end_command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_cp_company_recontrol_updated" ON "cajas_preparation"("company_id", "requires_recontrol", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cp_company_id" ON "cajas_preparation"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cp_company_id_formula_version" ON "cajas_preparation"("company_id", "id", "formula_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cp_company_assignment_id" ON "cajas_preparation"("company_id", "assignment_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cp_assignment" ON "cajas_preparation"("company_id", "assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cp_latest_control" ON "cajas_preparation"("company_id", "latest_control_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cp_last_change" ON "cajas_preparation"("company_id", "last_accepted_change_id");

-- CreateIndex
CREATE INDEX "ix_cpl_company_active" ON "cajas_preparation_line"("company_id", "preparation_id", "is_active");

-- CreateIndex
CREATE INDEX "ix_cpl_company_position" ON "cajas_preparation_line"("company_id", "stock_position_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cpl_company_id" ON "cajas_preparation_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cpl_company_preparation_id" ON "cajas_preparation_line"("company_id", "preparation_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cpl_preparation_key" ON "cajas_preparation_line"("preparation_id", "line_key");

-- CreateIndex
CREATE INDEX "ix_crc_assignment_time" ON "cajas_reservation_correlation"("company_id", "assignment_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crc_company_assignment_id" ON "cajas_reservation_correlation"("company_id", "assignment_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_crc_company_semantic" ON "cajas_reservation_correlation"("company_id", "semantic_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cc_company_id" ON "cajas_control"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cc_company_assignment_id" ON "cajas_control"("company_id", "assignment_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cc_assignment_sequence" ON "cajas_control"("assignment_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cc_command" ON "cajas_control"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_ccl_company_article_position" ON "cajas_control_line"("company_id", "article_id", "stock_position_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccl_company_id" ON "cajas_control_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccl_company_assignment_id" ON "cajas_control_line"("company_id", "assignment_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccl_control_line" ON "cajas_control_line"("control_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchg_company_id" ON "cajas_composition_change"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchg_company_assignment_id" ON "cajas_composition_change"("company_id", "assignment_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchg_assignment_version" ON "cajas_composition_change"("assignment_id", "resulting_preparation_version");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchg_command" ON "cajas_composition_change"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchl_company_id" ON "cajas_composition_change_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cchl_change_line" ON "cajas_composition_change_line"("change_id", "line_number");

-- CreateIndex
CREATE INDEX "ix_cd_assignment_opened" ON "cajas_difference"("company_id", "assignment_id", "opened_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cd_company_id" ON "cajas_difference"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdr_company_id" ON "cajas_difference_resolution"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdr_difference_sequence" ON "cajas_difference_resolution"("difference_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdr_command" ON "cajas_difference_resolution"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE INDEX "ix_cdp_remito_kind" ON "cajas_dispatch"("company_id", "remito_id", "record_kind");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdp_company_id" ON "cajas_dispatch"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdp_owner_lineage" ON "cajas_dispatch"("company_id", "id", "remito_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdp_difference_owner" ON "cajas_dispatch"("company_id", "id", "assignment_id", "remito_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdp_assignment_sequence" ON "cajas_dispatch"("assignment_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdp_command" ON "cajas_dispatch"("company_id", "command_acceptance_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdl_company_id" ON "cajas_dispatch_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdl_dispatch_id" ON "cajas_dispatch_line"("company_id", "dispatch_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdl_dispatch_line" ON "cajas_dispatch_line"("dispatch_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdl_neutralizes" ON "cajas_dispatch_line"("company_id", "neutralizes_dispatch_line_id");

-- CreateIndex
CREATE INDEX "ix_cda_company_watermark" ON "cajas_dispatch_accounting"("company_id", "evidence_watermark");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cda_company_id" ON "cajas_dispatch_accounting"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cda_dispatch" ON "cajas_dispatch_accounting"("company_id", "dispatch_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cda_owner_lineage" ON "cajas_dispatch_accounting"("company_id", "id", "dispatch_id");

-- CreateIndex
CREATE INDEX "ix_cdla_pending" ON "cajas_dispatch_line_accounting"("company_id", "accounting_id", "pending_quantity");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdla_company_id" ON "cajas_dispatch_line_accounting"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdla_dispatch_line" ON "cajas_dispatch_line_accounting"("company_id", "dispatch_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdla_accounting_line" ON "cajas_dispatch_line_accounting"("accounting_id", "dispatch_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cdla_dispatch_line_owner" ON "cajas_dispatch_line_accounting"("company_id", "dispatch_id", "dispatch_line_id");

-- CreateIndex
CREATE INDEX "ix_cdis_dispatch_time" ON "cajas_disposition"("company_id", "dispatch_line_id", "accepted_at");

-- CreateIndex
CREATE INDEX "ix_cdis_company_article_position" ON "cajas_disposition"("company_id", "article_id", "stock_position_id");

-- CreateIndex
CREATE INDEX "ix_cdis_return_confirmation" ON "cajas_disposition"("return_confirmation_id");

-- CreateIndex
CREATE INDEX "ix_cdis_consumption_confirmation" ON "cajas_disposition"("consumption_confirmation_id");

-- CreateIndex
CREATE INDEX "ix_cdis_return_line" ON "cajas_disposition"("return_line_id");

-- CreateIndex
CREATE INDEX "ix_cdis_consumption_line" ON "cajas_disposition"("consumption_line_id");

-- CreateIndex
CREATE INDEX "ix_cdis_stock_evidence" ON "cajas_disposition"("stock_evidence_line_id");

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
CREATE INDEX "ix_crl_company_article_position" ON "cajas_return_line"("company_id", "article_id", "stock_position_id");

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
CREATE INDEX "ix_crp_received_article_position" ON "cajas_replacement_pair"("company_id", "received_article_id", "received_stock_position_id");

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
CREATE INDEX "ix_ccln_company_article_position" ON "cajas_consumption_line"("company_id", "article_id", "stock_position_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccln_company_id" ON "cajas_consumption_line"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccln_confirmation_line" ON "cajas_consumption_line"("consumption_confirmation_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccln_recognized_disposition" ON "cajas_consumption_line"("company_id", "dispatch_line_id", "recognized_return_disposition_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccln_disposition_owner" ON "cajas_consumption_line"("company_id", "consumption_confirmation_id", "dispatch_id", "id");

-- CreateIndex
CREATE INDEX "ix_ccp_company_condition" ON "cajas_condition_projection"("company_id", "condition");

-- CreateIndex
CREATE INDEX "ix_ccp_company_dispatch" ON "cajas_condition_projection"("company_id", "dispatch_eligible");

-- CreateIndex
CREATE INDEX "ix_ccp_company_reuse" ON "cajas_condition_projection"("company_id", "reuse_eligible");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccp_company_id" ON "cajas_condition_projection"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccp_box_identified_unit" ON "cajas_condition_projection"("company_id", "box_identified_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ccp_assignment" ON "cajas_condition_projection"("company_id", "assignment_id");

-- CreateIndex
CREATE INDEX "ix_daae_company_semantic_time" ON "durable_attempt_audit_event"("company_id", "bundle_semantic_key_sha256", "occurred_at");

-- CreateIndex
CREATE INDEX "ix_daae_kind_time" ON "durable_attempt_audit_event"("event_kind", "occurred_at");

-- CreateIndex
CREATE INDEX "ix_daae_occurred_at" ON "durable_attempt_audit_event"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daae_event_sha256" ON "durable_attempt_audit_event"("event_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daae_correlation_ordinal" ON "durable_attempt_audit_event"("correlation_id", "event_ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daae_correlation_event_sha256" ON "durable_attempt_audit_event"("correlation_id", "event_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daae_correlation_predecessor" ON "durable_attempt_audit_event"("correlation_id", "predecessor_event_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "uq_company_organization_id" ON "Company"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "fk_article_organization" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockArticleEligibility" ADD CONSTRAINT "fk_sae_company" FOREIGN KEY ("organizationId", "companyId") REFERENCES "Company"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockArticleEligibility" ADD CONSTRAINT "fk_sae_article" FOREIGN KEY ("organizationId", "articleId") REFERENCES "Article"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockArticleEligibility" ADD CONSTRAINT "fk_sae_current_policy" FOREIGN KEY ("companyId", "id", "currentPolicyVersionId") REFERENCES "StockArticlePolicyVersion"("companyId", "eligibilityId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockArticlePolicyVersion" ADD CONSTRAINT "fk_sapv_eligibility" FOREIGN KEY ("companyId", "eligibilityId") REFERENCES "StockArticleEligibility"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockArticlePolicyVersion" ADD CONSTRAINT "fk_sapv_previous" FOREIGN KEY ("companyId", "eligibilityId", "previousVersionId") REFERENCES "StockArticlePolicyVersion"("companyId", "eligibilityId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockArticlePolicyVersion" ADD CONSTRAINT "fk_sapv_accepted_by" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockArticlePolicyVersion" ADD CONSTRAINT "fk_sapv_command" FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDeposit" ADD CONSTRAINT "fk_sd_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockContext" ADD CONSTRAINT "fk_sc_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockContext" ADD CONSTRAINT "fk_sc_deposit" FOREIGN KEY ("companyId", "depositId") REFERENCES "StockDeposit"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotObservation" ADD CONSTRAINT "fk_slo_eligibility" FOREIGN KEY ("companyId", "articleId") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotObservation" ADD CONSTRAINT "fk_slo_corrects" FOREIGN KEY ("companyId", "articleId", "correctsObservationId") REFERENCES "StockLotObservation"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotObservation" ADD CONSTRAINT "fk_slo_observed_by" FOREIGN KEY ("observedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotObservation" ADD CONSTRAINT "fk_slo_command" FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotObservation" ADD CONSTRAINT "fk_slo_audit" FOREIGN KEY ("companyId", "auditEventId") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotReview" ADD CONSTRAINT "fk_slr_left_observation" FOREIGN KEY ("companyId", "articleId", "leftObservationId") REFERENCES "StockLotObservation"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotReview" ADD CONSTRAINT "fk_slr_right_observation" FOREIGN KEY ("companyId", "articleId", "rightObservationId") REFERENCES "StockLotObservation"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotReview" ADD CONSTRAINT "fk_slr_resolution_observation" FOREIGN KEY ("companyId", "articleId", "resolutionObservationId") REFERENCES "StockLotObservation"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotReview" ADD CONSTRAINT "fk_slr_canonical_lot" FOREIGN KEY ("companyId", "articleId", "canonicalLotId") REFERENCES "StockLot"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotReview" ADD CONSTRAINT "fk_slr_accepted_by" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotReview" ADD CONSTRAINT "fk_slr_command" FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotReview" ADD CONSTRAINT "fk_slr_audit" FOREIGN KEY ("companyId", "auditEventId") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "fk_sl_eligibility" FOREIGN KEY ("companyId", "articleId") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "fk_sl_primary_observation" FOREIGN KEY ("companyId", "articleId", "primaryObservationId") REFERENCES "StockLotObservation"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "fk_sl_accepted_by" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "fk_sl_command" FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnit" ADD CONSTRAINT "fk_siu_eligibility" FOREIGN KEY ("companyId", "articleId") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnitConfigurationVersion" ADD CONSTRAINT "fk_siucv_identified_unit" FOREIGN KEY ("companyId", "articleId", "identifiedUnitId") REFERENCES "StockIdentifiedUnit"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnitConfigurationVersion" ADD CONSTRAINT "fk_siucv_policy_version" FOREIGN KEY ("companyId", "eligibilityId", "policyVersionId") REFERENCES "StockArticlePolicyVersion"("companyId", "eligibilityId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnitConfigurationVersion" ADD CONSTRAINT "fk_siucv_previous" FOREIGN KEY ("companyId", "identifiedUnitId", "previousVersionId") REFERENCES "StockIdentifiedUnitConfigurationVersion"("companyId", "identifiedUnitId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnitConfigurationVersion" ADD CONSTRAINT "fk_siucv_accepted_by" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnitConfigurationVersion" ADD CONSTRAINT "fk_siucv_command" FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnitConfigurationVersion" ADD CONSTRAINT "fk_siucv_audit" FOREIGN KEY ("companyId", "auditEventId") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnitCurrentConfiguration" ADD CONSTRAINT "fk_siucc_identified_unit" FOREIGN KEY ("companyId", "identifiedUnitId") REFERENCES "StockIdentifiedUnit"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnitCurrentConfiguration" ADD CONSTRAINT "fk_siucc_configuration_version" FOREIGN KEY ("companyId", "identifiedUnitId", "configurationVersionId") REFERENCES "StockIdentifiedUnitConfigurationVersion"("companyId", "identifiedUnitId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPosition" ADD CONSTRAINT "fk_sp_eligibility_id" FOREIGN KEY ("companyId", "eligibilityId") REFERENCES "StockArticleEligibility"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPosition" ADD CONSTRAINT "fk_sp_eligibility_article" FOREIGN KEY ("companyId", "articleId") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPosition" ADD CONSTRAINT "fk_sp_policy_version" FOREIGN KEY ("companyId", "eligibilityId", "policyVersionId") REFERENCES "StockArticlePolicyVersion"("companyId", "eligibilityId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPosition" ADD CONSTRAINT "fk_sp_context" FOREIGN KEY ("companyId", "contextId") REFERENCES "StockContext"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPosition" ADD CONSTRAINT "fk_sp_lot" FOREIGN KEY ("companyId", "articleId", "lotId") REFERENCES "StockLot"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPosition" ADD CONSTRAINT "fk_sp_identified_unit" FOREIGN KEY ("companyId", "articleId", "identifiedUnitId") REFERENCES "StockIdentifiedUnit"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnitOccupancy" ADD CONSTRAINT "fk_siuo_identified_unit" FOREIGN KEY ("companyId", "identifiedUnitId") REFERENCES "StockIdentifiedUnit"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentifiedUnitOccupancy" ADD CONSTRAINT "fk_siuo_current_position" FOREIGN KEY ("companyId", "currentPositionId", "identifiedUnitId") REFERENCES "StockPosition"("companyId", "id", "identifiedUnitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockActivationBoundary" ADD CONSTRAINT "fk_sab_position" FOREIGN KEY ("companyId", "positionId") REFERENCES "StockPosition"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOpeningPosition" ADD CONSTRAINT "fk_sop_activation_boundary" FOREIGN KEY ("companyId", "activationBoundaryId", "positionId", "cutoffAt") REFERENCES "StockActivationBoundary"("companyId", "id", "positionId", "cutoffAt") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOpeningPosition" ADD CONSTRAINT "fk_sop_position" FOREIGN KEY ("companyId", "positionId") REFERENCES "StockPosition"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOpeningPosition" ADD CONSTRAINT "fk_sop_opening_evidence_line" FOREIGN KEY ("companyId", "positionId", "openingEvidenceLineId") REFERENCES "StockEvidenceLine"("companyId", "toPositionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidence" ADD CONSTRAINT "fk_se_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidence" ADD CONSTRAINT "fk_se_activation_boundary" FOREIGN KEY ("companyId", "activationBoundaryId") REFERENCES "StockActivationBoundary"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidence" ADD CONSTRAINT "fk_se_corrects" FOREIGN KEY ("companyId", "correctsEvidenceId") REFERENCES "StockEvidence"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidence" ADD CONSTRAINT "fk_se_reverses" FOREIGN KEY ("companyId", "reversesEvidenceId") REFERENCES "StockEvidence"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidence" ADD CONSTRAINT "fk_se_accepted_by" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidence" ADD CONSTRAINT "fk_se_command" FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidence" ADD CONSTRAINT "fk_se_audit" FOREIGN KEY ("companyId", "auditEventId") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidenceLine" ADD CONSTRAINT "fk_sel_evidence" FOREIGN KEY ("companyId", "evidenceId") REFERENCES "StockEvidence"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidenceLine" ADD CONSTRAINT "fk_sel_eligibility" FOREIGN KEY ("companyId", "articleId") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidenceLine" ADD CONSTRAINT "fk_sel_from_position" FOREIGN KEY ("companyId", "articleId", "fromPositionId") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidenceLine" ADD CONSTRAINT "fk_sel_to_position" FOREIGN KEY ("companyId", "articleId", "toPositionId") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEvidenceLine" ADD CONSTRAINT "fk_sel_reservation" FOREIGN KEY ("companyId", "reservationId") REFERENCES "StockReservation"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "fk_sr_position" FOREIGN KEY ("companyId", "positionId") REFERENCES "StockPosition"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "fk_sr_identified_position" FOREIGN KEY ("companyId", "positionId", "identifiedUnitId") REFERENCES "StockPosition"("companyId", "id", "identifiedUnitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationEvidence" ADD CONSTRAINT "fk_sre_reservation" FOREIGN KEY ("companyId", "reservationId") REFERENCES "StockReservation"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationEvidence" ADD CONSTRAINT "fk_sre_replaces" FOREIGN KEY ("companyId", "reservationId", "replacesEvidenceId") REFERENCES "StockReservationEvidence"("companyId", "reservationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationEvidence" ADD CONSTRAINT "fk_sre_accepted_by" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationEvidence" ADD CONSTRAINT "fk_sre_command" FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationEvidence" ADD CONSTRAINT "fk_sre_audit" FOREIGN KEY ("companyId", "auditEventId") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationProjection" ADD CONSTRAINT "fk_srp_reservation" FOREIGN KEY ("companyId", "reservationId") REFERENCES "StockReservation"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPositionProjection" ADD CONSTRAINT "fk_spp_position" FOREIGN KEY ("companyId", "positionId") REFERENCES "StockPosition"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCompatibilityReference" ADD CONSTRAINT "fk_scr_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCompatibilityReference" ADD CONSTRAINT "fk_scr_eligibility" FOREIGN KEY ("companyId", "articleId") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCompatibilityReference" ADD CONSTRAINT "fk_scr_position" FOREIGN KEY ("companyId", "articleId", "positionId") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCompatibilityReference" ADD CONSTRAINT "fk_scr_identified_unit" FOREIGN KEY ("companyId", "articleId", "identifiedUnitId") REFERENCES "StockIdentifiedUnit"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCompatibilityReference" ADD CONSTRAINT "fk_scr_accepted_by" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalCommandAcceptance" ADD CONSTRAINT "fk_oca_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalCommandAcceptance" ADD CONSTRAINT "fk_oca_accepted_by" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalCommandAcceptance" ADD CONSTRAINT "fk_oca_audit" FOREIGN KEY ("companyId", "auditEventId") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalCommandEffect" ADD CONSTRAINT "fk_oce_command" FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalCommandEffect" ADD CONSTRAINT "fk_oce_stock_evidence" FOREIGN KEY ("companyId", "stockEvidenceId") REFERENCES "StockEvidence"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalCommandEffect" ADD CONSTRAINT "fk_oce_stock_reservation_evidence" FOREIGN KEY ("companyId", "stockReservationEvidenceId") REFERENCES "StockReservationEvidence"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalCommandAttempt" ADD CONSTRAINT "fk_ocat_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalCommandAttempt" ADD CONSTRAINT "fk_ocat_command" FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalCommandAttempt" ADD CONSTRAINT "fk_ocat_actor" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalCommandAttempt" ADD CONSTRAINT "fk_ocat_audit" FOREIGN KEY ("companyId", "auditEventId") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectionReconciliation" ADD CONSTRAINT "fk_pr_company" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectionReconciliation" ADD CONSTRAINT "fk_pr_compared_by" FOREIGN KEY ("comparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectionReconciliation" ADD CONSTRAINT "fk_pr_repair_command" FOREIGN KEY ("companyId", "repairCommandAcceptanceId") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_box_formula" ADD CONSTRAINT "fk_cbf_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_box_formula" ADD CONSTRAINT "fk_cbf_eligibility" FOREIGN KEY ("company_id", "box_article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_box_formula" ADD CONSTRAINT "fk_cbf_current_version" FOREIGN KEY ("company_id", "id", "current_version_id") REFERENCES "cajas_formula_version"("company_id", "formula_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_version" ADD CONSTRAINT "fk_cfv_formula" FOREIGN KEY ("company_id", "formula_id", "box_article_id") REFERENCES "cajas_box_formula"("company_id", "id", "box_article_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_version" ADD CONSTRAINT "fk_cfv_previous" FOREIGN KEY ("company_id", "formula_id", "previous_version_id") REFERENCES "cajas_formula_version"("company_id", "formula_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_version" ADD CONSTRAINT "fk_cfv_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_version" ADD CONSTRAINT "fk_cfv_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_line" ADD CONSTRAINT "fk_cfl_version" FOREIGN KEY ("company_id", "formula_version_id") REFERENCES "cajas_formula_version"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_formula_line" ADD CONSTRAINT "fk_cfl_eligibility" FOREIGN KEY ("company_id", "article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_surgery" FOREIGN KEY ("company_id", "surgery_id") REFERENCES "Surgery"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_box_identified_unit" FOREIGN KEY ("company_id", "box_article_id", "box_identified_unit_id") REFERENCES "StockIdentifiedUnit"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_assigned_by" FOREIGN KEY ("assigned_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_ended_by" FOREIGN KEY ("ended_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_start_command" FOREIGN KEY ("company_id", "start_command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_assignment" ADD CONSTRAINT "fk_ca_end_command" FOREIGN KEY ("company_id", "end_command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation" ADD CONSTRAINT "fk_cp_assignment" FOREIGN KEY ("company_id", "assignment_id", "box_article_id") REFERENCES "cajas_assignment"("company_id", "id", "box_article_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation" ADD CONSTRAINT "fk_cp_formula_version" FOREIGN KEY ("company_id", "formula_version_id", "box_article_id") REFERENCES "cajas_formula_version"("company_id", "id", "box_article_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation" ADD CONSTRAINT "fk_cp_latest_control" FOREIGN KEY ("company_id", "assignment_id", "latest_control_id") REFERENCES "cajas_control"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation" ADD CONSTRAINT "fk_cp_last_change" FOREIGN KEY ("company_id", "assignment_id", "last_accepted_change_id") REFERENCES "cajas_composition_change"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation_line" ADD CONSTRAINT "fk_cpl_preparation" FOREIGN KEY ("company_id", "preparation_id", "formula_version_id") REFERENCES "cajas_preparation"("company_id", "id", "formula_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation_line" ADD CONSTRAINT "fk_cpl_expected_line" FOREIGN KEY ("company_id", "formula_version_id", "expected_formula_line_id") REFERENCES "cajas_formula_line"("company_id", "formula_version_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation_line" ADD CONSTRAINT "fk_cpl_article" FOREIGN KEY ("company_id", "article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_preparation_line" ADD CONSTRAINT "fk_cpl_stock_position" FOREIGN KEY ("company_id", "article_id", "stock_position_id") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_preparation" FOREIGN KEY ("company_id", "assignment_id", "preparation_id") REFERENCES "cajas_preparation"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_prep_line" FOREIGN KEY ("company_id", "preparation_id", "preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "preparation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_stock_position" FOREIGN KEY ("company_id", "stock_position_id") REFERENCES "StockPosition"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_stock_reservation" FOREIGN KEY ("company_id", "stock_reservation_id", "stock_position_id") REFERENCES "StockReservation"("companyId", "id", "positionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_stock_reservation_evidence" FOREIGN KEY ("company_id", "stock_reservation_id", "stock_reservation_evidence_id") REFERENCES "StockReservationEvidence"("companyId", "reservationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_reservation_correlation" ADD CONSTRAINT "fk_crc_replaces" FOREIGN KEY ("company_id", "assignment_id", "replaces_correlation_id") REFERENCES "cajas_reservation_correlation"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_assignment" FOREIGN KEY ("company_id", "assignment_id", "box_article_id") REFERENCES "cajas_assignment"("company_id", "id", "box_article_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_formula_version" FOREIGN KEY ("company_id", "formula_version_id", "box_article_id") REFERENCES "cajas_formula_version"("company_id", "id", "box_article_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_prior" FOREIGN KEY ("company_id", "assignment_id", "prior_control_id") REFERENCES "cajas_control"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control" ADD CONSTRAINT "fk_cc_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_control" FOREIGN KEY ("company_id", "assignment_id", "control_id") REFERENCES "cajas_control"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_source_preparation" FOREIGN KEY ("company_id", "assignment_id", "source_preparation_id") REFERENCES "cajas_preparation"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_source_line" FOREIGN KEY ("company_id", "source_preparation_id", "source_preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "preparation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_expected_line" FOREIGN KEY ("company_id", "expected_formula_line_id") REFERENCES "cajas_formula_line"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_article" FOREIGN KEY ("company_id", "article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_control_line" ADD CONSTRAINT "fk_ccl_stock_position" FOREIGN KEY ("company_id", "article_id", "stock_position_id") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change" ADD CONSTRAINT "fk_cchg_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change" ADD CONSTRAINT "fk_cchg_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change" ADD CONSTRAINT "fk_cchg_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_change" FOREIGN KEY ("company_id", "assignment_id", "change_id") REFERENCES "cajas_composition_change"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_preparation" FOREIGN KEY ("company_id", "assignment_id", "preparation_id") REFERENCES "cajas_preparation"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_prior_line" FOREIGN KEY ("company_id", "preparation_id", "prior_preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "preparation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_result_line" FOREIGN KEY ("company_id", "preparation_id", "resulting_preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "preparation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_prior_article" FOREIGN KEY ("company_id", "prior_article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_result_article" FOREIGN KEY ("company_id", "resulting_article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_prior_position" FOREIGN KEY ("company_id", "prior_article_id", "prior_stock_position_id") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_composition_change_line" ADD CONSTRAINT "fk_cchl_result_position" FOREIGN KEY ("company_id", "resulting_article_id", "resulting_stock_position_id") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_control_line" FOREIGN KEY ("company_id", "assignment_id", "control_line_id") REFERENCES "cajas_control_line"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_dispatch" FOREIGN KEY ("company_id", "origin_dispatch_id", "assignment_id", "origin_remito_id") REFERENCES "cajas_dispatch"("company_id", "id", "assignment_id", "remito_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_dispatch_line" FOREIGN KEY ("company_id", "origin_dispatch_id", "dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_return_line" FOREIGN KEY ("company_id", "return_confirmation_id", "origin_dispatch_id", "return_line_id") REFERENCES "cajas_return_line"("company_id", "return_confirmation_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference" ADD CONSTRAINT "fk_cd_opened_by" FOREIGN KEY ("opened_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference_resolution" ADD CONSTRAINT "fk_cdr_difference" FOREIGN KEY ("company_id", "difference_id") REFERENCES "cajas_difference"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference_resolution" ADD CONSTRAINT "fk_cdr_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_difference_resolution" ADD CONSTRAINT "fk_cdr_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_assignment" FOREIGN KEY ("company_id", "assignment_id") REFERENCES "cajas_assignment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_remito" FOREIGN KEY ("company_id", "remito_id") REFERENCES "Remito"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_control" FOREIGN KEY ("company_id", "assignment_id", "source_control_id") REFERENCES "cajas_control"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_corrects" FOREIGN KEY ("company_id", "corrects_dispatch_id", "assignment_id", "remito_id") REFERENCES "cajas_dispatch"("company_id", "id", "assignment_id", "remito_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch" ADD CONSTRAINT "fk_cdp_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_dispatch" FOREIGN KEY ("company_id", "dispatch_id", "assignment_id", "remito_id") REFERENCES "cajas_dispatch"("company_id", "id", "assignment_id", "remito_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_neutralizes" FOREIGN KEY ("company_id", "dispatch_id", "neutralizes_dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_remito_item" FOREIGN KEY ("company_id", "remito_id", "remito_item_id") REFERENCES "RemitoItem"("company_id", "remitoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_control_line" FOREIGN KEY ("company_id", "assignment_id", "source_control_line_id") REFERENCES "cajas_control_line"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_source_preparation" FOREIGN KEY ("company_id", "assignment_id", "source_preparation_id") REFERENCES "cajas_preparation"("company_id", "assignment_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_prep_line" FOREIGN KEY ("company_id", "source_preparation_id", "source_preparation_line_id") REFERENCES "cajas_preparation_line"("company_id", "preparation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_article" FOREIGN KEY ("company_id", "article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_stock_position" FOREIGN KEY ("company_id", "article_id", "stock_position_id") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line" ADD CONSTRAINT "fk_cdl_stock_evidence" FOREIGN KEY ("company_id", "article_id", "stock_position_id", "stock_evidence_line_id") REFERENCES "StockEvidenceLine"("companyId", "articleId", "fromPositionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_accounting" ADD CONSTRAINT "fk_cda_dispatch" FOREIGN KEY ("company_id", "dispatch_id") REFERENCES "cajas_dispatch"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line_accounting" ADD CONSTRAINT "fk_cdla_accounting" FOREIGN KEY ("company_id", "accounting_id", "dispatch_id") REFERENCES "cajas_dispatch_accounting"("company_id", "id", "dispatch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_dispatch_line_accounting" ADD CONSTRAINT "fk_cdla_dispatch_line" FOREIGN KEY ("company_id", "dispatch_id", "dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_dispatch_line" FOREIGN KEY ("company_id", "dispatch_id", "dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_article" FOREIGN KEY ("company_id", "article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_stock_position" FOREIGN KEY ("company_id", "article_id", "stock_position_id") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_return_confirmation" FOREIGN KEY ("company_id", "return_confirmation_id") REFERENCES "cajas_return_confirmation"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_consumption_confirmation" FOREIGN KEY ("company_id", "consumption_confirmation_id") REFERENCES "cajas_consumption_confirmation"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_return_line" FOREIGN KEY ("company_id", "return_confirmation_id", "dispatch_id", "return_line_id") REFERENCES "cajas_return_line"("company_id", "return_confirmation_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_consumption_line" FOREIGN KEY ("company_id", "consumption_confirmation_id", "dispatch_id", "consumption_line_id") REFERENCES "cajas_consumption_line"("company_id", "consumption_confirmation_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_neutralizes" FOREIGN KEY ("company_id", "dispatch_line_id", "neutralizes_disposition_id") REFERENCES "cajas_disposition"("company_id", "dispatch_line_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_stock_evidence_owner" FOREIGN KEY ("company_id", "stock_evidence_line_id") REFERENCES "StockEvidenceLine"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_stock_evidence_position_guard" FOREIGN KEY ("company_id", "article_id", "stock_position_id", "stock_evidence_line_id") REFERENCES "StockEvidenceLine"("companyId", "articleId", "fromPositionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_disposition" ADD CONSTRAINT "fk_cdis_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_dispatch" FOREIGN KEY ("company_id", "dispatch_id", "remito_id") REFERENCES "cajas_dispatch"("company_id", "id", "remito_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
CREATE UNIQUE INDEX IF NOT EXISTS "uq_devolucion_id_remito" ON "devolucion"("companyId", "id", "remitoId");

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_devolucion" FOREIGN KEY ("company_id", "devolucion_id", "remito_id") REFERENCES "devolucion"("companyId", "id", "remitoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_corrects" FOREIGN KEY ("company_id", "corrects_confirmation_id", "devolucion_id", "dispatch_id") REFERENCES "cajas_return_confirmation"("company_id", "id", "devolucion_id", "dispatch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_confirmation" ADD CONSTRAINT "fk_crcfn_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_confirmation" FOREIGN KEY ("company_id", "return_confirmation_id", "devolucion_id", "dispatch_id") REFERENCES "cajas_return_confirmation"("company_id", "id", "devolucion_id", "dispatch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_devolucion_item" FOREIGN KEY ("company_id", "devolucion_id", "devolucion_item_id") REFERENCES "devolucion_item"("company_id", "devolucionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_dispatch_line" FOREIGN KEY ("company_id", "dispatch_id", "dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_article" FOREIGN KEY ("company_id", "article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_return_line" ADD CONSTRAINT "fk_crl_stock_position" FOREIGN KEY ("company_id", "article_id", "stock_position_id") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_replacement_pair" ADD CONSTRAINT "fk_crp_return_line" FOREIGN KEY ("company_id", "return_confirmation_id", "dispatch_id", "return_line_id") REFERENCES "cajas_return_line"("company_id", "return_confirmation_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_replacement_pair" ADD CONSTRAINT "fk_crp_original_line" FOREIGN KEY ("company_id", "dispatch_id", "original_dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_replacement_pair" ADD CONSTRAINT "fk_crp_received_article" FOREIGN KEY ("company_id", "received_article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_replacement_pair" ADD CONSTRAINT "fk_crp_received_position" FOREIGN KEY ("company_id", "received_article_id", "received_stock_position_id") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_dispatch" FOREIGN KEY ("company_id", "dispatch_id", "remito_id") REFERENCES "cajas_dispatch"("company_id", "id", "remito_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
CREATE UNIQUE INDEX IF NOT EXISTS "uq_consumo_id_remito" ON "consumo"("companyId", "id", "remitoId");

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_consumo" FOREIGN KEY ("company_id", "consumo_id", "remito_id") REFERENCES "consumo"("companyId", "id", "remitoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_corrects" FOREIGN KEY ("company_id", "corrects_confirmation_id", "consumo_id", "dispatch_id") REFERENCES "cajas_consumption_confirmation"("company_id", "id", "consumo_id", "dispatch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_accepted_by" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_confirmation" ADD CONSTRAINT "fk_ccc_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_confirmation" FOREIGN KEY ("company_id", "consumption_confirmation_id", "consumo_id", "dispatch_id") REFERENCES "cajas_consumption_confirmation"("company_id", "id", "consumo_id", "dispatch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_consumo_item" FOREIGN KEY ("company_id", "consumo_id", "consumo_item_id") REFERENCES "consumo_item"("company_id", "consumoId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_dispatch_line" FOREIGN KEY ("company_id", "dispatch_id", "dispatch_line_id") REFERENCES "cajas_dispatch_line"("company_id", "dispatch_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_article" FOREIGN KEY ("company_id", "article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_stock_position" FOREIGN KEY ("company_id", "article_id", "stock_position_id") REFERENCES "StockPosition"("companyId", "articleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_consumption_line" ADD CONSTRAINT "fk_ccln_recognized_disp" FOREIGN KEY ("company_id", "dispatch_line_id", "recognized_return_disposition_id") REFERENCES "cajas_disposition"("company_id", "dispatch_line_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_condition_projection" ADD CONSTRAINT "fk_ccp_box_identified_unit" FOREIGN KEY ("company_id", "box_identified_unit_id") REFERENCES "StockIdentifiedUnit"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas_condition_projection" ADD CONSTRAINT "fk_ccp_assignment" FOREIGN KEY ("company_id", "assignment_id", "box_identified_unit_id") REFERENCES "cajas_assignment"("company_id", "id", "box_identified_unit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "durable_attempt_audit_event" ADD CONSTRAINT "fk_daae_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "durable_attempt_audit_event" ADD CONSTRAINT "fk_daae_predecessor" FOREIGN KEY ("correlation_id", "predecessor_event_sha256") REFERENCES "durable_attempt_audit_event"("correlation_id", "event_sha256") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DurableAttemptAuditEventV3Core: closed values, hash material, append-only chain.
ALTER TABLE "durable_attempt_audit_event"
  ADD CONSTRAINT "ck_daae_schema_version" CHECK ("schema_version" = 'C14-INSERT-DURABLE-ATTEMPT-AUDIT-EVENT-V3-CX08-CCT1'),
  ADD CONSTRAINT "ck_daae_policy_id" CHECK ("policy_id" = 'AUP-C14-DUAL-AUDIT-CX08-CCT1'),
  ADD CONSTRAINT "ck_daae_event_ordinal" CHECK ("event_ordinal" > 0),
  ADD CONSTRAINT "ck_daae_event_kind" CHECK ("event_kind" IN ('AUTH_DENIED','ATTEMPT_STARTED','ATTEMPT_ROLLED_BACK','RETRY_SCHEDULED','RETRY_EXHAUSTED','SUCCESS_COMMITTED','SUCCESS_RECOVERED','PROCESS_DEATH_UNKNOWN','ROLLED_BACK_RECOVERED','AUDIT_PENDING')),
  ADD CONSTRAINT "ck_daae_contract_ids" CHECK (jsonb_typeof("contract_ids") = 'array' AND jsonb_array_length("contract_ids") BETWEEN 1 AND 4),
  ADD CONSTRAINT "ck_daae_policy_set" CHECK ("policy_set_sha256" = '406b08dbaf852e9c9752a5ef8a7fdd52602cf0cd8977440b3f17358e541dd188'),
  ADD CONSTRAINT "ck_daae_writer_registry" CHECK ("writer_registry_sha256" = '52f8755d9bc2385f03dc0699c33e41f66e637e64adf6d8f5495d68ec6a4c2c47'),
  ADD CONSTRAINT "ck_daae_scanner_input" CHECK ("scanner_input_sha256" = '69b3458e5d1390ef8ae87f32a0202465276c209b449cd1fc0a24e9f930493d4a'),
  ADD CONSTRAINT "ck_daae_attempt_ordinal" CHECK ("attempt_ordinal" IS NULL OR "attempt_ordinal" BETWEEN 1 AND 3),
  ADD CONSTRAINT "ck_daae_sqlstate" CHECK ("sqlstate" IS NULL OR "sqlstate" IN ('55P03','40P01','40001')),
  ADD CONSTRAINT "ck_daae_commit_state" CHECK ("domain_commit_state" IN ('NOT_STARTED','ROLLED_BACK','COMMITTED','UNKNOWN')),
  ADD CONSTRAINT "ck_daae_event_id_hex" CHECK ("event_id" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "ck_daae_hashes_hex" CHECK (
    "bundle_semantic_key_sha256" ~ '^[0-9a-f]{64}$' AND
    "complete_payload_sha256" ~ '^[0-9a-f]{64}$' AND
    "policy_set_sha256" ~ '^[0-9a-f]{64}$' AND
    "writer_registry_sha256" ~ '^[0-9a-f]{64}$' AND
    "scanner_input_sha256" ~ '^[0-9a-f]{64}$' AND
    ("anchor_set_sha256" IS NULL OR "anchor_set_sha256" ~ '^[0-9a-f]{64}$') AND
    ("predecessor_event_sha256" IS NULL OR "predecessor_event_sha256" ~ '^[0-9a-f]{64}$') AND
    "event_sha256" ~ '^[0-9a-f]{64}$'
  ),
  ADD CONSTRAINT "ck_daae_chain_root" CHECK (("event_ordinal" = 1) = ("predecessor_event_sha256" IS NULL));

CREATE FUNCTION "public"."fn_durable_attempt_audit_event_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'durable attempt audit events are append-only';
END;
$c14fn$;

CREATE TRIGGER "trg_durable_attempt_audit_event_append_only"
BEFORE UPDATE OR DELETE ON "public"."durable_attempt_audit_event"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_durable_attempt_audit_event_append_only"();

-- Canonical C14 object stream follows in globalOrdinal dependency order (1..169).
ALTER TABLE "public"."StockLotObservation"
ADD CONSTRAINT "ck_slo_correction_shape"
CHECK (
  (
    ("recordKind" = 'ORIGINAL' AND "correctsObservationId" IS NULL)
    OR
    (
      "recordKind" = 'CORRECTION'
      AND "correctsObservationId" IS NOT NULL
      AND "correctsObservationId" <> "id"
    )
  ) IS TRUE
);
ALTER TABLE "public"."StockLotReview"
ADD CONSTRAINT "ck_slr_observation_order"
CHECK (
  ("leftObservationId" COLLATE "C" < "rightObservationId" COLLATE "C") IS TRUE
);
ALTER TABLE "public"."StockLotReview"
ADD CONSTRAINT "ck_slr_result_shape"
CHECK (
  (
    (
      "result" = 'MATCH'
      AND "resolutionObservationId" IS NULL
      AND "canonicalLotId" IS NOT NULL
    )
    OR
    (
      "result" = 'DISCREPANCY'
      AND "resolutionObservationId" IS NULL
      AND "canonicalLotId" IS NULL
    )
    OR
    (
      "result" = 'RESOLVED_EQUIVALENT'
      AND "resolutionObservationId" IS NOT NULL
    )
    OR
    (
      "result" = 'REJECTED'
      AND "resolutionObservationId" IS NULL
      AND "canonicalLotId" IS NULL
    )
  ) IS TRUE
);
CREATE FUNCTION "public"."fn_stock_lot_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_lot_append_only' ||
             ';function=fn_stock_lot_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_LOT_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_lot_observation_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_lot_observation_append_only' ||
             ';function=fn_stock_lot_observation_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_LOT_OBSERVATION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_lot_review_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_lot_review_append_only' ||
             ';function=fn_stock_lot_review_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_LOT_REVIEW_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_lot_review_coherence"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_coherent boolean;
BEGIN
  SELECT
    EXISTS (
      SELECT 1
      FROM "public"."StockLotObservation" AS "leftObservation"
      WHERE "leftObservation"."companyId" = NEW."companyId"
        AND "leftObservation"."articleId" = NEW."articleId"
        AND "leftObservation"."id" = NEW."leftObservationId"
        AND "leftObservation"."normalizedLotCode" = NEW."normalizedLotCode"
    )
    AND EXISTS (
      SELECT 1
      FROM "public"."StockLotObservation" AS "rightObservation"
      WHERE "rightObservation"."companyId" = NEW."companyId"
        AND "rightObservation"."articleId" = NEW."articleId"
        AND "rightObservation"."id" = NEW."rightObservationId"
        AND "rightObservation"."normalizedLotCode" = NEW."normalizedLotCode"
    )
    AND (
      NEW."resolutionObservationId" IS NULL
      OR EXISTS (
        SELECT 1
        FROM "public"."StockLotObservation" AS "resolutionObservation"
        WHERE "resolutionObservation"."companyId" = NEW."companyId"
          AND "resolutionObservation"."articleId" = NEW."articleId"
          AND "resolutionObservation"."id" = NEW."resolutionObservationId"
          AND "resolutionObservation"."normalizedLotCode" = NEW."normalizedLotCode"
      )
    )
    AND (
      NEW."canonicalLotId" IS NULL
      OR EXISTS (
        SELECT 1
        FROM "public"."StockLot" AS "canonicalLot"
        WHERE "canonicalLot"."companyId" = NEW."companyId"
          AND "canonicalLot"."articleId" = NEW."articleId"
          AND "canonicalLot"."id" = NEW."canonicalLotId"
          AND "canonicalLot"."normalizedLotCode" = NEW."normalizedLotCode"
      )
    )
  INTO v_coherent;

  IF v_coherent IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_stock_lot_review_coherence' ||
               ';function=fn_stock_lot_review_coherence' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_LOT_REVIEW_COHERENCE',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE TRIGGER "trg_stock_lot_append_only"
BEFORE UPDATE OR DELETE ON "public"."StockLot"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_lot_append_only"();
CREATE TRIGGER "trg_stock_lot_observation_append_only"
BEFORE UPDATE OR DELETE ON "public"."StockLotObservation"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_lot_observation_append_only"();
CREATE TRIGGER "trg_stock_lot_review_append_only"
BEFORE UPDATE OR DELETE ON "public"."StockLotReview"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_lot_review_append_only"();
CREATE TRIGGER "trg_stock_lot_review_coherence"
BEFORE INSERT OR UPDATE ON "public"."StockLotReview"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_lot_review_coherence"();
ALTER TABLE "public"."StockIdentifiedUnitConfigurationVersion"
ADD CONSTRAINT "ck_siucv_version_positive"
CHECK (
  ("versionNumber" > 0) IS TRUE
);
ALTER TABLE "public"."StockIdentifiedUnitCurrentConfiguration"
ADD CONSTRAINT "ck_siucc_version_positive"
CHECK (
  ("version" > 0) IS TRUE
);
CREATE FUNCTION "public"."fn_stock_unit_config_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_unit_config_append_only' ||
             ';function=fn_stock_unit_config_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_UNIT_CONFIG_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_unit_config_current_guard"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  SELECT
    EXISTS (
      SELECT 1
      FROM "public"."StockIdentifiedUnitConfigurationVersion" AS "targetVersion"
      LEFT JOIN "public"."StockIdentifiedUnitConfigurationVersion" AS "priorVersion"
        ON TG_OP = 'UPDATE'
       AND "priorVersion"."companyId" = OLD."companyId"
       AND "priorVersion"."identifiedUnitId" = OLD."identifiedUnitId"
       AND "priorVersion"."id" = OLD."configurationVersionId"
      WHERE "targetVersion"."companyId" = NEW."companyId"
        AND "targetVersion"."identifiedUnitId" = NEW."identifiedUnitId"
        AND "targetVersion"."id" = NEW."configurationVersionId"
        AND "targetVersion"."internalCode" = NEW."internalCode"
        AND "targetVersion"."serialNumber" IS NOT DISTINCT FROM NEW."serialNumber"
        AND (
          (
            TG_OP = 'INSERT'
            AND "targetVersion"."versionNumber" = 1
            AND "targetVersion"."previousVersionId" IS NULL
            AND NEW."version" = 1
          )
          OR
          (
            TG_OP = 'UPDATE'
            AND NEW."companyId" = OLD."companyId"
            AND NEW."identifiedUnitId" = OLD."identifiedUnitId"
            AND "targetVersion"."previousVersionId" = OLD."configurationVersionId"
            AND "targetVersion"."versionNumber" = "priorVersion"."versionNumber" + 1
            AND NEW."version" = OLD."version" + 1
          )
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."StockReservation" AS "reservation"
      JOIN "public"."StockPosition" AS "reservationPosition"
        ON "reservationPosition"."companyId" = "reservation"."companyId"
       AND "reservationPosition"."id" = "reservation"."positionId"
      WHERE "reservation"."companyId" = NEW."companyId"
        AND (
          "reservation"."identifiedUnitId" = NEW."identifiedUnitId"
          OR "reservationPosition"."identifiedUnitId" = NEW."identifiedUnitId"
        )
        AND (
          SELECT COALESCE(
            SUM(
              CASE
                WHEN "reservationEvent"."kind" IN ('RESERVE', 'REPLACE')
                 AND NOT EXISTS (
                   SELECT 1
                   FROM "public"."StockReservationEvidence" AS "replacementEvent"
                   WHERE "replacementEvent"."companyId" = "reservationEvent"."companyId"
                     AND "replacementEvent"."reservationId" = "reservationEvent"."reservationId"
                     AND "replacementEvent"."replacesEvidenceId" = "reservationEvent"."id"
                 )
                  THEN "reservationEvent"."quantity"
                WHEN "reservationEvent"."kind" IN ('RELEASE', 'CANCEL', 'APPLY_TO_DISPATCH')
                  THEN -"reservationEvent"."quantity"
                ELSE 0
              END
            ),
            0
          )
          FROM "public"."StockReservationEvidence" AS "reservationEvent"
          WHERE "reservationEvent"."companyId" = "reservation"."companyId"
            AND "reservationEvent"."reservationId" = "reservation"."id"
        ) > 0
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."cajas_assignment" AS "assignment"
      WHERE "assignment"."company_id" = NEW."companyId"
        AND "assignment"."box_identified_unit_id" = NEW."identifiedUnitId"
        AND "assignment"."active_slot" = 1
        AND "assignment"."ended_at" IS NULL
        AND "assignment"."ended_by_id" IS NULL
        AND "assignment"."end_cause" IS NULL
        AND "assignment"."end_command_acceptance_id" IS NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."StockIdentifiedUnitOccupancy" AS "occupancy"
      JOIN "public"."StockPosition" AS "position"
        ON "position"."companyId" = "occupancy"."companyId"
       AND "position"."id" = "occupancy"."currentPositionId"
       AND "position"."identifiedUnitId" = "occupancy"."identifiedUnitId"
      JOIN "public"."StockContext" AS "context"
        ON "context"."companyId" = "position"."companyId"
       AND "context"."id" = "position"."contextId"
      WHERE "occupancy"."companyId" = NEW."companyId"
        AND "occupancy"."identifiedUnitId" = NEW."identifiedUnitId"
        AND "context"."kind" = 'EXTERNAL_CUSTODY'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."cajas_disposition" AS "disposition"
      JOIN "public"."cajas_dispatch_line" AS "dispatchLine"
        ON "dispatchLine"."company_id" = "disposition"."company_id"
       AND "dispatchLine"."dispatch_id" = "disposition"."dispatch_id"
       AND "dispatchLine"."id" = "disposition"."dispatch_line_id"
      JOIN "public"."StockPosition" AS "dispositionPosition"
        ON "dispositionPosition"."companyId" = "dispatchLine"."company_id"
       AND "dispositionPosition"."id" = "dispatchLine"."stock_position_id"
      WHERE "disposition"."company_id" = NEW."companyId"
        AND "dispositionPosition"."identifiedUnitId" = NEW."identifiedUnitId"
        AND "disposition"."kind" = 'UNDER_REVIEW'
      GROUP BY "disposition"."company_id", "disposition"."dispatch_line_id"
      HAVING SUM("disposition"."accounting_sign" * "disposition"."quantity") > 0
    )
  INTO v_valid;

  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_stock_unit_config_current_guard' ||
               ';function=fn_stock_unit_config_current_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_UNIT_CONFIG_CURRENT_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE TRIGGER "trg_stock_unit_config_append_only"
BEFORE UPDATE OR DELETE ON "public"."StockIdentifiedUnitConfigurationVersion"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_unit_config_append_only"();
CREATE TRIGGER "trg_stock_unit_config_current_guard"
BEFORE INSERT OR UPDATE ON "public"."StockIdentifiedUnitCurrentConfiguration"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_unit_config_current_guard"();
ALTER TABLE "public"."StockPosition"
  ADD CONSTRAINT "ck_sp_trace_axis"
  CHECK ((("traceMode" = 'NONE' AND "lotId" IS NULL AND "identifiedUnitId" IS NULL) OR ("traceMode" = 'LOT' AND "lotId" IS NOT NULL AND "identifiedUnitId" IS NULL) OR ("traceMode" = 'IDENTIFIED_UNIT' AND "lotId" IS NULL AND "identifiedUnitId" IS NOT NULL)) IS TRUE);
ALTER TABLE "public"."StockPosition"
  ADD CONSTRAINT "ck_sp_scale_range"
  CHECK (("quantityScale" BETWEEN 0 AND 4) IS TRUE);
ALTER TABLE "public"."StockIdentifiedUnitOccupancy"
  ADD CONSTRAINT "ck_siuo_version_positive"
  CHECK (("version" > 0) IS TRUE);
CREATE FUNCTION "public"."fn_stock_position_parent_guard"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "public"."StockArticleEligibility" AS "eligibility"
    JOIN "public"."StockArticlePolicyVersion" AS "policy"
      ON "policy"."companyId" = "eligibility"."companyId"
     AND "policy"."eligibilityId" = "eligibility"."id"
     AND "policy"."id" = NEW."policyVersionId"
    JOIN "public"."StockContext" AS "context"
      ON "context"."companyId" = NEW."companyId"
     AND "context"."id" = NEW."contextId"
    LEFT JOIN "public"."StockLot" AS "lot"
      ON "lot"."companyId" = NEW."companyId"
     AND "lot"."articleId" = NEW."articleId"
     AND "lot"."id" = NEW."lotId"
    LEFT JOIN "public"."StockIdentifiedUnit" AS "unit"
      ON "unit"."companyId" = NEW."companyId"
     AND "unit"."articleId" = NEW."articleId"
     AND "unit"."id" = NEW."identifiedUnitId"
    WHERE "eligibility"."companyId" = NEW."companyId"
      AND "eligibility"."articleId" = NEW."articleId"
      AND "eligibility"."id" = NEW."eligibilityId"
      AND "eligibility"."currentPolicyVersionId" = NEW."policyVersionId"
      AND "policy"."eligible" IS TRUE
      AND "policy"."traceMode" = NEW."traceMode"
      AND "policy"."stockUnit" = NEW."stockUnit"
      AND "policy"."quantityScale" = NEW."quantityScale"
      AND ((NEW."traceMode" = 'NONE' AND NEW."lotId" IS NULL AND NEW."identifiedUnitId" IS NULL) OR (NEW."traceMode" = 'LOT' AND NEW."lotId" IS NOT NULL AND NEW."identifiedUnitId" IS NULL AND "lot"."id" IS NOT NULL) OR (NEW."traceMode" = 'IDENTIFIED_UNIT' AND NEW."lotId" IS NULL AND NEW."identifiedUnitId" IS NOT NULL AND "unit"."id" IS NOT NULL))
  ) INTO v_valid;
  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_position_parent_guard;function=fn_stock_position_parent_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_POSITION_PARENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_identified_unit_exclusivity"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  SELECT (NEW."evidenceWatermark" ~ '^cx04:[0-9a-f]{64}$') AND EXISTS (
    SELECT 1 FROM "public"."StockPosition" AS "position"
    WHERE "position"."companyId" = NEW."companyId"
      AND "position"."id" = NEW."currentPositionId"
      AND "position"."identifiedUnitId" = NEW."identifiedUnitId"
  ) AND ((TG_OP = 'INSERT' AND NEW."version" = 1) OR (TG_OP = 'UPDATE' AND NEW."id" = OLD."id" AND NEW."companyId" = OLD."companyId" AND NEW."identifiedUnitId" = OLD."identifiedUnitId" AND NEW."createdAt" = OLD."createdAt" AND ((NEW."currentPositionId" = OLD."currentPositionId" AND convert_to(NEW."evidenceWatermark", 'UTF8') = convert_to(OLD."evidenceWatermark", 'UTF8') AND NEW."version" = OLD."version") OR (NEW."currentPositionId" <> OLD."currentPositionId" AND convert_to(NEW."evidenceWatermark", 'UTF8') <> convert_to(OLD."evidenceWatermark", 'UTF8') AND OLD."version" < 2147483647 AND NEW."version" = OLD."version" + 1 AND NEW."version" > 0)))) INTO v_valid;
  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_identified_unit_exclusivity;function=fn_stock_identified_unit_exclusivity;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_IDENTIFIED_UNIT_EXCLUSIVITY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_position_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_position_append_only' ||
             ';function=fn_stock_position_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_POSITION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE TRIGGER "trg_stock_position_parent_guard"
BEFORE INSERT OR UPDATE ON "public"."StockPosition"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_position_parent_guard"();
CREATE TRIGGER "trg_stock_identified_unit_exclusivity"
BEFORE INSERT OR UPDATE ON "public"."StockIdentifiedUnitOccupancy"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_identified_unit_exclusivity"();
CREATE TRIGGER "trg_stock_position_append_only"
BEFORE UPDATE OR DELETE ON "public"."StockPosition"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_position_append_only"();
ALTER TABLE "public"."StockActivationBoundary"
ADD CONSTRAINT "ck_sab_valid_window"
CHECK (
  (("validUntil" IS NULL) OR ("validUntil" > "cutoffAt")) IS TRUE
);
ALTER TABLE "public"."StockOpeningPosition"
ADD CONSTRAINT "ck_sop_quantity_nonnegative"
CHECK (
  ("quantity" >= 0) IS TRUE
);
ALTER TABLE "public"."StockOpeningPosition"
ADD CONSTRAINT "ck_sop_scale_snapshot"
CHECK (
  (("scaleSnapshot" >= 0) AND ("scaleSnapshot" <= 4)) IS TRUE
);
ALTER TABLE "public"."OperationalCommandEffect"
ADD CONSTRAINT "ck_oce_target_shape"
CHECK (
  (
    (
      "targetKind" = 'DOMAIN_ONLY'
      AND "stockEvidenceId" IS NULL
      AND "stockReservationEvidenceId" IS NULL
    )
    OR
    (
      "targetKind" = 'STOCK_EVIDENCE'
      AND "stockEvidenceId" IS NOT NULL
      AND "stockReservationEvidenceId" IS NULL
    )
    OR
    (
      "targetKind" = 'STOCK_RESERVATION_EVIDENCE'
      AND "stockEvidenceId" IS NULL
      AND "stockReservationEvidenceId" IS NOT NULL
    )
  ) IS TRUE
);
ALTER TABLE "public"."OperationalCommandAttempt"
ADD CONSTRAINT "ck_ocat_outcome"
CHECK (
  (
    (
      "outcome" = 'ACCEPTED'
      AND "commandAcceptanceId" IS NOT NULL
      AND "auditEventId" IS NOT NULL
    )
    OR
    (
      "outcome" = 'DENIED'
      AND "commandAcceptanceId" IS NULL
      AND "auditEventId" IS NOT NULL
    )
    OR
    (
      "outcome" = 'VALIDATION_FAILED'
      AND "commandAcceptanceId" IS NULL
      AND "auditEventId" IS NOT NULL
    )
    OR
    (
      "outcome" = 'CONFLICT'
      AND "commandAcceptanceId" IS NULL
      AND "auditEventId" IS NOT NULL
    )
    OR
    (
      "outcome" = 'FAILED'
      AND "commandAcceptanceId" IS NULL
      AND "auditEventId" IS NOT NULL
    )
    OR
    (
      "outcome" = 'UNKNOWN'
      AND "commandAcceptanceId" IS NULL
      AND "auditEventId" IS NOT NULL
    )
  ) IS TRUE
);
CREATE FUNCTION "public"."fn_operational_acceptance_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_operational_acceptance_append_only' ||
             ';function=fn_operational_acceptance_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_OPERATIONAL_ACCEPTANCE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_operational_effect_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_operational_effect_append_only' ||
             ';function=fn_operational_effect_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_OPERATIONAL_EFFECT_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_operational_semantic_intent_guard"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_coherent boolean;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1
    FROM "public"."OperationalCommandAcceptance" AS "acceptedCommand"
    WHERE "acceptedCommand"."companyId" = NEW."companyId"
      AND "acceptedCommand"."domain" = NEW."domain"
      AND "acceptedCommand"."sourceOperationId" = NEW."sourceOperationId"
      AND "acceptedCommand"."checkpoint" = NEW."checkpoint"
      AND "acceptedCommand"."scopeKey" = NEW."scopeKey"
      AND "acceptedCommand"."id" <> NEW."id"
      AND (
        "acceptedCommand"."intentHash" IS DISTINCT FROM NEW."intentHash"
        OR "acceptedCommand"."resultEntityType" IS DISTINCT FROM NEW."resultEntityType"
        OR "acceptedCommand"."resultEntityId" IS DISTINCT FROM NEW."resultEntityId"
      )
  )
  INTO v_coherent;

  IF v_coherent IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_operational_semantic_intent_guard' ||
               ';function=fn_operational_semantic_intent_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_OPERATIONAL_SEMANTIC_INTENT_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE TRIGGER "trg_operational_acceptance_append_only"
BEFORE UPDATE OR DELETE ON "public"."OperationalCommandAcceptance"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_operational_acceptance_append_only"();
CREATE TRIGGER "trg_operational_effect_append_only"
BEFORE UPDATE OR DELETE ON "public"."OperationalCommandEffect"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_operational_effect_append_only"();
CREATE TRIGGER "trg_operational_semantic_intent_guard"
BEFORE INSERT OR UPDATE ON "public"."OperationalCommandAcceptance"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_operational_semantic_intent_guard"();
ALTER TABLE "public"."StockEvidence"
ADD CONSTRAINT "ck_se_record_links"
CHECK (
  (
    (
      "recordKind" = 'ORIGINAL'
      AND "kind" IN ('OPENING', 'RECEIPT', 'DISPATCH', 'RETURN', 'CONSUMPTION', 'COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
      AND "correctsEvidenceId" IS NULL
      AND "reversesEvidenceId" IS NULL
    )
    OR
    (
      "recordKind" = 'CORRECTION'
      AND "kind" = 'CORRECTION'
      AND "correctsEvidenceId" IS NOT NULL
      AND "correctsEvidenceId" <> "id"
      AND "reversesEvidenceId" IS NULL
    )
    OR
    (
      "recordKind" = 'REVERSAL'
      AND "kind" = 'REVERSAL'
      AND "correctsEvidenceId" IS NULL
      AND "reversesEvidenceId" IS NOT NULL
      AND "reversesEvidenceId" <> "id"
    )
  ) IS TRUE
);
ALTER TABLE "public"."StockEvidenceLine"
ADD CONSTRAINT "ck_sel_qty_positive"
CHECK (
  ("quantity" > 0::numeric) IS TRUE
);
ALTER TABLE "public"."StockEvidenceLine"
ADD CONSTRAINT "ck_sel_scale"
CHECK (
  ("scaleSnapshot" BETWEEN 0 AND 4) IS TRUE
);
ALTER TABLE "public"."StockEvidenceLine"
ADD CONSTRAINT "ck_sel_position_shape"
CHECK (
  (
    ("fromPositionId" IS NOT NULL AND "toPositionId" IS NULL)
    OR
    ("fromPositionId" IS NULL AND "toPositionId" IS NOT NULL)
  ) IS TRUE
);
CREATE FUNCTION "public"."fn_stock_evidence_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_evidence_append_only' ||
             ';function=fn_stock_evidence_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_EVIDENCE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_evidence_line_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_evidence_line_append_only' ||
             ';function=fn_stock_evidence_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_EVIDENCE_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_evidence_line_parent_guard"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "public"."StockEvidence" AS "evidence"
    LEFT JOIN "public"."StockEvidence" AS "baseEvidence"
      ON "baseEvidence"."companyId" = "evidence"."companyId"
     AND "baseEvidence"."id" = COALESCE("evidence"."correctsEvidenceId", "evidence"."reversesEvidenceId")
    LEFT JOIN "public"."StockEvidenceLine" AS "baseLine"
      ON "baseLine"."companyId" = "baseEvidence"."companyId"
     AND "baseLine"."evidenceId" = "baseEvidence"."id"
     AND "baseLine"."lineNumber" = NEW."lineNumber"
    WHERE "evidence"."companyId" = NEW."companyId"
      AND "evidence"."id" = NEW."evidenceId"
      AND (
        (
          "evidence"."recordKind" = 'ORIGINAL'
          AND "evidence"."kind" IN ('OPENING', 'RECEIPT', 'DISPATCH', 'RETURN', 'CONSUMPTION', 'COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
          AND "baseEvidence"."id" IS NULL
        )
        OR
        (
          "evidence"."recordKind" IN ('CORRECTION', 'REVERSAL')
          AND "baseEvidence"."id" IS NOT NULL
          AND "baseEvidence"."id" <> "evidence"."id"
          AND "baseEvidence"."recordKind" = 'ORIGINAL'
          AND "baseEvidence"."kind" IN ('OPENING', 'RECEIPT', 'DISPATCH', 'RETURN', 'CONSUMPTION', 'COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
          AND "baseEvidence"."correctsEvidenceId" IS NULL
          AND "baseEvidence"."reversesEvidenceId" IS NULL
          AND ("evidence"."sourceDomain", "evidence"."sourceEntityType", "evidence"."sourceEntityId") = ("baseEvidence"."sourceDomain", "baseEvidence"."sourceEntityType", "baseEvidence"."sourceEntityId")
          AND "evidence"."activationBoundaryId" IS NOT DISTINCT FROM "baseEvidence"."activationBoundaryId"
          AND "evidence"."acceptedAt" >= "baseEvidence"."acceptedAt"
          AND "baseLine"."id" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "public"."StockEvidence" AS "otherAdjustment"
            WHERE "otherAdjustment"."companyId" = "baseEvidence"."companyId"
              AND "otherAdjustment"."id" <> "evidence"."id"
              AND (
                "otherAdjustment"."correctsEvidenceId" = "baseEvidence"."id" OR "otherAdjustment"."reversesEvidenceId" = "baseEvidence"."id"
              )
          )
        )
      )
      AND (
        (
          COALESCE("baseEvidence"."kind", "evidence"."kind") IN ('OPENING', 'RECEIPT', 'RETURN')
          AND NEW."fromPositionId" IS NULL
          AND NEW."toPositionId" IS NOT NULL
        )
        OR
        (
          COALESCE("baseEvidence"."kind", "evidence"."kind") IN ('DISPATCH', 'CONSUMPTION', 'COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
          AND NEW."fromPositionId" IS NOT NULL
          AND NEW."toPositionId" IS NULL
        )
        OR
        (
          "evidence"."recordKind" = 'REVERSAL'
          AND "baseEvidence"."kind" IN ('OPENING', 'RECEIPT', 'RETURN')
          AND NEW."fromPositionId" = "baseLine"."toPositionId"
          AND NEW."toPositionId" IS NULL
        )
        OR
        (
          "evidence"."recordKind" = 'REVERSAL'
          AND "baseEvidence"."kind" IN ('DISPATCH', 'CONSUMPTION')
          AND NEW."fromPositionId" IS NULL
          AND NEW."toPositionId" = "baseLine"."fromPositionId"
        )
      )
      AND (
        COALESCE("baseEvidence"."kind", "evidence"."kind") <> 'OPENING'
        OR EXISTS (
          SELECT 1
          FROM "public"."StockActivationBoundary" AS "boundary"
          WHERE "boundary"."companyId" = "evidence"."companyId"
            AND "boundary"."id" = COALESCE("baseEvidence"."activationBoundaryId", "evidence"."activationBoundaryId")
            AND "boundary"."positionId" = COALESCE("baseLine"."toPositionId", NEW."toPositionId")
            AND "evidence"."acceptedAt" >= "boundary"."cutoffAt"
        )
      )
      AND (
        COALESCE("baseEvidence"."kind", "evidence"."kind") = 'OPENING'
        OR "evidence"."activationBoundaryId" IS NULL
      )
      AND (
        "evidence"."recordKind" = 'ORIGINAL'
        OR (
          (NEW."articleId", NEW."stockUnit", NEW."scaleSnapshot") = ("baseLine"."articleId", "baseLine"."stockUnit", "baseLine"."scaleSnapshot")
          AND (NEW."reservationId", NEW."sourceLineId") IS NOT DISTINCT FROM ("baseLine"."reservationId", "baseLine"."sourceLineId")
          AND (
            (
              "evidence"."recordKind" = 'CORRECTION'
              AND NEW."fromPositionId" IS NOT DISTINCT FROM "baseLine"."fromPositionId"
              AND NEW."toPositionId" IS NOT DISTINCT FROM "baseLine"."toPositionId"
            )
            OR
            (
              "evidence"."recordKind" = 'REVERSAL'
              AND NEW."quantity" = "baseLine"."quantity"
              AND NEW."lotCodeSnapshot" IS NOT DISTINCT FROM "baseLine"."lotCodeSnapshot"
              AND NEW."expirationDateSnapshot" IS NOT DISTINCT FROM "baseLine"."expirationDateSnapshot"
              AND NEW."serialNumberSnapshot" IS NOT DISTINCT FROM "baseLine"."serialNumberSnapshot"
              AND NEW."identifiedCodeSnapshot" IS NOT DISTINCT FROM "baseLine"."identifiedCodeSnapshot"
              AND (
                (
                  "baseEvidence"."kind" IN ('OPENING', 'RECEIPT', 'RETURN')
                  AND NEW."fromPositionId" = "baseLine"."toPositionId"
                  AND NEW."toPositionId" IS NULL
                )
                OR
                (
                  "baseEvidence"."kind" IN ('DISPATCH', 'CONSUMPTION')
                  AND NEW."fromPositionId" IS NULL
                  AND NEW."toPositionId" = "baseLine"."fromPositionId"
                )
                OR
                (
                  "baseEvidence"."kind" IN ('COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
                  AND NEW."fromPositionId" = "baseLine"."fromPositionId"
                  AND NEW."toPositionId" IS NULL
                )
              )
            )
          )
        )
      )
      AND (
        "evidence"."recordKind" = 'REVERSAL'
        OR EXISTS (
          SELECT 1
          FROM "public"."StockPosition" AS "tracePosition"
          LEFT JOIN "public"."StockLot" AS "traceLot"
            ON "traceLot"."companyId" = "tracePosition"."companyId"
           AND "traceLot"."articleId" = "tracePosition"."articleId"
           AND "traceLot"."id" = "tracePosition"."lotId"
          LEFT JOIN "public"."StockLotObservation" AS "traceObservation"
            ON "traceObservation"."companyId" = "traceLot"."companyId"
           AND "traceObservation"."articleId" = "traceLot"."articleId"
           AND "traceObservation"."id" = "traceLot"."primaryObservationId"
          LEFT JOIN "public"."StockIdentifiedUnitCurrentConfiguration" AS "traceConfiguration"
            ON "traceConfiguration"."companyId" = "tracePosition"."companyId"
           AND "traceConfiguration"."identifiedUnitId" = "tracePosition"."identifiedUnitId"
          WHERE "tracePosition"."companyId" = NEW."companyId"
            AND "tracePosition"."articleId" = NEW."articleId"
            AND "tracePosition"."id" = COALESCE(NEW."fromPositionId", NEW."toPositionId")
            AND (
              (
                "tracePosition"."traceMode" = 'NONE'
                AND NEW."lotCodeSnapshot" IS NULL
                AND NEW."expirationDateSnapshot" IS NULL
                AND NEW."serialNumberSnapshot" IS NULL
                AND NEW."identifiedCodeSnapshot" IS NULL
              )
              OR
              (
                "tracePosition"."traceMode" = 'LOT'
                AND NEW."lotCodeSnapshot" = "traceObservation"."displayLotCode"
                AND NEW."expirationDateSnapshot" IS NOT DISTINCT FROM "traceObservation"."expirationDate"
                AND NEW."serialNumberSnapshot" IS NULL
                AND NEW."identifiedCodeSnapshot" IS NULL
              )
              OR
              (
                "tracePosition"."traceMode" = 'IDENTIFIED_UNIT'
                AND NEW."lotCodeSnapshot" IS NULL
                AND NEW."expirationDateSnapshot" IS NULL
                AND NEW."serialNumberSnapshot" IS NOT DISTINCT FROM "traceConfiguration"."serialNumber"
                AND NEW."identifiedCodeSnapshot" = "traceConfiguration"."internalCode"
              )
            )
        )
      )
      AND (
        NEW."reservationId" IS NULL
        OR (
          COALESCE("baseEvidence"."kind", "evidence"."kind") = 'DISPATCH'
          AND EXISTS (
            SELECT 1
            FROM "public"."StockReservation" AS "reservation"
            WHERE "reservation"."companyId" = NEW."companyId"
              AND "reservation"."id" = NEW."reservationId"
              AND "reservation"."positionId" = COALESCE("baseLine"."fromPositionId", NEW."fromPositionId")
          )
        )
      )
  ) INTO v_valid;

  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_stock_evidence_line_parent_guard' ||
               ';function=fn_stock_evidence_line_parent_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_EVIDENCE_LINE_PARENT_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_quantity_scale_guard"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  SELECT
    NOT EXISTS (
      SELECT 1
      FROM (VALUES (NEW."fromPositionId"), (NEW."toPositionId")) AS "referencedPosition"("positionId")
      WHERE "referencedPosition"."positionId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "public"."StockPosition" AS "position"
          WHERE ("position"."companyId", "position"."id") = (NEW."companyId", "referencedPosition"."positionId")
            AND ("position"."articleId", "position"."stockUnit", "position"."quantityScale") = (NEW."articleId", NEW."stockUnit", NEW."scaleSnapshot")
        )
    )
    AND (
      NEW."reservationId" IS NULL
      OR EXISTS (
        SELECT 1
        FROM "public"."StockReservation" AS "reservation"
        JOIN "public"."StockPosition" AS "reservedPosition"
          ON "reservedPosition"."companyId" = "reservation"."companyId"
         AND "reservedPosition"."id" = "reservation"."positionId"
        WHERE ("reservation"."companyId", "reservation"."id") = (NEW."companyId", NEW."reservationId")
          AND ("reservedPosition"."articleId", "reservedPosition"."stockUnit", "reservedPosition"."quantityScale") = (NEW."articleId", NEW."stockUnit", NEW."scaleSnapshot")
      )
    )
  INTO v_valid;

  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_stock_quantity_scale_guard' ||
               ';function=fn_stock_quantity_scale_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_QUANTITY_SCALE_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE TRIGGER "trg_stock_evidence_append_only"
BEFORE UPDATE OR DELETE ON "public"."StockEvidence"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_evidence_append_only"();
CREATE TRIGGER "trg_stock_evidence_line_append_only"
BEFORE UPDATE OR DELETE ON "public"."StockEvidenceLine"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_evidence_line_append_only"();
CREATE TRIGGER "trg_stock_evidence_line_parent_guard"
BEFORE INSERT OR UPDATE ON "public"."StockEvidenceLine"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_evidence_line_parent_guard"();
CREATE TRIGGER "trg_stock_quantity_scale_guard"
BEFORE INSERT OR UPDATE ON "public"."StockEvidenceLine"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_quantity_scale_guard"();
ALTER TABLE "public"."StockReservation"
ADD CONSTRAINT "ck_sr_scope_key"
CHECK (
  (
    ("sourceScopeKind" = 'HEADER'
     AND "sourceLineId" IS NULL
     AND "sourceScopeKey" = 'H:' || "sourceEntityId")
    OR
    ("sourceScopeKind" = 'LINE'
     AND "sourceLineId" IS NOT NULL
     AND "sourceScopeKey" = 'L:' || "sourceLineId")
  ) IS TRUE
);
ALTER TABLE "public"."StockReservationEvidence"
ADD CONSTRAINT "ck_sre_qty_positive"
CHECK (("quantity" > 0::numeric) IS TRUE);
ALTER TABLE "public"."StockReservationEvidence"
ADD CONSTRAINT "ck_sre_scale"
CHECK (("scaleSnapshot" BETWEEN 0 AND 4) IS TRUE);
CREATE FUNCTION "public"."fn_stock_reservation_append_only"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_reservation_append_only' ||
             ';function=fn_stock_reservation_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_RESERVATION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_reservation_evidence_append_only"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_reservation_evidence_append_only' ||
             ';function=fn_stock_reservation_evidence_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_RESERVATION_EVIDENCE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_reservation_position_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE
  v_coherent boolean;
BEGIN
  SELECT
    EXISTS (
      SELECT 1
      FROM "public"."StockPosition" AS "position"
      WHERE "position"."companyId" = NEW."companyId"
        AND "position"."id" = NEW."positionId"
        AND (NEW."identifiedUnitId" IS NULL
             OR "position"."identifiedUnitId" = NEW."identifiedUnitId")
    )
    AND (
      NEW."identifiedUnitId" IS NULL
      OR EXISTS (
        SELECT 1 FROM "public"."StockIdentifiedUnitOccupancy" AS "occupancy"
        WHERE "occupancy"."companyId" = NEW."companyId"
          AND "occupancy"."identifiedUnitId" = NEW."identifiedUnitId"
          AND "occupancy"."currentPositionId" = NEW."positionId")
    )
  INTO v_coherent;

  IF v_coherent IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_stock_reservation_position_guard' ||
               ';function=fn_stock_reservation_position_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_RESERVATION_POSITION_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_reservation_ceiling"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE
  v_article_id text; v_position_unit text; v_identified_unit_id text;
  v_position_scale smallint; v_event_count bigint; v_max_sequence integer;
  v_live_before numeric(24,4); v_live_after numeric(24,4);
  v_ceiling numeric(24,4); v_scope_live_after numeric(24,4);
  v_other_unit_live boolean; v_valid boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;

  SELECT "position"."articleId", "position"."stockUnit",
         "position"."quantityScale", "reservation"."identifiedUnitId"
  INTO v_article_id, v_position_unit, v_position_scale, v_identified_unit_id
  FROM "public"."StockReservation" AS "reservation"
  JOIN "public"."StockPosition" AS "position"
    ON "position"."companyId" = "reservation"."companyId"
   AND "position"."id" = "reservation"."positionId"
  WHERE "reservation"."companyId" = NEW."companyId"
    AND "reservation"."id" = NEW."reservationId";

  SELECT COUNT(*), COALESCE(MAX("event"."sequence"), 0),
    COALESCE(SUM(CASE WHEN "event"."kind" IN ('RESERVE', 'REPLACE')
                      THEN "event"."quantity" ELSE -"event"."quantity" END), 0::numeric)
  INTO v_event_count, v_max_sequence, v_live_before
  FROM "public"."StockReservationEvidence" AS "event"
  WHERE "event"."companyId" = NEW."companyId"
    AND "event"."reservationId" = NEW."reservationId"
    AND ("event"."kind" NOT IN ('RESERVE', 'REPLACE') OR NOT EXISTS (
      SELECT 1 FROM "public"."StockReservationEvidence" AS "replacement"
      WHERE "replacement"."companyId" = "event"."companyId"
        AND "replacement"."reservationId" = "event"."reservationId"
        AND "replacement"."kind" = 'REPLACE'
        AND "replacement"."replacesEvidenceId" = "event"."id"));

  v_live_after := CASE NEW."kind"
    WHEN 'RESERVE' THEN v_live_before + NEW."quantity"
    WHEN 'REPLACE' THEN v_live_before + NEW."quantity" - (
      SELECT "target"."quantity" FROM "public"."StockReservationEvidence" AS "target"
      WHERE "target"."companyId" = NEW."companyId"
        AND "target"."reservationId" = NEW."reservationId"
        AND "target"."id" = NEW."replacesEvidenceId"
        AND "target"."kind" IN ('RESERVE', 'REPLACE')
        AND "target"."id" <> NEW."id"
        AND NOT EXISTS (
          SELECT 1 FROM "public"."StockReservationEvidence" AS "replacement"
          WHERE "replacement"."companyId" = "target"."companyId"
            AND "replacement"."reservationId" = "target"."reservationId"
            AND "replacement"."kind" = 'REPLACE'
            AND "replacement"."replacesEvidenceId" = "target"."id"))
    ELSE v_live_before - NEW."quantity" END;

  WITH "base" AS (
    SELECT "evidence"."id", "evidence"."kind", "evidence"."sourceDomain",
           "evidence"."sourceEntityType", "evidence"."sourceEntityId", "evidence"."acceptedAt"
    FROM "public"."StockEvidence" AS "evidence"
    WHERE "evidence"."companyId" = NEW."companyId"
      AND "evidence"."recordKind" = 'ORIGINAL'
      AND "evidence"."kind" IN ('OPENING', 'RECEIPT', 'DISPATCH', 'RETURN',
        'CONSUMPTION', 'COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
      AND "evidence"."correctsEvidenceId" IS NULL
      AND "evidence"."reversesEvidenceId" IS NULL
      AND "evidence"."acceptedAt" <= NEW."acceptedAt"
  ),
  "traceLine" AS (
    SELECT "line".*
    FROM "public"."StockEvidenceLine" AS "line"
    JOIN "public"."StockEvidence" AS "evidence"
      ON "evidence"."companyId" = "line"."companyId"
     AND "evidence"."id" = "line"."evidenceId"
    JOIN "public"."StockPosition" AS "tracePosition"
      ON "tracePosition"."companyId" = "line"."companyId"
     AND "tracePosition"."articleId" = "line"."articleId"
     AND "tracePosition"."id" = COALESCE("line"."fromPositionId", "line"."toPositionId")
    LEFT JOIN "public"."StockLot" AS "traceLot"
      ON "traceLot"."companyId" = "tracePosition"."companyId"
     AND "traceLot"."articleId" = "tracePosition"."articleId"
     AND "traceLot"."id" = "tracePosition"."lotId"
    LEFT JOIN "public"."StockLotObservation" AS "traceObservation"
      ON "traceObservation"."companyId" = "traceLot"."companyId"
     AND "traceObservation"."articleId" = "traceLot"."articleId"
     AND "traceObservation"."id" = "traceLot"."primaryObservationId"
    LEFT JOIN LATERAL (
      SELECT "configuration"."internalCode", "configuration"."serialNumber"
      FROM "public"."StockIdentifiedUnitConfigurationVersion" AS "configuration"
      WHERE "configuration"."companyId" = "tracePosition"."companyId"
        AND "configuration"."identifiedUnitId" = "tracePosition"."identifiedUnitId"
        AND "configuration"."effectiveAt" <= "evidence"."acceptedAt"
        AND "configuration"."acceptedAt" <= "evidence"."acceptedAt"
      ORDER BY "configuration"."effectiveAt" DESC, "configuration"."versionNumber" DESC,
               convert_to("configuration"."id", 'UTF8') DESC
      LIMIT 1
    ) AS "traceConfiguration" ON TRUE
    WHERE "evidence"."recordKind" IN ('ORIGINAL', 'CORRECTION')
      AND (
        ("tracePosition"."traceMode" = 'NONE'
         AND "tracePosition"."lotId" IS NULL AND "tracePosition"."identifiedUnitId" IS NULL
         AND "line"."lotCodeSnapshot" IS NULL AND "line"."expirationDateSnapshot" IS NULL
         AND "line"."serialNumberSnapshot" IS NULL AND "line"."identifiedCodeSnapshot" IS NULL)
        OR
        ("tracePosition"."traceMode" = 'LOT'
         AND "tracePosition"."lotId" IS NOT NULL AND "tracePosition"."identifiedUnitId" IS NULL
         AND "traceLot"."acceptedAt" <= "evidence"."acceptedAt"
         AND "traceObservation"."observedAt" <= "evidence"."acceptedAt"
         AND "line"."lotCodeSnapshot" = "traceObservation"."displayLotCode"
         AND "line"."expirationDateSnapshot" IS NOT DISTINCT FROM "traceObservation"."expirationDate"
         AND "line"."serialNumberSnapshot" IS NULL AND "line"."identifiedCodeSnapshot" IS NULL)
        OR
        ("tracePosition"."traceMode" = 'IDENTIFIED_UNIT'
         AND "tracePosition"."lotId" IS NULL AND "tracePosition"."identifiedUnitId" IS NOT NULL
         AND "traceConfiguration"."internalCode" IS NOT NULL
         AND "line"."lotCodeSnapshot" IS NULL AND "line"."expirationDateSnapshot" IS NULL
         AND "line"."serialNumberSnapshot" IS NOT DISTINCT FROM "traceConfiguration"."serialNumber"
         AND "line"."identifiedCodeSnapshot" = "traceConfiguration"."internalCode"))
  ),
  "candidateAdjustment" AS (
    SELECT "base"."id" AS "baseId", "base"."kind" AS "baseKind",
           "adjustment"."id" AS "adjustmentId", "adjustment"."recordKind" AS "adjustmentRecordKind"
    FROM "base"
    JOIN "public"."StockEvidence" AS "adjustment"
      ON "adjustment"."companyId" = NEW."companyId"
     AND "adjustment"."acceptedAt" BETWEEN "base"."acceptedAt" AND NEW."acceptedAt"
     AND (("adjustment"."recordKind" = 'CORRECTION' AND "adjustment"."kind" = 'CORRECTION'
           AND "adjustment"."correctsEvidenceId" = "base"."id"
           AND "adjustment"."reversesEvidenceId" IS NULL)
       OR ("adjustment"."recordKind" = 'REVERSAL' AND "adjustment"."kind" = 'REVERSAL'
           AND "adjustment"."reversesEvidenceId" = "base"."id"
           AND "adjustment"."correctsEvidenceId" IS NULL))
     AND ("adjustment"."sourceDomain", "adjustment"."sourceEntityType", "adjustment"."sourceEntityId")
       = ("base"."sourceDomain", "base"."sourceEntityType", "base"."sourceEntityId")
    WHERE (SELECT COUNT(*) FROM "public"."StockEvidence" AS "child"
           WHERE "child"."companyId" = NEW."companyId"
             AND "child"."acceptedAt" <= NEW."acceptedAt"
             AND ("child"."correctsEvidenceId" = "base"."id"
               OR "child"."reversesEvidenceId" = "base"."id")) = 1
  ),
  "validAdjustment" AS (
    SELECT "candidate".* FROM "candidateAdjustment" AS "candidate"
    WHERE EXISTS (SELECT 1 FROM "public"."StockEvidenceLine" AS "baseLine"
                  WHERE "baseLine"."companyId" = NEW."companyId"
                    AND "baseLine"."evidenceId" = "candidate"."baseId")
      AND (SELECT COUNT(*) FROM "public"."StockEvidenceLine" AS "baseLine"
           WHERE "baseLine"."companyId" = NEW."companyId"
             AND "baseLine"."evidenceId" = "candidate"."baseId")
        = (SELECT COUNT(*) FROM "public"."StockEvidenceLine" AS "adjustmentLine"
           WHERE "adjustmentLine"."companyId" = NEW."companyId"
             AND "adjustmentLine"."evidenceId" = "candidate"."adjustmentId")
      AND NOT EXISTS (
        SELECT 1 FROM "public"."StockEvidenceLine" AS "baseLine"
        WHERE "baseLine"."companyId" = NEW."companyId"
          AND "baseLine"."evidenceId" = "candidate"."baseId"
          AND NOT EXISTS (
            SELECT 1 FROM "public"."StockEvidenceLine" AS "adjustmentLine"
            WHERE "adjustmentLine"."companyId" = NEW."companyId"
              AND "adjustmentLine"."evidenceId" = "candidate"."adjustmentId"
              AND "adjustmentLine"."lineNumber" = "baseLine"."lineNumber"
              AND ("adjustmentLine"."articleId", "adjustmentLine"."reservationId",
                   "adjustmentLine"."stockUnit", "adjustmentLine"."scaleSnapshot",
                   "adjustmentLine"."sourceLineId") IS NOT DISTINCT FROM
                  ("baseLine"."articleId", "baseLine"."reservationId", "baseLine"."stockUnit",
                   "baseLine"."scaleSnapshot", "baseLine"."sourceLineId")
              AND (("candidate"."adjustmentRecordKind" = 'CORRECTION'
                    AND "adjustmentLine"."fromPositionId" IS NOT DISTINCT FROM "baseLine"."fromPositionId"
                    AND "adjustmentLine"."toPositionId" IS NOT DISTINCT FROM "baseLine"."toPositionId"
                    AND EXISTS (SELECT 1 FROM "traceLine" AS "trace"
                                WHERE "trace"."id" = "adjustmentLine"."id"))
                OR ("candidate"."adjustmentRecordKind" = 'REVERSAL'
                    AND "adjustmentLine"."quantity" = "baseLine"."quantity"
                    AND ("adjustmentLine"."lotCodeSnapshot", "adjustmentLine"."expirationDateSnapshot",
                         "adjustmentLine"."serialNumberSnapshot", "adjustmentLine"."identifiedCodeSnapshot")
                      IS NOT DISTINCT FROM
                        ("baseLine"."lotCodeSnapshot", "baseLine"."expirationDateSnapshot",
                         "baseLine"."serialNumberSnapshot", "baseLine"."identifiedCodeSnapshot")
                    AND (("candidate"."baseKind" IN ('OPENING', 'RECEIPT', 'RETURN')
                          AND "adjustmentLine"."fromPositionId" = "baseLine"."toPositionId"
                          AND "adjustmentLine"."toPositionId" IS NULL)
                      OR ("candidate"."baseKind" IN ('DISPATCH', 'CONSUMPTION')
                          AND "adjustmentLine"."fromPositionId" IS NULL
                          AND "adjustmentLine"."toPositionId" = "baseLine"."fromPositionId")
                      OR ("candidate"."baseKind" IN ('COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
                          AND "adjustmentLine"."fromPositionId" = "baseLine"."fromPositionId"
                          AND "adjustmentLine"."toPositionId" IS NULL))))))
  ),
  "effectiveLine" AS (
    SELECT "base"."kind", "line"."articleId", "line"."fromPositionId", "line"."toPositionId",
           "line"."quantity", "line"."stockUnit", "line"."scaleSnapshot"
    FROM "base" JOIN "traceLine" AS "line" ON "line"."companyId" = NEW."companyId"
      AND "line"."evidenceId" = "base"."id"
    WHERE NOT EXISTS (SELECT 1 FROM "validAdjustment" AS "adjustment"
                      WHERE "adjustment"."baseId" = "base"."id")
    UNION ALL
    SELECT "base"."kind", "line"."articleId", "line"."fromPositionId", "line"."toPositionId",
           "line"."quantity", "line"."stockUnit", "line"."scaleSnapshot"
    FROM "base" JOIN "validAdjustment" AS "correction"
      ON "correction"."baseId" = "base"."id"
     AND "correction"."adjustmentRecordKind" = 'CORRECTION'
    JOIN "traceLine" AS "line" ON "line"."companyId" = NEW."companyId"
      AND "line"."evidenceId" = "correction"."adjustmentId"
  )
  SELECT COALESCE(SUM(CASE
      WHEN "kind" IN ('OPENING', 'RECEIPT', 'RETURN')
       AND "toPositionId" = "reservation"."positionId" THEN "quantity"
      WHEN "kind" IN ('DISPATCH', 'CONSUMPTION')
       AND "fromPositionId" = "reservation"."positionId" THEN -"quantity"
      ELSE 0::numeric END), 0::numeric)
    - COALESCE(SUM(CASE
      WHEN "kind" = 'REVIEW_HOLD' AND "fromPositionId" = "reservation"."positionId" THEN "quantity"
      WHEN "kind" = 'REVIEW_RELEASE' AND "fromPositionId" = "reservation"."positionId" THEN -"quantity"
      ELSE 0::numeric END), 0::numeric)
  INTO v_ceiling
  FROM "effectiveLine" CROSS JOIN "public"."StockReservation" AS "reservation"
  WHERE "reservation"."companyId" = NEW."companyId"
    AND "reservation"."id" = NEW."reservationId"
    AND "articleId" = v_article_id AND "stockUnit" = v_position_unit
    AND "scaleSnapshot" = v_position_scale;

  WITH "liveByReservation" AS (
    SELECT "reservation"."id",
      COALESCE(SUM(CASE WHEN "event"."kind" IN ('RESERVE', 'REPLACE')
                        THEN "event"."quantity" ELSE -"event"."quantity" END) FILTER (
        WHERE "event"."kind" NOT IN ('RESERVE', 'REPLACE') OR NOT EXISTS (
          SELECT 1 FROM "public"."StockReservationEvidence" AS "replacement"
          WHERE "replacement"."companyId" = "event"."companyId"
            AND "replacement"."reservationId" = "event"."reservationId"
            AND "replacement"."kind" = 'REPLACE'
            AND "replacement"."replacesEvidenceId" = "event"."id")), 0::numeric) AS "live"
    FROM "public"."StockReservation" AS "reservation"
    LEFT JOIN "public"."StockReservationEvidence" AS "event"
      ON "event"."companyId" = "reservation"."companyId"
     AND "event"."reservationId" = "reservation"."id"
    WHERE "reservation"."companyId" = NEW."companyId"
      AND "reservation"."positionId" = (SELECT "currentReservation"."positionId"
        FROM "public"."StockReservation" AS "currentReservation"
        WHERE "currentReservation"."companyId" = NEW."companyId"
          AND "currentReservation"."id" = NEW."reservationId")
    GROUP BY "reservation"."id"
  )
  SELECT COALESCE(SUM("live"), 0::numeric) - v_live_before + v_live_after,
    COALESCE(BOOL_OR(v_identified_unit_id IS NOT NULL
      AND "reservation"."identifiedUnitId" = v_identified_unit_id
      AND "id" <> NEW."reservationId" AND "live" > 0::numeric), false)
  INTO v_scope_live_after, v_other_unit_live
  FROM "liveByReservation" JOIN "public"."StockReservation" AS "reservation"
    ON "reservation"."companyId" = NEW."companyId"
   AND "reservation"."id" = "liveByReservation"."id";

  v_valid := v_article_id IS NOT NULL
    AND NEW."sequence" = v_max_sequence + 1
    AND NEW."stockUnit" = v_position_unit AND NEW."scaleSnapshot" = v_position_scale
    AND ((v_event_count = 0 AND NEW."kind" = 'RESERVE')
      OR (v_event_count > 0 AND v_live_before > 0::numeric))
    AND ((NEW."kind" = 'REPLACE' AND NEW."replacesEvidenceId" IS NOT NULL)
      OR (NEW."kind" <> 'REPLACE' AND NEW."replacesEvidenceId" IS NULL))
    AND (NEW."kind" <> 'CANCEL' OR NEW."quantity" = v_live_before)
    AND v_live_after >= 0::numeric AND v_ceiling >= 0::numeric
    AND v_scope_live_after >= 0::numeric AND v_scope_live_after <= v_ceiling
    AND NOT COALESCE(v_other_unit_live, false);

  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514', MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA || ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP || ';invariant=function:fn_stock_reservation_ceiling' ||
               ';function=fn_stock_reservation_ceiling;branch=R0001' ||
               ';family=AGGREGATE_OR_SERIALIZATION_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_RESERVATION_CEILING',
      CONSTRAINT = TG_NAME, SCHEMA = TG_TABLE_SCHEMA, TABLE = TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE TRIGGER "trg_stock_reservation_append_only"
BEFORE UPDATE OR DELETE ON "public"."StockReservation"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_reservation_append_only"();
CREATE TRIGGER "trg_stock_reservation_evidence_append_only"
BEFORE UPDATE OR DELETE ON "public"."StockReservationEvidence"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_reservation_evidence_append_only"();
CREATE TRIGGER "trg_stock_reservation_position_guard"
BEFORE INSERT OR UPDATE ON "public"."StockReservation"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_reservation_position_guard"();
CREATE TRIGGER "trg_stock_reservation_ceiling"
BEFORE INSERT OR UPDATE ON "public"."StockReservationEvidence"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_reservation_ceiling"();
ALTER TABLE "public"."StockReservationProjection"
ADD CONSTRAINT "ck_srp_values"
CHECK (
  (
    "activeQuantity" >= 0
    AND "appliedQuantity" >= 0
    AND "version" > 0
  ) IS TRUE
);
ALTER TABLE "public"."StockPositionProjection"
ADD CONSTRAINT "ck_spp_values"
CHECK (
  (
    "physicalQuantity" >= 0
    AND "reservedQuantity" >= 0
    AND "availableQuantity" >= 0
    AND "underReviewQuantity" >= 0
    AND "finalDispositionQuantity" >= 0
    AND "version" > 0
  ) IS TRUE
);
ALTER TABLE "public"."StockCompatibilityReference"
ADD CONSTRAINT "ck_scr_scope_key"
CHECK (
  (
    (
      "sourceScopeKind" = 'HEADER'
      AND "sourceLineId" IS NULL
      AND "sourceScopeKey" = 'H:' || "sourceEntityId"
    )
    OR
    (
      "sourceScopeKind" = 'LINE'
      AND "sourceLineId" IS NOT NULL
      AND "sourceScopeKey" = 'L:' || "sourceLineId"
    )
  ) IS TRUE
);
ALTER TABLE "public"."StockCompatibilityReference"
ADD CONSTRAINT "ck_scr_target"
CHECK (
  (
    (
      "disposition" = 'DETERMINISTICALLY_MAPPABLE'
      AND "articleId" IS NOT NULL
    )
    OR
    (
      "disposition" = 'DESCRIPTIVE_SNAPSHOT_ONLY'
      AND "articleId" IS NULL
      AND "positionId" IS NULL
      AND "identifiedUnitId" IS NULL
    )
    OR
    (
      "disposition" = 'UNRESOLVED_LEGACY'
      AND "articleId" IS NULL
      AND "positionId" IS NULL
      AND "identifiedUnitId" IS NULL
    )
    OR
    (
      "disposition" = 'INCOMPATIBLE_REJECTED'
      AND "articleId" IS NULL
      AND "positionId" IS NULL
      AND "identifiedUnitId" IS NULL
    )
  ) IS TRUE
);
ALTER TABLE "public"."ProjectionReconciliation"
ADD CONSTRAINT "ck_pr_version"
CHECK (
  ("observedVersion" > 0) IS TRUE
);
ALTER TABLE "public"."cajas_box_formula"
ADD CONSTRAINT "ck_cbf_next_version_positive"
CHECK (("next_version_number" > 0) IS TRUE);
ALTER TABLE "public"."cajas_box_formula"
ADD CONSTRAINT "ck_cbf_version_positive"
CHECK (("version" > 0) IS TRUE);
ALTER TABLE "public"."cajas_formula_version"
ADD CONSTRAINT "ck_cfv_version_positive"
CHECK (("version_number" > 0) IS TRUE);
ALTER TABLE "public"."cajas_formula_line"
ADD CONSTRAINT "ck_cfl_quantity_positive"
CHECK (("expected_quantity" > 0) IS TRUE);
ALTER TABLE "public"."cajas_formula_line"
ADD CONSTRAINT "ck_cfl_scale_snapshot"
CHECK (("scale_snapshot" BETWEEN 0 AND 4) IS TRUE);
CREATE FUNCTION "public"."fn_cajas_formula_current_guard"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  SELECT
    (
      TG_OP = 'INSERT'
      AND NEW."current_version_id" IS NULL
      AND NEW."next_version_number" = 1
      AND NEW."version" = 1
    )
    OR EXISTS (
      SELECT 1
      FROM "public"."cajas_formula_version" AS "targetVersion"
      WHERE TG_OP = 'UPDATE'
        AND NEW."company_id" = OLD."company_id"
        AND NEW."id" = OLD."id"
        AND NEW."box_article_id" = OLD."box_article_id"
        AND NEW."current_version_id" IS NOT NULL
        AND "targetVersion"."company_id" = NEW."company_id"
        AND "targetVersion"."formula_id" = NEW."id"
        AND "targetVersion"."box_article_id" = NEW."box_article_id"
        AND "targetVersion"."id" = NEW."current_version_id"
        AND "targetVersion"."previous_version_id" IS NOT DISTINCT FROM OLD."current_version_id"
        AND "targetVersion"."version_number" = OLD."next_version_number"
        AND NEW."next_version_number" = "targetVersion"."version_number" + 1
        AND NEW."version" = OLD."version" + 1
    )
  INTO v_valid;

  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_cajas_formula_current_guard' ||
               ';function=fn_cajas_formula_current_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_CAJAS_FORMULA_CURRENT_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_formula_version_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_formula_version_append_only' ||
             ';function=fn_cajas_formula_version_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_FORMULA_VERSION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_formula_line_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_formula_line_append_only' ||
             ';function=fn_cajas_formula_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_FORMULA_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_formula_version_min_line"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  IF TG_TABLE_NAME = 'cajas_formula_version' AND TG_OP = 'INSERT' THEN
    SELECT EXISTS (
      SELECT 1
      FROM "public"."cajas_formula_line" AS "formulaLine"
      WHERE "formulaLine"."company_id" = NEW."company_id"
        AND "formulaLine"."formula_version_id" = NEW."id"
    )
    INTO v_valid;
  ELSIF TG_TABLE_NAME = 'cajas_formula_line' AND TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT EXISTS (
      SELECT 1
      FROM "public"."cajas_formula_line" AS "formulaLine"
      WHERE "formulaLine"."company_id" = OLD."company_id"
        AND "formulaLine"."formula_version_id" = OLD."formula_version_id"
    )
    INTO v_valid;
  ELSE
    v_valid := FALSE;
  END IF;

  IF v_valid IS TRUE THEN
    RETURN NULL;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_cajas_formula_version_min_line' ||
               ';function=fn_cajas_formula_version_min_line' ||
               ';branch=R0001' ||
               ';family=MINIMUM_LINE',
      HINT = 'messageId=C14_INV_FN_FN_CAJAS_FORMULA_VERSION_MIN_LINE',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE TRIGGER "trg_cajas_formula_current_guard"
BEFORE INSERT OR UPDATE ON "public"."cajas_box_formula"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_formula_current_guard"();
CREATE TRIGGER "trg_cajas_formula_version_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_formula_version"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_formula_version_append_only"();
CREATE TRIGGER "trg_cajas_formula_line_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_formula_line"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_formula_line_append_only"();
CREATE CONSTRAINT TRIGGER "ctrg_cajas_formula_version_min_line_on_version"
AFTER INSERT ON "public"."cajas_formula_version"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_formula_version_min_line"();
CREATE CONSTRAINT TRIGGER "ctrg_cajas_formula_version_min_line_on_line"
AFTER UPDATE OR DELETE ON "public"."cajas_formula_line"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_formula_version_min_line"();
ALTER TABLE "public"."cajas_assignment"
ADD CONSTRAINT "ck_ca_active_lifecycle" CHECK ((
  ("active_slot" = 1 AND "ended_at" IS NULL AND "ended_by_id" IS NULL AND "end_cause" IS NULL AND "end_command_acceptance_id" IS NULL)
  OR ("active_slot" IS NULL AND "ended_at" IS NOT NULL AND "ended_by_id" IS NOT NULL AND "end_cause" IS NOT NULL AND "end_command_acceptance_id" IS NOT NULL)
) IS TRUE);
ALTER TABLE "public"."cajas_preparation"
ADD CONSTRAINT "ck_cp_version_positive" CHECK (("version" > 0) IS TRUE);
ALTER TABLE "public"."cajas_preparation_line"
ADD CONSTRAINT "ck_cpl_values" CHECK ((
  "quantity" > 0 AND "dispatched_quantity" >= 0 AND "dispatched_quantity" <= "quantity"
  AND "scale_snapshot" BETWEEN 0 AND 4 AND "version" > 0
) IS TRUE);
ALTER TABLE "public"."cajas_reservation_correlation"
ADD CONSTRAINT "ck_crc_preparation_shape" CHECK ((
  ("preparation_id" IS NULL AND "preparation_line_id" IS NULL)
  OR ("preparation_id" IS NOT NULL AND "preparation_line_id" IS NOT NULL)
) IS TRUE);
ALTER TABLE "public"."cajas_reservation_correlation"
ADD CONSTRAINT "ck_crc_quantity_shape" CHECK ((
  ("quantity" IS NULL AND "stock_unit" IS NULL AND "scale_snapshot" IS NULL)
  OR ("quantity" > 0 AND "stock_unit" IS NOT NULL AND "scale_snapshot" BETWEEN 0 AND 4)
) IS TRUE);
ALTER TABLE "public"."cajas_control"
ADD CONSTRAINT "ck_cc_positive_sequence_version" CHECK ((
  "sequence" > 0 AND "source_preparation_version" > 0
) IS TRUE);
ALTER TABLE "public"."cajas_control_line"
ADD CONSTRAINT "ck_ccl_quantity_scale" CHECK ((
  "quantity" > 0 AND "scale_snapshot" BETWEEN 0 AND 4
) IS TRUE);
CREATE FUNCTION "public"."fn_cajas_assignment_unit_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM "public"."StockIdentifiedUnit" AS "unit"
    WHERE ("unit"."companyId", "unit"."articleId", "unit"."id") = (NEW."company_id", NEW."box_article_id", NEW."box_identified_unit_id")
  ) AND (NEW."active_slot" IS DISTINCT FROM 1 OR NOT EXISTS (
    SELECT 1 FROM "public"."StockReservation" AS "reservation"
    WHERE "reservation"."companyId" = NEW."company_id"
      AND "reservation"."identifiedUnitId" = NEW."box_identified_unit_id"
      AND (SELECT COALESCE(SUM(CASE
        WHEN "event"."kind" IN ('RESERVE','REPLACE') AND NOT EXISTS (
          SELECT 1 FROM "public"."StockReservationEvidence" AS "replacement"
          WHERE ("replacement"."companyId", "replacement"."reservationId", "replacement"."replacesEvidenceId") = ("event"."companyId", "event"."reservationId", "event"."id")
        ) THEN "event"."quantity"
        WHEN "event"."kind" IN ('RELEASE','CANCEL','APPLY_TO_DISPATCH') THEN -"event"."quantity" ELSE 0 END),0)
        FROM "public"."StockReservationEvidence" AS "event"
        WHERE ("event"."companyId", "event"."reservationId") = ("reservation"."companyId", "reservation"."id")) > 0
      AND NOT EXISTS (
        SELECT 1 FROM "public"."cajas_reservation_correlation" AS "correlation"
        WHERE ("correlation"."company_id", "correlation"."assignment_id", "correlation"."stock_reservation_id", "correlation"."stock_position_id") = (NEW."company_id", NEW."id", "reservation"."id", "reservation"."positionId")
      )
  )) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_assignment_unit_guard;function=fn_cajas_assignment_unit_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_ASSIGNMENT_UNIT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_preparation_box_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM "public"."cajas_assignment" AS "assignment" WHERE ("assignment"."company_id","assignment"."id","assignment"."box_article_id")=(NEW."company_id",NEW."assignment_id",NEW."box_article_id"))
    AND EXISTS (SELECT 1 FROM "public"."cajas_formula_version" AS "version" WHERE ("version"."company_id","version"."id","version"."box_article_id")=(NEW."company_id",NEW."formula_version_id",NEW."box_article_id")) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_preparation_box_guard;function=fn_cajas_preparation_box_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_PREPARATION_BOX_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_preparation_pointer_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  SELECT (NEW."latest_control_id" IS NULL OR EXISTS (SELECT 1 FROM "public"."cajas_control" AS "control" WHERE ("control"."company_id","control"."assignment_id","control"."id")=(NEW."company_id",NEW."assignment_id",NEW."latest_control_id")))
    AND (NEW."last_accepted_change_id" IS NULL OR EXISTS (SELECT 1 FROM "public"."cajas_composition_change" AS "change" WHERE ("change"."company_id","change"."assignment_id","change"."id")=(NEW."company_id",NEW."assignment_id",NEW."last_accepted_change_id"))) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_preparation_pointer_guard;function=fn_cajas_preparation_pointer_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_PREPARATION_POINTER_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_correlation_append_only"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_correlation_append_only;function=fn_cajas_correlation_append_only;branch=R0001;family=APPEND_ONLY', HINT='messageId=C14_INV_FN_FN_CAJAS_CORRELATION_APPEND_ONLY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_control_append_only"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_control_append_only;function=fn_cajas_control_append_only;branch=R0001;family=APPEND_ONLY', HINT='messageId=C14_INV_FN_FN_CAJAS_CONTROL_APPEND_ONLY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_control_line_append_only"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_control_line_append_only;function=fn_cajas_control_line_append_only;branch=R0001;family=APPEND_ONLY', HINT='messageId=C14_INV_FN_FN_CAJAS_CONTROL_LINE_APPEND_ONLY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_control_min_line"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_NAME = 'cajas_control' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_control_line" AS "line" WHERE ("line"."company_id","line"."control_id")=(NEW."company_id",NEW."id")) INTO v_valid;
  ELSE
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_control_line" AS "line" WHERE ("line"."company_id","line"."control_id")=(OLD."company_id",OLD."control_id"))
      AND (TG_OP <> 'UPDATE' OR (NEW."company_id",NEW."control_id")=(OLD."company_id",OLD."control_id") OR EXISTS (SELECT 1 FROM "public"."cajas_control_line" AS "line" WHERE ("line"."company_id","line"."control_id")=(NEW."company_id",NEW."control_id"))) INTO v_valid;
  END IF;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_control_min_line;function=fn_cajas_control_min_line;branch=R0001;family=MINIMUM_LINE', HINT='messageId=C14_INV_FN_FN_CAJAS_CONTROL_MIN_LINE', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE TRIGGER "trg_cajas_assignment_unit_guard"
BEFORE INSERT OR UPDATE ON "public"."cajas_assignment"
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cajas_assignment_unit_guard"();
CREATE TRIGGER "trg_cajas_preparation_box_guard"
BEFORE INSERT OR UPDATE ON "public"."cajas_preparation"
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cajas_preparation_box_guard"();
CREATE TRIGGER "trg_cajas_preparation_pointer_guard"
BEFORE INSERT OR UPDATE ON "public"."cajas_preparation"
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cajas_preparation_pointer_guard"();
CREATE TRIGGER "trg_cajas_correlation_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_reservation_correlation"
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cajas_correlation_append_only"();
CREATE TRIGGER "trg_cajas_control_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_control"
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cajas_control_append_only"();
CREATE TRIGGER "trg_cajas_control_line_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_control_line"
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cajas_control_line_append_only"();
CREATE CONSTRAINT TRIGGER "ctrg_cajas_control_min_line_on_control"
AFTER INSERT ON "public"."cajas_control"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cajas_control_min_line"();
CREATE CONSTRAINT TRIGGER "ctrg_cajas_control_min_line_on_line"
AFTER UPDATE OR DELETE ON "public"."cajas_control_line"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cajas_control_min_line"();
ALTER TABLE "public"."cajas_composition_change"
  ADD CONSTRAINT "ck_cchg_version_step"
  CHECK ((("prior_preparation_version"::bigint >= 1::bigint) AND ("prior_preparation_version"::bigint <= 2147483646::bigint) AND ("resulting_preparation_version"::bigint = "prior_preparation_version"::bigint + 1::bigint) AND ("resulting_preparation_version"::bigint BETWEEN 1::bigint AND 2147483647::bigint)) IS TRUE);
ALTER TABLE "public"."cajas_composition_change_line"
  ADD CONSTRAINT "ck_cchl_change_shape"
  CHECK ((("kind" = 'add' AND "prior_preparation_line_id" IS NULL AND "prior_article_id" IS NULL AND "prior_stock_position_id" IS NULL AND "prior_quantity" IS NULL AND "prior_trace_capture" IS NULL AND "resulting_preparation_line_id" IS NOT NULL AND "resulting_article_id" IS NOT NULL AND "resulting_quantity" > 0) OR ("kind" = 'remove' AND "prior_preparation_line_id" IS NOT NULL AND "prior_article_id" IS NOT NULL AND "prior_quantity" > 0 AND "resulting_preparation_line_id" IS NULL AND "resulting_article_id" IS NULL AND "resulting_stock_position_id" IS NULL AND "resulting_quantity" IS NULL AND "resulting_trace_capture" IS NULL) OR ("kind" = 'replace' AND "prior_preparation_line_id" IS NOT NULL AND "prior_article_id" IS NOT NULL AND "prior_quantity" > 0 AND "resulting_preparation_line_id" IS NOT NULL AND "resulting_article_id" IS NOT NULL AND "resulting_quantity" > 0 AND ("prior_article_id" IS DISTINCT FROM "resulting_article_id" OR "prior_stock_position_id" IS DISTINCT FROM "resulting_stock_position_id") AND "prior_quantity" = "resulting_quantity" AND "prior_trace_capture" IS NOT DISTINCT FROM "resulting_trace_capture") OR ("kind" = 'quantity' AND "prior_preparation_line_id" IS NOT NULL AND "resulting_preparation_line_id" = "prior_preparation_line_id" AND "prior_article_id" IS NOT NULL AND "resulting_article_id" = "prior_article_id" AND "prior_stock_position_id" IS NOT DISTINCT FROM "resulting_stock_position_id" AND "prior_quantity" > 0 AND "resulting_quantity" > 0 AND "prior_quantity" <> "resulting_quantity" AND "prior_trace_capture" IS NOT DISTINCT FROM "resulting_trace_capture") OR ("kind" = 'traceability' AND "prior_preparation_line_id" IS NOT NULL AND "resulting_preparation_line_id" = "prior_preparation_line_id" AND "prior_article_id" IS NOT NULL AND "resulting_article_id" = "prior_article_id" AND "prior_stock_position_id" IS NOT DISTINCT FROM "resulting_stock_position_id" AND "prior_quantity" > 0 AND "resulting_quantity" = "prior_quantity" AND "prior_trace_capture" IS DISTINCT FROM "resulting_trace_capture")) IS TRUE);
ALTER TABLE "public"."cajas_composition_change_line"
  ADD CONSTRAINT "ck_cchl_quantity_scale"
  CHECK ((("scale_snapshot" BETWEEN 0 AND 4) AND ("prior_quantity" IS NULL OR ("prior_quantity" > 0 AND "prior_quantity" = trunc("prior_quantity", "scale_snapshot"))) AND ("resulting_quantity" IS NULL OR ("resulting_quantity" > 0 AND "resulting_quantity" = trunc("resulting_quantity", "scale_snapshot")))) IS TRUE);
ALTER TABLE "public"."cajas_difference"
  ADD CONSTRAINT "ck_cd_origin_shape"
  CHECK ((("kind" = 'CONTROL' AND "control_line_id" IS NOT NULL AND "origin_dispatch_id" IS NULL AND "origin_remito_id" IS NULL AND "dispatch_line_id" IS NULL AND "return_confirmation_id" IS NULL AND "return_line_id" IS NULL) OR ("kind" = 'DISPATCH' AND "control_line_id" IS NULL AND "origin_dispatch_id" IS NOT NULL AND "origin_remito_id" IS NOT NULL AND "dispatch_line_id" IS NOT NULL AND "return_confirmation_id" IS NULL AND "return_line_id" IS NULL) OR ("kind" = 'RETURN' AND "control_line_id" IS NULL AND "origin_dispatch_id" IS NOT NULL AND "origin_remito_id" IS NULL AND "dispatch_line_id" IS NULL AND "return_confirmation_id" IS NOT NULL AND "return_line_id" IS NOT NULL)) IS TRUE);
ALTER TABLE "public"."cajas_dispatch"
  ADD CONSTRAINT "ck_cdp_record_shape"
  CHECK ((("record_kind" = 'ORIGINAL' AND "corrects_dispatch_id" IS NULL AND "sequence" > 0) OR ("record_kind" = 'CORRECTION' AND "corrects_dispatch_id" IS NOT NULL AND "sequence" > 0)) IS TRUE);
ALTER TABLE "public"."cajas_dispatch_line"
  ADD CONSTRAINT "ck_cdl_record_sign_shape"
  CHECK ((("record_kind" = 'ORIGINAL' AND "accounting_sign" = 1 AND "neutralizes_dispatch_line_id" IS NULL) OR ("record_kind" = 'REVERSAL' AND "accounting_sign" = -1 AND "neutralizes_dispatch_line_id" IS NOT NULL)) IS TRUE);
ALTER TABLE "public"."cajas_dispatch_line"
  ADD CONSTRAINT "ck_cdl_quantity_scale"
  CHECK ((("quantity" > 0) AND ("scale_snapshot" BETWEEN 0 AND 4)) IS TRUE);
ALTER TABLE "public"."cajas_dispatch_accounting"
  ADD CONSTRAINT "ck_cda_version_positive"
  CHECK (("version" > 0) IS TRUE);
ALTER TABLE "public"."cajas_dispatch_line_accounting"
  ADD CONSTRAINT "ck_cdla_balance_scale_version"
  CHECK ((("dispatched_quantity" >= 0) AND ("disposed_quantity" >= 0) AND ("pending_quantity" >= 0) AND ("pending_quantity" = "dispatched_quantity" - "disposed_quantity") AND ("scale_snapshot" BETWEEN 0 AND 4) AND ("version" > 0)) IS TRUE);
ALTER TABLE "public"."cajas_return_confirmation"
  ADD CONSTRAINT "ck_crcfn_record_slot_version"
  CHECK ((("record_kind" = 'ORIGINAL' AND "original_slot" = 1 AND "corrects_confirmation_id" IS NULL AND "observed_accounting_version" > 0) OR ("record_kind" = 'CORRECTION' AND "original_slot" IS NULL AND "corrects_confirmation_id" IS NOT NULL AND "observed_accounting_version" > 0)) IS TRUE);
ALTER TABLE "public"."cajas_return_line"
  ADD CONSTRAINT "ck_crl_dispatch_kind_shape"
  CHECK ((("kind" = 'unchanged' AND "dispatch_line_id" IS NOT NULL) OR ("kind" = 'consumed' AND "dispatch_line_id" IS NOT NULL) OR ("kind" = 'missing' AND "dispatch_line_id" IS NOT NULL) OR ("kind" = 'damaged' AND "dispatch_line_id" IS NOT NULL) OR ("kind" = 'under_review' AND "dispatch_line_id" IS NOT NULL) OR ("kind" = 'added' AND "dispatch_line_id" IS NULL) OR ("kind" = 'replacement' AND "dispatch_line_id" IS NULL)) IS TRUE);
ALTER TABLE "public"."cajas_return_line"
  ADD CONSTRAINT "ck_crl_quantity_scale"
  CHECK ((("quantity" > 0) AND ("scale_snapshot" BETWEEN 0 AND 4)) IS TRUE);
ALTER TABLE "public"."cajas_consumption_confirmation"
  ADD CONSTRAINT "ck_ccc_record_slot_version"
  CHECK ((("record_kind" = 'ORIGINAL' AND "original_slot" = 1 AND "corrects_confirmation_id" IS NULL AND "observed_accounting_version" > 0) OR ("record_kind" = 'CORRECTION' AND "original_slot" IS NULL AND "corrects_confirmation_id" IS NOT NULL AND "observed_accounting_version" > 0)) IS TRUE);
ALTER TABLE "public"."cajas_consumption_line"
  ADD CONSTRAINT "ck_ccln_quantity_scale"
  CHECK ((("quantity" > 0) AND ("scale_snapshot" BETWEEN 0 AND 4)) IS TRUE);
ALTER TABLE "public"."cajas_disposition"
  ADD CONSTRAINT "ck_cdis_owner_shape"
  CHECK ((("return_confirmation_id" IS NOT NULL AND "return_line_id" IS NOT NULL AND "consumption_confirmation_id" IS NULL AND "consumption_line_id" IS NULL) OR ("return_confirmation_id" IS NULL AND "return_line_id" IS NULL AND "consumption_confirmation_id" IS NOT NULL AND "consumption_line_id" IS NOT NULL)) IS TRUE);
ALTER TABLE "public"."cajas_disposition"
  ADD CONSTRAINT "ck_cdis_record_sign_shape"
  CHECK ((("record_kind" = 'ORIGINAL' AND "accounting_sign" = 1 AND "neutralizes_disposition_id" IS NULL) OR ("record_kind" = 'REVERSAL' AND "accounting_sign" = -1 AND "neutralizes_disposition_id" IS NOT NULL)) IS TRUE);
ALTER TABLE "public"."cajas_disposition"
  ADD CONSTRAINT "ck_cdis_quantity_scale"
  CHECK ((("quantity" > 0) AND ("scale_snapshot" BETWEEN 0 AND 4)) IS TRUE);
ALTER TABLE "public"."cajas_condition_projection"
  ADD CONSTRAINT "ck_ccp_counts_version"
  CHECK ((("open_difference_count" >= 0) AND ("pending_dispatch_scope_count" >= 0) AND ("version" > 0)) IS TRUE);
CREATE FUNCTION "public"."fn_cajas_composition_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_composition_append_only' ||
             ';function=fn_cajas_composition_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_COMPOSITION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_composition_line_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_composition_line_append_only' ||
             ';function=fn_cajas_composition_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_COMPOSITION_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_difference_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_difference_append_only' ||
             ';function=fn_cajas_difference_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_DIFFERENCE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_difference_resolution_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_difference_resolution_append_only' ||
             ';function=fn_cajas_difference_resolution_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_DIFFERENCE_RESOLUTION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_dispatch_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_dispatch_append_only' ||
             ';function=fn_cajas_dispatch_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_DISPATCH_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_dispatch_line_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_dispatch_line_append_only' ||
             ';function=fn_cajas_dispatch_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_DISPATCH_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_return_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_return_append_only' ||
             ';function=fn_cajas_return_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_RETURN_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_return_line_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_return_line_append_only' ||
             ';function=fn_cajas_return_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_RETURN_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_replacement_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_replacement_append_only' ||
             ';function=fn_cajas_replacement_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_REPLACEMENT_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_consumption_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_consumption_append_only' ||
             ';function=fn_cajas_consumption_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_CONSUMPTION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_consumption_line_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_consumption_line_append_only' ||
             ';function=fn_cajas_consumption_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_CONSUMPTION_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_disposition_append_only"() RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_disposition_append_only' ||
             ';function=fn_cajas_disposition_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_DISPOSITION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_dispatch_ceiling"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE
  v_valid boolean;
BEGIN
  WITH "currentHeader" AS (
    SELECT "header".* FROM "public"."cajas_dispatch" AS "header"
    WHERE "header"."company_id" = NEW."company_id" AND "header"."id" = NEW."dispatch_id"
      AND NOT EXISTS (SELECT 1 FROM "public"."cajas_dispatch" AS "child" WHERE "child"."company_id" = "header"."company_id" AND "child"."corrects_dispatch_id" = "header"."id")
  ), "candidateLines" AS (
    SELECT "header"."sequence" AS "header_sequence", "line"."id", "line"."line_number", "line"."record_kind", "line"."accounting_sign", "line"."neutralizes_dispatch_line_id", "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."quantity", "line"."stock_unit", "line"."scale_snapshot", "line"."stock_evidence_line_id"
    FROM "currentHeader" AS "header"
    JOIN "public"."cajas_dispatch_line" AS "line" ON "line"."company_id" = "header"."company_id" AND "line"."dispatch_id" = "header"."id"
    WHERE "line"."id" <> NEW."id"
    UNION ALL
    SELECT "header"."sequence", NEW."id", NEW."line_number", NEW."record_kind", NEW."accounting_sign", NEW."neutralizes_dispatch_line_id", NEW."source_control_line_id", NEW."article_id", NEW."stock_position_id", NEW."quantity", NEW."stock_unit", NEW."scale_snapshot", NEW."stock_evidence_line_id"
    FROM "currentHeader" AS "header"
  ), "ordered" AS (
    SELECT "line".*, SUM("line"."accounting_sign" * "line"."quantity") OVER (PARTITION BY "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."stock_unit", "line"."scale_snapshot" ORDER BY "line"."header_sequence", "line"."line_number", convert_to("line"."id", 'UTF8') ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "prefix_net"
    FROM "candidateLines" AS "line"
  ), "scopeTotals" AS (
    SELECT "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."stock_unit", "line"."scale_snapshot", SUM("line"."accounting_sign" * "line"."quantity") AS "net"
    FROM "candidateLines" AS "line"
    GROUP BY "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."stock_unit", "line"."scale_snapshot"
  )
  SELECT EXISTS (
    SELECT 1 FROM "currentHeader" AS "header"
    JOIN "public"."cajas_control_line" AS "control" ON "control"."company_id" = NEW."company_id" AND "control"."assignment_id" = "header"."assignment_id" AND "control"."id" = NEW."source_control_line_id"
    JOIN "public"."StockEvidenceLine" AS "evidence" ON "evidence"."companyId" = NEW."company_id" AND "evidence"."id" = NEW."stock_evidence_line_id"
    WHERE NEW."assignment_id" = "header"."assignment_id" AND NEW."remito_id" = "header"."remito_id" AND NEW."article_id" = "control"."articleId" AND NEW."stock_position_id" IS NOT DISTINCT FROM "control"."stockPositionId" AND NEW."stock_unit" = "control"."stockUnit" AND NEW."scale_snapshot" = "control"."scaleSnapshot" AND NEW."article_id" = "evidence"."articleId" AND NEW."stock_position_id" = "evidence"."fromPositionId" AND NEW."quantity" = "evidence"."quantity" AND NEW."stock_unit" = "evidence"."stockUnit" AND NEW."scale_snapshot" = "evidence"."scaleSnapshot" AND NEW."record_kind" IN ('ORIGINAL','REVERSAL') AND ((NEW."record_kind" = 'ORIGINAL' AND NEW."accounting_sign" = 1 AND NEW."neutralizes_dispatch_line_id" IS NULL) OR (NEW."record_kind" = 'REVERSAL' AND NEW."accounting_sign" = -1 AND NEW."neutralizes_dispatch_line_id" IS NOT NULL AND EXISTS (SELECT 1 FROM "candidateLines" AS "target" WHERE "target"."id" = NEW."neutralizes_dispatch_line_id" AND "target"."record_kind" = 'ORIGINAL' AND "target"."source_control_line_id" = NEW."source_control_line_id" AND "target"."article_id" = NEW."article_id" AND "target"."stock_position_id" IS NOT DISTINCT FROM NEW."stock_position_id" AND "target"."quantity" = NEW."quantity" AND "target"."stock_unit" = NEW."stock_unit" AND "target"."scale_snapshot" = NEW."scale_snapshot"))) AND ("header"."record_kind" <> 'CORRECTION' OR (NEW."record_kind" = 'ORIGINAL' AND NEW."accounting_sign" = 1 AND NEW."neutralizes_dispatch_line_id" IS NULL)) AND NOT EXISTS (SELECT 1 FROM "candidateLines" AS "line" LEFT JOIN "public"."cajas_control_line" AS "source" ON "source"."company_id" = NEW."company_id" AND "source"."assignment_id" = "header"."assignment_id" AND "source"."id" = "line"."source_control_line_id" LEFT JOIN "public"."StockEvidenceLine" AS "sourceEvidence" ON "sourceEvidence"."companyId" = NEW."company_id" AND "sourceEvidence"."id" = "line"."stock_evidence_line_id" WHERE "source"."id" IS NULL OR "sourceEvidence"."id" IS NULL OR "line"."article_id" <> "source"."articleId" OR "line"."stock_position_id" IS DISTINCT FROM "source"."stockPositionId" OR "line"."stock_unit" <> "source"."stockUnit" OR "line"."scale_snapshot" <> "source"."scaleSnapshot" OR "line"."article_id" <> "sourceEvidence"."articleId" OR "line"."stock_position_id" IS DISTINCT FROM "sourceEvidence"."fromPositionId" OR "line"."quantity" <> "sourceEvidence"."quantity" OR "line"."stock_unit" <> "sourceEvidence"."stockUnit" OR "line"."scale_snapshot" <> "sourceEvidence"."scaleSnapshot") AND NOT EXISTS (SELECT 1 FROM "ordered" AS "line" JOIN "public"."cajas_control_line" AS "source" ON "source"."company_id" = NEW."company_id" AND "source"."assignment_id" = "header"."assignment_id" AND "source"."id" = "line"."source_control_line_id" WHERE "line"."prefix_net" < 0 OR "line"."prefix_net" > "source"."quantity") AND NOT EXISTS (SELECT 1 FROM "scopeTotals" AS "scope" JOIN "public"."cajas_control_line" AS "source" ON "source"."company_id" = NEW."company_id" AND "source"."assignment_id" = "header"."assignment_id" AND "source"."id" = "scope"."source_control_line_id" WHERE "scope"."net" < 0 OR "scope"."net" > "source"."quantity")
  ) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_dispatch_ceiling;function=fn_cajas_dispatch_ceiling;branch=R0001;family=AGGREGATE_OR_SERIALIZATION_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_DISPATCH_CEILING', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_stock_link_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'cajas_dispatch_line' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."StockEvidenceLine" AS "line" JOIN "public"."StockEvidence" AS "evidence" ON "evidence"."companyId" = "line"."companyId" AND "evidence"."id" = "line"."evidenceId" WHERE "line"."companyId" = NEW."company_id" AND "line"."id" = NEW."stock_evidence_line_id" AND "evidence"."kind" = 'DISPATCH' AND "line"."articleId" = NEW."article_id" AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL AND "line"."quantity" = NEW."quantity" AND "line"."stockUnit" = NEW."stock_unit" AND "line"."scaleSnapshot" = NEW."scale_snapshot" AND "evidence"."commandAcceptanceId" = (SELECT "header"."command_acceptance_id" FROM "public"."cajas_dispatch" AS "header" WHERE "header"."company_id" = NEW."company_id" AND "header"."id" = NEW."dispatch_id")) INTO v_valid;
  ELSIF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'cajas_disposition' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."StockEvidenceLine" AS "line" JOIN "public"."StockEvidence" AS "evidence" ON "evidence"."companyId" = "line"."companyId" AND "evidence"."id" = "line"."evidenceId" WHERE "line"."companyId" = NEW."company_id" AND "line"."id" = NEW."stock_evidence_line_id" AND "line"."articleId" = NEW."article_id" AND "line"."quantity" = NEW."quantity" AND "line"."stockUnit" = NEW."stock_unit" AND "line"."scaleSnapshot" = NEW."scale_snapshot" AND "evidence"."commandAcceptanceId" = NEW."command_acceptance_id" AND ((NEW."kind" = 'returned' AND NEW."stock_position_id" IS NULL AND "evidence"."kind" = 'RETURN' AND "line"."fromPositionId" IS NULL AND "line"."toPositionId" IS NOT NULL) OR (NEW."kind" = 'consumed' AND "evidence"."kind" = 'CONSUMPTION' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL) OR (NEW."kind" IN ('missing','damaged') AND "evidence"."kind" = 'COUNT_OBSERVATION' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL) OR (NEW."kind" = 'under_review' AND NEW."record_kind" = 'ORIGINAL' AND "evidence"."kind" = 'REVIEW_HOLD' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL) OR (NEW."kind" = 'under_review' AND NEW."record_kind" = 'REVERSAL' AND "evidence"."kind" = 'REVIEW_RELEASE' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL))) INTO v_valid;
  ELSE v_valid := false;
  END IF;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_stock_link_guard;function=fn_cajas_stock_link_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_STOCK_LINK_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_disposition_fold_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  WITH "rows" AS (SELECT "d".* FROM "public"."cajas_disposition" AS "d" WHERE "d"."company_id" = NEW."company_id" AND "d"."dispatch_line_id" = NEW."dispatch_line_id" AND "d"."id" <> NEW."id" UNION ALL SELECT NEW.*), "fold" AS (SELECT COALESCE(SUM("accounting_sign" * "quantity") FILTER (WHERE "kind" IN ('returned','consumed','missing','damaged')),0::numeric) AS "final", COALESCE(SUM("accounting_sign" * "quantity") FILTER (WHERE "kind" = 'under_review'),0::numeric) AS "hold" FROM "rows"), "dispatchNet" AS (SELECT COALESCE(SUM("line"."accounting_sign" * "line"."quantity"),0::numeric) AS "net" FROM "public"."cajas_dispatch_line" AS "line" WHERE "line"."company_id" = NEW."company_id" AND "line"."dispatch_id" = NEW."dispatch_id" AND ("line"."id" = NEW."dispatch_line_id" OR "line"."neutralizes_dispatch_line_id" = NEW."dispatch_line_id"))
  SELECT EXISTS (SELECT 1 FROM "public"."cajas_dispatch" AS "header" CROSS JOIN "fold" CROSS JOIN "dispatchNet" WHERE "header"."company_id" = NEW."company_id" AND "header"."id" = NEW."dispatch_id" AND "fold"."final" >= 0 AND "fold"."hold" >= 0 AND "dispatchNet"."net" - "fold"."final" - "fold"."hold" >= 0 AND ((NEW."return_confirmation_id" IS NOT NULL AND NEW."return_line_id" IS NOT NULL AND NEW."consumption_confirmation_id" IS NULL AND NEW."consumption_line_id" IS NULL) OR (NEW."return_confirmation_id" IS NULL AND NEW."return_line_id" IS NULL AND NEW."consumption_confirmation_id" IS NOT NULL AND NEW."consumption_line_id" IS NOT NULL)) AND ((NEW."record_kind" = 'ORIGINAL' AND NEW."accounting_sign" = 1 AND NEW."neutralizes_disposition_id" IS NULL) OR (NEW."record_kind" = 'REVERSAL' AND NEW."accounting_sign" = -1 AND NEW."neutralizes_disposition_id" IS NOT NULL AND EXISTS (SELECT 1 FROM "rows" AS "target" WHERE "target"."id" = NEW."neutralizes_disposition_id" AND "target"."record_kind" = 'ORIGINAL' AND "target"."kind" = NEW."kind" AND "target"."article_id" = NEW."article_id" AND "target"."stock_position_id" IS NOT DISTINCT FROM NEW."stock_position_id" AND "target"."quantity" = NEW."quantity" AND "target"."stock_unit" = NEW."stock_unit" AND "target"."scale_snapshot" = NEW."scale_snapshot" AND "target"."return_confirmation_id" IS NOT DISTINCT FROM NEW."return_confirmation_id" AND "target"."return_line_id" IS NOT DISTINCT FROM NEW."return_line_id" AND "target"."consumption_confirmation_id" IS NOT DISTINCT FROM NEW."consumption_confirmation_id" AND "target"."consumption_line_id" IS NOT DISTINCT FROM NEW."consumption_line_id" AND NOT EXISTS (SELECT 1 FROM "rows" AS "other" WHERE "other"."neutralizes_disposition_id" = "target"."id" AND "other"."id" <> NEW."id"))))) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_disposition_fold_guard;function=fn_cajas_disposition_fold_guard;branch=R0001;family=AGGREGATE_OR_SERIALIZATION_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_DISPOSITION_FOLD_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_condition_assignment_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  SELECT NEW."assignment_id" IS NULL OR EXISTS (SELECT 1 FROM "public"."cajas_assignment" AS "assignment" WHERE "assignment"."company_id" = NEW."company_id" AND "assignment"."id" = NEW."assignment_id" AND "assignment"."box_identified_unit_id" = NEW."box_identified_unit_id") INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_condition_assignment_guard;function=fn_cajas_condition_assignment_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_CONDITION_ASSIGNMENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE TRIGGER "trg_cajas_composition_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_composition_change"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_composition_append_only"();
CREATE TRIGGER "trg_cajas_composition_line_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_composition_change_line"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_composition_line_append_only"();
CREATE TRIGGER "trg_cajas_difference_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_difference"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_difference_append_only"();
CREATE TRIGGER "trg_cajas_difference_resolution_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_difference_resolution"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_difference_resolution_append_only"();
CREATE TRIGGER "trg_cajas_dispatch_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_dispatch"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_dispatch_append_only"();
CREATE TRIGGER "trg_cajas_dispatch_line_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_dispatch_line"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_dispatch_line_append_only"();
CREATE TRIGGER "trg_cajas_return_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_return_confirmation"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_return_append_only"();
CREATE TRIGGER "trg_cajas_return_line_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_return_line"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_return_line_append_only"();
CREATE TRIGGER "trg_cajas_replacement_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_replacement_pair"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_replacement_append_only"();
CREATE TRIGGER "trg_cajas_consumption_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_consumption_confirmation"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_consumption_append_only"();
CREATE TRIGGER "trg_cajas_consumption_line_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_consumption_line"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_consumption_line_append_only"();
CREATE TRIGGER "trg_cajas_disposition_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_disposition"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_disposition_append_only"();
CREATE TRIGGER "trg_cajas_dispatch_ceiling"
BEFORE INSERT OR UPDATE ON "public"."cajas_dispatch_line"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_dispatch_ceiling"();
CREATE TRIGGER "trg_cajas_dispatch_line_stock_link_guard"
BEFORE INSERT OR UPDATE ON "public"."cajas_dispatch_line"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_stock_link_guard"();
CREATE TRIGGER "trg_cajas_disposition_stock_link_guard"
BEFORE INSERT OR UPDATE ON "public"."cajas_disposition"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_stock_link_guard"();
CREATE TRIGGER "trg_cajas_disposition_fold_guard"
BEFORE INSERT OR UPDATE ON "public"."cajas_disposition"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_disposition_fold_guard"();
CREATE TRIGGER "trg_cajas_condition_assignment_guard"
BEFORE INSERT OR UPDATE ON "public"."cajas_condition_projection"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_condition_assignment_guard"();
ALTER TABLE "public"."StockActivationBoundary"
ADD CONSTRAINT "ex_sab_position_window"
EXCLUDE USING gist ("companyId" WITH =, "positionId" WITH =, tstzrange("cutoffAt", COALESCE("validUntil", 'infinity'::timestamptz), '[)') WITH &&)
NOT DEFERRABLE;
CREATE FUNCTION "public"."fn_stock_opening_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "public"."StockActivationBoundary" AS "boundary"
    JOIN "public"."StockEvidenceLine" AS "line"
      ON "line"."companyId" = NEW."companyId" AND "line"."id" = NEW."openingEvidenceLineId"
    JOIN "public"."StockEvidence" AS "evidence"
      ON "evidence"."companyId" = "line"."companyId" AND "evidence"."id" = "line"."evidenceId"
    JOIN "public"."StockPosition" AS "position"
      ON "position"."companyId" = NEW."companyId" AND "position"."id" = NEW."positionId"
    WHERE "boundary"."companyId" = NEW."companyId" AND "boundary"."id" = NEW."activationBoundaryId"
      AND "boundary"."positionId" = NEW."positionId" AND "boundary"."cutoffAt" = NEW."cutoffAt"
      AND "evidence"."kind" = 'OPENING' AND "evidence"."recordKind" = 'ORIGINAL'
      AND "evidence"."activationBoundaryId" = NEW."activationBoundaryId"
      AND "evidence"."acceptedAt" >= "boundary"."cutoffAt" AND NEW."acceptedAt" = "evidence"."acceptedAt"
      AND "line"."fromPositionId" IS NULL AND "line"."toPositionId" = NEW."positionId"
      AND "line"."quantity" = NEW."quantity" AND "line"."stockUnit" = NEW."stockUnit"
      AND "line"."scaleSnapshot" = NEW."scaleSnapshot"
      AND "position"."stockUnit" = NEW."stockUnit" AND "position"."quantityScale" = NEW."scaleSnapshot"
  ) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_opening_guard;function=fn_stock_opening_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_OPENING_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_opening_append_only"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_opening_append_only;function=fn_stock_opening_append_only;branch=R0001;family=APPEND_ONLY', HINT='messageId=C14_INV_FN_FN_STOCK_OPENING_APPEND_ONLY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_stock_policy_current_guard"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "public"."StockArticlePolicyVersion" AS "target"
    LEFT JOIN "public"."StockArticlePolicyVersion" AS "prior"
      ON TG_OP = 'UPDATE' AND "prior"."companyId" = OLD."companyId"
     AND "prior"."eligibilityId" = OLD."id" AND "prior"."id" = OLD."currentPolicyVersionId"
    WHERE "target"."companyId" = NEW."companyId" AND "target"."eligibilityId" = NEW."id"
      AND "target"."id" = NEW."currentPolicyVersionId"
      AND ((TG_OP = 'INSERT' AND "target"."versionNumber" = 1 AND "target"."previousVersionId" IS NULL AND NEW."version" = 1)
        OR (TG_OP = 'UPDATE' AND NEW."companyId" = OLD."companyId" AND NEW."organizationId" = OLD."organizationId"
          AND NEW."articleId" = OLD."articleId" AND "target"."previousVersionId" = OLD."currentPolicyVersionId"
          AND "target"."versionNumber" = "prior"."versionNumber" + 1 AND NEW."version" = OLD."version" + 1))
  ) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_policy_current_guard;function=fn_stock_policy_current_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_POLICY_CURRENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_dispatch_min_line"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_NAME = 'cajas_dispatch' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_dispatch_line" AS "line" WHERE ("line"."company_id","line"."dispatch_id")=(NEW."company_id",NEW."id")) INTO v_valid;
  ELSE
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_dispatch_line" AS "line" WHERE ("line"."company_id","line"."dispatch_id")=(OLD."company_id",OLD."dispatch_id"))
      AND (TG_OP <> 'UPDATE' OR (NEW."company_id",NEW."dispatch_id")=(OLD."company_id",OLD."dispatch_id") OR EXISTS (SELECT 1 FROM "public"."cajas_dispatch_line" AS "line" WHERE ("line"."company_id","line"."dispatch_id")=(NEW."company_id",NEW."dispatch_id"))) INTO v_valid;
  END IF;
  IF v_valid IS TRUE THEN RETURN NULL; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_dispatch_min_line;function=fn_cajas_dispatch_min_line;branch=R0001;family=MINIMUM_LINE', HINT='messageId=C14_INV_FN_FN_CAJAS_DISPATCH_MIN_LINE', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_return_min_line"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_NAME = 'cajas_return_confirmation' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_return_line" AS "line" WHERE ("line"."company_id","line"."return_confirmation_id")=(NEW."company_id",NEW."id")) INTO v_valid;
  ELSE
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_return_line" AS "line" WHERE ("line"."company_id","line"."return_confirmation_id")=(OLD."company_id",OLD."return_confirmation_id"))
      AND (TG_OP <> 'UPDATE' OR (NEW."company_id",NEW."return_confirmation_id")=(OLD."company_id",OLD."return_confirmation_id") OR EXISTS (SELECT 1 FROM "public"."cajas_return_line" AS "line" WHERE ("line"."company_id","line"."return_confirmation_id")=(NEW."company_id",NEW."return_confirmation_id"))) INTO v_valid;
  END IF;
  IF v_valid IS TRUE THEN RETURN NULL; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_return_min_line;function=fn_cajas_return_min_line;branch=R0001;family=MINIMUM_LINE', HINT='messageId=C14_INV_FN_FN_CAJAS_RETURN_MIN_LINE', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE FUNCTION "public"."fn_cajas_consumption_min_line"() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $c14fn$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_NAME = 'cajas_consumption_confirmation' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_consumption_line" AS "line" WHERE ("line"."company_id","line"."consumption_confirmation_id")=(NEW."company_id",NEW."id")) INTO v_valid;
  ELSE
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_consumption_line" AS "line" WHERE ("line"."company_id","line"."consumption_confirmation_id")=(OLD."company_id",OLD."consumption_confirmation_id"))
      AND (TG_OP <> 'UPDATE' OR (NEW."company_id",NEW."consumption_confirmation_id")=(OLD."company_id",OLD."consumption_confirmation_id") OR EXISTS (SELECT 1 FROM "public"."cajas_consumption_line" AS "line" WHERE ("line"."company_id","line"."consumption_confirmation_id")=(NEW."company_id",NEW."consumption_confirmation_id"))) INTO v_valid;
  END IF;
  IF v_valid IS TRUE THEN RETURN NULL; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_consumption_min_line;function=fn_cajas_consumption_min_line;branch=R0001;family=MINIMUM_LINE', HINT='messageId=C14_INV_FN_FN_CAJAS_CONSUMPTION_MIN_LINE', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$c14fn$;
CREATE TRIGGER "trg_stock_opening_guard"
BEFORE INSERT OR UPDATE ON "public"."StockOpeningPosition"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_opening_guard"();
CREATE TRIGGER "trg_stock_opening_append_only"
BEFORE UPDATE OR DELETE ON "public"."StockOpeningPosition"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_opening_append_only"();
CREATE TRIGGER "trg_stock_policy_current_guard"
BEFORE INSERT OR UPDATE ON "public"."StockArticleEligibility"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_stock_policy_current_guard"();
CREATE CONSTRAINT TRIGGER "ctrg_cajas_dispatch_min_line_on_dispatch"
AFTER INSERT ON "public"."cajas_dispatch"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_dispatch_min_line"();
CREATE CONSTRAINT TRIGGER "ctrg_cajas_dispatch_min_line_on_line"
AFTER UPDATE OR DELETE ON "public"."cajas_dispatch_line"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_dispatch_min_line"();
CREATE CONSTRAINT TRIGGER "ctrg_cajas_return_min_line_on_return"
AFTER INSERT ON "public"."cajas_return_confirmation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_return_min_line"();
CREATE CONSTRAINT TRIGGER "ctrg_cajas_return_min_line_on_line"
AFTER UPDATE OR DELETE ON "public"."cajas_return_line"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_return_min_line"();
CREATE CONSTRAINT TRIGGER "ctrg_cajas_consumption_min_line_on_consumption"
AFTER INSERT ON "public"."cajas_consumption_confirmation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_consumption_min_line"();
CREATE CONSTRAINT TRIGGER "ctrg_cajas_consumption_min_line_on_line"
AFTER UPDATE OR DELETE ON "public"."cajas_consumption_line"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_consumption_min_line"();
