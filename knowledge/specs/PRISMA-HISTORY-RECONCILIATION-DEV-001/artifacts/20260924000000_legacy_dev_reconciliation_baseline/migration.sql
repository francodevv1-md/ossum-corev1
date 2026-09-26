-- Reviewed DEV reconciliation baseline. Generated from schema-only legacy export; not a rewrite of legacy migration history.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: ArticleIdentifierType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArticleIdentifierType" AS ENUM (
    'MANUFACTURER_REF',
    'GTIN_EAN',
    'SUPPLIER_CODE',
    'ALTERNATIVE_CODE',
    'OSSUM_CODE',
    'GS1_AI_22'
);


--
-- Name: ArticleTraceabilityPolicyKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArticleTraceabilityPolicyKind" AS ENUM (
    'NONE',
    'LOT',
    'LOT_EXPIRY',
    'SERIAL',
    'SERIAL_EXPIRY',
    'LOT_SERIAL_EXPIRY'
);


--
-- Name: ArticleTraceabilityRequirement; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ArticleTraceabilityRequirement" AS ENUM (
    'NONE',
    'LOT',
    'SERIAL',
    'LOT_OR_SERIAL',
    'LOT_AND_SERIAL'
);


--
-- Name: AvailabilityCommandType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AvailabilityCommandType" AS ENUM (
    'REQUEST',
    'COMPLETE',
    'CORRECT',
    'REASSIGN_PIVOT'
);


--
-- Name: AvailabilityCreatorResolution; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AvailabilityCreatorResolution" AS ENUM (
    'IDENTIFIED_ELIGIBLE',
    'NOT_IDENTIFIED',
    'IDENTIFIED_INACTIVE',
    'IDENTIFIED_NO_COMPANY_ACCESS'
);


--
-- Name: AvailabilityRecipientReason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AvailabilityRecipientReason" AS ENUM (
    'CREATOR',
    'PIVOT'
);


--
-- Name: AvailabilityRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AvailabilityRequestStatus" AS ENUM (
    'OPEN',
    'COMPLETED'
);


--
-- Name: CommandAttemptOutcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CommandAttemptOutcome" AS ENUM (
    'ACCEPTED',
    'DENIED',
    'VALIDATION_FAILED',
    'CONFLICT',
    'FAILED',
    'UNKNOWN'
);


--
-- Name: CompanyOperationalDesignation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CompanyOperationalDesignation" AS ENUM (
    'PIVOT'
);


--
-- Name: DigitalReceiptAccessStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DigitalReceiptAccessStatus" AS ENUM (
    'active',
    'consumed',
    'expired',
    'revoked'
);


--
-- Name: DigitalReceiptArtifactType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DigitalReceiptArtifactType" AS ENUM (
    'receipt_html',
    'receipt_pdf',
    'audit_trail',
    'snapshot_payload',
    'signature_evidence'
);


--
-- Name: DigitalReceiptDeliveryChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DigitalReceiptDeliveryChannel" AS ENUM (
    'whatsapp',
    'email',
    'sms',
    'internal'
);


--
-- Name: DigitalReceiptEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DigitalReceiptEventType" AS ENUM (
    'created',
    'issued',
    'access_created',
    'access_opened',
    'access_consumed',
    'signed',
    'snapshot_created',
    'artifact_created',
    'expired',
    'revoked'
);


--
-- Name: DigitalReceiptSignerRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DigitalReceiptSignerRole" AS ENUM (
    'patient',
    'authorized_payer'
);


--
-- Name: DigitalReceiptStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DigitalReceiptStatus" AS ENUM (
    'draft',
    'issued',
    'signed',
    'expired',
    'revoked'
);


--
-- Name: EvidenceRecordKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EvidenceRecordKind" AS ENUM (
    'ORIGINAL',
    'CORRECTION',
    'REVERSAL',
    'ANNULMENT'
);


--
-- Name: GeographicCoordinateType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GeographicCoordinateType" AS ENUM (
    'CENTROID',
    'ADDRESS',
    'GPS',
    'SURVEY',
    'MANUAL',
    'UNKNOWN'
);


--
-- Name: GeographicCrs; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GeographicCrs" AS ENUM (
    'EPSG:4326'
);


--
-- Name: GeographicEntityType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GeographicEntityType" AS ENUM (
    'PROVINCE',
    'DEPARTMENT',
    'MUNICIPALITY',
    'LOCALITY',
    'ADDRESS'
);


--
-- Name: GeographicValidationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GeographicValidationStatus" AS ENUM (
    'verified',
    'candidate',
    'conflict',
    'missing',
    'manual_verified',
    'deprecated'
);


--
-- Name: InternalNotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InternalNotificationType" AS ENUM (
    'seguimiento_mention',
    'availability_request_actionable',
    'availability_request_completed',
    'availability_pivot_reassigned'
);


--
-- Name: OperationalEffectTargetKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OperationalEffectTargetKind" AS ENUM (
    'DOMAIN_ONLY',
    'STOCK_EVIDENCE',
    'STOCK_RESERVATION_EVIDENCE'
);


--
-- Name: ProjectionKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProjectionKind" AS ENUM (
    'STOCK_POSITION',
    'STOCK_RESERVATION',
    'CAJAS_PREPARATION',
    'CAJAS_DISPATCH_ACCOUNTING',
    'CAJAS_CONDITION'
);


--
-- Name: ReconciliationResult; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReconciliationResult" AS ENUM (
    'MATCH',
    'MISMATCH'
);


--
-- Name: SourceScopeKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SourceScopeKind" AS ENUM (
    'HEADER',
    'LINE'
);


--
-- Name: StockCompatibilityDisposition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockCompatibilityDisposition" AS ENUM (
    'DETERMINISTICALLY_MAPPABLE',
    'DESCRIPTIVE_SNAPSHOT_ONLY',
    'UNRESOLVED_LEGACY',
    'INCOMPATIBLE_REJECTED'
);


--
-- Name: StockContextKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockContextKind" AS ENUM (
    'DEPOSIT',
    'TRANSIT',
    'EXTERNAL_CUSTODY'
);


--
-- Name: StockEvidenceKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockEvidenceKind" AS ENUM (
    'OPENING',
    'RECEIPT',
    'DISPATCH',
    'RETURN',
    'CONSUMPTION',
    'TRANSFER_DISPATCH',
    'TRANSFER_RECEIPT',
    'COUNT_OBSERVATION',
    'REVIEW_HOLD',
    'REVIEW_RELEASE',
    'CORRECTION',
    'REVERSAL'
);


--
-- Name: StockLotReviewResult; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockLotReviewResult" AS ENUM (
    'MATCH',
    'DISCREPANCY',
    'RESOLVED_EQUIVALENT',
    'REJECTED'
);


--
-- Name: StockReservationEventKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockReservationEventKind" AS ENUM (
    'RESERVE',
    'RELEASE',
    'REPLACE',
    'CANCEL',
    'APPLY_TO_DISPATCH'
);


--
-- Name: StockReservationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockReservationStatus" AS ENUM (
    'ACTIVE',
    'PARTIALLY_APPLIED',
    'RELEASED',
    'CANCELLED',
    'EXHAUSTED'
);


--
-- Name: StockTraceMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockTraceMode" AS ENUM (
    'NONE',
    'LOT',
    'IDENTIFIED_UNIT'
);


--
-- Name: cajas_change_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_change_kind AS ENUM (
    'add',
    'remove',
    'replace',
    'quantity',
    'traceability'
);


--
-- Name: cajas_control_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_control_kind AS ENUM (
    'control',
    'recontrol'
);


--
-- Name: cajas_control_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_control_result AS ENUM (
    'clean',
    'with_differences'
);


--
-- Name: cajas_current_condition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_current_condition AS ENUM (
    'available',
    'with_differences'
);


--
-- Name: cajas_disposition_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_disposition_kind AS ENUM (
    'returned',
    'consumed',
    'missing',
    'damaged',
    'under_review'
);


--
-- Name: cajas_line_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_line_role AS ENUM (
    'expected',
    'unexpected',
    'substitution'
);


--
-- Name: cajas_maintenance_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_maintenance_kind AS ENUM (
    'repair',
    'preventive_maintenance'
);


--
-- Name: cajas_maintenance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_maintenance_status AS ENUM (
    'open',
    'sent',
    'returned_pending_review',
    'closed',
    'cancelled'
);


--
-- Name: cajas_phase_d_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_phase_d_action AS ENUM (
    'CONSUME',
    'REGISTER_RETURN',
    'RECEIVE_CONTROL',
    'CLOSE_RECONCILIATION'
);


--
-- Name: cajas_phase_d_operation_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_phase_d_operation_kind AS ENUM (
    'CONSUMPTION',
    'RETURN'
);


--
-- Name: cajas_phase_d_receipt_outcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_phase_d_receipt_outcome AS ENUM (
    'FIT',
    'OBSERVED',
    'DAMAGED',
    'NOT_FIT',
    'UNIDENTIFIABLE'
);


--
-- Name: cajas_phase_d_reconciliation_event_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_phase_d_reconciliation_event_kind AS ENUM (
    'CLOSED',
    'REOPENED'
);


--
-- Name: cajas_phase_d_return_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_phase_d_return_state AS ENUM (
    'IDENTIFIED',
    'PENDING_IDENTIFICATION',
    'RECEIVED'
);


--
-- Name: cajas_return_line_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cajas_return_line_kind AS ENUM (
    'unchanged',
    'consumed',
    'missing',
    'damaged',
    'added',
    'replacement',
    'under_review'
);


--
-- Name: catalog_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.catalog_kind AS ENUM (
    'CATEGORY',
    'CLINICAL_FAMILY',
    'BRAND',
    'MANUFACTURER',
    'PRODUCT_LINE'
);


--
-- Name: legacy_axis; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.legacy_axis AS ENUM (
    'ARTICLE',
    'CATEGORY',
    'CLINICAL_FAMILY',
    'BRAND',
    'MANUFACTURER',
    'PRODUCT_LINE',
    'DEPARTMENT',
    'SECTION',
    'SECTOR',
    'XADMIN_TYPE'
);


--
-- Name: legacy_mapping_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.legacy_mapping_status AS ENUM (
    'MAPPED',
    'REVIEW_REQUIRED',
    'UNMAPPED',
    'REJECTED',
    'UNCHANGED_LEGACY'
);


--
-- Name: allocate_contact_company_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.allocate_contact_company_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  next_value NUMERIC;
BEGIN
  IF NEW."code" IS NULL OR BTRIM(NEW."code") = '' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW."companyId", 0));
    SELECT COALESCE(MAX(SUBSTRING("code" FROM 3)::NUMERIC), 0) + 1
      INTO next_value
      FROM "ContactCompanyLink"
      WHERE "companyId" = NEW."companyId" AND "code" ~ '^C-[0-9]{4,}$';
    NEW."code" := 'C-' || LPAD(next_value::TEXT, GREATEST(4, LENGTH(next_value::TEXT)), '0');
  END IF;
  RETURN NEW;
END;
$_$;


--
-- Name: check_presupuesto_family_surgery_lineage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_presupuesto_family_surgery_lineage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE family_surgery_id TEXT;
BEGIN
  SELECT "surgeryId" INTO family_surgery_id
  FROM "presupuesto_family"
  WHERE "companyId" = NEW."companyId" AND "id" = NEW."familyId";

  IF NOT FOUND OR family_surgery_id IS DISTINCT FROM NEW."surgeryId" THEN
    RAISE EXCEPTION 'Presupuesto surgery must match its family surgery' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_article_catalog_no_hard_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_article_catalog_no_hard_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'article catalog and XADMIN evidence rows cannot be hard-deleted';
END;
$$;


--
-- Name: fn_cajas_assignment_unit_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_assignment_unit_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM "public"."StockIdentifiedUnit" AS "unit"
    WHERE ("unit"."companyId", "unit"."articleId", "unit"."id") = (NEW."company_id", NEW."box_article_id", NEW."box_identified_unit_id")
  ) AND (NEW."active_slot" IS DISTINCT FROM 1 OR NOT EXISTS (
    SELECT 1 FROM "public"."StockReservation" AS "reservation"
    WHERE "reservation"."companyId" = NEW."company_id"
      AND "reservation"."identifiedUnitId" = NEW."box_identified_unit_id"
      AND (SELECT COALESCE(SUM(CASE
        WHEN "event"."kind" IN ('RESERVE','REPLACE') AND NOT EXISTS (
          SELECT 1 FROM "public"."StockReservationEvidence" AS "replacement"
          WHERE ("replacement"."companyId", "replacement"."reservationId", "replacement"."replacesEvidenceId") = ("event"."companyId", "event"."reservationId", "event"."id")
        ) THEN "event"."quantity"
        WHEN "event"."kind" IN ('RELEASE','CANCEL','APPLY_TO_DISPATCH') THEN -"event"."quantity" ELSE 0 END),0)
        FROM "public"."StockReservationEvidence" AS "event"
        WHERE ("event"."companyId", "event"."reservationId") = ("reservation"."companyId", "reservation"."id")) > 0
      AND NOT EXISTS (
        SELECT 1 FROM "public"."cajas_reservation_correlation" AS "correlation"
        WHERE ("correlation"."company_id", "correlation"."assignment_id", "correlation"."stock_reservation_id", "correlation"."stock_position_id") = (NEW."company_id", NEW."id", "reservation"."id", "reservation"."positionId")
      )
  )) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_assignment_unit_guard;function=fn_cajas_assignment_unit_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_ASSIGNMENT_UNIT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_composition_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_composition_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_composition_append_only' ||
             ';function=fn_cajas_composition_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_COMPOSITION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_composition_line_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_composition_line_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_composition_line_append_only' ||
             ';function=fn_cajas_composition_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_COMPOSITION_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_condition_assignment_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_condition_assignment_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  SELECT NEW."assignment_id" IS NULL OR EXISTS (SELECT 1 FROM "public"."cajas_assignment" AS "assignment" WHERE "assignment"."company_id" = NEW."company_id" AND "assignment"."id" = NEW."assignment_id" AND "assignment"."box_identified_unit_id" = NEW."box_identified_unit_id") INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_condition_assignment_guard;function=fn_cajas_condition_assignment_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_CONDITION_ASSIGNMENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_consumption_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_consumption_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_consumption_append_only' ||
             ';function=fn_cajas_consumption_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_CONSUMPTION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_consumption_line_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_consumption_line_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_consumption_line_append_only' ||
             ';function=fn_cajas_consumption_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_CONSUMPTION_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_consumption_min_line(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_consumption_min_line() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_NAME = 'cajas_consumption_confirmation' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_consumption_line" AS "line" WHERE ("line"."company_id","line"."consumption_confirmation_id")=(NEW."company_id",NEW."id")) INTO v_valid;
  ELSE
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_consumption_line" AS "line" WHERE ("line"."company_id","line"."consumption_confirmation_id")=(OLD."company_id",OLD."consumption_confirmation_id"))
      AND (TG_OP <> 'UPDATE' OR (NEW."company_id",NEW."consumption_confirmation_id")=(OLD."company_id",OLD."consumption_confirmation_id") OR EXISTS (SELECT 1 FROM "public"."cajas_consumption_line" AS "line" WHERE ("line"."company_id","line"."consumption_confirmation_id")=(NEW."company_id",NEW."consumption_confirmation_id"))) INTO v_valid;
  END IF;
  IF v_valid IS TRUE THEN RETURN NULL; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_consumption_min_line;function=fn_cajas_consumption_min_line;branch=R0001;family=MINIMUM_LINE', HINT='messageId=C14_INV_FN_FN_CAJAS_CONSUMPTION_MIN_LINE', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_control_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_control_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_control_append_only;function=fn_cajas_control_append_only;branch=R0001;family=APPEND_ONLY', HINT='messageId=C14_INV_FN_FN_CAJAS_CONTROL_APPEND_ONLY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_control_line_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_control_line_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_control_line_append_only;function=fn_cajas_control_line_append_only;branch=R0001;family=APPEND_ONLY', HINT='messageId=C14_INV_FN_FN_CAJAS_CONTROL_LINE_APPEND_ONLY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_control_min_line(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_control_min_line() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_NAME = 'cajas_control' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_control_line" AS "line" WHERE ("line"."company_id","line"."control_id")=(NEW."company_id",NEW."id")) INTO v_valid;
  ELSE
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_control_line" AS "line" WHERE ("line"."company_id","line"."control_id")=(OLD."company_id",OLD."control_id"))
      AND (TG_OP <> 'UPDATE' OR (NEW."company_id",NEW."control_id")=(OLD."company_id",OLD."control_id") OR EXISTS (SELECT 1 FROM "public"."cajas_control_line" AS "line" WHERE ("line"."company_id","line"."control_id")=(NEW."company_id",NEW."control_id"))) INTO v_valid;
  END IF;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_control_min_line;function=fn_cajas_control_min_line;branch=R0001;family=MINIMUM_LINE', HINT='messageId=C14_INV_FN_FN_CAJAS_CONTROL_MIN_LINE', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_correlation_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_correlation_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_correlation_append_only;function=fn_cajas_correlation_append_only;branch=R0001;family=APPEND_ONLY', HINT='messageId=C14_INV_FN_FN_CAJAS_CORRELATION_APPEND_ONLY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_difference_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_difference_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_difference_append_only' ||
             ';function=fn_cajas_difference_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_DIFFERENCE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_difference_resolution_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_difference_resolution_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_difference_resolution_append_only' ||
             ';function=fn_cajas_difference_resolution_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_DIFFERENCE_RESOLUTION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_dispatch_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_dispatch_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_dispatch_append_only' ||
             ';function=fn_cajas_dispatch_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_DISPATCH_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_dispatch_ceiling(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_dispatch_ceiling() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_valid boolean;
BEGIN
  WITH "currentHeader" AS (
    SELECT "header".* FROM "public"."cajas_dispatch" AS "header"
    WHERE "header"."company_id" = NEW."company_id" AND "header"."id" = NEW."dispatch_id"
      AND NOT EXISTS (SELECT 1 FROM "public"."cajas_dispatch" AS "child" WHERE "child"."company_id" = "header"."company_id" AND "child"."corrects_dispatch_id" = "header"."id")
  ), "candidateLines" AS (
    SELECT "header"."sequence" AS "header_sequence", "line"."id", "line"."line_number", "line"."record_kind", "line"."accounting_sign", "line"."neutralizes_dispatch_line_id", "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."quantity", "line"."stock_unit", "line"."scale_snapshot", "line"."stock_evidence_line_id"
    FROM "currentHeader" AS "header"
    JOIN "public"."cajas_dispatch_line" AS "line" ON "line"."company_id" = "header"."company_id" AND "line"."dispatch_id" = "header"."id"
    WHERE "line"."id" <> NEW."id"
    UNION ALL
    SELECT "header"."sequence", NEW."id", NEW."line_number", NEW."record_kind", NEW."accounting_sign", NEW."neutralizes_dispatch_line_id", NEW."source_control_line_id", NEW."article_id", NEW."stock_position_id", NEW."quantity", NEW."stock_unit", NEW."scale_snapshot", NEW."stock_evidence_line_id"
    FROM "currentHeader" AS "header"
  ), "ordered" AS (
    SELECT "line".*, SUM("line"."accounting_sign" * "line"."quantity") OVER (PARTITION BY "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."stock_unit", "line"."scale_snapshot" ORDER BY "line"."header_sequence", "line"."line_number", convert_to("line"."id", 'UTF8') ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "prefix_net"
    FROM "candidateLines" AS "line"
  ), "scopeTotals" AS (
    SELECT "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."stock_unit", "line"."scale_snapshot", SUM("line"."accounting_sign" * "line"."quantity") AS "net"
    FROM "candidateLines" AS "line"
    GROUP BY "line"."source_control_line_id", "line"."article_id", "line"."stock_position_id", "line"."stock_unit", "line"."scale_snapshot"
  )
  SELECT EXISTS (
    SELECT 1 FROM "currentHeader" AS "header"
    JOIN "public"."cajas_control_line" AS "control" ON "control"."company_id" = NEW."company_id" AND "control"."assignment_id" = "header"."assignment_id" AND "control"."id" = NEW."source_control_line_id"
    JOIN "public"."StockEvidenceLine" AS "evidence" ON "evidence"."companyId" = NEW."company_id" AND "evidence"."id" = NEW."stock_evidence_line_id"
    WHERE NEW."assignment_id" = "header"."assignment_id" AND NEW."remito_id" = "header"."remito_id" AND NEW."article_id" = "control"."article_id" AND NEW."stock_position_id" IS NOT DISTINCT FROM "control"."stock_position_id" AND NEW."stock_unit" = "control"."stock_unit" AND NEW."scale_snapshot" = "control"."scale_snapshot" AND NEW."article_id" = "evidence"."articleId" AND NEW."stock_position_id" = "evidence"."fromPositionId" AND NEW."quantity" = "evidence"."quantity" AND NEW."stock_unit" = "evidence"."stockUnit" AND NEW."scale_snapshot" = "evidence"."scaleSnapshot" AND NEW."record_kind" IN ('ORIGINAL','REVERSAL') AND ((NEW."record_kind" = 'ORIGINAL' AND NEW."accounting_sign" = 1 AND NEW."neutralizes_dispatch_line_id" IS NULL) OR (NEW."record_kind" = 'REVERSAL' AND NEW."accounting_sign" = -1 AND NEW."neutralizes_dispatch_line_id" IS NOT NULL AND EXISTS (SELECT 1 FROM "candidateLines" AS "target" WHERE "target"."id" = NEW."neutralizes_dispatch_line_id" AND "target"."record_kind" = 'ORIGINAL' AND "target"."source_control_line_id" = NEW."source_control_line_id" AND "target"."article_id" = NEW."article_id" AND "target"."stock_position_id" IS NOT DISTINCT FROM NEW."stock_position_id" AND "target"."quantity" = NEW."quantity" AND "target"."stock_unit" = NEW."stock_unit" AND "target"."scale_snapshot" = NEW."scale_snapshot"))) AND ("header"."record_kind" <> 'CORRECTION' OR (NEW."record_kind" = 'ORIGINAL' AND NEW."accounting_sign" = 1 AND NEW."neutralizes_dispatch_line_id" IS NULL)) AND NOT EXISTS (SELECT 1 FROM "candidateLines" AS "line" LEFT JOIN "public"."cajas_control_line" AS "source" ON "source"."company_id" = NEW."company_id" AND "source"."assignment_id" = "header"."assignment_id" AND "source"."id" = "line"."source_control_line_id" LEFT JOIN "public"."StockEvidenceLine" AS "sourceEvidence" ON "sourceEvidence"."companyId" = NEW."company_id" AND "sourceEvidence"."id" = "line"."stock_evidence_line_id" WHERE "source"."id" IS NULL OR "sourceEvidence"."id" IS NULL OR "line"."article_id" <> "source"."article_id" OR "line"."stock_position_id" IS DISTINCT FROM "source"."stock_position_id" OR "line"."stock_unit" <> "source"."stock_unit" OR "line"."scale_snapshot" <> "source"."scale_snapshot" OR "line"."article_id" <> "sourceEvidence"."articleId" OR "line"."stock_position_id" IS DISTINCT FROM "sourceEvidence"."fromPositionId" OR "line"."quantity" <> "sourceEvidence"."quantity" OR "line"."stock_unit" <> "sourceEvidence"."stockUnit" OR "line"."scale_snapshot" <> "sourceEvidence"."scaleSnapshot") AND NOT EXISTS (SELECT 1 FROM "ordered" AS "line" JOIN "public"."cajas_control_line" AS "source" ON "source"."company_id" = NEW."company_id" AND "source"."assignment_id" = "header"."assignment_id" AND "source"."id" = "line"."source_control_line_id" WHERE "line"."prefix_net" < 0 OR "line"."prefix_net" > "source"."quantity") AND NOT EXISTS (SELECT 1 FROM "scopeTotals" AS "scope" JOIN "public"."cajas_control_line" AS "source" ON "source"."company_id" = NEW."company_id" AND "source"."assignment_id" = "header"."assignment_id" AND "source"."id" = "scope"."source_control_line_id" WHERE "scope"."net" < 0 OR "scope"."net" > "source"."quantity")
  ) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_dispatch_ceiling;function=fn_cajas_dispatch_ceiling;branch=R0001;family=AGGREGATE_OR_SERIALIZATION_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_DISPATCH_CEILING', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_dispatch_line_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_dispatch_line_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_dispatch_line_append_only' ||
             ';function=fn_cajas_dispatch_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_DISPATCH_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_dispatch_min_line(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_dispatch_min_line() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_NAME = 'cajas_dispatch' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_dispatch_line" AS "line" WHERE ("line"."company_id","line"."dispatch_id")=(NEW."company_id",NEW."id")) INTO v_valid;
  ELSE
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_dispatch_line" AS "line" WHERE ("line"."company_id","line"."dispatch_id")=(OLD."company_id",OLD."dispatch_id"))
      AND (TG_OP <> 'UPDATE' OR (NEW."company_id",NEW."dispatch_id")=(OLD."company_id",OLD."dispatch_id") OR EXISTS (SELECT 1 FROM "public"."cajas_dispatch_line" AS "line" WHERE ("line"."company_id","line"."dispatch_id")=(NEW."company_id",NEW."dispatch_id"))) INTO v_valid;
  END IF;
  IF v_valid IS TRUE THEN RETURN NULL; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_dispatch_min_line;function=fn_cajas_dispatch_min_line;branch=R0001;family=MINIMUM_LINE', HINT='messageId=C14_INV_FN_FN_CAJAS_DISPATCH_MIN_LINE', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_disposition_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_disposition_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_disposition_append_only' ||
             ';function=fn_cajas_disposition_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_DISPOSITION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_disposition_fold_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_disposition_fold_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  WITH "rows" AS (SELECT "d".* FROM "public"."cajas_disposition" AS "d" WHERE "d"."company_id" = NEW."company_id" AND "d"."dispatch_line_id" = NEW."dispatch_line_id" AND "d"."id" <> NEW."id" UNION ALL SELECT NEW.*), "fold" AS (SELECT COALESCE(SUM("accounting_sign" * "quantity") FILTER (WHERE "kind" IN ('returned','consumed','missing','damaged')),0::numeric) AS "final", COALESCE(SUM("accounting_sign" * "quantity") FILTER (WHERE "kind" = 'under_review'),0::numeric) AS "hold" FROM "rows"), "dispatchNet" AS (SELECT COALESCE(SUM("line"."accounting_sign" * "line"."quantity"),0::numeric) AS "net" FROM "public"."cajas_dispatch_line" AS "line" WHERE "line"."company_id" = NEW."company_id" AND "line"."dispatch_id" = NEW."dispatch_id" AND ("line"."id" = NEW."dispatch_line_id" OR "line"."neutralizes_dispatch_line_id" = NEW."dispatch_line_id"))
  SELECT EXISTS (SELECT 1 FROM "public"."cajas_dispatch" AS "header" CROSS JOIN "fold" CROSS JOIN "dispatchNet" WHERE "header"."company_id" = NEW."company_id" AND "header"."id" = NEW."dispatch_id" AND "fold"."final" >= 0 AND "fold"."hold" >= 0 AND "dispatchNet"."net" - "fold"."final" - "fold"."hold" >= 0 AND ((NEW."return_confirmation_id" IS NOT NULL AND NEW."return_line_id" IS NOT NULL AND NEW."consumption_confirmation_id" IS NULL AND NEW."consumption_line_id" IS NULL) OR (NEW."return_confirmation_id" IS NULL AND NEW."return_line_id" IS NULL AND NEW."consumption_confirmation_id" IS NOT NULL AND NEW."consumption_line_id" IS NOT NULL)) AND ((NEW."record_kind" = 'ORIGINAL' AND NEW."accounting_sign" = 1 AND NEW."neutralizes_disposition_id" IS NULL) OR (NEW."record_kind" = 'REVERSAL' AND NEW."accounting_sign" = -1 AND NEW."neutralizes_disposition_id" IS NOT NULL AND EXISTS (SELECT 1 FROM "rows" AS "target" WHERE "target"."id" = NEW."neutralizes_disposition_id" AND "target"."record_kind" = 'ORIGINAL' AND "target"."kind" = NEW."kind" AND "target"."article_id" = NEW."article_id" AND "target"."stock_position_id" IS NOT DISTINCT FROM NEW."stock_position_id" AND "target"."quantity" = NEW."quantity" AND "target"."stock_unit" = NEW."stock_unit" AND "target"."scale_snapshot" = NEW."scale_snapshot" AND "target"."return_confirmation_id" IS NOT DISTINCT FROM NEW."return_confirmation_id" AND "target"."return_line_id" IS NOT DISTINCT FROM NEW."return_line_id" AND "target"."consumption_confirmation_id" IS NOT DISTINCT FROM NEW."consumption_confirmation_id" AND "target"."consumption_line_id" IS NOT DISTINCT FROM NEW."consumption_line_id" AND NOT EXISTS (SELECT 1 FROM "rows" AS "other" WHERE "other"."neutralizes_disposition_id" = "target"."id" AND "other"."id" <> NEW."id"))))) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_disposition_fold_guard;function=fn_cajas_disposition_fold_guard;branch=R0001;family=AGGREGATE_OR_SERIALIZATION_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_DISPOSITION_FOLD_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_formula_current_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_formula_current_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT
    (
      TG_OP = 'INSERT'
      AND NEW."current_version_id" IS NULL
      AND NEW."next_version_number" = 1
      AND NEW."version" = 1
    )
    OR EXISTS (
      SELECT 1
      FROM "public"."cajas_formula_version" AS "targetVersion"
      WHERE TG_OP = 'UPDATE'
        AND NEW."company_id" = OLD."company_id"
        AND NEW."id" = OLD."id"
        AND NEW."box_article_id" = OLD."box_article_id"
        AND NEW."current_version_id" IS NOT NULL
        AND "targetVersion"."company_id" = NEW."company_id"
        AND "targetVersion"."formula_id" = NEW."id"
        AND "targetVersion"."box_article_id" = NEW."box_article_id"
        AND "targetVersion"."id" = NEW."current_version_id"
        AND "targetVersion"."previous_version_id" IS NOT DISTINCT FROM OLD."current_version_id"
        AND "targetVersion"."version_number" = OLD."next_version_number"
        AND NEW."next_version_number" = "targetVersion"."version_number" + 1
        AND NEW."version" = OLD."version" + 1
    )
  INTO v_valid;

  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_cajas_formula_current_guard' ||
               ';function=fn_cajas_formula_current_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_CAJAS_FORMULA_CURRENT_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_formula_line_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_formula_line_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_formula_line_append_only' ||
             ';function=fn_cajas_formula_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_FORMULA_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_formula_version_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_formula_version_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_formula_version_append_only' ||
             ';function=fn_cajas_formula_version_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_FORMULA_VERSION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_formula_version_min_line(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_formula_version_min_line() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_valid boolean;
BEGIN
  IF TG_TABLE_NAME = 'cajas_formula_version' AND TG_OP = 'INSERT' THEN
    SELECT EXISTS (
      SELECT 1
      FROM "public"."cajas_formula_line" AS "formulaLine"
      WHERE "formulaLine"."company_id" = NEW."company_id"
        AND "formulaLine"."formula_version_id" = NEW."id"
    )
    INTO v_valid;
  ELSIF TG_TABLE_NAME = 'cajas_formula_line' AND TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT EXISTS (
      SELECT 1
      FROM "public"."cajas_formula_line" AS "formulaLine"
      WHERE "formulaLine"."company_id" = OLD."company_id"
        AND "formulaLine"."formula_version_id" = OLD."formula_version_id"
    )
    INTO v_valid;
  ELSE
    v_valid := FALSE;
  END IF;

  IF v_valid IS TRUE THEN
    RETURN NULL;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_cajas_formula_version_min_line' ||
               ';function=fn_cajas_formula_version_min_line' ||
               ';branch=R0001' ||
               ';family=MINIMUM_LINE',
      HINT = 'messageId=C14_INV_FN_FN_CAJAS_FORMULA_VERSION_MIN_LINE',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_maintenance_consistency(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_maintenance_consistency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  target_company_id TEXT;
  target_case_id TEXT;
  case_version INTEGER;
  case_status "cajas_maintenance_status";
  transition_sequence INTEGER;
  transition_status "cajas_maintenance_status";
BEGIN
  target_company_id := NEW."company_id";
  IF TG_TABLE_NAME = 'cajas_maintenance_case' THEN
    target_case_id := NEW."id";
  ELSE
    target_case_id := NEW."case_id";
  END IF;

  SELECT "version", "status"
    INTO case_version, case_status
    FROM "public"."cajas_maintenance_case"
   WHERE "company_id" = target_company_id AND "id" = target_case_id;

  SELECT "sequence", "to_status"
    INTO transition_sequence, transition_status
    FROM "public"."cajas_maintenance_transition"
   WHERE "company_id" = target_company_id AND "case_id" = target_case_id
   ORDER BY "sequence" DESC
   LIMIT 1;

  IF case_version IS NULL
     OR transition_sequence IS NULL
     OR case_version <> transition_sequence
     OR case_status IS DISTINCT FROM transition_status THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance case and transition history are inconsistent';
  END IF;

  RETURN NULL;
END;
$$;


--
-- Name: fn_cajas_phase_d_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_phase_d_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN RAISE EXCEPTION 'Phase D history is append-only'; END; $$;


--
-- Name: fn_cajas_preparation_box_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_preparation_box_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM "public"."cajas_assignment" AS "assignment" WHERE ("assignment"."company_id","assignment"."id","assignment"."box_article_id")=(NEW."company_id",NEW."assignment_id",NEW."box_article_id"))
    AND EXISTS (SELECT 1 FROM "public"."cajas_formula_version" AS "version" WHERE ("version"."company_id","version"."id","version"."box_article_id")=(NEW."company_id",NEW."formula_version_id",NEW."box_article_id")) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_preparation_box_guard;function=fn_cajas_preparation_box_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_PREPARATION_BOX_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_preparation_pointer_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_preparation_pointer_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  SELECT (NEW."latest_control_id" IS NULL OR EXISTS (SELECT 1 FROM "public"."cajas_control" AS "control" WHERE ("control"."company_id","control"."assignment_id","control"."id")=(NEW."company_id",NEW."assignment_id",NEW."latest_control_id")))
    AND (NEW."last_accepted_change_id" IS NULL OR EXISTS (SELECT 1 FROM "public"."cajas_composition_change" AS "change" WHERE ("change"."company_id","change"."assignment_id","change"."id")=(NEW."company_id",NEW."assignment_id",NEW."last_accepted_change_id"))) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_preparation_pointer_guard;function=fn_cajas_preparation_pointer_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_PREPARATION_POINTER_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_replacement_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_replacement_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_replacement_append_only' ||
             ';function=fn_cajas_replacement_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_REPLACEMENT_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_return_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_return_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_return_append_only' ||
             ';function=fn_cajas_return_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_RETURN_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_return_line_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_return_line_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_cajas_return_line_append_only' ||
             ';function=fn_cajas_return_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_CAJAS_RETURN_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_cajas_return_min_line(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_return_min_line() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_NAME = 'cajas_return_confirmation' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_return_line" AS "line" WHERE ("line"."company_id","line"."return_confirmation_id")=(NEW."company_id",NEW."id")) INTO v_valid;
  ELSE
    SELECT EXISTS (SELECT 1 FROM "public"."cajas_return_line" AS "line" WHERE ("line"."company_id","line"."return_confirmation_id")=(OLD."company_id",OLD."return_confirmation_id"))
      AND (TG_OP <> 'UPDATE' OR (NEW."company_id",NEW."return_confirmation_id")=(OLD."company_id",OLD."return_confirmation_id") OR EXISTS (SELECT 1 FROM "public"."cajas_return_line" AS "line" WHERE ("line"."company_id","line"."return_confirmation_id")=(NEW."company_id",NEW."return_confirmation_id"))) INTO v_valid;
  END IF;
  IF v_valid IS TRUE THEN RETURN NULL; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_return_min_line;function=fn_cajas_return_min_line;branch=R0001;family=MINIMUM_LINE', HINT='messageId=C14_INV_FN_FN_CAJAS_RETURN_MIN_LINE', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_stock_link_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_stock_link_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  IF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'cajas_dispatch_line' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."StockEvidenceLine" AS "line" JOIN "public"."StockEvidence" AS "evidence" ON "evidence"."companyId" = "line"."companyId" AND "evidence"."id" = "line"."evidenceId" WHERE "line"."companyId" = NEW."company_id" AND "line"."id" = NEW."stock_evidence_line_id" AND "evidence"."kind" = 'DISPATCH' AND "line"."articleId" = NEW."article_id" AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL AND "line"."quantity" = NEW."quantity" AND "line"."stockUnit" = NEW."stock_unit" AND "line"."scaleSnapshot" = NEW."scale_snapshot" AND "evidence"."commandAcceptanceId" = (SELECT "header"."command_acceptance_id" FROM "public"."cajas_dispatch" AS "header" WHERE "header"."company_id" = NEW."company_id" AND "header"."id" = NEW."dispatch_id")) INTO v_valid;
  ELSIF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'cajas_disposition' THEN
    SELECT EXISTS (SELECT 1 FROM "public"."StockEvidenceLine" AS "line" JOIN "public"."StockEvidence" AS "evidence" ON "evidence"."companyId" = "line"."companyId" AND "evidence"."id" = "line"."evidenceId" WHERE "line"."companyId" = NEW."company_id" AND "line"."id" = NEW."stock_evidence_line_id" AND "line"."articleId" = NEW."article_id" AND "line"."quantity" = NEW."quantity" AND "line"."stockUnit" = NEW."stock_unit" AND "line"."scaleSnapshot" = NEW."scale_snapshot" AND "evidence"."commandAcceptanceId" = NEW."command_acceptance_id" AND ((NEW."kind" = 'returned' AND NEW."stock_position_id" IS NULL AND "evidence"."kind" = 'RETURN' AND "line"."fromPositionId" IS NULL AND "line"."toPositionId" IS NOT NULL) OR (NEW."kind" = 'consumed' AND "evidence"."kind" = 'CONSUMPTION' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL) OR (NEW."kind" IN ('missing','damaged') AND "evidence"."kind" = 'COUNT_OBSERVATION' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL) OR (NEW."kind" = 'under_review' AND NEW."record_kind" = 'ORIGINAL' AND "evidence"."kind" = 'REVIEW_HOLD' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL) OR (NEW."kind" = 'under_review' AND NEW."record_kind" = 'REVERSAL' AND "evidence"."kind" = 'REVIEW_RELEASE' AND "line"."fromPositionId" = NEW."stock_position_id" AND "line"."toPositionId" IS NULL))) INTO v_valid;
  ELSE v_valid := false;
  END IF;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_cajas_stock_link_guard;function=fn_cajas_stock_link_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_CAJAS_STOCK_LINK_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_cajas_unit_log_entry_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cajas_unit_log_entry_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas unit log entries are append-only';
END;
$$;


--
-- Name: fn_cmc_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cmc_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'open' OR NEW."version" <> 1 THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance cases must start open at version 1';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance cases cannot be deleted';
  END IF;

  IF OLD."id" IS DISTINCT FROM NEW."id"
     OR OLD."company_id" IS DISTINCT FROM NEW."company_id"
     OR OLD."box_identified_unit_id" IS DISTINCT FROM NEW."box_identified_unit_id"
     OR OLD."article_id" IS DISTINCT FROM NEW."article_id"
     OR OLD."kind" IS DISTINCT FROM NEW."kind"
     OR OLD."description" IS DISTINCT FROM NEW."description"
     OR OLD."opened_at" IS DISTINCT FROM NEW."opened_at"
     OR OLD."opened_by_id" IS DISTINCT FROM NEW."opened_by_id"
     OR OLD."created_at" IS DISTINCT FROM NEW."created_at" THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance case identity and opening evidence are immutable';
  END IF;

  IF NEW."version" <> OLD."version" + 1
     OR NOT (
       (OLD."status" = 'open' AND NEW."status" IN ('sent', 'cancelled'))
       OR (OLD."status" = 'sent' AND NEW."status" = 'returned_pending_review')
       OR (OLD."status" = 'returned_pending_review' AND NEW."status" = 'closed')
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'invalid cajas maintenance case transition';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: fn_cmt_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cmt_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance transitions are append-only';
END;
$$;


--
-- Name: fn_cmt_audit_evidence_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cmt_audit_evidence_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "public"."cajas_maintenance_transition"
     WHERE "company_id" = OLD."companyId" AND "audit_event_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance audit evidence is immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_cmt_insert_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cmt_insert_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  previous_status "cajas_maintenance_status";
  case_opened_at TIMESTAMPTZ(6);
  case_opened_by_id TEXT;
  accepted_command RECORD;
  audit_event RECORD;
  expected_checkpoint TEXT;
  expected_action TEXT;
BEGIN
  IF NEW."sequence" = 1 THEN
    SELECT "opened_at", "opened_by_id"
      INTO case_opened_at, case_opened_by_id
      FROM "public"."cajas_maintenance_case"
     WHERE "company_id" = NEW."company_id" AND "id" = NEW."case_id";

    IF case_opened_at IS DISTINCT FROM NEW."accepted_at"
       OR case_opened_by_id IS DISTINCT FROM NEW."accepted_by_id" THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance opening attribution is inconsistent';
    END IF;
  ELSE
    SELECT "to_status"
      INTO previous_status
      FROM "public"."cajas_maintenance_transition"
     WHERE "company_id" = NEW."company_id"
       AND "case_id" = NEW."case_id"
       AND "sequence" = NEW."sequence" - 1;

    IF NOT FOUND OR previous_status IS DISTINCT FROM NEW."from_status" THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance transition history must be contiguous';
    END IF;
  END IF;

  expected_checkpoint := CASE WHEN NEW."sequence" = 1 THEN 'maintenance-case-create' ELSE 'maintenance-case-transition' END;
  expected_action := CASE WHEN NEW."sequence" = 1 THEN 'maintenance_case_opened' ELSE 'maintenance_case_transitioned' END;

  SELECT *
    INTO accepted_command
    FROM "public"."OperationalCommandAcceptance"
   WHERE "companyId" = NEW."company_id" AND "id" = NEW."command_acceptance_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance command attribution is missing';
  END IF;

  IF accepted_command."domain" IS DISTINCT FROM 'cajas'
     OR accepted_command."checkpoint" IS DISTINCT FROM expected_checkpoint
     OR accepted_command."resultEntityType" IS DISTINCT FROM 'CajasMaintenanceCase'
     OR accepted_command."resultEntityId" IS DISTINCT FROM NEW."case_id"
     OR accepted_command."acceptedById" IS DISTINCT FROM NEW."accepted_by_id"
     OR accepted_command."acceptedAt" IS DISTINCT FROM NEW."accepted_at"
     OR accepted_command."auditEventId" IS DISTINCT FROM NEW."audit_event_id" THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance command attribution is inconsistent';
  END IF;

  SELECT *
    INTO audit_event
    FROM "public"."AuditEvent"
   WHERE "companyId" = NEW."company_id" AND "id" = NEW."audit_event_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance audit attribution is missing';
  END IF;

  IF audit_event."userId" IS DISTINCT FROM NEW."accepted_by_id"
     OR audit_event."entityType" IS DISTINCT FROM 'CajasMaintenanceCase'
     OR audit_event."entityId" IS DISTINCT FROM NEW."case_id"
     OR audit_event."action" IS DISTINCT FROM expected_action
     OR audit_event."module" IS DISTINCT FROM 'cajas'
     OR audit_event."createdAt" IS DISTINCT FROM NEW."accepted_at" THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'cajas maintenance audit attribution is inconsistent';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: fn_durable_attempt_audit_event_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_durable_attempt_audit_event_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'durable attempt audit events are append-only';
END;
$$;


--
-- Name: fn_operational_acceptance_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_operational_acceptance_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_operational_acceptance_append_only' ||
             ';function=fn_operational_acceptance_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_OPERATIONAL_ACCEPTANCE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_operational_effect_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_operational_effect_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_operational_effect_append_only' ||
             ';function=fn_operational_effect_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_OPERATIONAL_EFFECT_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_operational_semantic_intent_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_operational_semantic_intent_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_coherent boolean;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1
    FROM "public"."OperationalCommandAcceptance" AS "acceptedCommand"
    WHERE "acceptedCommand"."companyId" = NEW."companyId"
      AND "acceptedCommand"."domain" = NEW."domain"
      AND "acceptedCommand"."sourceOperationId" = NEW."sourceOperationId"
      AND "acceptedCommand"."checkpoint" = NEW."checkpoint"
      AND "acceptedCommand"."scopeKey" = NEW."scopeKey"
      AND "acceptedCommand"."id" <> NEW."id"
      AND (
        "acceptedCommand"."intentHash" IS DISTINCT FROM NEW."intentHash"
        OR "acceptedCommand"."resultEntityType" IS DISTINCT FROM NEW."resultEntityType"
        OR "acceptedCommand"."resultEntityId" IS DISTINCT FROM NEW."resultEntityId"
      )
  )
  INTO v_coherent;

  IF v_coherent IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_operational_semantic_intent_guard' ||
               ';function=fn_operational_semantic_intent_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_OPERATIONAL_SEMANTIC_INTENT_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_product_category_tree_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_product_category_tree_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  parent_depth INTEGER;
  max_relative_depth INTEGER;
  has_cycle BOOLEAN;
BEGIN
  IF NEW."parent_id" IS NOT NULL THEN
    SELECT parent."depth"
      INTO parent_depth
      FROM "public"."product_category" AS parent
     WHERE parent."organization_id" = NEW."organization_id"
       AND parent."id" = NEW."parent_id"
       AND parent."is_active" = true;

    IF parent_depth IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'product category parent must be active and belong to the same organization';
    END IF;

    IF NEW."depth" <> parent_depth + 1 THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'product category depth must equal parent depth plus one';
    END IF;
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT category."id", category."parent_id", ARRAY[category."id"]::TEXT[] AS path, false AS cycle
      FROM "public"."product_category" AS category
     WHERE category."organization_id" = NEW."organization_id" AND category."id" = NEW."id"
    UNION ALL
    SELECT parent."id", parent."parent_id", ancestors.path || parent."id", parent."id" = ANY(ancestors.path)
      FROM ancestors
      JOIN "public"."product_category" AS parent
        ON parent."organization_id" = NEW."organization_id" AND parent."id" = ancestors."parent_id"
     WHERE NOT ancestors.cycle
  )
  SELECT COALESCE(bool_or(cycle), false) INTO has_cycle FROM ancestors;

  IF has_cycle THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'product category hierarchy cannot contain cycles';
  END IF;

  WITH RECURSIVE subtree AS (
    SELECT NEW."id" AS id, 0 AS relative_depth, ARRAY[NEW."id"]::TEXT[] AS path
    UNION ALL
    SELECT child."id", subtree.relative_depth + 1, subtree.path || child."id"
      FROM subtree
      JOIN "public"."product_category" AS child
        ON child."organization_id" = NEW."organization_id" AND child."parent_id" = subtree.id
     WHERE NOT child."id" = ANY(subtree.path)
  )
  SELECT COALESCE(max(relative_depth), 0) INTO max_relative_depth FROM subtree;

  IF NEW."depth" + max_relative_depth > 3 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'product category subtree depth cannot exceed three';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "public"."product_category" AS child
     WHERE child."organization_id" = NEW."organization_id"
       AND child."parent_id" = NEW."id"
       AND (NEW."is_active" = false OR child."depth" <> NEW."depth" + 1)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'product category children require an active parent at the preceding depth';
  END IF;

  RETURN NULL;
END;
$$;


--
-- Name: fn_stock_evidence_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_evidence_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_evidence_append_only' ||
             ';function=fn_stock_evidence_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_EVIDENCE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_stock_evidence_line_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_evidence_line_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_evidence_line_append_only' ||
             ';function=fn_stock_evidence_line_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_EVIDENCE_LINE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_stock_evidence_line_parent_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_evidence_line_parent_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "public"."StockEvidence" AS "evidence"
    LEFT JOIN "public"."StockEvidence" AS "baseEvidence"
      ON "baseEvidence"."companyId" = "evidence"."companyId"
     AND "baseEvidence"."id" = COALESCE("evidence"."correctsEvidenceId", "evidence"."reversesEvidenceId")
    LEFT JOIN "public"."StockEvidenceLine" AS "baseLine"
      ON "baseLine"."companyId" = "baseEvidence"."companyId"
     AND "baseLine"."evidenceId" = "baseEvidence"."id"
     AND "baseLine"."lineNumber" = NEW."lineNumber"
    WHERE "evidence"."companyId" = NEW."companyId"
      AND "evidence"."id" = NEW."evidenceId"
      AND (
        (
          "evidence"."recordKind" = 'ORIGINAL'
          AND "evidence"."kind" IN ('OPENING', 'RECEIPT', 'DISPATCH', 'RETURN', 'CONSUMPTION', 'COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
          AND "baseEvidence"."id" IS NULL
        )
        OR
        (
          "evidence"."recordKind" IN ('CORRECTION', 'REVERSAL')
          AND "baseEvidence"."id" IS NOT NULL
          AND "baseEvidence"."id" <> "evidence"."id"
          AND "baseEvidence"."recordKind" = 'ORIGINAL'
          AND "baseEvidence"."kind" IN ('OPENING', 'RECEIPT', 'DISPATCH', 'RETURN', 'CONSUMPTION', 'COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
          AND "baseEvidence"."correctsEvidenceId" IS NULL
          AND "baseEvidence"."reversesEvidenceId" IS NULL
          AND ("evidence"."sourceDomain", "evidence"."sourceEntityType", "evidence"."sourceEntityId") = ("baseEvidence"."sourceDomain", "baseEvidence"."sourceEntityType", "baseEvidence"."sourceEntityId")
          AND "evidence"."activationBoundaryId" IS NOT DISTINCT FROM "baseEvidence"."activationBoundaryId"
          AND "evidence"."acceptedAt" >= "baseEvidence"."acceptedAt"
          AND "baseLine"."id" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "public"."StockEvidence" AS "otherAdjustment"
            WHERE "otherAdjustment"."companyId" = "baseEvidence"."companyId"
              AND "otherAdjustment"."id" <> "evidence"."id"
              AND (
                "otherAdjustment"."correctsEvidenceId" = "baseEvidence"."id" OR "otherAdjustment"."reversesEvidenceId" = "baseEvidence"."id"
              )
          )
        )
      )
      AND (
        (
          COALESCE("baseEvidence"."kind", "evidence"."kind") IN ('OPENING', 'RECEIPT', 'RETURN')
          AND NEW."fromPositionId" IS NULL
          AND NEW."toPositionId" IS NOT NULL
        )
        OR
        (
          COALESCE("baseEvidence"."kind", "evidence"."kind") IN ('DISPATCH', 'CONSUMPTION', 'COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
          AND NEW."fromPositionId" IS NOT NULL
          AND NEW."toPositionId" IS NULL
        )
        OR
        (
          "evidence"."recordKind" = 'REVERSAL'
          AND "baseEvidence"."kind" IN ('OPENING', 'RECEIPT', 'RETURN')
          AND NEW."fromPositionId" = "baseLine"."toPositionId"
          AND NEW."toPositionId" IS NULL
        )
        OR
        (
          "evidence"."recordKind" = 'REVERSAL'
          AND "baseEvidence"."kind" IN ('DISPATCH', 'CONSUMPTION')
          AND NEW."fromPositionId" IS NULL
          AND NEW."toPositionId" = "baseLine"."fromPositionId"
        )
      )
      AND (
        COALESCE("baseEvidence"."kind", "evidence"."kind") <> 'OPENING'
        OR EXISTS (
          SELECT 1
          FROM "public"."StockActivationBoundary" AS "boundary"
          WHERE "boundary"."companyId" = "evidence"."companyId"
            AND "boundary"."id" = COALESCE("baseEvidence"."activationBoundaryId", "evidence"."activationBoundaryId")
            AND "boundary"."positionId" = COALESCE("baseLine"."toPositionId", NEW."toPositionId")
            AND "evidence"."acceptedAt" >= "boundary"."cutoffAt"
        )
      )
      AND (
        COALESCE("baseEvidence"."kind", "evidence"."kind") = 'OPENING'
        OR "evidence"."activationBoundaryId" IS NULL
      )
      AND (
        "evidence"."recordKind" = 'ORIGINAL'
        OR (
          (NEW."articleId", NEW."stockUnit", NEW."scaleSnapshot") = ("baseLine"."articleId", "baseLine"."stockUnit", "baseLine"."scaleSnapshot")
          AND (NEW."reservationId", NEW."sourceLineId") IS NOT DISTINCT FROM ("baseLine"."reservationId", "baseLine"."sourceLineId")
          AND (
            (
              "evidence"."recordKind" = 'CORRECTION'
              AND NEW."fromPositionId" IS NOT DISTINCT FROM "baseLine"."fromPositionId"
              AND NEW."toPositionId" IS NOT DISTINCT FROM "baseLine"."toPositionId"
            )
            OR
            (
              "evidence"."recordKind" = 'REVERSAL'
              AND NEW."quantity" = "baseLine"."quantity"
              AND NEW."lotCodeSnapshot" IS NOT DISTINCT FROM "baseLine"."lotCodeSnapshot"
              AND NEW."expirationDateSnapshot" IS NOT DISTINCT FROM "baseLine"."expirationDateSnapshot"
              AND NEW."serialNumberSnapshot" IS NOT DISTINCT FROM "baseLine"."serialNumberSnapshot"
              AND NEW."identifiedCodeSnapshot" IS NOT DISTINCT FROM "baseLine"."identifiedCodeSnapshot"
              AND (
                (
                  "baseEvidence"."kind" IN ('OPENING', 'RECEIPT', 'RETURN')
                  AND NEW."fromPositionId" = "baseLine"."toPositionId"
                  AND NEW."toPositionId" IS NULL
                )
                OR
                (
                  "baseEvidence"."kind" IN ('DISPATCH', 'CONSUMPTION')
                  AND NEW."fromPositionId" IS NULL
                  AND NEW."toPositionId" = "baseLine"."fromPositionId"
                )
                OR
                (
                  "baseEvidence"."kind" IN ('COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
                  AND NEW."fromPositionId" = "baseLine"."fromPositionId"
                  AND NEW."toPositionId" IS NULL
                )
              )
            )
          )
        )
      )
      AND (
        "evidence"."recordKind" = 'REVERSAL'
        OR EXISTS (
          SELECT 1
          FROM "public"."StockPosition" AS "tracePosition"
          LEFT JOIN "public"."StockLot" AS "traceLot"
            ON "traceLot"."companyId" = "tracePosition"."companyId"
           AND "traceLot"."articleId" = "tracePosition"."articleId"
           AND "traceLot"."id" = "tracePosition"."lotId"
          LEFT JOIN "public"."StockLotObservation" AS "traceObservation"
            ON "traceObservation"."companyId" = "traceLot"."companyId"
           AND "traceObservation"."articleId" = "traceLot"."articleId"
           AND "traceObservation"."id" = "traceLot"."primaryObservationId"
          LEFT JOIN "public"."StockIdentifiedUnitCurrentConfiguration" AS "traceConfiguration"
            ON "traceConfiguration"."companyId" = "tracePosition"."companyId"
           AND "traceConfiguration"."identifiedUnitId" = "tracePosition"."identifiedUnitId"
          WHERE "tracePosition"."companyId" = NEW."companyId"
            AND "tracePosition"."articleId" = NEW."articleId"
            AND "tracePosition"."id" = COALESCE(NEW."fromPositionId", NEW."toPositionId")
            AND (
              (
                "tracePosition"."traceMode" = 'NONE'
                AND NEW."lotCodeSnapshot" IS NULL
                AND NEW."expirationDateSnapshot" IS NULL
                AND NEW."serialNumberSnapshot" IS NULL
                AND NEW."identifiedCodeSnapshot" IS NULL
              )
              OR
              (
                "tracePosition"."traceMode" = 'LOT'
                AND NEW."lotCodeSnapshot" = "traceObservation"."displayLotCode"
                AND NEW."expirationDateSnapshot" IS NOT DISTINCT FROM "traceObservation"."expirationDate"
                AND NEW."serialNumberSnapshot" IS NULL
                AND NEW."identifiedCodeSnapshot" IS NULL
              )
              OR
              (
                "tracePosition"."traceMode" = 'IDENTIFIED_UNIT'
                AND NEW."lotCodeSnapshot" IS NULL
                AND NEW."expirationDateSnapshot" IS NULL
                AND NEW."serialNumberSnapshot" IS NOT DISTINCT FROM "traceConfiguration"."serialNumber"
                AND NEW."identifiedCodeSnapshot" = "traceConfiguration"."internalCode"
              )
            )
        )
      )
      AND (
        NEW."reservationId" IS NULL
        OR (
          COALESCE("baseEvidence"."kind", "evidence"."kind") = 'DISPATCH'
          AND EXISTS (
            SELECT 1
            FROM "public"."StockReservation" AS "reservation"
            WHERE "reservation"."companyId" = NEW."companyId"
              AND "reservation"."id" = NEW."reservationId"
              AND "reservation"."positionId" = COALESCE("baseLine"."fromPositionId", NEW."fromPositionId")
          )
        )
      )
  ) INTO v_valid;

  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_stock_evidence_line_parent_guard' ||
               ';function=fn_stock_evidence_line_parent_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_EVIDENCE_LINE_PARENT_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_stock_identified_unit_exclusivity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_identified_unit_exclusivity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
DECLARE
  v_valid boolean;
BEGIN
  SELECT (NEW."evidenceWatermark" ~ '^cx04:[0-9a-f]{64}$') AND EXISTS (
    SELECT 1 FROM "public"."StockPosition" AS "position"
    WHERE "position"."companyId" = NEW."companyId"
      AND "position"."id" = NEW."currentPositionId"
      AND "position"."identifiedUnitId" = NEW."identifiedUnitId"
  ) AND ((TG_OP = 'INSERT' AND NEW."version" = 1) OR (TG_OP = 'UPDATE' AND NEW."id" = OLD."id" AND NEW."companyId" = OLD."companyId" AND NEW."identifiedUnitId" = OLD."identifiedUnitId" AND NEW."createdAt" = OLD."createdAt" AND ((NEW."currentPositionId" = OLD."currentPositionId" AND convert_to(NEW."evidenceWatermark", 'UTF8') = convert_to(OLD."evidenceWatermark", 'UTF8') AND NEW."version" = OLD."version") OR (NEW."currentPositionId" <> OLD."currentPositionId" AND convert_to(NEW."evidenceWatermark", 'UTF8') <> convert_to(OLD."evidenceWatermark", 'UTF8') AND OLD."version" < 2147483647 AND NEW."version" = OLD."version" + 1 AND NEW."version" > 0)))) INTO v_valid;
  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_identified_unit_exclusivity;function=fn_stock_identified_unit_exclusivity;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_IDENTIFIED_UNIT_EXCLUSIVITY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$_$;


--
-- Name: fn_stock_lot_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_lot_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_lot_append_only' ||
             ';function=fn_stock_lot_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_LOT_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_stock_lot_observation_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_lot_observation_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_lot_observation_append_only' ||
             ';function=fn_stock_lot_observation_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_LOT_OBSERVATION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_stock_lot_review_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_lot_review_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_lot_review_append_only' ||
             ';function=fn_stock_lot_review_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_LOT_REVIEW_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_stock_lot_review_coherence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_lot_review_coherence() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_coherent boolean;
BEGIN
  SELECT
    EXISTS (
      SELECT 1
      FROM "public"."StockLotObservation" AS "leftObservation"
      WHERE "leftObservation"."companyId" = NEW."companyId"
        AND "leftObservation"."articleId" = NEW."articleId"
        AND "leftObservation"."id" = NEW."leftObservationId"
        AND "leftObservation"."normalizedLotCode" = NEW."normalizedLotCode"
    )
    AND EXISTS (
      SELECT 1
      FROM "public"."StockLotObservation" AS "rightObservation"
      WHERE "rightObservation"."companyId" = NEW."companyId"
        AND "rightObservation"."articleId" = NEW."articleId"
        AND "rightObservation"."id" = NEW."rightObservationId"
        AND "rightObservation"."normalizedLotCode" = NEW."normalizedLotCode"
    )
    AND (
      NEW."resolutionObservationId" IS NULL
      OR EXISTS (
        SELECT 1
        FROM "public"."StockLotObservation" AS "resolutionObservation"
        WHERE "resolutionObservation"."companyId" = NEW."companyId"
          AND "resolutionObservation"."articleId" = NEW."articleId"
          AND "resolutionObservation"."id" = NEW."resolutionObservationId"
          AND "resolutionObservation"."normalizedLotCode" = NEW."normalizedLotCode"
      )
    )
    AND (
      NEW."canonicalLotId" IS NULL
      OR EXISTS (
        SELECT 1
        FROM "public"."StockLot" AS "canonicalLot"
        WHERE "canonicalLot"."companyId" = NEW."companyId"
          AND "canonicalLot"."articleId" = NEW."articleId"
          AND "canonicalLot"."id" = NEW."canonicalLotId"
          AND "canonicalLot"."normalizedLotCode" = NEW."normalizedLotCode"
      )
    )
  INTO v_coherent;

  IF v_coherent IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_stock_lot_review_coherence' ||
               ';function=fn_stock_lot_review_coherence' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_LOT_REVIEW_COHERENCE',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_stock_opening_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_opening_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_opening_append_only;function=fn_stock_opening_append_only;branch=R0001;family=APPEND_ONLY', HINT='messageId=C14_INV_FN_FN_STOCK_OPENING_APPEND_ONLY', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_stock_opening_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_opening_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "public"."StockActivationBoundary" AS "boundary"
    JOIN "public"."StockEvidenceLine" AS "line"
      ON "line"."companyId" = NEW."companyId" AND "line"."id" = NEW."openingEvidenceLineId"
    JOIN "public"."StockEvidence" AS "evidence"
      ON "evidence"."companyId" = "line"."companyId" AND "evidence"."id" = "line"."evidenceId"
    JOIN "public"."StockPosition" AS "position"
      ON "position"."companyId" = NEW."companyId" AND "position"."id" = NEW."positionId"
    WHERE "boundary"."companyId" = NEW."companyId" AND "boundary"."id" = NEW."activationBoundaryId"
      AND "boundary"."positionId" = NEW."positionId" AND "boundary"."cutoffAt" = NEW."cutoffAt"
      AND "evidence"."kind" = 'OPENING' AND "evidence"."recordKind" = 'ORIGINAL'
      AND "evidence"."activationBoundaryId" = NEW."activationBoundaryId"
      AND "evidence"."acceptedAt" >= "boundary"."cutoffAt" AND NEW."acceptedAt" = "evidence"."acceptedAt"
      AND "line"."fromPositionId" IS NULL AND "line"."toPositionId" = NEW."positionId"
      AND "line"."quantity" = NEW."quantity" AND "line"."stockUnit" = NEW."stockUnit"
      AND "line"."scaleSnapshot" = NEW."scaleSnapshot"
      AND "position"."stockUnit" = NEW."stockUnit" AND "position"."quantityScale" = NEW."scaleSnapshot"
  ) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_opening_guard;function=fn_stock_opening_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_OPENING_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_stock_policy_current_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_policy_current_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_valid boolean;
BEGIN
  IF TG_OP = 'INSERT' AND NEW."currentPolicyVersionId" IS NULL AND NEW."version" = 1 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."currentPolicyVersionId" IS NULL AND NEW."currentPolicyVersionId" IS NULL
     AND NEW."version" = OLD."version"
     AND NEW."companyId" = OLD."companyId"
     AND NEW."organizationId" = OLD."organizationId"
     AND NEW."articleId" = OLD."articleId" THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."currentPolicyVersionId" IS NULL AND NEW."currentPolicyVersionId" IS NOT NULL
     AND NEW."version" = 1 AND NEW."companyId" = OLD."companyId"
     AND NEW."organizationId" = OLD."organizationId" AND NEW."articleId" = OLD."articleId" THEN
    SELECT EXISTS (
      SELECT 1
      FROM "public"."StockArticlePolicyVersion" AS "target"
      WHERE "target"."companyId" = NEW."companyId" AND "target"."eligibilityId" = NEW."id"
        AND "target"."id" = NEW."currentPolicyVersionId"
        AND "target"."versionNumber" = 1 AND "target"."previousVersionId" IS NULL
    ) INTO v_valid;
    IF v_valid IS TRUE THEN RETURN NEW; ELSE
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_policy_current_guard;function=fn_stock_policy_current_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_POLICY_CURRENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM "public"."StockArticlePolicyVersion" AS "target"
    LEFT JOIN "public"."StockArticlePolicyVersion" AS "prior"
      ON TG_OP = 'UPDATE' AND "prior"."companyId" = OLD."companyId"
     AND "prior"."eligibilityId" = OLD."id" AND "prior"."id" = OLD."currentPolicyVersionId"
    WHERE "target"."companyId" = NEW."companyId" AND "target"."eligibilityId" = NEW."id"
      AND "target"."id" = NEW."currentPolicyVersionId"
      AND ((TG_OP = 'INSERT' AND "target"."versionNumber" = 1 AND "target"."previousVersionId" IS NULL AND NEW."version" = 1)
        OR (TG_OP = 'UPDATE' AND NEW."companyId" = OLD."companyId" AND NEW."organizationId" = OLD."organizationId"
          AND NEW."articleId" = OLD."articleId" AND "target"."previousVersionId" = OLD."currentPolicyVersionId"
          AND "target"."versionNumber" = "prior"."versionNumber" + 1 AND NEW."version" = OLD."version" + 1))
  ) INTO v_valid;
  IF v_valid IS TRUE THEN RETURN NEW; ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_policy_current_guard;function=fn_stock_policy_current_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_POLICY_CURRENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_stock_position_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_position_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_position_append_only' ||
             ';function=fn_stock_position_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_POSITION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_stock_position_parent_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_position_parent_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "public"."StockArticleEligibility" AS "eligibility"
    JOIN "public"."StockArticlePolicyVersion" AS "policy"
      ON "policy"."companyId" = "eligibility"."companyId"
     AND "policy"."eligibilityId" = "eligibility"."id"
     AND "policy"."id" = NEW."policyVersionId"
    JOIN "public"."StockContext" AS "context"
      ON "context"."companyId" = NEW."companyId"
     AND "context"."id" = NEW."contextId"
    LEFT JOIN "public"."StockLot" AS "lot"
      ON "lot"."companyId" = NEW."companyId"
     AND "lot"."articleId" = NEW."articleId"
     AND "lot"."id" = NEW."lotId"
    LEFT JOIN "public"."StockIdentifiedUnit" AS "unit"
      ON "unit"."companyId" = NEW."companyId"
     AND "unit"."articleId" = NEW."articleId"
     AND "unit"."id" = NEW."identifiedUnitId"
    WHERE "eligibility"."companyId" = NEW."companyId"
      AND "eligibility"."articleId" = NEW."articleId"
      AND "eligibility"."id" = NEW."eligibilityId"
      AND "eligibility"."currentPolicyVersionId" = NEW."policyVersionId"
      AND "policy"."eligible" IS TRUE
      AND "policy"."traceMode" = NEW."traceMode"
      AND "policy"."stockUnit" = NEW."stockUnit"
      AND "policy"."quantityScale" = NEW."quantityScale"
      AND ((NEW."traceMode" = 'NONE' AND NEW."lotId" IS NULL AND NEW."identifiedUnitId" IS NULL) OR (NEW."traceMode" = 'LOT' AND NEW."lotId" IS NOT NULL AND NEW."identifiedUnitId" IS NULL AND "lot"."id" IS NOT NULL) OR (NEW."traceMode" = 'IDENTIFIED_UNIT' AND NEW."lotId" IS NULL AND NEW."identifiedUnitId" IS NOT NULL AND "unit"."id" IS NOT NULL))
  ) INTO v_valid;
  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation', DETAIL='c14e1;schema='||TG_TABLE_SCHEMA||';table='||TG_TABLE_NAME||';operation='||TG_OP||';invariant=function:fn_stock_position_parent_guard;function=fn_stock_position_parent_guard;branch=R0001;family=ROW_OR_CROSS_ROW_GUARD', HINT='messageId=C14_INV_FN_FN_STOCK_POSITION_PARENT_GUARD', CONSTRAINT=TG_NAME, SCHEMA=TG_TABLE_SCHEMA, TABLE=TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_stock_quantity_scale_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_quantity_scale_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT
    NOT EXISTS (
      SELECT 1
      FROM (VALUES (NEW."fromPositionId"), (NEW."toPositionId")) AS "referencedPosition"("positionId")
      WHERE "referencedPosition"."positionId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "public"."StockPosition" AS "position"
          WHERE ("position"."companyId", "position"."id") = (NEW."companyId", "referencedPosition"."positionId")
            AND ("position"."articleId", "position"."stockUnit", "position"."quantityScale") = (NEW."articleId", NEW."stockUnit", NEW."scaleSnapshot")
        )
    )
    AND (
      NEW."reservationId" IS NULL
      OR EXISTS (
        SELECT 1
        FROM "public"."StockReservation" AS "reservation"
        JOIN "public"."StockPosition" AS "reservedPosition"
          ON "reservedPosition"."companyId" = "reservation"."companyId"
         AND "reservedPosition"."id" = "reservation"."positionId"
        WHERE ("reservation"."companyId", "reservation"."id") = (NEW."companyId", NEW."reservationId")
          AND ("reservedPosition"."articleId", "reservedPosition"."stockUnit", "reservedPosition"."quantityScale") = (NEW."articleId", NEW."stockUnit", NEW."scaleSnapshot")
      )
    )
  INTO v_valid;

  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_stock_quantity_scale_guard' ||
               ';function=fn_stock_quantity_scale_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_QUANTITY_SCALE_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_stock_reservation_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_reservation_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_reservation_append_only' ||
             ';function=fn_stock_reservation_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_RESERVATION_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_stock_reservation_ceiling(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_reservation_ceiling() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_article_id text; v_position_unit text; v_identified_unit_id text;
  v_position_scale smallint; v_event_count bigint; v_max_sequence integer;
  v_live_before numeric(24,4); v_live_after numeric(24,4);
  v_ceiling numeric(24,4); v_scope_live_after numeric(24,4);
  v_other_unit_live boolean; v_valid boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;

  SELECT "position"."articleId", "position"."stockUnit",
         "position"."quantityScale", "reservation"."identifiedUnitId"
  INTO v_article_id, v_position_unit, v_position_scale, v_identified_unit_id
  FROM "public"."StockReservation" AS "reservation"
  JOIN "public"."StockPosition" AS "position"
    ON "position"."companyId" = "reservation"."companyId"
   AND "position"."id" = "reservation"."positionId"
  WHERE "reservation"."companyId" = NEW."companyId"
    AND "reservation"."id" = NEW."reservationId";

  SELECT COUNT(*), COALESCE(MAX("event"."sequence"), 0),
    COALESCE(SUM(CASE WHEN "event"."kind" IN ('RESERVE', 'REPLACE')
                      THEN "event"."quantity" ELSE -"event"."quantity" END), 0::numeric)
  INTO v_event_count, v_max_sequence, v_live_before
  FROM "public"."StockReservationEvidence" AS "event"
  WHERE "event"."companyId" = NEW."companyId"
    AND "event"."reservationId" = NEW."reservationId"
    AND ("event"."kind" NOT IN ('RESERVE', 'REPLACE') OR NOT EXISTS (
      SELECT 1 FROM "public"."StockReservationEvidence" AS "replacement"
      WHERE "replacement"."companyId" = "event"."companyId"
        AND "replacement"."reservationId" = "event"."reservationId"
        AND "replacement"."kind" = 'REPLACE'
        AND "replacement"."replacesEvidenceId" = "event"."id"));

  v_live_after := CASE NEW."kind"
    WHEN 'RESERVE' THEN v_live_before + NEW."quantity"
    WHEN 'REPLACE' THEN v_live_before + NEW."quantity" - (
      SELECT "target"."quantity" FROM "public"."StockReservationEvidence" AS "target"
      WHERE "target"."companyId" = NEW."companyId"
        AND "target"."reservationId" = NEW."reservationId"
        AND "target"."id" = NEW."replacesEvidenceId"
        AND "target"."kind" IN ('RESERVE', 'REPLACE')
        AND "target"."id" <> NEW."id"
        AND NOT EXISTS (
          SELECT 1 FROM "public"."StockReservationEvidence" AS "replacement"
          WHERE "replacement"."companyId" = "target"."companyId"
            AND "replacement"."reservationId" = "target"."reservationId"
            AND "replacement"."kind" = 'REPLACE'
            AND "replacement"."replacesEvidenceId" = "target"."id"))
    ELSE v_live_before - NEW."quantity" END;

  WITH "base" AS (
    SELECT "evidence"."id", "evidence"."kind", "evidence"."sourceDomain",
           "evidence"."sourceEntityType", "evidence"."sourceEntityId", "evidence"."acceptedAt"
    FROM "public"."StockEvidence" AS "evidence"
    WHERE "evidence"."companyId" = NEW."companyId"
      AND "evidence"."recordKind" = 'ORIGINAL'
      AND "evidence"."kind" IN ('OPENING', 'RECEIPT', 'DISPATCH', 'RETURN',
        'CONSUMPTION', 'COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
      AND "evidence"."correctsEvidenceId" IS NULL
      AND "evidence"."reversesEvidenceId" IS NULL
      AND "evidence"."acceptedAt" <= NEW."acceptedAt"
  ),
  "traceLine" AS (
    SELECT "line".*
    FROM "public"."StockEvidenceLine" AS "line"
    JOIN "public"."StockEvidence" AS "evidence"
      ON "evidence"."companyId" = "line"."companyId"
     AND "evidence"."id" = "line"."evidenceId"
    JOIN "public"."StockPosition" AS "tracePosition"
      ON "tracePosition"."companyId" = "line"."companyId"
     AND "tracePosition"."articleId" = "line"."articleId"
     AND "tracePosition"."id" = COALESCE("line"."fromPositionId", "line"."toPositionId")
    LEFT JOIN "public"."StockLot" AS "traceLot"
      ON "traceLot"."companyId" = "tracePosition"."companyId"
     AND "traceLot"."articleId" = "tracePosition"."articleId"
     AND "traceLot"."id" = "tracePosition"."lotId"
    LEFT JOIN "public"."StockLotObservation" AS "traceObservation"
      ON "traceObservation"."companyId" = "traceLot"."companyId"
     AND "traceObservation"."articleId" = "traceLot"."articleId"
     AND "traceObservation"."id" = "traceLot"."primaryObservationId"
    LEFT JOIN LATERAL (
      SELECT "configuration"."internalCode", "configuration"."serialNumber"
      FROM "public"."StockIdentifiedUnitConfigurationVersion" AS "configuration"
      WHERE "configuration"."companyId" = "tracePosition"."companyId"
        AND "configuration"."identifiedUnitId" = "tracePosition"."identifiedUnitId"
        AND "configuration"."effectiveAt" <= "evidence"."acceptedAt"
        AND "configuration"."acceptedAt" <= "evidence"."acceptedAt"
      ORDER BY "configuration"."effectiveAt" DESC, "configuration"."versionNumber" DESC,
               convert_to("configuration"."id", 'UTF8') DESC
      LIMIT 1
    ) AS "traceConfiguration" ON TRUE
    WHERE "evidence"."recordKind" IN ('ORIGINAL', 'CORRECTION')
      AND (
        ("tracePosition"."traceMode" = 'NONE'
         AND "tracePosition"."lotId" IS NULL AND "tracePosition"."identifiedUnitId" IS NULL
         AND "line"."lotCodeSnapshot" IS NULL AND "line"."expirationDateSnapshot" IS NULL
         AND "line"."serialNumberSnapshot" IS NULL AND "line"."identifiedCodeSnapshot" IS NULL)
        OR
        ("tracePosition"."traceMode" = 'LOT'
         AND "tracePosition"."lotId" IS NOT NULL AND "tracePosition"."identifiedUnitId" IS NULL
         AND "traceLot"."acceptedAt" <= "evidence"."acceptedAt"
         AND "traceObservation"."observedAt" <= "evidence"."acceptedAt"
         AND "line"."lotCodeSnapshot" = "traceObservation"."displayLotCode"
         AND "line"."expirationDateSnapshot" IS NOT DISTINCT FROM "traceObservation"."expirationDate"
         AND "line"."serialNumberSnapshot" IS NULL AND "line"."identifiedCodeSnapshot" IS NULL)
        OR
        ("tracePosition"."traceMode" = 'IDENTIFIED_UNIT'
         AND "tracePosition"."lotId" IS NULL AND "tracePosition"."identifiedUnitId" IS NOT NULL
         AND "traceConfiguration"."internalCode" IS NOT NULL
         AND "line"."lotCodeSnapshot" IS NULL AND "line"."expirationDateSnapshot" IS NULL
         AND "line"."serialNumberSnapshot" IS NOT DISTINCT FROM "traceConfiguration"."serialNumber"
         AND "line"."identifiedCodeSnapshot" = "traceConfiguration"."internalCode"))
  ),
  "candidateAdjustment" AS (
    SELECT "base"."id" AS "baseId", "base"."kind" AS "baseKind",
           "adjustment"."id" AS "adjustmentId", "adjustment"."recordKind" AS "adjustmentRecordKind"
    FROM "base"
    JOIN "public"."StockEvidence" AS "adjustment"
      ON "adjustment"."companyId" = NEW."companyId"
     AND "adjustment"."acceptedAt" BETWEEN "base"."acceptedAt" AND NEW."acceptedAt"
     AND (("adjustment"."recordKind" = 'CORRECTION' AND "adjustment"."kind" = 'CORRECTION'
           AND "adjustment"."correctsEvidenceId" = "base"."id"
           AND "adjustment"."reversesEvidenceId" IS NULL)
       OR ("adjustment"."recordKind" = 'REVERSAL' AND "adjustment"."kind" = 'REVERSAL'
           AND "adjustment"."reversesEvidenceId" = "base"."id"
           AND "adjustment"."correctsEvidenceId" IS NULL))
     AND ("adjustment"."sourceDomain", "adjustment"."sourceEntityType", "adjustment"."sourceEntityId")
       = ("base"."sourceDomain", "base"."sourceEntityType", "base"."sourceEntityId")
    WHERE (SELECT COUNT(*) FROM "public"."StockEvidence" AS "child"
           WHERE "child"."companyId" = NEW."companyId"
             AND "child"."acceptedAt" <= NEW."acceptedAt"
             AND ("child"."correctsEvidenceId" = "base"."id"
               OR "child"."reversesEvidenceId" = "base"."id")) = 1
  ),
  "validAdjustment" AS (
    SELECT "candidate".* FROM "candidateAdjustment" AS "candidate"
    WHERE EXISTS (SELECT 1 FROM "public"."StockEvidenceLine" AS "baseLine"
                  WHERE "baseLine"."companyId" = NEW."companyId"
                    AND "baseLine"."evidenceId" = "candidate"."baseId")
      AND (SELECT COUNT(*) FROM "public"."StockEvidenceLine" AS "baseLine"
           WHERE "baseLine"."companyId" = NEW."companyId"
             AND "baseLine"."evidenceId" = "candidate"."baseId")
        = (SELECT COUNT(*) FROM "public"."StockEvidenceLine" AS "adjustmentLine"
           WHERE "adjustmentLine"."companyId" = NEW."companyId"
             AND "adjustmentLine"."evidenceId" = "candidate"."adjustmentId")
      AND NOT EXISTS (
        SELECT 1 FROM "public"."StockEvidenceLine" AS "baseLine"
        WHERE "baseLine"."companyId" = NEW."companyId"
          AND "baseLine"."evidenceId" = "candidate"."baseId"
          AND NOT EXISTS (
            SELECT 1 FROM "public"."StockEvidenceLine" AS "adjustmentLine"
            WHERE "adjustmentLine"."companyId" = NEW."companyId"
              AND "adjustmentLine"."evidenceId" = "candidate"."adjustmentId"
              AND "adjustmentLine"."lineNumber" = "baseLine"."lineNumber"
              AND ("adjustmentLine"."articleId", "adjustmentLine"."reservationId",
                   "adjustmentLine"."stockUnit", "adjustmentLine"."scaleSnapshot",
                   "adjustmentLine"."sourceLineId") IS NOT DISTINCT FROM
                  ("baseLine"."articleId", "baseLine"."reservationId", "baseLine"."stockUnit",
                   "baseLine"."scaleSnapshot", "baseLine"."sourceLineId")
              AND (("candidate"."adjustmentRecordKind" = 'CORRECTION'
                    AND "adjustmentLine"."fromPositionId" IS NOT DISTINCT FROM "baseLine"."fromPositionId"
                    AND "adjustmentLine"."toPositionId" IS NOT DISTINCT FROM "baseLine"."toPositionId"
                    AND EXISTS (SELECT 1 FROM "traceLine" AS "trace"
                                WHERE "trace"."id" = "adjustmentLine"."id"))
                OR ("candidate"."adjustmentRecordKind" = 'REVERSAL'
                    AND "adjustmentLine"."quantity" = "baseLine"."quantity"
                    AND ("adjustmentLine"."lotCodeSnapshot", "adjustmentLine"."expirationDateSnapshot",
                         "adjustmentLine"."serialNumberSnapshot", "adjustmentLine"."identifiedCodeSnapshot")
                      IS NOT DISTINCT FROM
                        ("baseLine"."lotCodeSnapshot", "baseLine"."expirationDateSnapshot",
                         "baseLine"."serialNumberSnapshot", "baseLine"."identifiedCodeSnapshot")
                    AND (("candidate"."baseKind" IN ('OPENING', 'RECEIPT', 'RETURN')
                          AND "adjustmentLine"."fromPositionId" = "baseLine"."toPositionId"
                          AND "adjustmentLine"."toPositionId" IS NULL)
                      OR ("candidate"."baseKind" IN ('DISPATCH', 'CONSUMPTION')
                          AND "adjustmentLine"."fromPositionId" IS NULL
                          AND "adjustmentLine"."toPositionId" = "baseLine"."fromPositionId")
                      OR ("candidate"."baseKind" IN ('COUNT_OBSERVATION', 'REVIEW_HOLD', 'REVIEW_RELEASE')
                          AND "adjustmentLine"."fromPositionId" = "baseLine"."fromPositionId"
                          AND "adjustmentLine"."toPositionId" IS NULL))))))
  ),
  "effectiveLine" AS (
    SELECT "base"."kind", "line"."articleId", "line"."fromPositionId", "line"."toPositionId",
           "line"."quantity", "line"."stockUnit", "line"."scaleSnapshot"
    FROM "base" JOIN "traceLine" AS "line" ON "line"."companyId" = NEW."companyId"
      AND "line"."evidenceId" = "base"."id"
    WHERE NOT EXISTS (SELECT 1 FROM "validAdjustment" AS "adjustment"
                      WHERE "adjustment"."baseId" = "base"."id")
    UNION ALL
    SELECT "base"."kind", "line"."articleId", "line"."fromPositionId", "line"."toPositionId",
           "line"."quantity", "line"."stockUnit", "line"."scaleSnapshot"
    FROM "base" JOIN "validAdjustment" AS "correction"
      ON "correction"."baseId" = "base"."id"
     AND "correction"."adjustmentRecordKind" = 'CORRECTION'
    JOIN "traceLine" AS "line" ON "line"."companyId" = NEW."companyId"
      AND "line"."evidenceId" = "correction"."adjustmentId"
  )
  SELECT COALESCE(SUM(CASE
      WHEN "kind" IN ('OPENING', 'RECEIPT', 'RETURN')
       AND "toPositionId" = "reservation"."positionId" THEN "quantity"
      WHEN "kind" IN ('DISPATCH', 'CONSUMPTION')
       AND "fromPositionId" = "reservation"."positionId" THEN -"quantity"
      ELSE 0::numeric END), 0::numeric)
    - COALESCE(SUM(CASE
      WHEN "kind" = 'REVIEW_HOLD' AND "fromPositionId" = "reservation"."positionId" THEN "quantity"
      WHEN "kind" = 'REVIEW_RELEASE' AND "fromPositionId" = "reservation"."positionId" THEN -"quantity"
      ELSE 0::numeric END), 0::numeric)
  INTO v_ceiling
  FROM "effectiveLine" CROSS JOIN "public"."StockReservation" AS "reservation"
  WHERE "reservation"."companyId" = NEW."companyId"
    AND "reservation"."id" = NEW."reservationId"
    AND "articleId" = v_article_id AND "stockUnit" = v_position_unit
    AND "scaleSnapshot" = v_position_scale;

  WITH "liveByReservation" AS (
    SELECT "reservation"."id",
      COALESCE(SUM(CASE WHEN "event"."kind" IN ('RESERVE', 'REPLACE')
                        THEN "event"."quantity" ELSE -"event"."quantity" END) FILTER (
        WHERE "event"."kind" NOT IN ('RESERVE', 'REPLACE') OR NOT EXISTS (
          SELECT 1 FROM "public"."StockReservationEvidence" AS "replacement"
          WHERE "replacement"."companyId" = "event"."companyId"
            AND "replacement"."reservationId" = "event"."reservationId"
            AND "replacement"."kind" = 'REPLACE'
            AND "replacement"."replacesEvidenceId" = "event"."id")), 0::numeric) AS "live"
    FROM "public"."StockReservation" AS "reservation"
    LEFT JOIN "public"."StockReservationEvidence" AS "event"
      ON "event"."companyId" = "reservation"."companyId"
     AND "event"."reservationId" = "reservation"."id"
    WHERE "reservation"."companyId" = NEW."companyId"
      AND "reservation"."positionId" = (SELECT "currentReservation"."positionId"
        FROM "public"."StockReservation" AS "currentReservation"
        WHERE "currentReservation"."companyId" = NEW."companyId"
          AND "currentReservation"."id" = NEW."reservationId")
    GROUP BY "reservation"."id"
  )
  SELECT COALESCE(SUM("live"), 0::numeric) - v_live_before + v_live_after,
    COALESCE(BOOL_OR(v_identified_unit_id IS NOT NULL
      AND "reservation"."identifiedUnitId" = v_identified_unit_id
      AND "reservation"."id" <> NEW."reservationId" AND "live" > 0::numeric), false)
  INTO v_scope_live_after, v_other_unit_live
  FROM "liveByReservation" JOIN "public"."StockReservation" AS "reservation"
    ON "reservation"."companyId" = NEW."companyId"
   AND "reservation"."id" = "liveByReservation"."id";

  v_valid := v_article_id IS NOT NULL
    AND NEW."sequence" = v_max_sequence + 1
    AND NEW."stockUnit" = v_position_unit AND NEW."scaleSnapshot" = v_position_scale
    AND ((v_event_count = 0 AND NEW."kind" = 'RESERVE')
      OR (v_event_count > 0 AND v_live_before > 0::numeric))
    AND ((NEW."kind" = 'REPLACE' AND NEW."replacesEvidenceId" IS NOT NULL)
      OR (NEW."kind" <> 'REPLACE' AND NEW."replacesEvidenceId" IS NULL))
    AND (NEW."kind" <> 'CANCEL' OR NEW."quantity" = v_live_before)
    AND v_live_after >= 0::numeric AND v_ceiling >= 0::numeric
    AND v_scope_live_after >= 0::numeric AND v_scope_live_after <= v_ceiling
    AND NOT COALESCE(v_other_unit_live, false);

  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514', MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA || ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP || ';invariant=function:fn_stock_reservation_ceiling' ||
               ';function=fn_stock_reservation_ceiling;branch=R0001' ||
               ';family=AGGREGATE_OR_SERIALIZATION_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_RESERVATION_CEILING',
      CONSTRAINT = TG_NAME, SCHEMA = TG_TABLE_SCHEMA, TABLE = TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_stock_reservation_evidence_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_reservation_evidence_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_reservation_evidence_append_only' ||
             ';function=fn_stock_reservation_evidence_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_RESERVATION_EVIDENCE_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_stock_reservation_position_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_reservation_position_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_coherent boolean;
BEGIN
  SELECT
    EXISTS (
      SELECT 1
      FROM "public"."StockPosition" AS "position"
      WHERE "position"."companyId" = NEW."companyId"
        AND "position"."id" = NEW."positionId"
        AND (NEW."identifiedUnitId" IS NULL
             OR "position"."identifiedUnitId" = NEW."identifiedUnitId")
    )
    AND (
      NEW."identifiedUnitId" IS NULL
      OR EXISTS (
        SELECT 1 FROM "public"."StockIdentifiedUnitOccupancy" AS "occupancy"
        WHERE "occupancy"."companyId" = NEW."companyId"
          AND "occupancy"."identifiedUnitId" = NEW."identifiedUnitId"
          AND "occupancy"."currentPositionId" = NEW."positionId")
    )
  INTO v_coherent;

  IF v_coherent IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_stock_reservation_position_guard' ||
               ';function=fn_stock_reservation_position_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_RESERVATION_POSITION_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_stock_unit_config_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_unit_config_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'C14 invariant violation',
    DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
             ';table=' || TG_TABLE_NAME ||
             ';operation=' || TG_OP ||
             ';invariant=function:fn_stock_unit_config_append_only' ||
             ';function=fn_stock_unit_config_append_only' ||
             ';branch=R0001' ||
             ';family=APPEND_ONLY',
    HINT = 'messageId=C14_INV_FN_FN_STOCK_UNIT_CONFIG_APPEND_ONLY',
    CONSTRAINT = TG_NAME,
    SCHEMA = TG_TABLE_SCHEMA,
    TABLE = TG_TABLE_NAME;
END;
$$;


--
-- Name: fn_stock_unit_config_current_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_stock_unit_config_current_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT
    EXISTS (
      SELECT 1
      FROM "public"."StockIdentifiedUnitConfigurationVersion" AS "targetVersion"
      LEFT JOIN "public"."StockIdentifiedUnitConfigurationVersion" AS "priorVersion"
        ON TG_OP = 'UPDATE'
       AND "priorVersion"."companyId" = OLD."companyId"
       AND "priorVersion"."identifiedUnitId" = OLD."identifiedUnitId"
       AND "priorVersion"."id" = OLD."configurationVersionId"
      WHERE "targetVersion"."companyId" = NEW."companyId"
        AND "targetVersion"."identifiedUnitId" = NEW."identifiedUnitId"
        AND "targetVersion"."id" = NEW."configurationVersionId"
        AND "targetVersion"."internalCode" = NEW."internalCode"
        AND "targetVersion"."serialNumber" IS NOT DISTINCT FROM NEW."serialNumber"
        AND (
          (
            TG_OP = 'INSERT'
            AND "targetVersion"."versionNumber" = 1
            AND "targetVersion"."previousVersionId" IS NULL
            AND NEW."version" = 1
          )
          OR
          (
            TG_OP = 'UPDATE'
            AND NEW."companyId" = OLD."companyId"
            AND NEW."identifiedUnitId" = OLD."identifiedUnitId"
            AND "targetVersion"."previousVersionId" = OLD."configurationVersionId"
            AND "targetVersion"."versionNumber" = "priorVersion"."versionNumber" + 1
            AND NEW."version" = OLD."version" + 1
          )
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."StockReservation" AS "reservation"
      JOIN "public"."StockPosition" AS "reservationPosition"
        ON "reservationPosition"."companyId" = "reservation"."companyId"
       AND "reservationPosition"."id" = "reservation"."positionId"
      WHERE "reservation"."companyId" = NEW."companyId"
        AND (
          "reservation"."identifiedUnitId" = NEW."identifiedUnitId"
          OR "reservationPosition"."identifiedUnitId" = NEW."identifiedUnitId"
        )
        AND (
          SELECT COALESCE(
            SUM(
              CASE
                WHEN "reservationEvent"."kind" IN ('RESERVE', 'REPLACE')
                 AND NOT EXISTS (
                   SELECT 1
                   FROM "public"."StockReservationEvidence" AS "replacementEvent"
                   WHERE "replacementEvent"."companyId" = "reservationEvent"."companyId"
                     AND "replacementEvent"."reservationId" = "reservationEvent"."reservationId"
                     AND "replacementEvent"."replacesEvidenceId" = "reservationEvent"."id"
                 )
                  THEN "reservationEvent"."quantity"
                WHEN "reservationEvent"."kind" IN ('RELEASE', 'CANCEL', 'APPLY_TO_DISPATCH')
                  THEN -"reservationEvent"."quantity"
                ELSE 0
              END
            ),
            0
          )
          FROM "public"."StockReservationEvidence" AS "reservationEvent"
          WHERE "reservationEvent"."companyId" = "reservation"."companyId"
            AND "reservationEvent"."reservationId" = "reservation"."id"
        ) > 0
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."cajas_assignment" AS "assignment"
      WHERE "assignment"."company_id" = NEW."companyId"
        AND "assignment"."box_identified_unit_id" = NEW."identifiedUnitId"
        AND "assignment"."active_slot" = 1
        AND "assignment"."ended_at" IS NULL
        AND "assignment"."ended_by_id" IS NULL
        AND "assignment"."end_cause" IS NULL
        AND "assignment"."end_command_acceptance_id" IS NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."StockIdentifiedUnitOccupancy" AS "occupancy"
      JOIN "public"."StockPosition" AS "position"
        ON "position"."companyId" = "occupancy"."companyId"
       AND "position"."id" = "occupancy"."currentPositionId"
       AND "position"."identifiedUnitId" = "occupancy"."identifiedUnitId"
      JOIN "public"."StockContext" AS "context"
        ON "context"."companyId" = "position"."companyId"
       AND "context"."id" = "position"."contextId"
      WHERE "occupancy"."companyId" = NEW."companyId"
        AND "occupancy"."identifiedUnitId" = NEW."identifiedUnitId"
        AND "context"."kind" = 'EXTERNAL_CUSTODY'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."cajas_disposition" AS "disposition"
      JOIN "public"."cajas_dispatch_line" AS "dispatchLine"
        ON "dispatchLine"."company_id" = "disposition"."company_id"
       AND "dispatchLine"."dispatch_id" = "disposition"."dispatch_id"
       AND "dispatchLine"."id" = "disposition"."dispatch_line_id"
      JOIN "public"."StockPosition" AS "dispositionPosition"
        ON "dispositionPosition"."companyId" = "dispatchLine"."company_id"
       AND "dispositionPosition"."id" = "dispatchLine"."stock_position_id"
      WHERE "disposition"."company_id" = NEW."companyId"
        AND "dispositionPosition"."identifiedUnitId" = NEW."identifiedUnitId"
        AND "disposition"."kind" = 'under_review'
      GROUP BY "disposition"."company_id", "disposition"."dispatch_line_id"
      HAVING SUM("disposition"."accounting_sign" * "disposition"."quantity") > 0
    )
  INTO v_valid;

  IF v_valid IS TRUE THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'C14 invariant violation',
      DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
               ';table=' || TG_TABLE_NAME ||
               ';operation=' || TG_OP ||
               ';invariant=function:fn_stock_unit_config_current_guard' ||
               ';function=fn_stock_unit_config_current_guard' ||
               ';branch=R0001' ||
               ';family=ROW_OR_CROSS_ROW_GUARD',
      HINT = 'messageId=C14_INV_FN_FN_STOCK_UNIT_CONFIG_CURRENT_GUARD',
      CONSTRAINT = TG_NAME,
      SCHEMA = TG_TABLE_SCHEMA,
      TABLE = TG_TABLE_NAME;
  END IF;
END;
$$;


--
-- Name: fn_xadmin_source_identity_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_xadmin_source_identity_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_TABLE_NAME = 'xadmin_import_run' AND (
    NEW."organization_id" IS DISTINCT FROM OLD."organization_id"
    OR NEW."source_name" IS DISTINCT FROM OLD."source_name"
    OR NEW."source_file_sha256" IS DISTINCT FROM OLD."source_file_sha256"
    OR NEW."run_key" IS DISTINCT FROM OLD."run_key"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'XADMIN import source identity and file hash are immutable';
  END IF;

  IF TG_TABLE_NAME = 'xadmin_article_stage_row' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'XADMIN staged source rows and row hashes are immutable';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: public_rate_first_seen_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_rate_first_seen_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF OLD."firstSeenAt" IS DISTINCT FROM NEW."firstSeenAt" OR OLD."expiresAt" IS DISTINCT FROM NEW."expiresAt" THEN RAISE EXCEPTION 'rate retention anchors are immutable'; END IF; RETURN NEW; END $$;


--
-- Name: remito_access_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remito_access_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE target_version integer; expected_version integer; publication_status text;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'access deletion denied'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW."status"<>'current' OR NEW."currentSlot"<>1 OR NEW."replacedAt" IS NOT NULL OR NEW."revokedAt" IS NOT NULL OR NEW."supersededByAccessId" IS NOT NULL THEN RAISE EXCEPTION 'access insertion must be initial current state'; END IF;
    SELECT "status" INTO publication_status FROM "RemitoVerificationPublication" WHERE "companyId"=NEW."companyId" AND "id"=NEW."publicationId" AND "remitoId"=NEW."remitoId" FOR UPDATE;
    IF publication_status IS DISTINCT FROM 'current' THEN RAISE EXCEPTION 'current access requires current publication'; END IF;
    SELECT coalesce(max("version"),0)+1 INTO expected_version FROM "RemitoVerificationAccess" WHERE "companyId"=NEW."companyId" AND "publicationId"=NEW."publicationId";
    IF NEW."version"<>expected_version THEN RAISE EXCEPTION 'access version must increase by exactly one'; END IF;
  ELSE
    IF ROW(OLD."id",OLD."companyId",OLD."remitoId",OLD."publicationId",OLD."version",OLD."tokenNonce",OLD."tokenKeyVersion",OLD."tokenHash",OLD."issuedAt",OLD."createdAt") IS DISTINCT FROM ROW(NEW."id",NEW."companyId",NEW."remitoId",NEW."publicationId",NEW."version",NEW."tokenNonce",NEW."tokenKeyVersion",NEW."tokenHash",NEW."issuedAt",NEW."createdAt") OR OLD."status"<>'current' OR NEW."status" NOT IN ('replaced','revoked') THEN RAISE EXCEPTION 'illegal access mutation'; END IF;
    IF NEW."status"='replaced' THEN SELECT "version" INTO target_version FROM "RemitoVerificationAccess" WHERE "companyId"=NEW."companyId" AND "id"=NEW."supersededByAccessId" AND "publicationId"=NEW."publicationId"; IF target_version IS NOT NULL AND target_version<=NEW."version" THEN RAISE EXCEPTION 'superseding access must have same lineage and higher version'; END IF; END IF;
    IF NEW."status"='current' THEN SELECT "status" INTO publication_status FROM "RemitoVerificationPublication" WHERE "companyId"=NEW."companyId" AND "id"=NEW."publicationId"; IF publication_status IS DISTINCT FROM 'current' THEN RAISE EXCEPTION 'current access requires current publication'; END IF; END IF;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: remito_current_guarantee(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remito_current_guarantee() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE company_id text := coalesce(NEW."companyId",OLD."companyId"); lineage_id text; current_count integer; access_count integer; latest_status text; current_publication text; orphan_current integer;
BEGIN
  IF TG_TABLE_NAME='RemitoScanLocator' THEN
    lineage_id:=coalesce(NEW."remitoId",OLD."remitoId"); SELECT count(*) INTO current_count FROM "RemitoVerificationPublication" WHERE "companyId"=company_id AND "remitoId"=lineage_id AND "status"='current';
    IF current_count<>1 THEN RAISE EXCEPTION 'exactly one current publication required for issued locator'; END IF;
  ELSIF TG_TABLE_NAME='RemitoVerificationPublication' THEN
    lineage_id:=coalesce(NEW."remitoId",OLD."remitoId"); SELECT count(*) INTO current_count FROM "RemitoVerificationPublication" WHERE "companyId"=company_id AND "remitoId"=lineage_id AND "status"='current';
    IF current_count<>1 THEN RAISE EXCEPTION 'exactly one current publication required'; END IF;
    SELECT "id" INTO current_publication FROM "RemitoVerificationPublication" WHERE "companyId"=company_id AND "remitoId"=lineage_id AND "status"='current'; SELECT count(*) INTO access_count FROM "RemitoVerificationAccess" WHERE "companyId"=company_id AND "publicationId"=current_publication AND "status"='current'; SELECT "status" INTO latest_status FROM "RemitoVerificationAccess" WHERE "companyId"=company_id AND "publicationId"=current_publication ORDER BY "version" DESC LIMIT 1;
    IF access_count<>(CASE WHEN latest_status='revoked' THEN 0 ELSE 1 END) THEN RAISE EXCEPTION 'current publication requires exactly one current access unless revoked'; END IF;
    SELECT count(*) INTO orphan_current FROM "RemitoVerificationAccess" a JOIN "RemitoVerificationPublication" p ON p."companyId"=a."companyId" AND p."id"=a."publicationId" WHERE p."companyId"=company_id AND p."remitoId"=lineage_id AND a."status"='current' AND p."status"<>'current';
    IF orphan_current<>0 THEN RAISE EXCEPTION 'current access requires current publication'; END IF;
  ELSE
    lineage_id:=coalesce(NEW."publicationId",OLD."publicationId"); SELECT count(*) INTO current_count FROM "RemitoVerificationAccess" WHERE "companyId"=company_id AND "publicationId"=lineage_id AND "status"='current'; SELECT "status" INTO latest_status FROM "RemitoVerificationAccess" WHERE "companyId"=company_id AND "publicationId"=lineage_id ORDER BY "version" DESC LIMIT 1;
    IF current_count<>(CASE WHEN latest_status='revoked' THEN 0 ELSE 1 END) THEN RAISE EXCEPTION 'invalid current access cardinality'; END IF;
  END IF;
  RETURN NULL;
END $$;


--
-- Name: remito_locator_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remito_locator_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'remito locator is immutable and non-reusable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "Remito" r WHERE r."companyId"=NEW."companyId" AND r."id"=NEW."remitoId" AND r."issuedAt" IS NOT NULL AND r."state"<>'Borrador') THEN RAISE EXCEPTION 'remito locator requires issued remito'; END IF;
  RETURN NEW;
END $$;


--
-- Name: remito_publication_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remito_publication_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE target_version integer; expected_version integer;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication deletion denied'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW."status"<>'current' OR NEW."currentSlot"<>1 OR NEW."replacedAt" IS NOT NULL OR NEW."replacedByPublicationId" IS NOT NULL THEN RAISE EXCEPTION 'publication insertion must be initial current state'; END IF;
    PERFORM 1 FROM "Remito" WHERE "companyId"=NEW."companyId" AND "id"=NEW."remitoId" FOR UPDATE;
    SELECT coalesce(max("version"),0)+1 INTO expected_version FROM "RemitoVerificationPublication" WHERE "companyId"=NEW."companyId" AND "remitoId"=NEW."remitoId";
    IF NEW."version"<>expected_version THEN RAISE EXCEPTION 'publication version must increase by exactly one'; END IF;
  ELSE
    IF ROW(OLD."id",OLD."companyId",OLD."remitoId",OLD."version",OLD."issuerDisplayNameSnapshot",OLD."issuerTaxIdSnapshot",OLD."documentTypeSnapshot",OLD."issuedDateSnapshot",OLD."remitoShortCodeSnapshot",OLD."fingerprintVersion",OLD."fingerprintSha256",OLD."publishedAt",OLD."createdAt") IS DISTINCT FROM ROW(NEW."id",NEW."companyId",NEW."remitoId",NEW."version",NEW."issuerDisplayNameSnapshot",NEW."issuerTaxIdSnapshot",NEW."documentTypeSnapshot",NEW."issuedDateSnapshot",NEW."remitoShortCodeSnapshot",NEW."fingerprintVersion",NEW."fingerprintSha256",NEW."publishedAt",NEW."createdAt") OR OLD."status"<>'current' OR NEW."status"<>'replaced' THEN RAISE EXCEPTION 'illegal publication mutation'; END IF;
    SELECT "version" INTO target_version FROM "RemitoVerificationPublication" WHERE "companyId"=NEW."companyId" AND "id"=NEW."replacedByPublicationId" AND "remitoId"=NEW."remitoId";
    IF target_version IS NOT NULL AND target_version<=NEW."version" THEN RAISE EXCEPTION 'replacement must have same lineage and higher version'; END IF;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: remito_rm1_is_valid(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remito_rm1_is_valid(value text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $_$
DECLARE alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; compact text; remainder integer := 9; symbol text; bit integer; v integer;
BEGIN
  IF value !~ '^RM1-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]$' THEN RETURN false; END IF;
  compact := replace(substr(value,5),'-','');
  FOR symbol IN SELECT unnest(string_to_array('1'||substr(compact,1,16),NULL)) LOOP
    v := strpos(alphabet,symbol)-1;
    FOR bit IN REVERSE 4..0 LOOP
      IF ((((remainder>>4)&1) # ((v>>bit)&1)))=1 THEN remainder := ((remainder<<1)&31) # 9; ELSE remainder := (remainder<<1)&31; END IF;
    END LOOP;
  END LOOP;
  RETURN substr(alphabet,remainder+1,1)=substr(compact,17,1);
END $_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Article; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Article" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    sku text NOT NULL,
    description text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "articleType" text,
    brand text,
    manufacturer text,
    family text,
    "modelVariant" text,
    measure text,
    unit text DEFAULT 'u'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    category_id text,
    clinical_family_id text,
    brand_id text,
    manufacturer_id text,
    product_line_id text
);


--
-- Name: ArticleIdentifier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ArticleIdentifier" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "articleId" text NOT NULL,
    type public."ArticleIdentifierType" NOT NULL,
    value text NOT NULL,
    "normalizedValue" text NOT NULL,
    "scopeKey" text DEFAULT ''::text NOT NULL,
    "manufacturerContext" text,
    "supplierId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "deactivatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "sourcePayload" text
);


--
-- Name: ArticleSupplierMapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ArticleSupplierMapping" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "articleId" text NOT NULL,
    "supplierId" text NOT NULL,
    "supplierCode" text NOT NULL,
    "normalizedCode" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "deactivatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ArticleTraceabilityPolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ArticleTraceabilityPolicy" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "articleId" text NOT NULL,
    policy public."ArticleTraceabilityPolicyKind",
    "effectiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "minimumRequirement" public."ArticleTraceabilityRequirement" DEFAULT 'NONE'::public."ArticleTraceabilityRequirement" NOT NULL,
    "expirationRequired" boolean DEFAULT false NOT NULL
);


--
-- Name: AuditEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditEvent" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "userId" text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text,
    action text NOT NULL,
    detail text,
    "oldValue" jsonb,
    "newValue" jsonb,
    module text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AvailabilityCapabilityGrant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AvailabilityCapabilityGrant" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "userId" text NOT NULL,
    capability character varying(64) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "grantedById" text NOT NULL,
    "grantedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedById" text,
    "revokedAt" timestamp(3) without time zone,
    "revokeReason" character varying(500),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "AvailabilityCapabilityGrant_capability_check" CHECK (((capability)::text = ANY ((ARRAY['availability.request.create'::character varying, 'availability.request.read'::character varying, 'availability.date.correct'::character varying, 'availability.pivot.configure'::character varying])::text[]))),
    CONSTRAINT "AvailabilityCapabilityGrant_lifecycle_check" CHECK (((("isActive" = true) AND ("revokedById" IS NULL) AND ("revokedAt" IS NULL) AND ("revokeReason" IS NULL)) OR (("isActive" = false) AND ("revokedById" IS NOT NULL) AND ("revokedAt" IS NOT NULL) AND ("revokeReason" IS NOT NULL) AND (btrim(("revokeReason")::text) <> ''::text) AND ("revokedAt" >= "grantedAt"))))
);


--
-- Name: AvailabilityCommand; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AvailabilityCommand" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "actorUserId" text NOT NULL,
    type public."AvailabilityCommandType" NOT NULL,
    "idempotencyKey" character varying(128) NOT NULL,
    "payloadHash" character(64) NOT NULL,
    "requestId" text,
    "surgeryId" text,
    "completedAt" timestamp(3) without time zone,
    "resultCode" character varying(100),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "AvailabilityCommand_idempotency_key_check" CHECK ((((char_length(("idempotencyKey")::text) >= 16) AND (char_length(("idempotencyKey")::text) <= 128)) AND (("idempotencyKey")::text ~ '^[!-~]+$'::text))),
    CONSTRAINT "AvailabilityCommand_payload_hash_check" CHECK (("payloadHash" ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT "AvailabilityCommand_target_consistency_check" CHECK ((("completedAt" IS NULL) OR ((type = ANY (ARRAY['REQUEST'::public."AvailabilityCommandType", 'COMPLETE'::public."AvailabilityCommandType"])) AND ("requestId" IS NOT NULL) AND ("surgeryId" IS NOT NULL)) OR ((type = 'CORRECT'::public."AvailabilityCommandType") AND ("requestId" IS NULL) AND ("surgeryId" IS NOT NULL)) OR ((type = 'REASSIGN_PIVOT'::public."AvailabilityCommandType") AND ("requestId" IS NULL) AND ("surgeryId" IS NULL)))),
    CONSTRAINT "AvailabilityCommand_terminal_consistency_check" CHECK (((("completedAt" IS NULL) AND ("resultCode" IS NULL)) OR (("completedAt" IS NOT NULL) AND ("resultCode" IS NOT NULL))))
);


--
-- Name: AvailabilityRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AvailabilityRequest" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "surgeryId" text NOT NULL,
    "requesterUserId" text NOT NULL,
    status public."AvailabilityRequestStatus" DEFAULT 'OPEN'::public."AvailabilityRequestStatus" NOT NULL,
    "creatorResolution" public."AvailabilityCreatorResolution" NOT NULL,
    "creatorUserIdSnapshot" text,
    "creatorAuditEventId" text,
    "pivotUserIdAtCreation" text NOT NULL,
    "pivotMappingVersion" integer NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "completedByUserId" text,
    "submittedDate" date,
    "completionCommandId" text,
    "correlationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "AvailabilityRequest_creator_resolution_check" CHECK (((("creatorResolution" = 'NOT_IDENTIFIED'::public."AvailabilityCreatorResolution") AND ("creatorUserIdSnapshot" IS NULL) AND ("creatorAuditEventId" IS NULL)) OR (("creatorResolution" = ANY (ARRAY['IDENTIFIED_ELIGIBLE'::public."AvailabilityCreatorResolution", 'IDENTIFIED_INACTIVE'::public."AvailabilityCreatorResolution", 'IDENTIFIED_NO_COMPANY_ACCESS'::public."AvailabilityCreatorResolution"])) AND ("creatorUserIdSnapshot" IS NOT NULL)))),
    CONSTRAINT "AvailabilityRequest_pivot_mapping_version_check" CHECK (("pivotMappingVersion" > 0)),
    CONSTRAINT "AvailabilityRequest_terminal_consistency_check" CHECK ((((status = 'OPEN'::public."AvailabilityRequestStatus") AND ("completedAt" IS NULL) AND ("completedByUserId" IS NULL) AND ("submittedDate" IS NULL) AND ("completionCommandId" IS NULL)) OR ((status = 'COMPLETED'::public."AvailabilityRequestStatus") AND ("completedAt" IS NOT NULL) AND ("completedByUserId" IS NOT NULL) AND ("submittedDate" IS NOT NULL) AND ("completionCommandId" IS NOT NULL))))
);


--
-- Name: AvailabilityRequestRecipientAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AvailabilityRequestRecipientAssignment" (
    id text NOT NULL,
    "availabilityRequestId" text NOT NULL,
    "companyId" text NOT NULL,
    "userId" text NOT NULL,
    reason public."AvailabilityRecipientReason" NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "assignedByUserId" text NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "revokedByUserId" text,
    "revokeReason" text,
    "correlationId" text NOT NULL,
    CONSTRAINT "AvailabilityRequestRecipientAssignment_lifecycle_check" CHECK ((((reason = 'CREATOR'::public."AvailabilityRecipientReason") AND ("revokedAt" IS NULL) AND ("revokedByUserId" IS NULL) AND ("revokeReason" IS NULL)) OR ((reason = 'PIVOT'::public."AvailabilityRecipientReason") AND ("revokedAt" IS NULL) AND ("revokedByUserId" IS NULL) AND ("revokeReason" IS NULL)) OR ((reason = 'PIVOT'::public."AvailabilityRecipientReason") AND ("revokedAt" IS NOT NULL) AND ("revokedByUserId" IS NOT NULL) AND ("revokeReason" IS NOT NULL) AND (btrim("revokeReason") <> ''::text) AND ("revokedAt" >= "assignedAt"))))
);


--
-- Name: Branch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Branch" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Company; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Company" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    "taxId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CompanyOperationalAssignee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CompanyOperationalAssignee" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "userId" text NOT NULL,
    designation public."CompanyOperationalDesignation" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "createdById" text NOT NULL,
    "updatedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "CompanyOperationalAssignee_version_check" CHECK ((version > 0))
);


--
-- Name: Contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Contact" (
    id text NOT NULL,
    "firstName" text,
    "lastName" text,
    "legalName" text,
    "isCompany" boolean DEFAULT false NOT NULL,
    email text,
    phone text,
    "documentType" text,
    "documentNumber" text,
    "contactType" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tradeName" text,
    notes text
);


--
-- Name: ContactAddress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContactAddress" (
    id text NOT NULL,
    "contactId" text NOT NULL,
    street text,
    number text,
    city text,
    state text,
    "zipCode" text,
    country text DEFAULT 'AR'::text NOT NULL,
    "isMain" boolean DEFAULT false NOT NULL,
    "addressType" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "georefId" text,
    "entityType" public."GeographicEntityType",
    "provinceGeorefId" text,
    "provinceName" text,
    "departmentGeorefId" text,
    "departmentName" text,
    "municipalityGeorefId" text,
    "municipalityName" text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    "coordinateType" public."GeographicCoordinateType",
    crs public."GeographicCrs",
    source text,
    "sourceVersion" text,
    "sourceRetrievedAt" timestamp(6) with time zone,
    "validationStatus" public."GeographicValidationStatus",
    "validationNotes" text,
    geometry jsonb,
    "geometrySource" text,
    "companyId" text NOT NULL,
    CONSTRAINT ck_contact_address_geo_coordinates_pair CHECK (((latitude IS NULL) = (longitude IS NULL))),
    CONSTRAINT ck_contact_address_geo_latitude_range CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))),
    CONSTRAINT ck_contact_address_geo_longitude_range CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))))
);


--
-- Name: ContactCompanyLink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContactCompanyLink" (
    id text NOT NULL,
    "contactId" text NOT NULL,
    "companyId" text NOT NULL,
    role text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    code text DEFAULT ''::text NOT NULL,
    roles text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "isPayer" boolean,
    "vatCondition" text,
    "paymentTerms" text,
    "defaultPriceList" text,
    "usualDiscount" numeric(9,4),
    "doctorLicense" text,
    specialty text,
    "deliveryNotes" text,
    CONSTRAINT ck_contact_company_code_format CHECK ((code ~ '^C-[0-9]{4,}$'::text))
);


--
-- Name: ContactGroup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContactGroup" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    slug text NOT NULL,
    role text NOT NULL
);


--
-- Name: ContactGroupMembership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContactGroupMembership" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "contactId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DigitalReceipt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DigitalReceipt" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "surgeryId" text NOT NULL,
    "receiptNumber" text NOT NULL,
    status public."DigitalReceiptStatus" NOT NULL,
    "issuedAt" timestamp(3) without time zone NOT NULL,
    "issuedBy" jsonb,
    "signedAt" timestamp(3) without time zone,
    "expiredAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    "latestAccessVersion" integer,
    "activeAccessId" text,
    "currentSignerRole" public."DigitalReceiptSignerRole" NOT NULL,
    signers jsonb NOT NULL,
    "latestSnapshotId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DigitalReceiptAccess; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DigitalReceiptAccess" (
    id text NOT NULL,
    "receiptId" text NOT NULL,
    version integer NOT NULL,
    status public."DigitalReceiptAccessStatus" NOT NULL,
    "tokenHash" text NOT NULL,
    "tokenLastFour" text,
    channel public."DigitalReceiptDeliveryChannel",
    "recipientEmail" text,
    "recipientPhone" text,
    "signerRole" public."DigitalReceiptSignerRole" NOT NULL,
    "signerId" text,
    "issuedAt" timestamp(3) without time zone NOT NULL,
    "activatedAt" timestamp(3) without time zone,
    "firstOpenedAt" timestamp(3) without time zone,
    "lastOpenedAt" timestamp(3) without time zone,
    "consumedAt" timestamp(3) without time zone,
    "expiredAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    "supersededByAccessId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DigitalReceiptArtifact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DigitalReceiptArtifact" (
    id text NOT NULL,
    "receiptId" text NOT NULL,
    "snapshotId" text,
    "accessId" text,
    type public."DigitalReceiptArtifactType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" jsonb,
    "fileName" text,
    "mimeType" text,
    "storageKey" text,
    checksum text,
    metadata jsonb
);


--
-- Name: DigitalReceiptEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DigitalReceiptEvent" (
    id text NOT NULL,
    "receiptId" text NOT NULL,
    "accessId" text,
    "snapshotId" text,
    "artifactId" text,
    type public."DigitalReceiptEventType" NOT NULL,
    "happenedAt" timestamp(3) without time zone NOT NULL,
    actor jsonb,
    detail text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DigitalReceiptSnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DigitalReceiptSnapshot" (
    id text NOT NULL,
    "receiptId" text NOT NULL,
    version integer NOT NULL,
    "capturedAt" timestamp(3) without time zone NOT NULL,
    "capturedBy" jsonb,
    checksum text,
    payload jsonb NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: GoodsReceipt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GoodsReceipt" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "createdById" text NOT NULL,
    "confirmedById" text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "supplierId" text,
    "documentReference" text,
    "idempotencyKey" text,
    "confirmedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);


--
-- Name: GoodsReceiptLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GoodsReceiptLine" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "receiptId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    "articleId" text,
    "requestedQuantity" numeric(24,4) NOT NULL,
    "lotCode" text,
    "serialNumber" text,
    "expirationDate" date,
    "rawScan" text,
    "resolutionStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "pendingReason" text,
    "confirmedEvidenceId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "expectedQuantity" numeric(24,4),
    "receivedQuantity" numeric(24,4) DEFAULT 0 NOT NULL,
    "expectedCode" text,
    "expectedDescription" text,
    "receivedLotCode" text,
    "receivedSerialNumber" text,
    "receivedExpirationDate" date
);


--
-- Name: InternalNotification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InternalNotification" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "recipientUserId" text NOT NULL,
    "actorUserId" text NOT NULL,
    "surgeryId" text NOT NULL,
    "sourceEntityId" text NOT NULL,
    type public."InternalNotificationType" NOT NULL,
    "eventKey" text NOT NULL,
    title text NOT NULL,
    body text,
    metadata jsonb,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "availabilityRequestId" text,
    CONSTRAINT "InternalNotification_availability_request_link_check" CHECK (((type <> ALL (ARRAY['availability_request_actionable'::public."InternalNotificationType", 'availability_request_completed'::public."InternalNotificationType", 'availability_pivot_reassigned'::public."InternalNotificationType"])) OR ("availabilityRequestId" IS NOT NULL)))
);


--
-- Name: OperationalCommandAcceptance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OperationalCommandAcceptance" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    domain text NOT NULL,
    "sourceOperationId" text NOT NULL,
    checkpoint text NOT NULL,
    "scopeKey" text NOT NULL,
    "intentHash" text NOT NULL,
    "acceptedAt" timestamp(6) with time zone NOT NULL,
    "acceptedById" text NOT NULL,
    "resultEntityType" text NOT NULL,
    "resultEntityId" text NOT NULL,
    "auditEventId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OperationalCommandAttempt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OperationalCommandAttempt" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "commandAcceptanceId" text,
    "transportCorrelationId" text NOT NULL,
    "intentHash" text NOT NULL,
    outcome public."CommandAttemptOutcome" NOT NULL,
    "attemptedAt" timestamp(6) with time zone NOT NULL,
    "actorId" text NOT NULL,
    "auditEventId" text,
    detail text,
    "expiresAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ocat_outcome CHECK (((((outcome = 'ACCEPTED'::public."CommandAttemptOutcome") AND ("commandAcceptanceId" IS NOT NULL) AND ("auditEventId" IS NOT NULL)) OR ((outcome = 'DENIED'::public."CommandAttemptOutcome") AND ("commandAcceptanceId" IS NULL) AND ("auditEventId" IS NOT NULL)) OR ((outcome = 'VALIDATION_FAILED'::public."CommandAttemptOutcome") AND ("commandAcceptanceId" IS NULL) AND ("auditEventId" IS NOT NULL)) OR ((outcome = 'CONFLICT'::public."CommandAttemptOutcome") AND ("commandAcceptanceId" IS NULL) AND ("auditEventId" IS NOT NULL)) OR ((outcome = 'FAILED'::public."CommandAttemptOutcome") AND ("commandAcceptanceId" IS NULL) AND ("auditEventId" IS NOT NULL)) OR ((outcome = 'UNKNOWN'::public."CommandAttemptOutcome") AND ("commandAcceptanceId" IS NULL) AND ("auditEventId" IS NOT NULL))) IS TRUE))
);


--
-- Name: OperationalCommandEffect; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OperationalCommandEffect" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "commandAcceptanceId" text NOT NULL,
    "effectKey" text NOT NULL,
    "effectType" text NOT NULL,
    "targetKind" public."OperationalEffectTargetKind" NOT NULL,
    "resultEntityType" text NOT NULL,
    "resultEntityId" text NOT NULL,
    "stockEvidenceId" text,
    "stockReservationEvidenceId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_oce_target_shape CHECK ((((("targetKind" = 'DOMAIN_ONLY'::public."OperationalEffectTargetKind") AND ("stockEvidenceId" IS NULL) AND ("stockReservationEvidenceId" IS NULL)) OR (("targetKind" = 'STOCK_EVIDENCE'::public."OperationalEffectTargetKind") AND ("stockEvidenceId" IS NOT NULL) AND ("stockReservationEvidenceId" IS NULL)) OR (("targetKind" = 'STOCK_RESERVATION_EVIDENCE'::public."OperationalEffectTargetKind") AND ("stockEvidenceId" IS NULL) AND ("stockReservationEvidenceId" IS NOT NULL))) IS TRUE))
);


--
-- Name: Organization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "taxId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProjectionReconciliation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProjectionReconciliation" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    kind public."ProjectionKind" NOT NULL,
    "scopeId" text NOT NULL,
    "observedVersion" integer NOT NULL,
    "evidenceWatermark" text NOT NULL,
    result public."ReconciliationResult" NOT NULL,
    "comparedAt" timestamp(6) with time zone NOT NULL,
    "comparedById" text,
    detail text,
    "repairCommandAcceptanceId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_pr_version CHECK ((("observedVersion" > 0) IS TRUE))
);


--
-- Name: PublicVerificationRateBucket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PublicVerificationRateBucket" (
    "sourceFingerprint" character(64) NOT NULL,
    "keyDate" date NOT NULL,
    "firstSeenAt" timestamp(6) with time zone NOT NULL,
    "windowStartedAt" timestamp(6) with time zone NOT NULL,
    checks integer DEFAULT 0 NOT NULL,
    "invalidChecks" integer DEFAULT 0 NOT NULL,
    "blockedUntil" timestamp(6) with time zone,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_public_rate_counters CHECK (((checks >= 0) AND ("invalidChecks" >= 0) AND ("invalidChecks" <= checks))),
    CONSTRAINT ck_public_rate_expiry CHECK (("expiresAt" = ("firstSeenAt" + '29 days'::interval))),
    CONSTRAINT ck_public_rate_source_fingerprint CHECK (("sourceFingerprint" ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: Remito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Remito" (
    id text NOT NULL,
    "visibleNumber" integer,
    "companyId" text NOT NULL,
    "branchId" text,
    "issuedBranchId" text,
    "documentType" text DEFAULT 'REMITO_SALIDA'::text NOT NULL,
    "surgeryId" text,
    origin text NOT NULL,
    "salidaReason" text DEFAULT 'cirugia'::text NOT NULL,
    "boxId" text,
    "presupuestoId" text,
    "destinatarioContactId" text,
    "destinatarioSnapshot" jsonb,
    "shippingAddressSnapshot" jsonb,
    "transportSnapshot" jsonb,
    "packageCount" integer,
    "declaredValue" numeric(18,4),
    state text DEFAULT 'Borrador'::text NOT NULL,
    "issuedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "returnedAt" timestamp(3) without time zone,
    "createdById" text,
    "updatedById" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RemitoItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RemitoItem" (
    id text NOT NULL,
    "remitoId" text NOT NULL,
    "itemId" text,
    sku text,
    description text NOT NULL,
    quantity numeric(18,4) NOT NULL,
    unit text,
    "boxId" text,
    "presupuestoItemId" text,
    "returnedQuantity" numeric(18,4) DEFAULT 0 NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lotNumber" text,
    "serialNumber" text,
    "expirationDate" timestamp(3) without time zone,
    company_id text NOT NULL
);


--
-- Name: RemitoScanLocator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RemitoScanLocator" (
    locator character varying(25) NOT NULL,
    "companyId" text NOT NULL,
    "remitoId" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "issuedAt" timestamp(6) with time zone NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_remito_scan_locator_rm1 CHECK (public.remito_rm1_is_valid((locator)::text)),
    CONSTRAINT ck_remito_scan_locator_version CHECK ((version = 1))
);


--
-- Name: RemitoVerificationAccess; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RemitoVerificationAccess" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "remitoId" text NOT NULL,
    "publicationId" text NOT NULL,
    version integer NOT NULL,
    status character varying(16) DEFAULT 'current'::character varying NOT NULL,
    "currentSlot" integer DEFAULT 1,
    "tokenNonce" character(43) NOT NULL,
    "tokenKeyVersion" integer NOT NULL,
    "tokenHash" character(64) NOT NULL,
    "issuedAt" timestamp(6) with time zone NOT NULL,
    "replacedAt" timestamp(6) with time zone,
    "revokedAt" timestamp(6) with time zone,
    "supersededByAccessId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_remito_access_current_slot CHECK (((((status)::text = 'current'::text) AND ("currentSlot" = 1)) OR (((status)::text <> 'current'::text) AND ("currentSlot" IS NULL)))),
    CONSTRAINT ck_remito_access_key_version CHECK ((("tokenKeyVersion" >= 1) AND ("tokenKeyVersion" <= 2147483647))),
    CONSTRAINT ck_remito_access_lifecycle_parity CHECK (((((status)::text = 'current'::text) AND ("replacedAt" IS NULL) AND ("revokedAt" IS NULL) AND ("supersededByAccessId" IS NULL)) OR (((status)::text = 'replaced'::text) AND ("replacedAt" IS NOT NULL) AND ("revokedAt" IS NULL) AND ("supersededByAccessId" IS NOT NULL)) OR (((status)::text = 'revoked'::text) AND ("replacedAt" IS NULL) AND ("revokedAt" IS NOT NULL) AND ("supersededByAccessId" IS NULL)))),
    CONSTRAINT ck_remito_access_status CHECK (((status)::text = ANY ((ARRAY['current'::character varying, 'replaced'::character varying, 'revoked'::character varying])::text[]))),
    CONSTRAINT ck_remito_access_token_hash CHECK (("tokenHash" ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT ck_remito_access_token_nonce CHECK (("tokenNonce" ~ '^[A-Za-z0-9_-]{43}$'::text)),
    CONSTRAINT ck_remito_access_token_nonce_tail CHECK (("tokenNonce" ~ '[AEIMQUYcgkosw048]$'::text)),
    CONSTRAINT ck_remito_access_version CHECK ((version > 0))
);


--
-- Name: RemitoVerificationDailyMetric; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RemitoVerificationDailyMetric" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    day date NOT NULL,
    channel character varying(32) NOT NULL,
    result character varying(16) NOT NULL,
    count integer NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_remito_metric_count CHECK ((count > 0))
);


--
-- Name: RemitoVerificationPublication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RemitoVerificationPublication" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "remitoId" text NOT NULL,
    version integer NOT NULL,
    status character varying(16) DEFAULT 'current'::character varying NOT NULL,
    "currentSlot" integer DEFAULT 1,
    "issuerDisplayNameSnapshot" character varying(200) NOT NULL,
    "issuerTaxIdSnapshot" character varying(32) NOT NULL,
    "documentTypeSnapshot" character varying(64) NOT NULL,
    "issuedDateSnapshot" date NOT NULL,
    "remitoShortCodeSnapshot" character varying(25) NOT NULL,
    "fingerprintVersion" character varying(8) NOT NULL,
    "fingerprintSha256" character(64) NOT NULL,
    "publishedAt" timestamp(6) with time zone NOT NULL,
    "replacedAt" timestamp(6) with time zone,
    "replacedByPublicationId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_remito_publication_current_slot CHECK (((((status)::text = 'current'::text) AND ("currentSlot" = 1)) OR (((status)::text = 'replaced'::text) AND ("currentSlot" IS NULL)))),
    CONSTRAINT ck_remito_publication_fingerprint_sha256 CHECK (("fingerprintSha256" ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT ck_remito_publication_replacement_parity CHECK (((((status)::text = 'current'::text) AND ("replacedAt" IS NULL) AND ("replacedByPublicationId" IS NULL)) OR (((status)::text = 'replaced'::text) AND ("replacedAt" IS NOT NULL) AND ("replacedByPublicationId" IS NOT NULL)))),
    CONSTRAINT ck_remito_publication_status CHECK (((status)::text = ANY ((ARRAY['current'::character varying, 'replaced'::character varying])::text[]))),
    CONSTRAINT ck_remito_publication_version CHECK ((version > 0))
);


--
-- Name: ScanEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ScanEvent" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "receiptId" text NOT NULL,
    "lineId" text,
    "rawValue" text NOT NULL,
    "normalizedValue" text,
    "resolutionStatus" text DEFAULT 'PENDING'::text NOT NULL,
    candidates jsonb,
    "lotCode" text,
    "serialNumber" text,
    "expirationDate" date,
    "createdById" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "articleId" text,
    "captureHistory" jsonb
);


--
-- Name: SeguimientoEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SeguimientoEntry" (
    id text NOT NULL,
    "surgeryId" text NOT NULL,
    "companyId" text NOT NULL,
    "entryType" text NOT NULL,
    content text NOT NULL,
    summary text,
    "authorId" text NOT NULL,
    "evidenceRef" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockActivationBoundary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockActivationBoundary" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "positionId" text NOT NULL,
    "boundaryGroupKey" text NOT NULL,
    "cutoffAt" timestamp(6) with time zone NOT NULL,
    "validUntil" timestamp(6) with time zone,
    "approvedEvidenceRef" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sab_valid_window CHECK (((("validUntil" IS NULL) OR ("validUntil" > "cutoffAt")) IS TRUE))
);


--
-- Name: StockArticleEligibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockArticleEligibility" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "organizationId" text NOT NULL,
    "articleId" text NOT NULL,
    "currentPolicyVersionId" text,
    version integer NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);


--
-- Name: StockArticlePolicyVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockArticlePolicyVersion" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "eligibilityId" text NOT NULL,
    "versionNumber" integer NOT NULL,
    eligible boolean NOT NULL,
    "stockUnit" text NOT NULL,
    "quantityScale" smallint NOT NULL,
    "traceMode" public."StockTraceMode" NOT NULL,
    "previousVersionId" text,
    "effectiveAt" timestamp(6) with time zone NOT NULL,
    "acceptedAt" timestamp(6) with time zone NOT NULL,
    "acceptedById" text NOT NULL,
    cause text,
    "commandAcceptanceId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StockCompatibilityReference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockCompatibilityReference" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "sourceDomain" text NOT NULL,
    "sourceEntityType" text NOT NULL,
    "sourceEntityId" text NOT NULL,
    "sourceLineId" text,
    "sourceScopeKind" public."SourceScopeKind" NOT NULL,
    "sourceScopeKey" text NOT NULL,
    disposition public."StockCompatibilityDisposition" NOT NULL,
    "articleId" text,
    "positionId" text,
    "identifiedUnitId" text,
    "evidenceSummary" text NOT NULL,
    "acceptedAt" timestamp(6) with time zone NOT NULL,
    "acceptedById" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_scr_scope_key CHECK ((((("sourceScopeKind" = 'HEADER'::public."SourceScopeKind") AND ("sourceLineId" IS NULL) AND ("sourceScopeKey" = ('H:'::text || "sourceEntityId"))) OR (("sourceScopeKind" = 'LINE'::public."SourceScopeKind") AND ("sourceLineId" IS NOT NULL) AND ("sourceScopeKey" = ('L:'::text || "sourceLineId")))) IS TRUE)),
    CONSTRAINT ck_scr_target CHECK (((((disposition = 'DETERMINISTICALLY_MAPPABLE'::public."StockCompatibilityDisposition") AND ("articleId" IS NOT NULL)) OR ((disposition = 'DESCRIPTIVE_SNAPSHOT_ONLY'::public."StockCompatibilityDisposition") AND ("articleId" IS NULL) AND ("positionId" IS NULL) AND ("identifiedUnitId" IS NULL)) OR ((disposition = 'UNRESOLVED_LEGACY'::public."StockCompatibilityDisposition") AND ("articleId" IS NULL) AND ("positionId" IS NULL) AND ("identifiedUnitId" IS NULL)) OR ((disposition = 'INCOMPATIBLE_REJECTED'::public."StockCompatibilityDisposition") AND ("articleId" IS NULL) AND ("positionId" IS NULL) AND ("identifiedUnitId" IS NULL))) IS TRUE))
);


--
-- Name: StockContext; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockContext" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    kind public."StockContextKind" NOT NULL,
    "depositId" text,
    "sourceDomain" text,
    "sourceEntityId" text,
    "externalCustodianRef" text,
    "labelSnapshot" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StockDeposit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockDeposit" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);


--
-- Name: StockEvidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockEvidence" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    kind public."StockEvidenceKind" NOT NULL,
    "recordKind" public."EvidenceRecordKind" NOT NULL,
    "sourceDomain" text NOT NULL,
    "sourceEntityType" text NOT NULL,
    "sourceEntityId" text NOT NULL,
    "sourceCheckpoint" text NOT NULL,
    "activationBoundaryId" text,
    "correctsEvidenceId" text,
    "reversesEvidenceId" text,
    "acceptedAt" timestamp(6) with time zone NOT NULL,
    "acceptedById" text NOT NULL,
    cause text,
    "commandAcceptanceId" text NOT NULL,
    "auditEventId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_se_record_links CHECK ((((("recordKind" = 'ORIGINAL'::public."EvidenceRecordKind") AND (kind = ANY (ARRAY['OPENING'::public."StockEvidenceKind", 'RECEIPT'::public."StockEvidenceKind", 'DISPATCH'::public."StockEvidenceKind", 'RETURN'::public."StockEvidenceKind", 'CONSUMPTION'::public."StockEvidenceKind", 'COUNT_OBSERVATION'::public."StockEvidenceKind", 'REVIEW_HOLD'::public."StockEvidenceKind", 'REVIEW_RELEASE'::public."StockEvidenceKind"])) AND ("correctsEvidenceId" IS NULL) AND ("reversesEvidenceId" IS NULL)) OR (("recordKind" = 'CORRECTION'::public."EvidenceRecordKind") AND (kind = 'CORRECTION'::public."StockEvidenceKind") AND ("correctsEvidenceId" IS NOT NULL) AND ("correctsEvidenceId" <> id) AND ("reversesEvidenceId" IS NULL)) OR (("recordKind" = 'REVERSAL'::public."EvidenceRecordKind") AND (kind = 'REVERSAL'::public."StockEvidenceKind") AND ("correctsEvidenceId" IS NULL) AND ("reversesEvidenceId" IS NOT NULL) AND ("reversesEvidenceId" <> id))) IS TRUE))
);


--
-- Name: StockEvidenceLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockEvidenceLine" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "evidenceId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    "articleId" text NOT NULL,
    "fromPositionId" text,
    "toPositionId" text,
    "reservationId" text,
    quantity numeric(24,4) NOT NULL,
    "stockUnit" text NOT NULL,
    "scaleSnapshot" smallint NOT NULL,
    "lotCodeSnapshot" text,
    "expirationDateSnapshot" date,
    "serialNumberSnapshot" text,
    "identifiedCodeSnapshot" text,
    "sourceLineId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sel_position_shape CHECK ((((("fromPositionId" IS NOT NULL) AND ("toPositionId" IS NULL)) OR (("fromPositionId" IS NULL) AND ("toPositionId" IS NOT NULL))) IS TRUE)),
    CONSTRAINT ck_sel_qty_positive CHECK (((quantity > (0)::numeric) IS TRUE)),
    CONSTRAINT ck_sel_scale CHECK (((("scaleSnapshot" >= 0) AND ("scaleSnapshot" <= 4)) IS TRUE))
);


--
-- Name: StockIdentifiedUnit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockIdentifiedUnit" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "articleId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StockIdentifiedUnitConfigurationVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockIdentifiedUnitConfigurationVersion" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "identifiedUnitId" text NOT NULL,
    "articleId" text NOT NULL,
    "eligibilityId" text NOT NULL,
    "policyVersionId" text NOT NULL,
    "versionNumber" integer NOT NULL,
    "previousVersionId" text,
    "internalCode" text NOT NULL,
    "serialNumber" text,
    "effectiveAt" timestamp(6) with time zone NOT NULL,
    "acceptedAt" timestamp(6) with time zone NOT NULL,
    "acceptedById" text NOT NULL,
    cause text,
    "commandAcceptanceId" text NOT NULL,
    "auditEventId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_siucv_version_positive CHECK ((("versionNumber" > 0) IS TRUE))
);


--
-- Name: StockIdentifiedUnitCurrentConfiguration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockIdentifiedUnitCurrentConfiguration" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "identifiedUnitId" text NOT NULL,
    "configurationVersionId" text NOT NULL,
    "internalCode" text NOT NULL,
    "serialNumber" text,
    version integer NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_siucc_version_positive CHECK (((version > 0) IS TRUE))
);


--
-- Name: StockIdentifiedUnitOccupancy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockIdentifiedUnitOccupancy" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "identifiedUnitId" text NOT NULL,
    "currentPositionId" text NOT NULL,
    version integer NOT NULL,
    "evidenceWatermark" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_siuo_version_positive CHECK (((version > 0) IS TRUE))
);


--
-- Name: StockLot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockLot" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "articleId" text NOT NULL,
    "normalizedLotCode" text NOT NULL,
    "primaryObservationId" text NOT NULL,
    "acceptedAt" timestamp(6) with time zone NOT NULL,
    "acceptedById" text NOT NULL,
    "commandAcceptanceId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StockLotObservation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockLotObservation" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "articleId" text NOT NULL,
    "normalizedLotCode" text NOT NULL,
    "displayLotCode" text NOT NULL,
    "expirationDate" date,
    "sourceDomain" text NOT NULL,
    "sourceEntityType" text NOT NULL,
    "sourceEntityId" text NOT NULL,
    "sourceScopeKey" text NOT NULL,
    "recordKind" public."EvidenceRecordKind" NOT NULL,
    "correctsObservationId" text,
    "observedAt" timestamp(6) with time zone NOT NULL,
    "observedById" text NOT NULL,
    cause text,
    "commandAcceptanceId" text NOT NULL,
    "auditEventId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_slo_correction_shape CHECK ((((("recordKind" = 'ORIGINAL'::public."EvidenceRecordKind") AND ("correctsObservationId" IS NULL)) OR (("recordKind" = 'CORRECTION'::public."EvidenceRecordKind") AND ("correctsObservationId" IS NOT NULL) AND ("correctsObservationId" <> id))) IS TRUE))
);


--
-- Name: StockLotReview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockLotReview" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "articleId" text NOT NULL,
    "normalizedLotCode" text NOT NULL,
    "leftObservationId" text NOT NULL,
    "rightObservationId" text NOT NULL,
    result public."StockLotReviewResult" NOT NULL,
    "resolutionObservationId" text,
    "canonicalLotId" text,
    "acceptedAt" timestamp(6) with time zone NOT NULL,
    "acceptedById" text NOT NULL,
    cause text,
    "commandAcceptanceId" text NOT NULL,
    "auditEventId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_slr_observation_order CHECK (((("leftObservationId" COLLATE "C") < ("rightObservationId" COLLATE "C")) IS TRUE)),
    CONSTRAINT ck_slr_result_shape CHECK (((((result = 'MATCH'::public."StockLotReviewResult") AND ("resolutionObservationId" IS NULL) AND ("canonicalLotId" IS NOT NULL)) OR ((result = 'DISCREPANCY'::public."StockLotReviewResult") AND ("resolutionObservationId" IS NULL) AND ("canonicalLotId" IS NULL)) OR ((result = 'RESOLVED_EQUIVALENT'::public."StockLotReviewResult") AND ("resolutionObservationId" IS NOT NULL)) OR ((result = 'REJECTED'::public."StockLotReviewResult") AND ("resolutionObservationId" IS NULL) AND ("canonicalLotId" IS NULL))) IS TRUE))
);


--
-- Name: StockOpeningPosition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockOpeningPosition" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "activationBoundaryId" text NOT NULL,
    "positionId" text NOT NULL,
    "cutoffAt" timestamp(6) with time zone NOT NULL,
    "openingEvidenceLineId" text NOT NULL,
    quantity numeric(24,4) NOT NULL,
    "stockUnit" text NOT NULL,
    "scaleSnapshot" smallint NOT NULL,
    "acceptedAt" timestamp(6) with time zone NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sop_quantity_nonnegative CHECK (((quantity >= (0)::numeric) IS TRUE)),
    CONSTRAINT ck_sop_scale_snapshot CHECK (((("scaleSnapshot" >= 0) AND ("scaleSnapshot" <= 4)) IS TRUE))
);


--
-- Name: StockPosition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockPosition" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "articleId" text NOT NULL,
    "eligibilityId" text NOT NULL,
    "policyVersionId" text NOT NULL,
    "contextId" text NOT NULL,
    "traceMode" public."StockTraceMode" NOT NULL,
    "lotId" text,
    "identifiedUnitId" text,
    "stockUnit" text NOT NULL,
    "quantityScale" smallint NOT NULL,
    "scopeKey" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sp_scale_range CHECK (((("quantityScale" >= 0) AND ("quantityScale" <= 4)) IS TRUE)),
    CONSTRAINT ck_sp_trace_axis CHECK ((((("traceMode" = 'NONE'::public."StockTraceMode") AND ("lotId" IS NULL) AND ("identifiedUnitId" IS NULL)) OR (("traceMode" = 'LOT'::public."StockTraceMode") AND ("lotId" IS NOT NULL) AND ("identifiedUnitId" IS NULL)) OR (("traceMode" = 'IDENTIFIED_UNIT'::public."StockTraceMode") AND ("lotId" IS NULL) AND ("identifiedUnitId" IS NOT NULL))) IS TRUE))
);


--
-- Name: StockPositionProjection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockPositionProjection" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "positionId" text NOT NULL,
    "physicalQuantity" numeric(24,4) NOT NULL,
    "reservedQuantity" numeric(24,4) NOT NULL,
    "availableQuantity" numeric(24,4) NOT NULL,
    "underReviewQuantity" numeric(24,4) NOT NULL,
    "finalDispositionQuantity" numeric(24,4) NOT NULL,
    version integer NOT NULL,
    "evidenceWatermark" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_spp_values CHECK (((("physicalQuantity" >= (0)::numeric) AND ("reservedQuantity" >= (0)::numeric) AND ("availableQuantity" >= (0)::numeric) AND ("underReviewQuantity" >= (0)::numeric) AND ("finalDispositionQuantity" >= (0)::numeric) AND (version > 0)) IS TRUE))
);


--
-- Name: StockReservation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockReservation" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "sourceDomain" text NOT NULL,
    "sourceEntityType" text NOT NULL,
    "sourceEntityId" text NOT NULL,
    "sourceLineId" text,
    "sourceScopeKind" public."SourceScopeKind" NOT NULL,
    "sourceScopeKey" text NOT NULL,
    "positionId" text NOT NULL,
    "identifiedUnitId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "preparationLineId" text,
    CONSTRAINT ck_sr_scope_key CHECK ((((("sourceScopeKind" = 'HEADER'::public."SourceScopeKind") AND ("sourceLineId" IS NULL) AND ("sourceScopeKey" = ('H:'::text || "sourceEntityId"))) OR (("sourceScopeKind" = 'LINE'::public."SourceScopeKind") AND ("sourceLineId" IS NOT NULL) AND ("sourceScopeKey" = ('L:'::text || "sourceLineId")))) IS TRUE))
);


--
-- Name: StockReservationEvidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockReservationEvidence" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "reservationId" text NOT NULL,
    sequence integer NOT NULL,
    kind public."StockReservationEventKind" NOT NULL,
    quantity numeric(24,4) NOT NULL,
    "stockUnit" text NOT NULL,
    "scaleSnapshot" smallint NOT NULL,
    "replacesEvidenceId" text,
    "acceptedAt" timestamp(6) with time zone NOT NULL,
    "acceptedById" text NOT NULL,
    cause text,
    "commandAcceptanceId" text NOT NULL,
    "auditEventId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sre_qty_positive CHECK (((quantity > (0)::numeric) IS TRUE)),
    CONSTRAINT ck_sre_scale CHECK (((("scaleSnapshot" >= 0) AND ("scaleSnapshot" <= 4)) IS TRUE))
);


--
-- Name: StockReservationProjection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockReservationProjection" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "reservationId" text NOT NULL,
    "activeQuantity" numeric(24,4) NOT NULL,
    "appliedQuantity" numeric(24,4) NOT NULL,
    status public."StockReservationStatus" NOT NULL,
    version integer NOT NULL,
    "evidenceWatermark" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_srp_values CHECK (((("activeQuantity" >= (0)::numeric) AND ("appliedQuantity" >= (0)::numeric) AND (version > 0)) IS TRUE))
);


--
-- Name: Surgery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Surgery" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "branchId" text,
    "patientId" text NOT NULL,
    "doctorId" text,
    "institutionId" text,
    "surgeryDate" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "visibleNumber" text,
    "payerContactId" text,
    classification text,
    description text,
    priority text,
    "cxStatus" text DEFAULT 'pending'::text NOT NULL,
    "prepStatus" text,
    "probableDate" timestamp(3) without time zone,
    "scheduledDate" timestamp(3) without time zone,
    "performedDate" timestamp(3) without time zone,
    "cancelledDate" timestamp(3) without time zone,
    source text,
    "archivedAt" timestamp(3) without time zone,
    "archivedById" text,
    "archiveReason" text,
    "archivePolicySnapshot" jsonb,
    "createdById" text,
    "materialAvailabilityDate" date,
    "materialShippingDate" date,
    "materialTransport" text
);


--
-- Name: SurgeryContactAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SurgeryContactAssignment" (
    id text NOT NULL,
    "surgeryId" text NOT NULL,
    "contactId" text NOT NULL,
    role text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SurgeryDocumentChecklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SurgeryDocumentChecklist" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "surgeryId" text NOT NULL,
    "templateVersion" text DEFAULT 'documentation-v0.1'::text NOT NULL,
    "createdById" text NOT NULL,
    "updatedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SurgeryDocumentItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SurgeryDocumentItem" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "checklistId" text NOT NULL,
    type text NOT NULL,
    label text NOT NULL,
    required boolean NOT NULL,
    "sortOrder" integer NOT NULL,
    state text DEFAULT 'pending'::text NOT NULL,
    observation text,
    "createdById" text NOT NULL,
    "updatedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SurgeryPreparation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SurgeryPreparation" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "surgeryId" text NOT NULL,
    "cajasAssignmentId" text,
    "createdById" text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "idempotencyKey" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);


--
-- Name: SurgeryPreparationLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SurgeryPreparationLine" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "preparationId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    "articleId" text NOT NULL,
    "requestedQuantity" numeric(24,4) NOT NULL,
    "preparedQuantity" numeric(24,4) DEFAULT 0 NOT NULL,
    "stockUnit" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "supabaseAuthId" text,
    email text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    phone text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserCompanyAccess; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserCompanyAccess" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "companyId" text NOT NULL,
    role text DEFAULT 'operator'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserModuleViewPreference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserModuleViewPreference" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "userId" text NOT NULL,
    "moduleKey" text NOT NULL,
    preferences jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Vehicle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Vehicle" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    name text NOT NULL,
    provider text DEFAULT 'rastreo_satelital'::text NOT NULL,
    "trackingDeviceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: VehicleLatestPosition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VehicleLatestPosition" (
    "vehicleId" text NOT NULL,
    "companyId" text NOT NULL,
    latitude numeric(10,7) NOT NULL,
    longitude numeric(10,7) NOT NULL,
    "recordedAt" timestamp(3) without time zone NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--



--
-- Name: brand; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand (
    id text NOT NULL,
    organization_id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    normalized_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deactivated_at timestamp(6) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);


--
-- Name: cajas_assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_assignment (
    id text NOT NULL,
    company_id text NOT NULL,
    surgery_id text NOT NULL,
    box_article_id text NOT NULL,
    box_identified_unit_id text NOT NULL,
    active_slot smallint,
    assigned_at timestamp(6) with time zone NOT NULL,
    assigned_by_id text NOT NULL,
    ended_at timestamp(6) with time zone,
    ended_by_id text,
    end_cause text,
    start_command_acceptance_id text NOT NULL,
    end_command_acceptance_id text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ca_active_lifecycle CHECK (((((active_slot = 1) AND (ended_at IS NULL) AND (ended_by_id IS NULL) AND (end_cause IS NULL) AND (end_command_acceptance_id IS NULL)) OR ((active_slot IS NULL) AND (ended_at IS NOT NULL) AND (ended_by_id IS NOT NULL) AND (end_cause IS NOT NULL) AND (end_command_acceptance_id IS NOT NULL))) IS TRUE))
);


--
-- Name: cajas_box_formula; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_box_formula (
    id text NOT NULL,
    company_id text NOT NULL,
    box_article_id text NOT NULL,
    current_version_id text,
    next_version_number integer NOT NULL,
    version integer NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_cbf_next_version_positive CHECK (((next_version_number > 0) IS TRUE)),
    CONSTRAINT ck_cbf_version_positive CHECK (((version > 0) IS TRUE))
);


--
-- Name: cajas_composition_change; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_composition_change (
    id text NOT NULL,
    company_id text NOT NULL,
    assignment_id text NOT NULL,
    prior_preparation_version integer NOT NULL,
    resulting_preparation_version integer NOT NULL,
    accepted_at timestamp(6) with time zone NOT NULL,
    accepted_by_id text NOT NULL,
    cause text,
    command_acceptance_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cchg_version_step CHECK (((((prior_preparation_version)::bigint >= (1)::bigint) AND ((prior_preparation_version)::bigint <= (2147483646)::bigint) AND ((resulting_preparation_version)::bigint = ((prior_preparation_version)::bigint + (1)::bigint)) AND (((resulting_preparation_version)::bigint >= (1)::bigint) AND ((resulting_preparation_version)::bigint <= (2147483647)::bigint))) IS TRUE))
);


--
-- Name: cajas_composition_change_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_composition_change_line (
    id text NOT NULL,
    company_id text NOT NULL,
    assignment_id text NOT NULL,
    preparation_id text NOT NULL,
    change_id text NOT NULL,
    line_number integer NOT NULL,
    kind public.cajas_change_kind NOT NULL,
    prior_preparation_line_id text,
    resulting_preparation_line_id text,
    prior_article_id text,
    resulting_article_id text,
    prior_stock_position_id text,
    resulting_stock_position_id text,
    prior_quantity numeric(24,4),
    resulting_quantity numeric(24,4),
    stock_unit text NOT NULL,
    scale_snapshot smallint NOT NULL,
    prior_trace_capture jsonb,
    resulting_trace_capture jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cchl_change_shape CHECK (((((kind = 'add'::public.cajas_change_kind) AND (prior_preparation_line_id IS NULL) AND (prior_article_id IS NULL) AND (prior_stock_position_id IS NULL) AND (prior_quantity IS NULL) AND (prior_trace_capture IS NULL) AND (resulting_preparation_line_id IS NOT NULL) AND (resulting_article_id IS NOT NULL) AND (resulting_quantity > (0)::numeric)) OR ((kind = 'remove'::public.cajas_change_kind) AND (prior_preparation_line_id IS NOT NULL) AND (prior_article_id IS NOT NULL) AND (prior_quantity > (0)::numeric) AND (resulting_preparation_line_id IS NULL) AND (resulting_article_id IS NULL) AND (resulting_stock_position_id IS NULL) AND (resulting_quantity IS NULL) AND (resulting_trace_capture IS NULL)) OR ((kind = 'replace'::public.cajas_change_kind) AND (prior_preparation_line_id IS NOT NULL) AND (prior_article_id IS NOT NULL) AND (prior_quantity > (0)::numeric) AND (resulting_preparation_line_id IS NOT NULL) AND (resulting_article_id IS NOT NULL) AND (resulting_quantity > (0)::numeric) AND ((prior_article_id IS DISTINCT FROM resulting_article_id) OR (prior_stock_position_id IS DISTINCT FROM resulting_stock_position_id)) AND (prior_quantity = resulting_quantity) AND (NOT (prior_trace_capture IS DISTINCT FROM resulting_trace_capture))) OR ((kind = 'quantity'::public.cajas_change_kind) AND (prior_preparation_line_id IS NOT NULL) AND (resulting_preparation_line_id = prior_preparation_line_id) AND (prior_article_id IS NOT NULL) AND (resulting_article_id = prior_article_id) AND (NOT (prior_stock_position_id IS DISTINCT FROM resulting_stock_position_id)) AND (prior_quantity > (0)::numeric) AND (resulting_quantity > (0)::numeric) AND (prior_quantity <> resulting_quantity) AND (NOT (prior_trace_capture IS DISTINCT FROM resulting_trace_capture))) OR ((kind = 'traceability'::public.cajas_change_kind) AND (prior_preparation_line_id IS NOT NULL) AND (resulting_preparation_line_id = prior_preparation_line_id) AND (prior_article_id IS NOT NULL) AND (resulting_article_id = prior_article_id) AND (NOT (prior_stock_position_id IS DISTINCT FROM resulting_stock_position_id)) AND (prior_quantity > (0)::numeric) AND (resulting_quantity = prior_quantity) AND (prior_trace_capture IS DISTINCT FROM resulting_trace_capture))) IS TRUE)),
    CONSTRAINT ck_cchl_quantity_scale CHECK (((((scale_snapshot >= 0) AND (scale_snapshot <= 4)) AND ((prior_quantity IS NULL) OR ((prior_quantity > (0)::numeric) AND (prior_quantity = trunc(prior_quantity, (scale_snapshot)::integer)))) AND ((resulting_quantity IS NULL) OR ((resulting_quantity > (0)::numeric) AND (resulting_quantity = trunc(resulting_quantity, (scale_snapshot)::integer))))) IS TRUE))
);


--
-- Name: cajas_condition_projection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_condition_projection (
    id text NOT NULL,
    company_id text NOT NULL,
    box_identified_unit_id text NOT NULL,
    assignment_id text,
    condition public.cajas_current_condition,
    open_difference_count integer DEFAULT 0 NOT NULL,
    pending_dispatch_scope_count integer DEFAULT 0 NOT NULL,
    requires_recontrol boolean DEFAULT false NOT NULL,
    operation_ended_at timestamp(6) with time zone,
    dispatch_eligible boolean DEFAULT false NOT NULL,
    reuse_eligible boolean DEFAULT false NOT NULL,
    eligibility_reasons jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    evidence_watermark text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_ccp_counts_version CHECK ((((open_difference_count >= 0) AND (pending_dispatch_scope_count >= 0) AND (version > 0)) IS TRUE))
);


--
-- Name: cajas_consumption_confirmation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_consumption_confirmation (
    id text NOT NULL,
    company_id text NOT NULL,
    dispatch_id text NOT NULL,
    remito_id text NOT NULL,
    consumo_id text NOT NULL,
    sequence integer NOT NULL,
    record_kind public."EvidenceRecordKind" NOT NULL,
    original_slot smallint DEFAULT 1,
    corrects_confirmation_id text,
    observed_accounting_version integer NOT NULL,
    accepted_at timestamp(6) with time zone NOT NULL,
    accepted_by_id text NOT NULL,
    cause text,
    command_acceptance_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ccc_record_slot_version CHECK (((((record_kind = 'ORIGINAL'::public."EvidenceRecordKind") AND (original_slot = 1) AND (corrects_confirmation_id IS NULL) AND (observed_accounting_version > 0)) OR ((record_kind = 'CORRECTION'::public."EvidenceRecordKind") AND (original_slot IS NULL) AND (corrects_confirmation_id IS NOT NULL) AND (observed_accounting_version > 0))) IS TRUE))
);


--
-- Name: cajas_consumption_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_consumption_line (
    id text NOT NULL,
    company_id text NOT NULL,
    consumption_confirmation_id text NOT NULL,
    consumo_id text NOT NULL,
    dispatch_id text NOT NULL,
    line_number integer NOT NULL,
    consumo_item_id text NOT NULL,
    dispatch_line_id text NOT NULL,
    article_id text NOT NULL,
    stock_position_id text,
    quantity numeric(24,4) NOT NULL,
    stock_unit text NOT NULL,
    scale_snapshot smallint NOT NULL,
    sku_snapshot text,
    description_snapshot text,
    lot_code_snapshot text,
    expiration_date_snapshot date,
    serial_number_snapshot text,
    identified_code_snapshot text,
    traceability_snapshot jsonb,
    recognized_return_disposition_id text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ccln_quantity_scale CHECK ((((quantity > (0)::numeric) AND ((scale_snapshot >= 0) AND (scale_snapshot <= 4))) IS TRUE))
);


--
-- Name: cajas_control; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_control (
    id text NOT NULL,
    company_id text NOT NULL,
    assignment_id text NOT NULL,
    box_article_id text NOT NULL,
    formula_version_id text NOT NULL,
    kind public.cajas_control_kind NOT NULL,
    sequence integer NOT NULL,
    source_preparation_version integer NOT NULL,
    result public.cajas_control_result NOT NULL,
    prior_control_id text,
    acknowledgement_summary text,
    accepted_at timestamp(6) with time zone NOT NULL,
    accepted_by_id text NOT NULL,
    cause text,
    command_acceptance_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cc_positive_sequence_version CHECK ((((sequence > 0) AND (source_preparation_version > 0)) IS TRUE))
);


--
-- Name: cajas_control_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_control_line (
    id text NOT NULL,
    company_id text NOT NULL,
    assignment_id text NOT NULL,
    control_id text NOT NULL,
    line_number integer NOT NULL,
    source_preparation_id text NOT NULL,
    source_preparation_line_id text NOT NULL,
    expected_formula_line_id text,
    role public.cajas_line_role NOT NULL,
    article_id text NOT NULL,
    stock_position_id text,
    quantity numeric(24,4) NOT NULL,
    stock_unit text NOT NULL,
    scale_snapshot smallint NOT NULL,
    sku_snapshot text,
    description_snapshot text,
    trace_capture jsonb,
    difference_acknowledged boolean NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ccl_quantity_scale CHECK ((((quantity > (0)::numeric) AND ((scale_snapshot >= 0) AND (scale_snapshot <= 4))) IS TRUE))
);


--
-- Name: cajas_difference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_difference (
    id text NOT NULL,
    company_id text NOT NULL,
    assignment_id text NOT NULL,
    control_line_id text,
    origin_dispatch_id text,
    origin_remito_id text,
    dispatch_line_id text,
    return_confirmation_id text,
    return_line_id text,
    kind text NOT NULL,
    observed_facts text NOT NULL,
    opened_at timestamp(6) with time zone NOT NULL,
    opened_by_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cd_origin_shape CHECK (((((kind = 'CONTROL'::text) AND (control_line_id IS NOT NULL) AND (origin_dispatch_id IS NULL) AND (origin_remito_id IS NULL) AND (dispatch_line_id IS NULL) AND (return_confirmation_id IS NULL) AND (return_line_id IS NULL)) OR ((kind = 'DISPATCH'::text) AND (control_line_id IS NULL) AND (origin_dispatch_id IS NOT NULL) AND (origin_remito_id IS NOT NULL) AND (dispatch_line_id IS NOT NULL) AND (return_confirmation_id IS NULL) AND (return_line_id IS NULL)) OR ((kind = 'RETURN'::text) AND (control_line_id IS NULL) AND (origin_dispatch_id IS NOT NULL) AND (origin_remito_id IS NULL) AND (dispatch_line_id IS NULL) AND (return_confirmation_id IS NOT NULL) AND (return_line_id IS NOT NULL))) IS TRUE))
);


--
-- Name: cajas_difference_resolution; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_difference_resolution (
    id text NOT NULL,
    company_id text NOT NULL,
    difference_id text NOT NULL,
    sequence integer NOT NULL,
    closes_difference boolean NOT NULL,
    explanation text NOT NULL,
    supporting_reference text,
    accepted_at timestamp(6) with time zone NOT NULL,
    accepted_by_id text NOT NULL,
    cause text,
    command_acceptance_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cajas_dispatch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_dispatch (
    id text NOT NULL,
    company_id text NOT NULL,
    assignment_id text NOT NULL,
    remito_id text NOT NULL,
    source_control_id text NOT NULL,
    sequence integer NOT NULL,
    record_kind public."EvidenceRecordKind" NOT NULL,
    corrects_dispatch_id text,
    accepted_at timestamp(6) with time zone NOT NULL,
    accepted_by_id text NOT NULL,
    cause text,
    command_acceptance_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cdp_record_shape CHECK (((((record_kind = 'ORIGINAL'::public."EvidenceRecordKind") AND (corrects_dispatch_id IS NULL) AND (sequence > 0)) OR ((record_kind = 'CORRECTION'::public."EvidenceRecordKind") AND (corrects_dispatch_id IS NOT NULL) AND (sequence > 0))) IS TRUE))
);


--
-- Name: cajas_dispatch_accounting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_dispatch_accounting (
    id text NOT NULL,
    company_id text NOT NULL,
    dispatch_id text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    evidence_watermark text NOT NULL,
    reconciled_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_cda_version_positive CHECK (((version > 0) IS TRUE))
);


--
-- Name: cajas_dispatch_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_dispatch_line (
    id text NOT NULL,
    company_id text NOT NULL,
    dispatch_id text NOT NULL,
    assignment_id text NOT NULL,
    remito_id text NOT NULL,
    line_number integer NOT NULL,
    record_kind public."EvidenceRecordKind" NOT NULL,
    accounting_sign smallint NOT NULL,
    neutralizes_dispatch_line_id text,
    remito_item_id text NOT NULL,
    source_control_line_id text NOT NULL,
    source_preparation_id text NOT NULL,
    source_preparation_line_id text NOT NULL,
    article_id text NOT NULL,
    stock_position_id text,
    quantity numeric(24,4) NOT NULL,
    stock_unit text NOT NULL,
    scale_snapshot smallint NOT NULL,
    sku_snapshot text,
    description_snapshot text,
    lot_code_snapshot text,
    expiration_date_snapshot date,
    serial_number_snapshot text,
    identified_code_snapshot text,
    traceability_snapshot jsonb,
    stock_evidence_line_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cdl_quantity_scale CHECK ((((quantity > (0)::numeric) AND ((scale_snapshot >= 0) AND (scale_snapshot <= 4))) IS TRUE)),
    CONSTRAINT ck_cdl_record_sign_shape CHECK (((((record_kind = 'ORIGINAL'::public."EvidenceRecordKind") AND (accounting_sign = 1) AND (neutralizes_dispatch_line_id IS NULL)) OR ((record_kind = 'REVERSAL'::public."EvidenceRecordKind") AND (accounting_sign = '-1'::integer) AND (neutralizes_dispatch_line_id IS NOT NULL))) IS TRUE))
);


--
-- Name: cajas_dispatch_line_accounting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_dispatch_line_accounting (
    id text NOT NULL,
    company_id text NOT NULL,
    accounting_id text NOT NULL,
    dispatch_id text NOT NULL,
    dispatch_line_id text NOT NULL,
    dispatched_quantity numeric(24,4) NOT NULL,
    disposed_quantity numeric(24,4) NOT NULL,
    pending_quantity numeric(24,4) NOT NULL,
    stock_unit text NOT NULL,
    scale_snapshot smallint NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_cdla_balance_scale_version CHECK ((((dispatched_quantity >= (0)::numeric) AND (disposed_quantity >= (0)::numeric) AND (pending_quantity >= (0)::numeric) AND (pending_quantity = (dispatched_quantity - disposed_quantity)) AND ((scale_snapshot >= 0) AND (scale_snapshot <= 4)) AND (version > 0)) IS TRUE))
);


--
-- Name: cajas_disposition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_disposition (
    id text NOT NULL,
    company_id text NOT NULL,
    dispatch_id text NOT NULL,
    dispatch_line_id text NOT NULL,
    article_id text NOT NULL,
    slice_key text NOT NULL,
    record_kind public."EvidenceRecordKind" NOT NULL,
    accounting_sign smallint NOT NULL,
    kind public.cajas_disposition_kind NOT NULL,
    quantity numeric(24,4) NOT NULL,
    stock_unit text NOT NULL,
    scale_snapshot smallint NOT NULL,
    stock_position_id text,
    return_confirmation_id text,
    consumption_confirmation_id text,
    return_line_id text,
    consumption_line_id text,
    neutralizes_disposition_id text,
    stock_evidence_line_id text NOT NULL,
    accepted_at timestamp(6) with time zone NOT NULL,
    command_acceptance_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cdis_owner_shape CHECK (((((return_confirmation_id IS NOT NULL) AND (return_line_id IS NOT NULL) AND (consumption_confirmation_id IS NULL) AND (consumption_line_id IS NULL)) OR ((return_confirmation_id IS NULL) AND (return_line_id IS NULL) AND (consumption_confirmation_id IS NOT NULL) AND (consumption_line_id IS NOT NULL))) IS TRUE)),
    CONSTRAINT ck_cdis_quantity_scale CHECK ((((quantity > (0)::numeric) AND ((scale_snapshot >= 0) AND (scale_snapshot <= 4))) IS TRUE)),
    CONSTRAINT ck_cdis_record_sign_shape CHECK (((((record_kind = 'ORIGINAL'::public."EvidenceRecordKind") AND (accounting_sign = 1) AND (neutralizes_disposition_id IS NULL)) OR ((record_kind = 'REVERSAL'::public."EvidenceRecordKind") AND (accounting_sign = '-1'::integer) AND (neutralizes_disposition_id IS NOT NULL))) IS TRUE))
);


--
-- Name: cajas_formula_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_formula_line (
    id text NOT NULL,
    company_id text NOT NULL,
    formula_version_id text NOT NULL,
    line_number integer NOT NULL,
    article_id text NOT NULL,
    expected_quantity numeric(24,4) NOT NULL,
    stock_unit text NOT NULL,
    scale_snapshot smallint NOT NULL,
    sku_snapshot text,
    description_snapshot text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cfl_quantity_positive CHECK (((expected_quantity > (0)::numeric) IS TRUE)),
    CONSTRAINT ck_cfl_scale_snapshot CHECK ((((scale_snapshot >= 0) AND (scale_snapshot <= 4)) IS TRUE))
);


--
-- Name: cajas_formula_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_formula_version (
    id text NOT NULL,
    company_id text NOT NULL,
    formula_id text NOT NULL,
    box_article_id text NOT NULL,
    version_number integer NOT NULL,
    previous_version_id text,
    accepted_at timestamp(6) with time zone NOT NULL,
    accepted_by_id text NOT NULL,
    cause text,
    command_acceptance_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cfv_version_positive CHECK (((version_number > 0) IS TRUE))
);


--
-- Name: cajas_maintenance_case; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_maintenance_case (
    id text NOT NULL,
    company_id text NOT NULL,
    box_identified_unit_id text NOT NULL,
    article_id text,
    kind public.cajas_maintenance_kind NOT NULL,
    status public.cajas_maintenance_status NOT NULL,
    description text NOT NULL,
    version integer NOT NULL,
    opened_at timestamp(6) with time zone NOT NULL,
    opened_by_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_cmc_version_description CHECK (((version >= 1) AND (length(btrim(description)) > 0)))
);


--
-- Name: cajas_maintenance_transition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_maintenance_transition (
    id text NOT NULL,
    company_id text NOT NULL,
    case_id text NOT NULL,
    sequence integer NOT NULL,
    from_status public.cajas_maintenance_status,
    to_status public.cajas_maintenance_status NOT NULL,
    note text,
    accepted_at timestamp(6) with time zone NOT NULL,
    accepted_by_id text NOT NULL,
    command_acceptance_id text NOT NULL,
    audit_event_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cmt_sequence_note_edge CHECK (((sequence >= 1) AND ((note IS NULL) OR (length(btrim(note)) > 0)) AND (((sequence = 1) AND (from_status IS NULL) AND (to_status = 'open'::public.cajas_maintenance_status)) OR ((sequence > 1) AND (from_status IS NOT NULL) AND (((from_status = 'open'::public.cajas_maintenance_status) AND (to_status = ANY (ARRAY['sent'::public.cajas_maintenance_status, 'cancelled'::public.cajas_maintenance_status]))) OR ((from_status = 'sent'::public.cajas_maintenance_status) AND (to_status = 'returned_pending_review'::public.cajas_maintenance_status)) OR ((from_status = 'returned_pending_review'::public.cajas_maintenance_status) AND (to_status = 'closed'::public.cajas_maintenance_status)))))))
);


--
-- Name: cajas_phase_d_action_grant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_phase_d_action_grant (
    id text NOT NULL,
    company_id text NOT NULL,
    user_id text NOT NULL,
    action public.cajas_phase_d_action NOT NULL,
    granted_by_id text NOT NULL,
    granted_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cajas_phase_d_operation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_phase_d_operation (
    id text NOT NULL,
    company_id text NOT NULL,
    dispatch_id text NOT NULL,
    dispatch_line_id text,
    remito_id text NOT NULL,
    surgery_id text NOT NULL,
    kind public.cajas_phase_d_operation_kind NOT NULL,
    return_state public.cajas_phase_d_return_state,
    receipt_outcome public.cajas_phase_d_receipt_outcome,
    article_id text,
    stock_position_id text,
    quantity numeric(24,4) NOT NULL,
    stock_unit text,
    scale_snapshot smallint,
    lot_code_snapshot text,
    serial_number_snapshot text,
    identified_code_snapshot text,
    expiration_date_snapshot date,
    evidence jsonb,
    reason text,
    observations text,
    source_operation_id text,
    command_key text NOT NULL,
    command_intent_hash text NOT NULL,
    bundle_id text NOT NULL,
    accepted_by_id text NOT NULL,
    accepted_at timestamp(6) with time zone NOT NULL,
    received_by_id text,
    received_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cajas_phase_d_reconciliation_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_phase_d_reconciliation_event (
    id text NOT NULL,
    company_id text NOT NULL,
    dispatch_id text NOT NULL,
    kind public.cajas_phase_d_reconciliation_event_kind NOT NULL,
    snapshot jsonb NOT NULL,
    reason text,
    command_key text NOT NULL,
    command_intent_hash text NOT NULL,
    command_acceptance_id text NOT NULL,
    audit_event_id text NOT NULL,
    accepted_by_id text NOT NULL,
    accepted_at timestamp(6) with time zone NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cajas_preparation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_preparation (
    id text NOT NULL,
    company_id text NOT NULL,
    assignment_id text NOT NULL,
    box_article_id text NOT NULL,
    formula_version_id text NOT NULL,
    latest_control_id text,
    last_accepted_change_id text,
    requires_recontrol boolean NOT NULL,
    version integer NOT NULL,
    evidence_watermark text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_cp_version_positive CHECK (((version > 0) IS TRUE))
);


--
-- Name: cajas_preparation_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_preparation_line (
    id text NOT NULL,
    company_id text NOT NULL,
    preparation_id text NOT NULL,
    formula_version_id text NOT NULL,
    line_key text NOT NULL,
    expected_formula_line_id text,
    role public.cajas_line_role NOT NULL,
    article_id text NOT NULL,
    stock_position_id text,
    quantity numeric(24,4) NOT NULL,
    stock_unit text NOT NULL,
    scale_snapshot smallint NOT NULL,
    trace_capture jsonb,
    difference_acknowledged boolean NOT NULL,
    dispatched_quantity numeric(24,4) NOT NULL,
    version integer NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_cpl_values CHECK ((((quantity > (0)::numeric) AND (dispatched_quantity >= (0)::numeric) AND (dispatched_quantity <= quantity) AND ((scale_snapshot >= 0) AND (scale_snapshot <= 4)) AND (version > 0)) IS TRUE))
);


--
-- Name: cajas_replacement_pair; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_replacement_pair (
    id text NOT NULL,
    company_id text NOT NULL,
    return_confirmation_id text NOT NULL,
    dispatch_id text NOT NULL,
    return_line_id text NOT NULL,
    original_dispatch_line_id text NOT NULL,
    received_article_id text NOT NULL,
    received_stock_position_id text,
    explanation text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cajas_reservation_correlation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_reservation_correlation (
    id text NOT NULL,
    company_id text NOT NULL,
    assignment_id text NOT NULL,
    preparation_id text,
    preparation_line_id text,
    stock_position_id text NOT NULL,
    stock_reservation_id text NOT NULL,
    stock_reservation_evidence_id text NOT NULL,
    source_checkpoint text NOT NULL,
    semantic_key text NOT NULL,
    quantity numeric(24,4),
    stock_unit text,
    scale_snapshot smallint,
    replaces_correlation_id text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    allocation_trace_snapshot jsonb,
    CONSTRAINT ck_crc_preparation_shape CHECK (((((preparation_id IS NULL) AND (preparation_line_id IS NULL)) OR ((preparation_id IS NOT NULL) AND (preparation_line_id IS NOT NULL))) IS TRUE)),
    CONSTRAINT ck_crc_quantity_shape CHECK (((((quantity IS NULL) AND (stock_unit IS NULL) AND (scale_snapshot IS NULL)) OR ((quantity > (0)::numeric) AND (stock_unit IS NOT NULL) AND ((scale_snapshot >= 0) AND (scale_snapshot <= 4)))) IS TRUE))
);


--
-- Name: cajas_return_confirmation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_return_confirmation (
    id text NOT NULL,
    company_id text NOT NULL,
    dispatch_id text NOT NULL,
    remito_id text NOT NULL,
    devolucion_id text NOT NULL,
    sequence integer NOT NULL,
    record_kind public."EvidenceRecordKind" NOT NULL,
    original_slot smallint DEFAULT 1,
    corrects_confirmation_id text,
    observed_accounting_version integer NOT NULL,
    result public.cajas_control_result NOT NULL,
    note text,
    accepted_at timestamp(6) with time zone NOT NULL,
    accepted_by_id text NOT NULL,
    cause text,
    command_acceptance_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_crcfn_record_slot_version CHECK (((((record_kind = 'ORIGINAL'::public."EvidenceRecordKind") AND (original_slot = 1) AND (corrects_confirmation_id IS NULL) AND (observed_accounting_version > 0)) OR ((record_kind = 'CORRECTION'::public."EvidenceRecordKind") AND (original_slot IS NULL) AND (corrects_confirmation_id IS NOT NULL) AND (observed_accounting_version > 0))) IS TRUE))
);


--
-- Name: cajas_return_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_return_line (
    id text NOT NULL,
    company_id text NOT NULL,
    return_confirmation_id text NOT NULL,
    devolucion_id text NOT NULL,
    dispatch_id text NOT NULL,
    line_number integer NOT NULL,
    devolucion_item_id text NOT NULL,
    dispatch_line_id text,
    kind public.cajas_return_line_kind NOT NULL,
    article_id text NOT NULL,
    stock_position_id text,
    quantity numeric(24,4) NOT NULL,
    stock_unit text NOT NULL,
    scale_snapshot smallint NOT NULL,
    sku_snapshot text,
    description_snapshot text,
    lot_code_snapshot text,
    expiration_date_snapshot date,
    serial_number_snapshot text,
    identified_code_snapshot text,
    traceability_snapshot jsonb,
    human_validated boolean NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_crl_dispatch_kind_shape CHECK (((((kind = 'unchanged'::public.cajas_return_line_kind) AND (dispatch_line_id IS NOT NULL)) OR ((kind = 'consumed'::public.cajas_return_line_kind) AND (dispatch_line_id IS NOT NULL)) OR ((kind = 'missing'::public.cajas_return_line_kind) AND (dispatch_line_id IS NOT NULL)) OR ((kind = 'damaged'::public.cajas_return_line_kind) AND (dispatch_line_id IS NOT NULL)) OR ((kind = 'under_review'::public.cajas_return_line_kind) AND (dispatch_line_id IS NOT NULL)) OR ((kind = 'added'::public.cajas_return_line_kind) AND (dispatch_line_id IS NULL)) OR ((kind = 'replacement'::public.cajas_return_line_kind) AND (dispatch_line_id IS NULL))) IS TRUE)),
    CONSTRAINT ck_crl_quantity_scale CHECK ((((quantity > (0)::numeric) AND ((scale_snapshot >= 0) AND (scale_snapshot <= 4))) IS TRUE))
);


--
-- Name: cajas_unit_log_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_unit_log_entry (
    id text NOT NULL,
    company_id text NOT NULL,
    assignment_id text NOT NULL,
    box_identified_unit_id text NOT NULL,
    article_id text NOT NULL,
    event_kind text NOT NULL,
    note text NOT NULL,
    occurred_at timestamp(6) with time zone NOT NULL,
    actor_user_id text NOT NULL,
    command_acceptance_id text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_cule_event_kind CHECK ((event_kind = ANY (ARRAY['PROBLEM_REPORTED'::text, 'REPAIR_SENT'::text, 'REPAIR_RETURNED'::text]))),
    CONSTRAINT ck_cule_note CHECK ((length(btrim(note)) > 0))
);


--
-- Name: catalog_alias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_alias (
    id text NOT NULL,
    organization_id text NOT NULL,
    kind public.catalog_kind NOT NULL,
    normalized_alias text NOT NULL,
    raw_alias text NOT NULL,
    category_id text,
    clinical_family_id text,
    brand_id text,
    manufacturer_id text,
    product_line_id text,
    source text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deactivated_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_catalog_alias_kind_target CHECK ((((kind = 'CATEGORY'::public.catalog_kind) AND (category_id IS NOT NULL) AND (clinical_family_id IS NULL) AND (brand_id IS NULL) AND (manufacturer_id IS NULL) AND (product_line_id IS NULL)) OR ((kind = 'CLINICAL_FAMILY'::public.catalog_kind) AND (category_id IS NULL) AND (clinical_family_id IS NOT NULL) AND (brand_id IS NULL) AND (manufacturer_id IS NULL) AND (product_line_id IS NULL)) OR ((kind = 'BRAND'::public.catalog_kind) AND (category_id IS NULL) AND (clinical_family_id IS NULL) AND (brand_id IS NOT NULL) AND (manufacturer_id IS NULL) AND (product_line_id IS NULL)) OR ((kind = 'MANUFACTURER'::public.catalog_kind) AND (category_id IS NULL) AND (clinical_family_id IS NULL) AND (brand_id IS NULL) AND (manufacturer_id IS NOT NULL) AND (product_line_id IS NULL)) OR ((kind = 'PRODUCT_LINE'::public.catalog_kind) AND (category_id IS NULL) AND (clinical_family_id IS NULL) AND (brand_id IS NULL) AND (manufacturer_id IS NULL) AND (product_line_id IS NOT NULL))))
);


--
-- Name: clinical_family; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_family (
    id text NOT NULL,
    organization_id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    normalized_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deactivated_at timestamp(6) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);


--
-- Name: consumo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumo (
    id text NOT NULL,
    "visibleNumber" integer,
    "companyId" text NOT NULL,
    "surgeryId" text,
    "remitoId" text NOT NULL,
    state text DEFAULT 'Borrador'::text NOT NULL,
    "validatedAt" timestamp(3) without time zone,
    "facturedAt" timestamp(3) without time zone,
    "createdById" text,
    "updatedById" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: consumo_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumo_item (
    id text NOT NULL,
    "consumoId" text NOT NULL,
    "remitoItemId" text,
    sku text,
    description text NOT NULL,
    "requestedQuantity" numeric(18,4) NOT NULL,
    "consumedQuantity" numeric(18,4) DEFAULT 0 NOT NULL,
    unit text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lotNumber" text,
    "serialNumber" text,
    "expirationDate" timestamp(3) without time zone,
    company_id text NOT NULL
);


--
-- Name: devolucion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devolucion (
    id text NOT NULL,
    "visibleNumber" integer,
    "companyId" text NOT NULL,
    "surgeryId" text,
    "remitoId" text NOT NULL,
    "consumoId" text,
    state text DEFAULT 'Borrador'::text NOT NULL,
    reason text,
    "validatedAt" timestamp(3) without time zone,
    "createdById" text,
    "updatedById" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: devolucion_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devolucion_item (
    id text NOT NULL,
    "devolucionId" text NOT NULL,
    "remitoItemId" text,
    "consumoItemId" text,
    sku text,
    description text NOT NULL,
    "returnedQuantity" numeric(18,4) NOT NULL,
    unit text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lotNumber" text,
    "serialNumber" text,
    "expirationDate" timestamp(3) without time zone,
    company_id text NOT NULL
);


--
-- Name: durable_attempt_audit_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.durable_attempt_audit_event (
    event_id character(64) NOT NULL,
    schema_version character varying(64) NOT NULL,
    policy_id character varying(64) NOT NULL,
    correlation_id uuid NOT NULL,
    event_ordinal integer NOT NULL,
    event_kind character varying(32) NOT NULL,
    bundle_id character varying(16) NOT NULL,
    contract_ids jsonb NOT NULL,
    company_id text NOT NULL,
    bundle_semantic_key_sha256 character(64) NOT NULL,
    complete_payload_sha256 character(64) NOT NULL,
    policy_set_sha256 character(64) NOT NULL,
    writer_registry_sha256 character(64) NOT NULL,
    scanner_input_sha256 character(64) NOT NULL,
    attempt_ordinal integer,
    transaction_id uuid,
    anchor_set_sha256 character(64),
    sqlstate character varying(5),
    domain_commit_state character varying(16) NOT NULL,
    occurred_at timestamp(3) with time zone NOT NULL,
    predecessor_event_sha256 character(64),
    event_sha256 character(64) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_daae_attempt_ordinal CHECK (((attempt_ordinal IS NULL) OR ((attempt_ordinal >= 1) AND (attempt_ordinal <= 3)))),
    CONSTRAINT ck_daae_chain_root CHECK (((event_ordinal = 1) = (predecessor_event_sha256 IS NULL))),
    CONSTRAINT ck_daae_commit_state CHECK (((domain_commit_state)::text = ANY ((ARRAY['NOT_STARTED'::character varying, 'ROLLED_BACK'::character varying, 'COMMITTED'::character varying, 'UNKNOWN'::character varying])::text[]))),
    CONSTRAINT ck_daae_contract_ids CHECK (((jsonb_typeof(contract_ids) = 'array'::text) AND ((jsonb_array_length(contract_ids) >= 1) AND (jsonb_array_length(contract_ids) <= 4)))),
    CONSTRAINT ck_daae_event_id_hex CHECK ((event_id ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT ck_daae_event_kind CHECK (((event_kind)::text = ANY ((ARRAY['AUTH_DENIED'::character varying, 'ATTEMPT_STARTED'::character varying, 'ATTEMPT_ROLLED_BACK'::character varying, 'RETRY_SCHEDULED'::character varying, 'RETRY_EXHAUSTED'::character varying, 'SUCCESS_COMMITTED'::character varying, 'SUCCESS_RECOVERED'::character varying, 'PROCESS_DEATH_UNKNOWN'::character varying, 'ROLLED_BACK_RECOVERED'::character varying, 'AUDIT_PENDING'::character varying])::text[]))),
    CONSTRAINT ck_daae_event_ordinal CHECK ((event_ordinal > 0)),
    CONSTRAINT ck_daae_hashes_hex CHECK (((bundle_semantic_key_sha256 ~ '^[0-9a-f]{64}$'::text) AND (complete_payload_sha256 ~ '^[0-9a-f]{64}$'::text) AND (policy_set_sha256 ~ '^[0-9a-f]{64}$'::text) AND (writer_registry_sha256 ~ '^[0-9a-f]{64}$'::text) AND (scanner_input_sha256 ~ '^[0-9a-f]{64}$'::text) AND ((anchor_set_sha256 IS NULL) OR (anchor_set_sha256 ~ '^[0-9a-f]{64}$'::text)) AND ((predecessor_event_sha256 IS NULL) OR (predecessor_event_sha256 ~ '^[0-9a-f]{64}$'::text)) AND (event_sha256 ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT ck_daae_policy_id CHECK (((policy_id)::text = 'AUP-C14-DUAL-AUDIT-CX08-CCT1'::text)),
    CONSTRAINT ck_daae_policy_set CHECK ((policy_set_sha256 = '406b08dbaf852e9c9752a5ef8a7fdd52602cf0cd8977440b3f17358e541dd188'::bpchar)),
    CONSTRAINT ck_daae_scanner_input CHECK ((scanner_input_sha256 = '69b3458e5d1390ef8ae87f32a0202465276c209b449cd1fc0a24e9f930493d4a'::bpchar)),
    CONSTRAINT ck_daae_schema_version CHECK (((schema_version)::text = 'C14-INSERT-DURABLE-ATTEMPT-AUDIT-EVENT-V3-CX08-CCT1'::text)),
    CONSTRAINT ck_daae_sqlstate CHECK (((sqlstate IS NULL) OR ((sqlstate)::text = ANY ((ARRAY['55P03'::character varying, '40P01'::character varying, '40001'::character varying])::text[])))),
    CONSTRAINT ck_daae_writer_registry CHECK ((writer_registry_sha256 = '52f8755d9bc2385f03dc0699c33e41f66e637e64adf6d8f5495d68ec6a4c2c47'::bpchar))
);


--
-- Name: invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice (
    id text NOT NULL,
    "visibleNumber" integer,
    "companyId" text NOT NULL,
    "surgeryId" text,
    "presupuestoId" text,
    "consumoId" text,
    base text DEFAULT 'manual'::text NOT NULL,
    state text DEFAULT 'Borrador'::text NOT NULL,
    type text DEFAULT 'FV'::text NOT NULL,
    currency text DEFAULT 'ARS'::text NOT NULL,
    subtotal numeric(18,4) DEFAULT 0 NOT NULL,
    "discountTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    "taxTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    total numeric(18,4) DEFAULT 0 NOT NULL,
    "paidTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    balance numeric(18,4) DEFAULT 0 NOT NULL,
    "issuedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "createdById" text,
    "updatedById" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: invoice_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_item (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    sku text,
    description text NOT NULL,
    quantity numeric(18,4) NOT NULL,
    unit text,
    "unitPrice" numeric(18,4) DEFAULT 0 NOT NULL,
    discount numeric(18,4) DEFAULT 0 NOT NULL,
    tax numeric(18,4) DEFAULT 0 NOT NULL,
    total numeric(18,4) DEFAULT 0 NOT NULL,
    "sourceType" text,
    "sourceItemId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: manufacturer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manufacturer (
    id text NOT NULL,
    organization_id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    normalized_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deactivated_at timestamp(6) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);


--
-- Name: payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment (
    id text NOT NULL,
    "visibleNumber" integer,
    "companyId" text NOT NULL,
    "surgeryId" text,
    state text DEFAULT 'Registrado'::text NOT NULL,
    method text,
    currency text DEFAULT 'ARS'::text NOT NULL,
    amount numeric(18,4) NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" text,
    "updatedById" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payment_imputation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_imputation (
    id text NOT NULL,
    "paymentId" text NOT NULL,
    "invoiceId" text NOT NULL,
    amount numeric(18,4) NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: presupuesto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presupuesto (
    id text NOT NULL,
    "visibleNumber" integer,
    "companyId" text NOT NULL,
    "surgeryId" text,
    "parentPresupuestoId" text,
    "versionNumber" integer DEFAULT 1 NOT NULL,
    state text DEFAULT 'Borrador'::text NOT NULL,
    title text,
    currency text DEFAULT 'ARS'::text NOT NULL,
    subtotal numeric(18,4) DEFAULT 0 NOT NULL,
    "discountTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    "taxTotal" numeric(18,4) DEFAULT 0 NOT NULL,
    total numeric(18,4) DEFAULT 0 NOT NULL,
    "validUntil" timestamp(3) without time zone,
    "issuedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "createdById" text,
    "updatedById" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "familyId" text NOT NULL,
    "sourcePresupuestoId" text,
    slot text DEFAULT 'DRAFT'::text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    "branchId" text NOT NULL,
    "clientContactId" text NOT NULL,
    "payerContactId" text NOT NULL,
    "documentDate" date NOT NULL,
    "paymentTerms" text NOT NULL,
    "priceListCode" text NOT NULL,
    legend text NOT NULL,
    notes text,
    "generalDiscountRate" numeric(9,4) DEFAULT 0 NOT NULL,
    "commercialSnapshot" jsonb NOT NULL,
    CONSTRAINT ck_presupuesto_general_discount_rate CHECK ((("generalDiscountRate" >= (0)::numeric) AND ("generalDiscountRate" <= (100)::numeric))),
    CONSTRAINT ck_presupuesto_revision_positive CHECK ((revision > 0)),
    CONSTRAINT ck_presupuesto_slot_state CHECK ((((slot = 'DRAFT'::text) AND (state = 'Borrador'::text)) OR ((slot = 'CURRENT'::text) AND (state = ANY (ARRAY['Emitido'::text, 'Aprobado'::text, 'Rechazado'::text, 'Vencido'::text, 'Anulado'::text]))) OR ((slot = 'HISTORY'::text) AND (state = 'Reemplazado'::text)))),
    CONSTRAINT ck_presupuesto_version_positive CHECK (("versionNumber" > 0))
);


--
-- Name: presupuesto_family; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presupuesto_family (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "surgeryId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: presupuesto_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presupuesto_item (
    id text NOT NULL,
    "presupuestoId" text NOT NULL,
    sku text,
    description text NOT NULL,
    quantity numeric(18,4) NOT NULL,
    unit text,
    "unitPrice" numeric(18,4) DEFAULT 0 NOT NULL,
    discount numeric(18,4) DEFAULT 0 NOT NULL,
    tax numeric(18,4) DEFAULT 0 NOT NULL,
    total numeric(18,4) DEFAULT 0 NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "position" integer NOT NULL,
    "discountRate" numeric(9,4) DEFAULT 0 NOT NULL,
    "taxRate" numeric(9,4) DEFAULT 0 NOT NULL,
    CONSTRAINT ck_presupuesto_item_discount_rate CHECK ((("discountRate" >= (0)::numeric) AND ("discountRate" <= (100)::numeric))),
    CONSTRAINT ck_presupuesto_item_position CHECK (("position" >= 0)),
    CONSTRAINT ck_presupuesto_item_tax_rate CHECK ((("taxRate" >= (0)::numeric) AND ("taxRate" <= (100)::numeric)))
);


--
-- Name: product_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_category (
    id text NOT NULL,
    organization_id text NOT NULL,
    parent_id text,
    code text NOT NULL,
    name text NOT NULL,
    normalized_name text NOT NULL,
    depth integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deactivated_at timestamp(6) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_product_category_depth CHECK (((depth >= 1) AND (depth <= 3))),
    CONSTRAINT ck_product_category_parent_depth_shape CHECK ((((parent_id IS NULL) AND (depth = 1)) OR ((parent_id IS NOT NULL) AND (depth = ANY (ARRAY[2, 3]))))),
    CONSTRAINT ck_product_category_parent_not_self CHECK (((parent_id IS NULL) OR (parent_id <> id)))
);


--
-- Name: product_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_line (
    id text NOT NULL,
    organization_id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    normalized_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deactivated_at timestamp(6) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);


--
-- Name: xadmin_article_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.xadmin_article_mapping (
    id text NOT NULL,
    organization_id text NOT NULL,
    stage_row_id text NOT NULL,
    axis public.legacy_axis NOT NULL,
    status public.legacy_mapping_status NOT NULL,
    target_article_id text,
    target_category_id text,
    target_clinical_family_id text,
    target_brand_id text,
    target_manufacturer_id text,
    target_product_line_id text,
    confidence numeric(5,4),
    review_reason text,
    decided_by_id text,
    decided_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT ck_xadmin_mapping_confidence CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))),
    CONSTRAINT ck_xadmin_mapping_decision_pair CHECK (((decided_by_id IS NULL) = (decided_at IS NULL))),
    CONSTRAINT ck_xadmin_mapping_status_axis_target CHECK ((((status = 'MAPPED'::public.legacy_mapping_status) AND (((axis = 'ARTICLE'::public.legacy_axis) AND (target_article_id IS NOT NULL) AND (target_category_id IS NULL) AND (target_clinical_family_id IS NULL) AND (target_brand_id IS NULL) AND (target_manufacturer_id IS NULL) AND (target_product_line_id IS NULL)) OR ((axis = 'CATEGORY'::public.legacy_axis) AND (target_article_id IS NULL) AND (target_category_id IS NOT NULL) AND (target_clinical_family_id IS NULL) AND (target_brand_id IS NULL) AND (target_manufacturer_id IS NULL) AND (target_product_line_id IS NULL)) OR ((axis = 'CLINICAL_FAMILY'::public.legacy_axis) AND (target_article_id IS NULL) AND (target_category_id IS NULL) AND (target_clinical_family_id IS NOT NULL) AND (target_brand_id IS NULL) AND (target_manufacturer_id IS NULL) AND (target_product_line_id IS NULL)) OR ((axis = 'BRAND'::public.legacy_axis) AND (target_article_id IS NULL) AND (target_category_id IS NULL) AND (target_clinical_family_id IS NULL) AND (target_brand_id IS NOT NULL) AND (target_manufacturer_id IS NULL) AND (target_product_line_id IS NULL)) OR ((axis = 'MANUFACTURER'::public.legacy_axis) AND (target_article_id IS NULL) AND (target_category_id IS NULL) AND (target_clinical_family_id IS NULL) AND (target_brand_id IS NULL) AND (target_manufacturer_id IS NOT NULL) AND (target_product_line_id IS NULL)) OR ((axis = 'PRODUCT_LINE'::public.legacy_axis) AND (target_article_id IS NULL) AND (target_category_id IS NULL) AND (target_clinical_family_id IS NULL) AND (target_brand_id IS NULL) AND (target_manufacturer_id IS NULL) AND (target_product_line_id IS NOT NULL)))) OR ((status <> 'MAPPED'::public.legacy_mapping_status) AND (target_article_id IS NULL) AND (target_category_id IS NULL) AND (target_clinical_family_id IS NULL) AND (target_brand_id IS NULL) AND (target_manufacturer_id IS NULL) AND (target_product_line_id IS NULL))))
);


--
-- Name: xadmin_article_stage_row; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.xadmin_article_stage_row (
    id text NOT NULL,
    organization_id text NOT NULL,
    run_id text NOT NULL,
    source_row_key text NOT NULL,
    source_row_number integer NOT NULL,
    source_row_sha256 text NOT NULL,
    source_code text NOT NULL,
    source_description text NOT NULL,
    legacy_xadmin_type text,
    legacy_department text,
    legacy_rubro text,
    legacy_section text,
    legacy_sector text,
    legacy_brand text,
    legacy_line text,
    raw_payload jsonb NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_xadmin_stage_row_hash CHECK ((source_row_sha256 ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT ck_xadmin_stage_row_key CHECK ((length(source_row_key) > 0)),
    CONSTRAINT ck_xadmin_stage_row_number CHECK ((source_row_number > 0))
);


--
-- Name: xadmin_import_run; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.xadmin_import_run (
    id text NOT NULL,
    organization_id text NOT NULL,
    source_name text NOT NULL,
    source_file_sha256 text NOT NULL,
    run_key text NOT NULL,
    status text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at timestamp(6) with time zone,
    CONSTRAINT ck_xadmin_import_run_file_hash CHECK ((source_file_sha256 ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT ck_xadmin_import_run_key_hash CHECK ((run_key ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT ck_xadmin_import_run_status CHECK ((length(btrim(status)) > 0))
);


--
-- Name: ArticleIdentifier ArticleIdentifier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ArticleIdentifier"
    ADD CONSTRAINT "ArticleIdentifier_pkey" PRIMARY KEY (id);


--
-- Name: ArticleSupplierMapping ArticleSupplierMapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ArticleSupplierMapping"
    ADD CONSTRAINT "ArticleSupplierMapping_pkey" PRIMARY KEY (id);


--
-- Name: ArticleTraceabilityPolicy ArticleTraceabilityPolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ArticleTraceabilityPolicy"
    ADD CONSTRAINT "ArticleTraceabilityPolicy_pkey" PRIMARY KEY (id);


--
-- Name: Article Article_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_pkey" PRIMARY KEY (id);


--
-- Name: AuditEvent AuditEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditEvent"
    ADD CONSTRAINT "AuditEvent_pkey" PRIMARY KEY (id);


--
-- Name: AvailabilityCapabilityGrant AvailabilityCapabilityGrant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityCapabilityGrant"
    ADD CONSTRAINT "AvailabilityCapabilityGrant_pkey" PRIMARY KEY (id);


--
-- Name: AvailabilityCommand AvailabilityCommand_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityCommand"
    ADD CONSTRAINT "AvailabilityCommand_pkey" PRIMARY KEY (id);


--
-- Name: AvailabilityRequestRecipientAssignment AvailabilityRequestRecipientAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequestRecipientAssignment"
    ADD CONSTRAINT "AvailabilityRequestRecipientAssignment_pkey" PRIMARY KEY (id);


--
-- Name: AvailabilityRequest AvailabilityRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequest"
    ADD CONSTRAINT "AvailabilityRequest_pkey" PRIMARY KEY (id);


--
-- Name: Branch Branch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Branch"
    ADD CONSTRAINT "Branch_pkey" PRIMARY KEY (id);


--
-- Name: CompanyOperationalAssignee CompanyOperationalAssignee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompanyOperationalAssignee"
    ADD CONSTRAINT "CompanyOperationalAssignee_pkey" PRIMARY KEY (id);


--
-- Name: Company Company_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_pkey" PRIMARY KEY (id);


--
-- Name: ContactAddress ContactAddress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactAddress"
    ADD CONSTRAINT "ContactAddress_pkey" PRIMARY KEY (id);


--
-- Name: ContactCompanyLink ContactCompanyLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactCompanyLink"
    ADD CONSTRAINT "ContactCompanyLink_pkey" PRIMARY KEY (id);


--
-- Name: ContactGroupMembership ContactGroupMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactGroupMembership"
    ADD CONSTRAINT "ContactGroupMembership_pkey" PRIMARY KEY (id);


--
-- Name: ContactGroup ContactGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactGroup"
    ADD CONSTRAINT "ContactGroup_pkey" PRIMARY KEY (id);


--
-- Name: Contact Contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contact"
    ADD CONSTRAINT "Contact_pkey" PRIMARY KEY (id);


--
-- Name: DigitalReceiptAccess DigitalReceiptAccess_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptAccess"
    ADD CONSTRAINT "DigitalReceiptAccess_pkey" PRIMARY KEY (id);


--
-- Name: DigitalReceiptArtifact DigitalReceiptArtifact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptArtifact"
    ADD CONSTRAINT "DigitalReceiptArtifact_pkey" PRIMARY KEY (id);


--
-- Name: DigitalReceiptEvent DigitalReceiptEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptEvent"
    ADD CONSTRAINT "DigitalReceiptEvent_pkey" PRIMARY KEY (id);


--
-- Name: DigitalReceiptSnapshot DigitalReceiptSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptSnapshot"
    ADD CONSTRAINT "DigitalReceiptSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: DigitalReceipt DigitalReceipt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceipt"
    ADD CONSTRAINT "DigitalReceipt_pkey" PRIMARY KEY (id);


--
-- Name: GoodsReceiptLine GoodsReceiptLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceiptLine"
    ADD CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY (id);


--
-- Name: GoodsReceipt GoodsReceipt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceipt"
    ADD CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY (id);


--
-- Name: InternalNotification InternalNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InternalNotification"
    ADD CONSTRAINT "InternalNotification_pkey" PRIMARY KEY (id);


--
-- Name: OperationalCommandAcceptance OperationalCommandAcceptance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandAcceptance"
    ADD CONSTRAINT "OperationalCommandAcceptance_pkey" PRIMARY KEY (id);


--
-- Name: OperationalCommandAttempt OperationalCommandAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandAttempt"
    ADD CONSTRAINT "OperationalCommandAttempt_pkey" PRIMARY KEY (id);


--
-- Name: OperationalCommandEffect OperationalCommandEffect_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandEffect"
    ADD CONSTRAINT "OperationalCommandEffect_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: ProjectionReconciliation ProjectionReconciliation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectionReconciliation"
    ADD CONSTRAINT "ProjectionReconciliation_pkey" PRIMARY KEY (id);


--
-- Name: RemitoItem RemitoItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoItem"
    ADD CONSTRAINT "RemitoItem_pkey" PRIMARY KEY (id);


--
-- Name: Remito Remito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remito"
    ADD CONSTRAINT "Remito_pkey" PRIMARY KEY (id);


--
-- Name: ScanEvent ScanEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScanEvent"
    ADD CONSTRAINT "ScanEvent_pkey" PRIMARY KEY (id);


--
-- Name: SeguimientoEntry SeguimientoEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SeguimientoEntry"
    ADD CONSTRAINT "SeguimientoEntry_pkey" PRIMARY KEY (id);


--
-- Name: StockActivationBoundary StockActivationBoundary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockActivationBoundary"
    ADD CONSTRAINT "StockActivationBoundary_pkey" PRIMARY KEY (id);


--
-- Name: StockArticleEligibility StockArticleEligibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticleEligibility"
    ADD CONSTRAINT "StockArticleEligibility_pkey" PRIMARY KEY (id);


--
-- Name: StockArticlePolicyVersion StockArticlePolicyVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticlePolicyVersion"
    ADD CONSTRAINT "StockArticlePolicyVersion_pkey" PRIMARY KEY (id);


--
-- Name: StockCompatibilityReference StockCompatibilityReference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCompatibilityReference"
    ADD CONSTRAINT "StockCompatibilityReference_pkey" PRIMARY KEY (id);


--
-- Name: StockContext StockContext_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockContext"
    ADD CONSTRAINT "StockContext_pkey" PRIMARY KEY (id);


--
-- Name: StockDeposit StockDeposit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockDeposit"
    ADD CONSTRAINT "StockDeposit_pkey" PRIMARY KEY (id);


--
-- Name: StockEvidenceLine StockEvidenceLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidenceLine"
    ADD CONSTRAINT "StockEvidenceLine_pkey" PRIMARY KEY (id);


--
-- Name: StockEvidence StockEvidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidence"
    ADD CONSTRAINT "StockEvidence_pkey" PRIMARY KEY (id);


--
-- Name: StockIdentifiedUnitConfigurationVersion StockIdentifiedUnitConfigurationVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitConfigurationVersion"
    ADD CONSTRAINT "StockIdentifiedUnitConfigurationVersion_pkey" PRIMARY KEY (id);


--
-- Name: StockIdentifiedUnitCurrentConfiguration StockIdentifiedUnitCurrentConfiguration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitCurrentConfiguration"
    ADD CONSTRAINT "StockIdentifiedUnitCurrentConfiguration_pkey" PRIMARY KEY (id);


--
-- Name: StockIdentifiedUnitOccupancy StockIdentifiedUnitOccupancy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitOccupancy"
    ADD CONSTRAINT "StockIdentifiedUnitOccupancy_pkey" PRIMARY KEY (id);


--
-- Name: StockIdentifiedUnit StockIdentifiedUnit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnit"
    ADD CONSTRAINT "StockIdentifiedUnit_pkey" PRIMARY KEY (id);


--
-- Name: StockLotObservation StockLotObservation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotObservation"
    ADD CONSTRAINT "StockLotObservation_pkey" PRIMARY KEY (id);


--
-- Name: StockLotReview StockLotReview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotReview"
    ADD CONSTRAINT "StockLotReview_pkey" PRIMARY KEY (id);


--
-- Name: StockLot StockLot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLot"
    ADD CONSTRAINT "StockLot_pkey" PRIMARY KEY (id);


--
-- Name: StockOpeningPosition StockOpeningPosition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockOpeningPosition"
    ADD CONSTRAINT "StockOpeningPosition_pkey" PRIMARY KEY (id);


--
-- Name: StockPositionProjection StockPositionProjection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockPositionProjection"
    ADD CONSTRAINT "StockPositionProjection_pkey" PRIMARY KEY (id);


--
-- Name: StockPosition StockPosition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockPosition"
    ADD CONSTRAINT "StockPosition_pkey" PRIMARY KEY (id);


--
-- Name: StockReservationEvidence StockReservationEvidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservationEvidence"
    ADD CONSTRAINT "StockReservationEvidence_pkey" PRIMARY KEY (id);


--
-- Name: StockReservationProjection StockReservationProjection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservationProjection"
    ADD CONSTRAINT "StockReservationProjection_pkey" PRIMARY KEY (id);


--
-- Name: StockReservation StockReservation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservation"
    ADD CONSTRAINT "StockReservation_pkey" PRIMARY KEY (id);


--
-- Name: SurgeryContactAssignment SurgeryContactAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryContactAssignment"
    ADD CONSTRAINT "SurgeryContactAssignment_pkey" PRIMARY KEY (id);


--
-- Name: SurgeryDocumentChecklist SurgeryDocumentChecklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryDocumentChecklist"
    ADD CONSTRAINT "SurgeryDocumentChecklist_pkey" PRIMARY KEY (id);


--
-- Name: SurgeryDocumentItem SurgeryDocumentItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryDocumentItem"
    ADD CONSTRAINT "SurgeryDocumentItem_pkey" PRIMARY KEY (id);


--
-- Name: SurgeryPreparationLine SurgeryPreparationLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparationLine"
    ADD CONSTRAINT "SurgeryPreparationLine_pkey" PRIMARY KEY (id);


--
-- Name: SurgeryPreparation SurgeryPreparation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparation"
    ADD CONSTRAINT "SurgeryPreparation_pkey" PRIMARY KEY (id);


--
-- Name: Surgery Surgery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Surgery"
    ADD CONSTRAINT "Surgery_pkey" PRIMARY KEY (id);


--
-- Name: UserCompanyAccess UserCompanyAccess_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserCompanyAccess"
    ADD CONSTRAINT "UserCompanyAccess_pkey" PRIMARY KEY (id);


--
-- Name: UserModuleViewPreference UserModuleViewPreference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserModuleViewPreference"
    ADD CONSTRAINT "UserModuleViewPreference_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VehicleLatestPosition VehicleLatestPosition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VehicleLatestPosition"
    ADD CONSTRAINT "VehicleLatestPosition_pkey" PRIMARY KEY ("vehicleId");


--
-- Name: Vehicle Vehicle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: brand brand_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand
    ADD CONSTRAINT brand_pkey PRIMARY KEY (id);


--
-- Name: cajas_assignment cajas_assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_assignment
    ADD CONSTRAINT cajas_assignment_pkey PRIMARY KEY (id);


--
-- Name: cajas_box_formula cajas_box_formula_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_box_formula
    ADD CONSTRAINT cajas_box_formula_pkey PRIMARY KEY (id);


--
-- Name: cajas_composition_change_line cajas_composition_change_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change_line
    ADD CONSTRAINT cajas_composition_change_line_pkey PRIMARY KEY (id);


--
-- Name: cajas_composition_change cajas_composition_change_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change
    ADD CONSTRAINT cajas_composition_change_pkey PRIMARY KEY (id);


--
-- Name: cajas_condition_projection cajas_condition_projection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_condition_projection
    ADD CONSTRAINT cajas_condition_projection_pkey PRIMARY KEY (id);


--
-- Name: cajas_consumption_confirmation cajas_consumption_confirmation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_confirmation
    ADD CONSTRAINT cajas_consumption_confirmation_pkey PRIMARY KEY (id);


--
-- Name: cajas_consumption_line cajas_consumption_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_line
    ADD CONSTRAINT cajas_consumption_line_pkey PRIMARY KEY (id);


--
-- Name: cajas_control_line cajas_control_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control_line
    ADD CONSTRAINT cajas_control_line_pkey PRIMARY KEY (id);


--
-- Name: cajas_control cajas_control_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control
    ADD CONSTRAINT cajas_control_pkey PRIMARY KEY (id);


--
-- Name: cajas_difference cajas_difference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference
    ADD CONSTRAINT cajas_difference_pkey PRIMARY KEY (id);


--
-- Name: cajas_difference_resolution cajas_difference_resolution_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference_resolution
    ADD CONSTRAINT cajas_difference_resolution_pkey PRIMARY KEY (id);


--
-- Name: cajas_dispatch_accounting cajas_dispatch_accounting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_accounting
    ADD CONSTRAINT cajas_dispatch_accounting_pkey PRIMARY KEY (id);


--
-- Name: cajas_dispatch_line_accounting cajas_dispatch_line_accounting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line_accounting
    ADD CONSTRAINT cajas_dispatch_line_accounting_pkey PRIMARY KEY (id);


--
-- Name: cajas_dispatch_line cajas_dispatch_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line
    ADD CONSTRAINT cajas_dispatch_line_pkey PRIMARY KEY (id);


--
-- Name: cajas_dispatch cajas_dispatch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch
    ADD CONSTRAINT cajas_dispatch_pkey PRIMARY KEY (id);


--
-- Name: cajas_disposition cajas_disposition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT cajas_disposition_pkey PRIMARY KEY (id);


--
-- Name: cajas_formula_line cajas_formula_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_formula_line
    ADD CONSTRAINT cajas_formula_line_pkey PRIMARY KEY (id);


--
-- Name: cajas_formula_version cajas_formula_version_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_formula_version
    ADD CONSTRAINT cajas_formula_version_pkey PRIMARY KEY (id);


--
-- Name: cajas_maintenance_case cajas_maintenance_case_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_maintenance_case
    ADD CONSTRAINT cajas_maintenance_case_pkey PRIMARY KEY (id);


--
-- Name: cajas_maintenance_transition cajas_maintenance_transition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_maintenance_transition
    ADD CONSTRAINT cajas_maintenance_transition_pkey PRIMARY KEY (id);


--
-- Name: cajas_phase_d_action_grant cajas_phase_d_action_grant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_action_grant
    ADD CONSTRAINT cajas_phase_d_action_grant_pkey PRIMARY KEY (id);


--
-- Name: cajas_phase_d_operation cajas_phase_d_operation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_operation
    ADD CONSTRAINT cajas_phase_d_operation_pkey PRIMARY KEY (id);


--
-- Name: cajas_phase_d_reconciliation_event cajas_phase_d_reconciliation_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_reconciliation_event
    ADD CONSTRAINT cajas_phase_d_reconciliation_event_pkey PRIMARY KEY (id);


--
-- Name: cajas_preparation_line cajas_preparation_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_preparation_line
    ADD CONSTRAINT cajas_preparation_line_pkey PRIMARY KEY (id);


--
-- Name: cajas_preparation cajas_preparation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_preparation
    ADD CONSTRAINT cajas_preparation_pkey PRIMARY KEY (id);


--
-- Name: cajas_replacement_pair cajas_replacement_pair_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_replacement_pair
    ADD CONSTRAINT cajas_replacement_pair_pkey PRIMARY KEY (id);


--
-- Name: cajas_reservation_correlation cajas_reservation_correlation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_reservation_correlation
    ADD CONSTRAINT cajas_reservation_correlation_pkey PRIMARY KEY (id);


--
-- Name: cajas_return_confirmation cajas_return_confirmation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_confirmation
    ADD CONSTRAINT cajas_return_confirmation_pkey PRIMARY KEY (id);


--
-- Name: cajas_return_line cajas_return_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_line
    ADD CONSTRAINT cajas_return_line_pkey PRIMARY KEY (id);


--
-- Name: cajas_unit_log_entry cajas_unit_log_entry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_unit_log_entry
    ADD CONSTRAINT cajas_unit_log_entry_pkey PRIMARY KEY (id);


--
-- Name: catalog_alias catalog_alias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_alias
    ADD CONSTRAINT catalog_alias_pkey PRIMARY KEY (id);


--
-- Name: clinical_family clinical_family_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_family
    ADD CONSTRAINT clinical_family_pkey PRIMARY KEY (id);


--
-- Name: consumo_item consumo_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo_item
    ADD CONSTRAINT consumo_item_pkey PRIMARY KEY (id);


--
-- Name: consumo consumo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo
    ADD CONSTRAINT consumo_pkey PRIMARY KEY (id);


--
-- Name: devolucion_item devolucion_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_item
    ADD CONSTRAINT devolucion_item_pkey PRIMARY KEY (id);


--
-- Name: devolucion devolucion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion
    ADD CONSTRAINT devolucion_pkey PRIMARY KEY (id);


--
-- Name: durable_attempt_audit_event durable_attempt_audit_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.durable_attempt_audit_event
    ADD CONSTRAINT durable_attempt_audit_event_pkey PRIMARY KEY (event_id);


--
-- Name: StockActivationBoundary ex_sab_position_window; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockActivationBoundary"
    ADD CONSTRAINT ex_sab_position_window EXCLUDE USING gist ("companyId" WITH =, "positionId" WITH =, tstzrange("cutoffAt", COALESCE("validUntil", 'infinity'::timestamp with time zone), '[)'::text) WITH &&);


--
-- Name: invoice_item invoice_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_item
    ADD CONSTRAINT invoice_item_pkey PRIMARY KEY (id);


--
-- Name: invoice invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_pkey PRIMARY KEY (id);


--
-- Name: manufacturer manufacturer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manufacturer
    ADD CONSTRAINT manufacturer_pkey PRIMARY KEY (id);


--
-- Name: payment_imputation payment_imputation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_imputation
    ADD CONSTRAINT payment_imputation_pkey PRIMARY KEY (id);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);


--
-- Name: PublicVerificationRateBucket pk_public_verification_rate_bucket; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PublicVerificationRateBucket"
    ADD CONSTRAINT pk_public_verification_rate_bucket PRIMARY KEY ("sourceFingerprint", "keyDate");


--
-- Name: RemitoScanLocator pk_remito_scan_locator_locator; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoScanLocator"
    ADD CONSTRAINT pk_remito_scan_locator_locator PRIMARY KEY (locator);


--
-- Name: RemitoVerificationAccess pk_remito_verification_access; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationAccess"
    ADD CONSTRAINT pk_remito_verification_access PRIMARY KEY (id);


--
-- Name: RemitoVerificationDailyMetric pk_remito_verification_daily_metric; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationDailyMetric"
    ADD CONSTRAINT pk_remito_verification_daily_metric PRIMARY KEY (id);


--
-- Name: RemitoVerificationPublication pk_remito_verification_publication; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationPublication"
    ADD CONSTRAINT pk_remito_verification_publication PRIMARY KEY (id);


--
-- Name: presupuesto_family presupuesto_family_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_family
    ADD CONSTRAINT presupuesto_family_pkey PRIMARY KEY (id);


--
-- Name: presupuesto_item presupuesto_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_item
    ADD CONSTRAINT presupuesto_item_pkey PRIMARY KEY (id);


--
-- Name: presupuesto presupuesto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT presupuesto_pkey PRIMARY KEY (id);


--
-- Name: product_category product_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_category
    ADD CONSTRAINT product_category_pkey PRIMARY KEY (id);


--
-- Name: product_line product_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_line
    ADD CONSTRAINT product_line_pkey PRIMARY KEY (id);


--
-- Name: cajas_phase_d_action_grant uq_cpdgrant_company_user_action; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_action_grant
    ADD CONSTRAINT uq_cpdgrant_company_user_action UNIQUE (company_id, user_id, action);


--
-- Name: cajas_phase_d_operation uq_cpdo_company_command; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_operation
    ADD CONSTRAINT uq_cpdo_company_command UNIQUE (company_id, command_key);


--
-- Name: cajas_phase_d_reconciliation_event uq_cpdre_audit; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_reconciliation_event
    ADD CONSTRAINT uq_cpdre_audit UNIQUE (company_id, audit_event_id);


--
-- Name: cajas_phase_d_reconciliation_event uq_cpdre_command; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_reconciliation_event
    ADD CONSTRAINT uq_cpdre_command UNIQUE (company_id, command_acceptance_id);


--
-- Name: cajas_phase_d_reconciliation_event uq_cpdre_company_command; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_reconciliation_event
    ADD CONSTRAINT uq_cpdre_company_command UNIQUE (company_id, command_key);


--
-- Name: GoodsReceipt uq_goods_receipt_company_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceipt"
    ADD CONSTRAINT uq_goods_receipt_company_id UNIQUE ("companyId", id);


--
-- Name: GoodsReceipt uq_goods_receipt_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceipt"
    ADD CONSTRAINT uq_goods_receipt_idempotency UNIQUE ("companyId", "idempotencyKey");


--
-- Name: GoodsReceiptLine uq_goods_receipt_line_company_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceiptLine"
    ADD CONSTRAINT uq_goods_receipt_line_company_id UNIQUE ("companyId", id);


--
-- Name: GoodsReceiptLine uq_goods_receipt_line_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceiptLine"
    ADD CONSTRAINT uq_goods_receipt_line_number UNIQUE ("receiptId", "lineNumber");


--
-- Name: ScanEvent uq_scan_event_company_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScanEvent"
    ADD CONSTRAINT uq_scan_event_company_id UNIQUE ("companyId", id);


--
-- Name: SurgeryPreparation uq_surgery_preparation_company_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparation"
    ADD CONSTRAINT uq_surgery_preparation_company_id UNIQUE ("companyId", id);


--
-- Name: SurgeryPreparation uq_surgery_preparation_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparation"
    ADD CONSTRAINT uq_surgery_preparation_idempotency UNIQUE ("companyId", "idempotencyKey");


--
-- Name: SurgeryPreparationLine uq_surgery_preparation_line_company_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparationLine"
    ADD CONSTRAINT uq_surgery_preparation_line_company_id UNIQUE ("companyId", id);


--
-- Name: SurgeryPreparationLine uq_surgery_preparation_line_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparationLine"
    ADD CONSTRAINT uq_surgery_preparation_line_number UNIQUE ("preparationId", "lineNumber");


--
-- Name: SurgeryPreparation uq_surgery_preparation_surgery; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparation"
    ADD CONSTRAINT uq_surgery_preparation_surgery UNIQUE ("companyId", "surgeryId");


--
-- Name: xadmin_article_mapping xadmin_article_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_mapping
    ADD CONSTRAINT xadmin_article_mapping_pkey PRIMARY KEY (id);


--
-- Name: xadmin_article_stage_row xadmin_article_stage_row_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_stage_row
    ADD CONSTRAINT xadmin_article_stage_row_pkey PRIMARY KEY (id);


--
-- Name: xadmin_import_run xadmin_import_run_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_import_run
    ADD CONSTRAINT xadmin_import_run_pkey PRIMARY KEY (id);


--
-- Name: AuditEvent_companyId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditEvent_companyId_createdAt_idx" ON public."AuditEvent" USING btree ("companyId", "createdAt");


--
-- Name: AuditEvent_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditEvent_entityType_entityId_idx" ON public."AuditEvent" USING btree ("entityType", "entityId");


--
-- Name: AuditEvent_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditEvent_userId_createdAt_idx" ON public."AuditEvent" USING btree ("userId", "createdAt");


--
-- Name: ContactCompanyLink_contactId_companyId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ContactCompanyLink_contactId_companyId_key" ON public."ContactCompanyLink" USING btree ("contactId", "companyId");


--
-- Name: ContactGroupMembership_groupId_contactId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ContactGroupMembership_groupId_contactId_key" ON public."ContactGroupMembership" USING btree ("groupId", "contactId");


--
-- Name: DigitalReceiptAccess_receiptId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptAccess_receiptId_status_idx" ON public."DigitalReceiptAccess" USING btree ("receiptId", status);


--
-- Name: DigitalReceiptAccess_receiptId_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DigitalReceiptAccess_receiptId_version_key" ON public."DigitalReceiptAccess" USING btree ("receiptId", version);


--
-- Name: DigitalReceiptAccess_status_issuedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptAccess_status_issuedAt_idx" ON public."DigitalReceiptAccess" USING btree (status, "issuedAt");


--
-- Name: DigitalReceiptAccess_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DigitalReceiptAccess_tokenHash_key" ON public."DigitalReceiptAccess" USING btree ("tokenHash");


--
-- Name: DigitalReceiptArtifact_accessId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptArtifact_accessId_idx" ON public."DigitalReceiptArtifact" USING btree ("accessId");


--
-- Name: DigitalReceiptArtifact_receiptId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptArtifact_receiptId_createdAt_idx" ON public."DigitalReceiptArtifact" USING btree ("receiptId", "createdAt");


--
-- Name: DigitalReceiptArtifact_snapshotId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptArtifact_snapshotId_idx" ON public."DigitalReceiptArtifact" USING btree ("snapshotId");


--
-- Name: DigitalReceiptArtifact_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptArtifact_type_idx" ON public."DigitalReceiptArtifact" USING btree (type);


--
-- Name: DigitalReceiptEvent_accessId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptEvent_accessId_idx" ON public."DigitalReceiptEvent" USING btree ("accessId");


--
-- Name: DigitalReceiptEvent_artifactId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptEvent_artifactId_idx" ON public."DigitalReceiptEvent" USING btree ("artifactId");


--
-- Name: DigitalReceiptEvent_receiptId_happenedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptEvent_receiptId_happenedAt_idx" ON public."DigitalReceiptEvent" USING btree ("receiptId", "happenedAt");


--
-- Name: DigitalReceiptEvent_snapshotId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptEvent_snapshotId_idx" ON public."DigitalReceiptEvent" USING btree ("snapshotId");


--
-- Name: DigitalReceiptEvent_type_happenedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptEvent_type_happenedAt_idx" ON public."DigitalReceiptEvent" USING btree (type, "happenedAt");


--
-- Name: DigitalReceiptSnapshot_receiptId_capturedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceiptSnapshot_receiptId_capturedAt_idx" ON public."DigitalReceiptSnapshot" USING btree ("receiptId", "capturedAt");


--
-- Name: DigitalReceiptSnapshot_receiptId_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DigitalReceiptSnapshot_receiptId_version_key" ON public."DigitalReceiptSnapshot" USING btree ("receiptId", version);


--
-- Name: DigitalReceipt_activeAccessId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DigitalReceipt_activeAccessId_key" ON public."DigitalReceipt" USING btree ("activeAccessId");


--
-- Name: DigitalReceipt_companyId_receiptNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DigitalReceipt_companyId_receiptNumber_key" ON public."DigitalReceipt" USING btree ("companyId", "receiptNumber");


--
-- Name: DigitalReceipt_companyId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceipt_companyId_status_idx" ON public."DigitalReceipt" USING btree ("companyId", status);


--
-- Name: DigitalReceipt_companyId_surgeryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceipt_companyId_surgeryId_idx" ON public."DigitalReceipt" USING btree ("companyId", "surgeryId");


--
-- Name: DigitalReceipt_latestSnapshotId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DigitalReceipt_latestSnapshotId_key" ON public."DigitalReceipt" USING btree ("latestSnapshotId");


--
-- Name: DigitalReceipt_surgeryId_issuedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DigitalReceipt_surgeryId_issuedAt_idx" ON public."DigitalReceipt" USING btree ("surgeryId", "issuedAt");


--
-- Name: InternalNotification_companyId_eventKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InternalNotification_companyId_eventKey_key" ON public."InternalNotification" USING btree ("companyId", "eventKey");


--
-- Name: InternalNotification_companyId_recipientUserId_readAt_creat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InternalNotification_companyId_recipientUserId_readAt_creat_idx" ON public."InternalNotification" USING btree ("companyId", "recipientUserId", "readAt", "createdAt");


--
-- Name: InternalNotification_recipientUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InternalNotification_recipientUserId_createdAt_idx" ON public."InternalNotification" USING btree ("recipientUserId", "createdAt");


--
-- Name: InternalNotification_sourceEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InternalNotification_sourceEntityId_idx" ON public."InternalNotification" USING btree ("sourceEntityId");


--
-- Name: InternalNotification_surgeryId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InternalNotification_surgeryId_createdAt_idx" ON public."InternalNotification" USING btree ("surgeryId", "createdAt");


--
-- Name: Organization_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Organization_slug_key" ON public."Organization" USING btree (slug);


--
-- Name: RemitoItem_expirationDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RemitoItem_expirationDate_idx" ON public."RemitoItem" USING btree ("expirationDate");


--
-- Name: RemitoItem_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RemitoItem_itemId_idx" ON public."RemitoItem" USING btree ("itemId");


--
-- Name: RemitoItem_lotNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RemitoItem_lotNumber_idx" ON public."RemitoItem" USING btree ("lotNumber");


--
-- Name: RemitoItem_presupuestoItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RemitoItem_presupuestoItemId_idx" ON public."RemitoItem" USING btree ("presupuestoItemId");


--
-- Name: RemitoItem_remitoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RemitoItem_remitoId_idx" ON public."RemitoItem" USING btree ("remitoId");


--
-- Name: Remito_companyId_branchId_documentType_visibleNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Remito_companyId_branchId_documentType_visibleNumber_key" ON public."Remito" USING btree ("companyId", "branchId", "documentType", "visibleNumber");


--
-- Name: Remito_companyId_branchId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Remito_companyId_branchId_state_idx" ON public."Remito" USING btree ("companyId", "branchId", state);


--
-- Name: Remito_companyId_issuedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Remito_companyId_issuedAt_idx" ON public."Remito" USING btree ("companyId", "issuedAt");


--
-- Name: Remito_companyId_origin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Remito_companyId_origin_idx" ON public."Remito" USING btree ("companyId", origin);


--
-- Name: Remito_companyId_salidaReason_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Remito_companyId_salidaReason_idx" ON public."Remito" USING btree ("companyId", "salidaReason");


--
-- Name: Remito_companyId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Remito_companyId_state_idx" ON public."Remito" USING btree ("companyId", state);


--
-- Name: Remito_companyId_surgeryId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Remito_companyId_surgeryId_state_idx" ON public."Remito" USING btree ("companyId", "surgeryId", state);


--
-- Name: Remito_surgeryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Remito_surgeryId_idx" ON public."Remito" USING btree ("surgeryId");


--
-- Name: ScanEvent_articleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ScanEvent_articleId_idx" ON public."ScanEvent" USING btree ("articleId");


--
-- Name: ScanEvent_companyId_receiptId_resolutionStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ScanEvent_companyId_receiptId_resolutionStatus_idx" ON public."ScanEvent" USING btree ("companyId", "receiptId", "resolutionStatus");


--
-- Name: SeguimientoEntry_companyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SeguimientoEntry_companyId_idx" ON public."SeguimientoEntry" USING btree ("companyId");


--
-- Name: SeguimientoEntry_entryType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SeguimientoEntry_entryType_idx" ON public."SeguimientoEntry" USING btree ("entryType");


--
-- Name: SeguimientoEntry_surgeryId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SeguimientoEntry_surgeryId_createdAt_idx" ON public."SeguimientoEntry" USING btree ("surgeryId", "createdAt");


--
-- Name: SurgeryContactAssignment_contactId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SurgeryContactAssignment_contactId_idx" ON public."SurgeryContactAssignment" USING btree ("contactId");


--
-- Name: SurgeryContactAssignment_surgeryId_contactId_role_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SurgeryContactAssignment_surgeryId_contactId_role_key" ON public."SurgeryContactAssignment" USING btree ("surgeryId", "contactId", role);


--
-- Name: SurgeryContactAssignment_surgeryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SurgeryContactAssignment_surgeryId_idx" ON public."SurgeryContactAssignment" USING btree ("surgeryId");


--
-- Name: Surgery_companyId_archivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Surgery_companyId_archivedAt_idx" ON public."Surgery" USING btree ("companyId", "archivedAt");


--
-- Name: Surgery_companyId_visibleNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Surgery_companyId_visibleNumber_key" ON public."Surgery" USING btree ("companyId", "visibleNumber");


--
-- Name: UserCompanyAccess_userId_companyId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserCompanyAccess_userId_companyId_key" ON public."UserCompanyAccess" USING btree ("userId", "companyId");


--
-- Name: UserModuleViewPreference_companyId_moduleKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserModuleViewPreference_companyId_moduleKey_idx" ON public."UserModuleViewPreference" USING btree ("companyId", "moduleKey");


--
-- Name: UserModuleViewPreference_companyId_userId_moduleKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserModuleViewPreference_companyId_userId_moduleKey_key" ON public."UserModuleViewPreference" USING btree ("companyId", "userId", "moduleKey");


--
-- Name: UserModuleViewPreference_userId_moduleKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserModuleViewPreference_userId_moduleKey_idx" ON public."UserModuleViewPreference" USING btree ("userId", "moduleKey");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_supabaseAuthId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_supabaseAuthId_key" ON public."User" USING btree ("supabaseAuthId");


--
-- Name: availability_request_assignment_episode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX availability_request_assignment_episode ON public."AvailabilityRequestRecipientAssignment" USING btree ("availabilityRequestId", reason, "userId", "assignedAt");


--
-- Name: availability_request_one_active_reason; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX availability_request_one_active_reason ON public."AvailabilityRequestRecipientAssignment" USING btree ("availabilityRequestId", reason) WHERE ("revokedAt" IS NULL);


--
-- Name: availability_request_one_open_per_surgery; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX availability_request_one_open_per_surgery ON public."AvailabilityRequest" USING btree ("companyId", "surgeryId") WHERE (status = 'OPEN'::public."AvailabilityRequestStatus");


--
-- Name: consumo_companyId_remitoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "consumo_companyId_remitoId_idx" ON public.consumo USING btree ("companyId", "remitoId");


--
-- Name: consumo_companyId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "consumo_companyId_state_idx" ON public.consumo USING btree ("companyId", state);


--
-- Name: consumo_companyId_surgeryId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "consumo_companyId_surgeryId_state_idx" ON public.consumo USING btree ("companyId", "surgeryId", state);


--
-- Name: consumo_companyId_visibleNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "consumo_companyId_visibleNumber_key" ON public.consumo USING btree ("companyId", "visibleNumber");


--
-- Name: consumo_item_consumoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "consumo_item_consumoId_idx" ON public.consumo_item USING btree ("consumoId");


--
-- Name: consumo_item_expirationDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "consumo_item_expirationDate_idx" ON public.consumo_item USING btree ("expirationDate");


--
-- Name: consumo_item_lotNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "consumo_item_lotNumber_idx" ON public.consumo_item USING btree ("lotNumber");


--
-- Name: consumo_item_remitoItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "consumo_item_remitoItemId_idx" ON public.consumo_item USING btree ("remitoItemId");


--
-- Name: devolucion_companyId_consumoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devolucion_companyId_consumoId_idx" ON public.devolucion USING btree ("companyId", "consumoId");


--
-- Name: devolucion_companyId_remitoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devolucion_companyId_remitoId_idx" ON public.devolucion USING btree ("companyId", "remitoId");


--
-- Name: devolucion_companyId_surgeryId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devolucion_companyId_surgeryId_state_idx" ON public.devolucion USING btree ("companyId", "surgeryId", state);


--
-- Name: devolucion_companyId_visibleNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "devolucion_companyId_visibleNumber_key" ON public.devolucion USING btree ("companyId", "visibleNumber");


--
-- Name: devolucion_item_consumoItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devolucion_item_consumoItemId_idx" ON public.devolucion_item USING btree ("consumoItemId");


--
-- Name: devolucion_item_devolucionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devolucion_item_devolucionId_idx" ON public.devolucion_item USING btree ("devolucionId");


--
-- Name: devolucion_item_expirationDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devolucion_item_expirationDate_idx" ON public.devolucion_item USING btree ("expirationDate");


--
-- Name: devolucion_item_lotNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devolucion_item_lotNumber_idx" ON public.devolucion_item USING btree ("lotNumber");


--
-- Name: devolucion_item_remitoItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "devolucion_item_remitoItemId_idx" ON public.devolucion_item USING btree ("remitoItemId");


--
-- Name: invoice_companyId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoice_companyId_state_idx" ON public.invoice USING btree ("companyId", state);


--
-- Name: invoice_companyId_surgeryId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoice_companyId_surgeryId_state_idx" ON public.invoice USING btree ("companyId", "surgeryId", state);


--
-- Name: invoice_companyId_visibleNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "invoice_companyId_visibleNumber_key" ON public.invoice USING btree ("companyId", "visibleNumber");


--
-- Name: invoice_consumoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoice_consumoId_idx" ON public.invoice USING btree ("consumoId");


--
-- Name: invoice_item_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoice_item_invoiceId_idx" ON public.invoice_item USING btree ("invoiceId");


--
-- Name: invoice_item_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_item_sku_idx ON public.invoice_item USING btree (sku);


--
-- Name: invoice_item_sourceType_sourceItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoice_item_sourceType_sourceItemId_idx" ON public.invoice_item USING btree ("sourceType", "sourceItemId");


--
-- Name: invoice_presupuestoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "invoice_presupuestoId_idx" ON public.invoice USING btree ("presupuestoId");


--
-- Name: ix_article_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_article_brand ON public."Article" USING btree ("organizationId", brand_id);


--
-- Name: ix_article_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_article_category ON public."Article" USING btree ("organizationId", category_id);


--
-- Name: ix_article_clinical_family; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_article_clinical_family ON public."Article" USING btree ("organizationId", clinical_family_id);


--
-- Name: ix_article_identifier_resolution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_article_identifier_resolution ON public."ArticleIdentifier" USING btree ("organizationId", type, "normalizedValue", "isActive");


--
-- Name: ix_article_identifier_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_article_identifier_search ON public."ArticleIdentifier" USING btree ("organizationId", "normalizedValue", "isActive");


--
-- Name: ix_article_manufacturer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_article_manufacturer ON public."Article" USING btree ("organizationId", manufacturer_id);


--
-- Name: ix_article_product_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_article_product_line ON public."Article" USING btree ("organizationId", product_line_id);


--
-- Name: ix_article_supplier_mapping_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_article_supplier_mapping_search ON public."ArticleSupplierMapping" USING btree ("organizationId", "normalizedCode", "isActive");


--
-- Name: ix_article_trace_policy_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_article_trace_policy_article ON public."ArticleTraceabilityPolicy" USING btree ("organizationId", "articleId", "effectiveAt");


--
-- Name: ix_availability_assignment_company_user_revoked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_availability_assignment_company_user_revoked ON public."AvailabilityRequestRecipientAssignment" USING btree ("companyId", "userId", "revokedAt");


--
-- Name: ix_availability_assignment_request_reason_revoked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_availability_assignment_request_reason_revoked ON public."AvailabilityRequestRecipientAssignment" USING btree ("availabilityRequestId", reason, "revokedAt");


--
-- Name: ix_availability_capability_grant_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_availability_capability_grant_lookup ON public."AvailabilityCapabilityGrant" USING btree ("companyId", capability, "isActive");


--
-- Name: ix_availability_capability_grant_user_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_availability_capability_grant_user_company ON public."AvailabilityCapabilityGrant" USING btree ("userId", "companyId");


--
-- Name: ix_availability_command_company_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_availability_command_company_request ON public."AvailabilityCommand" USING btree ("companyId", "requestId");


--
-- Name: ix_availability_command_company_surgery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_availability_command_company_surgery ON public."AvailabilityCommand" USING btree ("companyId", "surgeryId");


--
-- Name: ix_availability_request_company_requester_requested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_availability_request_company_requester_requested ON public."AvailabilityRequest" USING btree ("companyId", "requesterUserId", "requestedAt");


--
-- Name: ix_availability_request_company_status_requested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_availability_request_company_status_requested ON public."AvailabilityRequest" USING btree ("companyId", status, "requestedAt");


--
-- Name: ix_availability_request_company_surgery_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_availability_request_company_surgery_status ON public."AvailabilityRequest" USING btree ("companyId", "surgeryId", status);


--
-- Name: ix_brand_name_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_brand_name_active ON public.brand USING btree (organization_id, normalized_name, is_active);


--
-- Name: ix_ca_company_surgery_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ca_company_surgery_active ON public.cajas_assignment USING btree (company_id, surgery_id, active_slot);


--
-- Name: ix_catalog_alias_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_catalog_alias_lookup ON public.catalog_alias USING btree (organization_id, kind, normalized_alias, is_active);


--
-- Name: ix_cbf_company_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cbf_company_updated ON public.cajas_box_formula USING btree (company_id, updated_at);


--
-- Name: ix_ccc_corrects; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ccc_corrects ON public.cajas_consumption_confirmation USING btree (corrects_confirmation_id);


--
-- Name: ix_ccc_dispatch_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ccc_dispatch_time ON public.cajas_consumption_confirmation USING btree (company_id, dispatch_id, accepted_at);


--
-- Name: ix_ccc_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ccc_source ON public.cajas_consumption_confirmation USING btree (consumo_id);


--
-- Name: ix_ccl_company_article_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ccl_company_article_position ON public.cajas_control_line USING btree (company_id, article_id, stock_position_id);


--
-- Name: ix_ccln_company_article_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ccln_company_article_position ON public.cajas_consumption_line USING btree (company_id, article_id, stock_position_id);


--
-- Name: ix_ccln_company_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ccln_company_dispatch ON public.cajas_consumption_line USING btree (company_id, dispatch_id, dispatch_line_id);


--
-- Name: ix_ccln_source_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ccln_source_item ON public.cajas_consumption_line USING btree (company_id, consumo_id, consumo_item_id);


--
-- Name: ix_ccp_company_condition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ccp_company_condition ON public.cajas_condition_projection USING btree (company_id, condition);


--
-- Name: ix_ccp_company_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ccp_company_dispatch ON public.cajas_condition_projection USING btree (company_id, dispatch_eligible);


--
-- Name: ix_ccp_company_reuse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ccp_company_reuse ON public.cajas_condition_projection USING btree (company_id, reuse_eligible);


--
-- Name: ix_cd_assignment_opened; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_assignment_opened ON public.cajas_difference USING btree (company_id, assignment_id, opened_at);


--
-- Name: ix_cda_company_watermark; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cda_company_watermark ON public.cajas_dispatch_accounting USING btree (company_id, evidence_watermark);


--
-- Name: ix_cdis_command; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cdis_command ON public.cajas_disposition USING btree (command_acceptance_id);


--
-- Name: ix_cdis_company_article_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cdis_company_article_position ON public.cajas_disposition USING btree (company_id, article_id, stock_position_id);


--
-- Name: ix_cdis_consumption_confirmation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cdis_consumption_confirmation ON public.cajas_disposition USING btree (consumption_confirmation_id);


--
-- Name: ix_cdis_consumption_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cdis_consumption_line ON public.cajas_disposition USING btree (consumption_line_id);


--
-- Name: ix_cdis_dispatch_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cdis_dispatch_time ON public.cajas_disposition USING btree (company_id, dispatch_line_id, accepted_at);


--
-- Name: ix_cdis_return_confirmation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cdis_return_confirmation ON public.cajas_disposition USING btree (return_confirmation_id);


--
-- Name: ix_cdis_return_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cdis_return_line ON public.cajas_disposition USING btree (return_line_id);


--
-- Name: ix_cdis_stock_evidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cdis_stock_evidence ON public.cajas_disposition USING btree (stock_evidence_line_id);


--
-- Name: ix_cdla_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cdla_pending ON public.cajas_dispatch_line_accounting USING btree (company_id, accounting_id, pending_quantity);


--
-- Name: ix_cdp_remito_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cdp_remito_kind ON public.cajas_dispatch USING btree (company_id, remito_id, record_kind);


--
-- Name: ix_cfl_company_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cfl_company_article ON public.cajas_formula_line USING btree (company_id, article_id);


--
-- Name: ix_cfv_company_accepted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cfv_company_accepted ON public.cajas_formula_version USING btree (company_id, accepted_at);


--
-- Name: ix_clinical_family_name_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_clinical_family_name_active ON public.clinical_family USING btree (organization_id, normalized_name, is_active);


--
-- Name: ix_cmc_unit_status_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cmc_unit_status_updated ON public.cajas_maintenance_case USING btree (company_id, box_identified_unit_id, status, updated_at);


--
-- Name: ix_cmt_case_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cmt_case_time ON public.cajas_maintenance_transition USING btree (company_id, case_id, accepted_at);


--
-- Name: ix_company_operational_assignee_user_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_company_operational_assignee_user_company ON public."CompanyOperationalAssignee" USING btree ("userId", "companyId");


--
-- Name: ix_consumo_item_company_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_consumo_item_company_owner ON public.consumo_item USING btree (company_id, "consumoId");


--
-- Name: ix_contact_address_geo_validation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_contact_address_geo_validation ON public."ContactAddress" USING btree ("validationStatus");


--
-- Name: ix_contact_address_georef_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_contact_address_georef_id ON public."ContactAddress" USING btree ("georefId");


--
-- Name: ix_contact_address_main; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_contact_address_main ON public."ContactAddress" USING btree ("companyId", "contactId", "isMain");


--
-- Name: ix_contact_company_active_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_contact_company_active_created ON public."ContactCompanyLink" USING btree ("companyId", "isActive", "createdAt");


--
-- Name: ix_cp_company_recontrol_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cp_company_recontrol_updated ON public.cajas_preparation USING btree (company_id, requires_recontrol, updated_at);


--
-- Name: ix_cpdo_dispatch_line_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cpdo_dispatch_line_kind ON public.cajas_phase_d_operation USING btree (company_id, dispatch_line_id, kind);


--
-- Name: ix_cpdo_dispatch_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cpdo_dispatch_time ON public.cajas_phase_d_operation USING btree (company_id, dispatch_id, accepted_at);


--
-- Name: ix_cpdre_dispatch_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cpdre_dispatch_time ON public.cajas_phase_d_reconciliation_event USING btree (company_id, dispatch_id, accepted_at);


--
-- Name: ix_cpl_company_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cpl_company_active ON public.cajas_preparation_line USING btree (company_id, preparation_id, is_active);


--
-- Name: ix_cpl_company_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cpl_company_position ON public.cajas_preparation_line USING btree (company_id, stock_position_id);


--
-- Name: ix_crc_assignment_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_crc_assignment_time ON public.cajas_reservation_correlation USING btree (company_id, assignment_id, created_at);


--
-- Name: ix_crcfn_corrects; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_crcfn_corrects ON public.cajas_return_confirmation USING btree (corrects_confirmation_id);


--
-- Name: ix_crcfn_dispatch_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_crcfn_dispatch_time ON public.cajas_return_confirmation USING btree (company_id, dispatch_id, accepted_at);


--
-- Name: ix_crcfn_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_crcfn_source ON public.cajas_return_confirmation USING btree (devolucion_id);


--
-- Name: ix_crl_company_article_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_crl_company_article_position ON public.cajas_return_line USING btree (company_id, article_id, stock_position_id);


--
-- Name: ix_crl_company_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_crl_company_dispatch ON public.cajas_return_line USING btree (company_id, dispatch_id, dispatch_line_id);


--
-- Name: ix_crl_source_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_crl_source_item ON public.cajas_return_line USING btree (company_id, devolucion_id, devolucion_item_id);


--
-- Name: ix_crp_original_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_crp_original_line ON public.cajas_replacement_pair USING btree (company_id, dispatch_id, original_dispatch_line_id);


--
-- Name: ix_crp_received_article_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_crp_received_article_position ON public.cajas_replacement_pair USING btree (company_id, received_article_id, received_stock_position_id);


--
-- Name: ix_crp_return_lineage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_crp_return_lineage ON public.cajas_replacement_pair USING btree (company_id, return_confirmation_id, dispatch_id, return_line_id);


--
-- Name: ix_cule_assignment_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cule_assignment_time ON public.cajas_unit_log_entry USING btree (company_id, assignment_id, occurred_at);


--
-- Name: ix_cule_unit_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cule_unit_time ON public.cajas_unit_log_entry USING btree (company_id, box_identified_unit_id, occurred_at);


--
-- Name: ix_daae_company_semantic_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_daae_company_semantic_time ON public.durable_attempt_audit_event USING btree (company_id, bundle_semantic_key_sha256, occurred_at);


--
-- Name: ix_daae_kind_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_daae_kind_time ON public.durable_attempt_audit_event USING btree (event_kind, occurred_at);


--
-- Name: ix_daae_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_daae_occurred_at ON public.durable_attempt_audit_event USING btree (occurred_at);


--
-- Name: ix_devolucion_item_company_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_devolucion_item_company_owner ON public.devolucion_item USING btree (company_id, "devolucionId");


--
-- Name: ix_goods_receipt_company_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_goods_receipt_company_status ON public."GoodsReceipt" USING btree ("companyId", status, "createdAt");


--
-- Name: ix_goods_receipt_line_expected_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_goods_receipt_line_expected_code ON public."GoodsReceiptLine" USING btree ("companyId", "expectedCode");


--
-- Name: ix_internal_notification_company_availability_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_internal_notification_company_availability_request ON public."InternalNotification" USING btree ("companyId", "availabilityRequestId", "createdAt");


--
-- Name: ix_manufacturer_name_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_manufacturer_name_active ON public.manufacturer USING btree (organization_id, normalized_name, is_active);


--
-- Name: ix_oca_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oca_intent ON public."OperationalCommandAcceptance" USING btree ("companyId", "intentHash");


--
-- Name: ix_oca_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oca_result ON public."OperationalCommandAcceptance" USING btree ("companyId", "resultEntityType", "resultEntityId");


--
-- Name: ix_ocat_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ocat_expires ON public."OperationalCommandAttempt" USING btree ("expiresAt");


--
-- Name: ix_ocat_intent_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ocat_intent_time ON public."OperationalCommandAttempt" USING btree ("companyId", "intentHash", "attemptedAt");


--
-- Name: ix_oce_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oce_result ON public."OperationalCommandEffect" USING btree ("companyId", "resultEntityType", "resultEntityId");


--
-- Name: ix_pr_result_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pr_result_time ON public."ProjectionReconciliation" USING btree ("companyId", result, "comparedAt");


--
-- Name: ix_pr_scope_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pr_scope_time ON public."ProjectionReconciliation" USING btree ("companyId", kind, "scopeId", "comparedAt");


--
-- Name: ix_presupuesto_company_family_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_presupuesto_company_family_slot ON public.presupuesto USING btree ("companyId", "familyId", slot);


--
-- Name: ix_presupuesto_family_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_presupuesto_family_company ON public.presupuesto_family USING btree ("companyId");


--
-- Name: ix_presupuesto_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_presupuesto_source ON public.presupuesto USING btree ("sourcePresupuestoId");


--
-- Name: ix_product_category_name_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_category_name_active ON public.product_category USING btree (organization_id, normalized_name, is_active);


--
-- Name: ix_product_category_parent_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_category_parent_active ON public.product_category USING btree (organization_id, parent_id, is_active);


--
-- Name: ix_product_line_name_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_line_name_active ON public.product_line USING btree (organization_id, normalized_name, is_active);


--
-- Name: ix_public_rate_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_public_rate_blocked ON public."PublicVerificationRateBucket" USING btree ("blockedUntil");


--
-- Name: ix_public_rate_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_public_rate_expiry ON public."PublicVerificationRateBucket" USING btree ("expiresAt");


--
-- Name: ix_remito_access_issued; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_remito_access_issued ON public."RemitoVerificationAccess" USING btree ("companyId", "issuedAt");


--
-- Name: ix_remito_access_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_remito_access_status ON public."RemitoVerificationAccess" USING btree ("companyId", "publicationId", status);


--
-- Name: ix_remito_item_company_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_remito_item_company_owner ON public."RemitoItem" USING btree (company_id, "remitoId");


--
-- Name: ix_remito_metric_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_remito_metric_day ON public."RemitoVerificationDailyMetric" USING btree (day);


--
-- Name: ix_remito_publication_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_remito_publication_published ON public."RemitoVerificationPublication" USING btree ("companyId", "publishedAt");


--
-- Name: ix_remito_publication_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_remito_publication_status ON public."RemitoVerificationPublication" USING btree ("companyId", "remitoId", status);


--
-- Name: ix_remito_scan_locator_company_issued; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_remito_scan_locator_company_issued ON public."RemitoScanLocator" USING btree ("companyId", "issuedAt");


--
-- Name: ix_sae_company_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sae_company_updated ON public."StockArticleEligibility" USING btree ("companyId", "updatedAt");


--
-- Name: ix_sapv_company_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sapv_company_effective ON public."StockArticlePolicyVersion" USING btree ("companyId", "effectiveAt");


--
-- Name: ix_sc_company_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sc_company_kind ON public."StockContext" USING btree ("companyId", kind);


--
-- Name: ix_sc_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sc_source ON public."StockContext" USING btree ("companyId", "sourceDomain", "sourceEntityId");


--
-- Name: ix_scan_event_company_receipt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_scan_event_company_receipt ON public."ScanEvent" USING btree ("companyId", "receiptId", "createdAt");


--
-- Name: ix_scr_company_disposition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_scr_company_disposition ON public."StockCompatibilityReference" USING btree ("companyId", disposition);


--
-- Name: ix_sd_company_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sd_company_active ON public."StockDeposit" USING btree ("companyId", active);


--
-- Name: ix_sdc_company_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sdc_company_updated_at ON public."SurgeryDocumentChecklist" USING btree ("companyId", "updatedAt");


--
-- Name: ix_sdi_company_checklist_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sdi_company_checklist_order ON public."SurgeryDocumentItem" USING btree ("companyId", "checklistId", "sortOrder");


--
-- Name: ix_se_company_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_se_company_time ON public."StockEvidence" USING btree ("companyId", "acceptedAt");


--
-- Name: ix_se_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_se_source ON public."StockEvidence" USING btree ("companyId", "sourceDomain", "sourceEntityType", "sourceEntityId", "sourceCheckpoint");


--
-- Name: ix_sel_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sel_article ON public."StockEvidenceLine" USING btree ("companyId", "articleId");


--
-- Name: ix_sel_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sel_from ON public."StockEvidenceLine" USING btree ("companyId", "fromPositionId");


--
-- Name: ix_sel_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sel_to ON public."StockEvidenceLine" USING btree ("companyId", "toPositionId");


--
-- Name: ix_sp_company_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sp_company_context ON public."StockPosition" USING btree ("companyId", "contextId", "articleId");


--
-- Name: ix_spp_company_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_spp_company_available ON public."StockPositionProjection" USING btree ("companyId", "availableQuantity");


--
-- Name: ix_sr_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sr_position ON public."StockReservation" USING btree ("companyId", "positionId");


--
-- Name: ix_sr_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sr_unit ON public."StockReservation" USING btree ("companyId", "identifiedUnitId");


--
-- Name: ix_sre_company_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sre_company_time ON public."StockReservationEvidence" USING btree ("companyId", "acceptedAt");


--
-- Name: ix_srp_company_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_srp_company_status ON public."StockReservationProjection" USING btree ("companyId", status);


--
-- Name: ix_stock_reservation_preparation_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_reservation_preparation_line ON public."StockReservation" USING btree ("companyId", "preparationLineId");


--
-- Name: ix_surgery_company_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_surgery_company_created_by ON public."Surgery" USING btree ("companyId", "createdById");


--
-- Name: ix_surgery_company_material_availability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_surgery_company_material_availability ON public."Surgery" USING btree ("companyId", "materialAvailabilityDate");


--
-- Name: ix_surgery_preparation_company_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_surgery_preparation_company_status ON public."SurgeryPreparation" USING btree ("companyId", status, "updatedAt");


--
-- Name: ix_vehicle_company_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vehicle_company_provider ON public."Vehicle" USING btree ("companyId", provider);


--
-- Name: ix_vehicle_latest_position_company_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vehicle_latest_position_company_recorded ON public."VehicleLatestPosition" USING btree ("companyId", "recordedAt");


--
-- Name: ix_xadmin_import_run_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_xadmin_import_run_status ON public.xadmin_import_run USING btree (organization_id, status, created_at);


--
-- Name: ix_xadmin_mapping_decided_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_xadmin_mapping_decided_by ON public.xadmin_article_mapping USING btree (decided_by_id);


--
-- Name: ix_xadmin_mapping_status_axis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_xadmin_mapping_status_axis ON public.xadmin_article_mapping USING btree (organization_id, status, axis);


--
-- Name: ix_xadmin_stage_row_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_xadmin_stage_row_number ON public.xadmin_article_stage_row USING btree (organization_id, run_id, source_row_number);


--
-- Name: payment_companyId_receivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_companyId_receivedAt_idx" ON public.payment USING btree ("companyId", "receivedAt");


--
-- Name: payment_companyId_surgeryId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_companyId_surgeryId_state_idx" ON public.payment USING btree ("companyId", "surgeryId", state);


--
-- Name: payment_companyId_visibleNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_companyId_visibleNumber_key" ON public.payment USING btree ("companyId", "visibleNumber");


--
-- Name: payment_imputation_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payment_imputation_invoiceId_idx" ON public.payment_imputation USING btree ("invoiceId");


--
-- Name: payment_imputation_paymentId_invoiceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payment_imputation_paymentId_invoiceId_key" ON public.payment_imputation USING btree ("paymentId", "invoiceId");


--
-- Name: presupuesto_companyId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "presupuesto_companyId_state_idx" ON public.presupuesto USING btree ("companyId", state);


--
-- Name: presupuesto_companyId_surgeryId_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "presupuesto_companyId_surgeryId_state_idx" ON public.presupuesto USING btree ("companyId", "surgeryId", state);


--
-- Name: presupuesto_companyId_visibleNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "presupuesto_companyId_visibleNumber_key" ON public.presupuesto USING btree ("companyId", "visibleNumber");


--
-- Name: presupuesto_item_presupuestoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "presupuesto_item_presupuestoId_idx" ON public.presupuesto_item USING btree ("presupuestoId");


--
-- Name: presupuesto_item_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX presupuesto_item_sku_idx ON public.presupuesto_item USING btree (sku);


--
-- Name: presupuesto_parentPresupuestoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "presupuesto_parentPresupuestoId_idx" ON public.presupuesto USING btree ("parentPresupuestoId");


--
-- Name: uq_article_identifier_scope_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_article_identifier_scope_active ON public."ArticleIdentifier" USING btree ("organizationId", type, "normalizedValue", "scopeKey") WHERE ("isActive" = true);


--
-- Name: uq_article_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_article_org_id ON public."Article" USING btree ("organizationId", id);


--
-- Name: uq_article_org_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_article_org_sku ON public."Article" USING btree ("organizationId", sku);


--
-- Name: uq_article_supplier_mapping_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_article_supplier_mapping_active ON public."ArticleSupplierMapping" USING btree ("organizationId", "supplierId", "normalizedCode") WHERE ("isActive" = true);


--
-- Name: uq_article_trace_policy_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_article_trace_policy_effective ON public."ArticleTraceabilityPolicy" USING btree ("organizationId", "articleId", "effectiveAt");


--
-- Name: uq_audit_event_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_audit_event_company_id ON public."AuditEvent" USING btree ("companyId", id);


--
-- Name: uq_availability_assignment_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_availability_assignment_company_id ON public."AvailabilityRequestRecipientAssignment" USING btree ("companyId", id);


--
-- Name: uq_availability_capability_grant_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_availability_capability_grant_scope ON public."AvailabilityCapabilityGrant" USING btree ("companyId", "userId", capability);


--
-- Name: uq_availability_command_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_availability_command_company_id ON public."AvailabilityCommand" USING btree ("companyId", id);


--
-- Name: uq_availability_command_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_availability_command_idempotency ON public."AvailabilityCommand" USING btree ("companyId", "actorUserId", type, "idempotencyKey");


--
-- Name: uq_availability_request_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_availability_request_company_id ON public."AvailabilityRequest" USING btree ("companyId", id);


--
-- Name: uq_availability_request_company_surgery_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_availability_request_company_surgery_id ON public."AvailabilityRequest" USING btree ("companyId", "surgeryId", id);


--
-- Name: uq_availability_request_completion_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_availability_request_completion_command ON public."AvailabilityRequest" USING btree ("companyId", "completionCommandId");


--
-- Name: uq_availability_request_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_availability_request_correlation ON public."AvailabilityRequest" USING btree ("correlationId");


--
-- Name: uq_branch_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_branch_company_id ON public."Branch" USING btree ("companyId", id);


--
-- Name: uq_brand_org_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_brand_org_code ON public.brand USING btree (organization_id, code);


--
-- Name: uq_brand_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_brand_org_id ON public.brand USING btree (organization_id, id);


--
-- Name: uq_ca_active_box; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ca_active_box ON public.cajas_assignment USING btree (company_id, box_identified_unit_id, active_slot);


--
-- Name: uq_ca_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ca_company_id ON public.cajas_assignment USING btree (company_id, id);


--
-- Name: uq_ca_company_id_article; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ca_company_id_article ON public.cajas_assignment USING btree (company_id, id, box_article_id);


--
-- Name: uq_ca_company_id_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ca_company_id_unit ON public.cajas_assignment USING btree (company_id, id, box_identified_unit_id);


--
-- Name: uq_ca_company_id_unit_article; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ca_company_id_unit_article ON public.cajas_assignment USING btree (company_id, id, box_identified_unit_id, box_article_id);


--
-- Name: uq_ca_end_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ca_end_command ON public.cajas_assignment USING btree (company_id, end_command_acceptance_id);


--
-- Name: uq_ca_start_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ca_start_command ON public.cajas_assignment USING btree (company_id, start_command_acceptance_id);


--
-- Name: uq_catalog_alias_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_catalog_alias_active ON public.catalog_alias USING btree (organization_id, kind, normalized_alias) WHERE (is_active = true);


--
-- Name: uq_catalog_alias_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_catalog_alias_org_id ON public.catalog_alias USING btree (organization_id, id);


--
-- Name: uq_cbf_company_article; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cbf_company_article ON public.cajas_box_formula USING btree (company_id, box_article_id);


--
-- Name: uq_cbf_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cbf_company_id ON public.cajas_box_formula USING btree (company_id, id);


--
-- Name: uq_cbf_company_id_article; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cbf_company_id_article ON public.cajas_box_formula USING btree (company_id, id, box_article_id);


--
-- Name: uq_cbf_current_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cbf_current_version ON public.cajas_box_formula USING btree (company_id, current_version_id);


--
-- Name: uq_cc_assignment_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cc_assignment_sequence ON public.cajas_control USING btree (assignment_id, sequence);


--
-- Name: uq_cc_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cc_command ON public.cajas_control USING btree (company_id, command_acceptance_id);


--
-- Name: uq_cc_company_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cc_company_assignment_id ON public.cajas_control USING btree (company_id, assignment_id, id);


--
-- Name: uq_cc_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cc_company_id ON public.cajas_control USING btree (company_id, id);


--
-- Name: uq_ccc_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccc_command ON public.cajas_consumption_confirmation USING btree (company_id, command_acceptance_id);


--
-- Name: uq_ccc_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccc_company_id ON public.cajas_consumption_confirmation USING btree (company_id, id);


--
-- Name: uq_ccc_dispatch_source_seq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccc_dispatch_source_seq ON public.cajas_consumption_confirmation USING btree (dispatch_id, consumo_id, sequence);


--
-- Name: uq_ccc_owner_lineage; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccc_owner_lineage ON public.cajas_consumption_confirmation USING btree (company_id, id, consumo_id, dispatch_id);


--
-- Name: uq_ccc_source_dispatch_original; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccc_source_dispatch_original ON public.cajas_consumption_confirmation USING btree (company_id, consumo_id, dispatch_id, original_slot);


--
-- Name: uq_cchg_assignment_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cchg_assignment_version ON public.cajas_composition_change USING btree (assignment_id, resulting_preparation_version);


--
-- Name: uq_cchg_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cchg_command ON public.cajas_composition_change USING btree (company_id, command_acceptance_id);


--
-- Name: uq_cchg_company_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cchg_company_assignment_id ON public.cajas_composition_change USING btree (company_id, assignment_id, id);


--
-- Name: uq_cchg_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cchg_company_id ON public.cajas_composition_change USING btree (company_id, id);


--
-- Name: uq_cchl_change_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cchl_change_line ON public.cajas_composition_change_line USING btree (change_id, line_number);


--
-- Name: uq_cchl_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cchl_company_id ON public.cajas_composition_change_line USING btree (company_id, id);


--
-- Name: uq_ccl_company_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccl_company_assignment_id ON public.cajas_control_line USING btree (company_id, assignment_id, id);


--
-- Name: uq_ccl_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccl_company_id ON public.cajas_control_line USING btree (company_id, id);


--
-- Name: uq_ccl_control_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccl_control_line ON public.cajas_control_line USING btree (control_id, line_number);


--
-- Name: uq_ccln_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccln_company_id ON public.cajas_consumption_line USING btree (company_id, id);


--
-- Name: uq_ccln_confirmation_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccln_confirmation_line ON public.cajas_consumption_line USING btree (consumption_confirmation_id, line_number);


--
-- Name: uq_ccln_disposition_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccln_disposition_owner ON public.cajas_consumption_line USING btree (company_id, consumption_confirmation_id, dispatch_id, id);


--
-- Name: uq_ccln_recognized_disposition; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccln_recognized_disposition ON public.cajas_consumption_line USING btree (company_id, dispatch_line_id, recognized_return_disposition_id);


--
-- Name: uq_ccp_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccp_assignment ON public.cajas_condition_projection USING btree (company_id, assignment_id);


--
-- Name: uq_ccp_box_identified_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccp_box_identified_unit ON public.cajas_condition_projection USING btree (company_id, box_identified_unit_id);


--
-- Name: uq_ccp_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ccp_company_id ON public.cajas_condition_projection USING btree (company_id, id);


--
-- Name: uq_cd_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cd_company_id ON public.cajas_difference USING btree (company_id, id);


--
-- Name: uq_cda_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cda_company_id ON public.cajas_dispatch_accounting USING btree (company_id, id);


--
-- Name: uq_cda_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cda_dispatch ON public.cajas_dispatch_accounting USING btree (company_id, dispatch_id);


--
-- Name: uq_cda_owner_lineage; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cda_owner_lineage ON public.cajas_dispatch_accounting USING btree (company_id, id, dispatch_id);


--
-- Name: uq_cdis_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdis_company_id ON public.cajas_disposition USING btree (company_id, id);


--
-- Name: uq_cdis_dispatch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdis_dispatch_id ON public.cajas_disposition USING btree (company_id, dispatch_line_id, id);


--
-- Name: uq_cdis_neutralizes; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdis_neutralizes ON public.cajas_disposition USING btree (company_id, neutralizes_disposition_id);


--
-- Name: uq_cdis_slice; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdis_slice ON public.cajas_disposition USING btree (company_id, dispatch_line_id, slice_key);


--
-- Name: uq_cdl_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdl_company_id ON public.cajas_dispatch_line USING btree (company_id, id);


--
-- Name: uq_cdl_dispatch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdl_dispatch_id ON public.cajas_dispatch_line USING btree (company_id, dispatch_id, id);


--
-- Name: uq_cdl_dispatch_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdl_dispatch_line ON public.cajas_dispatch_line USING btree (dispatch_id, line_number);


--
-- Name: uq_cdl_neutralizes; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdl_neutralizes ON public.cajas_dispatch_line USING btree (company_id, neutralizes_dispatch_line_id);


--
-- Name: uq_cdla_accounting_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdla_accounting_line ON public.cajas_dispatch_line_accounting USING btree (accounting_id, dispatch_line_id);


--
-- Name: uq_cdla_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdla_company_id ON public.cajas_dispatch_line_accounting USING btree (company_id, id);


--
-- Name: uq_cdla_dispatch_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdla_dispatch_line ON public.cajas_dispatch_line_accounting USING btree (company_id, dispatch_line_id);


--
-- Name: uq_cdla_dispatch_line_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdla_dispatch_line_owner ON public.cajas_dispatch_line_accounting USING btree (company_id, dispatch_id, dispatch_line_id);


--
-- Name: uq_cdp_assignment_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdp_assignment_sequence ON public.cajas_dispatch USING btree (assignment_id, sequence);


--
-- Name: uq_cdp_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdp_command ON public.cajas_dispatch USING btree (company_id, command_acceptance_id);


--
-- Name: uq_cdp_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdp_company_id ON public.cajas_dispatch USING btree (company_id, id);


--
-- Name: uq_cdp_difference_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdp_difference_owner ON public.cajas_dispatch USING btree (company_id, id, assignment_id, remito_id);


--
-- Name: uq_cdp_owner_lineage; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdp_owner_lineage ON public.cajas_dispatch USING btree (company_id, id, remito_id);


--
-- Name: uq_cdr_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdr_command ON public.cajas_difference_resolution USING btree (company_id, command_acceptance_id);


--
-- Name: uq_cdr_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdr_company_id ON public.cajas_difference_resolution USING btree (company_id, id);


--
-- Name: uq_cdr_difference_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cdr_difference_sequence ON public.cajas_difference_resolution USING btree (difference_id, sequence);


--
-- Name: uq_cfl_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cfl_company_id ON public.cajas_formula_line USING btree (company_id, id);


--
-- Name: uq_cfl_company_version_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cfl_company_version_id ON public.cajas_formula_line USING btree (company_id, formula_version_id, id);


--
-- Name: uq_cfl_version_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cfl_version_line ON public.cajas_formula_line USING btree (formula_version_id, line_number);


--
-- Name: uq_cfv_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cfv_command ON public.cajas_formula_version USING btree (company_id, command_acceptance_id);


--
-- Name: uq_cfv_company_formula_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cfv_company_formula_id ON public.cajas_formula_version USING btree (company_id, formula_id, id);


--
-- Name: uq_cfv_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cfv_company_id ON public.cajas_formula_version USING btree (company_id, id);


--
-- Name: uq_cfv_company_id_article; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cfv_company_id_article ON public.cajas_formula_version USING btree (company_id, id, box_article_id);


--
-- Name: uq_cfv_company_id_formula_article; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cfv_company_id_formula_article ON public.cajas_formula_version USING btree (company_id, id, formula_id, box_article_id);


--
-- Name: uq_cfv_formula_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cfv_formula_number ON public.cajas_formula_version USING btree (company_id, formula_id, version_number);


--
-- Name: uq_clinical_family_org_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_clinical_family_org_code ON public.clinical_family USING btree (organization_id, code);


--
-- Name: uq_clinical_family_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_clinical_family_org_id ON public.clinical_family USING btree (organization_id, id);


--
-- Name: uq_cmc_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cmc_company_id ON public.cajas_maintenance_case USING btree (company_id, id);


--
-- Name: uq_cmt_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cmt_audit ON public.cajas_maintenance_transition USING btree (company_id, audit_event_id);


--
-- Name: uq_cmt_case_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cmt_case_sequence ON public.cajas_maintenance_transition USING btree (company_id, case_id, sequence);


--
-- Name: uq_cmt_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cmt_command ON public.cajas_maintenance_transition USING btree (company_id, command_acceptance_id);


--
-- Name: uq_cmt_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cmt_company_id ON public.cajas_maintenance_transition USING btree (company_id, id);


--
-- Name: uq_company_operational_assignee_designation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_company_operational_assignee_designation ON public."CompanyOperationalAssignee" USING btree ("companyId", designation);


--
-- Name: uq_company_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_company_organization_id ON public."Company" USING btree ("organizationId", id);


--
-- Name: uq_consumo_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_consumo_company_id ON public.consumo USING btree ("companyId", id);


--
-- Name: uq_consumo_id_remito; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_consumo_id_remito ON public.consumo USING btree ("companyId", id, "remitoId");


--
-- Name: uq_consumo_item_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_consumo_item_company_id ON public.consumo_item USING btree (company_id, id);


--
-- Name: uq_consumo_item_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_consumo_item_owner_id ON public.consumo_item USING btree (company_id, "consumoId", id);


--
-- Name: uq_contact_address_one_main; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_contact_address_one_main ON public."ContactAddress" USING btree ("companyId", "contactId") WHERE ("isMain" = true);


--
-- Name: uq_contact_company_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_contact_company_code ON public."ContactCompanyLink" USING btree ("companyId", code);


--
-- Name: uq_contact_group_company_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_contact_group_company_slug ON public."ContactGroup" USING btree ("companyId", slug);


--
-- Name: uq_cp_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cp_assignment ON public.cajas_preparation USING btree (company_id, assignment_id);


--
-- Name: uq_cp_company_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cp_company_assignment_id ON public.cajas_preparation USING btree (company_id, assignment_id, id);


--
-- Name: uq_cp_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cp_company_id ON public.cajas_preparation USING btree (company_id, id);


--
-- Name: uq_cp_company_id_formula_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cp_company_id_formula_version ON public.cajas_preparation USING btree (company_id, id, formula_version_id);


--
-- Name: uq_cp_last_change; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cp_last_change ON public.cajas_preparation USING btree (company_id, last_accepted_change_id);


--
-- Name: uq_cp_latest_control; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cp_latest_control ON public.cajas_preparation USING btree (company_id, latest_control_id);


--
-- Name: uq_cpl_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cpl_company_id ON public.cajas_preparation_line USING btree (company_id, id);


--
-- Name: uq_cpl_company_preparation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cpl_company_preparation_id ON public.cajas_preparation_line USING btree (company_id, preparation_id, id);


--
-- Name: uq_cpl_preparation_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cpl_preparation_key ON public.cajas_preparation_line USING btree (preparation_id, line_key);


--
-- Name: uq_crc_company_assignment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crc_company_assignment_id ON public.cajas_reservation_correlation USING btree (company_id, assignment_id, id);


--
-- Name: uq_crc_company_semantic; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crc_company_semantic ON public.cajas_reservation_correlation USING btree (company_id, semantic_key);


--
-- Name: uq_crcfn_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crcfn_command ON public.cajas_return_confirmation USING btree (company_id, command_acceptance_id);


--
-- Name: uq_crcfn_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crcfn_company_id ON public.cajas_return_confirmation USING btree (company_id, id);


--
-- Name: uq_crcfn_dispatch_source_seq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crcfn_dispatch_source_seq ON public.cajas_return_confirmation USING btree (dispatch_id, devolucion_id, sequence);


--
-- Name: uq_crcfn_owner_lineage; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crcfn_owner_lineage ON public.cajas_return_confirmation USING btree (company_id, id, devolucion_id, dispatch_id);


--
-- Name: uq_crcfn_source_dispatch_original; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crcfn_source_dispatch_original ON public.cajas_return_confirmation USING btree (company_id, devolucion_id, dispatch_id, original_slot);


--
-- Name: uq_crl_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crl_company_id ON public.cajas_return_line USING btree (company_id, id);


--
-- Name: uq_crl_confirmation_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crl_confirmation_line ON public.cajas_return_line USING btree (return_confirmation_id, line_number);


--
-- Name: uq_crl_dispatch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crl_dispatch_id ON public.cajas_return_line USING btree (company_id, return_confirmation_id, dispatch_id, id);


--
-- Name: uq_crp_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crp_company_id ON public.cajas_replacement_pair USING btree (company_id, id);


--
-- Name: uq_crp_return_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_crp_return_line ON public.cajas_replacement_pair USING btree (company_id, return_confirmation_id, dispatch_id, return_line_id);


--
-- Name: uq_cule_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cule_command ON public.cajas_unit_log_entry USING btree (company_id, command_acceptance_id);


--
-- Name: uq_cule_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cule_company_id ON public.cajas_unit_log_entry USING btree (company_id, id);


--
-- Name: uq_daae_correlation_event_sha256; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_daae_correlation_event_sha256 ON public.durable_attempt_audit_event USING btree (correlation_id, event_sha256);


--
-- Name: uq_daae_correlation_ordinal; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_daae_correlation_ordinal ON public.durable_attempt_audit_event USING btree (correlation_id, event_ordinal);


--
-- Name: uq_daae_correlation_predecessor; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_daae_correlation_predecessor ON public.durable_attempt_audit_event USING btree (correlation_id, predecessor_event_sha256);


--
-- Name: uq_daae_event_sha256; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_daae_event_sha256 ON public.durable_attempt_audit_event USING btree (event_sha256);


--
-- Name: uq_devolucion_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_devolucion_company_id ON public.devolucion USING btree ("companyId", id);


--
-- Name: uq_devolucion_id_remito; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_devolucion_id_remito ON public.devolucion USING btree ("companyId", id, "remitoId");


--
-- Name: uq_devolucion_item_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_devolucion_item_company_id ON public.devolucion_item USING btree (company_id, id);


--
-- Name: uq_devolucion_item_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_devolucion_item_owner_id ON public.devolucion_item USING btree (company_id, "devolucionId", id);


--
-- Name: uq_goods_receipt_line_receipt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_goods_receipt_line_receipt_id ON public."GoodsReceiptLine" USING btree ("companyId", "receiptId", id);


--
-- Name: uq_manufacturer_org_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_manufacturer_org_code ON public.manufacturer USING btree (organization_id, code);


--
-- Name: uq_manufacturer_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_manufacturer_org_id ON public.manufacturer USING btree (organization_id, id);


--
-- Name: uq_oca_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_oca_audit ON public."OperationalCommandAcceptance" USING btree ("companyId", "auditEventId");


--
-- Name: uq_oca_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_oca_company_id ON public."OperationalCommandAcceptance" USING btree ("companyId", id);


--
-- Name: uq_oca_semantic; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_oca_semantic ON public."OperationalCommandAcceptance" USING btree ("companyId", domain, "sourceOperationId", checkpoint, "scopeKey");


--
-- Name: uq_ocat_transport; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_ocat_transport ON public."OperationalCommandAttempt" USING btree ("companyId", "transportCorrelationId");


--
-- Name: uq_oce_effect; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_oce_effect ON public."OperationalCommandEffect" USING btree ("commandAcceptanceId", "effectKey");


--
-- Name: uq_presupuesto_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_presupuesto_company_id ON public.presupuesto USING btree ("companyId", id);


--
-- Name: uq_presupuesto_family_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_presupuesto_family_company_id ON public.presupuesto_family USING btree ("companyId", id);


--
-- Name: uq_presupuesto_family_current; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_presupuesto_family_current ON public.presupuesto USING btree ("familyId") WHERE (slot = 'CURRENT'::text);


--
-- Name: uq_presupuesto_family_draft; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_presupuesto_family_draft ON public.presupuesto USING btree ("familyId") WHERE (slot = 'DRAFT'::text);


--
-- Name: uq_presupuesto_family_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_presupuesto_family_id ON public.presupuesto USING btree ("familyId", id);


--
-- Name: uq_presupuesto_family_surgery; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_presupuesto_family_surgery ON public.presupuesto_family USING btree ("companyId", "surgeryId") WHERE ("surgeryId" IS NOT NULL);


--
-- Name: uq_presupuesto_family_surgery_lineage; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_presupuesto_family_surgery_lineage ON public.presupuesto_family USING btree ("companyId", id, "surgeryId");


--
-- Name: uq_presupuesto_family_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_presupuesto_family_version ON public.presupuesto USING btree ("familyId", "versionNumber");


--
-- Name: uq_presupuesto_item_position; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_presupuesto_item_position ON public.presupuesto_item USING btree ("presupuestoId", "position");


--
-- Name: uq_product_category_child_active_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_product_category_child_active_name ON public.product_category USING btree (organization_id, parent_id, normalized_name) WHERE ((is_active = true) AND (parent_id IS NOT NULL));


--
-- Name: uq_product_category_org_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_product_category_org_code ON public.product_category USING btree (organization_id, code);


--
-- Name: uq_product_category_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_product_category_org_id ON public.product_category USING btree (organization_id, id);


--
-- Name: uq_product_category_root_active_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_product_category_root_active_name ON public.product_category USING btree (organization_id, normalized_name) WHERE ((is_active = true) AND (parent_id IS NULL));


--
-- Name: uq_product_line_org_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_product_line_org_code ON public.product_line USING btree (organization_id, code);


--
-- Name: uq_product_line_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_product_line_org_id ON public.product_line USING btree (organization_id, id);


--
-- Name: uq_remito_access_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_access_company_id ON public."RemitoVerificationAccess" USING btree ("companyId", id);


--
-- Name: uq_remito_access_current; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_access_current ON public."RemitoVerificationAccess" USING btree ("companyId", "publicationId", "currentSlot");


--
-- Name: uq_remito_access_tenant_lineage; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_access_tenant_lineage ON public."RemitoVerificationAccess" USING btree ("companyId", id, "publicationId");


--
-- Name: uq_remito_access_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_access_token_hash ON public."RemitoVerificationAccess" USING btree ("tokenHash");


--
-- Name: uq_remito_access_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_access_version ON public."RemitoVerificationAccess" USING btree ("companyId", "publicationId", version);


--
-- Name: uq_remito_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_company_id ON public."Remito" USING btree ("companyId", id);


--
-- Name: uq_remito_item_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_item_company_id ON public."RemitoItem" USING btree (company_id, id);


--
-- Name: uq_remito_item_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_item_owner_id ON public."RemitoItem" USING btree (company_id, "remitoId", id);


--
-- Name: uq_remito_metric_dimensions; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_metric_dimensions ON public."RemitoVerificationDailyMetric" USING btree ("companyId", day, channel, result);


--
-- Name: uq_remito_publication_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_publication_company_id ON public."RemitoVerificationPublication" USING btree ("companyId", id);


--
-- Name: uq_remito_publication_current; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_publication_current ON public."RemitoVerificationPublication" USING btree ("companyId", "remitoId", "currentSlot");


--
-- Name: uq_remito_publication_tenant_lineage; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_publication_tenant_lineage ON public."RemitoVerificationPublication" USING btree ("companyId", id, "remitoId");


--
-- Name: uq_remito_publication_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_publication_version ON public."RemitoVerificationPublication" USING btree ("companyId", "remitoId", version);


--
-- Name: uq_remito_scan_locator_company_locator; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_scan_locator_company_locator ON public."RemitoScanLocator" USING btree ("companyId", locator);


--
-- Name: uq_remito_scan_locator_company_remito; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_scan_locator_company_remito ON public."RemitoScanLocator" USING btree ("companyId", "remitoId");


--
-- Name: uq_remito_scan_locator_tenant_lineage; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_remito_scan_locator_tenant_lineage ON public."RemitoScanLocator" USING btree ("companyId", locator, "remitoId");


--
-- Name: uq_sab_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sab_company_id ON public."StockActivationBoundary" USING btree ("companyId", id);


--
-- Name: uq_sab_company_id_position_cutoff; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sab_company_id_position_cutoff ON public."StockActivationBoundary" USING btree ("companyId", id, "positionId", "cutoffAt");


--
-- Name: uq_sae_company_article; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sae_company_article ON public."StockArticleEligibility" USING btree ("companyId", "articleId");


--
-- Name: uq_sae_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sae_company_id ON public."StockArticleEligibility" USING btree ("companyId", id);


--
-- Name: uq_sae_current_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sae_current_policy ON public."StockArticleEligibility" USING btree ("companyId", "currentPolicyVersionId");


--
-- Name: uq_sapv_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sapv_command ON public."StockArticlePolicyVersion" USING btree ("companyId", "commandAcceptanceId");


--
-- Name: uq_sapv_company_eligibility_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sapv_company_eligibility_id ON public."StockArticlePolicyVersion" USING btree ("companyId", "eligibilityId", id);


--
-- Name: uq_sapv_eligibility_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sapv_eligibility_version ON public."StockArticlePolicyVersion" USING btree ("companyId", "eligibilityId", "versionNumber");


--
-- Name: uq_sc_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sc_company_id ON public."StockContext" USING btree ("companyId", id);


--
-- Name: uq_sc_deposit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sc_deposit ON public."StockContext" USING btree ("companyId", "depositId") WHERE (kind = 'DEPOSIT'::public."StockContextKind");


--
-- Name: uq_scr_source; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_scr_source ON public."StockCompatibilityReference" USING btree ("companyId", "sourceDomain", "sourceEntityType", "sourceEntityId", "sourceScopeKind", "sourceScopeKey");


--
-- Name: uq_sd_company_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sd_company_code ON public."StockDeposit" USING btree ("companyId", code);


--
-- Name: uq_sd_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sd_company_id ON public."StockDeposit" USING btree ("companyId", id);


--
-- Name: uq_sdc_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sdc_company_id ON public."SurgeryDocumentChecklist" USING btree ("companyId", id);


--
-- Name: uq_sdc_company_surgery; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sdc_company_surgery ON public."SurgeryDocumentChecklist" USING btree ("companyId", "surgeryId");


--
-- Name: uq_sdi_checklist_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sdi_checklist_type ON public."SurgeryDocumentItem" USING btree ("checklistId", type);


--
-- Name: uq_sdi_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sdi_company_id ON public."SurgeryDocumentItem" USING btree ("companyId", id);


--
-- Name: uq_se_audit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_se_audit ON public."StockEvidence" USING btree ("companyId", "auditEventId");


--
-- Name: uq_se_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_se_command ON public."StockEvidence" USING btree ("companyId", "commandAcceptanceId");


--
-- Name: uq_se_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_se_company_id ON public."StockEvidence" USING btree ("companyId", id);


--
-- Name: uq_sel_company_article_from_position_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sel_company_article_from_position_id ON public."StockEvidenceLine" USING btree ("companyId", "articleId", "fromPositionId", id);


--
-- Name: uq_sel_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sel_company_id ON public."StockEvidenceLine" USING btree ("companyId", id);


--
-- Name: uq_sel_company_to_position_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sel_company_to_position_id ON public."StockEvidenceLine" USING btree ("companyId", "toPositionId", id);


--
-- Name: uq_sel_evidence_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sel_evidence_line ON public."StockEvidenceLine" USING btree ("evidenceId", "lineNumber");


--
-- Name: uq_siu_company_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siu_company_article_id ON public."StockIdentifiedUnit" USING btree ("companyId", "articleId", id);


--
-- Name: uq_siu_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siu_company_id ON public."StockIdentifiedUnit" USING btree ("companyId", id);


--
-- Name: uq_siucc_company_configuration_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siucc_company_configuration_version ON public."StockIdentifiedUnitCurrentConfiguration" USING btree ("companyId", "configurationVersionId");


--
-- Name: uq_siucc_company_internal_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siucc_company_internal_code ON public."StockIdentifiedUnitCurrentConfiguration" USING btree ("companyId", "internalCode");


--
-- Name: uq_siucc_company_serial_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siucc_company_serial_number ON public."StockIdentifiedUnitCurrentConfiguration" USING btree ("companyId", "serialNumber") WHERE ("serialNumber" IS NOT NULL);


--
-- Name: uq_siucc_company_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siucc_company_unit ON public."StockIdentifiedUnitCurrentConfiguration" USING btree ("companyId", "identifiedUnitId");


--
-- Name: uq_siucv_company_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siucv_company_unit_id ON public."StockIdentifiedUnitConfigurationVersion" USING btree ("companyId", "identifiedUnitId", id);


--
-- Name: uq_siucv_unit_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siucv_unit_version ON public."StockIdentifiedUnitConfigurationVersion" USING btree ("companyId", "identifiedUnitId", "versionNumber");


--
-- Name: uq_siuo_company_position; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siuo_company_position ON public."StockIdentifiedUnitOccupancy" USING btree ("companyId", "currentPositionId");


--
-- Name: uq_siuo_company_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_siuo_company_unit ON public."StockIdentifiedUnitOccupancy" USING btree ("companyId", "identifiedUnitId");


--
-- Name: uq_sl_company_article_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sl_company_article_code ON public."StockLot" USING btree ("companyId", "articleId", "normalizedLotCode");


--
-- Name: uq_sl_company_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sl_company_article_id ON public."StockLot" USING btree ("companyId", "articleId", id);


--
-- Name: uq_slo_company_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_slo_company_article_id ON public."StockLotObservation" USING btree ("companyId", "articleId", id);


--
-- Name: uq_slo_source_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_slo_source_scope ON public."StockLotObservation" USING btree ("companyId", "sourceDomain", "sourceEntityType", "sourceEntityId", "sourceScopeKey");


--
-- Name: uq_slr_observation_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_slr_observation_pair ON public."StockLotReview" USING btree ("companyId", "leftObservationId", "rightObservationId");


--
-- Name: uq_sop_company_activation_boundary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sop_company_activation_boundary ON public."StockOpeningPosition" USING btree ("companyId", "activationBoundaryId");


--
-- Name: uq_sop_company_opening_evidence_line; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sop_company_opening_evidence_line ON public."StockOpeningPosition" USING btree ("companyId", "openingEvidenceLineId");


--
-- Name: uq_sop_company_position_cutoff; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sop_company_position_cutoff ON public."StockOpeningPosition" USING btree ("companyId", "positionId", "cutoffAt");


--
-- Name: uq_sp_company_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sp_company_article_id ON public."StockPosition" USING btree ("companyId", "articleId", id);


--
-- Name: uq_sp_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sp_company_id ON public."StockPosition" USING btree ("companyId", id);


--
-- Name: uq_sp_company_id_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sp_company_id_unit ON public."StockPosition" USING btree ("companyId", id, "identifiedUnitId");


--
-- Name: uq_sp_company_scope_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sp_company_scope_key ON public."StockPosition" USING btree ("companyId", "scopeKey");


--
-- Name: uq_sp_identified_unit_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sp_identified_unit_scope ON public."StockPosition" USING btree ("companyId", "articleId", "policyVersionId", "contextId", "identifiedUnitId") WHERE ("traceMode" = 'IDENTIFIED_UNIT'::public."StockTraceMode");


--
-- Name: uq_sp_lot_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sp_lot_scope ON public."StockPosition" USING btree ("companyId", "articleId", "policyVersionId", "contextId", "lotId") WHERE ("traceMode" = 'LOT'::public."StockTraceMode");


--
-- Name: uq_sp_none_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sp_none_scope ON public."StockPosition" USING btree ("companyId", "articleId", "policyVersionId", "contextId") WHERE ("traceMode" = 'NONE'::public."StockTraceMode");


--
-- Name: uq_spp_position; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_spp_position ON public."StockPositionProjection" USING btree ("companyId", "positionId");


--
-- Name: uq_sr_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sr_company_id ON public."StockReservation" USING btree ("companyId", id);


--
-- Name: uq_sr_company_id_position; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sr_company_id_position ON public."StockReservation" USING btree ("companyId", id, "positionId");


--
-- Name: uq_sr_source_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sr_source_scope ON public."StockReservation" USING btree ("companyId", "sourceDomain", "sourceEntityType", "sourceEntityId", "sourceScopeKind", "sourceScopeKey", "positionId");


--
-- Name: uq_sre_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sre_command ON public."StockReservationEvidence" USING btree ("companyId", "commandAcceptanceId");


--
-- Name: uq_sre_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sre_company_id ON public."StockReservationEvidence" USING btree ("companyId", id);


--
-- Name: uq_sre_company_reservation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sre_company_reservation_id ON public."StockReservationEvidence" USING btree ("companyId", "reservationId", id);


--
-- Name: uq_sre_reservation_seq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sre_reservation_seq ON public."StockReservationEvidence" USING btree ("reservationId", sequence);


--
-- Name: uq_srp_reservation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_srp_reservation ON public."StockReservationProjection" USING btree ("companyId", "reservationId");


--
-- Name: uq_surgery_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_surgery_company_id ON public."Surgery" USING btree ("companyId", id);


--
-- Name: uq_vehicle_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_vehicle_company_id ON public."Vehicle" USING btree ("companyId", id);


--
-- Name: uq_vehicle_latest_position_company_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_vehicle_latest_position_company_vehicle ON public."VehicleLatestPosition" USING btree ("companyId", "vehicleId");


--
-- Name: uq_vehicle_tracking_device; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_vehicle_tracking_device ON public."Vehicle" USING btree ("trackingDeviceId");


--
-- Name: uq_xadmin_import_run_org_file_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_xadmin_import_run_org_file_hash ON public.xadmin_import_run USING btree (organization_id, source_file_sha256);


--
-- Name: uq_xadmin_import_run_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_xadmin_import_run_org_id ON public.xadmin_import_run USING btree (organization_id, id);


--
-- Name: uq_xadmin_import_run_org_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_xadmin_import_run_org_key ON public.xadmin_import_run USING btree (organization_id, run_key);


--
-- Name: uq_xadmin_mapping_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_xadmin_mapping_org_id ON public.xadmin_article_mapping USING btree (organization_id, id);


--
-- Name: uq_xadmin_mapping_stage_axis; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_xadmin_mapping_stage_axis ON public.xadmin_article_mapping USING btree (organization_id, stage_row_id, axis);


--
-- Name: uq_xadmin_stage_row_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_xadmin_stage_row_org_id ON public.xadmin_article_stage_row USING btree (organization_id, id);


--
-- Name: uq_xadmin_stage_row_run_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_xadmin_stage_row_run_key ON public.xadmin_article_stage_row USING btree (organization_id, run_id, source_row_key);


--
-- Name: cajas_consumption_confirmation ctrg_cajas_consumption_min_line_on_consumption; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cajas_consumption_min_line_on_consumption AFTER INSERT ON public.cajas_consumption_confirmation DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_consumption_min_line();


--
-- Name: cajas_consumption_line ctrg_cajas_consumption_min_line_on_line; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cajas_consumption_min_line_on_line AFTER DELETE OR UPDATE ON public.cajas_consumption_line DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_consumption_min_line();


--
-- Name: cajas_control ctrg_cajas_control_min_line_on_control; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cajas_control_min_line_on_control AFTER INSERT ON public.cajas_control DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_control_min_line();


--
-- Name: cajas_control_line ctrg_cajas_control_min_line_on_line; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cajas_control_min_line_on_line AFTER DELETE OR UPDATE ON public.cajas_control_line DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_control_min_line();


--
-- Name: cajas_dispatch ctrg_cajas_dispatch_min_line_on_dispatch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cajas_dispatch_min_line_on_dispatch AFTER INSERT ON public.cajas_dispatch DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_dispatch_min_line();


--
-- Name: cajas_dispatch_line ctrg_cajas_dispatch_min_line_on_line; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cajas_dispatch_min_line_on_line AFTER DELETE OR UPDATE ON public.cajas_dispatch_line DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_dispatch_min_line();


--
-- Name: cajas_formula_line ctrg_cajas_formula_version_min_line_on_line; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cajas_formula_version_min_line_on_line AFTER DELETE OR UPDATE ON public.cajas_formula_line DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_formula_version_min_line();


--
-- Name: cajas_formula_version ctrg_cajas_formula_version_min_line_on_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cajas_formula_version_min_line_on_version AFTER INSERT ON public.cajas_formula_version DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_formula_version_min_line();


--
-- Name: cajas_return_line ctrg_cajas_return_min_line_on_line; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cajas_return_min_line_on_line AFTER DELETE OR UPDATE ON public.cajas_return_line DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_return_min_line();


--
-- Name: cajas_return_confirmation ctrg_cajas_return_min_line_on_return; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cajas_return_min_line_on_return AFTER INSERT ON public.cajas_return_confirmation DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_return_min_line();


--
-- Name: cajas_maintenance_case ctrg_cmc_transition_consistency; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cmc_transition_consistency AFTER INSERT OR UPDATE ON public.cajas_maintenance_case DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_maintenance_consistency();


--
-- Name: cajas_maintenance_transition ctrg_cmt_case_consistency; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_cmt_case_consistency AFTER INSERT ON public.cajas_maintenance_transition DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_maintenance_consistency();


--
-- Name: product_category ctrg_product_category_tree_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER ctrg_product_category_tree_guard AFTER INSERT OR UPDATE OF organization_id, parent_id, depth, is_active ON public.product_category DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.fn_product_category_tree_guard();


--
-- Name: ContactCompanyLink trg_allocate_contact_company_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_allocate_contact_company_code BEFORE INSERT ON public."ContactCompanyLink" FOR EACH ROW EXECUTE FUNCTION public.allocate_contact_company_code();


--
-- Name: brand trg_brand_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_brand_no_delete BEFORE DELETE ON public.brand FOR EACH ROW EXECUTE FUNCTION public.fn_article_catalog_no_hard_delete();


--
-- Name: cajas_assignment trg_cajas_assignment_unit_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_assignment_unit_guard BEFORE INSERT OR UPDATE ON public.cajas_assignment FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_assignment_unit_guard();


--
-- Name: cajas_composition_change trg_cajas_composition_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_composition_append_only BEFORE DELETE OR UPDATE ON public.cajas_composition_change FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_composition_append_only();


--
-- Name: cajas_composition_change_line trg_cajas_composition_line_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_composition_line_append_only BEFORE DELETE OR UPDATE ON public.cajas_composition_change_line FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_composition_line_append_only();


--
-- Name: cajas_condition_projection trg_cajas_condition_assignment_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_condition_assignment_guard BEFORE INSERT OR UPDATE ON public.cajas_condition_projection FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_condition_assignment_guard();


--
-- Name: cajas_consumption_confirmation trg_cajas_consumption_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_consumption_append_only BEFORE DELETE OR UPDATE ON public.cajas_consumption_confirmation FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_consumption_append_only();


--
-- Name: cajas_consumption_line trg_cajas_consumption_line_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_consumption_line_append_only BEFORE DELETE OR UPDATE ON public.cajas_consumption_line FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_consumption_line_append_only();


--
-- Name: cajas_control trg_cajas_control_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_control_append_only BEFORE DELETE OR UPDATE ON public.cajas_control FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_control_append_only();


--
-- Name: cajas_control_line trg_cajas_control_line_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_control_line_append_only BEFORE DELETE OR UPDATE ON public.cajas_control_line FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_control_line_append_only();


--
-- Name: cajas_reservation_correlation trg_cajas_correlation_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_correlation_append_only BEFORE DELETE OR UPDATE ON public.cajas_reservation_correlation FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_correlation_append_only();


--
-- Name: cajas_difference trg_cajas_difference_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_difference_append_only BEFORE DELETE OR UPDATE ON public.cajas_difference FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_difference_append_only();


--
-- Name: cajas_difference_resolution trg_cajas_difference_resolution_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_difference_resolution_append_only BEFORE DELETE OR UPDATE ON public.cajas_difference_resolution FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_difference_resolution_append_only();


--
-- Name: cajas_dispatch trg_cajas_dispatch_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_dispatch_append_only BEFORE DELETE OR UPDATE ON public.cajas_dispatch FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_dispatch_append_only();


--
-- Name: cajas_dispatch_line trg_cajas_dispatch_ceiling; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_dispatch_ceiling BEFORE INSERT OR UPDATE ON public.cajas_dispatch_line FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_dispatch_ceiling();


--
-- Name: cajas_dispatch_line trg_cajas_dispatch_line_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_dispatch_line_append_only BEFORE DELETE OR UPDATE ON public.cajas_dispatch_line FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_dispatch_line_append_only();


--
-- Name: cajas_dispatch_line trg_cajas_dispatch_line_stock_link_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_dispatch_line_stock_link_guard BEFORE INSERT OR UPDATE ON public.cajas_dispatch_line FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_stock_link_guard();


--
-- Name: cajas_disposition trg_cajas_disposition_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_disposition_append_only BEFORE DELETE OR UPDATE ON public.cajas_disposition FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_disposition_append_only();


--
-- Name: cajas_disposition trg_cajas_disposition_fold_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_disposition_fold_guard BEFORE INSERT OR UPDATE ON public.cajas_disposition FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_disposition_fold_guard();


--
-- Name: cajas_disposition trg_cajas_disposition_stock_link_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_disposition_stock_link_guard BEFORE INSERT OR UPDATE ON public.cajas_disposition FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_stock_link_guard();


--
-- Name: cajas_box_formula trg_cajas_formula_current_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_formula_current_guard BEFORE INSERT OR UPDATE ON public.cajas_box_formula FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_formula_current_guard();


--
-- Name: cajas_formula_line trg_cajas_formula_line_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_formula_line_append_only BEFORE DELETE OR UPDATE ON public.cajas_formula_line FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_formula_line_append_only();


--
-- Name: cajas_formula_version trg_cajas_formula_version_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_formula_version_append_only BEFORE DELETE OR UPDATE ON public.cajas_formula_version FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_formula_version_append_only();


--
-- Name: cajas_preparation trg_cajas_preparation_box_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_preparation_box_guard BEFORE INSERT OR UPDATE ON public.cajas_preparation FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_preparation_box_guard();


--
-- Name: cajas_preparation trg_cajas_preparation_pointer_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_preparation_pointer_guard BEFORE INSERT OR UPDATE ON public.cajas_preparation FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_preparation_pointer_guard();


--
-- Name: cajas_replacement_pair trg_cajas_replacement_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_replacement_append_only BEFORE DELETE OR UPDATE ON public.cajas_replacement_pair FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_replacement_append_only();


--
-- Name: cajas_return_confirmation trg_cajas_return_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_return_append_only BEFORE DELETE OR UPDATE ON public.cajas_return_confirmation FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_return_append_only();


--
-- Name: cajas_return_line trg_cajas_return_line_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_return_line_append_only BEFORE DELETE OR UPDATE ON public.cajas_return_line FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_return_line_append_only();


--
-- Name: cajas_unit_log_entry trg_cajas_unit_log_entry_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cajas_unit_log_entry_append_only BEFORE DELETE OR UPDATE ON public.cajas_unit_log_entry FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_unit_log_entry_append_only();


--
-- Name: catalog_alias trg_catalog_alias_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_catalog_alias_no_delete BEFORE DELETE ON public.catalog_alias FOR EACH ROW EXECUTE FUNCTION public.fn_article_catalog_no_hard_delete();


--
-- Name: clinical_family trg_clinical_family_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clinical_family_no_delete BEFORE DELETE ON public.clinical_family FOR EACH ROW EXECUTE FUNCTION public.fn_article_catalog_no_hard_delete();


--
-- Name: cajas_maintenance_case trg_cmc_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cmc_guard BEFORE INSERT OR DELETE OR UPDATE ON public.cajas_maintenance_case FOR EACH ROW EXECUTE FUNCTION public.fn_cmc_guard();


--
-- Name: cajas_maintenance_transition trg_cmt_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cmt_append_only BEFORE DELETE OR UPDATE ON public.cajas_maintenance_transition FOR EACH ROW EXECUTE FUNCTION public.fn_cmt_append_only();


--
-- Name: AuditEvent trg_cmt_audit_evidence_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cmt_audit_evidence_guard BEFORE DELETE OR UPDATE ON public."AuditEvent" FOR EACH ROW EXECUTE FUNCTION public.fn_cmt_audit_evidence_guard();


--
-- Name: cajas_maintenance_transition trg_cmt_insert_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cmt_insert_guard BEFORE INSERT ON public.cajas_maintenance_transition FOR EACH ROW EXECUTE FUNCTION public.fn_cmt_insert_guard();


--
-- Name: cajas_phase_d_operation trg_cpdo_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cpdo_append_only BEFORE DELETE OR UPDATE ON public.cajas_phase_d_operation FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_phase_d_append_only();


--
-- Name: cajas_phase_d_reconciliation_event trg_cpdre_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cpdre_append_only BEFORE DELETE OR UPDATE ON public.cajas_phase_d_reconciliation_event FOR EACH ROW EXECUTE FUNCTION public.fn_cajas_phase_d_append_only();


--
-- Name: durable_attempt_audit_event trg_durable_attempt_audit_event_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_durable_attempt_audit_event_append_only BEFORE DELETE OR UPDATE ON public.durable_attempt_audit_event FOR EACH ROW EXECUTE FUNCTION public.fn_durable_attempt_audit_event_append_only();


--
-- Name: manufacturer trg_manufacturer_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_manufacturer_no_delete BEFORE DELETE ON public.manufacturer FOR EACH ROW EXECUTE FUNCTION public.fn_article_catalog_no_hard_delete();


--
-- Name: OperationalCommandAcceptance trg_operational_acceptance_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_operational_acceptance_append_only BEFORE DELETE OR UPDATE ON public."OperationalCommandAcceptance" FOR EACH ROW EXECUTE FUNCTION public.fn_operational_acceptance_append_only();


--
-- Name: OperationalCommandEffect trg_operational_effect_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_operational_effect_append_only BEFORE DELETE OR UPDATE ON public."OperationalCommandEffect" FOR EACH ROW EXECUTE FUNCTION public.fn_operational_effect_append_only();


--
-- Name: OperationalCommandAcceptance trg_operational_semantic_intent_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_operational_semantic_intent_guard BEFORE INSERT OR UPDATE ON public."OperationalCommandAcceptance" FOR EACH ROW EXECUTE FUNCTION public.fn_operational_semantic_intent_guard();


--
-- Name: presupuesto trg_presupuesto_family_surgery_lineage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_presupuesto_family_surgery_lineage BEFORE INSERT OR UPDATE OF "companyId", "familyId", "surgeryId" ON public.presupuesto FOR EACH ROW EXECUTE FUNCTION public.check_presupuesto_family_surgery_lineage();


--
-- Name: product_category trg_product_category_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_product_category_no_delete BEFORE DELETE ON public.product_category FOR EACH ROW EXECUTE FUNCTION public.fn_article_catalog_no_hard_delete();


--
-- Name: product_line trg_product_line_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_product_line_no_delete BEFORE DELETE ON public.product_line FOR EACH ROW EXECUTE FUNCTION public.fn_article_catalog_no_hard_delete();


--
-- Name: PublicVerificationRateBucket trg_public_rate_retention_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_public_rate_retention_immutable BEFORE UPDATE ON public."PublicVerificationRateBucket" FOR EACH ROW EXECUTE FUNCTION public.public_rate_first_seen_immutable();


--
-- Name: RemitoVerificationAccess trg_remito_access_current_deferred; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_remito_access_current_deferred AFTER INSERT OR DELETE OR UPDATE ON public."RemitoVerificationAccess" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.remito_current_guarantee();


--
-- Name: RemitoVerificationAccess trg_remito_access_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_remito_access_guard BEFORE INSERT OR DELETE OR UPDATE ON public."RemitoVerificationAccess" FOR EACH ROW EXECUTE FUNCTION public.remito_access_guard();


--
-- Name: RemitoScanLocator trg_remito_locator_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_remito_locator_guard BEFORE INSERT OR DELETE OR UPDATE ON public."RemitoScanLocator" FOR EACH ROW EXECUTE FUNCTION public.remito_locator_guard();


--
-- Name: RemitoScanLocator trg_remito_locator_publication_deferred; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_remito_locator_publication_deferred AFTER INSERT ON public."RemitoScanLocator" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.remito_current_guarantee();


--
-- Name: RemitoVerificationPublication trg_remito_publication_current_deferred; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_remito_publication_current_deferred AFTER INSERT OR DELETE OR UPDATE ON public."RemitoVerificationPublication" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.remito_current_guarantee();


--
-- Name: RemitoVerificationPublication trg_remito_publication_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_remito_publication_guard BEFORE INSERT OR DELETE OR UPDATE ON public."RemitoVerificationPublication" FOR EACH ROW EXECUTE FUNCTION public.remito_publication_guard();


--
-- Name: StockEvidence trg_stock_evidence_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_evidence_append_only BEFORE DELETE OR UPDATE ON public."StockEvidence" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_evidence_append_only();


--
-- Name: StockEvidenceLine trg_stock_evidence_line_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_evidence_line_append_only BEFORE DELETE OR UPDATE ON public."StockEvidenceLine" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_evidence_line_append_only();


--
-- Name: StockEvidenceLine trg_stock_evidence_line_parent_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_evidence_line_parent_guard BEFORE INSERT OR UPDATE ON public."StockEvidenceLine" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_evidence_line_parent_guard();


--
-- Name: StockIdentifiedUnitOccupancy trg_stock_identified_unit_exclusivity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_identified_unit_exclusivity BEFORE INSERT OR UPDATE ON public."StockIdentifiedUnitOccupancy" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_identified_unit_exclusivity();


--
-- Name: StockLot trg_stock_lot_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_lot_append_only BEFORE DELETE OR UPDATE ON public."StockLot" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_lot_append_only();


--
-- Name: StockLotObservation trg_stock_lot_observation_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_lot_observation_append_only BEFORE DELETE OR UPDATE ON public."StockLotObservation" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_lot_observation_append_only();


--
-- Name: StockLotReview trg_stock_lot_review_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_lot_review_append_only BEFORE DELETE OR UPDATE ON public."StockLotReview" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_lot_review_append_only();


--
-- Name: StockLotReview trg_stock_lot_review_coherence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_lot_review_coherence BEFORE INSERT OR UPDATE ON public."StockLotReview" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_lot_review_coherence();


--
-- Name: StockOpeningPosition trg_stock_opening_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_opening_append_only BEFORE DELETE OR UPDATE ON public."StockOpeningPosition" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_opening_append_only();


--
-- Name: StockOpeningPosition trg_stock_opening_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_opening_guard BEFORE INSERT OR UPDATE ON public."StockOpeningPosition" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_opening_guard();


--
-- Name: StockArticleEligibility trg_stock_policy_current_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_policy_current_guard BEFORE INSERT OR UPDATE ON public."StockArticleEligibility" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_policy_current_guard();


--
-- Name: StockPosition trg_stock_position_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_position_append_only BEFORE DELETE OR UPDATE ON public."StockPosition" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_position_append_only();


--
-- Name: StockPosition trg_stock_position_parent_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_position_parent_guard BEFORE INSERT OR UPDATE ON public."StockPosition" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_position_parent_guard();


--
-- Name: StockEvidenceLine trg_stock_quantity_scale_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_quantity_scale_guard BEFORE INSERT OR UPDATE ON public."StockEvidenceLine" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_quantity_scale_guard();


--
-- Name: StockReservation trg_stock_reservation_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_reservation_append_only BEFORE DELETE OR UPDATE ON public."StockReservation" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_reservation_append_only();


--
-- Name: StockReservationEvidence trg_stock_reservation_ceiling; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_reservation_ceiling BEFORE INSERT OR UPDATE ON public."StockReservationEvidence" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_reservation_ceiling();


--
-- Name: StockReservationEvidence trg_stock_reservation_evidence_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_reservation_evidence_append_only BEFORE DELETE OR UPDATE ON public."StockReservationEvidence" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_reservation_evidence_append_only();


--
-- Name: StockReservation trg_stock_reservation_position_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_reservation_position_guard BEFORE INSERT OR UPDATE ON public."StockReservation" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_reservation_position_guard();


--
-- Name: StockIdentifiedUnitConfigurationVersion trg_stock_unit_config_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_unit_config_append_only BEFORE DELETE OR UPDATE ON public."StockIdentifiedUnitConfigurationVersion" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_unit_config_append_only();


--
-- Name: StockIdentifiedUnitCurrentConfiguration trg_stock_unit_config_current_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stock_unit_config_current_guard BEFORE INSERT OR UPDATE ON public."StockIdentifiedUnitCurrentConfiguration" FOR EACH ROW EXECUTE FUNCTION public.fn_stock_unit_config_current_guard();


--
-- Name: xadmin_import_run trg_xadmin_import_run_identity_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_xadmin_import_run_identity_immutable BEFORE UPDATE ON public.xadmin_import_run FOR EACH ROW EXECUTE FUNCTION public.fn_xadmin_source_identity_immutable();


--
-- Name: xadmin_import_run trg_xadmin_import_run_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_xadmin_import_run_no_delete BEFORE DELETE ON public.xadmin_import_run FOR EACH ROW EXECUTE FUNCTION public.fn_article_catalog_no_hard_delete();


--
-- Name: xadmin_article_mapping trg_xadmin_mapping_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_xadmin_mapping_no_delete BEFORE DELETE ON public.xadmin_article_mapping FOR EACH ROW EXECUTE FUNCTION public.fn_article_catalog_no_hard_delete();


--
-- Name: xadmin_article_stage_row trg_xadmin_stage_row_identity_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_xadmin_stage_row_identity_immutable BEFORE UPDATE ON public.xadmin_article_stage_row FOR EACH ROW EXECUTE FUNCTION public.fn_xadmin_source_identity_immutable();


--
-- Name: xadmin_article_stage_row trg_xadmin_stage_row_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_xadmin_stage_row_no_delete BEFORE DELETE ON public.xadmin_article_stage_row FOR EACH ROW EXECUTE FUNCTION public.fn_article_catalog_no_hard_delete();


--
-- Name: AuditEvent AuditEvent_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditEvent"
    ADD CONSTRAINT "AuditEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditEvent AuditEvent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditEvent"
    ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Branch Branch_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Branch"
    ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Company Company_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContactAddress ContactAddress_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactAddress"
    ADD CONSTRAINT "ContactAddress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContactAddress ContactAddress_contactId_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactAddress"
    ADD CONSTRAINT "ContactAddress_contactId_companyId_fkey" FOREIGN KEY ("contactId", "companyId") REFERENCES public."ContactCompanyLink"("contactId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContactAddress ContactAddress_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactAddress"
    ADD CONSTRAINT "ContactAddress_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContactCompanyLink ContactCompanyLink_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactCompanyLink"
    ADD CONSTRAINT "ContactCompanyLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContactCompanyLink ContactCompanyLink_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactCompanyLink"
    ADD CONSTRAINT "ContactCompanyLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContactGroupMembership ContactGroupMembership_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactGroupMembership"
    ADD CONSTRAINT "ContactGroupMembership_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContactGroupMembership ContactGroupMembership_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactGroupMembership"
    ADD CONSTRAINT "ContactGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."ContactGroup"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContactGroup ContactGroup_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactGroup"
    ADD CONSTRAINT "ContactGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DigitalReceiptAccess DigitalReceiptAccess_receiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptAccess"
    ADD CONSTRAINT "DigitalReceiptAccess_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES public."DigitalReceipt"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DigitalReceiptAccess DigitalReceiptAccess_supersededByAccessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptAccess"
    ADD CONSTRAINT "DigitalReceiptAccess_supersededByAccessId_fkey" FOREIGN KEY ("supersededByAccessId") REFERENCES public."DigitalReceiptAccess"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DigitalReceiptArtifact DigitalReceiptArtifact_accessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptArtifact"
    ADD CONSTRAINT "DigitalReceiptArtifact_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES public."DigitalReceiptAccess"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DigitalReceiptArtifact DigitalReceiptArtifact_receiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptArtifact"
    ADD CONSTRAINT "DigitalReceiptArtifact_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES public."DigitalReceipt"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DigitalReceiptArtifact DigitalReceiptArtifact_snapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptArtifact"
    ADD CONSTRAINT "DigitalReceiptArtifact_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES public."DigitalReceiptSnapshot"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DigitalReceiptEvent DigitalReceiptEvent_accessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptEvent"
    ADD CONSTRAINT "DigitalReceiptEvent_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES public."DigitalReceiptAccess"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DigitalReceiptEvent DigitalReceiptEvent_artifactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptEvent"
    ADD CONSTRAINT "DigitalReceiptEvent_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES public."DigitalReceiptArtifact"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DigitalReceiptEvent DigitalReceiptEvent_receiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptEvent"
    ADD CONSTRAINT "DigitalReceiptEvent_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES public."DigitalReceipt"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DigitalReceiptEvent DigitalReceiptEvent_snapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptEvent"
    ADD CONSTRAINT "DigitalReceiptEvent_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES public."DigitalReceiptSnapshot"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DigitalReceiptSnapshot DigitalReceiptSnapshot_receiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceiptSnapshot"
    ADD CONSTRAINT "DigitalReceiptSnapshot_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES public."DigitalReceipt"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DigitalReceipt DigitalReceipt_activeAccessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceipt"
    ADD CONSTRAINT "DigitalReceipt_activeAccessId_fkey" FOREIGN KEY ("activeAccessId") REFERENCES public."DigitalReceiptAccess"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DigitalReceipt DigitalReceipt_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceipt"
    ADD CONSTRAINT "DigitalReceipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DigitalReceipt DigitalReceipt_latestSnapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceipt"
    ADD CONSTRAINT "DigitalReceipt_latestSnapshotId_fkey" FOREIGN KEY ("latestSnapshotId") REFERENCES public."DigitalReceiptSnapshot"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DigitalReceipt DigitalReceipt_surgeryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DigitalReceipt"
    ADD CONSTRAINT "DigitalReceipt_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES public."Surgery"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InternalNotification InternalNotification_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InternalNotification"
    ADD CONSTRAINT "InternalNotification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InternalNotification InternalNotification_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InternalNotification"
    ADD CONSTRAINT "InternalNotification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InternalNotification InternalNotification_recipientUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InternalNotification"
    ADD CONSTRAINT "InternalNotification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InternalNotification InternalNotification_surgeryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InternalNotification"
    ADD CONSTRAINT "InternalNotification_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES public."Surgery"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Remito Remito_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remito"
    ADD CONSTRAINT "Remito_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Remito Remito_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remito"
    ADD CONSTRAINT "Remito_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Remito Remito_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remito"
    ADD CONSTRAINT "Remito_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Remito Remito_issuedBranchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remito"
    ADD CONSTRAINT "Remito_issuedBranchId_fkey" FOREIGN KEY ("issuedBranchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Remito Remito_surgeryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remito"
    ADD CONSTRAINT "Remito_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES public."Surgery"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Remito Remito_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Remito"
    ADD CONSTRAINT "Remito_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SeguimientoEntry SeguimientoEntry_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SeguimientoEntry"
    ADD CONSTRAINT "SeguimientoEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SeguimientoEntry SeguimientoEntry_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SeguimientoEntry"
    ADD CONSTRAINT "SeguimientoEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SeguimientoEntry SeguimientoEntry_surgeryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SeguimientoEntry"
    ADD CONSTRAINT "SeguimientoEntry_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES public."Surgery"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SurgeryContactAssignment SurgeryContactAssignment_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryContactAssignment"
    ADD CONSTRAINT "SurgeryContactAssignment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurgeryContactAssignment SurgeryContactAssignment_surgeryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryContactAssignment"
    ADD CONSTRAINT "SurgeryContactAssignment_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES public."Surgery"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Surgery Surgery_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Surgery"
    ADD CONSTRAINT "Surgery_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Surgery Surgery_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Surgery"
    ADD CONSTRAINT "Surgery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Surgery Surgery_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Surgery"
    ADD CONSTRAINT "Surgery_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Surgery Surgery_institutionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Surgery"
    ADD CONSTRAINT "Surgery_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Surgery Surgery_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Surgery"
    ADD CONSTRAINT "Surgery_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Surgery Surgery_payerContactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Surgery"
    ADD CONSTRAINT "Surgery_payerContactId_fkey" FOREIGN KEY ("payerContactId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserCompanyAccess UserCompanyAccess_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserCompanyAccess"
    ADD CONSTRAINT "UserCompanyAccess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserCompanyAccess UserCompanyAccess_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserCompanyAccess"
    ADD CONSTRAINT "UserCompanyAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserModuleViewPreference UserModuleViewPreference_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserModuleViewPreference"
    ADD CONSTRAINT "UserModuleViewPreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserModuleViewPreference UserModuleViewPreference_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserModuleViewPreference"
    ADD CONSTRAINT "UserModuleViewPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VehicleLatestPosition VehicleLatestPosition_companyId_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VehicleLatestPosition"
    ADD CONSTRAINT "VehicleLatestPosition_companyId_vehicleId_fkey" FOREIGN KEY ("companyId", "vehicleId") REFERENCES public."Vehicle"("companyId", id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Vehicle Vehicle_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: consumo consumo_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo
    ADD CONSTRAINT "consumo_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: consumo consumo_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo
    ADD CONSTRAINT "consumo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: consumo_item consumo_item_remitoItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo_item
    ADD CONSTRAINT "consumo_item_remitoItemId_fkey" FOREIGN KEY ("remitoItemId") REFERENCES public."RemitoItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: consumo consumo_remitoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo
    ADD CONSTRAINT "consumo_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES public."Remito"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: consumo consumo_surgeryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo
    ADD CONSTRAINT "consumo_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES public."Surgery"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: consumo consumo_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo
    ADD CONSTRAINT "consumo_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: devolucion devolucion_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion
    ADD CONSTRAINT "devolucion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: devolucion devolucion_consumoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion
    ADD CONSTRAINT "devolucion_consumoId_fkey" FOREIGN KEY ("consumoId") REFERENCES public.consumo(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: devolucion devolucion_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion
    ADD CONSTRAINT "devolucion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: devolucion_item devolucion_item_consumoItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_item
    ADD CONSTRAINT "devolucion_item_consumoItemId_fkey" FOREIGN KEY ("consumoItemId") REFERENCES public.consumo_item(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: devolucion_item devolucion_item_remitoItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_item
    ADD CONSTRAINT "devolucion_item_remitoItemId_fkey" FOREIGN KEY ("remitoItemId") REFERENCES public."RemitoItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: devolucion devolucion_remitoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion
    ADD CONSTRAINT "devolucion_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES public."Remito"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: devolucion devolucion_surgeryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion
    ADD CONSTRAINT "devolucion_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES public."Surgery"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: devolucion devolucion_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion
    ADD CONSTRAINT "devolucion_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Article fk_article_brand; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT fk_article_brand FOREIGN KEY ("organizationId", brand_id) REFERENCES public.brand(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Article fk_article_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT fk_article_category FOREIGN KEY ("organizationId", category_id) REFERENCES public.product_category(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Article fk_article_clinical_family; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT fk_article_clinical_family FOREIGN KEY ("organizationId", clinical_family_id) REFERENCES public.clinical_family(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ArticleIdentifier fk_article_identifier_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ArticleIdentifier"
    ADD CONSTRAINT fk_article_identifier_article FOREIGN KEY ("organizationId", "articleId") REFERENCES public."Article"("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ArticleIdentifier fk_article_identifier_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ArticleIdentifier"
    ADD CONSTRAINT fk_article_identifier_supplier FOREIGN KEY ("supplierId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Article fk_article_manufacturer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT fk_article_manufacturer FOREIGN KEY ("organizationId", manufacturer_id) REFERENCES public.manufacturer(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Article fk_article_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT fk_article_organization FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Article fk_article_product_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT fk_article_product_line FOREIGN KEY ("organizationId", product_line_id) REFERENCES public.product_line(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ArticleSupplierMapping fk_article_supplier_mapping_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ArticleSupplierMapping"
    ADD CONSTRAINT fk_article_supplier_mapping_article FOREIGN KEY ("organizationId", "articleId") REFERENCES public."Article"("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ArticleSupplierMapping fk_article_supplier_mapping_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ArticleSupplierMapping"
    ADD CONSTRAINT fk_article_supplier_mapping_supplier FOREIGN KEY ("supplierId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ArticleTraceabilityPolicy fk_article_trace_policy_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ArticleTraceabilityPolicy"
    ADD CONSTRAINT fk_article_trace_policy_article FOREIGN KEY ("organizationId", "articleId") REFERENCES public."Article"("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequestRecipientAssignment fk_availability_assignment_assigned_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequestRecipientAssignment"
    ADD CONSTRAINT fk_availability_assignment_assigned_by FOREIGN KEY ("assignedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequestRecipientAssignment fk_availability_assignment_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequestRecipientAssignment"
    ADD CONSTRAINT fk_availability_assignment_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequestRecipientAssignment fk_availability_assignment_request; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequestRecipientAssignment"
    ADD CONSTRAINT fk_availability_assignment_request FOREIGN KEY ("companyId", "availabilityRequestId") REFERENCES public."AvailabilityRequest"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequestRecipientAssignment fk_availability_assignment_revoked_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequestRecipientAssignment"
    ADD CONSTRAINT fk_availability_assignment_revoked_by FOREIGN KEY ("revokedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequestRecipientAssignment fk_availability_assignment_user_access; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequestRecipientAssignment"
    ADD CONSTRAINT fk_availability_assignment_user_access FOREIGN KEY ("userId", "companyId") REFERENCES public."UserCompanyAccess"("userId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityCapabilityGrant fk_availability_capability_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityCapabilityGrant"
    ADD CONSTRAINT fk_availability_capability_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityCapabilityGrant fk_availability_capability_granted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityCapabilityGrant"
    ADD CONSTRAINT fk_availability_capability_granted_by FOREIGN KEY ("grantedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityCapabilityGrant fk_availability_capability_revoked_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityCapabilityGrant"
    ADD CONSTRAINT fk_availability_capability_revoked_by FOREIGN KEY ("revokedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityCapabilityGrant fk_availability_capability_user_access; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityCapabilityGrant"
    ADD CONSTRAINT fk_availability_capability_user_access FOREIGN KEY ("userId", "companyId") REFERENCES public."UserCompanyAccess"("userId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityCommand fk_availability_command_actor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityCommand"
    ADD CONSTRAINT fk_availability_command_actor FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityCommand fk_availability_command_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityCommand"
    ADD CONSTRAINT fk_availability_command_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityCommand fk_availability_command_request; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityCommand"
    ADD CONSTRAINT fk_availability_command_request FOREIGN KEY ("companyId", "surgeryId", "requestId") REFERENCES public."AvailabilityRequest"("companyId", "surgeryId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityCommand fk_availability_command_surgery; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityCommand"
    ADD CONSTRAINT fk_availability_command_surgery FOREIGN KEY ("companyId", "surgeryId") REFERENCES public."Surgery"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequest fk_availability_request_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequest"
    ADD CONSTRAINT fk_availability_request_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequest fk_availability_request_completer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequest"
    ADD CONSTRAINT fk_availability_request_completer FOREIGN KEY ("completedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequest fk_availability_request_completion_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequest"
    ADD CONSTRAINT fk_availability_request_completion_command FOREIGN KEY ("companyId", "completionCommandId") REFERENCES public."AvailabilityCommand"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequest fk_availability_request_creator_audit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequest"
    ADD CONSTRAINT fk_availability_request_creator_audit FOREIGN KEY ("companyId", "creatorAuditEventId") REFERENCES public."AuditEvent"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequest fk_availability_request_creator_snapshot_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequest"
    ADD CONSTRAINT fk_availability_request_creator_snapshot_user FOREIGN KEY ("creatorUserIdSnapshot") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequest fk_availability_request_pivot_snapshot_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequest"
    ADD CONSTRAINT fk_availability_request_pivot_snapshot_user FOREIGN KEY ("pivotUserIdAtCreation") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequest fk_availability_request_requester; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequest"
    ADD CONSTRAINT fk_availability_request_requester FOREIGN KEY ("requesterUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AvailabilityRequest fk_availability_request_surgery; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AvailabilityRequest"
    ADD CONSTRAINT fk_availability_request_surgery FOREIGN KEY ("companyId", "surgeryId") REFERENCES public."Surgery"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: brand fk_brand_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand
    ADD CONSTRAINT fk_brand_organization FOREIGN KEY (organization_id) REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_assignment fk_ca_assigned_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_assignment
    ADD CONSTRAINT fk_ca_assigned_by FOREIGN KEY (assigned_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_assignment fk_ca_box_identified_unit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_assignment
    ADD CONSTRAINT fk_ca_box_identified_unit FOREIGN KEY (company_id, box_article_id, box_identified_unit_id) REFERENCES public."StockIdentifiedUnit"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_assignment fk_ca_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_assignment
    ADD CONSTRAINT fk_ca_company FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_assignment fk_ca_end_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_assignment
    ADD CONSTRAINT fk_ca_end_command FOREIGN KEY (company_id, end_command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_assignment fk_ca_ended_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_assignment
    ADD CONSTRAINT fk_ca_ended_by FOREIGN KEY (ended_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_assignment fk_ca_start_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_assignment
    ADD CONSTRAINT fk_ca_start_command FOREIGN KEY (company_id, start_command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_assignment fk_ca_surgery; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_assignment
    ADD CONSTRAINT fk_ca_surgery FOREIGN KEY (company_id, surgery_id) REFERENCES public."Surgery"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: catalog_alias fk_catalog_alias_brand; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_alias
    ADD CONSTRAINT fk_catalog_alias_brand FOREIGN KEY (organization_id, brand_id) REFERENCES public.brand(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: catalog_alias fk_catalog_alias_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_alias
    ADD CONSTRAINT fk_catalog_alias_category FOREIGN KEY (organization_id, category_id) REFERENCES public.product_category(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: catalog_alias fk_catalog_alias_clinical_family; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_alias
    ADD CONSTRAINT fk_catalog_alias_clinical_family FOREIGN KEY (organization_id, clinical_family_id) REFERENCES public.clinical_family(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: catalog_alias fk_catalog_alias_manufacturer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_alias
    ADD CONSTRAINT fk_catalog_alias_manufacturer FOREIGN KEY (organization_id, manufacturer_id) REFERENCES public.manufacturer(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: catalog_alias fk_catalog_alias_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_alias
    ADD CONSTRAINT fk_catalog_alias_organization FOREIGN KEY (organization_id) REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: catalog_alias fk_catalog_alias_product_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_alias
    ADD CONSTRAINT fk_catalog_alias_product_line FOREIGN KEY (organization_id, product_line_id) REFERENCES public.product_line(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_box_formula fk_cbf_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_box_formula
    ADD CONSTRAINT fk_cbf_company FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_box_formula fk_cbf_current_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_box_formula
    ADD CONSTRAINT fk_cbf_current_version FOREIGN KEY (company_id, id, current_version_id) REFERENCES public.cajas_formula_version(company_id, formula_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_box_formula fk_cbf_eligibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_box_formula
    ADD CONSTRAINT fk_cbf_eligibility FOREIGN KEY (company_id, box_article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control fk_cc_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control
    ADD CONSTRAINT fk_cc_accepted_by FOREIGN KEY (accepted_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control fk_cc_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control
    ADD CONSTRAINT fk_cc_assignment FOREIGN KEY (company_id, assignment_id, box_article_id) REFERENCES public.cajas_assignment(company_id, id, box_article_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control fk_cc_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control
    ADD CONSTRAINT fk_cc_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control fk_cc_formula_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control
    ADD CONSTRAINT fk_cc_formula_version FOREIGN KEY (company_id, formula_version_id, box_article_id) REFERENCES public.cajas_formula_version(company_id, id, box_article_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control fk_cc_prior; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control
    ADD CONSTRAINT fk_cc_prior FOREIGN KEY (company_id, assignment_id, prior_control_id) REFERENCES public.cajas_control(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_confirmation fk_ccc_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_confirmation
    ADD CONSTRAINT fk_ccc_accepted_by FOREIGN KEY (accepted_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_confirmation fk_ccc_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_confirmation
    ADD CONSTRAINT fk_ccc_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_confirmation fk_ccc_consumo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_confirmation
    ADD CONSTRAINT fk_ccc_consumo FOREIGN KEY (company_id, consumo_id, remito_id) REFERENCES public.consumo("companyId", id, "remitoId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_confirmation fk_ccc_corrects; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_confirmation
    ADD CONSTRAINT fk_ccc_corrects FOREIGN KEY (company_id, corrects_confirmation_id, consumo_id, dispatch_id) REFERENCES public.cajas_consumption_confirmation(company_id, id, consumo_id, dispatch_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_confirmation fk_ccc_dispatch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_confirmation
    ADD CONSTRAINT fk_ccc_dispatch FOREIGN KEY (company_id, dispatch_id, remito_id) REFERENCES public.cajas_dispatch(company_id, id, remito_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change fk_cchg_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change
    ADD CONSTRAINT fk_cchg_accepted_by FOREIGN KEY (accepted_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change fk_cchg_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change
    ADD CONSTRAINT fk_cchg_assignment FOREIGN KEY (company_id, assignment_id) REFERENCES public.cajas_assignment(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change fk_cchg_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change
    ADD CONSTRAINT fk_cchg_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change_line fk_cchl_change; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change_line
    ADD CONSTRAINT fk_cchl_change FOREIGN KEY (company_id, assignment_id, change_id) REFERENCES public.cajas_composition_change(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change_line fk_cchl_preparation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change_line
    ADD CONSTRAINT fk_cchl_preparation FOREIGN KEY (company_id, assignment_id, preparation_id) REFERENCES public.cajas_preparation(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change_line fk_cchl_prior_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change_line
    ADD CONSTRAINT fk_cchl_prior_article FOREIGN KEY (company_id, prior_article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change_line fk_cchl_prior_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change_line
    ADD CONSTRAINT fk_cchl_prior_line FOREIGN KEY (company_id, preparation_id, prior_preparation_line_id) REFERENCES public.cajas_preparation_line(company_id, preparation_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change_line fk_cchl_prior_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change_line
    ADD CONSTRAINT fk_cchl_prior_position FOREIGN KEY (company_id, prior_article_id, prior_stock_position_id) REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change_line fk_cchl_result_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change_line
    ADD CONSTRAINT fk_cchl_result_article FOREIGN KEY (company_id, resulting_article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change_line fk_cchl_result_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change_line
    ADD CONSTRAINT fk_cchl_result_line FOREIGN KEY (company_id, preparation_id, resulting_preparation_line_id) REFERENCES public.cajas_preparation_line(company_id, preparation_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_composition_change_line fk_cchl_result_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_composition_change_line
    ADD CONSTRAINT fk_cchl_result_position FOREIGN KEY (company_id, resulting_article_id, resulting_stock_position_id) REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control_line fk_ccl_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control_line
    ADD CONSTRAINT fk_ccl_article FOREIGN KEY (company_id, article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control_line fk_ccl_control; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control_line
    ADD CONSTRAINT fk_ccl_control FOREIGN KEY (company_id, assignment_id, control_id) REFERENCES public.cajas_control(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control_line fk_ccl_expected_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control_line
    ADD CONSTRAINT fk_ccl_expected_line FOREIGN KEY (company_id, expected_formula_line_id) REFERENCES public.cajas_formula_line(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control_line fk_ccl_source_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control_line
    ADD CONSTRAINT fk_ccl_source_line FOREIGN KEY (company_id, source_preparation_id, source_preparation_line_id) REFERENCES public.cajas_preparation_line(company_id, preparation_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control_line fk_ccl_source_preparation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control_line
    ADD CONSTRAINT fk_ccl_source_preparation FOREIGN KEY (company_id, assignment_id, source_preparation_id) REFERENCES public.cajas_preparation(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_control_line fk_ccl_stock_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_control_line
    ADD CONSTRAINT fk_ccl_stock_position FOREIGN KEY (company_id, article_id, stock_position_id) REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_line fk_ccln_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_line
    ADD CONSTRAINT fk_ccln_article FOREIGN KEY (company_id, article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_line fk_ccln_confirmation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_line
    ADD CONSTRAINT fk_ccln_confirmation FOREIGN KEY (company_id, consumption_confirmation_id, consumo_id, dispatch_id) REFERENCES public.cajas_consumption_confirmation(company_id, id, consumo_id, dispatch_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_line fk_ccln_consumo_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_line
    ADD CONSTRAINT fk_ccln_consumo_item FOREIGN KEY (company_id, consumo_id, consumo_item_id) REFERENCES public.consumo_item(company_id, "consumoId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_line fk_ccln_dispatch_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_line
    ADD CONSTRAINT fk_ccln_dispatch_line FOREIGN KEY (company_id, dispatch_id, dispatch_line_id) REFERENCES public.cajas_dispatch_line(company_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_line fk_ccln_recognized_disp; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_line
    ADD CONSTRAINT fk_ccln_recognized_disp FOREIGN KEY (company_id, dispatch_line_id, recognized_return_disposition_id) REFERENCES public.cajas_disposition(company_id, dispatch_line_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_consumption_line fk_ccln_stock_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_consumption_line
    ADD CONSTRAINT fk_ccln_stock_position FOREIGN KEY (company_id, article_id, stock_position_id) REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_condition_projection fk_ccp_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_condition_projection
    ADD CONSTRAINT fk_ccp_assignment FOREIGN KEY (company_id, assignment_id, box_identified_unit_id) REFERENCES public.cajas_assignment(company_id, id, box_identified_unit_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_condition_projection fk_ccp_box_identified_unit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_condition_projection
    ADD CONSTRAINT fk_ccp_box_identified_unit FOREIGN KEY (company_id, box_identified_unit_id) REFERENCES public."StockIdentifiedUnit"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_difference fk_cd_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference
    ADD CONSTRAINT fk_cd_assignment FOREIGN KEY (company_id, assignment_id) REFERENCES public.cajas_assignment(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_difference fk_cd_control_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference
    ADD CONSTRAINT fk_cd_control_line FOREIGN KEY (company_id, assignment_id, control_line_id) REFERENCES public.cajas_control_line(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_difference fk_cd_dispatch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference
    ADD CONSTRAINT fk_cd_dispatch FOREIGN KEY (company_id, origin_dispatch_id, assignment_id, origin_remito_id) REFERENCES public.cajas_dispatch(company_id, id, assignment_id, remito_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_difference fk_cd_dispatch_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference
    ADD CONSTRAINT fk_cd_dispatch_line FOREIGN KEY (company_id, origin_dispatch_id, dispatch_line_id) REFERENCES public.cajas_dispatch_line(company_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_difference fk_cd_opened_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference
    ADD CONSTRAINT fk_cd_opened_by FOREIGN KEY (opened_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_difference fk_cd_return_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference
    ADD CONSTRAINT fk_cd_return_line FOREIGN KEY (company_id, return_confirmation_id, origin_dispatch_id, return_line_id) REFERENCES public.cajas_return_line(company_id, return_confirmation_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_accounting fk_cda_dispatch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_accounting
    ADD CONSTRAINT fk_cda_dispatch FOREIGN KEY (company_id, dispatch_id) REFERENCES public.cajas_dispatch(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_article FOREIGN KEY (company_id, article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_consumption_confirmation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_consumption_confirmation FOREIGN KEY (company_id, consumption_confirmation_id) REFERENCES public.cajas_consumption_confirmation(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_consumption_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_consumption_line FOREIGN KEY (company_id, consumption_confirmation_id, dispatch_id, consumption_line_id) REFERENCES public.cajas_consumption_line(company_id, consumption_confirmation_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_dispatch_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_dispatch_line FOREIGN KEY (company_id, dispatch_id, dispatch_line_id) REFERENCES public.cajas_dispatch_line(company_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_neutralizes; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_neutralizes FOREIGN KEY (company_id, dispatch_line_id, neutralizes_disposition_id) REFERENCES public.cajas_disposition(company_id, dispatch_line_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_return_confirmation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_return_confirmation FOREIGN KEY (company_id, return_confirmation_id) REFERENCES public.cajas_return_confirmation(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_return_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_return_line FOREIGN KEY (company_id, return_confirmation_id, dispatch_id, return_line_id) REFERENCES public.cajas_return_line(company_id, return_confirmation_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_stock_evidence_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_stock_evidence_owner FOREIGN KEY (company_id, stock_evidence_line_id) REFERENCES public."StockEvidenceLine"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_stock_evidence_position_guard; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_stock_evidence_position_guard FOREIGN KEY (company_id, article_id, stock_position_id, stock_evidence_line_id) REFERENCES public."StockEvidenceLine"("companyId", "articleId", "fromPositionId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_disposition fk_cdis_stock_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_disposition
    ADD CONSTRAINT fk_cdis_stock_position FOREIGN KEY (company_id, article_id, stock_position_id) REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line fk_cdl_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line
    ADD CONSTRAINT fk_cdl_article FOREIGN KEY (company_id, article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line fk_cdl_control_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line
    ADD CONSTRAINT fk_cdl_control_line FOREIGN KEY (company_id, assignment_id, source_control_line_id) REFERENCES public.cajas_control_line(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line fk_cdl_dispatch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line
    ADD CONSTRAINT fk_cdl_dispatch FOREIGN KEY (company_id, dispatch_id, assignment_id, remito_id) REFERENCES public.cajas_dispatch(company_id, id, assignment_id, remito_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line fk_cdl_neutralizes; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line
    ADD CONSTRAINT fk_cdl_neutralizes FOREIGN KEY (company_id, dispatch_id, neutralizes_dispatch_line_id) REFERENCES public.cajas_dispatch_line(company_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line fk_cdl_prep_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line
    ADD CONSTRAINT fk_cdl_prep_line FOREIGN KEY (company_id, source_preparation_id, source_preparation_line_id) REFERENCES public.cajas_preparation_line(company_id, preparation_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line fk_cdl_remito_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line
    ADD CONSTRAINT fk_cdl_remito_item FOREIGN KEY (company_id, remito_id, remito_item_id) REFERENCES public."RemitoItem"(company_id, "remitoId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line fk_cdl_source_preparation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line
    ADD CONSTRAINT fk_cdl_source_preparation FOREIGN KEY (company_id, assignment_id, source_preparation_id) REFERENCES public.cajas_preparation(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line fk_cdl_stock_evidence; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line
    ADD CONSTRAINT fk_cdl_stock_evidence FOREIGN KEY (company_id, article_id, stock_position_id, stock_evidence_line_id) REFERENCES public."StockEvidenceLine"("companyId", "articleId", "fromPositionId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line fk_cdl_stock_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line
    ADD CONSTRAINT fk_cdl_stock_position FOREIGN KEY (company_id, article_id, stock_position_id) REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line_accounting fk_cdla_accounting; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line_accounting
    ADD CONSTRAINT fk_cdla_accounting FOREIGN KEY (company_id, accounting_id, dispatch_id) REFERENCES public.cajas_dispatch_accounting(company_id, id, dispatch_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch_line_accounting fk_cdla_dispatch_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch_line_accounting
    ADD CONSTRAINT fk_cdla_dispatch_line FOREIGN KEY (company_id, dispatch_id, dispatch_line_id) REFERENCES public.cajas_dispatch_line(company_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch fk_cdp_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch
    ADD CONSTRAINT fk_cdp_accepted_by FOREIGN KEY (accepted_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch fk_cdp_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch
    ADD CONSTRAINT fk_cdp_assignment FOREIGN KEY (company_id, assignment_id) REFERENCES public.cajas_assignment(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch fk_cdp_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch
    ADD CONSTRAINT fk_cdp_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch fk_cdp_control; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch
    ADD CONSTRAINT fk_cdp_control FOREIGN KEY (company_id, assignment_id, source_control_id) REFERENCES public.cajas_control(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch fk_cdp_corrects; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch
    ADD CONSTRAINT fk_cdp_corrects FOREIGN KEY (company_id, corrects_dispatch_id, assignment_id, remito_id) REFERENCES public.cajas_dispatch(company_id, id, assignment_id, remito_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_dispatch fk_cdp_remito; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_dispatch
    ADD CONSTRAINT fk_cdp_remito FOREIGN KEY (company_id, remito_id) REFERENCES public."Remito"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_difference_resolution fk_cdr_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference_resolution
    ADD CONSTRAINT fk_cdr_accepted_by FOREIGN KEY (accepted_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_difference_resolution fk_cdr_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference_resolution
    ADD CONSTRAINT fk_cdr_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_difference_resolution fk_cdr_difference; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_difference_resolution
    ADD CONSTRAINT fk_cdr_difference FOREIGN KEY (company_id, difference_id) REFERENCES public.cajas_difference(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_formula_line fk_cfl_eligibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_formula_line
    ADD CONSTRAINT fk_cfl_eligibility FOREIGN KEY (company_id, article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_formula_line fk_cfl_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_formula_line
    ADD CONSTRAINT fk_cfl_version FOREIGN KEY (company_id, formula_version_id) REFERENCES public.cajas_formula_version(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_formula_version fk_cfv_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_formula_version
    ADD CONSTRAINT fk_cfv_accepted_by FOREIGN KEY (accepted_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_formula_version fk_cfv_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_formula_version
    ADD CONSTRAINT fk_cfv_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_formula_version fk_cfv_formula; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_formula_version
    ADD CONSTRAINT fk_cfv_formula FOREIGN KEY (company_id, formula_id, box_article_id) REFERENCES public.cajas_box_formula(company_id, id, box_article_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_formula_version fk_cfv_previous; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_formula_version
    ADD CONSTRAINT fk_cfv_previous FOREIGN KEY (company_id, formula_id, previous_version_id) REFERENCES public.cajas_formula_version(company_id, formula_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: clinical_family fk_clinical_family_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_family
    ADD CONSTRAINT fk_clinical_family_organization FOREIGN KEY (organization_id) REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_maintenance_case fk_cmc_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_maintenance_case
    ADD CONSTRAINT fk_cmc_article FOREIGN KEY (company_id, article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_maintenance_case fk_cmc_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_maintenance_case
    ADD CONSTRAINT fk_cmc_company FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_maintenance_case fk_cmc_opened_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_maintenance_case
    ADD CONSTRAINT fk_cmc_opened_by FOREIGN KEY (opened_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_maintenance_case fk_cmc_unit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_maintenance_case
    ADD CONSTRAINT fk_cmc_unit FOREIGN KEY (company_id, box_identified_unit_id) REFERENCES public."StockIdentifiedUnit"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_maintenance_transition fk_cmt_actor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_maintenance_transition
    ADD CONSTRAINT fk_cmt_actor FOREIGN KEY (accepted_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_maintenance_transition fk_cmt_audit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_maintenance_transition
    ADD CONSTRAINT fk_cmt_audit FOREIGN KEY (company_id, audit_event_id) REFERENCES public."AuditEvent"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_maintenance_transition fk_cmt_case; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_maintenance_transition
    ADD CONSTRAINT fk_cmt_case FOREIGN KEY (company_id, case_id) REFERENCES public.cajas_maintenance_case(company_id, id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cajas_maintenance_transition fk_cmt_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_maintenance_transition
    ADD CONSTRAINT fk_cmt_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompanyOperationalAssignee fk_company_operational_assignee_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompanyOperationalAssignee"
    ADD CONSTRAINT fk_company_operational_assignee_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompanyOperationalAssignee fk_company_operational_assignee_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompanyOperationalAssignee"
    ADD CONSTRAINT fk_company_operational_assignee_created_by FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompanyOperationalAssignee fk_company_operational_assignee_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompanyOperationalAssignee"
    ADD CONSTRAINT fk_company_operational_assignee_updated_by FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompanyOperationalAssignee fk_company_operational_assignee_user_access; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CompanyOperationalAssignee"
    ADD CONSTRAINT fk_company_operational_assignee_user_access FOREIGN KEY ("userId", "companyId") REFERENCES public."UserCompanyAccess"("userId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: consumo_item fk_consumo_item_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo_item
    ADD CONSTRAINT fk_consumo_item_owner FOREIGN KEY (company_id, "consumoId") REFERENCES public.consumo("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_preparation fk_cp_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_preparation
    ADD CONSTRAINT fk_cp_assignment FOREIGN KEY (company_id, assignment_id, box_article_id) REFERENCES public.cajas_assignment(company_id, id, box_article_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_preparation fk_cp_formula_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_preparation
    ADD CONSTRAINT fk_cp_formula_version FOREIGN KEY (company_id, formula_version_id, box_article_id) REFERENCES public.cajas_formula_version(company_id, id, box_article_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_preparation fk_cp_last_change; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_preparation
    ADD CONSTRAINT fk_cp_last_change FOREIGN KEY (company_id, assignment_id, last_accepted_change_id) REFERENCES public.cajas_composition_change(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_preparation fk_cp_latest_control; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_preparation
    ADD CONSTRAINT fk_cp_latest_control FOREIGN KEY (company_id, assignment_id, latest_control_id) REFERENCES public.cajas_control(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_phase_d_reconciliation_event fk_cpdre_audit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_reconciliation_event
    ADD CONSTRAINT fk_cpdre_audit FOREIGN KEY (company_id, audit_event_id) REFERENCES public."AuditEvent"("companyId", id) ON DELETE RESTRICT;


--
-- Name: cajas_phase_d_reconciliation_event fk_cpdre_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_reconciliation_event
    ADD CONSTRAINT fk_cpdre_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON DELETE RESTRICT;


--
-- Name: cajas_phase_d_reconciliation_event fk_cpdre_dispatch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_phase_d_reconciliation_event
    ADD CONSTRAINT fk_cpdre_dispatch FOREIGN KEY (company_id, dispatch_id) REFERENCES public.cajas_dispatch(company_id, id) ON DELETE RESTRICT;


--
-- Name: cajas_preparation_line fk_cpl_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_preparation_line
    ADD CONSTRAINT fk_cpl_article FOREIGN KEY (company_id, article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_preparation_line fk_cpl_expected_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_preparation_line
    ADD CONSTRAINT fk_cpl_expected_line FOREIGN KEY (company_id, formula_version_id, expected_formula_line_id) REFERENCES public.cajas_formula_line(company_id, formula_version_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_preparation_line fk_cpl_preparation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_preparation_line
    ADD CONSTRAINT fk_cpl_preparation FOREIGN KEY (company_id, preparation_id, formula_version_id) REFERENCES public.cajas_preparation(company_id, id, formula_version_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_preparation_line fk_cpl_stock_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_preparation_line
    ADD CONSTRAINT fk_cpl_stock_position FOREIGN KEY (company_id, article_id, stock_position_id) REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_reservation_correlation fk_crc_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_reservation_correlation
    ADD CONSTRAINT fk_crc_assignment FOREIGN KEY (company_id, assignment_id) REFERENCES public.cajas_assignment(company_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_reservation_correlation fk_crc_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_reservation_correlation
    ADD CONSTRAINT fk_crc_company FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_reservation_correlation fk_crc_prep_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_reservation_correlation
    ADD CONSTRAINT fk_crc_prep_line FOREIGN KEY (company_id, preparation_id, preparation_line_id) REFERENCES public.cajas_preparation_line(company_id, preparation_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_reservation_correlation fk_crc_preparation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_reservation_correlation
    ADD CONSTRAINT fk_crc_preparation FOREIGN KEY (company_id, assignment_id, preparation_id) REFERENCES public.cajas_preparation(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_reservation_correlation fk_crc_replaces; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_reservation_correlation
    ADD CONSTRAINT fk_crc_replaces FOREIGN KEY (company_id, assignment_id, replaces_correlation_id) REFERENCES public.cajas_reservation_correlation(company_id, assignment_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_reservation_correlation fk_crc_stock_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_reservation_correlation
    ADD CONSTRAINT fk_crc_stock_position FOREIGN KEY (company_id, stock_position_id) REFERENCES public."StockPosition"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_reservation_correlation fk_crc_stock_reservation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_reservation_correlation
    ADD CONSTRAINT fk_crc_stock_reservation FOREIGN KEY (company_id, stock_reservation_id, stock_position_id) REFERENCES public."StockReservation"("companyId", id, "positionId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_reservation_correlation fk_crc_stock_reservation_evidence; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_reservation_correlation
    ADD CONSTRAINT fk_crc_stock_reservation_evidence FOREIGN KEY (company_id, stock_reservation_id, stock_reservation_evidence_id) REFERENCES public."StockReservationEvidence"("companyId", "reservationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_return_confirmation fk_crcfn_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_confirmation
    ADD CONSTRAINT fk_crcfn_accepted_by FOREIGN KEY (accepted_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_return_confirmation fk_crcfn_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_confirmation
    ADD CONSTRAINT fk_crcfn_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_return_confirmation fk_crcfn_corrects; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_confirmation
    ADD CONSTRAINT fk_crcfn_corrects FOREIGN KEY (company_id, corrects_confirmation_id, devolucion_id, dispatch_id) REFERENCES public.cajas_return_confirmation(company_id, id, devolucion_id, dispatch_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_return_confirmation fk_crcfn_devolucion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_confirmation
    ADD CONSTRAINT fk_crcfn_devolucion FOREIGN KEY (company_id, devolucion_id, remito_id) REFERENCES public.devolucion("companyId", id, "remitoId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_return_confirmation fk_crcfn_dispatch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_confirmation
    ADD CONSTRAINT fk_crcfn_dispatch FOREIGN KEY (company_id, dispatch_id, remito_id) REFERENCES public.cajas_dispatch(company_id, id, remito_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_return_line fk_crl_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_line
    ADD CONSTRAINT fk_crl_article FOREIGN KEY (company_id, article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_return_line fk_crl_confirmation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_line
    ADD CONSTRAINT fk_crl_confirmation FOREIGN KEY (company_id, return_confirmation_id, devolucion_id, dispatch_id) REFERENCES public.cajas_return_confirmation(company_id, id, devolucion_id, dispatch_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_return_line fk_crl_devolucion_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_line
    ADD CONSTRAINT fk_crl_devolucion_item FOREIGN KEY (company_id, devolucion_id, devolucion_item_id) REFERENCES public.devolucion_item(company_id, "devolucionId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_return_line fk_crl_dispatch_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_line
    ADD CONSTRAINT fk_crl_dispatch_line FOREIGN KEY (company_id, dispatch_id, dispatch_line_id) REFERENCES public.cajas_dispatch_line(company_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_return_line fk_crl_stock_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_return_line
    ADD CONSTRAINT fk_crl_stock_position FOREIGN KEY (company_id, article_id, stock_position_id) REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_replacement_pair fk_crp_original_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_replacement_pair
    ADD CONSTRAINT fk_crp_original_line FOREIGN KEY (company_id, dispatch_id, original_dispatch_line_id) REFERENCES public.cajas_dispatch_line(company_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_replacement_pair fk_crp_received_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_replacement_pair
    ADD CONSTRAINT fk_crp_received_article FOREIGN KEY (company_id, received_article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_replacement_pair fk_crp_received_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_replacement_pair
    ADD CONSTRAINT fk_crp_received_position FOREIGN KEY (company_id, received_article_id, received_stock_position_id) REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_replacement_pair fk_crp_return_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_replacement_pair
    ADD CONSTRAINT fk_crp_return_line FOREIGN KEY (company_id, return_confirmation_id, dispatch_id, return_line_id) REFERENCES public.cajas_return_line(company_id, return_confirmation_id, dispatch_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_unit_log_entry fk_cule_actor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_unit_log_entry
    ADD CONSTRAINT fk_cule_actor FOREIGN KEY (actor_user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_unit_log_entry fk_cule_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_unit_log_entry
    ADD CONSTRAINT fk_cule_article FOREIGN KEY (company_id, article_id) REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_unit_log_entry fk_cule_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_unit_log_entry
    ADD CONSTRAINT fk_cule_assignment FOREIGN KEY (company_id, assignment_id, box_identified_unit_id) REFERENCES public.cajas_assignment(company_id, id, box_identified_unit_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_unit_log_entry fk_cule_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_unit_log_entry
    ADD CONSTRAINT fk_cule_command FOREIGN KEY (company_id, command_acceptance_id) REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_unit_log_entry fk_cule_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_unit_log_entry
    ADD CONSTRAINT fk_cule_company FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cajas_unit_log_entry fk_cule_unit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_unit_log_entry
    ADD CONSTRAINT fk_cule_unit FOREIGN KEY (company_id, box_identified_unit_id) REFERENCES public."StockIdentifiedUnit"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: durable_attempt_audit_event fk_daae_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.durable_attempt_audit_event
    ADD CONSTRAINT fk_daae_company FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: durable_attempt_audit_event fk_daae_predecessor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.durable_attempt_audit_event
    ADD CONSTRAINT fk_daae_predecessor FOREIGN KEY (correlation_id, predecessor_event_sha256) REFERENCES public.durable_attempt_audit_event(correlation_id, event_sha256) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: devolucion_item fk_devolucion_item_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devolucion_item
    ADD CONSTRAINT fk_devolucion_item_owner FOREIGN KEY (company_id, "devolucionId") REFERENCES public.devolucion("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GoodsReceipt fk_goods_receipt_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceipt"
    ADD CONSTRAINT fk_goods_receipt_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON DELETE RESTRICT;


--
-- Name: GoodsReceipt fk_goods_receipt_confirmed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceipt"
    ADD CONSTRAINT fk_goods_receipt_confirmed_by FOREIGN KEY ("confirmedById") REFERENCES public."User"(id) ON DELETE RESTRICT;


--
-- Name: GoodsReceipt fk_goods_receipt_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceipt"
    ADD CONSTRAINT fk_goods_receipt_created_by FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON DELETE RESTRICT;


--
-- Name: GoodsReceiptLine fk_goods_receipt_line_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceiptLine"
    ADD CONSTRAINT fk_goods_receipt_line_article FOREIGN KEY ("articleId") REFERENCES public."Article"(id) ON DELETE RESTRICT;


--
-- Name: GoodsReceiptLine fk_goods_receipt_line_receipt; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GoodsReceiptLine"
    ADD CONSTRAINT fk_goods_receipt_line_receipt FOREIGN KEY ("companyId", "receiptId") REFERENCES public."GoodsReceipt"("companyId", id) ON DELETE CASCADE;


--
-- Name: InternalNotification fk_internal_notification_availability_request; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InternalNotification"
    ADD CONSTRAINT fk_internal_notification_availability_request FOREIGN KEY ("companyId", "surgeryId", "availabilityRequestId") REFERENCES public."AvailabilityRequest"("companyId", "surgeryId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: manufacturer fk_manufacturer_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manufacturer
    ADD CONSTRAINT fk_manufacturer_organization FOREIGN KEY (organization_id) REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperationalCommandAcceptance fk_oca_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandAcceptance"
    ADD CONSTRAINT fk_oca_accepted_by FOREIGN KEY ("acceptedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperationalCommandAcceptance fk_oca_audit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandAcceptance"
    ADD CONSTRAINT fk_oca_audit FOREIGN KEY ("companyId", "auditEventId") REFERENCES public."AuditEvent"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperationalCommandAcceptance fk_oca_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandAcceptance"
    ADD CONSTRAINT fk_oca_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperationalCommandAttempt fk_ocat_actor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandAttempt"
    ADD CONSTRAINT fk_ocat_actor FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperationalCommandAttempt fk_ocat_audit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandAttempt"
    ADD CONSTRAINT fk_ocat_audit FOREIGN KEY ("companyId", "auditEventId") REFERENCES public."AuditEvent"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperationalCommandAttempt fk_ocat_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandAttempt"
    ADD CONSTRAINT fk_ocat_command FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperationalCommandAttempt fk_ocat_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandAttempt"
    ADD CONSTRAINT fk_ocat_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperationalCommandEffect fk_oce_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandEffect"
    ADD CONSTRAINT fk_oce_command FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperationalCommandEffect fk_oce_stock_evidence; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandEffect"
    ADD CONSTRAINT fk_oce_stock_evidence FOREIGN KEY ("companyId", "stockEvidenceId") REFERENCES public."StockEvidence"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OperationalCommandEffect fk_oce_stock_reservation_evidence; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationalCommandEffect"
    ADD CONSTRAINT fk_oce_stock_reservation_evidence FOREIGN KEY ("companyId", "stockReservationEvidenceId") REFERENCES public."StockReservationEvidence"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectionReconciliation fk_pr_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectionReconciliation"
    ADD CONSTRAINT fk_pr_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectionReconciliation fk_pr_compared_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectionReconciliation"
    ADD CONSTRAINT fk_pr_compared_by FOREIGN KEY ("comparedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectionReconciliation fk_pr_repair_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectionReconciliation"
    ADD CONSTRAINT fk_pr_repair_command FOREIGN KEY ("companyId", "repairCommandAcceptanceId") REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto fk_presupuesto_branch_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT fk_presupuesto_branch_tenant FOREIGN KEY ("companyId", "branchId") REFERENCES public."Branch"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto fk_presupuesto_client_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT fk_presupuesto_client_tenant FOREIGN KEY ("clientContactId", "companyId") REFERENCES public."ContactCompanyLink"("contactId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto_family fk_presupuesto_family_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_family
    ADD CONSTRAINT fk_presupuesto_family_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto fk_presupuesto_family_surgery_lineage; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT fk_presupuesto_family_surgery_lineage FOREIGN KEY ("companyId", "familyId", "surgeryId") REFERENCES public.presupuesto_family("companyId", id, "surgeryId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto_family fk_presupuesto_family_surgery_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_family
    ADD CONSTRAINT fk_presupuesto_family_surgery_tenant FOREIGN KEY ("companyId", "surgeryId") REFERENCES public."Surgery"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto fk_presupuesto_family_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT fk_presupuesto_family_tenant FOREIGN KEY ("companyId", "familyId") REFERENCES public.presupuesto_family("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto fk_presupuesto_parent_family; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT fk_presupuesto_parent_family FOREIGN KEY ("familyId", "parentPresupuestoId") REFERENCES public.presupuesto("familyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto fk_presupuesto_payer_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT fk_presupuesto_payer_tenant FOREIGN KEY ("payerContactId", "companyId") REFERENCES public."ContactCompanyLink"("contactId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto fk_presupuesto_source_family; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT fk_presupuesto_source_family FOREIGN KEY ("familyId", "sourcePresupuestoId") REFERENCES public.presupuesto("familyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto fk_presupuesto_surgery_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT fk_presupuesto_surgery_tenant FOREIGN KEY ("companyId", "surgeryId") REFERENCES public."Surgery"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_category fk_product_category_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_category
    ADD CONSTRAINT fk_product_category_organization FOREIGN KEY (organization_id) REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_category fk_product_category_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_category
    ADD CONSTRAINT fk_product_category_parent FOREIGN KEY (organization_id, parent_id) REFERENCES public.product_category(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_line fk_product_line_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_line
    ADD CONSTRAINT fk_product_line_organization FOREIGN KEY (organization_id) REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RemitoVerificationAccess fk_remito_access_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationAccess"
    ADD CONSTRAINT fk_remito_access_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RemitoVerificationAccess fk_remito_access_publication; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationAccess"
    ADD CONSTRAINT fk_remito_access_publication FOREIGN KEY ("companyId", "publicationId", "remitoId") REFERENCES public."RemitoVerificationPublication"("companyId", id, "remitoId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RemitoVerificationAccess fk_remito_access_supersession; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationAccess"
    ADD CONSTRAINT fk_remito_access_supersession FOREIGN KEY ("companyId", "supersededByAccessId", "publicationId") REFERENCES public."RemitoVerificationAccess"("companyId", id, "publicationId") ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: RemitoItem fk_remito_item_owner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoItem"
    ADD CONSTRAINT fk_remito_item_owner FOREIGN KEY (company_id, "remitoId") REFERENCES public."Remito"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RemitoVerificationDailyMetric fk_remito_metric_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationDailyMetric"
    ADD CONSTRAINT fk_remito_metric_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RemitoVerificationPublication fk_remito_publication_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationPublication"
    ADD CONSTRAINT fk_remito_publication_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RemitoVerificationPublication fk_remito_publication_locator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationPublication"
    ADD CONSTRAINT fk_remito_publication_locator FOREIGN KEY ("companyId", "remitoShortCodeSnapshot", "remitoId") REFERENCES public."RemitoScanLocator"("companyId", locator, "remitoId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RemitoVerificationPublication fk_remito_publication_remito; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationPublication"
    ADD CONSTRAINT fk_remito_publication_remito FOREIGN KEY ("companyId", "remitoId") REFERENCES public."Remito"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RemitoVerificationPublication fk_remito_publication_replacement; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoVerificationPublication"
    ADD CONSTRAINT fk_remito_publication_replacement FOREIGN KEY ("companyId", "replacedByPublicationId", "remitoId") REFERENCES public."RemitoVerificationPublication"("companyId", id, "remitoId") ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: RemitoScanLocator fk_remito_scan_locator_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoScanLocator"
    ADD CONSTRAINT fk_remito_scan_locator_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RemitoScanLocator fk_remito_scan_locator_remito; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RemitoScanLocator"
    ADD CONSTRAINT fk_remito_scan_locator_remito FOREIGN KEY ("companyId", "remitoId") REFERENCES public."Remito"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockActivationBoundary fk_sab_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockActivationBoundary"
    ADD CONSTRAINT fk_sab_position FOREIGN KEY ("companyId", "positionId") REFERENCES public."StockPosition"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockArticleEligibility fk_sae_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticleEligibility"
    ADD CONSTRAINT fk_sae_article FOREIGN KEY ("organizationId", "articleId") REFERENCES public."Article"("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockArticleEligibility fk_sae_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticleEligibility"
    ADD CONSTRAINT fk_sae_company FOREIGN KEY ("organizationId", "companyId") REFERENCES public."Company"("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockArticleEligibility fk_sae_current_policy; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticleEligibility"
    ADD CONSTRAINT fk_sae_current_policy FOREIGN KEY ("companyId", id, "currentPolicyVersionId") REFERENCES public."StockArticlePolicyVersion"("companyId", "eligibilityId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockArticlePolicyVersion fk_sapv_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticlePolicyVersion"
    ADD CONSTRAINT fk_sapv_accepted_by FOREIGN KEY ("acceptedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockArticlePolicyVersion fk_sapv_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticlePolicyVersion"
    ADD CONSTRAINT fk_sapv_command FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockArticlePolicyVersion fk_sapv_eligibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticlePolicyVersion"
    ADD CONSTRAINT fk_sapv_eligibility FOREIGN KEY ("companyId", "eligibilityId") REFERENCES public."StockArticleEligibility"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockArticlePolicyVersion fk_sapv_previous; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockArticlePolicyVersion"
    ADD CONSTRAINT fk_sapv_previous FOREIGN KEY ("companyId", "eligibilityId", "previousVersionId") REFERENCES public."StockArticlePolicyVersion"("companyId", "eligibilityId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockContext fk_sc_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockContext"
    ADD CONSTRAINT fk_sc_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockContext fk_sc_deposit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockContext"
    ADD CONSTRAINT fk_sc_deposit FOREIGN KEY ("companyId", "depositId") REFERENCES public."StockDeposit"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ScanEvent fk_scan_event_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScanEvent"
    ADD CONSTRAINT fk_scan_event_article FOREIGN KEY ("articleId") REFERENCES public."Article"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ScanEvent fk_scan_event_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScanEvent"
    ADD CONSTRAINT fk_scan_event_created_by FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON DELETE RESTRICT;


--
-- Name: ScanEvent fk_scan_event_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScanEvent"
    ADD CONSTRAINT fk_scan_event_line FOREIGN KEY ("companyId", "receiptId", "lineId") REFERENCES public."GoodsReceiptLine"("companyId", "receiptId", id) ON DELETE RESTRICT;


--
-- Name: ScanEvent fk_scan_event_receipt; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ScanEvent"
    ADD CONSTRAINT fk_scan_event_receipt FOREIGN KEY ("companyId", "receiptId") REFERENCES public."GoodsReceipt"("companyId", id) ON DELETE CASCADE;


--
-- Name: StockCompatibilityReference fk_scr_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCompatibilityReference"
    ADD CONSTRAINT fk_scr_accepted_by FOREIGN KEY ("acceptedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockCompatibilityReference fk_scr_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCompatibilityReference"
    ADD CONSTRAINT fk_scr_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockCompatibilityReference fk_scr_eligibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCompatibilityReference"
    ADD CONSTRAINT fk_scr_eligibility FOREIGN KEY ("companyId", "articleId") REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockCompatibilityReference fk_scr_identified_unit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCompatibilityReference"
    ADD CONSTRAINT fk_scr_identified_unit FOREIGN KEY ("companyId", "articleId", "identifiedUnitId") REFERENCES public."StockIdentifiedUnit"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockCompatibilityReference fk_scr_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCompatibilityReference"
    ADD CONSTRAINT fk_scr_position FOREIGN KEY ("companyId", "articleId", "positionId") REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockDeposit fk_sd_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockDeposit"
    ADD CONSTRAINT fk_sd_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurgeryDocumentChecklist fk_sdc_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryDocumentChecklist"
    ADD CONSTRAINT fk_sdc_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurgeryDocumentChecklist fk_sdc_created_by_access; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryDocumentChecklist"
    ADD CONSTRAINT fk_sdc_created_by_access FOREIGN KEY ("createdById", "companyId") REFERENCES public."UserCompanyAccess"("userId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurgeryDocumentChecklist fk_sdc_surgery_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryDocumentChecklist"
    ADD CONSTRAINT fk_sdc_surgery_tenant FOREIGN KEY ("companyId", "surgeryId") REFERENCES public."Surgery"("companyId", id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SurgeryDocumentChecklist fk_sdc_updated_by_access; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryDocumentChecklist"
    ADD CONSTRAINT fk_sdc_updated_by_access FOREIGN KEY ("updatedById", "companyId") REFERENCES public."UserCompanyAccess"("userId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurgeryDocumentItem fk_sdi_checklist_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryDocumentItem"
    ADD CONSTRAINT fk_sdi_checklist_tenant FOREIGN KEY ("companyId", "checklistId") REFERENCES public."SurgeryDocumentChecklist"("companyId", id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SurgeryDocumentItem fk_sdi_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryDocumentItem"
    ADD CONSTRAINT fk_sdi_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurgeryDocumentItem fk_sdi_created_by_access; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryDocumentItem"
    ADD CONSTRAINT fk_sdi_created_by_access FOREIGN KEY ("createdById", "companyId") REFERENCES public."UserCompanyAccess"("userId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurgeryDocumentItem fk_sdi_updated_by_access; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryDocumentItem"
    ADD CONSTRAINT fk_sdi_updated_by_access FOREIGN KEY ("updatedById", "companyId") REFERENCES public."UserCompanyAccess"("userId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidence fk_se_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidence"
    ADD CONSTRAINT fk_se_accepted_by FOREIGN KEY ("acceptedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidence fk_se_activation_boundary; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidence"
    ADD CONSTRAINT fk_se_activation_boundary FOREIGN KEY ("companyId", "activationBoundaryId") REFERENCES public."StockActivationBoundary"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidence fk_se_audit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidence"
    ADD CONSTRAINT fk_se_audit FOREIGN KEY ("companyId", "auditEventId") REFERENCES public."AuditEvent"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidence fk_se_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidence"
    ADD CONSTRAINT fk_se_command FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidence fk_se_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidence"
    ADD CONSTRAINT fk_se_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidence fk_se_corrects; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidence"
    ADD CONSTRAINT fk_se_corrects FOREIGN KEY ("companyId", "correctsEvidenceId") REFERENCES public."StockEvidence"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidence fk_se_reverses; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidence"
    ADD CONSTRAINT fk_se_reverses FOREIGN KEY ("companyId", "reversesEvidenceId") REFERENCES public."StockEvidence"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidenceLine fk_sel_eligibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidenceLine"
    ADD CONSTRAINT fk_sel_eligibility FOREIGN KEY ("companyId", "articleId") REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidenceLine fk_sel_evidence; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidenceLine"
    ADD CONSTRAINT fk_sel_evidence FOREIGN KEY ("companyId", "evidenceId") REFERENCES public."StockEvidence"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidenceLine fk_sel_from_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidenceLine"
    ADD CONSTRAINT fk_sel_from_position FOREIGN KEY ("companyId", "articleId", "fromPositionId") REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidenceLine fk_sel_reservation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidenceLine"
    ADD CONSTRAINT fk_sel_reservation FOREIGN KEY ("companyId", "reservationId") REFERENCES public."StockReservation"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockEvidenceLine fk_sel_to_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockEvidenceLine"
    ADD CONSTRAINT fk_sel_to_position FOREIGN KEY ("companyId", "articleId", "toPositionId") REFERENCES public."StockPosition"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnit fk_siu_eligibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnit"
    ADD CONSTRAINT fk_siu_eligibility FOREIGN KEY ("companyId", "articleId") REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnitCurrentConfiguration fk_siucc_configuration_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitCurrentConfiguration"
    ADD CONSTRAINT fk_siucc_configuration_version FOREIGN KEY ("companyId", "identifiedUnitId", "configurationVersionId") REFERENCES public."StockIdentifiedUnitConfigurationVersion"("companyId", "identifiedUnitId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnitCurrentConfiguration fk_siucc_identified_unit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitCurrentConfiguration"
    ADD CONSTRAINT fk_siucc_identified_unit FOREIGN KEY ("companyId", "identifiedUnitId") REFERENCES public."StockIdentifiedUnit"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnitConfigurationVersion fk_siucv_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitConfigurationVersion"
    ADD CONSTRAINT fk_siucv_accepted_by FOREIGN KEY ("acceptedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnitConfigurationVersion fk_siucv_audit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitConfigurationVersion"
    ADD CONSTRAINT fk_siucv_audit FOREIGN KEY ("companyId", "auditEventId") REFERENCES public."AuditEvent"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnitConfigurationVersion fk_siucv_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitConfigurationVersion"
    ADD CONSTRAINT fk_siucv_command FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnitConfigurationVersion fk_siucv_identified_unit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitConfigurationVersion"
    ADD CONSTRAINT fk_siucv_identified_unit FOREIGN KEY ("companyId", "articleId", "identifiedUnitId") REFERENCES public."StockIdentifiedUnit"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnitConfigurationVersion fk_siucv_policy_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitConfigurationVersion"
    ADD CONSTRAINT fk_siucv_policy_version FOREIGN KEY ("companyId", "eligibilityId", "policyVersionId") REFERENCES public."StockArticlePolicyVersion"("companyId", "eligibilityId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnitConfigurationVersion fk_siucv_previous; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitConfigurationVersion"
    ADD CONSTRAINT fk_siucv_previous FOREIGN KEY ("companyId", "identifiedUnitId", "previousVersionId") REFERENCES public."StockIdentifiedUnitConfigurationVersion"("companyId", "identifiedUnitId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnitOccupancy fk_siuo_current_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitOccupancy"
    ADD CONSTRAINT fk_siuo_current_position FOREIGN KEY ("companyId", "currentPositionId", "identifiedUnitId") REFERENCES public."StockPosition"("companyId", id, "identifiedUnitId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockIdentifiedUnitOccupancy fk_siuo_identified_unit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockIdentifiedUnitOccupancy"
    ADD CONSTRAINT fk_siuo_identified_unit FOREIGN KEY ("companyId", "identifiedUnitId") REFERENCES public."StockIdentifiedUnit"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLot fk_sl_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLot"
    ADD CONSTRAINT fk_sl_accepted_by FOREIGN KEY ("acceptedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLot fk_sl_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLot"
    ADD CONSTRAINT fk_sl_command FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLot fk_sl_eligibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLot"
    ADD CONSTRAINT fk_sl_eligibility FOREIGN KEY ("companyId", "articleId") REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLot fk_sl_primary_observation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLot"
    ADD CONSTRAINT fk_sl_primary_observation FOREIGN KEY ("companyId", "articleId", "primaryObservationId") REFERENCES public."StockLotObservation"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotObservation fk_slo_audit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotObservation"
    ADD CONSTRAINT fk_slo_audit FOREIGN KEY ("companyId", "auditEventId") REFERENCES public."AuditEvent"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotObservation fk_slo_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotObservation"
    ADD CONSTRAINT fk_slo_command FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotObservation fk_slo_corrects; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotObservation"
    ADD CONSTRAINT fk_slo_corrects FOREIGN KEY ("companyId", "articleId", "correctsObservationId") REFERENCES public."StockLotObservation"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotObservation fk_slo_eligibility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotObservation"
    ADD CONSTRAINT fk_slo_eligibility FOREIGN KEY ("companyId", "articleId") REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotObservation fk_slo_observed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotObservation"
    ADD CONSTRAINT fk_slo_observed_by FOREIGN KEY ("observedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotReview fk_slr_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotReview"
    ADD CONSTRAINT fk_slr_accepted_by FOREIGN KEY ("acceptedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotReview fk_slr_audit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotReview"
    ADD CONSTRAINT fk_slr_audit FOREIGN KEY ("companyId", "auditEventId") REFERENCES public."AuditEvent"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotReview fk_slr_canonical_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotReview"
    ADD CONSTRAINT fk_slr_canonical_lot FOREIGN KEY ("companyId", "articleId", "canonicalLotId") REFERENCES public."StockLot"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotReview fk_slr_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotReview"
    ADD CONSTRAINT fk_slr_command FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotReview fk_slr_left_observation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotReview"
    ADD CONSTRAINT fk_slr_left_observation FOREIGN KEY ("companyId", "articleId", "leftObservationId") REFERENCES public."StockLotObservation"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotReview fk_slr_resolution_observation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotReview"
    ADD CONSTRAINT fk_slr_resolution_observation FOREIGN KEY ("companyId", "articleId", "resolutionObservationId") REFERENCES public."StockLotObservation"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockLotReview fk_slr_right_observation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLotReview"
    ADD CONSTRAINT fk_slr_right_observation FOREIGN KEY ("companyId", "articleId", "rightObservationId") REFERENCES public."StockLotObservation"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockOpeningPosition fk_sop_activation_boundary; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockOpeningPosition"
    ADD CONSTRAINT fk_sop_activation_boundary FOREIGN KEY ("companyId", "activationBoundaryId", "positionId", "cutoffAt") REFERENCES public."StockActivationBoundary"("companyId", id, "positionId", "cutoffAt") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockOpeningPosition fk_sop_opening_evidence_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockOpeningPosition"
    ADD CONSTRAINT fk_sop_opening_evidence_line FOREIGN KEY ("companyId", "positionId", "openingEvidenceLineId") REFERENCES public."StockEvidenceLine"("companyId", "toPositionId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockOpeningPosition fk_sop_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockOpeningPosition"
    ADD CONSTRAINT fk_sop_position FOREIGN KEY ("companyId", "positionId") REFERENCES public."StockPosition"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockPosition fk_sp_context; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockPosition"
    ADD CONSTRAINT fk_sp_context FOREIGN KEY ("companyId", "contextId") REFERENCES public."StockContext"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockPosition fk_sp_eligibility_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockPosition"
    ADD CONSTRAINT fk_sp_eligibility_article FOREIGN KEY ("companyId", "articleId") REFERENCES public."StockArticleEligibility"("companyId", "articleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockPosition fk_sp_eligibility_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockPosition"
    ADD CONSTRAINT fk_sp_eligibility_id FOREIGN KEY ("companyId", "eligibilityId") REFERENCES public."StockArticleEligibility"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockPosition fk_sp_identified_unit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockPosition"
    ADD CONSTRAINT fk_sp_identified_unit FOREIGN KEY ("companyId", "articleId", "identifiedUnitId") REFERENCES public."StockIdentifiedUnit"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockPosition fk_sp_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockPosition"
    ADD CONSTRAINT fk_sp_lot FOREIGN KEY ("companyId", "articleId", "lotId") REFERENCES public."StockLot"("companyId", "articleId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockPosition fk_sp_policy_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockPosition"
    ADD CONSTRAINT fk_sp_policy_version FOREIGN KEY ("companyId", "eligibilityId", "policyVersionId") REFERENCES public."StockArticlePolicyVersion"("companyId", "eligibilityId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockPositionProjection fk_spp_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockPositionProjection"
    ADD CONSTRAINT fk_spp_position FOREIGN KEY ("companyId", "positionId") REFERENCES public."StockPosition"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockReservation fk_sr_identified_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservation"
    ADD CONSTRAINT fk_sr_identified_position FOREIGN KEY ("companyId", "positionId", "identifiedUnitId") REFERENCES public."StockPosition"("companyId", id, "identifiedUnitId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockReservation fk_sr_position; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservation"
    ADD CONSTRAINT fk_sr_position FOREIGN KEY ("companyId", "positionId") REFERENCES public."StockPosition"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockReservationEvidence fk_sre_accepted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservationEvidence"
    ADD CONSTRAINT fk_sre_accepted_by FOREIGN KEY ("acceptedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockReservationEvidence fk_sre_audit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservationEvidence"
    ADD CONSTRAINT fk_sre_audit FOREIGN KEY ("companyId", "auditEventId") REFERENCES public."AuditEvent"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockReservationEvidence fk_sre_command; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservationEvidence"
    ADD CONSTRAINT fk_sre_command FOREIGN KEY ("companyId", "commandAcceptanceId") REFERENCES public."OperationalCommandAcceptance"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockReservationEvidence fk_sre_replaces; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservationEvidence"
    ADD CONSTRAINT fk_sre_replaces FOREIGN KEY ("companyId", "reservationId", "replacesEvidenceId") REFERENCES public."StockReservationEvidence"("companyId", "reservationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockReservationEvidence fk_sre_reservation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservationEvidence"
    ADD CONSTRAINT fk_sre_reservation FOREIGN KEY ("companyId", "reservationId") REFERENCES public."StockReservation"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockReservationProjection fk_srp_reservation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservationProjection"
    ADD CONSTRAINT fk_srp_reservation FOREIGN KEY ("companyId", "reservationId") REFERENCES public."StockReservation"("companyId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockReservation fk_stock_reservation_preparation_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockReservation"
    ADD CONSTRAINT fk_stock_reservation_preparation_line FOREIGN KEY ("companyId", "preparationLineId") REFERENCES public."SurgeryPreparationLine"("companyId", id) ON DELETE RESTRICT;


--
-- Name: Surgery fk_surgery_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Surgery"
    ADD CONSTRAINT fk_surgery_created_by FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SurgeryPreparation fk_surgery_preparation_cajas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparation"
    ADD CONSTRAINT fk_surgery_preparation_cajas FOREIGN KEY ("companyId", "cajasAssignmentId") REFERENCES public.cajas_assignment(company_id, id) ON DELETE RESTRICT;


--
-- Name: SurgeryPreparation fk_surgery_preparation_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparation"
    ADD CONSTRAINT fk_surgery_preparation_company FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON DELETE RESTRICT;


--
-- Name: SurgeryPreparation fk_surgery_preparation_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparation"
    ADD CONSTRAINT fk_surgery_preparation_created_by FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON DELETE RESTRICT;


--
-- Name: SurgeryPreparationLine fk_surgery_preparation_line_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparationLine"
    ADD CONSTRAINT fk_surgery_preparation_line_article FOREIGN KEY ("articleId") REFERENCES public."Article"(id) ON DELETE RESTRICT;


--
-- Name: SurgeryPreparationLine fk_surgery_preparation_line_preparation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparationLine"
    ADD CONSTRAINT fk_surgery_preparation_line_preparation FOREIGN KEY ("companyId", "preparationId") REFERENCES public."SurgeryPreparation"("companyId", id) ON DELETE CASCADE;


--
-- Name: SurgeryPreparation fk_surgery_preparation_surgery; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SurgeryPreparation"
    ADD CONSTRAINT fk_surgery_preparation_surgery FOREIGN KEY ("companyId", "surgeryId") REFERENCES public."Surgery"("companyId", id) ON DELETE RESTRICT;


--
-- Name: xadmin_import_run fk_xadmin_import_run_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_import_run
    ADD CONSTRAINT fk_xadmin_import_run_organization FOREIGN KEY (organization_id) REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_mapping fk_xadmin_mapping_article; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_mapping
    ADD CONSTRAINT fk_xadmin_mapping_article FOREIGN KEY (organization_id, target_article_id) REFERENCES public."Article"("organizationId", id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_mapping fk_xadmin_mapping_brand; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_mapping
    ADD CONSTRAINT fk_xadmin_mapping_brand FOREIGN KEY (organization_id, target_brand_id) REFERENCES public.brand(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_mapping fk_xadmin_mapping_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_mapping
    ADD CONSTRAINT fk_xadmin_mapping_category FOREIGN KEY (organization_id, target_category_id) REFERENCES public.product_category(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_mapping fk_xadmin_mapping_clinical_family; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_mapping
    ADD CONSTRAINT fk_xadmin_mapping_clinical_family FOREIGN KEY (organization_id, target_clinical_family_id) REFERENCES public.clinical_family(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_mapping fk_xadmin_mapping_decided_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_mapping
    ADD CONSTRAINT fk_xadmin_mapping_decided_by FOREIGN KEY (decided_by_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_mapping fk_xadmin_mapping_manufacturer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_mapping
    ADD CONSTRAINT fk_xadmin_mapping_manufacturer FOREIGN KEY (organization_id, target_manufacturer_id) REFERENCES public.manufacturer(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_mapping fk_xadmin_mapping_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_mapping
    ADD CONSTRAINT fk_xadmin_mapping_organization FOREIGN KEY (organization_id) REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_mapping fk_xadmin_mapping_product_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_mapping
    ADD CONSTRAINT fk_xadmin_mapping_product_line FOREIGN KEY (organization_id, target_product_line_id) REFERENCES public.product_line(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_mapping fk_xadmin_mapping_stage_row; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_mapping
    ADD CONSTRAINT fk_xadmin_mapping_stage_row FOREIGN KEY (organization_id, stage_row_id) REFERENCES public.xadmin_article_stage_row(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_stage_row fk_xadmin_stage_row_organization; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_stage_row
    ADD CONSTRAINT fk_xadmin_stage_row_organization FOREIGN KEY (organization_id) REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: xadmin_article_stage_row fk_xadmin_stage_row_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.xadmin_article_stage_row
    ADD CONSTRAINT fk_xadmin_stage_row_run FOREIGN KEY (organization_id, run_id) REFERENCES public.xadmin_import_run(organization_id, id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoice invoice_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT "invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoice invoice_consumoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT "invoice_consumoId_fkey" FOREIGN KEY ("consumoId") REFERENCES public.consumo(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoice invoice_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT "invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoice_item invoice_item_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_item
    ADD CONSTRAINT "invoice_item_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoice(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoice invoice_presupuestoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT "invoice_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES public.presupuesto(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoice invoice_surgeryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT "invoice_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES public."Surgery"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoice invoice_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT "invoice_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment payment_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT "payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment payment_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT "payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_imputation payment_imputation_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_imputation
    ADD CONSTRAINT "payment_imputation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoice(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_imputation payment_imputation_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_imputation
    ADD CONSTRAINT "payment_imputation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public.payment(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment payment_surgeryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT "payment_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES public."Surgery"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment payment_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT "payment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: presupuesto presupuesto_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT "presupuesto_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: presupuesto presupuesto_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT "presupuesto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: presupuesto_item presupuesto_item_presupuestoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_item
    ADD CONSTRAINT "presupuesto_item_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES public.presupuesto(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: presupuesto presupuesto_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto
    ADD CONSTRAINT "presupuesto_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


