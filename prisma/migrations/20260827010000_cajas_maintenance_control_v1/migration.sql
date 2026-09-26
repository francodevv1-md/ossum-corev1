CREATE TYPE "cajas_maintenance_kind" AS ENUM ('repair', 'preventive_maintenance');
CREATE TYPE "cajas_maintenance_status" AS ENUM ('open', 'sent', 'returned_pending_review', 'closed', 'cancelled');

CREATE TABLE "cajas_maintenance_case" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "box_identified_unit_id" TEXT NOT NULL,
    "article_id" TEXT,
    "kind" "cajas_maintenance_kind" NOT NULL,
    "status" "cajas_maintenance_status" NOT NULL,
    "description" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "opened_at" TIMESTAMPTZ(6) NOT NULL,
    "opened_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cajas_maintenance_case_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_cmc_version_description" CHECK ("version" >= 1 AND length(btrim("description")) > 0)
);

CREATE TABLE "cajas_maintenance_transition" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "from_status" "cajas_maintenance_status",
    "to_status" "cajas_maintenance_status" NOT NULL,
    "note" TEXT,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_by_id" TEXT NOT NULL,
    "command_acceptance_id" TEXT NOT NULL,
    "audit_event_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_maintenance_transition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_cmt_sequence_note_edge" CHECK (
        "sequence" >= 1
        AND ("note" IS NULL OR length(btrim("note")) > 0)
        AND (
            ("sequence" = 1 AND "from_status" IS NULL AND "to_status" = 'open')
            OR (
                "sequence" > 1
                AND "from_status" IS NOT NULL
                AND (
                    ("from_status" = 'open' AND "to_status" IN ('sent', 'cancelled'))
                    OR ("from_status" = 'sent' AND "to_status" = 'returned_pending_review')
                    OR ("from_status" = 'returned_pending_review' AND "to_status" = 'closed')
                )
            )
        )
    )
);

CREATE UNIQUE INDEX "uq_cmc_company_id" ON "cajas_maintenance_case"("company_id", "id");
CREATE INDEX "ix_cmc_unit_status_updated" ON "cajas_maintenance_case"("company_id", "box_identified_unit_id", "status", "updated_at");

CREATE UNIQUE INDEX "uq_cmt_company_id" ON "cajas_maintenance_transition"("company_id", "id");
CREATE UNIQUE INDEX "uq_cmt_case_sequence" ON "cajas_maintenance_transition"("company_id", "case_id", "sequence");
CREATE UNIQUE INDEX "uq_cmt_command" ON "cajas_maintenance_transition"("company_id", "command_acceptance_id");
CREATE UNIQUE INDEX "uq_cmt_audit" ON "cajas_maintenance_transition"("company_id", "audit_event_id");
CREATE INDEX "ix_cmt_case_time" ON "cajas_maintenance_transition"("company_id", "case_id", "accepted_at");

ALTER TABLE "cajas_maintenance_case" ADD CONSTRAINT "fk_cmc_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cajas_maintenance_case" ADD CONSTRAINT "fk_cmc_unit" FOREIGN KEY ("company_id", "box_identified_unit_id") REFERENCES "StockIdentifiedUnit"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cajas_maintenance_case" ADD CONSTRAINT "fk_cmc_article" FOREIGN KEY ("company_id", "article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cajas_maintenance_case" ADD CONSTRAINT "fk_cmc_opened_by" FOREIGN KEY ("opened_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cajas_maintenance_transition" ADD CONSTRAINT "fk_cmt_case" FOREIGN KEY ("company_id", "case_id") REFERENCES "cajas_maintenance_case"("company_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cajas_maintenance_transition" ADD CONSTRAINT "fk_cmt_actor" FOREIGN KEY ("accepted_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cajas_maintenance_transition" ADD CONSTRAINT "fk_cmt_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cajas_maintenance_transition" ADD CONSTRAINT "fk_cmt_audit" FOREIGN KEY ("company_id", "audit_event_id") REFERENCES "AuditEvent"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "public"."fn_cmc_guard"() RETURNS trigger
LANGUAGE plpgsql
AS $cmc$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'open' OR NEW."version" <> 1 THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance cases must start open at version 1';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance cases cannot be deleted';
  END IF;

  IF OLD."id" IS DISTINCT FROM NEW."id"
     OR OLD."company_id" IS DISTINCT FROM NEW."company_id"
     OR OLD."box_identified_unit_id" IS DISTINCT FROM NEW."box_identified_unit_id"
     OR OLD."article_id" IS DISTINCT FROM NEW."article_id"
     OR OLD."kind" IS DISTINCT FROM NEW."kind"
     OR OLD."description" IS DISTINCT FROM NEW."description"
     OR OLD."opened_at" IS DISTINCT FROM NEW."opened_at"
     OR OLD."opened_by_id" IS DISTINCT FROM NEW."opened_by_id"
     OR OLD."created_at" IS DISTINCT FROM NEW."created_at" THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance case identity and opening evidence are immutable';
  END IF;

  IF NEW."version" <> OLD."version" + 1
     OR NOT (
       (OLD."status" = 'open' AND NEW."status" IN ('sent', 'cancelled'))
       OR (OLD."status" = 'sent' AND NEW."status" = 'returned_pending_review')
       OR (OLD."status" = 'returned_pending_review' AND NEW."status" = 'closed')
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'invalid cajas maintenance case transition';
  END IF;

  RETURN NEW;
END;
$cmc$;

CREATE TRIGGER "trg_cmc_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "public"."cajas_maintenance_case"
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cmc_guard"();

CREATE FUNCTION "public"."fn_cmt_append_only"() RETURNS trigger
LANGUAGE plpgsql
AS $cmt$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance transitions are append-only';
END;
$cmt$;

CREATE TRIGGER "trg_cmt_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_maintenance_transition"
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cmt_append_only"();

CREATE FUNCTION "public"."fn_cmt_insert_guard"() RETURNS trigger
LANGUAGE plpgsql
AS $cmt_insert$
DECLARE
  previous_status "cajas_maintenance_status";
  case_opened_at TIMESTAMPTZ(6);
  case_opened_by_id TEXT;
  accepted_command RECORD;
  audit_event RECORD;
  expected_checkpoint TEXT;
  expected_action TEXT;
BEGIN
  IF NEW."sequence" = 1 THEN
    SELECT "opened_at", "opened_by_id"
      INTO case_opened_at, case_opened_by_id
      FROM "public"."cajas_maintenance_case"
     WHERE "company_id" = NEW."company_id" AND "id" = NEW."case_id";

    IF case_opened_at IS DISTINCT FROM NEW."accepted_at"
       OR case_opened_by_id IS DISTINCT FROM NEW."accepted_by_id" THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance opening attribution is inconsistent';
    END IF;
  ELSE
    SELECT "to_status"
      INTO previous_status
      FROM "public"."cajas_maintenance_transition"
     WHERE "company_id" = NEW."company_id"
       AND "case_id" = NEW."case_id"
       AND "sequence" = NEW."sequence" - 1;

    IF NOT FOUND OR previous_status IS DISTINCT FROM NEW."from_status" THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance transition history must be contiguous';
    END IF;
  END IF;

  expected_checkpoint := CASE WHEN NEW."sequence" = 1 THEN 'maintenance-case-create' ELSE 'maintenance-case-transition' END;
  expected_action := CASE WHEN NEW."sequence" = 1 THEN 'maintenance_case_opened' ELSE 'maintenance_case_transitioned' END;

  SELECT *
    INTO accepted_command
    FROM "public"."OperationalCommandAcceptance"
   WHERE "companyId" = NEW."company_id" AND "id" = NEW."command_acceptance_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance command attribution is missing';
  END IF;

  IF accepted_command."domain" IS DISTINCT FROM 'cajas'
     OR accepted_command."checkpoint" IS DISTINCT FROM expected_checkpoint
     OR accepted_command."resultEntityType" IS DISTINCT FROM 'CajasMaintenanceCase'
     OR accepted_command."resultEntityId" IS DISTINCT FROM NEW."case_id"
     OR accepted_command."acceptedById" IS DISTINCT FROM NEW."accepted_by_id"
     OR accepted_command."acceptedAt" IS DISTINCT FROM NEW."accepted_at"
     OR accepted_command."auditEventId" IS DISTINCT FROM NEW."audit_event_id" THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance command attribution is inconsistent';
  END IF;

  SELECT *
    INTO audit_event
    FROM "public"."AuditEvent"
   WHERE "companyId" = NEW."company_id" AND "id" = NEW."audit_event_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance audit attribution is missing';
  END IF;

  IF audit_event."userId" IS DISTINCT FROM NEW."accepted_by_id"
     OR audit_event."entityType" IS DISTINCT FROM 'CajasMaintenanceCase'
     OR audit_event."entityId" IS DISTINCT FROM NEW."case_id"
     OR audit_event."action" IS DISTINCT FROM expected_action
     OR audit_event."module" IS DISTINCT FROM 'cajas'
     OR audit_event."createdAt" IS DISTINCT FROM NEW."accepted_at" THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance audit attribution is inconsistent';
  END IF;

  RETURN NEW;
END;
$cmt_insert$;

CREATE TRIGGER "trg_cmt_insert_guard"
BEFORE INSERT ON "public"."cajas_maintenance_transition"
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cmt_insert_guard"();

CREATE FUNCTION "public"."fn_cmt_audit_evidence_guard"() RETURNS trigger
LANGUAGE plpgsql
AS $cmt_audit$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "public"."cajas_maintenance_transition"
     WHERE "company_id" = OLD."companyId" AND "audit_event_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance audit evidence is immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$cmt_audit$;

CREATE TRIGGER "trg_cmt_audit_evidence_guard"
BEFORE UPDATE OR DELETE ON "public"."AuditEvent"
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cmt_audit_evidence_guard"();

CREATE FUNCTION "public"."fn_cajas_maintenance_consistency"() RETURNS trigger
LANGUAGE plpgsql
AS $consistency$
DECLARE
  target_company_id TEXT;
  target_case_id TEXT;
  case_version INTEGER;
  case_status "cajas_maintenance_status";
  transition_sequence INTEGER;
  transition_status "cajas_maintenance_status";
BEGIN
  target_company_id := NEW."company_id";
  IF TG_TABLE_NAME = 'cajas_maintenance_case' THEN
    target_case_id := NEW."id";
  ELSE
    target_case_id := NEW."case_id";
  END IF;

  SELECT "version", "status"
    INTO case_version, case_status
    FROM "public"."cajas_maintenance_case"
   WHERE "company_id" = target_company_id AND "id" = target_case_id;

  SELECT "sequence", "to_status"
    INTO transition_sequence, transition_status
    FROM "public"."cajas_maintenance_transition"
   WHERE "company_id" = target_company_id AND "case_id" = target_case_id
   ORDER BY "sequence" DESC
   LIMIT 1;

  IF case_version IS NULL
     OR transition_sequence IS NULL
     OR case_version <> transition_sequence
     OR case_status IS DISTINCT FROM transition_status THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance case and transition history are inconsistent';
  END IF;

  RETURN NULL;
END;
$consistency$;

CREATE CONSTRAINT TRIGGER "ctrg_cmc_transition_consistency"
AFTER INSERT OR UPDATE ON "public"."cajas_maintenance_case"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cajas_maintenance_consistency"();

CREATE CONSTRAINT TRIGGER "ctrg_cmt_case_consistency"
AFTER INSERT ON "public"."cajas_maintenance_transition"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "public"."fn_cajas_maintenance_consistency"();
