-- DEV-only additive geographic contract. Do not apply without confirmed disposable DEV target.
CREATE TYPE "GeographicEntityType" AS ENUM ('PROVINCE', 'DEPARTMENT', 'MUNICIPALITY', 'LOCALITY', 'ADDRESS');
CREATE TYPE "GeographicCoordinateType" AS ENUM ('CENTROID', 'ADDRESS', 'GPS', 'SURVEY', 'MANUAL', 'UNKNOWN');
CREATE TYPE "GeographicCrs" AS ENUM ('EPSG:4326');
CREATE TYPE "GeographicValidationStatus" AS ENUM ('verified', 'candidate', 'conflict', 'missing', 'manual_verified', 'deprecated');

ALTER TABLE "ContactAddress"
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

ALTER TABLE "ContactAddress"
  ADD CONSTRAINT "ck_contact_address_geo_coordinates_pair"
    CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
  ADD CONSTRAINT "ck_contact_address_geo_latitude_range"
    CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "ck_contact_address_geo_longitude_range"
    CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);

CREATE INDEX "ix_contact_address_georef_id" ON "ContactAddress"("georefId");
CREATE INDEX "ix_contact_address_geo_validation" ON "ContactAddress"("validationStatus");
