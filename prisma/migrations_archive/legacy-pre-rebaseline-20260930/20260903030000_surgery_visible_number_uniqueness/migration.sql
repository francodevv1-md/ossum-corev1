-- Preserve the earliest Surgery for every company-scoped duplicate and move
-- later duplicates above the company's current canonical CX sequence.
WITH canonical_max AS (
  SELECT
    "companyId",
    COALESCE(
      MAX(CAST(SUBSTRING("visibleNumber" FROM 4) AS NUMERIC))
        FILTER (WHERE "visibleNumber" ~ '^CX-[0-9]+$'),
      0
    ) AS "maxSequence"
  FROM "Surgery"
  GROUP BY "companyId"
),
ranked_duplicates AS (
  SELECT
    "id",
    "companyId",
    ROW_NUMBER() OVER (
      PARTITION BY "companyId", "visibleNumber"
      ORDER BY "createdAt", "id"
    ) AS "duplicateRank"
  FROM "Surgery"
  WHERE "visibleNumber" IS NOT NULL
),
reassignments AS (
  SELECT
    duplicate."id",
    duplicate."companyId",
    ROW_NUMBER() OVER (
      PARTITION BY duplicate."companyId"
      ORDER BY surgery."createdAt", duplicate."id"
    ) AS "offset"
  FROM ranked_duplicates duplicate
  JOIN "Surgery" surgery ON surgery."id" = duplicate."id"
  WHERE duplicate."duplicateRank" > 1
)
UPDATE "Surgery" surgery
SET "visibleNumber" = 'CX-' || LPAD(
  (canonical_max."maxSequence" + reassignments."offset")::TEXT,
  GREATEST(
    4,
    LENGTH((canonical_max."maxSequence" + reassignments."offset")::TEXT)
  ),
  '0'
)
FROM reassignments
JOIN canonical_max ON canonical_max."companyId" = reassignments."companyId"
WHERE surgery."id" = reassignments."id";

CREATE UNIQUE INDEX "Surgery_companyId_visibleNumber_key"
  ON "Surgery"("companyId", "visibleNumber");
