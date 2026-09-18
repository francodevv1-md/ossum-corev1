\set ON_ERROR_STOP on

-- Unexpected errors terminate psql with this transaction uncommitted, so the
-- server rolls it back. No success path persists the transaction.
\if :{?run_id}
\else
  \echo 'ERROR: run_id psql variable is required'
  \quit 3
\endif
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

SELECT :'run_id' ~ '^[a-z0-9_]{1,24}$' AS assertion_ok
\gset
\if :assertion_ok
\else
  \echo 'ERROR: run_id must match lowercase ASCII [a-z0-9_]{1,24}'
  \quit 3
\endif
\set fixture_ns ft3_availability_ :run_id

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL app.ft3_fixture_ns = :'fixture_ns';

SELECT current_database()=:'expected_database'
   AND current_schema()=:'expected_schema' AS assertion_ok
\gset
\if :assertion_ok
\else
  \echo 'ERROR: database or schema target mismatch'
  ROLLBACK;
  \quit 3
\endif

WITH residue(total) AS (SELECT
  (SELECT COUNT(*) FROM "Organization" WHERE "id" LIKE :'fixture_ns'||'%' OR "slug" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "Company" WHERE "id" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "User" WHERE "id" LIKE :'fixture_ns'||'%' OR "email" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "UserCompanyAccess" WHERE "id" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "Contact" WHERE "id" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "Surgery" WHERE "id" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "CompanyOperationalAssignee" WHERE "id" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "AvailabilityRequest" WHERE "id" LIKE :'fixture_ns'||'%' OR "correlationId" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "AvailabilityRequestRecipientAssignment" WHERE "id" LIKE :'fixture_ns'||'%' OR "correlationId" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "AvailabilityCommand" WHERE "id" LIKE :'fixture_ns'||'%' OR "idempotencyKey" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "InternalNotification" WHERE "id" LIKE :'fixture_ns'||'%' OR "eventKey" LIKE :'fixture_ns'||'%'))
SELECT total=0 AS assertion_ok FROM residue
\gset
\if :assertion_ok
\else
  \echo 'ERROR: synthetic namespace already has residue'
  ROLLBACK;
  \quit 3
\endif

INSERT INTO "Organization" ("id","name","slug","updatedAt") VALUES
  (:'fixture_ns'||'_org', :'fixture_ns'||'_org', :'fixture_ns'||'_org', CURRENT_TIMESTAMP);
INSERT INTO "Company" ("id","organizationId","name","updatedAt") VALUES
  (:'fixture_ns'||'_company_a', :'fixture_ns'||'_org', :'fixture_ns'||'_company_a', CURRENT_TIMESTAMP),
  (:'fixture_ns'||'_company_b', :'fixture_ns'||'_org', :'fixture_ns'||'_company_b', CURRENT_TIMESTAMP);
INSERT INTO "User" ("id","email","firstName","lastName","updatedAt") VALUES
  (:'fixture_ns'||'_user', :'fixture_ns'||'_user@example.invalid', :'fixture_ns', 'user', CURRENT_TIMESTAMP);
INSERT INTO "UserCompanyAccess" ("id","userId","companyId","role","updatedAt") VALUES
  (:'fixture_ns'||'_access_a', :'fixture_ns'||'_user', :'fixture_ns'||'_company_a', 'operator', CURRENT_TIMESTAMP),
  (:'fixture_ns'||'_access_b', :'fixture_ns'||'_user', :'fixture_ns'||'_company_b', 'operator', CURRENT_TIMESTAMP);
INSERT INTO "Contact" ("id","firstName","updatedAt") VALUES
  (:'fixture_ns'||'_patient', :'fixture_ns', CURRENT_TIMESTAMP);
INSERT INTO "Surgery" ("id","companyId","patientId","createdById","materialAvailabilityDate","updatedAt") VALUES
  (:'fixture_ns'||'_surgery', :'fixture_ns'||'_company_a', :'fixture_ns'||'_patient',
   :'fixture_ns'||'_user', DATE '2026-07-23', CURRENT_TIMESTAMP);
INSERT INTO "CompanyOperationalAssignee"
  ("id","companyId","userId","designation","version","createdById","updatedById","updatedAt") VALUES
  (:'fixture_ns'||'_pivot', :'fixture_ns'||'_company_a', :'fixture_ns'||'_user', 'PIVOT', 1,
   :'fixture_ns'||'_user', :'fixture_ns'||'_user', CURRENT_TIMESTAMP);
INSERT INTO "AvailabilityRequest"
  ("id","companyId","surgeryId","requesterUserId","status","creatorResolution",
   "creatorUserIdSnapshot","pivotUserIdAtCreation","pivotMappingVersion","correlationId","updatedAt") VALUES
  (:'fixture_ns'||'_request', :'fixture_ns'||'_company_a', :'fixture_ns'||'_surgery',
   :'fixture_ns'||'_user', 'OPEN', 'IDENTIFIED_ELIGIBLE', :'fixture_ns'||'_user',
   :'fixture_ns'||'_user', 1, :'fixture_ns'||'_request', CURRENT_TIMESTAMP);
INSERT INTO "AvailabilityRequestRecipientAssignment"
  ("id","availabilityRequestId","companyId","userId","reason","assignedByUserId","correlationId") VALUES
  (:'fixture_ns'||'_assignment_creator', :'fixture_ns'||'_request', :'fixture_ns'||'_company_a',
   :'fixture_ns'||'_user', 'CREATOR', :'fixture_ns'||'_user', :'fixture_ns'||'_assignment_creator'),
  (:'fixture_ns'||'_assignment_pivot', :'fixture_ns'||'_request', :'fixture_ns'||'_company_a',
   :'fixture_ns'||'_user', 'PIVOT', :'fixture_ns'||'_user', :'fixture_ns'||'_assignment_pivot');
INSERT INTO "AvailabilityCommand"
  ("id","companyId","actorUserId","type","idempotencyKey","payloadHash","requestId",
   "surgeryId","completedAt","resultCode") VALUES
  (:'fixture_ns'||'_command', :'fixture_ns'||'_company_a', :'fixture_ns'||'_user', 'COMPLETE',
   :'fixture_ns'||'_command_key', repeat('0',64), :'fixture_ns'||'_request',
   :'fixture_ns'||'_surgery', CURRENT_TIMESTAMP, 'completed');

-- Each nested block is an implicit savepoint. Only the named SQLSTATE is accepted.
-- Negative mapping: open duplicate -> availability_request_one_open_per_surgery;
-- terminal request -> AvailabilityRequest_terminal_consistency_check;
-- request tenant -> fk_availability_request_surgery; assignment duplicate ->
-- availability_request_one_active_reason; assignment lifecycle ->
-- AvailabilityRequestRecipientAssignment_lifecycle_check; bad command hash ->
-- AvailabilityCommand_payload_hash_check; bad command status ->
-- AvailabilityCommand_terminal_consistency_check; duplicate command ->
-- uq_availability_command_idempotency; notification link/tenant ->
-- InternalNotification_availability_request_link_check / fk_internal_notification_availability_request.
DO $ft3$
DECLARE ns text := current_setting('app.ft3_fixture_ns'); hit_constraint text;
BEGIN
  BEGIN
    INSERT INTO "AvailabilityRequest" ("id","companyId","surgeryId","requesterUserId","creatorResolution","pivotUserIdAtCreation","pivotMappingVersion","correlationId","updatedAt")
    VALUES (ns||'_request_open_dup',ns||'_company_a',ns||'_surgery',ns||'_user','NOT_IDENTIFIED',ns||'_user',1,ns||'_request_open_dup',CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'OPEN-request uniqueness accepted invalid row';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS hit_constraint = CONSTRAINT_NAME;
    IF hit_constraint IS DISTINCT FROM 'availability_request_one_open_per_surgery' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "AvailabilityRequest" ("id","companyId","surgeryId","requesterUserId","status","creatorResolution","pivotUserIdAtCreation","pivotMappingVersion","correlationId","updatedAt")
    VALUES (ns||'_request_bad_terminal',ns||'_company_a',ns||'_surgery',ns||'_user','COMPLETED','NOT_IDENTIFIED',ns||'_user',1,ns||'_request_bad_terminal',CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'terminal request CHECK accepted invalid row';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS hit_constraint = CONSTRAINT_NAME;
    IF hit_constraint IS DISTINCT FROM 'AvailabilityRequest_terminal_consistency_check' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "AvailabilityRequest" ("id","companyId","surgeryId","requesterUserId","creatorResolution","pivotUserIdAtCreation","pivotMappingVersion","correlationId","updatedAt")
    VALUES (ns||'_request_bad_tenant',ns||'_company_b',ns||'_surgery',ns||'_user','NOT_IDENTIFIED',ns||'_user',1,ns||'_request_bad_tenant',CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'request tenant FK accepted invalid row';
  EXCEPTION WHEN foreign_key_violation THEN
    GET STACKED DIAGNOSTICS hit_constraint = CONSTRAINT_NAME;
    IF hit_constraint IS DISTINCT FROM 'fk_availability_request_surgery' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "AvailabilityRequestRecipientAssignment" ("id","availabilityRequestId","companyId","userId","reason","assignedByUserId","correlationId")
    VALUES (ns||'_assignment_dup',ns||'_request',ns||'_company_a',ns||'_user','PIVOT',ns||'_user',ns||'_assignment_dup');
    RAISE EXCEPTION 'assignment uniqueness accepted invalid row';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS hit_constraint = CONSTRAINT_NAME;
    IF hit_constraint IS DISTINCT FROM 'availability_request_one_active_reason' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "AvailabilityRequestRecipientAssignment" ("id","availabilityRequestId","companyId","userId","reason","assignedByUserId","revokedAt","revokedByUserId","revokeReason","correlationId")
    VALUES (ns||'_assignment_bad_reason',ns||'_request',ns||'_company_a',ns||'_user','CREATOR',ns||'_user',CURRENT_TIMESTAMP,ns||'_user','invalid',ns||'_assignment_bad_reason');
    RAISE EXCEPTION 'assignment lifecycle CHECK accepted invalid row';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS hit_constraint = CONSTRAINT_NAME;
    IF hit_constraint IS DISTINCT FROM 'AvailabilityRequestRecipientAssignment_lifecycle_check' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "AvailabilityCommand" ("id","companyId","actorUserId","type","idempotencyKey","payloadHash")
    VALUES (ns||'_command_bad_hash',ns||'_company_a',ns||'_user','REQUEST',ns||'_bad_hash_key','bad');
    RAISE EXCEPTION 'command payload CHECK accepted invalid row';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS hit_constraint = CONSTRAINT_NAME;
    IF hit_constraint IS DISTINCT FROM 'AvailabilityCommand_payload_hash_check' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "AvailabilityCommand" ("id","companyId","actorUserId","type","idempotencyKey","payloadHash","completedAt")
    VALUES (ns||'_command_bad_status',ns||'_company_a',ns||'_user','REASSIGN_PIVOT',ns||'_bad_status_key',repeat('1',64),CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'command terminal CHECK accepted invalid row';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS hit_constraint = CONSTRAINT_NAME;
    IF hit_constraint IS DISTINCT FROM 'AvailabilityCommand_terminal_consistency_check' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "AvailabilityCommand" ("id","companyId","actorUserId","type","idempotencyKey","payloadHash")
    VALUES (ns||'_command_dup',ns||'_company_a',ns||'_user','COMPLETE',ns||'_command_key',repeat('2',64));
    RAISE EXCEPTION 'command idempotency accepted invalid row';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS hit_constraint = CONSTRAINT_NAME;
    IF hit_constraint IS DISTINCT FROM 'uq_availability_command_idempotency' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "InternalNotification" ("id","companyId","recipientUserId","actorUserId","surgeryId","sourceEntityId","type","eventKey","title","updatedAt")
    VALUES (ns||'_notification_no_link',ns||'_company_a',ns||'_user',ns||'_user',ns||'_surgery',ns||'_request','availability_request_actionable',ns||'_notification_no_link',ns||'_notification_no_link',CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'notification linkage CHECK accepted invalid row';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS hit_constraint = CONSTRAINT_NAME;
    IF hit_constraint IS DISTINCT FROM 'InternalNotification_availability_request_link_check' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO "InternalNotification" ("id","companyId","recipientUserId","actorUserId","surgeryId","sourceEntityId","availabilityRequestId","type","eventKey","title","updatedAt")
    VALUES (ns||'_notification_bad_tenant',ns||'_company_b',ns||'_user',ns||'_user',ns||'_surgery',ns||'_request',ns||'_request','availability_request_completed',ns||'_notification_bad_tenant',ns||'_notification_bad_tenant',CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'notification tenant FK accepted invalid row';
  EXCEPTION WHEN foreign_key_violation THEN
    GET STACKED DIAGNOSTICS hit_constraint = CONSTRAINT_NAME;
    IF hit_constraint IS DISTINCT FROM 'fk_internal_notification_availability_request' THEN RAISE; END IF;
  END;
END;
$ft3$;

UPDATE "AvailabilityRequest"
SET "status"='COMPLETED', "completedAt"=CURRENT_TIMESTAMP,
    "completedByUserId"=:'fixture_ns'||'_user', "submittedDate"=DATE '2026-07-23',
    "completionCommandId"=:'fixture_ns'||'_command', "updatedAt"=CURRENT_TIMESTAMP
WHERE "id"=:'fixture_ns'||'_request' AND "id" LIKE :'fixture_ns'||'%';

SELECT s."materialAvailabilityDate"=DATE '2026-07-23'
   AND s."materialAvailabilityDate"::text='2026-07-23'
   AND r."submittedDate"=DATE '2026-07-23'
   AND r."submittedDate"::text='2026-07-23' AS assertion_ok
FROM "Surgery" s JOIN "AvailabilityRequest" r
  ON (r."companyId",r."surgeryId")=(s."companyId",s."id")
WHERE s."id"=:'fixture_ns'||'_surgery' AND r."id"=:'fixture_ns'||'_request'
\gset
\if :assertion_ok
\else
  \echo 'ERROR: native date-only round-trip mismatch'
  ROLLBACK;
  \quit 3
\endif

INSERT INTO "InternalNotification"
  ("id","companyId","recipientUserId","actorUserId","surgeryId","sourceEntityId",
   "availabilityRequestId","type","eventKey","title","updatedAt") VALUES
  (:'fixture_ns'||'_notification', :'fixture_ns'||'_company_a', :'fixture_ns'||'_user',
   :'fixture_ns'||'_user', :'fixture_ns'||'_surgery', :'fixture_ns'||'_request',
   :'fixture_ns'||'_request', 'availability_request_completed', :'fixture_ns'||'_notification',
   :'fixture_ns'||'_notification', CURRENT_TIMESTAMP);

ROLLBACK;

WITH residue(total) AS (SELECT
  (SELECT COUNT(*) FROM "Organization" WHERE "id" LIKE :'fixture_ns'||'%' OR "slug" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "Company" WHERE "id" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "User" WHERE "id" LIKE :'fixture_ns'||'%' OR "email" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "UserCompanyAccess" WHERE "id" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "Contact" WHERE "id" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "Surgery" WHERE "id" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "CompanyOperationalAssignee" WHERE "id" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "AvailabilityRequest" WHERE "id" LIKE :'fixture_ns'||'%' OR "correlationId" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "AvailabilityRequestRecipientAssignment" WHERE "id" LIKE :'fixture_ns'||'%' OR "correlationId" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "AvailabilityCommand" WHERE "id" LIKE :'fixture_ns'||'%' OR "idempotencyKey" LIKE :'fixture_ns'||'%')+
  (SELECT COUNT(*) FROM "InternalNotification" WHERE "id" LIKE :'fixture_ns'||'%' OR "eventKey" LIKE :'fixture_ns'||'%'))
SELECT total AS residue_count, total=0 AS assertion_ok FROM residue
\gset
\echo 'ZERO_RESIDUE count=' :residue_count
\if :assertion_ok
\else
  \echo 'ERROR: rollback residue detected'
  \quit 3
\endif
