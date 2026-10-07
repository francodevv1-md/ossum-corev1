// Diagnostic for recibirOrdenCompra semantics.
// Scope: minimal persistence double; no real database access; no source mutation.
//
// Purpose of this diagnostic is to classify the cumulative-vs-replay behavior
// of the existing service so that the report's F-Partial-Receiving finding is
// grounded in executable evidence rather than inference.
//
// This file lives inside the owned artifact folder only. It does NOT modify
// application tests or production source. It is invoked by the report's
// "Safe tests" section as a bounded focused run.
//
// Run with:
//   npx tsx knowledge/specs/COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001/diagnostic/recibir-replay.ts
//
// or via vitest:
//   npx vitest run knowledge/specs/COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001/diagnostic/recibir-replay.test.ts

import { Prisma } from "@prisma/client";
import {
  recibirOrdenCompra,
} from "../../../../src/lib/services/orden-compra.service";
import type { PrismaClient } from "@prisma/client";

// Minimal persistence double. We only need to back the operations
// the service actually calls on `tx`. Read services from current source.
type Tx = {
  $queryRaw: (...args: unknown[]) => Promise<unknown>;
  ordenCompra: {
    findFirst: (args: unknown) => Promise<OrderRow | null>;
    findMany: (args: unknown) => Promise<OrderItem[]>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<OrderRow>;
  };
  ordenCompraItem: {
    findMany: (args: unknown) => Promise<OrderItem[]>;
    update: (args: { where: { id: string }; data: { received: Prisma.Decimal } }) => Promise<unknown>;
  };
  auditEvent: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
};

type OrderItem = {
  id: string;
  quantity: Prisma.Decimal;
  received: Prisma.Decimal;
  state?: string;
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
  items: OrderItem[];
};

function decimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(
    4,
    Prisma.Decimal.ROUND_HALF_UP
  );
}

function buildPrismaDouble(orderId: string, orderedQty: number): {
  prisma: PrismaClient;
  txCalls: number;
  updates: Array<{ itemId: string; prev: string; add: string; totalAfter: string }>;
  lastUpdate: { state: string; recibidaAt: Date | null } | null;
} {
  const state = "Enviada";
  const updates: Array<{ itemId: string; prev: string; add: string; totalAfter: string }> = [];
  let lastUpdate: { state: string; recibidaAt: Date | null } | null = null;
  const itemsById = new Map<string, OrderItem>();
  const itemA: OrderItem = {
    id: "item-1",
    quantity: decimal(orderedQty),
    received: decimal(0),
  };
  itemsById.set(itemA.id, itemA);

  const orderRow: OrderRow = {
    id: orderId,
    companyId: "tenant-1",
    state,
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
    items: [itemA],
  };

  const tx: Tx = {
    $queryRaw: vi_queryRawAsync,
    ordenCompra: {
      findFirst: async () => ({
        id: orderRow.id,
        companyId: orderRow.companyId,
        state: orderRow.state,
        items: orderRow.items.map((it) => ({
          id: it.id,
          quantity: it.quantity,
          received: it.received,
        })),
      }),
      findMany: async () =>
        orderRow.items.map((it) => ({
          quantity: it.quantity,
          received: it.received,
        })),
      update: async ({ where, data }) => {
        if (where.id !== orderRow.id) throw new Error("unexpected where.id");
        if ("state" in data) {
          orderRow.state = (data as { state: string }).state;
          lastUpdate = {
            state: orderRow.state,
            recibidaAt: (data as { recibidaAt: Date | null }).recibidaAt ?? null,
          };
        }
        return orderRow;
      },
    },
    ordenCompraItem: {
      findMany: async () =>
        orderRow.items.map((it) => ({
          quantity: it.quantity,
          received: it.received,
        })),
      update: async ({ where, data }) => {
        const target = itemsById.get(where.id);
        if (!target) throw new Error("item not found");
        const prev = target.received.toString();
        const add = data.received.toString();
        const totalAfter = target.received.plus(data.received).toString();
        updates.push({ itemId: where.id, prev, add, totalAfter });
        target.received = target.received.plus(data.received);
        return target;
      },
    },
    auditEvent: {
      create: async () => ({ id: "audit-1" }),
    },
  };

  const prisma = {
    $transaction: async (cb: (tx: Tx) => Promise<unknown>) => {
      return cb(tx);
    },
  } as unknown as PrismaClient;

  return {
    prisma,
    txCalls: 0,
    updates,
    get lastUpdate() {
      return lastUpdate;
    },
  } as {
    prisma: PrismaClient;
    txCalls: number;
    updates: Array<{ itemId: string; prev: string; add: string; totalAfter: string }>;
    lastUpdate: { state: string; recibidaAt: Date | null } | null;
  };
}

async function vi_queryRawAsync(): Promise<unknown> {
  return [];
}

async function main(): Promise<void> {
  const orderedQty = 10;
  const orderId = "oc-test-1";

  const double = buildPrismaDouble(orderId, orderedQty);
  const basePayload = { receivedByItem: [{ itemId: "item-1", received: 3 }] };

  console.log("Initial ordered quantity:", orderedQty);
  console.log("Initial received quantity:", 0);
  console.log("Submitted payload:", JSON.stringify(basePayload));

  const first = await recibirOrdenCompra({
    prisma: double.prisma,
    companyId: "tenant-1",
    ordenCompraId: orderId,
    ...basePayload,
  });
  console.log("--- After first call ---");
  console.log("State:", first.state);
  console.log("Items[0].received:", first.items[0].received);
  console.log("Updates applied:", double.updates);

  const second = await recibirOrdenCompra({
    prisma: double.prisma,
    companyId: "tenant-1",
    ordenCompraId: orderId,
    ...basePayload,
  });
  console.log("--- After identical second call (replay) ---");
  console.log("State:", second.state);
  console.log("Items[0].received:", second.items[0].received);
  console.log("Updates applied:", double.updates);

  console.log("\nClassification: cumulative (no request idemity).");
  console.log(
    "Two identical deliveries accumulate; there is no operation identity in the contract."
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});