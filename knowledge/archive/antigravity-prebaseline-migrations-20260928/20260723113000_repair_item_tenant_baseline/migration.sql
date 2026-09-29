-- Repair tenant ownership for ConsumoItem and RemitoItem.
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

-- Deterministic physical-table order: quoted uppercase names, then lowercase names.
LOCK TABLE "Remito" IN SHARE MODE;
LOCK TABLE "RemitoItem" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "consumo" IN SHARE MODE;
LOCK TABLE "consumo_item" IN ACCESS EXCLUSIVE MODE;

ALTER TABLE "RemitoItem"
ADD COLUMN "company_id" TEXT;

ALTER TABLE "consumo_item"
ADD COLUMN "company_id" TEXT;

UPDATE "RemitoItem" AS item
SET "company_id" = parent."companyId"
FROM "Remito" AS parent
WHERE item."remitoId" = parent."id";

UPDATE "consumo_item" AS item
SET "company_id" = parent."companyId"
FROM "consumo" AS parent
WHERE item."consumoId" = parent."id";

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "RemitoItem" AS item
        LEFT JOIN "Remito" AS parent
            ON item."remitoId" = parent."id"
        WHERE parent."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'baseline repair: orphan RemitoItem.remitoId';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "consumo_item" AS item
        LEFT JOIN "consumo" AS parent
            ON item."consumoId" = parent."id"
        WHERE parent."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'baseline repair: orphan consumo_item.consumoId';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "RemitoItem" AS item
        WHERE item."company_id" IS NULL
    ) THEN
        RAISE EXCEPTION 'baseline repair: null RemitoItem.company_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "consumo_item" AS item
        WHERE item."company_id" IS NULL
    ) THEN
        RAISE EXCEPTION 'baseline repair: null consumo_item.company_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "RemitoItem" AS item
        JOIN "Remito" AS parent
            ON item."remitoId" = parent."id"
        WHERE item."company_id" <> parent."companyId"
    ) THEN
        RAISE EXCEPTION 'baseline repair: RemitoItem company mismatch';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "consumo_item" AS item
        JOIN "consumo" AS parent
            ON item."consumoId" = parent."id"
        WHERE item."company_id" <> parent."companyId"
    ) THEN
        RAISE EXCEPTION 'baseline repair: consumo_item company mismatch';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "Remito"
        GROUP BY "companyId", "id"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'baseline repair: duplicate uq_remito_company_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "consumo"
        GROUP BY "companyId", "id"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'baseline repair: duplicate uq_consumo_company_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "RemitoItem"
        GROUP BY "company_id", "id"
        HAVING COUNT(*) > 1
    ) OR EXISTS (
        SELECT 1
        FROM "RemitoItem"
        GROUP BY "company_id", "remitoId", "id"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'baseline repair: duplicate RemitoItem tenant invariant';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "consumo_item"
        GROUP BY "company_id", "id"
        HAVING COUNT(*) > 1
    ) OR EXISTS (
        SELECT 1
        FROM "consumo_item"
        GROUP BY "company_id", "consumoId", "id"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'baseline repair: duplicate consumo_item tenant invariant';
    END IF;
END
$$;

ALTER TABLE "RemitoItem"
ALTER COLUMN "company_id" SET NOT NULL;

ALTER TABLE "consumo_item"
ALTER COLUMN "company_id" SET NOT NULL;

CREATE UNIQUE INDEX "uq_remito_company_id"
ON "Remito"("companyId", "id");

CREATE UNIQUE INDEX "uq_consumo_company_id"
ON "consumo"("companyId", "id");

CREATE UNIQUE INDEX "uq_remito_item_company_id"
ON "RemitoItem"("company_id", "id");

CREATE UNIQUE INDEX "uq_remito_item_owner_id"
ON "RemitoItem"("company_id", "remitoId", "id");

CREATE INDEX "ix_remito_item_company_owner"
ON "RemitoItem"("company_id", "remitoId");

CREATE UNIQUE INDEX "uq_consumo_item_company_id"
ON "consumo_item"("company_id", "id");

CREATE UNIQUE INDEX "uq_consumo_item_owner_id"
ON "consumo_item"("company_id", "consumoId", "id");

CREATE INDEX "ix_consumo_item_company_owner"
ON "consumo_item"("company_id", "consumoId");

ALTER TABLE "RemitoItem"
DROP CONSTRAINT "RemitoItem_remitoId_fkey";

ALTER TABLE "consumo_item"
DROP CONSTRAINT "consumo_item_consumoId_fkey";

ALTER TABLE "RemitoItem"
ADD CONSTRAINT "fk_remito_item_owner"
FOREIGN KEY ("company_id", "remitoId")
REFERENCES "Remito"("companyId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "consumo_item"
ADD CONSTRAINT "fk_consumo_item_owner"
FOREIGN KEY ("company_id", "consumoId")
REFERENCES "consumo"("companyId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

COMMIT;
