// OSSUM COR — Presupuesto service unit tests (Fase 1C)
// Mocking Prisma manually (vitest). No DB needed.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { createAuditEvent } = vi.hoisted(() => ({
  createAuditEvent: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  createAuditEvent,
}));

import {
  PresupuestoError,
  createPresupuesto,
  createPresupuestoVersion,
  deletePresupuesto,
  emitirPresupuesto,
  recalculatePresupuestoTotals,
  updatePresupuestoState,
} from "@/lib/services/presupuesto.service";

function buildPresupuesto(over: Record<string, any> = {}) {
  return {
    id: "presupuesto-1",
    visibleNumber: null,
    companyId: "company-1",
    surgeryId: "sx-1",
    parentPresupuestoId: null,
    versionNumber: 1,
    state: "Borrador" as string,
    title: "Cotización inicial",
    currency: "ARS",
    subtotal: new Prisma.Decimal(0),
    discountTotal: new Prisma.Decimal(0),
    taxTotal: new Prisma.Decimal(0),
    total: new Prisma.Decimal(0),
    validUntil: null,
    issuedAt: null,
    approvedAt: null,
    rejectedAt: null,
    createdById: "user-1",
    updatedById: null,
    metadata: null,
    createdAt: new Date("2026-07-07T10:00:00.000Z"),
    updatedAt: new Date("2026-07-07T10:00:00.000Z"),
    items: [
      {
        id: "item-1",
        sku: "SKU-1",
        description: "Tornillo 4.0",
        quantity: new Prisma.Decimal(2),
        unit: "u",
        unitPrice: new Prisma.Decimal(100),
        discount: new Prisma.Decimal(10),
        tax: new Prisma.Decimal(39.9),
        total: new Prisma.Decimal(229.9),
        metadata: null,
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  createAuditEvent.mockReset();
  createAuditEvent.mockResolvedValue(undefined);
});

describe("recalculatePresupuestoTotals", () => {
  it("calculates totals from decimal-friendly strings", () => {
    const result = recalculatePresupuestoTotals([
      { description: "A", quantity: "2.5", unitPrice: "100.25", discount: "10", tax: "21" },
      { description: "B", quantity: "1", unitPrice: "50", discount: "0", tax: "10.5" },
    ]);

    expect(result.subtotal.toString()).toBe("300.625");
    expect(result.discountTotal.toString()).toBe("10");
    expect(result.taxTotal.toString()).toBe("31.5");
    expect(result.total.toString()).toBe("322.125");
    expect(result.items[0].total.toString()).toBe("261.625");
  });
});

describe("createPresupuesto", () => {
  it("validates surgery company, computes totals and creates Borrador", async () => {
    const tx = { presupuesto: { create: vi.fn() } };
    tx.presupuesto.create.mockImplementation(async ({ data }) =>
      buildPresupuesto({
        state: data.state,
        subtotal: data.subtotal,
        discountTotal: data.discountTotal,
        taxTotal: data.taxTotal,
        total: data.total,
        items: data.items.create,
      })
    );
    const prismaMock = {
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "sx-1" }) },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await createPresupuesto({
      companyId: "company-1",
      surgeryId: "sx-1",
      items: [{ description: "Tornillo", quantity: "2", unitPrice: "100", discount: "5", tax: "10" }],
      createdById: "user-1",
      prisma: prismaMock,
    });

    expect(prismaMock.surgery.findFirst).toHaveBeenCalledWith({
      where: { id: "sx-1", companyId: "company-1" },
      select: { id: true },
    });
    expect(tx.presupuesto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-1",
          state: "Borrador",
          subtotal: expect.any(Prisma.Decimal),
          total: expect.any(Prisma.Decimal),
        }),
      })
    );
    expect(result.total.toString()).toBe("205");
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "presupuesto_created", entityType: "Presupuesto" })
    );
  });

  it("rejects empty items", async () => {
    const prismaMock = { surgery: { findFirst: vi.fn() }, $transaction: vi.fn() } as any;
    await expect(
      createPresupuesto({ companyId: "company-1", items: [], prisma: prismaMock })
    ).rejects.toMatchObject({ code: "presupuesto_empty_items" });
  });
});

describe("emitirPresupuesto", () => {
  it("assigns visibleNumber and state Emitido", async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([{ next: BigInt(9) }]),
      presupuesto: {
        findFirst: vi.fn().mockResolvedValue(buildPresupuesto({ state: "Borrador" })),
        update: vi.fn().mockImplementation(async ({ data }) =>
          buildPresupuesto({ state: data.state, visibleNumber: data.visibleNumber, issuedAt: data.issuedAt })
        ),
      },
    };
    const prismaMock = { $transaction: vi.fn(async (cb: any) => cb(tx)) } as any;

    const result = await emitirPresupuesto({
      companyId: "company-1",
      presupuestoId: "presupuesto-1",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.presupuesto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "presupuesto-1" },
        data: expect.objectContaining({ visibleNumber: 9, state: "Emitido" }),
      })
    );
    expect(result.visibleNumber).toBe(9);
    expect(result.state).toBe("Emitido");
  });
});

describe("updatePresupuestoState", () => {
  it("rejects invalid transitions", async () => {
    const prismaMock = {
      presupuesto: { findFirst: vi.fn().mockResolvedValue(buildPresupuesto({ state: "Rechazado" })) },
      $transaction: vi.fn(),
    } as any;

    await expect(
      updatePresupuestoState({
        companyId: "company-1",
        presupuestoId: "presupuesto-1",
        newState: "Aprobado",
        updatedById: "user-1",
        prisma: prismaMock,
      })
    ).rejects.toMatchObject({ code: "invalid_presupuesto_transition", status: 409 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("createPresupuestoVersion", () => {
  it("copies items and marks source Reemplazado", async () => {
    const source = buildPresupuesto({
      id: "presupuesto-1",
      state: "Aprobado",
      items: [
        {
          sku: "SKU-1",
          description: "Tornillo",
          quantity: new Prisma.Decimal(2),
          unit: "u",
          unitPrice: new Prisma.Decimal(100),
          discount: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(21),
          total: new Prisma.Decimal(221),
          metadata: null,
        },
      ],
    });
    const tx = {
      presupuesto: {
        findFirst: vi.fn().mockResolvedValue(source),
        aggregate: vi.fn().mockResolvedValue({ _max: { versionNumber: 1 } }),
        update: vi.fn().mockResolvedValue(buildPresupuesto({ state: "Reemplazado" })),
        create: vi.fn().mockImplementation(async ({ data }) =>
          buildPresupuesto({
            id: "presupuesto-2",
            parentPresupuestoId: data.parentPresupuestoId,
            versionNumber: data.versionNumber,
            state: data.state,
            items: data.items.create,
          })
        ),
      },
    };
    const prismaMock = { $transaction: vi.fn(async (cb: any) => cb(tx)) } as any;

    const result = await createPresupuestoVersion({
      companyId: "company-1",
      sourcePresupuestoId: "presupuesto-1",
      updatedById: "user-1",
      prisma: prismaMock,
    });

    expect(tx.presupuesto.update).toHaveBeenCalledWith({
      where: { id: "presupuesto-1" },
      data: { state: "Reemplazado", updatedById: "user-1" },
    });
    expect(result.id).toBe("presupuesto-2");
    expect(result.parentPresupuestoId).toBe("presupuesto-1");
    expect(result.versionNumber).toBe(2);
    expect(result.items).toHaveLength(1);
  });
});

describe("deletePresupuesto", () => {
  it("deletes only Borrador", async () => {
    const tx = { presupuesto: { delete: vi.fn().mockResolvedValue({ id: "presupuesto-1" }) } };
    const prismaMock = {
      presupuesto: { findFirst: vi.fn().mockResolvedValue(buildPresupuesto({ state: "Borrador" })) },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    } as any;

    const result = await deletePresupuesto({
      companyId: "company-1",
      presupuestoId: "presupuesto-1",
      prisma: prismaMock,
    });
    expect(result).toEqual({ id: "presupuesto-1", deleted: true });
  });

  it("refuses delete when state !== Borrador", async () => {
    const prismaMock = {
      presupuesto: { findFirst: vi.fn().mockResolvedValue(buildPresupuesto({ state: "Emitido" })) },
      $transaction: vi.fn(),
    } as any;
    await expect(
      deletePresupuesto({ companyId: "company-1", presupuestoId: "presupuesto-1", prisma: prismaMock })
    ).rejects.toMatchObject({ code: "presupuesto_not_deletable", status: 409 });
  });

  it("PresupuestoError carries code and status", () => {
    const e = new PresupuestoError("x", "boom", 409);
    expect(e.code).toBe("x");
    expect(e.status).toBe(409);
    expect(e).toBeInstanceOf(Error);
  });
});
