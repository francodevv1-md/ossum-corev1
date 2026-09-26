BEGIN;

-- Refuse to proceed unless the legacy index is exactly the two-column unique
-- implementation this forward migration replaces.
DO $$
DECLARE
  legacy_index_count integer;
BEGIN
  SELECT count(*)
    INTO legacy_index_count
    FROM pg_catalog.pg_class AS index_class
    JOIN pg_catalog.pg_namespace AS index_namespace
      ON index_namespace.oid = index_class.relnamespace
    JOIN pg_catalog.pg_index AS index_definition
      ON index_definition.indexrelid = index_class.oid
    JOIN pg_catalog.pg_class AS table_class
      ON table_class.oid = index_definition.indrelid
    JOIN pg_catalog.pg_namespace AS table_namespace
      ON table_namespace.oid = table_class.relnamespace
   WHERE index_namespace.nspname = 'public'
     AND index_class.relname = 'uq_sre_command'
     AND table_namespace.nspname = 'public'
     AND table_class.relname = 'StockReservationEvidence'
     AND index_definition.indisunique
     AND NOT index_definition.indisprimary
     AND index_definition.indpred IS NULL
     AND index_definition.indexprs IS NULL
     AND index_definition.indnkeyatts = 2
     AND index_definition.indnatts = 2
     AND ARRAY(
       SELECT attribute_definition.attname
         FROM unnest(index_definition.indkey) WITH ORDINALITY AS key_column(attribute_number, ordinal)
         JOIN pg_catalog.pg_attribute AS attribute_definition
           ON attribute_definition.attrelid = table_class.oid
          AND attribute_definition.attnum = key_column.attribute_number
        ORDER BY key_column.ordinal
      ) = ARRAY['companyId', 'commandAcceptanceId']::name[];

  IF legacy_index_count <> 1 THEN
    RAISE EXCEPTION 'Expected exact legacy unique index public.uq_sre_command on public.StockReservationEvidence(companyId, commandAcceptanceId); found % matching indexes', legacy_index_count;
  END IF;
END $$;

-- Keep duplicate protection continuously active: the narrower legacy index is
-- removed only after the reservation-specific index exists in this transaction.
CREATE UNIQUE INDEX "uq_sre_command_reservation"
  ON "StockReservationEvidence"("companyId", "commandAcceptanceId", "reservationId");

DROP INDEX "public"."uq_sre_command";

COMMIT;
