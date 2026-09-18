-- DEV-only additive geographic contract. Do not apply without confirmed disposable DEV target.
BEGIN;

CREATE TYPE "GeographicEntityType" AS ENUM ('PROVINCE', 'DEPARTMENT', 'MUNICIPALITY', 'LOCALITY', 'ADDRESS');
CREATE TYPE "GeographicCoordinateType" AS ENUM ('CENTROID', 'ADDRESS', 'GPS', 'SURVEY', 'MANUAL', 'UNKNOWN');
CREATE TYPE "GeographicCrs" AS ENUM ('EPSG:4326');
CREATE TYPE "GeographicValidationStatus" AS ENUM ('verified', 'candidate', 'conflict', 'missing', 'manual_verified', 'deprecated');

ALTER TABLE "ContactAddress"
  ADD COLUMN "companyId" TEXT,
  ADD COLUMN "georefId" TEXT,
  ADD COLUMN "entityType" "GeographicEntityType",
  ADD COLUMN "provinceGeorefId" TEXT,
  ADD COLUMN "provinceName" TEXT,
  ADD COLUMN "departmentGeorefId" TEXT,
  ADD COLUMN "departmentName" TEXT,
  ADD COLUMN "municipalityGeorefId" TEXT,
  ADD COLUMN "municipalityName" TEXT,
  ADD COLUMN "latitude" DECIMAL(10,7),
  ADD COLUMN "longitude" DECIMAL(10,7),
  ADD COLUMN "coordinateType" "GeographicCoordinateType",
  ADD COLUMN "crs" "GeographicCrs",
  ADD COLUMN "source" TEXT,
  ADD COLUMN "sourceVersion" TEXT,
  ADD COLUMN "sourceRetrievedAt" TIMESTAMPTZ(6),
  ADD COLUMN "validationStatus" "GeographicValidationStatus",
  ADD COLUMN "validationNotes" TEXT,
  ADD COLUMN "geometry" JSONB,
  ADD COLUMN "geometrySource" TEXT;

-- Legacy addresses belonged to global contacts. Materialize one identical address
-- per existing company link before making the tenant column mandatory.
DROP INDEX "uq_contact_address_one_main";
DROP INDEX "ix_contact_address_main";

INSERT INTO "ContactAddress" (
  "id", "contactId", "companyId", "street", "number", "city", "state",
  "zipCode", "country", "isMain", "addressType", "createdAt", "updatedAt"
)
SELECT
  'contact-address-' || MD5(address."id" || ':' || link."companyId"),
  address."contactId",
  link."companyId",
  address."street",
  address."number",
  address."city",
  address."state",
  address."zipCode",
  address."country",
  address."isMain",
  address."addressType",
  address."createdAt",
  address."updatedAt"
FROM "ContactAddress" address
JOIN "ContactCompanyLink" link ON link."contactId" = address."contactId"
WHERE address."companyId" IS NULL;

DELETE FROM "ContactAddress" address
WHERE address."companyId" IS NULL
  AND EXISTS (SELECT 1 FROM "ContactCompanyLink" link WHERE link."contactId" = address."contactId");

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "ContactAddress" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'ContactAddress tenant backfill requires a ContactCompanyLink for every historical address';
  END IF;
END $$;

ALTER TABLE "ContactAddress" ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "ContactAddress"
  ADD CONSTRAINT "ContactAddress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ContactAddress_contactId_companyId_fkey" FOREIGN KEY ("contactId", "companyId") REFERENCES "ContactCompanyLink"("contactId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ck_contact_address_geo_coordinates_pair"
    CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
  ADD CONSTRAINT "ck_contact_address_geo_latitude_range"
    CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "ck_contact_address_geo_longitude_range"
    CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);

CREATE UNIQUE INDEX "uq_contact_address_one_main" ON "ContactAddress"("companyId", "contactId") WHERE "isMain" = true;
CREATE INDEX "ix_contact_address_main" ON "ContactAddress"("companyId", "contactId", "isMain");
CREATE INDEX "ix_contact_address_georef_id" ON "ContactAddress"("georefId");
CREATE INDEX "ix_contact_address_geo_validation" ON "ContactAddress"("validationStatus");

COMMIT;
