import type { PrismaClient } from "@prisma/client";

import type { RemitoDevPreset, RemitoDevPresetAvailable } from "../api/remitos";

const DEV_COMPANY_NAME = "Districorr DEV";
const DEV_BRANCH_NAME = "Sucursal 1 · DEV";
const DEV_SURGERY_VISIBLE_NUMBER = "CX-0005";
const DEV_SURGERY_DESCRIPTION = "DEMO-CONSUMO-REMITO";
const DEV_FIXTURE_SKUS = ["DEMO-TRAZA-001", "DEMO-TRAZA-002"] as const;

const UNAVAILABLE: RemitoDevPreset = { available: false };

function enabledForCompany(companyId: string): boolean {
  return process.env.NODE_ENV !== "production"
    && process.env.OSSUM_ENABLE_DEV_REMITO_PRESET === "true"
    && Boolean(process.env.OSSUM_DEV_REMITO_PRESET_COMPANY_ID)
    && companyId === process.env.OSSUM_DEV_REMITO_PRESET_COMPANY_ID;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Resolves a deliberately narrow, read-only DEV fixture. Any ambiguity returns
 * unavailable rather than guessing or exposing a partial preset.
 */
export async function getRemitoDevPreset(input: {
  companyId: string;
  prisma: Pick<PrismaClient, "company" | "branch" | "surgery">;
}): Promise<RemitoDevPreset> {
  if (!enabledForCompany(input.companyId)) return UNAVAILABLE;

  const company = await input.prisma.company.findFirst({
    where: { id: input.companyId, name: DEV_COMPANY_NAME, isActive: true },
    select: { id: true },
  });
  if (!company) return UNAVAILABLE;

  const branches = await input.prisma.branch.findMany({
    where: { companyId: input.companyId, name: DEV_BRANCH_NAME, isActive: true },
    select: { id: true, name: true },
  });
  if (branches.length !== 1) return UNAVAILABLE;

  const surgeries = await input.prisma.surgery.findMany({
    where: {
      companyId: input.companyId,
      archivedAt: null,
      visibleNumber: DEV_SURGERY_VISIBLE_NUMBER,
      description: DEV_SURGERY_DESCRIPTION,
    },
    select: {
      id: true,
      remitos: {
        select: {
          origin: true,
          salidaReason: true,
          destinatarioSnapshot: true,
          shippingAddressSnapshot: true,
          transportSnapshot: true,
          packageCount: true,
          declaredValue: true,
          metadata: true,
          items: {
            select: {
              itemId: true,
              sku: true,
              description: true,
              quantity: true,
              unit: true,
              boxId: true,
              presupuestoItemId: true,
              lotNumber: true,
              serialNumber: true,
              expirationDate: true,
              metadata: true,
            },
          },
        },
      },
    },
  });
  if (surgeries.length !== 1 || surgeries[0].remitos.length !== 1) return UNAVAILABLE;

  const fixture = surgeries[0].remitos[0];
  const recipientSnapshot = isRecord(fixture.destinatarioSnapshot) ? fixture.destinatarioSnapshot : null;
  const recipientName = recipientSnapshot?.name;
  const fixtureSkus = fixture.items.map((item) => item.sku).sort();
  const expectedSkus = [...DEV_FIXTURE_SKUS].sort();
  const hasExactlyKnownTraceableItems = fixture.items.length === 2
    && fixtureSkus.every((sku, index) => sku === expectedSkus[index])
    && fixture.items.every((item) => Boolean(
      item.sku
      && item.description.trim()
      && item.lotNumber?.trim()
      && item.serialNumber?.trim()
      && item.expirationDate
    ));

  if (
    !hasExactlyKnownTraceableItems
    || !recipientName || typeof recipientName !== "string"
    || fixture.origin !== "manual"
    || fixture.salidaReason !== "cirugia"
  ) return UNAVAILABLE;

  const result: RemitoDevPresetAvailable = {
    available: true,
    branch: { id: branches[0].id, label: branches[0].name },
    example: {
      surgeryId: surgeries[0].id,
      origin: "manual",
      salidaReason: "cirugia",
      recipientSnapshot: { ...recipientSnapshot, nombre: recipientName },
      shippingAddressSnapshot: isRecord(fixture.shippingAddressSnapshot) ? fixture.shippingAddressSnapshot : null,
      transportSnapshot: isRecord(fixture.transportSnapshot) ? fixture.transportSnapshot : null,
      packageCount: fixture.packageCount,
      declaredValue: fixture.declaredValue?.toString() ?? null,
      metadata: isRecord(fixture.metadata) ? fixture.metadata : null,
      items: fixture.items.map((item) => ({
        itemId: item.itemId ?? undefined,
        sku: item.sku ?? undefined,
        description: item.description,
        quantity: item.quantity.toString(),
        unit: item.unit ?? undefined,
        boxId: item.boxId ?? undefined,
        presupuestoItemId: item.presupuestoItemId ?? undefined,
        lotNumber: item.lotNumber ?? undefined,
        serialNumber: item.serialNumber ?? undefined,
        expirationDate: item.expirationDate?.toISOString().slice(0, 10),
        metadata: isRecord(item.metadata) ? item.metadata : undefined,
      })),
    },
  };

  return result;
}
