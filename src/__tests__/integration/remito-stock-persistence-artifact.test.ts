import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("prisma/migrations/20260813000000_remito_stock_atomic_dispatch_persistence_001/migration.sql"), "utf8").replaceAll("\r\n", "\n");
const objectRows = readFileSync(resolve("knowledge/specs/STOCK-CAJAS-C14-SIMPLIFICATION-001/OBJECT_BLOCKS.cjl1"), "utf8")
  .trim().split("\n").map((line) => JSON.parse(line) as { objectId: string; rendering: { bytesBase64?: string } });
const objects = objectRows.map((row, index) => ({
  objectId: row.objectId,
  bytes: index === 0
    ? "CREATE EXTENSION btree_gist SCHEMA public VERSION '1.7';\n"
    : Buffer.from(row.rendering.bytesBase64!, "base64").toString("utf8"),
}));

describe("REMITO-STOCK-ATOMIC-DISPATCH-001 migration artifact (DB-disconnected)", () => {
  it("contains the exact dependency-ordered 169-object stream", () => {
    expect(objects).toHaveLength(169);
    let offset = -1;
    for (const object of objects) {
      const next = sql.indexOf(object.bytes, offset + 1);
      expect(next, object.objectId).toBeGreaterThan(offset);
      expect(sql.indexOf(object.bytes, next + 1), `${object.objectId} duplicated`).toBe(-1);
      offset = next;
    }
    expect(createHash("sha256").update(objects[0].bytes).digest("hex"))
      .toBe("c57f9732a33fba49c789456d77b6c80ffb9bcd794936f992d4c1323b38569c1f");
  });

  it("creates the canonical persistence inventory and no unrelated destructive statement", () => {
    for (const table of [
      "Article", "StockArticleEligibility", "StockPosition", "StockEvidence", "StockEvidenceLine",
      "StockReservation", "StockReservationEvidence", "OperationalCommandAcceptance", "OperationalCommandEffect",
      "cajas_assignment", "cajas_control", "cajas_dispatch", "cajas_dispatch_line", "durable_attempt_audit_event",
    ]) expect(sql).toContain(`CREATE TABLE "${table}"`);
    for (const prerequisite of ["uq_devolucion_id_remito", "uq_consumo_id_remito"])
      expect(sql).toContain(`CREATE UNIQUE INDEX IF NOT EXISTS "${prerequisite}"`);

    expect(sql).not.toMatch(/\b(?:DROP\s+(?:TABLE|SCHEMA|TYPE)|TRUNCATE|DELETE\s+FROM)\b/i);
    for (const unrelated of ["Organization", "Company", "User", "Surgery", "Remito", "RemitoScanLocator", "Invoice", "Payment"])
      expect(sql).not.toMatch(new RegExp(`(?:DROP\\s+TABLE|TRUNCATE|DELETE\\s+FROM)\\s+"${unrelated}"`, "i"));
  });

  it("enforces append-only durable audit identity, chain, and reconciliation lookup", () => {
    for (const invariant of [
      "ck_daae_event_kind", "ck_daae_event_ordinal", "ck_daae_chain_root", "ck_daae_hashes_hex",
      "uq_daae_correlation_ordinal", "uq_daae_correlation_predecessor", "fk_daae_predecessor", "ix_daae_company_semantic_time",
      "fn_durable_attempt_audit_event_append_only", "trg_durable_attempt_audit_event_append_only",
    ]) expect(sql).toContain(`"${invariant}"`);
    for (const event of ["PROCESS_DEATH_UNKNOWN", "SUCCESS_RECOVERED", "ROLLED_BACK_RECOVERED", "AUDIT_PENDING"])
      expect(sql).toContain(`'${event}'`);
    expect(sql).toContain("BEFORE UPDATE OR DELETE");
  });
});
