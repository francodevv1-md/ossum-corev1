import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "prisma/migrations/20260831010000_presupuesto_authority_unification_dev_001/migration.sql"),
  "utf8"
);
const correctiveSql = readFileSync(
  resolve(process.cwd(), "prisma/migrations/20260831073000_presupuesto_authority_corrective_dev_001/migration.sql"),
  "utf8"
);

describe("Presupuesto authority migration", () => {
  it("enforces tenant families, one draft/current slot, version uniqueness, and state-slot compatibility", () => {
    expect(sql).toContain('FOREIGN KEY ("companyId", "familyId")');
    expect(sql).toContain('"uq_presupuesto_family_surgery"');
    expect(sql).toContain('"uq_presupuesto_family_draft"');
    expect(sql).toContain('"uq_presupuesto_family_current"');
    expect(sql).toContain('"uq_presupuesto_family_version"');
    expect(sql).toContain('"ck_presupuesto_slot_state"');
  });

  it("contains no destructive legacy repair", () => {
    expect(sql).not.toMatch(/^\s*(?:DROP|TRUNCATE|DELETE\s+FROM|UPDATE\s+.+\s+SET)\b/im);
    expect(correctiveSql).not.toMatch(/^\s*(?:TRUNCATE|DELETE\s+FROM|UPDATE\s+.+\s+SET)\b/im);
  });

  it("rolls forward tenant references and same-family lineage at the database boundary", () => {
    expect(correctiveSql).toContain('FOREIGN KEY ("companyId", "branchId")');
    expect(correctiveSql).toContain('FOREIGN KEY ("clientContactId", "companyId")');
    expect(correctiveSql).toContain('FOREIGN KEY ("payerContactId", "companyId")');
    expect(correctiveSql).toContain('FOREIGN KEY ("companyId", "surgeryId")');
    expect(correctiveSql).toContain('FOREIGN KEY ("familyId", "parentPresupuestoId")');
    expect(correctiveSql).toContain('FOREIGN KEY ("familyId", "sourcePresupuestoId")');
    expect(correctiveSql).toContain('"trg_presupuesto_family_surgery_lineage"');
    expect(correctiveSql).toContain('IS DISTINCT FROM NEW."surgeryId"');
  });
});
