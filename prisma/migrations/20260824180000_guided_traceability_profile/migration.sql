-- Normalize the minimum traceability requirement while retaining legacy policy evidence.
CREATE TYPE "ArticleTraceabilityRequirement" AS ENUM ('NONE', 'LOT', 'SERIAL', 'LOT_OR_SERIAL', 'LOT_AND_SERIAL');

ALTER TABLE "ArticleTraceabilityPolicy"
  ADD COLUMN "minimumRequirement" "ArticleTraceabilityRequirement" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "expirationRequired" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ArticleTraceabilityPolicy"
SET
  "minimumRequirement" = CASE "policy"
    WHEN 'LOT' THEN 'LOT'::"ArticleTraceabilityRequirement"
    WHEN 'LOT_EXPIRY' THEN 'LOT'::"ArticleTraceabilityRequirement"
    WHEN 'SERIAL' THEN 'SERIAL'::"ArticleTraceabilityRequirement"
    WHEN 'SERIAL_EXPIRY' THEN 'SERIAL'::"ArticleTraceabilityRequirement"
    WHEN 'LOT_SERIAL_EXPIRY' THEN 'LOT_AND_SERIAL'::"ArticleTraceabilityRequirement"
    ELSE 'NONE'::"ArticleTraceabilityRequirement"
  END,
  "expirationRequired" = "policy" IN ('LOT_EXPIRY', 'SERIAL_EXPIRY', 'LOT_SERIAL_EXPIRY');

ALTER TABLE "ArticleTraceabilityPolicy" ALTER COLUMN "policy" DROP NOT NULL;
ALTER TABLE "ScanEvent" ADD COLUMN "captureHistory" JSONB;
