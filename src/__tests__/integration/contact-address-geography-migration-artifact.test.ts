import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "prisma/migrations/20260910120000_contact_address_geography/migration.sql"), "utf8");

describe("contact address geography migration", () => {
  it("duplicates every legacy address into each linked company before requiring a tenant", () => {
    const insertAt = sql.indexOf('INSERT INTO "ContactAddress"');
    const deleteAt = sql.indexOf('DELETE FROM "ContactAddress"');
    const requiredAt = sql.indexOf('ALTER COLUMN "companyId" SET NOT NULL');
    const dropAt = sql.indexOf('DROP INDEX "uq_contact_address_one_main"');

    expect(sql).toContain("JOIN \"ContactCompanyLink\" link ON link.\"contactId\" = address.\"contactId\"");
    expect(sql).toContain("'contact-address-' || MD5(address.\"id\" || ':' || link.\"companyId\")");
    expect(dropAt).toBeGreaterThan(-1);
    expect(dropAt).toBeLessThan(insertAt);
    expect(insertAt).toBeLessThan(deleteAt);
    expect(deleteAt).toBeLessThan(requiredAt);
    expect(sql).not.toContain("contacts linked to multiple companies");
  });
});
