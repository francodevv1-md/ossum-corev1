// OSSUM COR — Devolución service unit tests (Fase 1B)
// Mocking Prisma manually (vitest). No DB needed.
// Cubre: createDevolucion OK + invalid (remitoId, consumoId no match same remito),
//        confirmDevolucion OK,
//        rejectDevolucion OK,
//        transiciones inválidas,
//        deleteDevolucion solo Borrador.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { createAuditEvent } = vi.hoisted(() => ({
  createAuditEvent: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  createAuditEvent,
}));

import {
  createDevolucion,
  confirmDevolucion,
  deleteDevolucion,
  rejectDevolucion,
  updateDevolucionState,
  DEVOLUCION_STATES,
  DevolucionError,
} from "@/lib/services/devolucion.service";

// ─── Helpers de build ──────────────────────────────────────────────────────
function buildDevolucion(over: Record<string, any> = {}) {
  return {
    id: "devolucion-1",
    visibleNumber: null,
    companyId: "company-1",
    surgeryId: "sx-1",
    remitoId: "remito-1",
    consumoId: null,
    state: "Borrador" as string,
    reason: null,
    validatedAt: null,
    createdById: "user-1",
    updatedById: null,
    metadata: null,
    createdAt: new Date("2026-07-07T10:00:00.000Z"),
    updatedAt: new Date("2026-07-07T10:00:00.000Z"),
    items: [
      {
        id: "item-1",
        description: "Tornillo 4.0",
        returnedQuantity: new Prisma.Decimal(2),
        lotNumber: null,
        serialNumber: null,
        expirationDate: null,
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  createAuditEvent.mockReset();
  createAuditEvent.mockResolvedValue(undefined);
});

// ─── createDevolucion ────────────────────────────────────────────────────────
describe("createDevolucion", () => {
  it("creates a devolucion in Borrador linked to remito (no consumo)", async () => {
    const remitoFindFirst = vi.fn().mockResolvedValue({
      id: "remito-1",
      companyId: "company-1",
      surgeryId: "sx-1",
    });
    const tx = {
      devolucion: { create: vi.fn() },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    tx.devolucion.create.mockImplementation(async () =>
      buildDevolucion({
        state: "Borrador",
        remitoId: "remito-1",
        consumoId: null,
        items: [{ id: "item-1", description: "Tornillo 4.0", returnedQuantity: new Prisma.Decimal(2) }],
      })
    );
    const prismaMock = {
      remito: { findFirst: remitoFindFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const dev = await createDevolucion({
      companyId: "company-1",
      remitoId: "remito-1",
      items: [{ description: "Tornillo 4.0", returnedQuantity: 2 }],
      reason: "excedente",
      createdById: "user-1",
      prisma: prismaMock,
    });

    expect(dev.state).toBe("Borrador");
    expect(tx.devolucion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-1",
          remitoId: "remito-1",
          consumoId: null,
          state: "Borrador",
          reason: "excedente",
        }),
      })
    );
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "devolucion.created",
        oldValue: null,
      })
    );
  });

  it("persists normalized trace fields on devolucion items", async () => {
    const expirationDate = new Date("2027-03-31T00:00:00.000Z");
    const remitoFindFirst = vi.fn().mockResolvedValue({
      id: "remito-1",
      companyId: "company-1",
      surgeryId: "sx-1",
    });
    const tx = {
      devolucion: { create: vi.fn() },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    tx.devolucion.create.mockImplementation(async () =>
      buildDevolucion({
        items: [
          {
            id: "item-1",
            description: "Tornillo 4.0",
            returnedQuantity: new Prisma.Decimal(2),
            lotNumber: "LOT-77",
            serialNumber: "SN-77",
            expirationDate,
          },
        ],
      })
    );
    const prismaMock = {
      remito: { findFirst: remitoFindFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const dev = await createDevolucion({
      companyId: "company-1",
      remitoId: "remito-1",
      items: [
        {
          description: "Tornillo 4.0",
          returnedQuantity: 2,
          lotNumber: " LOT-77 ",
          serialNumber: " SN-77 ",
          expirationDate: "2027-03-31T00:00:00.000Z",
        },
      ],
      prisma: prismaMock,
    });

    expect(dev.items[0]).toMatchObject({
      lotNumber: "LOT-77",
      serialNumber: "SN-77",
      expirationDate,
    });
    expect(tx.devolucion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({
                lotNumber: "LOT-77",
                serialNumber: "SN-77",
                expirationDate,
              }),
            ],
          },
        }),
      })
    );
  });

  it("rejects invalid trace expirationDate", async () => {
    const prismaMock = { remito: { findFirst: vi.fn() }, $transaction: vi.fn() } as any;

    await expect(
      createDevolucion({
        companyId: "company-1",
        remitoId: "remito-1",
        items: [{ description: "x", returnedQuantity: 1, expirationDate: "not-a-date" }],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_trace_expiration_date" });
    expect(prismaMock.remito.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("creates a devolucion linked to consumo when consumoId belongs to same remito", async () => {
    const remitoFindFirst = vi.fn().mockResolvedValue({
      id: "remito-1",
      companyId: "company-1",
      surgeryId: "sx-1",
    });
    const consumoFindFirst = vi.fn().mockResolvedValue({
      id: "consumo-1",
      remitoId: "remito-1",
      surgeryId: "sx-1",
    });
    const tx = {
      devolucion: { create: vi.fn().mockImplementation(async () => buildDevolucion({ consumoId: "consumo-1", remitoId: "remito-1" })) },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      remito: { findFirst: remitoFindFirst },
      consumo: { findFirst: consumoFindFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const dev = await createDevolucion({
      companyId: "company-1",
      remitoId: "remito-1",
      consumoId: "consumo-1",
      items: [{ description: "x", returnedQuantity: 1 }],
      createdById: "user-1",
      prisma: prismaMock,
    });

    expect(dev.consumoId).toBe("consumo-1");
    expect(consumoFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "consumo-1", companyId: "company-1" } })
    );
  });

  it("rejects when remitoId does not exist", async () => {
    const remitoFindFirst = vi.fn().mockResolvedValue(null);
    const prismaMock = {
      remito: { findFirst: remitoFindFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      createDevolucion({
        companyId: "company-1",
        remitoId: "missing-remito",
        items: [{ description: "x", returnedQuantity: 1 }],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "remito_not_found" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when consumoId belongs to a different remito", async () => {
    const remitoFindFirst = vi.fn().mockResolvedValue({
      id: "remito-1",
      companyId: "company-1",
      surgeryId: "sx-1",
    });
    const consumoFindFirst = vi.fn().mockResolvedValue({
      id: "consumo-1",
      remitoId: "remito-other",
      surgeryId: "sx-1",
    });
    const prismaMock = {
      remito: { findFirst: remitoFindFirst },
      consumo: { findFirst: consumoFindFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      createDevolucion({
        companyId: "company-1",
        remitoId: "remito-1",
        consumoId: "consumo-1",
        items: [{ description: "x", returnedQuantity: 1 }],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "devolucion_consumo_remito_mismatch", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects empty items", async () => {
    const prismaMock = { remito: { findFirst: vi.fn() }, $transaction: vi.fn() } as any;
    await expect(
      createDevolucion({
        companyId: "company-1",
        remitoId: "remito-1",
        items: [],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "devolucion_empty_items" });
  });

  it("rejects item returnedQuantity <= 0", async () => {
    const prismaMock = { remito: { findFirst: vi.fn() }, $transaction: vi.fn() } as any;
    await expect(
      createDevolucion({
        companyId: "company-1",
        remitoId: "remito-1",
        items: [{ description: "x", returnedQuantity: 0 }],
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_devolucion_item_quantity" });
  });
});

// ─── confirmDevolucion ──────────────────────────────────────────────────────
describe("confirmDevolucion", () => {
  it("transitions Pendiente → Confirmada and applies returned quantities to the remito", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildDevolucion({ state: "Pendiente", visibleNumber: 1 }));
    const validatedAt = new Date("2026-07-07T11:00:00.000Z");
    const tx = {
      devolucion: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(buildDevolucion({ state: "Confirmada", visibleNumber: 1, validatedAt }))
          .mockResolvedValueOnce({
            id: "devolucion-1",
            companyId: "company-1",
            remitoId: "remito-1",
            items: [
              {
                id: "devolucion-item-1",
                remitoItemId: "remito-item-1",
                returnedQuantity: new Prisma.Decimal(2),
              },
            ],
          }),
        updateMany: vi
          .fn()
          .mockResolvedValue({ count: 1 }),
      },
      remito: {
        findFirst: vi.fn().mockResolvedValue({
          id: "remito-1",
          companyId: "company-1",
          state: "Entregado",
          returnedAt: null,
          items: [
            {
              id: "remito-item-1",
              quantity: new Prisma.Decimal(10),
              returnedQuantity: new Prisma.Decimal(0),
            },
          ],
        }),
        update: vi.fn(),
      },
      remitoItem: {
        update: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          { quantity: new Prisma.Decimal(10), returnedQuantity: new Prisma.Decimal(2) },
        ]),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await confirmDevolucion({
      companyId: "company-1",
      devolucionId: "devolucion-1",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(result.state).toBe("Confirmada");
    expect(tx.devolucion.updateMany).toHaveBeenCalledWith({
      where: { id: "devolucion-1", companyId: "company-1", state: "Pendiente" },
      data: expect.objectContaining({ state: "Confirmada", updatedById: "user-1", validatedAt: expect.any(Date) }),
    });
    expect(tx.remitoItem.update).toHaveBeenCalledWith({
      where: { id: "remito-item-1" },
      data: { returnedQuantity: new Prisma.Decimal(2) },
    });
    expect(tx.remito.update).toHaveBeenCalledWith({
      where: { id: "remito-1" },
      data: { state: "Parcialmente_devuelto", updatedById: "user-1" },
    });
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "devolucion.confirmed",
        oldValue: { state: "Pendiente" },
        newValue: expect.objectContaining({ state: "Confirmada" }),
      })
    );
  });

  it("rejects confirm from non-Pendiente state", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildDevolucion({ state: "Borrador", visibleNumber: null }));
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      confirmDevolucion({
        companyId: "company-1",
        devolucionId: "devolucion-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "devolucion_not_pendiente", status: 409 });
  });

  it("rejects a cross-company remito item without applying a partial return", async () => {
    const findFirst = vi.fn().mockResolvedValue(buildDevolucion({ state: "Pendiente", visibleNumber: 1 }));
    const tx = {
      devolucion: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(buildDevolucion({ state: "Confirmada", visibleNumber: 1 }))
          .mockResolvedValueOnce({
            id: "devolucion-1",
            companyId: "company-1",
            remitoId: "remito-1",
            items: [{ id: "devolucion-item-1", remitoItemId: "other-company-item", returnedQuantity: new Prisma.Decimal(2) }],
          }),
      },
      remito: {
        findFirst: vi.fn().mockResolvedValue({
          id: "remito-1",
          companyId: "company-1",
          state: "Entregado",
          returnedAt: null,
          items: [{ id: "remito-item-1", quantity: new Prisma.Decimal(10), returnedQuantity: new Prisma.Decimal(0) }],
        }),
        update: vi.fn(),
      },
      remitoItem: { update: vi.fn(), findMany: vi.fn() },
      auditEvent: { create: vi.fn() },
    };
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    await expect(
      confirmDevolucion({ companyId: "company-1", devolucionId: "devolucion-1", updatedById: "user-1", prisma: prismaMock })
    ).rejects.toMatchObject({ code: "remito_item_not_found" });

    expect(tx.remitoItem.update).not.toHaveBeenCalled();
    expect(tx.remito.update).not.toHaveBeenCalled();
    expect(createAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects an over-return before mutating any remito item or state", async () => {
    const findFirst = vi.fn().mockResolvedValue(buildDevolucion({ state: "Pendiente", visibleNumber: 1 }));
    const tx = {
      devolucion: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(buildDevolucion({ state: "Confirmada", visibleNumber: 1 }))
          .mockResolvedValueOnce({
            id: "devolucion-1",
            companyId: "company-1",
            remitoId: "remito-1",
            items: [{ id: "devolucion-item-1", remitoItemId: "remito-item-1", returnedQuantity: new Prisma.Decimal(11) }],
          }),
      },
      remito: {
        findFirst: vi.fn().mockResolvedValue({
          id: "remito-1",
          companyId: "company-1",
          state: "Entregado",
          returnedAt: null,
          items: [{ id: "remito-item-1", quantity: new Prisma.Decimal(10), returnedQuantity: new Prisma.Decimal(0) }],
        }),
        update: vi.fn(),
      },
      remitoItem: { update: vi.fn(), findMany: vi.fn() },
      auditEvent: { create: vi.fn() },
    };
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    await expect(
      confirmDevolucion({ companyId: "company-1", devolucionId: "devolucion-1", updatedById: "user-1", prisma: prismaMock })
    ).rejects.toMatchObject({ code: "remito_devolucion_quantity_exceeded", status: 409 });

    expect(tx.remitoItem.update).not.toHaveBeenCalled();
    expect(tx.remito.update).not.toHaveBeenCalled();
    expect(createAuditEvent).not.toHaveBeenCalled();
  });

  it("claims Pendiente once when concurrent confirms both pass the preliminary status read", async () => {
    const preliminaryFindFirst = vi.fn().mockResolvedValue(buildDevolucion({ state: "Pendiente", visibleNumber: 1 }));
    const confirmed = buildDevolucion({
      state: "Confirmada",
      visibleNumber: 1,
      validatedAt: new Date("2026-07-07T11:00:00.000Z"),
      items: [{ id: "devolucion-item-1", remitoItemId: "remito-item-1", returnedQuantity: new Prisma.Decimal(2) }],
    });
    let claimed = false;
    const tx = {
      devolucion: {
        updateMany: vi.fn().mockImplementation(async () => {
          if (claimed) return { count: 0 };
          claimed = true;
          return { count: 1 };
        }),
        findFirst: vi.fn().mockResolvedValue(confirmed),
      },
      remito: {
        findFirst: vi.fn().mockResolvedValue({
          id: "remito-1",
          companyId: "company-1",
          state: "Entregado",
          returnedAt: null,
          items: [{ id: "remito-item-1", quantity: new Prisma.Decimal(10), returnedQuantity: new Prisma.Decimal(0) }],
        }),
        update: vi.fn(),
      },
      remitoItem: {
        update: vi.fn(),
        findMany: vi.fn().mockResolvedValue([{ quantity: new Prisma.Decimal(10), returnedQuantity: new Prisma.Decimal(2) }]),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      devolucion: { findFirst: preliminaryFindFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const [first, second] = await Promise.all([
      confirmDevolucion({ companyId: "company-1", devolucionId: "devolucion-1", updatedById: "user-1", prisma: prismaMock }),
      confirmDevolucion({ companyId: "company-1", devolucionId: "devolucion-1", updatedById: "user-1", prisma: prismaMock }),
    ]);

    expect(preliminaryFindFirst).toHaveBeenCalledTimes(2);
    expect(tx.devolucion.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.remitoItem.update).toHaveBeenCalledTimes(1);
    expect(createAuditEvent).toHaveBeenCalledTimes(1);
    expect(first.state).toBe("Confirmada");
    expect(second.state).toBe("Confirmada");
  });
});

// ─── rejectDevolucion ────────────────────────────────────────────────────────
describe("rejectDevolucion", () => {
  it("transitions Pendiente → Rechazada with reason", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildDevolucion({ state: "Pendiente", visibleNumber: 1 }));
    const tx = {
      devolucion: {
        update: vi
          .fn()
          .mockResolvedValue(buildDevolucion({ state: "Rechazada", visibleNumber: 1, reason: "no corresponde" })),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await rejectDevolucion({
      companyId: "company-1",
      devolucionId: "devolucion-1",
      reason: "no corresponde",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(result.state).toBe("Rechazada");
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "devolucion.rejected",
        oldValue: { state: "Pendiente" },
        newValue: expect.objectContaining({ state: "Rechazada", reason: "no corresponde" }),
      })
    );
  });

  it("rejects reject from non-Pendiente state", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildDevolucion({ state: "Confirmada", visibleNumber: 1 }));
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      rejectDevolucion({
        companyId: "company-1",
        devolucionId: "devolucion-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "devolucion_not_pendiente", status: 409 });
  });
});

// ─── updateDevolucionState ──────────────────────────────────────────────────
describe("updateDevolucionState", () => {
  it("applies a valid transition Borrador → Pendiente", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildDevolucion({ state: "Borrador", visibleNumber: null }));
    const tx = {
      devolucion: { update: vi.fn().mockResolvedValue(buildDevolucion({ state: "Pendiente" })) },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await updateDevolucionState({
      companyId: "company-1",
      devolucionId: "devolucion-1",
      newState: "Pendiente",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(result.state).toBe("Pendiente");
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "devolucion.state_changed",
        oldValue: { state: "Borrador" },
        newValue: { state: "Pendiente" },
      })
    );
  });

  it("rejects an invalid transition (Confirmada is terminal)", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildDevolucion({ state: "Confirmada", visibleNumber: 1 }));
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      updateDevolucionState({
        companyId: "company-1",
        devolucionId: "devolucion-1",
        newState: "Pendiente",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_devolucion_transition", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects transition to same state", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildDevolucion({ state: "Pendiente", visibleNumber: 1 }));
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      updateDevolucionState({
        companyId: "company-1",
        devolucionId: "devolucion-1",
        newState: "Pendiente",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "devolucion_state_unchanged", status: 409 });
  });

  it("requires the confirmation operation for Pendiente → Confirmada", async () => {
    const findFirst = vi.fn().mockResolvedValue(buildDevolucion({ state: "Pendiente", visibleNumber: 1 }));
    const prismaMock = { devolucion: { findFirst }, $transaction: vi.fn() } as any;

    await expect(
      updateDevolucionState({
        companyId: "company-1",
        devolucionId: "devolucion-1",
        newState: "Confirmada",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_devolucion_transition", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// ─── deleteDevolucion ────────────────────────────────────────────────────────
describe("deleteDevolucion", () => {
  it("deletes a Borrador devolucion", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildDevolucion({ state: "Borrador", visibleNumber: null }));
    const tx = {
      devolucion: {
        findUnique: vi.fn().mockResolvedValue({ id: "devolucion-1" }),
        delete: vi.fn().mockResolvedValue({ id: "devolucion-1" }),
      },
      auditEvent: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await deleteDevolucion({
      companyId: "company-1",
      devolucionId: "devolucion-1",
      prisma: prismaMock,
    });

    expect(result).toEqual({ id: "devolucion-1", deleted: true });
    expect(tx.devolucion.delete).toHaveBeenCalledWith({ where: { id: "devolucion-1" } });
  });

  it("refuses delete when state !== Borrador", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValue(buildDevolucion({ state: "Confirmada", visibleNumber: 1 }));
    const prismaMock = {
      devolucion: { findFirst },
      $transaction: vi.fn(),
    } as any;

    await expect(
      deleteDevolucion({
        companyId: "company-1",
        devolucionId: "devolucion-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "devolucion_not_deletable", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// ─── Sanity ─────────────────────────────────────────────────────────────────
describe("DEVOLUCION_TRANSITIONS sanity", () => {
  it("Confirmada, Rechazada and Anulada are terminal", () => {
    expect(DEVOLUCION_STATES).toContain("Confirmada");
    expect(DEVOLUCION_STATES).toContain("Rechazada");
    expect(DEVOLUCION_STATES).toContain("Anulada");
  });
  it("DevolucionError carries code and status", () => {
    const e = new DevolucionError("x", "boom", 409);
    expect(e.code).toBe("x");
    expect(e.status).toBe(409);
    expect(e).toBeInstanceOf(Error);
  });
});
