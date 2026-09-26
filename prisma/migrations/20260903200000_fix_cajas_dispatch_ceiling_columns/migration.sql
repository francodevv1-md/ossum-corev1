-- Cajas tables use snake_case physical columns. Correct the dispatch ceiling
-- trigger references while preserving camelCase StockEvidenceLine columns.
DO $migration$
DECLARE
  function_sql text;
  patched_sql text;
BEGIN
  function_sql := pg_get_functiondef('public.fn_cajas_dispatch_ceiling()'::regprocedure);
  patched_sql := replace(function_sql, '"control"."articleId"', '"control"."article_id"');
  patched_sql := replace(patched_sql, '"control"."stockPositionId"', '"control"."stock_position_id"');
  patched_sql := replace(patched_sql, '"control"."stockUnit"', '"control"."stock_unit"');
  patched_sql := replace(patched_sql, '"control"."scaleSnapshot"', '"control"."scale_snapshot"');
  patched_sql := replace(patched_sql, '"source"."articleId"', '"source"."article_id"');
  patched_sql := replace(patched_sql, '"source"."stockPositionId"', '"source"."stock_position_id"');
  patched_sql := replace(patched_sql, '"source"."stockUnit"', '"source"."stock_unit"');
  patched_sql := replace(patched_sql, '"source"."scaleSnapshot"', '"source"."scale_snapshot"');

  IF patched_sql = function_sql THEN
    RAISE EXCEPTION 'Expected camelCase Cajas control columns were not found in fn_cajas_dispatch_ceiling';
  END IF;

  EXECUTE patched_sql;
END;
$migration$;
