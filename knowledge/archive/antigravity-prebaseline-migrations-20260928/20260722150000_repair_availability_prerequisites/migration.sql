-- Repair tenant ownership prerequisites required by the Availability migration.
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

LOCK TABLE "devolucion_item" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "devolucion" IN SHARE MODE;

ALTER TABLE "devolucion_item"
ADD COLUMN "company_id" TEXT;

UPDATE "devolucion_item" AS item
SET "company_id" = parent."companyId"
FROM "devolucion" AS parent
WHERE item."devolucionId" = parent."id";

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "devolucion_item" AS item
        LEFT JOIN "devolucion" AS parent
            ON item."devolucionId" = parent."id"
        WHERE parent."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'baseline repair: orphan devolucion_item.devolucionId';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "devolucion_item" AS item
        WHERE item."company_id" IS NULL
    ) THEN
        RAISE EXCEPTION 'baseline repair: null devolucion_item.company_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "devolucion_item" AS item
        JOIN "devolucion" AS parent
            ON item."devolucionId" = parent."id"
        WHERE item."company_id" <> parent."companyId"
    ) THEN
        RAISE EXCEPTION 'baseline repair: devolucion_item company mismatch';
    END IF;
END
$$;

ALTER TABLE "devolucion_item"
ALTER COLUMN "company_id" SET NOT NULL;

CREATE UNIQUE INDEX "uq_devolucion_company_id"
ON "devolucion"("companyId", "id");

CREATE UNIQUE INDEX "uq_surgery_company_id"
ON "Surgery"("companyId", "id");

CREATE UNIQUE INDEX "uq_audit_event_company_id"
ON "AuditEvent"("companyId", "id");

CREATE UNIQUE INDEX "uq_devolucion_item_company_id"
ON "devolucion_item"("company_id", "id");

CREATE UNIQUE INDEX "uq_devolucion_item_owner_id"
ON "devolucion_item"("company_id", "devolucionId", "id");

CREATE INDEX "ix_devolucion_item_company_owner"
ON "devolucion_item"("company_id", "devolucionId");

ALTER TABLE "devolucion_item"
DROP CONSTRAINT "devolucion_item_devolucionId_fkey";

ALTER TABLE "devolucion_item"
ADD CONSTRAINT "fk_devolucion_item_owner"
FOREIGN KEY ("company_id", "devolucionId")
REFERENCES "devolucion"("companyId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

COMMIT;
