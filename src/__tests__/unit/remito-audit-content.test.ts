import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma, type PrismaClient } from "@prisma/client"

const mocks = vi.hoisted(() => ({ audit: vi.fn() }))
vi.mock("@/lib/audit", () => ({ createAuditEvent: mocks.audit }))

import { createAuditEvent } from "@/lib/audit"
import { updateRemitoDraft } from "@/lib/services/remito.service"
const audit = createAuditEvent as unknown as ReturnType<typeof vi.fn>

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "remito-1",
    visibleNumber: null,
    companyId: "company-1",
    branchId: "branch-1",
    issuedBranchId: null,
    documentType: "REMITO_SALIDA",
    surgeryId: "surgery-1",
    origin: "manual",
    salidaReason: "cirugia",
    boxId: null,
    presupuestoId: null,
    destinatarioContactId: "contact-1",
    destinatarioSnapshot: { name: "Hospital" },
    shippingAddressSnapshot: { street: "Av 1" },
    transportSnapshot: { carrier: "Truck" },
    state: "Borrador",
    issuedAt: null,
    deliveredAt: null,
    returnedAt: null,
    createdById: "creator",
    updatedById: "creator",
    metadata: { note: "initial" },
    createdAt: new Date("2026-10-07T10:00:00.000Z"),
    updatedAt: new Date("2026-10-07T10:00:00.000Z"),
    items: [
      {
        id: "item-1",
        itemId: "article-1",
        sku: "SKU-1",
        description: "Implant",
        quantity: new Prisma.Decimal(2),
        unit: "u",
        boxId: null,
        presupuestoItemId: null,
        lotNumber: "L1",
        serialNumber: null,
        expirationDate: new Date("2027-01-01T00:00:00.000Z"),
        returnedQuantity: new Prisma.Decimal(0),
        metadata: { lineMeta: 1 },
      },
    ],
    ...overrides,
  }
}

function buildPrisma({ current, result }: { current: ReturnType<typeof buildRow>; result: ReturnType<typeof buildRow> }) {
  const findFirst = vi
    .fn()
    .mockResolvedValueOnce(current)
    .mockResolvedValueOnce(result)
  const tx = {
    remito: { findFirst, updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn().mockResolvedValue(result) },
    remitoItem: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    auditEvent: { create: vi.fn() },
  }
  return {
    prisma: {
      $transaction: vi.fn(async (cb: any) => cb(tx)),
      surgery: { findFirst: vi.fn().mockResolvedValue({ id: "surgery-1", companyId: "company-1" }) },
    } as unknown as PrismaClient,
    tx,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  audit.mockResolvedValue(undefined)
})

describe("R9 remito audit content", () => {
  it("records items, snapshots and metadata in draft_updated old/new values", async () => {
    const current = buildRow()
    const result = buildRow({
      items: [
        { id: "item-1", itemId: "article-1", sku: "SKU-1", description: "Implant (revised)", quantity: new Prisma.Decimal(3), unit: "u", boxId: null, presupuestoItemId: null, lotNumber: "L1", serialNumber: null, expirationDate: new Date("2027-01-01T00:00:00.000Z"), returnedQuantity: new Prisma.Decimal(0), metadata: { lineMeta: 2 } },
      ],
      transportSnapshot: { carrier: "Plane" },
      metadata: { note: "updated" },
    })
    const { prisma } = buildPrisma({ current, result })

    await updateRemitoDraft({
      companyId: "company-1",
      remitoId: "remito-1",
      items: [{ itemId: "article-1", sku: "SKU-1", description: "Implant (revised)", quantity: 3, unit: "u" }],
      updatedById: "updater",
      prisma,
    } as any)

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      action: "remito.draft_updated",
      oldValue: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ description: "Implant", quantity: "2" })]),
        transportSnapshot: { carrier: "Truck" },
        metadata: { note: "initial" },
      }),
      newValue: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ description: "Implant (revised)", quantity: "3" })]),
        transportSnapshot: { carrier: "Plane" },
        metadata: { note: "updated" },
      }),
    }))
  })

  it("records edited snapshots and metadata even when items are not part of the edit", async () => {
    const current = buildRow()
    const result = buildRow({
      transportSnapshot: { carrier: "Plane" },
      metadata: { note: "updated" },
    })
    const { prisma } = buildPrisma({ current, result })

    await updateRemitoDraft({
      companyId: "company-1",
      remitoId: "remito-1",
      transportSnapshot: { carrier: "Plane" },
      updatedById: "updater",
      prisma,
    } as any)

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      action: "remito.draft_updated",
      oldValue: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ description: "Implant" })]),
        transportSnapshot: { carrier: "Truck" },
      }),
      newValue: expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ description: "Implant" })]),
        transportSnapshot: { carrier: "Plane" },
      }),
    }))
  })

  it("does not invent items when the row has none", async () => {
    const current = buildRow({ items: [] })
    const result = buildRow({ items: [] })
    const { prisma } = buildPrisma({ current, result })
    await updateRemitoDraft({
      companyId: "company-1",
      remitoId: "remito-1",
      metadata: { note: "updated" },
      updatedById: "updater",
      prisma,
    } as any)
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      oldValue: expect.objectContaining({ items: [] }),
      newValue: expect.objectContaining({ items: [] }),
    }))
  })
})
