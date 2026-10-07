// Diagnostic for recibirOrdenCompra semantics.
// Scope: minimal persistence double; no real database access; no source mutation.
//
// Purpose of this diagnostic is to classify the cumulative-vs-replay behavior
// of the existing service so that the report's F-Partial-Receiving finding is
// grounded in executable evidence rather than inference.
//
// This file lives inside the owned artifact folder only. It does NOT modify
// application tests or production source.
//
// Run:
//   npx tsx knowledge/specs/COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001/diagnostic/recibir-replay.run.ts

import { Prisma } from "@prisma/client";
import {
  recibirOrdenCompra,
} from "../../../../src/lib/services/orden-compra.service";
import type { PrismaClient } from "@prisma/client";

type Item = {
  id: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  received: Prisma.Decimal;
};
type OrderRow = {
  id: string;
  companyId: string;
  state: string;
  emitidaAt: Date | null;
  enviadaAt: Date | null;
  recibidaAt: Date | null;
  canceladaAt: Date | null;
  total: Prisma.Decimal;
  observaciones: string | null;
  necesidadCompraIds: string[];
  createdAt: Date;
  proveedorId: string;
  proveedorName: string;
  items: Item[];
};
type Tx = {
  $queryRaw: () => Promise<any>;
  ordenCompra: {
    findFirst: () => Promise<OrderRow | null>;
    findMany: () => Promise<Array<{ quantity: Prisma.Decimal; received: Prisma.Decimal }>>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<OrderRow>;
  };
  ordenCompraItem: {
    findMany: () => Promise<Array<{ quantity: Prisma.Decimal; received: Prisma.Decimal }>>;
    update: (args: { where: { id: string }; data: { received: Prisma.Decimal } }) => Promise<Item>;
  };
  auditEvent: {
    create: () => Promise<{ id: string }>;
  };
};

function decimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

function buildDouble(orderId: string, orderedQty: number): {
  prisma: PrismaClient;
  row: OrderRow;
  updates: Array<{ itemId: string; add: string; totalAfter: string }>;
  stateCalls: Array<{ state: string }>;
} {
  const updates: Array<{ itemId: string; add: string; totalAfter: string }> = [];
  const stateCalls: Array<{ state: string }> = [];

  const items: Item[] = [
    {
      id: "item-1",
      quantity: decimal(orderedQty),
      unitPrice: decimal(0),
      subtotal: decimal(0),
      received: decimal(0),
    },
  ];
  const row: OrderRow = {
    id: orderId,
    companyId: "tenant-1",
    state: "Enviada",
    emitidaAt: null,
    enviadaAt: new Date(),
    recibidaAt: null,
    canceladaAt: null,
    total: decimal(0),
    observaciones: null,
    necesidadCompraIds: [],
    createdAt: new Date(),
    proveedorId: "supplier-1",
    proveedorName: "Proveedor Demo",
    items,
  };

  const tx: Tx = {
    $queryRaw: async () => [],
    ordenCompra: {
      findFirst: async () => ({
        id: row.id,
        companyId: row.companyId,
        state: row.state,
        items: row.items.map((it) => ({
          id: it.id,
          quantity: it.quantity,
          received: it.received,
        })),
      }),
      findMany: async () =>
        row.items.map((it) => ({ quantity: it.quantity, received: it.received })),
      update: async ({ where, data }) => {
        if (where.id !== row.id) throw new Error("unexpected where.id");
        if ("state" in data) {
          row.state = (data as { state: string }).state;
          stateCalls.push({ state: row.state });
        }
        return row;
      },
    },
    ordenCompraItem: {
      findMany: async () =>
        row.items.map((it) => ({ quantity: it.quantity, received: it.received })),
      update: async ({ where, data }) => {
        const target = items.find((it) => it.id === where.id);
        if (!target) throw new Error("item not found");
        // The service sends the new cumulative total in `data.received`
        // (it computes `item.received.plus(quantity)` before the update).
        // The mock should assign, not add on top of the in-memory value.
        const totalAfter = data.received.toString();
        const add = target.received.eq(0)
          ? data.received.toString()
          : data.received.minus(target.received).toString();
        updates.push({ itemId: where.id, add, totalAfter });
        target.received = data.received;
        return target;
      },
    },
    auditEvent: {
      create: async () => ({ id: "audit-1" }),
    },
  };

  const prisma = {
    $transaction: async (cb: (tx: Tx) => Promise<unknown>) => cb(tx),
  } as unknown as PrismaClient;

  return { prisma, row, updates, stateCalls };
}

async function main(): Promise<void> {
  const orderedQty = 10;
  const orderId = "oc-test-1";
  const dbl = buildDouble(orderId, orderedQty);
  const basePayload = { receivedByItem: [{ itemId: "item-1", received: 3 }] };

  console.log("# Diagnostic: recibirOrdenCompra replay/cumulative semantics");
  console.log("Initial ordered quantity:", orderedQty);
  console.log("Initial received quantity:", 0);
  console.log("Initial state:", dbl.row.state);
  console.log("Submitted payload:", JSON.stringify(basePayload));
  console.log();

  const first = await recibirOrdenCompra({
    prisma: dbl.prisma,
    companyId: "tenant-1",
    ordenCompraId: orderId,
    ...basePayload,
  });
  console.log("--- After first call ---");
  console.log("State:", first.state);
  console.log("Items[0].received:", first.items[0].received);
  console.log("Order state transitions:", dbl.stateCalls.map((c) => c.state));
  console.log("Item updates:", dbl.updates);
  console.log();

  const second = await recibirOrdenCompra({
    prisma: dbl.prisma,
    companyId: "tenant-1",
    ordenCompraId: orderId,
    ...basePayload,
  });
  console.log("--- After identical second call (replay) ---");
  console.log("State:", second.state);
  console.log("Items[0].received:", second.items[0].received);
  console.log("Order state transitions:", dbl.stateCalls.map((c) => c.state));
  console.log("Item updates:", dbl.updates);
  console.log();

  console.log(
    "Classification: cumulative (no request idempotency).",
  );
  console.log(
    "The same payload submitted twice adds 3 twice; there is no operation identity in the contract.",
  );
  console.log();

  // Second scenario: legitimate two deliveries
  const dbl2 = buildDouble(orderId, 10);
  console.log("# Scenario 2: two legitimate deliveries (6 + 4)");
  await recibirOrdenCompra({
    prisma: dbl2.prisma,
    companyId: "tenant-1",
    ordenCompraId: orderId,
    receivedByItem: [{ itemId: "item-1", received: 6 }],
  });
  console.log("After 6:", dbl2.row.state, dbl2.row.items[0].received.toString());
  await recibirOrdenCompra({
    prisma: dbl2.prisma,
    companyId: "tenant-1",
    ordenCompraId: orderId,
    receivedByItem: [{ itemId: "item-1", received: 4 }],
  });
  console.log("After 4:", dbl2.row.state, dbl2.row.items[0].received.toString());

  // Third scenario: refuses overflow
  const dbl3 = buildDouble(orderId, 10);
  try {
    await recibirOrdenCompra({
      prisma: dbl3.prisma,
      companyId: "tenant-1",
      ordenCompraId: orderId,
      receivedByItem: [{ itemId: "item-1", received: 11 }],
    });
    console.log("Scenario 3: 11 on qty=10 — UNEXPECTED success");
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.log("Scenario 3: 11 on qty=10 → code:", e.code, "msg:", e.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});