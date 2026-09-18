import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("coordination shipping persistence artifact", () => {
  it("keeps the schema and additive migration aligned without a backfill", () => {
    const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");
    const migration = readFileSync(
      resolve("prisma/migrations/20260815233000_coordination_shipping_transport_001/migration.sql"),
      "utf8"
    );

    expect(schema).toContain("materialShippingDate     DateTime? @db.Date");
    expect(schema).toContain("materialTransport        String?");
    expect(migration).toBe(
      'ALTER TABLE "Surgery"\n  ADD COLUMN "materialShippingDate" DATE,\n  ADD COLUMN "materialTransport" TEXT;\n'
    );
    expect(migration).not.toMatch(/UPDATE|INSERT|DELETE/i);
  });
});
