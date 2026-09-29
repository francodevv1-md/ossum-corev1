-- Availability capability grants.
-- Additive DDL only: no rows, seed, PIVOT designation, backfill, or feature enablement.

-- CreateTable
CREATE TABLE "AvailabilityCapabilityGrant" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capability" VARCHAR(64) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_capability_grant_scope"
ON "AvailabilityCapabilityGrant"("companyId", "userId", "capability");

-- CreateIndex
CREATE INDEX "ix_availability_capability_grant_lookup"
ON "AvailabilityCapabilityGrant"("companyId", "capability", "isActive");

-- CreateIndex
CREATE INDEX "ix_availability_capability_grant_user_company"
ON "AvailabilityCapabilityGrant"("userId", "companyId");

-- AddCheckConstraint
ALTER TABLE "AvailabilityCapabilityGrant"
ADD CONSTRAINT "AvailabilityCapabilityGrant_capability_check"
CHECK (
    "capability" IN (
        'availability.request.create',
        'availability.request.read',
        'availability.date.correct',
        'availability.pivot.configure'
    )
);

-- AddCheckConstraint
ALTER TABLE "AvailabilityCapabilityGrant"
ADD CONSTRAINT "AvailabilityCapabilityGrant_lifecycle_check"
CHECK (
    (
        "isActive" = true
        AND "revokedById" IS NULL
        AND "revokedAt" IS NULL
        AND "revokeReason" IS NULL
    )
    OR
    (
        "isActive" = false
        AND "revokedById" IS NOT NULL
        AND "revokedAt" IS NOT NULL
        AND "revokeReason" IS NOT NULL
        AND btrim("revokeReason") <> ''
        AND "revokedAt" >= "grantedAt"
    )
);

-- AddForeignKey
ALTER TABLE "AvailabilityCapabilityGrant"
ADD CONSTRAINT "fk_availability_capability_company"
FOREIGN KEY ("companyId") REFERENCES "Company"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCapabilityGrant"
ADD CONSTRAINT "fk_availability_capability_user_access"
FOREIGN KEY ("userId", "companyId") REFERENCES "UserCompanyAccess"("userId", "companyId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCapabilityGrant"
ADD CONSTRAINT "fk_availability_capability_granted_by"
FOREIGN KEY ("grantedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityCapabilityGrant"
ADD CONSTRAINT "fk_availability_capability_revoked_by"
FOREIGN KEY ("revokedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
