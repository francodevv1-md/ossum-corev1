import { readFileSync } from "node:fs"
import type { PrismaClient } from "@prisma/client"
import { config as loadEnv } from "dotenv"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const migration = readFileSync(
  "prisma/migrations/20260903030000_surgery_visible_number_uniqueness/migration.sql",
  "utf8",
)
const migrationStatements = migration
  .split(/;\s*(?=CREATE UNIQUE INDEX)/)
  .map((statement) => statement.trim())
  .filter(Boolean)

const RUN_FLAG = "OSSUM_RUN_SURGERY_VISIBLE_NUMBER_MIGRATION_DEV_INTEGRATION"
const DEV_PROJECT_REF = "yywqcdromnmmelijvspi"
if (process.env[RUN_FLAG] === "true") {
  loadEnv({ path: ".env.local", override: false })
  loadEnv({ path: ".env", override: false })
}
const integrationDescribe = process.env[RUN_FLAG] === "true" ? describe : describe.skip
let prisma: PrismaClient | undefined

function assertDisposableDevTarget() {
  if (process.env.OSSUM_DEPLOYMENT_TIER !== "development" || process.env.NODE_ENV === "production") {
    throw new Error("Surgery migration integration refused: explicit DEV gate is not satisfied")
  }

  const databaseUrl = process.env.DATABASE_URL
  const supabaseUrl = process.env.SUPABASE_URL
  if (!databaseUrl || !supabaseUrl) throw new Error("Surgery migration integration refused: DEV identity is incomplete")

  const database = new URL(databaseUrl)
  const supabase = new URL(supabaseUrl.replace(/\/rest\/v1\/?$/, ""))
  if (!database.hostname.includes(DEV_PROJECT_REF) && !database.username.includes(DEV_PROJECT_REF)) {
    throw new Error("Surgery migration integration refused: database is not the approved DEV project")
  }
  if (supabase.hostname !== `${DEV_PROJECT_REF}.supabase.co`) {
    throw new Error("Surgery migration integration refused: Supabase identity does not match DEV")
  }
}

describe("Surgery visible-number uniqueness migration", () => {
  it("repairs duplicates before enforcing company-scoped uniqueness", () => {
    const repair = migration.indexOf('UPDATE "Surgery"')
    const constraint = migration.indexOf('CREATE UNIQUE INDEX "Surgery_companyId_visibleNumber_key"')

    expect(repair).toBeGreaterThan(-1)
    expect(constraint).toBeGreaterThan(repair)
    expect(migration).toContain('PARTITION BY "companyId", "visibleNumber"')
    expect(migration).toContain('ON "Surgery"("companyId", "visibleNumber")')
    expect(migration).toContain('AS NUMERIC')
    expect(migration).toContain('GREATEST(')
    expect(migration).not.toContain('AS INTEGER')
    expect(migrationStatements).toHaveLength(2)
  })
})

integrationDescribe("Surgery visible-number uniqueness migration on PostgreSQL", () => {
  beforeAll(async () => {
    assertDisposableDevTarget()
    prisma = (await import("@/lib/prisma")).default
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("repairs duplicates per company, preserves nulls, and creates the unique index", async () => {
    if (!prisma) throw new Error("Surgery migration integration Prisma client is unavailable")

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`
        CREATE TEMP TABLE "Surgery" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "visibleNumber" TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL
        ) ON COMMIT DROP
      `)
      await tx.$executeRawUnsafe(`
        INSERT INTO "Surgery" ("id", "companyId", "visibleNumber", "createdAt") VALUES
          ('a-old', 'company-a', 'CX-9999', '2026-01-01'),
          ('a-new', 'company-a', 'CX-9999', '2026-01-02'),
          ('a-huge-old', 'company-a', 'CX-214748364800000000000000', '2026-01-03'),
          ('a-huge-new', 'company-a', 'CX-214748364800000000000000', '2026-01-04'),
          ('a-null-1', 'company-a', NULL, '2026-01-05'),
          ('a-null-2', 'company-a', NULL, '2026-01-06'),
          ('b-old', 'company-b', 'CX-9999', '2026-01-01'),
          ('b-new', 'company-b', 'CX-9999', '2026-01-02')
      `)
      for (const statement of migrationStatements) await tx.$executeRawUnsafe(statement)

      const duplicates = await tx.$queryRawUnsafe<Array<{ count: number }>>(`
        SELECT COUNT(*)::int AS count FROM (
          SELECT "companyId", "visibleNumber"
          FROM "Surgery"
          WHERE "visibleNumber" IS NOT NULL
          GROUP BY "companyId", "visibleNumber"
          HAVING COUNT(*) > 1
        ) duplicate_groups
      `)
      const rows = await tx.$queryRawUnsafe<Array<{ id: string; visibleNumber: string | null }>>(`
        SELECT "id", "visibleNumber" FROM "Surgery" ORDER BY "id"
      `)
      const byId = new Map(rows.map((row) => [row.id, row.visibleNumber]))

      expect(duplicates[0]?.count).toBe(0)
      expect(byId.get("a-old")).toBe("CX-9999")
      expect(byId.get("b-old")).toBe("CX-9999")
      expect(byId.get("a-huge-old")).toBe("CX-214748364800000000000000")
      expect(byId.get("a-new")).not.toBe("CX-9999")
      expect(byId.get("b-new")).not.toBe("CX-9999")
      expect(byId.get("a-huge-new")).not.toBe("CX-214748364800000000000000")
      expect(byId.get("a-null-1")).toBeNull()
      expect(byId.get("a-null-2")).toBeNull()
    })
  })
})
