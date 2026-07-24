-- Internal notifications base for Seguimiento @mentions.
-- Idempotent to coexist with existing db-push style environments.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'InternalNotificationType'
    ) THEN
        CREATE TYPE "InternalNotificationType" AS ENUM ('seguimiento_mention');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "InternalNotification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "type" "InternalNotificationType" NOT NULL,
    "eventKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InternalNotification_companyId_eventKey_key"
ON "InternalNotification"("companyId", "eventKey");

CREATE INDEX IF NOT EXISTS "InternalNotification_companyId_recipientUserId_readAt_createdAt_idx"
ON "InternalNotification"("companyId", "recipientUserId", "readAt", "createdAt");

CREATE INDEX IF NOT EXISTS "InternalNotification_recipientUserId_createdAt_idx"
ON "InternalNotification"("recipientUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "InternalNotification_surgeryId_createdAt_idx"
ON "InternalNotification"("surgeryId", "createdAt");

CREATE INDEX IF NOT EXISTS "InternalNotification_sourceEntityId_idx"
ON "InternalNotification"("sourceEntityId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InternalNotification_companyId_fkey'
    ) THEN
        ALTER TABLE "InternalNotification"
            ADD CONSTRAINT "InternalNotification_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "Company"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InternalNotification_recipientUserId_fkey'
    ) THEN
        ALTER TABLE "InternalNotification"
            ADD CONSTRAINT "InternalNotification_recipientUserId_fkey"
            FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InternalNotification_actorUserId_fkey'
    ) THEN
        ALTER TABLE "InternalNotification"
            ADD CONSTRAINT "InternalNotification_actorUserId_fkey"
            FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InternalNotification_surgeryId_fkey'
    ) THEN
        ALTER TABLE "InternalNotification"
            ADD CONSTRAINT "InternalNotification_surgeryId_fkey"
            FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
