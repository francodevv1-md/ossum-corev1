import { describe, expect, it, vi } from "vitest"
import { Prisma, type PrismaClient } from "@prisma/client"
import { createRemito, getRemito, updateRemitoState } from "@/lib/services/remito.service"
import { created, ok } from "@/lib/api/responses"

vi.mock("@/lib/audit", () => ({ createAuditEvent: vi.fn().mockResolvedValue(undefined) }))

const stamp = new Date("2026-10-07T12:00:00.000Z")
const stored = {
  id: "remito-1", visibleNumber: null, companyId: "company-1", branchId: "branch-1", issuedBranchId: "branch-1", documentType: "REMITO_SALIDA",
  surgeryId: null, origin: "manual", salidaReason: "venta", boxId: null, presupuestoId: null, destinatarioContactId: null,
  destinatarioSnapshot: { nombre: "Stored recipient" }, shippingAddressSnapshot: { domicilio: "Stored address" }, transportSnapshot: { nombre: "Stored transport" },
  packageCount: 2, declaredValue: new Prisma.Decimal("120.50"), state: "Borrador", issuedAt: null, deliveredAt: null, returnedAt: null,
  createdById: null, updatedById: null, metadata: { note: "Stored note" }, createdAt: stamp, updatedAt: stamp,
  items: [{ id: "line-1", itemId: "article-1", sku: "SKU-1", description: "Implant", quantity: new Prisma.Decimal("0.5"), unit: "u", boxId: null,
    presupuestoItemId: null, returnedQuantity: new Prisma.Decimal("0"), lotNumber: "LOT-1", serialNumber: "SER-1", expirationDate: stamp,
    metadata: { trace: "Stored trace" }, createdAt: stamp, updatedAt: stamp }],
}

type Select = { [key: string]: true | { select: Select } }
// Unlike the old mocks, these doubles honor the exact Prisma select sent by production.
function project(row: Record<string, unknown>, select: Select): Record<string, unknown> {
  return Object.fromEntries(Object.entries(select).map(([key, selection]) => [key,
    selection === true ? row[key] : (row[key] as Record<string, unknown>[]).map(item => project(item, selection.select)),
  ]))
}
function database(state = "Borrador") {
  const record = { ...stored, state }
  const remito = {
    findFirst: vi.fn(async ({ select }: { select: Select }) => project(record, select)),
    create: vi.fn(async ({ select }: { select: Select }) => project(record, select)),
    update: vi.fn(async ({ data, select }: { data: Record<string, unknown>; select: Select }) => { Object.assign(record, data); return project(record, select) }),
  }
  const tx = { remito }
  return { ...tx, branch: { findFirst: vi.fn().mockResolvedValue({ id: "branch-1" }) },
    $transaction: async <T,>(callback: (db: typeof tx) => Promise<T>) => callback(tx),
  }
}
const wire = async (row: unknown) => (await ok(row).json() as { data: unknown }).data

describe("Remito serialized response contract", () => {
  it("POST exposes the same complete stored fields and trace items as GET", async () => {
    const db = database(), prisma = db as unknown as PrismaClient
    const result = await createRemito({ companyId: "company-1", branchId: "branch-1", origin: "manual", salidaReason: "venta",
      items: [{ description: "Implant", quantity: "0.5" }], prisma })
    const response = created(result)
    expect(response.status).toBe(201)
    expect((await response.json() as { data: unknown }).data).toEqual(await wire(await getRemito({ companyId: "company-1", remitoId: "remito-1", prisma })))
  })

  it("state PATCH exposes the same hydrated updated document as GET", async () => {
    const db = database("Emitido"), prisma = db as unknown as PrismaClient
    const result = await updateRemitoState({ companyId: "company-1", remitoId: "remito-1", newState: "En_transito", prisma })
    const response = ok(result)
    expect(response.status).toBe(200)
    expect((await response.json() as { data: unknown }).data).toEqual(await wire(await getRemito({ companyId: "company-1", remitoId: "remito-1", prisma })))
  })

  it("GET serializes dates and exact decimal strings without losing trace snapshots", async () => {
    const db = database(), prisma = db as unknown as PrismaClient
    const document = await wire(await getRemito({ companyId: "company-1", remitoId: "remito-1", prisma }))
    expect(document).toMatchObject({ declaredValue: "120.5", destinatarioSnapshot: { nombre: "Stored recipient" },
      createdAt: stamp.toISOString(), items: [{ quantity: "0.5", returnedQuantity: "0", sku: "SKU-1", unit: "u", lotNumber: "LOT-1", serialNumber: "SER-1",
        expirationDate: stamp.toISOString(), metadata: { trace: "Stored trace" }, createdAt: stamp.toISOString(), updatedAt: stamp.toISOString() }],
    })
  })
})
