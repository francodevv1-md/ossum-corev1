// Bounded focused test of recibirOrdenCompra replay/cumulative semantics.
// Scope: minimal persistence double; no real database; no source mutation.
// Invoke: `npx vitest run knowledge/specs/COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001/diagnostic/recibir-replay.test.ts`

import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { recibirOrdenCompra } from "../../../../../src/lib/services/orden-compra.service";
import type { PrismaClient } from "@prisma/client";

type Item = {
  id: string;
  quantity: Prisma.Decimal;
  received: Prisma.Decimal;
};

type Double = {
  prisma: PrismaClient;
  items: Item[];
  orderState: string;
  updateCalls: Array<{ itemId: string; add: string; totalAfter: string }>;
  stateCalls: Array<{ state: string; recibidaAt: Date | null }>;
};

function decimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(
    4,
    Prisma.Decimal.ROUND_HALF_UP
  );
}

function buildDouble(orderedQty: number): Double {
  const items: Item[] = [
    { id: "item-1", quantity: decimal(orderedQty), received: decimal(0) },
  ];
  const orderState = "Enviada";
  const updateCalls: Array<{ itemId: string; add: string; totalAfter: string }> = [];
  const stateCalls: Array<{ state: string; recibidaAt: Date | null }> = [];

  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    ordenCompra: {
      findFirst: vi.fn().mockImplementation(async () => ({
        id: "oc-test-1",
        companyId: "tenant-1",
        state: orderState,
        items: items.map((it) => ({
          id: it.id,
          quantity: it.quantity,
          received: it.received,
        })),
      })),
      update: vi.fn().mockImplementation(async ({ data }: { data: { state?: string; recibidaAt?: Date | null } }) => {
        if (data.state) {
          stateCalls.push({ state: data.state, recibidaAt: data.recibidaAt ?? null });
          orderState = data.state;
        }
        return { id: "oc-test-1", state: orderState };
      },
      ),
    },
    ordenCompraItem: {
      findMany: vi
        .fn()
        .mockImplementation(async () =>
          items.map((it) => ({ quantity: it.quantity, received: it.received })),
        ),
      update: vi.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: { received: Prisma.Decimal } }) => {
        const target = items.find((it) => it.id === where.id);
        if (!target) throw new Error("item not found");
        const totalAfter = target.received.plus(data.received).toString();
        updateCalls.push({ itemId: where.id, add: data.received.toString(), totalAfter });
        target.received = target.received.plus(data.received);
        return target;
      }),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn().mockImplementation(async (cb: (tx: typeof tx) => Promise<unknown>) =>
        cb(tx),
      ),
    } as unknown as PrismaClient,
    items,
    get orderState() {
      return orderState;
    },
    updateCalls,
    stateCalls,
  } as Double;
}

describe("Diagnostic: recibirOrdenCompra replay/cumulative semantics", () => {
  it("two identical payloads accumulate without any operation identity", async () => {
    const dbl = buildDouble(10);
    const payload = { receivedByItem: [{ itemId: "item-1", received: 3 }] };

    // initial state
    expect(dbl.items[0].received.toString()).toBe("0");
    expect(dbl.orderState).toBe("Enviada");

    // first call
    const first = await recibirOrdenCompra({
      prisma: dbl.prisma,
      companyId: "tenant-1",
      ordenCompraId: "oc-test-1",
      ...payload,
    });
    expect(dbl.items[0].received.toString()).toBe("3");
    expect(first.state).toBe("Parcialmente_recibida");
    expect(dbl.stateCalls.map((c) => c.state)).toEqual(["Parcialmente_recibida"]);

    // second call with identical payload (no operation identity)
    const second = await recibirOrdenCompra({
      prisma: dbl.prisma,
      companyId: "tenant-1",
      ordenCompraId: "oc-test-1",
      ...payload,
    });
    expect(dbl.items[0].received.toString()).toBe("6");
    expect(second.state).toBe("Parcialmente_recibida");
    expect(dbl.stateCalls.map((c) => c.state)).toEqual([
      "Parcialmente_recibida",
      "Parcialmente_recibida",
    ]);
    expect(dbl.updateCalls.map((u) => u.totalAfter)).toEqual(["3", "6"]);
  });

  it("completes the OC only after cumulative total reaches ordered quantity", async () => {
    const dbl = buildDouble(10);
    // First delivery: 6 (legitimate)
    await recibirOrdenCompra({
      prisma: dbl.prisma,
      companyId: "tenant-1",
      ordenCompraId: "oc-test-1",
      receivedByItem: [{ itemId: "item-1", received: 6 }],
    });
    expect(dbl.items[0].received.toString()).toBe("6");
    expect(dbl.orderState).toBe("Parcialmente_recibida");

    // Second delivery: 4 (legitimate)
    await recibirOrdenCompra({
      prisma: dbl.prisma,
      companyId: "tenant-1",
      ordenCompraId: "oc-test-1",
      receivedByItem: [{ itemId: "item-1", received: 4 }],
    });
    expect(dbl.items[0].received.toString()).toBe("10");
    expect(dbl.orderState).toBe("Recibida");
  });

  it("refuses a delivery larger than the remaining capacity", async () => {
    const dbl = buildDouble(10);
    await expect(
      recibirOrdenCompra({
        prisma: dbl.prisma,
        companyId: "tenant-1",
        ordenCompraId: "oc-test-1",
        receivedByItem: [{ itemId: "item-1", received: 11 }],
      }),
    ).rejects.toMatchObject({ code: "orden_compra_invalid_receipt" });
    expect(dbl.items[0].received.toString()).toBe("0");
  });
});