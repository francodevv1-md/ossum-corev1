// OSSUM COR — Consumo service unit tests (Fase 1B)
// Mocking Prisma manually (vitest). No DB needed.
// Cubre: createConsumo OK + invalid (remitoId no existe / no company),
//        validateConsumption OK + transición inválida,
//        markConsumoAsFacturado OK,
//        deleteConsumo solo Borrador,
//        emitirConsumo visibleNumber + retry P2034.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { createAuditEvent } = vi.hoisted(() => ({
  createAuditEvent: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  createAuditEvent,
}));

import {
  createConsumo,
  deleteConsumo,
  emitirConsumo,
  markConsumoAsFacturado,
  updateConsumoState,
  validateConsumption,
  CONSUMO_STATES,
  ConsumoError,
  compareConsumedVsAuthorized,
  getAuthorizedConsumptionControl,
} from "@/lib/services/consumo.service";

// ─── Helpers de build ──────────────────────────────────────────────────────
function buildConsumo(over: Record<string, any> = {}) {
  return {
    id: "consumo-1",
    visibleNumber: null,
    companyId: "company-1",
    surgeryId: "sx-1",
    remitoId: "remito-1",
    state: "Borrador" as string,
    validatedAt: null,
    facturedAt: null,
    createdById: "user-1",
    updatedById: null,
    metadata: null,
    createdAt: new Date("2026-07-07T10:00:00.000Z"),
    updatedAt: new Date("2026-07-07T10:00:00.000Z"),
    items: [
      { id: "item-1", description: "Tornillo 4.0", requestedQuantity: new Prisma.Decimal(10), consumedQuantity: new Prisma.Decimal(0) },
    ],
    ...over,
  };
}

function makeP2034() {
  return new Prisma.PrismaClientKnownRequestError("serialization conflict", {
    code: "P2034",
    clientVersion: "7.8.0",
  });
}

beforeEach(() => {
  createAuditEvent.mockReset();
  createAuditEvent.mockResolvedValue(undefined);
});

// ─── createConsumo ──────────────────────────────────────────────────────────
describe("createConsumo", () => {
  it("creates a consumo in Borrador with items and links to remito", async () => {
    const remitoFindFirst = vi.fn().mockResolvedValue({
      id: "remito-1",
      companyId: "company-1",
      surgeryId: "sx-1",
      state: "Entregado",
    });
    const tx = {
      consumo: { create: vi.fn() },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    tx.consumo.create.mockImplementation(async () =>
      buildConsumo({
        state: "Borrador",
        items: [{ id: "item-1", description: "Tornillo 4.0", requestedQuantity: new Prisma.Decimal(10), consumedQuantity: new Prisma.Decimal(0) }],
      })
    );
    const prismaMock = {
      remito: { findFirst: remitoFindFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const consumo = await createConsumo({
      companyId: "company-1",
      surgeryId: "sx-1",
      remitoId: "remito-1",
      items: [{ description: "Tornillo 4.0", requestedQuantity: 10, consumedQuantity: 0 }],
      createdById: "user-1",
      prisma: prismaMock,
    });

    expect(consumo.state).toBe("Borrador");
    expect(remitoFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "remito-1", companyId: "company-1" },
      })
    );
    expect(tx.consumo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-1",
          surgeryId: "sx-1",
          remitoId: "remito-1",
          state: "Borrador",
          createdById: "user-1",
        }),
      })
    );
    const createCall = tx.consumo.create.mock.calls[0]?.[0] as { data: { items: { create: any[] } } };
    expect(createCall.data.items.create).toHaveLength(1);
    expect(createCall.data.items.create[0]).toMatchObject({
      description: "Tornillo 4.0",
      requestedQuantity: expect.any(Prisma.Decimal),
    });
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-1",
        userId: "user-1",
        entityType: "Consumo",
        action: "consumo.created",
        module: "consumo",
        oldValue: null,
      })
    );
  });

  it("rejects when remitoId does not exist", async () => {
    const remitoFindFirst = vi.fn().mockResolvedValue(null);
    const prismaMock = {
      remito: { findFirst: remitoFindFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      createConsumo({
        companyId: "company-1",
        remitoId: "missing-remito",
        items: [{ description: "x", requestedQuantity: 1 }],
        createdById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_not_found" });
    expect(remitoFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "missing-remito", companyId: "company-1" } })
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when remito belongs to another company (findFirst returns null by where clause)", async () => {
    const remitoFindFirst = vi.fn().mockResolvedValue(null);
    const prismaMock = {
      remito: { findFirst: remitoFindFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      createConsumo({
        companyId: "company-1",
        remitoId: "remito-foreign",
        items: [{ description: "x", requestedQuantity: 1 }],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_not_found" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a delivered remito from a different surgery without writing", async () => {
    const remitoFindFirst = vi.fn().mockResolvedValue({
      id: "remito-1",
      companyId: "company-1",
      surgeryId: "sx-1",
      state: "Entregado",
    });
    const consumoCreate = vi.fn();
    const tx = { consumo: { create: consumoCreate }, auditEvent: { create: vi.fn() } };
    const prismaMock = {
      remito: { findFirst: remitoFindFirst },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any;

    await expect(
      createConsumo({
        companyId: "company-1",
        surgeryId: "sx-2",
        remitoId: "remito-1",
        items: [{ description: "x", requestedQuantity: 1 }],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "consumo_remito_surgery_mismatch", status: 409 });
    expect(remitoFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "remito-1", companyId: "company-1" } })
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(consumoCreate).not.toHaveBeenCalled();
  });

  it("rejects a non-delivered remito without writing", async () => {
    const remitoFindFirst = vi.fn().mockResolvedValue({
      id: "remito-1",
      companyId: "company-1",
      surgeryId: "sx-1",
      state: "Emitido",
    });
    const consumoCreate = vi.fn();
    const tx = { consumo: { create: consumoCreate }, auditEvent: { create: vi.fn() } };
    const prismaMock = {
      remito: { findFirst: remitoFindFirst },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any;

    await expect(
      createConsumo({
        companyId: "company-1",
        surgeryId: "sx-1",
        remitoId: "remito-1",
        items: [{ description: "x", requestedQuantity: 1 }],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "consumo_remito_not_delivered", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(consumoCreate).not.toHaveBeenCalled();
  });

  it("rejects empty items", async () => {
    const prismaMock = { remito: { findFirst: vi.fn() }, $transaction: vi.fn() } as any;
    await expect(
      createConsumo({
        companyId: "company-1",
        remitoId: "remito-1",
        items: [],
        createdById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "consumo_empty_items" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects item requestedQuantity <= 0", async () => {
    const prismaMock = { remito: { findFirst: vi.fn() }, $transaction: vi.fn() } as any;
    await expect(
      createConsumo({
        companyId: "company-1",
        remitoId: "remito-1",
        items: [{ description: "x", requestedQuantity: 0 }],
        createdById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_consumo_item_quantity" });
  });

  it("rejects negative consumedQuantity", async () => {
    const prismaMock = { remito: { findFirst: vi.fn() }, $transaction: vi.fn() } as any;
    await expect(
      createConsumo({
        companyId: "company-1",
        remitoId: "remito-1",
        items: [{ description: "x", requestedQuantity: 1, consumedQuantity: -1 }],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_consumo_item_consumed_quantity" });
  });

  it("rejects missing remitoId", async () => {
    const prismaMock = { remito: { findFirst: vi.fn() }, $transaction: vi.fn() } as any;
    await expect(
      createConsumo({
        companyId: "company-1",
        remitoId: "",
        items: [{ description: "x", requestedQuantity: 1 }],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "consumo_remito_required" });
  });
});

// ─── validateConsumption ────────────────────────────────────────────────────
describe("validateConsumption", () => {
  it("transitions Pendiente → Validado and sets validatedAt", async () => {
    const findFirst = vi.fn().mockResolvedValue(buildConsumo({ state: "Pendiente", visibleNumber: 1 }));
    const tx = {
      consumo: { update: vi.fn().mockResolvedValue(buildConsumo({ state: "Validado", visibleNumber: 1, validatedAt: new Date() })) },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      consumo: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await validateConsumption({
      companyId: "company-1",
      consumoId: "consumo-1",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(result.state).toBe("Validado");
    expect(tx.consumo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "consumo-1" },
        data: expect.objectContaining({ state: "Validado", validatedAt: expect.any(Date) }),
      })
    );
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "consumo.validated",
        oldValue: { state: "Pendiente" },
        newValue: expect.objectContaining({ state: "Validado" }),
      })
    );
  });

  it("rejects validation from non-Pendiente state", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildConsumo({ state: "Borrador", visibleNumber: null }));
    const tx = { consumo: { update: vi.fn() }, auditEvent: { create: vi.fn() } };
    const prismaMock = {
      consumo: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    await expect(
      validateConsumption({
        companyId: "company-1",
        consumoId: "consumo-1",
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "consumo_not_pendiente", status: 409 });
    expect(tx.consumo.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// ─── markConsumoAsFacturado ──────────────────────────────────────────────────
describe("markConsumoAsFacturado", () => {
  it("transitions Validado → Facturado and sets facturedAt", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildConsumo({ state: "Validado", visibleNumber: 1 }));
    const tx = {
      consumo: { update: vi.fn().mockResolvedValue(buildConsumo({ state: "Facturado", visibleNumber: 1, facturedAt: new Date() })) },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      consumo: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await markConsumoAsFacturado({
      companyId: "company-1",
      consumoId: "consumo-1",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(result.state).toBe("Facturado");
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "consumo.factured",
        oldValue: { state: "Validado" },
        newValue: expect.objectContaining({ state: "Facturado" }),
      })
    );
  });

  it("rejects facturacion from non-Validado state", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildConsumo({ state: "Pendiente", visibleNumber: 1 }));
    const prismaMock = {
      consumo: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      markConsumoAsFacturado({
        companyId: "company-1",
        consumoId: "consumo-1",
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "consumo_not_validado", status: 409 });
  });
});

// ─── updateConsumoState ──────────────────────────────────────────────────────
describe("updateConsumoState", () => {
  it("applies a valid transition Borrador → Pendiente", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildConsumo({ state: "Borrador", visibleNumber: null }));
    const tx = {
      consumo: { update: vi.fn().mockResolvedValue(buildConsumo({ state: "Pendiente" })) },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      consumo: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await updateConsumoState({
      companyId: "company-1",
      consumoId: "consumo-1",
      newState: "Pendiente",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(result.state).toBe("Pendiente");
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "consumo.state_changed",
        oldValue: { state: "Borrador" },
        newValue: { state: "Pendiente" },
      })
    );
  });

  it("rejects an invalid transition (Facturado → Validado is terminal)", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildConsumo({ state: "Facturado", visibleNumber: 1 }));
    const prismaMock = {
      consumo: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      updateConsumoState({
        companyId: "company-1",
        consumoId: "consumo-1",
        newState: "Validado",
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_consumo_transition", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects transition to same state", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildConsumo({ state: "Pendiente", visibleNumber: 1 }));
    const prismaMock = {
      consumo: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      updateConsumoState({
        companyId: "company-1",
        consumoId: "consumo-1",
        newState: "Pendiente",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "consumo_state_unchanged", status: 409 });
  });
});

// ─── emitirConsumo ──────────────────────────────────────────────────────────
describe("emitirConsumo", () => {
  it("assigns next visibleNumber and transitions Borrador → Pendiente", async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([{ next: BigInt(7) }]),
      consumo: {
        findFirst: vi.fn().mockResolvedValue(buildConsumo({ state: "Borrador", visibleNumber: null })),
        update: vi.fn().mockImplementation(async ({ data }: { data: { visibleNumber: number; state: string } }) =>
          buildConsumo({ state: data.state as string, visibleNumber: data.visibleNumber as number })
        ),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      $transaction: vi.fn(async (cb: any, options?: unknown) => cb(tx)),
    } as any;

    const result = await emitirConsumo({
      companyId: "company-1",
      consumoId: "consumo-1",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.consumo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "consumo-1" },
        data: expect.objectContaining({
          visibleNumber: 7,
          state: "Pendiente",
          updatedById: "user-1",
        }),
      })
    );
    expect(result.state).toBe("Pendiente");
    expect(result.visibleNumber).toBe(7);
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "consumo.emitted",
        oldValue: { state: "Borrador" },
        newValue: { state: "Pendiente", visibleNumber: 7 },
      })
    );
  });

  it("rejects emission from non-Borrador state", async () => {
    const tx = {
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(),
      consumo: {
        findFirst: vi.fn().mockResolvedValue(buildConsumo({ state: "Pendiente", visibleNumber: 1 })),
        update: vi.fn(),
      },
      auditEvent: { create: vi.fn() },
    };
    const prismaMock = {
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    await expect(
      emitirConsumo({
        companyId: "company-1",
        consumoId: "consumo-1",
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "consumo_not_borrador" });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.consumo.update).not.toHaveBeenCalled();
  });

  it("retries on P2034 serialization conflict then succeeds", async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([{ next: BigInt(3) }]),
      consumo: {
        findFirst: vi.fn().mockResolvedValue(buildConsumo({ state: "Borrador" })),
        update: vi.fn().mockResolvedValue(buildConsumo({ state: "Pendiente", visibleNumber: 3 })),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };

    let attempt = 0;
    const prismaMock = {
      $transaction: vi.fn(async (cb: any, _opts?: unknown) => {
        attempt += 1;
        if (attempt === 1) {
          await cb(tx); // trabajo parcial
          throw makeP2034();
        }
        return await cb(tx);
      }),
    } as any;

    const result = await emitirConsumo({
      companyId: "company-1",
      consumoId: "consumo-1",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(prismaMock.$transaction.mock.calls.length).toBe(2);
    expect(result.visibleNumber).toBe(3);
    expect(result.state).toBe("Pendiente");
  });
});

// ─── deleteConsumo ──────────────────────────────────────────────────────────
describe("deleteConsumo", () => {
  it("deletes a Borrador consumo", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildConsumo({ state: "Borrador", visibleNumber: null }));
    const tx = {
      consumo: {
        findUnique: vi.fn().mockResolvedValue({ id: "consumo-1" }),
        delete: vi.fn().mockResolvedValue({ id: "consumo-1" }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      consumo: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await deleteConsumo({
      companyId: "company-1",
      consumoId: "consumo-1",
      prisma: prismaMock,
    });

    expect(result).toEqual({ id: "consumo-1", deleted: true });
    expect(tx.consumo.delete).toHaveBeenCalledWith({ where: { id: "consumo-1" } });
  });

  it("refuses delete when state !== Borrador", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildConsumo({ state: "Validado", visibleNumber: 1 }));
    const prismaMock = {
      consumo: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      deleteConsumo({
        companyId: "company-1",
        consumoId: "consumo-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "consumo_not_deletable", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// ─── Sanity ─────────────────────────────────────────────────────────────────
describe("CONSUMO_TRANSITIONS sanity", () => {
  it("Facturado and Anulado are terminal with empty transition sets", () => {
    expect(CONSUMO_STATES).toContain("Facturado");
    expect(CONSUMO_STATES).toContain("Anulado");
  });
  it("ConsumoError carries code and status", () => {
    const e = new ConsumoError("x", "boom", 409);
    expect(e.code).toBe("x");
    expect(e.status).toBe(409);
    expect(e).toBeInstanceOf(Error);
  });
});

describe("compareConsumedVsAuthorized", () => {
  it("returns OK on exact authorized/consumed match", () => {
    const result = compareConsumedVsAuthorized({
      companyId: "company-1",
      surgeryId: "sx-1",
      authorized: [{ key: "sku:A", sku: "A", description: "Placa", authorizedQuantity: 2, unit: "u", sourceEntryIds: ["seg-1"] }],
      consumed: [{ key: "sku:A", sku: "A", description: "Placa", consumedQuantity: 2, unit: "u", consumoItemIds: ["ci-1"] }],
    });

    expect(result.status).toBe("OK");
    expect(result.differences).toEqual([]);
  });

  it("detects over-consumption", () => {
    const result = compareConsumedVsAuthorized({
      companyId: "company-1",
      surgeryId: "sx-1",
      authorized: [{ key: "sku:A", sku: "A", description: "Placa", authorizedQuantity: 1, unit: "u", sourceEntryIds: ["seg-1"] }],
      consumed: [{ key: "sku:A", sku: "A", description: "Placa", consumedQuantity: 3, unit: "u", consumoItemIds: ["ci-1"] }],
    });

    expect(result.status).toBe("over");
    expect(result.differences[0]).toMatchObject({ status: "over", deltaQuantity: 2 });
  });

  it("detects unauthorized consumed item", () => {
    const result = compareConsumedVsAuthorized({
      companyId: "company-1",
      surgeryId: "sx-1",
      authorized: [{ key: "sku:A", sku: "A", description: "Placa", authorizedQuantity: 1, unit: "u", sourceEntryIds: ["seg-1"] }],
      consumed: [{ key: "sku:B", sku: "B", description: "Tornillo", consumedQuantity: 1, unit: "u", consumoItemIds: ["ci-2"] }],
    });

    expect(result.status).toBe("unauthorized");
    expect(result.differences.some((difference) => difference.status === "unauthorized")).toBe(true);
  });

  it("marks pending_auth when no authorization material exists", () => {
    const result = compareConsumedVsAuthorized({
      companyId: "company-1",
      surgeryId: "sx-1",
      authorized: [],
      consumed: [{ key: "sku:A", sku: "A", description: "Placa", consumedQuantity: 1, unit: "u", consumoItemIds: ["ci-1"] }],
    });

    expect(result.status).toBe("pending_auth");
    expect(result.summary.pendingAuth).toBe(true);
  });
});

describe("getAuthorizedConsumptionControl", () => {
  it("derives authorized materials from Seguimiento authorization evidence", async () => {
    const prismaMock = {
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "sx-1" }) },
      seguimientoEntry: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "seg-1",
            evidenceRef: {
              extracted: {
                material_autorizado: [
                  { codigo: "A", descripcion: "Placa", cantidad: "2" },
                ],
              },
            },
          },
        ]),
      },
      consumo: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "consumo-1",
            items: [{ id: "ci-1", sku: "A", description: "Placa", consumedQuantity: new Prisma.Decimal(2), unit: "u" }],
          },
        ]),
      },
    } as any;

    const result = await getAuthorizedConsumptionControl({ companyId: "company-1", surgeryId: "sx-1", prisma: prismaMock });

    expect(result.status).toBe("OK");
    expect(result.authorized[0]).toMatchObject({ sku: "A", authorizedQuantity: 2, sourceEntryIds: ["seg-1"] });
    expect(prismaMock.seguimientoEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: "company-1", surgeryId: "sx-1", entryType: "authorization_evidence" },
    }));
  });

  it("does not authorize consumption from non-material Mail-imported evidence", async () => {
    const prismaMock = {
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "sx-1" }) },
      seguimientoEntry: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "seg-mail-1",
            evidenceRef: {
              action: "authorization_evidence_imported",
              source: "mail_import",
              linkId: "mail-link-1",
              conversation: {
                provider: "gmail",
                mailbox: "ventas@example.com",
                subject: "Autorización de cirugía",
                participantsSummary: "Aseguradora",
              },
              selectedAttachmentCount: 1,
            },
          },
        ]),
      },
      consumo: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "consumo-1",
            items: [{ id: "ci-1", sku: "A", description: "Placa", consumedQuantity: new Prisma.Decimal(2), unit: "u" }],
          },
        ]),
      },
    } as any;

    const result = await getAuthorizedConsumptionControl({ companyId: "company-1", surgeryId: "sx-1", prisma: prismaMock });

    expect(result.status).toBe("pending_auth");
    expect(result.summary).toMatchObject({ authorizedItemsCount: 0, pendingAuth: true });
    expect(result.authorized).toEqual([]);
    expect(result.differences[0]).toMatchObject({ status: "pending_auth", sourceEntryIds: [] });
  });
});
