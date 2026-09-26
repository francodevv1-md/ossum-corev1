-- Keep per-unit scan evidence linked to its resolved article without changing existing scans.
ALTER TABLE "ScanEvent" ADD COLUMN IF NOT EXISTS "articleId" TEXT;

ALTER TABLE "ScanEvent"
  ADD CONSTRAINT "fk_scan_event_article"
  FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ScanEvent_companyId_receiptId_resolutionStatus_idx"
  ON "ScanEvent"("companyId", "receiptId", "resolutionStatus");
CREATE INDEX IF NOT EXISTS "ScanEvent_articleId_idx" ON "ScanEvent"("articleId");
