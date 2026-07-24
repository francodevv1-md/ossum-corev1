import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRemitoDevPreset } from "@/lib/services/remito-dev-preset.service";

const companyId = "codevdistricorr100000000000";

function fixture() {
  return {
    origin: "manual",
    salidaReason: "cirugia",
    destinatarioSnapshot: { name: "Paciente DEMO-CONSUMO-REMITO", fixture: "DEV-only" },
    shippingAddressSnapshot: { label: "Entrega demostración DEV" },
    transportSnapshot: null,
    packageCount: 1,
    declaredValue: { toString: () => "0" },
    metadata: { fixture: "DEMO-CONSUMO-REMITO" },
    items: [
      { itemId: null, sku: "DEMO-TRAZA-001", description: "Implante A", quantity: { toString: () => "1" }, unit: "unidad", boxId: null, presupuestoItemId: null, lotNumber: "LOTE-001", serialNumber: "SERIE-001", expirationDate: new Date("2030-12-31T00:00:00.000Z"), metadata: { fixture: "DEV-only" } },
      { itemId: null, sku: "DEMO-TRAZA-002", description: "Implante B", quantity: { toString: () => "1" }, unit: "unidad", boxId: null, presupuestoItemId: null, lotNumber: "LOTE-002", serialNumber: "SERIE-002", expirationDate: new Date("2031-12-31T00:00:00.000Z"), metadata: { fixture: "DEV-only" } },
    ],
  };
}

function prismaMock(overrides: Record<string, unknown> = {}) {
  return {
    company: { findFirst: vi.fn().mockResolvedValue({ id: companyId }) },
    branch: { findMany: vi.fn().mockResolvedValue([{ id: "branch-dev", name: "Sucursal 1 · DEV" }]) },
    surgery: { findMany: vi.fn().mockResolvedValue([{ id: "surgery-dev", remitos: [fixture()] }]) },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("OSSUM_ENABLE_DEV_REMITO_PRESET", "true");
  vi.stubEnv("OSSUM_DEV_REMITO_PRESET_COMPANY_ID", companyId);
});

afterEach(() => vi.unstubAllEnvs());

describe("getRemitoDevPreset", () => {
  it.each([
    ["production", () => vi.stubEnv("NODE_ENV", "production"), companyId],
    ["disabled flag", () => vi.stubEnv("OSSUM_ENABLE_DEV_REMITO_PRESET", "false"), companyId],
    ["configured company mismatch", () => vi.stubEnv("OSSUM_DEV_REMITO_PRESET_COMPANY_ID", "other-company"), companyId],
    ["request company mismatch", () => undefined, "other-company"],
  ])("returns unavailable for %s gate", async (_name, prepare, requestedCompanyId) => {
    prepare();
    const prisma = prismaMock();

    await expect(getRemitoDevPreset({ companyId: requestedCompanyId, prisma })).resolves.toEqual({ available: false });
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    ["inactive or unexpected company", { company: { findFirst: vi.fn().mockResolvedValue(null) } }],
    ["missing branch", { branch: { findMany: vi.fn().mockResolvedValue([]) } }],
    ["duplicate branch", { branch: { findMany: vi.fn().mockResolvedValue([{ id: "a", name: "Sucursal 1 · DEV" }, { id: "b", name: "Sucursal 1 · DEV" }]) } }],
    ["missing fixture", { surgery: { findMany: vi.fn().mockResolvedValue([]) } }],
    ["duplicate fixture", { surgery: { findMany: vi.fn().mockResolvedValue([{ id: "one", remitos: [fixture()] }, { id: "two", remitos: [fixture()] }]) } }],
    ["inconsistent fixture lines", { surgery: { findMany: vi.fn().mockResolvedValue([{ id: "surgery-dev", remitos: [{ ...fixture(), items: fixture().items.slice(0, 1) }] }]) } }],
  ])("returns unavailable for %s", async (_name, overrides) => {
    const prisma = prismaMock(overrides);
    await expect(getRemitoDevPreset({ companyId, prisma })).resolves.toEqual({ available: false });
  });

  it("returns only the resolved branch and non-secret two-line example", async () => {
    const prisma = prismaMock();
    const result = await getRemitoDevPreset({ companyId, prisma });

    expect(result).toMatchObject({
      available: true,
      branch: { id: "branch-dev", label: "Sucursal 1 · DEV" },
      example: {
        surgeryId: "surgery-dev",
        recipientSnapshot: { nombre: "Paciente DEMO-CONSUMO-REMITO" },
        items: [
          { sku: "DEMO-TRAZA-001", lotNumber: "LOTE-001", serialNumber: "SERIE-001", expirationDate: "2030-12-31" },
          { sku: "DEMO-TRAZA-002", lotNumber: "LOTE-002", serialNumber: "SERIE-002", expirationDate: "2031-12-31" },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain("OSSUM_DEV_REMITO_PRESET_COMPANY_ID");
    expect(prisma).not.toHaveProperty("auditEvent");
    expect(prisma).not.toHaveProperty("$transaction");
  });
});
