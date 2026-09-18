-- Formalize migration history for UserModuleViewPreference after prior db push rollout.
-- This migration is intentionally idempotent so it can be safely recorded on databases
-- where the table already exists and also bootstrap fresh databases from migration history.

CREATE TABLE IF NOT EXISTS "UserModuleViewPreference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "preferences" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModuleViewPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserModuleViewPreference_companyId_userId_moduleKey_key"
ON "UserModuleViewPreference"("companyId", "userId", "moduleKey");

CREATE INDEX IF NOT EXISTS "UserModuleViewPreference_companyId_moduleKey_idx"
ON "UserModuleViewPreference"("companyId", "moduleKey");

CREATE INDEX IF NOT EXISTS "UserModuleViewPreference_userId_moduleKey_idx"
ON "UserModuleViewPreference"("userId", "moduleKey");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'UserModuleViewPreference_companyId_fkey'
    ) THEN
        ALTER TABLE "UserModuleViewPreference"
            ADD CONSTRAINT "UserModuleViewPreference_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "Company"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'UserModuleViewPreference_userId_fkey'
    ) THEN
        ALTER TABLE "UserModuleViewPreference"
            ADD CONSTRAINT "UserModuleViewPreference_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;
