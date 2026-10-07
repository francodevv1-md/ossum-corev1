import { describe, expect, it, vi } from "vitest"
import { Prisma, type PrismaClient } from "@prisma/client"
import { getStockAvailability } from "@/lib/services/stock-ledger.service"

const d = (value: string | number) => new Prisma.Decimal(value)
const query = { page: 1, limit: 50, sortKey: "articulo", sortDir: "asc", quickFilter: "" } as const
function article(id = "article", sku = "SKU") {
  return { id, sku, description: id, isActive: true, family: "Family", brand: "Brand", articleType: "Implant", unit: "u", identifiers: [], tracePolicies: [], commercialProfiles: [] }
}
function item(id = "line", quantity = "2", itemId: string | null = "article", sku = "SKU", returned = "0") {
  return { id, quantity: d(quantity), returnedQuantity: d(returned), itemId, sku }
}
function remito(state = "Emitido", items = [item()], id = "remito", companyId = "company", deliveredAt: Date | null = null) {
  return { id, companyId, state, items, deliveredAt }
}
function movement(type = "RECEIPT_IN", quantity = "10", remitoItemId: string | null = null, remitoId: string | null = null, articleId = "article", companyId = "company") {
  return { id: `${type}-${remitoItemId}`, companyId, articleId, movementType: type, quantity: d(quantity), remitoItemId, remitoId, lotCode: null, serialNumber: null, expirationDate: null, createdAt: new Date("2026-10-07T10:00:00Z") }
}
function projected(row: Record<string, any>, select?: Record<string, any>): any {
  if (!select) return row
  return Object.fromEntries(Object.entries(select).filter(([, flag]) => flag).map(([key, value]) => [key,
    value === true ? row[key] : row[key]?.map((child: Record<string, any>) => projected(child, value.select))]))
}
function db(remitos = [remito()], movements = [movement()], articles = [article()]) {
  const prisma = {
    company: { findUnique: vi.fn().mockResolvedValue({ organizationId: "organization" }) },
    article: { findMany: vi.fn().mockResolvedValue(articles) },
    stockMovement: { findMany: vi.fn(async ({ where, select }: any) => movements.filter(row => row.companyId === where.companyId).map(row => projected(row, select))) },
    remito: { findMany: vi.fn(async ({ where, select }: any) => remitos.filter(row => row.companyId === where.companyId && where.state.in.includes(row.state) && (where.deliveredAt === undefined || row.deliveredAt === where.deliveredAt)).map(row => projected(row, select))) },
  }
  return prisma
}
const availability = (prisma: ReturnType<typeof db>, extra = {}) => getStockAvailability(prisma as unknown as PrismaClient, "company", { ...query, ...extra })
const dispatch = (quantity = "2", line = "line", remitoId = "remito", articleId = "article", companyId = "company") => movement("DISPATCH_OUT", quantity, line, remitoId, articleId, companyId)

describe("R8 read-only, single-effect Remito availability projection", () => {
  it("includes canonical En_transito in transit and documentary availability", async () => {
    const prisma = db([remito("En_transito")])
    const result = await availability(prisma)
    expect(result.data[0]).toMatchObject({ physical: 10, inTransit: 2, available: 8 })
    expect(result.summary.transito).toBe(1)
  })
  it.each(["Emitido", "En_transito", "En tránsito", "En transito", "Enviado"])("keeps incumbent %s documentary transit instead of inventing a new eligibility policy", async (state) => {
    const result = await availability(db([remito(state)]))
    expect(result.data[0]).toMatchObject({ physical: 10, inTransit: 2, available: 8 })
  })
  it("counts accepted full dispatch once while transit remains informational", async () => {
    const result = await availability(db([remito()], [movement(), dispatch()]))
    expect(result.data[0]).toMatchObject({ physical: 8, inTransit: 2, available: 8 })
    expect(result.summary).toMatchObject({ totalPhysical: 8, totalAvailable: 8, transito: 1 })
  })
  it("keeps the same transit and availability across Emitido → En_transito without writing any state", async () => {
    const current = remito(), prisma = db([current], [movement(), dispatch()])
    const issued = await availability(prisma)
    current.state = "En_transito"
    const travelling = await availability(prisma)
    expect(travelling.data[0]).toMatchObject({ physical: issued.data[0].physical, inTransit: 2, available: 8 })
    expect(issued.data[0].inTransit).toBe(2)
  })
  it("discounts only the unmatched documentary part of a partial dispatch", async () => {
    const result = await availability(db([remito()], [movement(), dispatch("1")]))
    expect(result.data[0]).toMatchObject({ physical: 9, inTransit: 2, available: 8 })
  })
  it("matches fractional documentary remainder exactly before the existing numeric DTO", async () => {
    const result = await availability(db([remito("Emitido", [item("line", "0.3")])], [movement("RECEIPT_IN", "1"), dispatch("0.1"), dispatch("0.2")]))
    expect(result.data[0].inTransit).toBe(0.3)
    expect(result.data[0].available).toBe(result.data[0].physical)
  })
  it("does not let another line's dispatch exempt an undispatched line in the same remito", async () => {
    const result = await availability(db([remito("Emitido", [item("one"), item("two")])], [movement(), dispatch("2", "one")]))
    expect(result.data[0]).toMatchObject({ physical: 8, inTransit: 4, available: 6 })
  })
  it("sums multiple physical movements on the same declared line", async () => {
    const result = await availability(db([remito()], [movement(), dispatch("0.5"), dispatch("1.5")]))
    expect(result.data[0]).toMatchObject({ physical: 8, inTransit: 2, available: 8 })
  })
  it.each([
    ["other-remito", "line", "article", "company", 6],
    ["remito", "other-line", "article", "company", 6],
    ["remito", "line", "other-article", "company", 8],
    ["remito", "line", "article", "other-company", 8],
    ["remito", null, "article", "company", 6],
  ] as const)("requires exact ledger owner/item/article/company: %s %s %s %s", async (owner, line, articleId, companyId, available) => {
    const result = await availability(db([remito()], [movement(), movement("DISPATCH_OUT", "2", line, owner, articleId, companyId)]))
    expect(result.data[0].available).toBe(available)
  })
  it("keeps documentary returns from inventing a physical return", async () => {
    const result = await availability(db([remito("Emitido", [item("line", "2", "article", "SKU", "1")])], [movement(), dispatch()]))
    expect(result.data[0]).toMatchObject({ physical: 8, inTransit: 1, available: 8 })
  })
  it("recognizes accepted physical return without double-credit or second deduction", async () => {
    const result = await availability(db([remito("Emitido", [item("line", "2", "article", "SKU", "1")])], [movement(), dispatch(), movement("RETURN_IN", "1", "line", "remito")]))
    expect(result.data[0]).toMatchObject({ physical: 9, inTransit: 1, available: 9 })
  })
  it("does not treat already-returned ledger quantity as outstanding dispatch coverage", async () => {
    const result = await availability(db([remito()], [movement(), dispatch(), movement("RETURN_IN", "1", "line", "remito")]))
    expect(result.data[0]).toMatchObject({ physical: 9, inTransit: 2, available: 8 })
  })
  it("does not exempt a line using an unrelated return or zero-delta disposition", async () => {
    const result = await availability(db([remito()], [movement(), dispatch(), movement("RETURN_IN", "1", "other-line", "remito"), movement("ADJUSTMENT", "0", "line", "remito")]))
    expect(result.data[0]).toMatchObject({ physical: 9, inTransit: 2, available: 9 })
  })
  it("clamps ledger coverage per line, never credits unmatched outbound effects as stock", async () => {
    const result = await availability(db([remito()], [movement(), dispatch("3")]))
    expect(result.data[0]).toMatchObject({ physical: 7, inTransit: 2, available: 7 })
  })
  it.each(["Anulado", "Entregado", "Devuelto", "Parcialmente_devuelto"])("excludes %s documentary transit without reversing accepted dispatch", async (state) => {
    const result = await availability(db([remito(state)], [movement(), dispatch()]))
    expect(result.data[0]).toMatchObject({ physical: 8, inTransit: 0, available: 8 })
  })
  it("keeps the existing deliveredAt gate even with a stale Emitido state", async () => {
    const result = await availability(db([remito("Emitido", [item()], "remito", "company", new Date())], [movement(), dispatch()]))
    expect(result.data[0]).toMatchObject({ physical: 8, inTransit: 0, available: 8 })
  })
  it("keeps draft reservations separate from dispatched transit", async () => {
    const result = await availability(db([remito(), remito("Borrador", [item("draft", "1")], "draft")], [movement(), dispatch()]))
    expect(result.data[0]).toMatchObject({ physical: 8, inTransit: 2, reserved: 1, available: 7 })
  })
  it("merges technical-ID and missing-ID SKU documentary lines for the same article", async () => {
    const result = await availability(db([remito("Emitido", [item("one", "1"), item("two", "2", null)])]))
    expect(result.data[0]).toMatchObject({ inTransit: 3, available: 7 })
  })
  it("merges ID/SKU draft reservations without changing their eligibility", async () => {
    const result = await availability(db([remito("Borrador", [item("one", "1"), item("two", "2", null)])]))
    expect(result.data[0]).toMatchObject({ reserved: 3, inTransit: 0, available: 7 })
  })
  it("does not reassign an explicit foreign article ID based on its coincident SKU", async () => {
    const result = await availability(db([remito("Emitido", [item("line", "2", "foreign-id")])]))
    expect(result.data[0]).toMatchObject({ inTransit: 0, available: 10 })
  })
  it("does not interpret another article's technical ID as a matching SKU", async () => {
    const result = await availability(db([remito()], [movement()], [article(), article("other", "article")]))
    expect(result.data.find(row => row.id === "other")).toMatchObject({ inTransit: 0, available: 0 })
  })
  it("supports SKU-only lines with their exact persisted item ledger linkage", async () => {
    const result = await availability(db([remito("Emitido", [item("line", "2", null)])], [movement(), dispatch()]))
    expect(result.data[0]).toMatchObject({ physical: 8, inTransit: 2, available: 8 })
  })
  it("retains filters and summary without per-line queries or any stock write", async () => {
    const prisma = db([remito("En_transito")], [movement(), dispatch()])
    const result = await availability(prisma, { quickFilter: "transito", limit: 1 })
    expect(result.data).toHaveLength(1)
    expect(result.data[0].available).toBe(8)
    expect(result.pagination).toMatchObject({ total: 1, limit: 1 })
    expect(result.facets.families).toEqual(["Family"])
    expect(prisma.stockMovement.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.remito.findMany).toHaveBeenCalledTimes(2)
    expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company" } }))
  })
})
