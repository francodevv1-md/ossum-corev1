-- DEV-only additive Phase D artifact. Do not apply without confirmed disposable DEV target.
CREATE TYPE "cajas_phase_d_operation_kind" AS ENUM ('CONSUMPTION', 'RETURN');
CREATE TYPE "cajas_phase_d_return_state" AS ENUM ('IDENTIFIED', 'PENDING_IDENTIFICATION', 'RECEIVED');
CREATE TYPE "cajas_phase_d_receipt_outcome" AS ENUM ('FIT', 'OBSERVED', 'DAMAGED', 'NOT_FIT', 'UNIDENTIFIABLE');
CREATE TYPE "cajas_phase_d_reconciliation_event_kind" AS ENUM ('CLOSED', 'REOPENED');
CREATE TYPE "cajas_phase_d_action" AS ENUM ('CONSUME', 'REGISTER_RETURN', 'RECEIVE_CONTROL', 'CLOSE_RECONCILIATION');

CREATE TABLE "cajas_phase_d_operation" (
  "id" TEXT NOT NULL, "company_id" TEXT NOT NULL, "dispatch_id" TEXT NOT NULL, "dispatch_line_id" TEXT,
  "remito_id" TEXT NOT NULL, "surgery_id" TEXT NOT NULL, "kind" "cajas_phase_d_operation_kind" NOT NULL,
  "return_state" "cajas_phase_d_return_state", "receipt_outcome" "cajas_phase_d_receipt_outcome",
  "article_id" TEXT, "stock_position_id" TEXT, "quantity" DECIMAL(24,4) NOT NULL, "stock_unit" TEXT,
  "scale_snapshot" SMALLINT, "lot_code_snapshot" TEXT, "serial_number_snapshot" TEXT, "identified_code_snapshot" TEXT, "expiration_date_snapshot" DATE,
  "evidence" JSONB, "reason" TEXT, "observations" TEXT, "source_operation_id" TEXT, "command_key" TEXT NOT NULL,
  "command_intent_hash" TEXT NOT NULL, "bundle_id" TEXT NOT NULL, "accepted_by_id" TEXT NOT NULL,
  "accepted_at" TIMESTAMPTZ(6) NOT NULL, "received_by_id" TEXT, "received_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cajas_phase_d_operation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_cpdo_company_command" UNIQUE ("company_id", "command_key")
);
CREATE INDEX "ix_cpdo_dispatch_line_kind" ON "cajas_phase_d_operation"("company_id", "dispatch_line_id", "kind");
CREATE INDEX "ix_cpdo_dispatch_time" ON "cajas_phase_d_operation"("company_id", "dispatch_id", "accepted_at");

CREATE TABLE "cajas_phase_d_reconciliation_event" (
  "id" TEXT NOT NULL, "company_id" TEXT NOT NULL, "dispatch_id" TEXT NOT NULL,
  "kind" "cajas_phase_d_reconciliation_event_kind" NOT NULL, "snapshot" JSONB NOT NULL, "reason" TEXT,
  "command_key" TEXT NOT NULL, "command_intent_hash" TEXT NOT NULL, "command_acceptance_id" TEXT NOT NULL, "audit_event_id" TEXT NOT NULL, "accepted_by_id" TEXT NOT NULL,
  "accepted_at" TIMESTAMPTZ(6) NOT NULL, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cajas_phase_d_reconciliation_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_cpdre_company_command" UNIQUE ("company_id", "command_key"),
  CONSTRAINT "uq_cpdre_command" UNIQUE ("company_id", "command_acceptance_id"),
  CONSTRAINT "uq_cpdre_audit" UNIQUE ("company_id", "audit_event_id"),
  CONSTRAINT "fk_cpdre_dispatch" FOREIGN KEY ("company_id", "dispatch_id") REFERENCES "cajas_dispatch"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "fk_cpdre_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT,
  CONSTRAINT "fk_cpdre_audit" FOREIGN KEY ("company_id", "audit_event_id") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT
);
CREATE INDEX "ix_cpdre_dispatch_time" ON "cajas_phase_d_reconciliation_event"("company_id", "dispatch_id", "accepted_at");

CREATE TABLE "cajas_phase_d_action_grant" (
  "id" TEXT NOT NULL, "company_id" TEXT NOT NULL, "user_id" TEXT NOT NULL,
  "action" "cajas_phase_d_action" NOT NULL, "granted_by_id" TEXT NOT NULL,
  "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cajas_phase_d_action_grant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_cpdgrant_company_user_action" UNIQUE ("company_id", "user_id", "action")
);

CREATE FUNCTION "fn_cajas_phase_d_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Phase D history is append-only'; END; $$;
CREATE TRIGGER "trg_cpdo_append_only" BEFORE UPDATE OR DELETE ON "cajas_phase_d_operation" FOR EACH ROW EXECUTE FUNCTION "fn_cajas_phase_d_append_only"();
CREATE TRIGGER "trg_cpdre_append_only" BEFORE UPDATE OR DELETE ON "cajas_phase_d_reconciliation_event" FOR EACH ROW EXECUTE FUNCTION "fn_cajas_phase_d_append_only"();
