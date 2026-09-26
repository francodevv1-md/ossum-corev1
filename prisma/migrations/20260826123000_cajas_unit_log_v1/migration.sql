-- CreateTable
CREATE TABLE "cajas_unit_log_entry" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "box_identified_unit_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "event_kind" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "command_acceptance_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_unit_log_entry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_cule_event_kind" CHECK ("event_kind" IN ('PROBLEM_REPORTED', 'REPAIR_SENT', 'REPAIR_RETURNED')),
    CONSTRAINT "ck_cule_note" CHECK (length(btrim("note")) > 0)
);

CREATE UNIQUE INDEX "uq_cule_company_id" ON "cajas_unit_log_entry"("company_id", "id");
CREATE UNIQUE INDEX "uq_cule_command" ON "cajas_unit_log_entry"("company_id", "command_acceptance_id");
CREATE INDEX "ix_cule_unit_time" ON "cajas_unit_log_entry"("company_id", "box_identified_unit_id", "occurred_at");
CREATE INDEX "ix_cule_assignment_time" ON "cajas_unit_log_entry"("company_id", "assignment_id", "occurred_at");

ALTER TABLE "cajas_unit_log_entry" ADD CONSTRAINT "fk_cule_company" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cajas_unit_log_entry" ADD CONSTRAINT "fk_cule_assignment" FOREIGN KEY ("company_id", "assignment_id", "box_identified_unit_id") REFERENCES "cajas_assignment"("company_id", "id", "box_identified_unit_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cajas_unit_log_entry" ADD CONSTRAINT "fk_cule_unit" FOREIGN KEY ("company_id", "box_identified_unit_id") REFERENCES "StockIdentifiedUnit"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cajas_unit_log_entry" ADD CONSTRAINT "fk_cule_article" FOREIGN KEY ("company_id", "article_id") REFERENCES "StockArticleEligibility"("companyId", "articleId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cajas_unit_log_entry" ADD CONSTRAINT "fk_cule_actor" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cajas_unit_log_entry" ADD CONSTRAINT "fk_cule_command" FOREIGN KEY ("company_id", "command_acceptance_id") REFERENCES "OperationalCommandAcceptance"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "public"."fn_cajas_unit_log_entry_append_only"() RETURNS trigger
LANGUAGE plpgsql
AS $cule$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas unit log entries are append-only';
END;
$cule$;

CREATE TRIGGER "trg_cajas_unit_log_entry_append_only"
BEFORE UPDATE OR DELETE ON "public"."cajas_unit_log_entry"
FOR EACH ROW
EXECUTE FUNCTION "public"."fn_cajas_unit_log_entry_append_only"();
