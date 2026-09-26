import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Cajas unit-log persistence artifact", () => {
  it("requires article identity in both Prisma and the unapplied migration", () => {
    const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");
    const migration = readFileSync(resolve("prisma/migrations/20260826123000_cajas_unit_log_v1/migration.sql"), "utf8");
    const model = schema.match(/model CajasUnitLogEntry \{[\s\S]*?\n\}/)?.[0] ?? "";

    expect(model).toMatch(/articleId\s+String\s+@map\("article_id"\)/);
    expect(model).toMatch(/article\s+StockArticleEligibility\s+@relation/);
    expect(migration).toContain('"article_id" TEXT NOT NULL');
  });
});
