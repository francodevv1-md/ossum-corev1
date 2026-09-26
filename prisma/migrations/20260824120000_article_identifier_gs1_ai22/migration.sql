-- GS1 AI (22) is distinct from a generic manufacturer reference.
ALTER TYPE "ArticleIdentifierType" ADD VALUE IF NOT EXISTS 'GS1_AI_22';

-- Captures the original scan used to establish an article identifier; it is never used for matching.
ALTER TABLE "ArticleIdentifier" ADD COLUMN IF NOT EXISTS "sourcePayload" TEXT;
