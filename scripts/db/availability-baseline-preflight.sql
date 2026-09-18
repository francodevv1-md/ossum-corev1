\set ON_ERROR_STOP on

\if :{?expected_database}
\else
  \echo 'ERROR: expected_database psql variable is required'
  \quit 3
\endif
\if :{?expected_schema}
\else
  \echo 'ERROR: expected_schema psql variable is required'
  \quit 3
\endif

BEGIN TRANSACTION READ ONLY;

SELECT current_database() = :'expected_database'
   AND current_schema() = :'expected_schema' AS assertion_ok
\gset
\if :assertion_ok
\else
  \echo 'ERROR: database or schema target mismatch'
  ROLLBACK;
  \quit 3
\endif

WITH
expected_migrations(name, checksum) AS (VALUES
  ('20260606063628_init_backend_foundation','32f85a51585909d997e292f667aa0405e57fd6ac69f7edf309216efcd0a2f69e'),
  ('20260615153000_surgery_phase1_core','7aa835e72e9fa1b239f4f691c69a4bad370d4a92991c67a310b17353afbf2d1e'),
  ('20260629110404_add_seguimiento_entry','4a3240dc2153b45a663b78425db9b0ca03e243c57d24a8a37e46d4ada04a83f8'),
  ('20260701142201_add_digital_receipts','607c81f605d8422cd6f6dfdba0e7940754cdf8ada2ba7d430cff77bd9eb42274'),
  ('20260703113000_add_user_module_view_preference_history','1c775a16ddd70cef07abbe7f458b89c3a4353e1aa6cac52ad600c3b302062f90'),
  ('20260703133500_add_internal_notifications_mentions','3af589fc871b8680bcf2de6f7fe12a84b4e4b5450f7856d0aa82b90d53546c4e'),
  ('20260707091809_add_remito_unificado','4d727063e0eaa0571c1149998823edb5ea7e94b6b71b1097547fec79f3b3e755'),
  ('20260707163042_add_consumo_devolucion','732232370294b2126accfd1944d93f42ee2370a5cf216e4439df45684b8a3a5d'),
  ('20260707173000_add_presupuesto_core','6bbe84b50a5b43708de135d0dc6894795bae48fdcb20c3c974712e6e67abe425'),
  ('20260707192335_rename_internal_notification_index','b8d990feda8173fd3e18dbfaf52c88c9f8ad519307565bad93962cf147ffd55f'),
  ('20260707193000_add_invoice_payment_core','2ee07cb0a8f927758bd601c7ae96d6534f385ef0ba537acad04ef72788695d6d'),
  ('20260708014500_add_surgery_archive_fields','9064324044c1830f8bedf0c9f144ffea6a8e4a6e3282034a5894c4ee59ea9b58'),
  ('20260714215000_add_item_trace_lot_expiration','2bdc67699558aa1ec4fffa8a90b17f9545fa997c774f82846d225be6c0e7ce65')
),
expected_required_indexes(name, table_name, is_unique, columns) AS (VALUES
  ('UserCompanyAccess_userId_companyId_key', 'UserCompanyAccess', TRUE, ARRAY['userId','companyId']::text[]),
  ('InternalNotification_companyId_recipientUserId_readAt_creat_idx', 'InternalNotification', FALSE, ARRAY['companyId','recipientUserId','readAt','createdAt']::text[])
),
expected_absent_indexes(name) AS (VALUES
  ('uq_devolucion_company_id'), ('uq_surgery_company_id'), ('uq_audit_event_company_id'),
  ('uq_devolucion_item_company_id'), ('uq_devolucion_item_owner_id'),
  ('ix_devolucion_item_company_owner')
),
expected_absent_types(name) AS (VALUES
  ('CompanyOperationalDesignation'), ('AvailabilityRequestStatus'),
  ('AvailabilityCreatorResolution'), ('AvailabilityRecipientReason'),
  ('AvailabilityCommandType')
),
expected_absent_tables(name) AS (VALUES
  ('CompanyOperationalAssignee'), ('AvailabilityRequest'),
  ('AvailabilityRequestRecipientAssignment'), ('AvailabilityCommand')
),
expected_absent_columns(table_name, column_name) AS (VALUES
  ('Surgery','createdById'), ('Surgery','materialAvailabilityDate'),
  ('InternalNotification','availabilityRequestId')
),
actual_indexes AS (
  SELECT ic.relname AS name, tc.relname AS table_name, i.indisunique AS is_unique,
         ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord)
               JOIN pg_attribute a ON a.attrelid=tc.oid AND a.attnum=k.attnum
               WHERE k.ord<=i.indnkeyatts ORDER BY k.ord) AS columns
  FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid
  JOIN pg_class tc ON tc.oid=i.indrelid JOIN pg_namespace n ON n.oid=tc.relnamespace
  WHERE n.nspname=:'expected_schema'
),
actual_fks AS (
  SELECT c.conname AS name, child.relname AS child_table, parent.relname AS parent_table,
         ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
               JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columns,
         ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
               JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord) AS ref_columns,
         c.confdeltype, c.confupdtype
  FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid
  JOIN pg_class parent ON parent.oid=c.confrelid
  JOIN pg_namespace n ON n.oid=child.relnamespace AND n.oid=parent.relnamespace
  WHERE n.nspname=:'expected_schema' AND c.contype='f'
),
violations(reason) AS (
  SELECT 'predecessor migration set/status mismatch'
  WHERE (SELECT COUNT(*) FROM "_prisma_migrations")<>13
     OR EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "finished_at" IS NULL OR "rolled_back_at" IS NOT NULL)
     OR EXISTS ((SELECT "migration_name" FROM "_prisma_migrations") EXCEPT (SELECT name FROM expected_migrations))
     OR EXISTS ((SELECT name FROM expected_migrations) EXCEPT (SELECT "migration_name" FROM "_prisma_migrations"))
     OR EXISTS (SELECT 1 FROM expected_migrations e JOIN "_prisma_migrations" m
       ON m."migration_name"=e.name WHERE m."checksum"<>e.checksum)
  UNION ALL SELECT 'repair or Availability migration already recorded' WHERE EXISTS (
    SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" IN
      ('20260722150000_repair_availability_prerequisites','20260722160000_add_availability_request_foundation'))
  UNION ALL SELECT 'legacy devolucion-item FK mismatch' WHERE NOT EXISTS (
    SELECT 1 FROM actual_fks WHERE name='devolucion_item_devolucionId_fkey'
      AND child_table='devolucion_item' AND parent_table='devolucion'
      AND columns=ARRAY['devolucionId'] AND ref_columns=ARRAY['id']
      AND confdeltype='c' AND confupdtype='c')
  UNION ALL SELECT 'devolucion_item.company_id unexpectedly present' WHERE EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema=:'expected_schema'
      AND table_name='devolucion_item' AND column_name='company_id')
  UNION ALL SELECT 'repair index unexpectedly present' WHERE EXISTS (
    SELECT 1 FROM expected_absent_indexes e JOIN actual_indexes a USING(name))
  UNION ALL SELECT 'repair composite FK unexpectedly present' WHERE EXISTS (
    SELECT 1 FROM actual_fks WHERE name='fk_devolucion_item_owner')
  UNION ALL SELECT 'required prerequisite index mismatch' WHERE EXISTS (
    SELECT 1 FROM expected_required_indexes e LEFT JOIN actual_indexes a USING(name)
    WHERE a.name IS NULL OR (a.table_name,a.is_unique,a.columns)
      IS DISTINCT FROM (e.table_name,e.is_unique,e.columns))
  UNION ALL SELECT 'Availability enum type unexpectedly present' WHERE EXISTS (
    SELECT 1 FROM expected_absent_types e JOIN pg_type t ON t.typname=e.name
    JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=:'expected_schema')
  UNION ALL SELECT 'Availability notification enum labels unexpectedly present' WHERE EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
    JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=:'expected_schema'
      AND t.typname='InternalNotificationType' AND e.enumlabel IN
      ('availability_request_actionable','availability_request_completed','availability_pivot_reassigned'))
  UNION ALL SELECT 'Availability table unexpectedly present' WHERE EXISTS (
    SELECT 1 FROM expected_absent_tables e JOIN information_schema.tables t ON t.table_name=e.name
    WHERE t.table_schema=:'expected_schema')
  UNION ALL SELECT 'Availability alteration column unexpectedly present' WHERE EXISTS (
    SELECT 1 FROM expected_absent_columns e JOIN information_schema.columns c
      ON (c.table_name,c.column_name)=(e.table_name,e.column_name)
    WHERE c.table_schema=:'expected_schema')
)
SELECT COUNT(*)=0 AS assertion_ok, COALESCE(string_agg(reason,'; '),'ok') AS failure_reasons
FROM violations
\gset
\if :assertion_ok
\else
  \echo 'ERROR:' :failure_reasons
  ROLLBACK;
  \quit 3
\endif

WITH candidates AS (
  SELECT i."id", COUNT(d."id") AS matches, MIN(d."companyId") AS min_company,
         MAX(d."companyId") AS max_company
  FROM "devolucion_item" i LEFT JOIN "devolucion" d ON d."id"=i."devolucionId"
  GROUP BY i."id"
), duplicate_groups AS (
  SELECT 1 FROM "devolucion" GROUP BY "companyId","id" HAVING COUNT(*)>1
  UNION ALL SELECT 1 FROM "Surgery" GROUP BY "companyId","id" HAVING COUNT(*)>1
  UNION ALL SELECT 1 FROM "AuditEvent" GROUP BY "companyId","id" HAVING COUNT(*)>1
  UNION ALL SELECT 1 FROM "devolucion_item" i JOIN "devolucion" d ON d."id"=i."devolucionId"
    GROUP BY d."companyId",i."id" HAVING COUNT(*)>1
  UNION ALL SELECT 1 FROM "devolucion_item" i JOIN "devolucion" d ON d."id"=i."devolucionId"
    GROUP BY d."companyId",i."devolucionId",i."id" HAVING COUNT(*)>1
)
SELECT (SELECT COUNT(*) FROM "devolucion") AS parent_count,
       (SELECT COUNT(*) FROM "devolucion_item") AS child_count,
       COUNT(*) FILTER (WHERE matches=0) AS orphan_count,
       COUNT(*) FILTER (WHERE matches>0 AND min_company IS NULL) AS candidate_null_count,
       COUNT(*) FILTER (WHERE matches>1 AND min_company IS DISTINCT FROM max_company) AS candidate_mismatch_count,
       (SELECT COUNT(*) FROM duplicate_groups) AS candidate_duplicate_count,
       COUNT(*) FILTER (WHERE matches=0 OR min_company IS NULL
          OR (matches>1 AND min_company IS DISTINCT FROM max_company))=0
          AND (SELECT COUNT(*) FROM duplicate_groups)=0 AS assertion_ok
FROM candidates
\gset
\echo 'COUNTS parent=' :parent_count 'child=' :child_count 'orphan=' :orphan_count 'candidate_null=' :candidate_null_count 'candidate_mismatch=' :candidate_mismatch_count 'candidate_duplicate=' :candidate_duplicate_count
\if :assertion_ok
\else
  \echo 'ERROR: baseline aggregate anomaly blocks repair migration'
  ROLLBACK;
  \quit 3
\endif

SELECT c.relname AS relation_name, pg_relation_size(c.oid) AS relation_bytes,
       pg_total_relation_size(c.oid) AS total_relation_bytes
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname=:'expected_schema'
  AND c.relname IN ('devolucion','devolucion_item','Surgery','AuditEvent')
ORDER BY c.relname;

ROLLBACK;
