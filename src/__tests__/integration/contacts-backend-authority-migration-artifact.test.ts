import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "prisma/migrations/20260903130000_contacts_backend_authority/migration.sql"), "utf8");

describe("contacts backend authority migration", () => {
  it("backfills code and roles before adding company constraints", () => {
    expect(sql.indexOf('UPDATE "ContactCompanyLink"')).toBeLessThan(sql.indexOf('ALTER COLUMN "code" SET NOT NULL'));
    expect(sql.indexOf('ALTER COLUMN "code" SET NOT NULL')).toBeLessThan(sql.indexOf('"uq_contact_company_code"'));
    expect(sql).toContain('"ck_contact_company_code_format"');
    expect(sql).toContain('pg_advisory_xact_lock(hashtextextended(NEW."companyId", 0))');
    expect(sql).toContain('CREATE TRIGGER "trg_allocate_contact_company_code"');
    expect(sql.indexOf('CREATE TRIGGER "trg_allocate_contact_company_code"')).toBeLessThan(sql.indexOf('"ck_contact_company_code_format"'));
    expect(sql).toContain('CARDINALITY("roles") = 0');
    expect(sql).toContain('LOWER("role")');
  });

  it("seeds stable group slugs and preserves address rows", () => {
    expect(sql).toContain("('medicos', 'Médicos', 'cliente')");
    expect(sql).toContain('"uq_contact_group_company_slug"');
    expect(sql).toContain('"uq_contact_address_one_main"');
    expect(sql).not.toMatch(/\b(?:DROP TABLE|TRUNCATE|DELETE FROM)\b/i);
  });
});
