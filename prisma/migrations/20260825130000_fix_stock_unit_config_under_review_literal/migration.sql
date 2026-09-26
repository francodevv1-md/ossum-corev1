-- The C14 guard compared a lower-snake-case PostgreSQL enum to an invalid
-- Prisma enum label. Replace only that proven literal and reject unexpected
-- function definitions rather than weakening the guard.
DO $migration$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef(to_regprocedure('public.fn_stock_unit_config_current_guard()'))
    INTO function_definition;

  IF function_definition IS NULL THEN
    RAISE EXCEPTION 'fn_stock_unit_config_current_guard() not found';
  END IF;

  IF position('''UNDER_REVIEW''' IN function_definition) > 0 THEN
    EXECUTE replace(function_definition, '''UNDER_REVIEW''', '''under_review''');
  ELSIF position('''under_review''' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected fn_stock_unit_config_current_guard() definition';
  END IF;
END;
$migration$;
