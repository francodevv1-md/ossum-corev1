-- DEV-only additive vehicle GPS contract. Do not apply without confirmed disposable DEV target.
CREATE TABLE "Vehicle" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'rastreo_satelital',
  "trackingDeviceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_vehicle_company_id" ON "Vehicle"("companyId", "id");
CREATE UNIQUE INDEX "uq_vehicle_tracking_device" ON "Vehicle"("trackingDeviceId");
CREATE INDEX "ix_vehicle_company_provider" ON "Vehicle"("companyId", "provider");

CREATE TABLE "VehicleLatestPosition" (
  "vehicleId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleLatestPosition_pkey" PRIMARY KEY ("vehicleId"),
  CONSTRAINT "VehicleLatestPosition_companyId_vehicleId_fkey" FOREIGN KEY ("companyId", "vehicleId") REFERENCES "Vehicle"("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_vehicle_latest_position_company_vehicle" ON "VehicleLatestPosition"("companyId", "vehicleId");
CREATE INDEX "ix_vehicle_latest_position_company_recorded" ON "VehicleLatestPosition"("companyId", "recordedAt");
