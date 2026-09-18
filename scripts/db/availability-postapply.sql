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

SELECT current_database()=:'expected_database'
   AND current_schema()=:'expected_schema' AS assertion_ok
\gset
\if :assertion_ok
\else
  \echo 'ERROR: database or schema target mismatch'
  ROLLBACK;
  \quit 3
\endif

WITH examples(raw_definition, expected_definition) AS (VALUES
  ('CHECK (("type" = ANY (ARRAY[''REQUEST''::"AvailabilityCommandType", ''COMPLETE''::"AvailabilityCommandType"])))','check(typein(''request'',''complete''))'),
  ('CHECK (("type" <> ALL (ARRAY[''A''::text, ''B''::text])))','check(typenotin(''a'',''b''))'),
  ('CHECK ((("payloadHash")::text ~ ''^[0-9a-f]{64}$''::text))','check(payloadhash~''^[0-9a-f]{64}$'')'),
  ('CHECK (((char_length("idempotencyKey") >= 16) AND (char_length("idempotencyKey") <= 128) AND (("idempotencyKey")::text ~ ''^[!-~]+$''::text)))','check(char_length(idempotencykey)between16and128andidempotencykey~''^[!-~]+$'')')
), normalized AS (
  SELECT expected_definition, regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(lower(raw_definition),
      '::("[^"]+"|text|character[[:space:]]+varying|bpchar)','','g'),
      '[[:space:]"]','','g'),'=any\(array\[([^]]+)\]\)','in(\1)','g'),
      '<>all\(array\[([^]]+)\]\)','notin(\1)','g'),
      '\((payloadhash|idempotencykey)\)~','\1~','g'),
      '\((payloadhash|idempotencykey)(~''[^'']+'')\)','\1\2','g'),
      '\(?char_length\(idempotencykey\)>=16\)?and\(?char_length\(idempotencykey\)<=128\)?and',
      'char_length(idempotencykey)between16and128and','g'),
      '^check\(\((.*)\)\)$','check(\1)') AS actual_definition FROM examples
)
SELECT BOOL_AND(actual_definition=expected_definition) AS assertion_ok FROM normalized
\gset
\if :assertion_ok
\else
  \echo 'ERROR: CHECK normalizer representative cases failed'
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
  ('20260714215000_add_item_trace_lot_expiration','2bdc67699558aa1ec4fffa8a90b17f9545fa997c774f82846d225be6c0e7ce65'),
  ('20260722150000_repair_availability_prerequisites','2a481ac5097efe9a5ca75466da563b5b4d08ec05ef1b1864d47dfb06dc8947e3'),
  ('20260722160000_add_availability_request_foundation','8814ee032118e1392c0f1031d021073f2c1c1f9fdaf652b579200fc4c5ec647e')
),
expected_enums(name, labels) AS (VALUES
  ('CompanyOperationalDesignation',ARRAY['PIVOT']::text[]),
  ('AvailabilityRequestStatus',ARRAY['OPEN','COMPLETED']::text[]),
  ('AvailabilityCreatorResolution',ARRAY['IDENTIFIED_ELIGIBLE','NOT_IDENTIFIED','IDENTIFIED_INACTIVE','IDENTIFIED_NO_COMPANY_ACCESS']::text[]),
  ('AvailabilityRecipientReason',ARRAY['CREATOR','PIVOT']::text[]),
  ('AvailabilityCommandType',ARRAY['REQUEST','COMPLETE','CORRECT','REASSIGN_PIVOT']::text[]),
  ('InternalNotificationType',ARRAY['seguimiento_mention','availability_request_actionable','availability_request_completed','availability_pivot_reassigned']::text[])
),
expected_tables(name, columns) AS (VALUES
  ('CompanyOperationalAssignee',ARRAY['id','companyId','userId','designation','version','createdById','updatedById','createdAt','updatedAt']::text[]),
  ('AvailabilityRequest',ARRAY['id','companyId','surgeryId','requesterUserId','status','creatorResolution','creatorUserIdSnapshot','creatorAuditEventId','pivotUserIdAtCreation','pivotMappingVersion','requestedAt','completedAt','completedByUserId','submittedDate','completionCommandId','correlationId','createdAt','updatedAt']::text[]),
  ('AvailabilityRequestRecipientAssignment',ARRAY['id','availabilityRequestId','companyId','userId','reason','assignedAt','assignedByUserId','revokedAt','revokedByUserId','revokeReason','correlationId']::text[]),
  ('AvailabilityCommand',ARRAY['id','companyId','actorUserId','type','idempotencyKey','payloadHash','requestId','surgeryId','completedAt','resultCode','createdAt']::text[])
),
expected_index_keys(name, table_name, is_unique, is_primary, columns, opclasses, collations, predicate, backing_type) AS (VALUES
  ('uq_devolucion_company_id','devolucion',TRUE,FALSE,ARRAY['companyId','id']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL::"char"),
  ('uq_surgery_company_id','Surgery',TRUE,FALSE,ARRAY['companyId','id']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('uq_audit_event_company_id','AuditEvent',TRUE,FALSE,ARRAY['companyId','id']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('uq_devolucion_item_company_id','devolucion_item',TRUE,FALSE,ARRAY['company_id','id']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('uq_devolucion_item_owner_id','devolucion_item',TRUE,FALSE,ARRAY['company_id','devolucionId','id']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('ix_devolucion_item_company_owner','devolucion_item',FALSE,FALSE,ARRAY['company_id','devolucionId']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('UserCompanyAccess_userId_companyId_key','UserCompanyAccess',TRUE,FALSE,ARRAY['userId','companyId']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('CompanyOperationalAssignee_pkey','CompanyOperationalAssignee',TRUE,TRUE,ARRAY['id']::text[],ARRAY['pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default']::text[],NULL,'p'),
  ('AvailabilityRequest_pkey','AvailabilityRequest',TRUE,TRUE,ARRAY['id']::text[],ARRAY['pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default']::text[],NULL,'p'),
  ('AvailabilityRequestRecipientAssignment_pkey','AvailabilityRequestRecipientAssignment',TRUE,TRUE,ARRAY['id']::text[],ARRAY['pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default']::text[],NULL,'p'),
  ('AvailabilityCommand_pkey','AvailabilityCommand',TRUE,TRUE,ARRAY['id']::text[],ARRAY['pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default']::text[],NULL,'p'),
  ('ix_surgery_company_material_availability','Surgery',FALSE,FALSE,ARRAY['companyId','materialAvailabilityDate']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.date_ops']::text[],ARRAY['pg_catalog.default','-']::text[],NULL,NULL),
  ('ix_surgery_company_created_by','Surgery',FALSE,FALSE,ARRAY['companyId','createdById']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('uq_company_operational_assignee_designation','CompanyOperationalAssignee',TRUE,FALSE,ARRAY['companyId','designation']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.enum_ops']::text[],ARRAY['pg_catalog.default','-']::text[],NULL,NULL),
  ('ix_company_operational_assignee_user_company','CompanyOperationalAssignee',FALSE,FALSE,ARRAY['userId','companyId']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('uq_availability_request_company_id','AvailabilityRequest',TRUE,FALSE,ARRAY['companyId','id']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('uq_availability_request_company_surgery_id','AvailabilityRequest',TRUE,FALSE,ARRAY['companyId','surgeryId','id']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('uq_availability_request_completion_command','AvailabilityRequest',TRUE,FALSE,ARRAY['companyId','completionCommandId']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('uq_availability_request_correlation','AvailabilityRequest',TRUE,FALSE,ARRAY['correlationId']::text[],ARRAY['pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default']::text[],NULL,NULL),
  ('availability_request_one_open_per_surgery','AvailabilityRequest',TRUE,FALSE,ARRAY['companyId','surgeryId']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],'(status=''open'')',NULL),
  ('ix_availability_request_company_surgery_status','AvailabilityRequest',FALSE,FALSE,ARRAY['companyId','surgeryId','status']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops','pg_catalog.enum_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default','-']::text[],NULL,NULL),
  ('ix_availability_request_company_requester_requested','AvailabilityRequest',FALSE,FALSE,ARRAY['companyId','requesterUserId','requestedAt']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops','pg_catalog.timestamp_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default','-']::text[],NULL,NULL),
  ('ix_availability_request_company_status_requested','AvailabilityRequest',FALSE,FALSE,ARRAY['companyId','status','requestedAt']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.enum_ops','pg_catalog.timestamp_ops']::text[],ARRAY['pg_catalog.default','-','-']::text[],NULL,NULL),
  ('uq_availability_assignment_company_id','AvailabilityRequestRecipientAssignment',TRUE,FALSE,ARRAY['companyId','id']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('availability_request_one_active_reason','AvailabilityRequestRecipientAssignment',TRUE,FALSE,ARRAY['availabilityRequestId','reason']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.enum_ops']::text[],ARRAY['pg_catalog.default','-']::text[],'(revokedatisnull)',NULL),
  ('availability_request_assignment_episode','AvailabilityRequestRecipientAssignment',TRUE,FALSE,ARRAY['availabilityRequestId','reason','userId','assignedAt']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.enum_ops','pg_catalog.text_ops','pg_catalog.timestamp_ops']::text[],ARRAY['pg_catalog.default','-','pg_catalog.default','-']::text[],NULL,NULL),
  ('ix_availability_assignment_company_user_revoked','AvailabilityRequestRecipientAssignment',FALSE,FALSE,ARRAY['companyId','userId','revokedAt']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops','pg_catalog.timestamp_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default','-']::text[],NULL,NULL),
  ('ix_availability_assignment_request_reason_revoked','AvailabilityRequestRecipientAssignment',FALSE,FALSE,ARRAY['availabilityRequestId','reason','revokedAt']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.enum_ops','pg_catalog.timestamp_ops']::text[],ARRAY['pg_catalog.default','-','-']::text[],NULL,NULL),
  ('uq_availability_command_company_id','AvailabilityCommand',TRUE,FALSE,ARRAY['companyId','id']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('uq_availability_command_idempotency','AvailabilityCommand',TRUE,FALSE,ARRAY['companyId','actorUserId','type','idempotencyKey']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops','pg_catalog.enum_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default','-','pg_catalog.default']::text[],NULL,NULL),
  ('ix_availability_command_company_request','AvailabilityCommand',FALSE,FALSE,ARRAY['companyId','requestId']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('ix_availability_command_company_surgery','AvailabilityCommand',FALSE,FALSE,ARRAY['companyId','surgeryId']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default']::text[],NULL,NULL),
  ('ix_internal_notification_company_availability_request','InternalNotification',FALSE,FALSE,ARRAY['companyId','availabilityRequestId','createdAt']::text[],ARRAY['pg_catalog.text_ops','pg_catalog.text_ops','pg_catalog.timestamp_ops']::text[],ARRAY['pg_catalog.default','pg_catalog.default','-']::text[],NULL,NULL)
),
expected_indexes AS (
  SELECT k.*, TRUE AS is_valid, TRUE AS is_ready, 'btree'::text AS access_method,
         array_fill(0::smallint,ARRAY[cardinality(columns)]) AS indoptions,
         FALSE AS nulls_not_distinct, columns AS key_definitions,
         CASE WHEN backing_type IS NULL THEN NULL ELSE name END AS backing_name
  FROM expected_index_keys k
),
expected_checks(name, table_name, is_validated, definition) AS (VALUES
  ('CompanyOperationalAssignee_version_check','CompanyOperationalAssignee',TRUE,'check(version>0)'),
  ('AvailabilityRequest_creator_resolution_check','AvailabilityRequest',TRUE,'check((creatorresolution=''not_identified''andcreatoruseridsnapshotisnullandcreatorauditeventidisnull)or(creatorresolutionin(''identified_eligible'',''identified_inactive'',''identified_no_company_access'')andcreatoruseridsnapshotisnotnull))'),
  ('AvailabilityRequest_pivot_mapping_version_check','AvailabilityRequest',TRUE,'check(pivotmappingversion>0)'),
  ('AvailabilityRequest_terminal_consistency_check','AvailabilityRequest',TRUE,'check((status=''open''andcompletedatisnullandcompletedbyuseridisnullandsubmitteddateisnullandcompletioncommandidisnull)or(status=''completed''andcompletedatisnotnullandcompletedbyuseridisnotnullandsubmitteddateisnotnullandcompletioncommandidisnotnull))'),
  ('AvailabilityRequestRecipientAssignment_lifecycle_check','AvailabilityRequestRecipientAssignment',TRUE,'check((reason=''creator''andrevokedatisnullandrevokedbyuseridisnullandrevokereasonisnull)or(reason=''pivot''andrevokedatisnullandrevokedbyuseridisnullandrevokereasonisnull)or(reason=''pivot''andrevokedatisnotnullandrevokedbyuseridisnotnullandrevokereasonisnotnullandbtrim(revokereason)<>''''andrevokedat>=assignedat))'),
  ('AvailabilityCommand_payload_hash_check','AvailabilityCommand',TRUE,'check(payloadhash~''^[0-9a-f]{64}$'')'),
  ('AvailabilityCommand_idempotency_key_check','AvailabilityCommand',TRUE,'check(char_length(idempotencykey)between16and128andidempotencykey~''^[!-~]+$'')'),
  ('AvailabilityCommand_terminal_consistency_check','AvailabilityCommand',TRUE,'check((completedatisnullandresultcodeisnull)or(completedatisnotnullandresultcodeisnotnull))'),
  ('AvailabilityCommand_target_consistency_check','AvailabilityCommand',TRUE,'check(completedatisnullor(typein(''request'',''complete'')andrequestidisnotnullandsurgeryidisnotnull)or(type=''correct''andrequestidisnullandsurgeryidisnotnull)or(type=''reassign_pivot''andrequestidisnullandsurgeryidisnull))'),
  ('InternalNotification_availability_request_link_check','InternalNotification',TRUE,'check(typenotin(''availability_request_actionable'',''availability_request_completed'',''availability_pivot_reassigned'')oravailabilityrequestidisnotnull)')
),
expected_fk_keys(name, child_table, columns, parent_table, ref_columns) AS (VALUES
  ('fk_devolucion_item_owner','devolucion_item',ARRAY['company_id','devolucionId']::text[],'devolucion',ARRAY['companyId','id']::text[]),
  ('fk_surgery_created_by','Surgery',ARRAY['createdById']::text[],'User',ARRAY['id']::text[]),
  ('fk_company_operational_assignee_company','CompanyOperationalAssignee',ARRAY['companyId']::text[],'Company',ARRAY['id']::text[]),
  ('fk_company_operational_assignee_user_access','CompanyOperationalAssignee',ARRAY['userId','companyId']::text[],'UserCompanyAccess',ARRAY['userId','companyId']::text[]),
  ('fk_company_operational_assignee_created_by','CompanyOperationalAssignee',ARRAY['createdById']::text[],'User',ARRAY['id']::text[]),
  ('fk_company_operational_assignee_updated_by','CompanyOperationalAssignee',ARRAY['updatedById']::text[],'User',ARRAY['id']::text[]),
  ('fk_availability_request_company','AvailabilityRequest',ARRAY['companyId']::text[],'Company',ARRAY['id']::text[]),
  ('fk_availability_request_surgery','AvailabilityRequest',ARRAY['companyId','surgeryId']::text[],'Surgery',ARRAY['companyId','id']::text[]),
  ('fk_availability_request_requester','AvailabilityRequest',ARRAY['requesterUserId']::text[],'User',ARRAY['id']::text[]),
  ('fk_availability_request_completer','AvailabilityRequest',ARRAY['completedByUserId']::text[],'User',ARRAY['id']::text[]),
  ('fk_availability_request_creator_snapshot_user','AvailabilityRequest',ARRAY['creatorUserIdSnapshot']::text[],'User',ARRAY['id']::text[]),
  ('fk_availability_request_pivot_snapshot_user','AvailabilityRequest',ARRAY['pivotUserIdAtCreation']::text[],'User',ARRAY['id']::text[]),
  ('fk_availability_request_creator_audit','AvailabilityRequest',ARRAY['companyId','creatorAuditEventId']::text[],'AuditEvent',ARRAY['companyId','id']::text[]),
  ('fk_availability_assignment_company','AvailabilityRequestRecipientAssignment',ARRAY['companyId']::text[],'Company',ARRAY['id']::text[]),
  ('fk_availability_assignment_request','AvailabilityRequestRecipientAssignment',ARRAY['companyId','availabilityRequestId']::text[],'AvailabilityRequest',ARRAY['companyId','id']::text[]),
  ('fk_availability_assignment_user_access','AvailabilityRequestRecipientAssignment',ARRAY['userId','companyId']::text[],'UserCompanyAccess',ARRAY['userId','companyId']::text[]),
  ('fk_availability_assignment_assigned_by','AvailabilityRequestRecipientAssignment',ARRAY['assignedByUserId']::text[],'User',ARRAY['id']::text[]),
  ('fk_availability_assignment_revoked_by','AvailabilityRequestRecipientAssignment',ARRAY['revokedByUserId']::text[],'User',ARRAY['id']::text[]),
  ('fk_availability_command_company','AvailabilityCommand',ARRAY['companyId']::text[],'Company',ARRAY['id']::text[]),
  ('fk_availability_command_actor','AvailabilityCommand',ARRAY['actorUserId']::text[],'User',ARRAY['id']::text[]),
  ('fk_availability_command_request','AvailabilityCommand',ARRAY['companyId','surgeryId','requestId']::text[],'AvailabilityRequest',ARRAY['companyId','surgeryId','id']::text[]),
  ('fk_availability_command_surgery','AvailabilityCommand',ARRAY['companyId','surgeryId']::text[],'Surgery',ARRAY['companyId','id']::text[]),
  ('fk_availability_request_completion_command','AvailabilityRequest',ARRAY['companyId','completionCommandId']::text[],'AvailabilityCommand',ARRAY['companyId','id']::text[]),
  ('fk_internal_notification_availability_request','InternalNotification',ARRAY['companyId','surgeryId','availabilityRequestId']::text[],'AvailabilityRequest',ARRAY['companyId','surgeryId','id']::text[])
),
expected_fks AS (
  SELECT k.*, 'r'::"char" AS delete_action, 'c'::"char" AS update_action,
         TRUE AS is_validated, FALSE AS is_deferrable, FALSE AS initially_deferred
  FROM expected_fk_keys k
),
actual_enums AS (
  SELECT t.typname AS name, ARRAY_AGG(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
  FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid
  WHERE n.nspname=:'expected_schema' GROUP BY t.typname
),
actual_tables AS (
  SELECT table_name AS name, ARRAY_AGG(column_name::text ORDER BY ordinal_position) AS columns
  FROM information_schema.columns WHERE table_schema=:'expected_schema' GROUP BY table_name
),
actual_indexes AS (
  SELECT ic.relname AS name, tc.relname AS table_name, i.indisunique AS is_unique,
         i.indisprimary AS is_primary, i.indisvalid AS is_valid, i.indisready AS is_ready,
         am.amname AS access_method,
         ARRAY(SELECT option::smallint FROM unnest(i.indoption) WITH ORDINALITY k(option,ord)
               ORDER BY k.ord) AS indoptions,
         ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord)
               JOIN pg_attribute a ON a.attrelid=tc.oid AND a.attnum=k.attnum
               WHERE k.ord<=i.indnkeyatts ORDER BY k.ord) AS columns,
         ARRAY(SELECT replace(pg_get_indexdef(i.indexrelid,k,true),'"','')
               FROM generate_series(1,i.indnkeyatts) k) AS key_definitions,
         ARRAY(SELECT onsp.nspname||'.'||op.opcname FROM unnest(i.indclass) WITH ORDINALITY k(oid,ord)
               JOIN pg_opclass op ON op.oid=k.oid JOIN pg_namespace onsp ON onsp.oid=op.opcnamespace
               ORDER BY k.ord) AS opclasses,
         ARRAY(SELECT CASE WHEN k.oid=0 THEN '-' ELSE cnsp.nspname||'.'||co.collname END
               FROM unnest(i.indcollation) WITH ORDINALITY k(oid,ord)
               LEFT JOIN pg_collation co ON co.oid=k.oid LEFT JOIN pg_namespace cnsp ON cnsp.oid=co.collnamespace
               ORDER BY k.ord) AS collations,
         i.indnullsnotdistinct AS nulls_not_distinct,
         bc.conname AS backing_name, bc.contype AS backing_type,
         CASE WHEN i.indpred IS NULL THEN NULL ELSE lower(regexp_replace(
           regexp_replace(pg_get_expr(i.indpred,i.indrelid,true),'::"[^"]+"','','g'),
           '[[:space:]"]','','g')) END AS predicate
  FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid JOIN pg_class tc ON tc.oid=i.indrelid
  JOIN pg_namespace n ON n.oid=tc.relnamespace JOIN pg_am am ON am.oid=ic.relam
  LEFT JOIN pg_constraint bc ON bc.conindid=i.indexrelid
    AND bc.contype IN ('p','u','x')
  WHERE n.nspname=:'expected_schema'
),
actual_constraints AS (
  SELECT c.conname AS name, c.contype, child.relname AS child_table,
         parent.relname AS parent_table, c.confdeltype, c.confupdtype, c.convalidated,
         c.condeferrable, c.condeferred,
         ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
               JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columns,
         ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(attnum,ord)
               JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum ORDER BY k.ord) AS ref_columns,
         regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
           regexp_replace(regexp_replace(regexp_replace(lower(pg_get_constraintdef(c.oid,true)),
             '::("[^"]+"|text|character[[:space:]]+varying|bpchar)','','g'),
             '[[:space:]"]','','g'),'=any\(array\[([^]]+)\]\)','in(\1)','g'),
             '<>all\(array\[([^]]+)\]\)','notin(\1)','g'),
             '\((payloadhash|idempotencykey)\)~','\1~','g'),
             '\((payloadhash|idempotencykey)(~''[^'']+'')\)','\1\2','g'),
             '\(?char_length\(idempotencykey\)>=16\)?and\(?char_length\(idempotencykey\)<=128\)?and',
             'char_length(idempotencykey)between16and128and','g'),
             '^check\(\((.*)\)\)$','check(\1)') AS definition
  FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid
  LEFT JOIN pg_class parent ON parent.oid=c.confrelid JOIN pg_namespace n ON n.oid=child.relnamespace
  WHERE n.nspname=:'expected_schema'
),
owned_indexes AS (
  SELECT a.* FROM actual_indexes a WHERE a.table_name IN
    ('CompanyOperationalAssignee','AvailabilityRequest','AvailabilityRequestRecipientAssignment','AvailabilityCommand')
    OR a.name LIKE '%availability%' OR a.name IN
    ('uq_devolucion_company_id','uq_surgery_company_id','uq_audit_event_company_id',
     'uq_devolucion_item_company_id','uq_devolucion_item_owner_id','ix_devolucion_item_company_owner',
     'UserCompanyAccess_userId_companyId_key')
),
owned_checks AS (
  SELECT a.* FROM actual_constraints a WHERE a.contype='c' AND
    (a.child_table IN ('CompanyOperationalAssignee','AvailabilityRequest',
      'AvailabilityRequestRecipientAssignment','AvailabilityCommand')
     OR a.name='InternalNotification_availability_request_link_check')
),
owned_fks AS (
  SELECT a.* FROM actual_constraints a WHERE a.contype='f' AND
    (a.child_table IN ('CompanyOperationalAssignee','AvailabilityRequest',
      'AvailabilityRequestRecipientAssignment','AvailabilityCommand')
     OR a.name IN ('fk_devolucion_item_owner','fk_surgery_created_by',
       'fk_internal_notification_availability_request'))
),
violations(reason) AS (
  SELECT 'applied migration set/status mismatch' WHERE (SELECT COUNT(*) FROM "_prisma_migrations")<>15
    OR EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "finished_at" IS NULL OR "rolled_back_at" IS NOT NULL)
    OR EXISTS ((SELECT "migration_name" FROM "_prisma_migrations") EXCEPT (SELECT name FROM expected_migrations))
    OR EXISTS ((SELECT name FROM expected_migrations) EXCEPT (SELECT "migration_name" FROM "_prisma_migrations"))
    OR EXISTS (SELECT 1 FROM expected_migrations e JOIN "_prisma_migrations" m
      ON m."migration_name"=e.name WHERE m."checksum"<>e.checksum)
  UNION ALL SELECT 'devolucion_item.company_id NOT NULL mismatch' WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema=:'expected_schema'
      AND table_name='devolucion_item' AND column_name='company_id'
      AND is_nullable='NO' AND data_type='text')
  UNION ALL SELECT 'owned index definition/set mismatch' WHERE EXISTS (
    SELECT 1 FROM expected_indexes e LEFT JOIN actual_indexes a USING(name)
    WHERE a.name IS NULL OR (a.table_name,a.is_unique,a.is_primary,a.is_valid,a.is_ready,
      a.access_method,a.indoptions,a.columns,a.key_definitions,a.opclasses,a.collations,
      a.nulls_not_distinct,a.predicate,a.backing_name,a.backing_type)
      IS DISTINCT FROM (e.table_name,e.is_unique,e.is_primary,e.is_valid,e.is_ready,
      e.access_method,e.indoptions,e.columns,e.key_definitions,e.opclasses,e.collations,
      e.nulls_not_distinct,e.predicate,e.backing_name,e.backing_type))
    OR EXISTS ((SELECT name FROM owned_indexes) EXCEPT (SELECT name FROM expected_indexes))
    OR EXISTS ((SELECT name FROM expected_indexes) EXCEPT (SELECT name FROM owned_indexes))
  UNION ALL SELECT 'expected index backing model mismatch' WHERE
    EXISTS (SELECT 1 FROM expected_indexes WHERE backing_type NOT IN ('p','u','x'))
    OR (SELECT COUNT(*) FROM expected_indexes WHERE backing_type IN ('p','u','x'))<>4
    OR EXISTS (SELECT 1 FROM expected_indexes WHERE
      (backing_type IS NULL) IS DISTINCT FROM (backing_name IS NULL))
    OR (SELECT COUNT(*) FROM expected_indexes WHERE backing_type IS NULL AND backing_name IS NULL)<>29
  UNION ALL SELECT 'legacy devolucion-item FK remains present' WHERE EXISTS (
    SELECT 1 FROM actual_constraints WHERE name='devolucion_item_devolucionId_fkey')
  UNION ALL SELECT 'Availability enum definition mismatch' WHERE EXISTS (
    SELECT 1 FROM expected_enums e LEFT JOIN actual_enums a USING(name)
    WHERE a.name IS NULL OR a.labels IS DISTINCT FROM e.labels)
  UNION ALL SELECT 'Availability table/column set mismatch' WHERE EXISTS (
    SELECT 1 FROM expected_tables e LEFT JOIN actual_tables a USING(name)
    WHERE a.name IS NULL OR a.columns IS DISTINCT FROM e.columns)
  UNION ALL SELECT 'Availability alteration columns or DATE types mismatch' WHERE
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=:'expected_schema'
      AND (table_name,column_name) IN (('Surgery','createdById'),('Surgery','materialAvailabilityDate'),
      ('InternalNotification','availabilityRequestId')))<>3
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=:'expected_schema'
      AND table_name='Surgery' AND column_name='materialAvailabilityDate' AND data_type='date' AND udt_name='date')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=:'expected_schema'
      AND table_name='Surgery' AND column_name='createdById' AND data_type='text')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=:'expected_schema'
      AND table_name='InternalNotification' AND column_name='availabilityRequestId' AND data_type='text')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=:'expected_schema'
      AND table_name='AvailabilityRequest' AND column_name='submittedDate' AND data_type='date' AND udt_name='date')
  UNION ALL SELECT 'exact Availability CHECK definition/set mismatch' WHERE EXISTS (
    SELECT 1 FROM expected_checks e LEFT JOIN owned_checks a ON a.name=e.name
    WHERE a.name IS NULL OR (a.child_table,a.convalidated,a.definition)
      IS DISTINCT FROM (e.table_name,e.is_validated,e.definition))
    OR EXISTS ((SELECT name FROM owned_checks) EXCEPT (SELECT name FROM expected_checks))
    OR EXISTS ((SELECT name FROM expected_checks) EXCEPT (SELECT name FROM owned_checks))
  UNION ALL SELECT 'exact Availability/repair FK definition/set mismatch' WHERE EXISTS (
    SELECT 1 FROM expected_fks e LEFT JOIN owned_fks a ON a.name=e.name
    WHERE a.name IS NULL OR (a.child_table,a.columns,a.parent_table,a.ref_columns,
      a.confdeltype,a.confupdtype,a.convalidated,a.condeferrable,a.condeferred)
      IS DISTINCT FROM (e.child_table,e.columns,e.parent_table,e.ref_columns,
      e.delete_action,e.update_action,e.is_validated,e.is_deferrable,e.initially_deferred))
    OR EXISTS ((SELECT name FROM owned_fks) EXCEPT (SELECT name FROM expected_fks))
    OR EXISTS ((SELECT name FROM expected_fks) EXCEPT (SELECT name FROM owned_fks))
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

SELECT COUNT(*) FILTER (WHERE i."company_id" IS NULL) AS null_company_count,
       COUNT(*) FILTER (WHERE d."id" IS NULL) AS orphan_count,
       COUNT(*) FILTER (WHERE d."id" IS NOT NULL AND i."company_id"<>d."companyId") AS tenant_mismatch_count,
       COUNT(*) FILTER (WHERE i."company_id" IS NULL OR d."id" IS NULL
          OR i."company_id"<>d."companyId")=0 AS assertion_ok
FROM "devolucion_item" i LEFT JOIN "devolucion" d ON d."id"=i."devolucionId"
\gset
\echo 'COUNTS null_company=' :null_company_count 'orphan=' :orphan_count 'tenant_mismatch=' :tenant_mismatch_count
\if :assertion_ok
\else
  \echo 'ERROR: post-apply aggregate tenant anomaly'
  ROLLBACK;
  \quit 3
\endif

ROLLBACK;
