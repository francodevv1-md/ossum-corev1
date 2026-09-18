-- Forward-only DEV correction. Unqualified names intentionally support isolated pg_temp fixtures.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
DO $$
DECLARE
  t text; target boolean; pass integer; item record; actual text; snapshot jsonb;
  before_rows jsonb := '{}'::jsonb; before_geo jsonb;
BEGIN
  -- Never fall through a search_path into another schema, including public during tests.
  IF current_schema() <> 'public' AND current_schema() <> pg_my_temp_schema()::regnamespace::text THEN
    RAISE EXCEPTION 'Unsupported correction schema';
  END IF;
  FOREACH t IN ARRAY ARRAY['Company','Contact','ContactCompanyLink','ContactAddress','Vehicle','VehicleLatestPosition'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.oid=to_regclass(format('%I',t)) AND n.nspname=current_schema() AND c.relkind='r'
      AND NOT c.relrowsecurity AND (n.nspname='public' OR c.relpersistence='t')) THEN
      RAISE EXCEPTION 'Unsupported correction table state';
    END IF;
    EXECUTE format('LOCK TABLE %I IN ACCESS EXCLUSIVE MODE',t);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid IN ('"ContactAddress"'::regclass,'"Vehicle"'::regclass,'"VehicleLatestPosition"'::regclass) AND NOT tgisinternal)
    OR EXISTS (SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='"ContactAddress"'::regclass) THEN
    RAISE EXCEPTION 'Unexpected scoped trigger or incoming address FK';
  END IF;
  SELECT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='"ContactAddress"'::regclass AND attname='companyId' AND NOT attisdropped) INTO target;
  IF EXISTS (SELECT 1 FROM "ContactAddress" a LEFT JOIN "Contact" c ON c.id=a."contactId" WHERE c.id IS NULL)
    OR EXISTS (SELECT 1 FROM "ContactCompanyLink" l LEFT JOIN "Company" c ON c.id=l."companyId" LEFT JOIN "Contact" p ON p.id=l."contactId" WHERE c.id IS NULL OR p.id IS NULL)
    OR EXISTS (SELECT 1 FROM "Vehicle" WHERE "trackingDeviceId" IS NOT NULL GROUP BY "trackingDeviceId" HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Orphan reference or duplicate GPS device';
  END IF;
  IF NOT target AND EXISTS (SELECT 1 FROM "ContactAddress" a WHERE
    (SELECT count(*) FROM "ContactCompanyLink" l WHERE l."contactId"=a."contactId")<>1) THEN
    RAISE EXCEPTION 'Backfill requires exactly one company link per address';
  END IF;
  IF (SELECT count(*) FROM pg_constraint WHERE conrelid='"ContactAddress"'::regclass AND convalidated AND
    (conname,pg_get_constraintdef(oid)) IN (
      ('ck_contact_address_geo_coordinates_pair','CHECK (((latitude IS NULL) = (longitude IS NULL)))'),
      ('ck_contact_address_geo_latitude_range','CHECK (((latitude IS NULL) OR ((latitude >= (''-90''::integer)::numeric) AND (latitude <= (90)::numeric))))'),
      ('ck_contact_address_geo_longitude_range','CHECK (((longitude IS NULL) OR ((longitude >= (''-180''::integer)::numeric) AND (longitude <= (180)::numeric))))')))<>3 THEN
    RAISE EXCEPTION 'Unexpected geography checks';
  END IF;
  SELECT jsonb_agg(jsonb_build_array(conname,pg_get_constraintdef(oid)) ORDER BY conname) INTO before_geo
    FROM pg_constraint WHERE conrelid='"ContactAddress"'::regclass AND conname LIKE 'ck_contact_address_geo_%';
  FOREACH t IN ARRAY ARRAY['Company','Contact','ContactCompanyLink','ContactAddress','Vehicle','VehicleLatestPosition'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(v ORDER BY v::text),''[]''::jsonb) FROM (SELECT to_jsonb(r)%s AS v FROM %I r) s',
      CASE WHEN t='ContactAddress' THEN ' - ''companyId''' ELSE '' END,t) INTO snapshot;
    before_rows := before_rows || jsonb_build_object(t,snapshot);
  END LOOP;
  -- Validate the supported starting shape, then the exact corrected invariants.
  FOR pass IN 0..1 LOOP
    FOR item IN SELECT * FROM (VALUES
      ('uq_contact_address_one_main','ContactAddress',true,CASE WHEN target THEN '"companyId", "contactId"' ELSE '"contactId"' END,'("isMain" = true)'),
      ('ix_contact_address_main','ContactAddress',false,CASE WHEN target THEN '"companyId", "contactId", "isMain"' ELSE '"contactId", "isMain"' END,NULL),
      ('ix_contact_address_georef_id','ContactAddress',false,'"georefId"',NULL),
      ('ix_contact_address_geo_validation','ContactAddress',false,'"validationStatus"',NULL),
      (CASE WHEN target THEN 'uq_vehicle_tracking_device' ELSE 'uq_vehicle_company_provider_device' END,'Vehicle',true,
        CASE WHEN target THEN '"trackingDeviceId"' ELSE '"companyId", provider, "trackingDeviceId"' END,NULL)
    ) AS x(name,tbl,uniq,cols,predicate) LOOP
      SELECT pg_get_indexdef(i.indexrelid) INTO actual FROM pg_index i
        WHERE i.indexrelid=to_regclass(format('%I',item.name)) AND i.indrelid=to_regclass(format('%I',item.tbl))
        AND i.indisvalid AND i.indisready AND i.indisunique=item.uniq AND (NOT i.indisunique OR i.indimmediate);
      IF actual IS DISTINCT FROM format('CREATE %sINDEX %I ON %I.%I USING btree (%s)%s',
        CASE WHEN item.uniq THEN 'UNIQUE ' ELSE '' END,item.name,CASE WHEN current_schema()='public' THEN 'public' ELSE 'pg_temp' END,item.tbl,item.cols,
        CASE WHEN item.predicate IS NULL THEN '' ELSE ' WHERE '||item.predicate END) THEN
        RAISE EXCEPTION 'Unexpected correction index: %',item.name;
      END IF;
    END LOOP;
    IF to_regclass(CASE WHEN target THEN 'uq_vehicle_company_provider_device' ELSE 'uq_vehicle_tracking_device' END) IS NOT NULL THEN
      RAISE EXCEPTION 'Mixed vehicle index state';
    END IF;
    IF target THEN
      IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='"ContactAddress"'::regclass AND attname='companyId'
        AND atttypid='text'::regtype AND attnotnull AND NOT atthasdef AND NOT attisdropped)
        OR (SELECT count(*) FROM pg_constraint WHERE conrelid='"ContactAddress"'::regclass AND contype='f'
          AND convalidated AND NOT condeferrable AND confdeltype='r' AND confupdtype='c' AND
          (conname,pg_get_constraintdef(oid)) IN (
            ('ContactAddress_companyId_fkey','FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT'),
            ('ContactAddress_contactId_companyId_fkey','FOREIGN KEY ("contactId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON UPDATE CASCADE ON DELETE RESTRICT')))<>2 THEN
        RAISE EXCEPTION 'Partial or ambiguous tenant state';
      END IF;
      IF EXISTS (SELECT 1 FROM "ContactAddress" a LEFT JOIN "ContactCompanyLink" l
        ON l."contactId"=a."contactId" AND l."companyId"=a."companyId" WHERE l."companyId" IS NULL) THEN
        RAISE EXCEPTION 'Invalid target tenant reference';
      END IF;
      EXIT;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"ContactAddress"'::regclass
      AND conname IN ('ContactAddress_companyId_fkey','ContactAddress_contactId_companyId_fkey')) THEN
      RAISE EXCEPTION 'Partial tenant constraints';
    END IF;
    ALTER TABLE "ContactAddress" ADD COLUMN "companyId" text;
    UPDATE "ContactAddress" a SET "companyId"=l."companyId" FROM "ContactCompanyLink" l WHERE l."contactId"=a."contactId";
    ALTER TABLE "ContactAddress" ALTER COLUMN "companyId" SET NOT NULL;
    ALTER TABLE "ContactAddress"
      ADD CONSTRAINT "ContactAddress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      ADD CONSTRAINT "ContactAddress_contactId_companyId_fkey" FOREIGN KEY ("contactId","companyId") REFERENCES "ContactCompanyLink"("contactId","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
    DROP INDEX uq_contact_address_one_main;
    DROP INDEX ix_contact_address_main;
    CREATE UNIQUE INDEX uq_contact_address_one_main ON "ContactAddress"("companyId","contactId") WHERE "isMain"=true;
    CREATE INDEX ix_contact_address_main ON "ContactAddress"("companyId","contactId","isMain");
    CREATE UNIQUE INDEX uq_vehicle_tracking_device ON "Vehicle"("trackingDeviceId");
    DROP INDEX uq_vehicle_company_provider_device;
    target := true;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['Company','Contact','ContactCompanyLink','ContactAddress','Vehicle','VehicleLatestPosition'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(v ORDER BY v::text),''[]''::jsonb) FROM (SELECT to_jsonb(r)%s AS v FROM %I r) s',
      CASE WHEN t='ContactAddress' THEN ' - ''companyId''' ELSE '' END,t) INTO snapshot;
    IF snapshot IS DISTINCT FROM before_rows->t THEN RAISE EXCEPTION 'Lossless correction assertion failed'; END IF;
  END LOOP;
  IF before_geo IS DISTINCT FROM (SELECT jsonb_agg(jsonb_build_array(conname,pg_get_constraintdef(oid)) ORDER BY conname)
    FROM pg_constraint WHERE conrelid='"ContactAddress"'::regclass AND conname LIKE 'ck_contact_address_geo_%') THEN
    RAISE EXCEPTION 'Geography checks changed';
  END IF;
END $$;
COMMIT;
