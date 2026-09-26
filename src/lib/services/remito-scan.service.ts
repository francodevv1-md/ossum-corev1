import type { PrismaClient } from "@prisma/client";
import { notFound } from "../api/errors";
import { REMITO_READ_ROLES } from "./remito.service";

const unavailable = () => notFound("Remito unavailable", "remito_scan_unavailable");

export type ResolveRemitoScanInput = {
  companyId: string;
  role: string;
  locator: string;
  prisma: PrismaClient;
};

export async function resolveRemitoScan(input: ResolveRemitoScanInput) {
  if (!(REMITO_READ_ROLES as readonly string[]).includes(input.role)) throw unavailable();

  const row = await input.prisma.remitoScanLocator.findUnique({
    where: { companyId_locator: { companyId: input.companyId, locator: input.locator } },
    select: {
      locator: true,
      remito: {
        select: {
          documentType: true,
          state: true,
          issuedAt: true,
          items: {
            orderBy: { createdAt: "asc" },
            select: {
              sku: true,
              description: true,
              quantity: true,
              unit: true,
              returnedQuantity: true,
              lotNumber: true,
              serialNumber: true,
              expirationDate: true,
            },
          },
        },
      },
    },
  });

  if (!row?.remito.issuedAt || row.remito.state === "Borrador") throw unavailable();

  return {
    remitoShortCode: row.locator,
    documentType: row.remito.documentType,
    state: row.remito.state,
    issuedAt: row.remito.issuedAt.toISOString(),
    items: row.remito.items.map((item) => ({
      ...item,
      quantity: item.quantity.toString(),
      returnedQuantity: item.returnedQuantity.toString(),
      expirationDate: item.expirationDate?.toISOString() ?? null,
    })),
    // Contextual Surgery/Caja guards are not part of T09's allowlist. Omission is fail-closed.
    capabilities: { canDeliver: false as const, canReturn: false as const },
  };
}
