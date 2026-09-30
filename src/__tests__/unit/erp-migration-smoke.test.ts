import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("ERP Backend - Migration & Persistence Smoke Tests", () => {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");

  it("1. active migrations directory contains the canonical baseline", () => {
    const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
    const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    expect(subdirs).toContain("0_ossum_cor_canonical_baseline");
    expect(subdirs).toHaveLength(1);

    const baselineSqlPath = path.join(migrationsDir, "0_ossum_cor_canonical_baseline", "migration.sql");
    expect(fs.existsSync(baselineSqlPath)).toBe(true);

    const baselineSql = fs.readFileSync(baselineSqlPath, "utf8");
    expect(baselineSql.length).toBeGreaterThan(10000);
  });

  it("2. legacy migration history is preserved in archive", () => {
    const archiveDir = path.join(process.cwd(), "prisma", "migrations_archive", "legacy-pre-rebaseline-20260930");
    expect(fs.existsSync(archiveDir)).toBe(true);

    const archivedEntries = fs.readdirSync(archiveDir, { withFileTypes: true });
    const archivedDirs = archivedEntries.filter((e) => e.isDirectory());
    expect(archivedDirs.length).toBe(35);
  });

  it("3. schema.prisma defines strict FK Restrict on NecesidadCompra composite keys", () => {
    const schemaContent = fs.readFileSync(schemaPath, "utf8");

    // Surgery composite relation must be onDelete: Restrict
    expect(schemaContent).toMatch(/surgery\s+Surgery\?\s+@relation\("SurgeryNecesidadesCompra",\s*fields:\s*\[companyId,\s*surgeryId\],\s*references:\s*\[companyId,\s*id\],\s*onDelete:\s*Restrict/);

    // OrdenCompra composite relation must be onDelete: Restrict
    expect(schemaContent).toMatch(/ordenCompra\s+OrdenCompra\?\s+@relation\("OrdenCompraNecesidades",\s*fields:\s*\[companyId,\s*ordenCompraId\],\s*references:\s*\[companyId,\s*id\],\s*onDelete:\s*Restrict/);
  });

  it("4. schema.prisma defines compound unique constraint on OrdenPagoImputacion", () => {
    const schemaContent = fs.readFileSync(schemaPath, "utf8");

    // Must define compound unique constraint to prevent double-imputation at DB level
    expect(schemaContent).toMatch(/@@unique\(\[companyId,\s*ordenPagoId,\s*facturaCompraId\],\s*map:\s*"uq_orden_pago_imputacion_unique"\)/);
  });

  it("5. canonical baseline migration.sql includes the unique index on orden_pago_imputacion", () => {
    const baselineSqlPath = path.join(migrationsDir, "0_ossum_cor_canonical_baseline", "migration.sql");
    const baselineSql = fs.readFileSync(baselineSqlPath, "utf8");

    expect(baselineSql).toContain("uq_orden_pago_imputacion_unique");
    expect(baselineSql).toContain("CREATE UNIQUE INDEX \"uq_orden_pago_imputacion_unique\" ON \"orden_pago_imputacion\"(\"company_id\", \"orden_pago_id\", \"factura_compra_id\");");
  });
});
