-- Qualify the reservation identifier in the joined aggregate used by the
-- reservation ceiling trigger. The original function resolves bare "id"
-- ambiguously between the CTE and StockReservation on PostgreSQL.
DO $migration$
DECLARE
  function_sql text;
  patched_sql text;
BEGIN
  function_sql := pg_get_functiondef('public.fn_stock_reservation_ceiling()'::regprocedure);
  patched_sql := replace(
    function_sql,
    'AND "id" <> NEW."reservationId" AND "live" > 0::numeric',
    'AND "reservation"."id" <> NEW."reservationId" AND "live" > 0::numeric'
  );

  IF patched_sql = function_sql THEN
    RAISE EXCEPTION 'Expected unqualified reservation id was not found in fn_stock_reservation_ceiling';
  END IF;

  EXECUTE patched_sql;
END;
$migration$;
