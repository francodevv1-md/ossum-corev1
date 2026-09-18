// @vitest-environment node
// Run only with GEO_GPS_SYNTHETIC_DEV=1 and an in-memory DIRECT_URL for confirmed disposable DEV.
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { expect, test as integrationTest } from 'vitest';

const test = integrationTest.skipIf(process.env.GEO_GPS_SYNTHETIC_DEV !== '1');

const sql = readFileSync('prisma/migrations/20260916143000_geo_gps_tenant_forward_correction/migration.sql', 'utf8');
const geography = readFileSync('prisma/migrations/20260910120000_contact_address_geography/migration.sql', 'utf8');
const columns = geography.slice(geography.indexOf('  ADD COLUMN "georefId"'), geography.indexOf(';', geography.indexOf('  ADD COLUMN "georefId"')));
const fixture = `
SET search_path TO pg_temp;
CREATE TEMP TABLE "Company" (id text PRIMARY KEY);
CREATE TEMP TABLE "Contact" (id text PRIMARY KEY);
CREATE TEMP TABLE "ContactCompanyLink" (id text PRIMARY KEY,"contactId" text,"companyId" text, UNIQUE("contactId","companyId"));
CREATE TEMP TABLE "ContactAddress" (id text PRIMARY KEY,"contactId" text NOT NULL,"isMain" boolean NOT NULL DEFAULT false,
  street text,"createdAt" timestamp DEFAULT now(),"updatedAt" timestamp DEFAULT now(), extra jsonb);
CREATE TYPE pg_temp."GeographicEntityType" AS ENUM ('PROVINCE','DEPARTMENT','MUNICIPALITY','LOCALITY','ADDRESS');
CREATE TYPE pg_temp."GeographicCoordinateType" AS ENUM ('CENTROID','ADDRESS','GPS','SURVEY','MANUAL','UNKNOWN');
CREATE TYPE pg_temp."GeographicCrs" AS ENUM ('EPSG:4326');
CREATE TYPE pg_temp."GeographicValidationStatus" AS ENUM ('verified','candidate','conflict','missing','manual_verified','deprecated');
ALTER TABLE "ContactAddress" ${columns};
ALTER TABLE "ContactAddress"
  ADD CONSTRAINT ck_contact_address_geo_coordinates_pair CHECK ((latitude IS NULL)=(longitude IS NULL)),
  ADD CONSTRAINT ck_contact_address_geo_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT ck_contact_address_geo_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
CREATE UNIQUE INDEX uq_contact_address_one_main ON "ContactAddress"("contactId") WHERE "isMain"=true;
CREATE INDEX ix_contact_address_main ON "ContactAddress"("contactId","isMain");
CREATE INDEX ix_contact_address_georef_id ON "ContactAddress"("georefId");
CREATE INDEX ix_contact_address_geo_validation ON "ContactAddress"("validationStatus");
CREATE TEMP TABLE "Vehicle" (id text PRIMARY KEY,"companyId" text,provider text,"trackingDeviceId" text,extra jsonb);
CREATE UNIQUE INDEX uq_vehicle_company_provider_device ON "Vehicle"("companyId",provider,"trackingDeviceId");
CREATE TEMP TABLE "VehicleLatestPosition" ("vehicleId" text PRIMARY KEY,"companyId" text,latitude numeric,longitude numeric);
INSERT INTO "Company" VALUES ('c1'),('c2'); INSERT INTO "Contact" VALUES ('p1'),('p2'),('p3');
INSERT INTO "ContactCompanyLink" VALUES ('l1','p1','c1'),('l2','p2','c2'),('l3','p3','c1');
INSERT INTO "ContactAddress" (id,"contactId","isMain",street,extra) VALUES
  ('a1','p1',true,'fixture one','{"keep":[1,null]}'),('a2','p2',true,'fixture two','{"keep":2}'),('a3','p3',false,NULL,NULL);
UPDATE "ContactAddress" SET "georefId"='synthetic',"entityType"='ADDRESS',"provinceGeorefId"='p',"provinceName"='province',
  "departmentGeorefId"='d',"departmentName"='department',"municipalityGeorefId"='m',"municipalityName"='municipality',
  latitude=-34.1234567,longitude=-58.7654321,"coordinateType"='MANUAL',crs='EPSG:4326',source='fixture',"sourceVersion"='v1',
  "sourceRetrievedAt"='2026-09-01T12:34:56.123456Z',"validationStatus"='manual_verified',"validationNotes"='preserve',
  geometry='{"type":"Point","coordinates":[-58.7654321,-34.1234567]}',"geometrySource"='fixture' WHERE id IN ('a1','a2');
INSERT INTO "Vehicle" VALUES ('v1','c1','one','d1','{"keep":true}'),('v2','c2','two','d2',NULL),('v3','c1','one',NULL,NULL),('v4','c2','two',NULL,NULL);
INSERT INTO "VehicleLatestPosition" VALUES ('v1','c1',-34,-58);
`;
async function isolated(run: (db: Client) => Promise<void>) {
  expect(process.env.GEO_GPS_SYNTHETIC_DEV).toBe('1');
  expect(Boolean(process.env.DIRECT_URL)).toBe(true);
  const db = new Client({ connectionString: process.env.DIRECT_URL }); // Exact URL; no TLS overrides.
  try {
    try { await db.connect(); } catch { throw new Error('Synthetic DEV connection unavailable (details redacted)'); }
    await db.query(fixture);
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM pg_class WHERE relnamespace=pg_my_temp_schema() AND relkind='r'`);
    expect(rows[0].n).toBe(6);
    await run(db);
  } finally {
    await db.query('ROLLBACK').catch(() => {});
    await db.end(); // PostgreSQL drops all session-local fixture objects, even after assertion failure.
  }
}
async function rows(db: Client) {
  return (await db.query(`SELECT jsonb_agg(to_jsonb(a)-'companyId' ORDER BY id) AS data FROM "ContactAddress" a`)).rows[0].data;
}
async function rejected(db: Client, statement: string, code: string) {
  await expect(db.query(statement)).rejects.toMatchObject({ code });
  await db.query('ROLLBACK');
}

test('actual SQL preserves enriched addresses and all fixture rows; target is a no-op; tenant/GPS constraints enforce', async () => isolated(async db => {
  const before = await rows(db);
  expect((await db.query(`SELECT pg_get_indexdef('uq_contact_address_one_main'::regclass) LIKE '%ON pg_temp.%' AS temp_alias`)).rows[0].temp_alias).toBe(true);
  await db.query(sql);
  expect(await rows(db)).toEqual(before);
  expect((await db.query(`SELECT "companyId" FROM "ContactAddress" ORDER BY id`)).rows.map(r => r.companyId)).toEqual(['c1','c2','c1']);
  const catalog = async () => (await db.query(`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=current_schema() ORDER BY indexname`)).rows;
  const indexes = await catalog();
  await db.query(sql);
  expect(await rows(db)).toEqual(before); expect(await catalog()).toEqual(indexes);
  await rejected(db, `UPDATE "ContactAddress" SET "companyId"='c2' WHERE id='a1'`, '23503');
  await rejected(db, `UPDATE "ContactAddress" SET "companyId"=NULL WHERE id='a1'`, '23502');
  await rejected(db, `DELETE FROM "Company" WHERE id='c1'`, '23503');
  await rejected(db, `DELETE FROM "ContactCompanyLink" WHERE id='l1'`, '23503');
  await rejected(db, `INSERT INTO "ContactAddress"(id,"contactId","companyId","isMain") VALUES ('bad','p1','c1',true)`, '23505');
  await rejected(db, `UPDATE "Vehicle" SET "trackingDeviceId"='d1' WHERE id='v2'`, '23505');
  await rejected(db, `UPDATE "ContactAddress" SET latitude=91 WHERE id='a1'`, '23514');
  await rejected(db, `UPDATE "ContactAddress" SET longitude=NULL WHERE id='a1'`, '23514');
  await db.query(`INSERT INTO "ContactCompanyLink" VALUES ('l4','p1','c2'); INSERT INTO "ContactAddress"(id,"contactId","companyId","isMain") VALUES ('a4','p1','c2',true)`);
  await db.query(sql); // Exact target may legitimately have several company links now.
}), 30000);

test.each([
  ['multi-link', `INSERT INTO "ContactCompanyLink" VALUES ('l4','p1','c2')`, 'exactly one'],
  ['orphan', `DELETE FROM "ContactCompanyLink" WHERE id='l1'`, 'exactly one'],
  ['orphan company', `DELETE FROM "Company" WHERE id='c1'`, 'Orphan'],
  ['duplicate GPS', `UPDATE "Vehicle" SET "trackingDeviceId"='d1' WHERE id='v2'`, 'duplicate GPS'],
  ['partial tenant', `ALTER TABLE "ContactAddress" ADD COLUMN "companyId" text`, 'Unexpected correction index'],
  ['mixed GPS', `CREATE UNIQUE INDEX uq_vehicle_tracking_device ON "Vehicle"("trackingDeviceId")`, 'Mixed vehicle'],
  ['name collision', `CREATE TABLE pg_temp.uq_vehicle_tracking_device(dummy text)`, 'Mixed vehicle'],
  ['missing local table', `DROP TABLE "VehicleLatestPosition"`, 'Unsupported correction table'],
  ['wrong geography check', `ALTER TABLE "ContactAddress" DROP CONSTRAINT ck_contact_address_geo_latitude_range`, 'Unexpected geography'],
])('%s prestate rejects without row/catalog changes', async (_name, setup, message) => isolated(async db => {
  await db.query(setup);
  const before = await rows(db);
  await expect(db.query(sql)).rejects.toThrow(message);
  await db.query('ROLLBACK');
  expect(await rows(db)).toEqual(before);
  expect((await db.query(`SELECT to_regclass('uq_vehicle_company_provider_device') IS NOT NULL AS intact`)).rows[0].intact).toBe(true);
}), 30000);

test('target with an incorrect tenant FK is not accepted as a no-op', async () => isolated(async db => {
  await db.query(sql);
  await db.query(`ALTER TABLE "ContactAddress" DROP CONSTRAINT "ContactAddress_companyId_fkey";
    ALTER TABLE "ContactAddress" ADD CONSTRAINT "ContactAddress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON DELETE CASCADE ON UPDATE CASCADE`);
  const before = await rows(db);
  await expect(db.query(sql)).rejects.toThrow('Partial or ambiguous tenant state');
  await db.query('ROLLBACK');
  expect(await rows(db)).toEqual(before);
}), 30000);

test('target with deferred device uniqueness is rejected despite an identical index definition', async () => isolated(async db => {
  await db.query(sql);
  const definition = async () => (await db.query(`SELECT pg_get_indexdef('uq_vehicle_tracking_device'::regclass) AS def`)).rows[0].def;
  const beforeDefinition = await definition();
  await db.query(`DROP INDEX uq_vehicle_tracking_device;
    ALTER TABLE "Vehicle" ADD CONSTRAINT uq_vehicle_tracking_device UNIQUE ("trackingDeviceId") DEFERRABLE INITIALLY DEFERRED`);
  expect(await definition()).toBe(beforeDefinition);
  expect((await db.query(`SELECT indimmediate FROM pg_index WHERE indexrelid='uq_vehicle_tracking_device'::regclass`)).rows[0].indimmediate).toBe(false);
  const before = await rows(db);
  await expect(db.query(sql)).rejects.toThrow('Unexpected correction index: uq_vehicle_tracking_device');
  await db.query('ROLLBACK');
  expect(await rows(db)).toEqual(before);
}), 30000);

test('DDL/backfill rollback on a late post-backfill failure', async () => isolated(async db => {
  // A pre-existing unrelated CHECK permits legacy rows but rejects the tenant UPDATE.
  await db.query(`ALTER TABLE "ContactAddress" ADD CONSTRAINT fixture_reject_update CHECK (id<>'a1') NOT VALID`);
  const before = await rows(db);
  await rejected(db, sql, '23514');
  expect(await rows(db)).toEqual(before);
  expect((await db.query(`SELECT count(*)::int n FROM pg_attribute WHERE attrelid='"ContactAddress"'::regclass AND attname='companyId' AND NOT attisdropped`)).rows[0].n).toBe(0);
  expect((await db.query(`SELECT to_regclass('uq_vehicle_company_provider_device') IS NOT NULL AS intact`)).rows[0].intact).toBe(true);
}), 30000);
