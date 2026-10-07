import { describe, expect, it, vi } from "vitest"
import { EMPTY_FORM_ITEM, type PresupuestoFormData } from "@/hooks/usePresupuestoForm"
import { buildEstimativePresupuestoPayload, buildPresupuestoEditPayload, toPresupuestoEditFormData, type PresupuestoApiRow } from "@/lib/api/presupuestos"
import type { PrismaClient } from "@prisma/client"

const database = vi.hoisted(() => ({ current: null as PrismaClient | null }))
vi.mock("@/lib/prisma", () => ({ default: new Proxy({}, { get: (_target, key) => Reflect.get(database.current!, key) }) }))
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: async () => ({
  companyId: "company", actorUserId: "actor", role: "admin", canonicalRole: "admin", rawRole: "admin", organizationId: "org",
}) }))
import { POST } from "@/app/api/companies/[companyId]/presupuestos/route"
import { PATCH, GET } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/route"
import { POST as REVISE } from "@/app/api/companies/[companyId]/presupuestos/[presupuestoId]/versions/route"
import { recalculatePresupuestoTotals } from "@/lib/services/presupuesto.service"

vi.mock("@/lib/audit", () => ({ createAuditEvent: vi.fn() }))

const form: PresupuestoFormData = {
  branchId: "", clientContactId: "", payerContactId: "", client: "Synthetic client",
  obraSocial: "", financiador: "", vendedor: "Synthetic seller", patient: "", institution: "",
  concepto: "Synthetic quote", fechaEmision: "2026-10-07", vigencia: "30 días", listaPrecios: "Synthetic list",
  condicionPago: "30 días", descuento: 10, iva: "21", observaciones: "Original notes",
  items: [{ ...EMPTY_FORM_ITEM, name: "Synthetic item", quantity: 2, unitPrice: 100, discountPercent: 10 }],
}

// Echo only what the real service writes: this catches discarded values rather than returning canned success.
function repository() {
  const rows = new Map<string, Record<string, any>>()
  let lineId = 0
  const save = ({ data, where }: { data: Record<string, any>; where?: { id: string } }) => {
    const id = where?.id ?? `budget-${rows.size + 1}`
    const previous = rows.get(id)
    const stored = { id, companyId: "company", parentPresupuestoId: null, visibleNumber: null,
      createdAt: new Date("2026-10-07T12:00:00Z"), updatedAt: new Date("2026-10-07T12:00:00Z"),
      issuedAt: null, approvedAt: null, rejectedAt: null, ...previous, ...data,
      items: data.items ? data.items.create.map((item: Record<string, unknown>) => ({ ...item, id: `line-${++lineId}` })) : previous?.items,
    }
    rows.set(id, stored)
    return Promise.resolve(stored)
  }
  const tx = {
    branch: { findFirst: vi.fn(async ({ where }) => where.id === "branch-own" && where.companyId === "company" ? { id: where.id } : null) },
    contactCompanyLink: { findFirst: vi.fn(async ({ where }) => ["client-own", "payer-own"].includes(where.contactId) && where.companyId === "company" && where.isActive ? { contactId: where.contactId } : null) },
    presupuesto: { create: vi.fn(save), update: vi.fn(save), findFirst: vi.fn(async ({ where }) => {
      const row = rows.get(where.id)
      return row?.companyId === where.companyId ? row : null
    }), aggregate: vi.fn(async () => ({ _max: { versionNumber: Math.max(...[...rows.values()].map((row) => row.versionNumber)) } })) },
    presupuestoItem: { deleteMany: vi.fn() } }
  return { prisma: { ...tx, $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx) } as unknown as PrismaClient, tx }
}

async function create(input: PresupuestoFormData, db = repository()) {
  database.current = db.prisma
  const response = await POST(new Request("http://localhost/api/companies/company/presupuestos", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildEstimativePresupuestoPayload(input, input.items)),
  }), { params: Promise.resolve({ companyId: "company" }) })
  expect(response.status).toBe(201)
  const body = await response.json() as { data: PresupuestoApiRow }
  return { row: body.data, db }
}

async function saveAndRead(row: PresupuestoApiRow, input: PresupuestoFormData) {
  const params = { params: Promise.resolve({ companyId: "company", presupuestoId: row.id }) }
  const url = `http://localhost/api/companies/company/presupuestos/${row.id}`
  const response = await PATCH(new Request(url, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPresupuestoEditPayload(row, input, input.items)),
  }), params)
  expect(response.status).toBe(200)
  const reread = await GET(new Request(url), params)
  expect(reread.status).toBe(200)
  return (await reread.json() as { data: PresupuestoApiRow }).data
}

describe("presupuesto form -> validator -> service writes -> editor round trip", () => {
  it("applies general discount after line discount and before VAT", async () => {
    const { row } = await create(form)
    // 2 * 100, line discount 10%, general discount 10%, VAT 21%.
    expect(row.total).toBe("196.02")
    expect(row.taxTotal).toBe("34.02")
    expect(toPresupuestoEditFormData(row).items?.[0].discountPercent).toBe(10)
  })

  it("does not double-discount when saving an unchanged persisted draft", async () => {
    const { row } = await create(form)
    const hydrated = { ...form, ...toPresupuestoEditFormData(row) }
    const updated = await saveAndRead(row, hydrated)
    expect(updated.total).toBe("196.02")
    expect(updated.revision).toBe(2)
  })

  it("persists explicit clearing of notes and payment terms", async () => {
    const { row } = await create({ ...form, descuento: 0 })
    const hydrated = { ...form, ...toPresupuestoEditFormData(row), observaciones: "", condicionPago: "" }
    const updated = await saveAndRead(row, hydrated)
    expect(updated.notes ?? "").toBe("")
    expect(updated.paymentTerms ?? "").toBe("")
  })

  it("retains NO_GRAVADO as a distinct editable VAT treatment", async () => {
    const { row } = await create({ ...form, descuento: 0, items: [{ ...form.items[0], ivaKey: "no_gravado" }] })
    expect(toPresupuestoEditFormData(row).items?.[0].ivaKey).toBe("no_gravado")
  })

  it("keeps original line inputs through repeated saves, revisions and general discount changes", async () => {
    let { row } = await create(form)
    for (let i = 0; i < 3; i++) {
      row = await saveAndRead(row, { ...form, ...toPresupuestoEditFormData(row) })
      expect(row.total).toBe("196.02")
      expect(row.items[0].discountRate).toBe("10")
    }
    const response = await REVISE(new Request("http://localhost/versions", { method: "POST", body: JSON.stringify({ expectedRevision: row.revision }) }),
      { params: Promise.resolve({ companyId: "company", presupuestoId: row.id }) })
    expect(response.status).toBe(201)
    row = (await response.json() as { data: PresupuestoApiRow }).data
    expect(row.total).toBe("196.02")
    for (const [rate, total, tax] of [[20, "174.24", "30.24"], [0, "217.8", "37.8"]] as const) {
      row = await saveAndRead(row, { ...form, ...toPresupuestoEditFormData(row), descuento: rate })
      expect(row.total).toBe(total)
      expect(row.taxTotal).toBe(tax)
      expect(row.items[0].discountRate).toBe("10")
    }
  })

  it("clears nullable references and optional values instead of resurrecting metadata", async () => {
    const { row } = await create({ ...form, branchId: "branch-own", clientContactId: "client-own", payerContactId: "payer-own" })
    const updated = await saveAndRead(row, { ...form, ...toPresupuestoEditFormData(row),
      branchId: "", clientContactId: "", payerContactId: "", concepto: "", listaPrecios: "", observaciones: "", condicionPago: "", client: "", vendedor: "" })
    for (const key of ["branchId", "clientContactId", "payerContactId", "title", "priceListCode", "notes", "paymentTerms"] as const) expect(updated[key]).toBeNull()
    expect(updated.metadata).toMatchObject({ client: null, vendedor: null })
    const reopened = { ...form, ...toPresupuestoEditFormData(updated) }
    expect(reopened.client).toBe("")
    expect(reopened.vendedor).toBe("")
    const savedAgain = await saveAndRead(updated, reopened)
    expect(savedAgain.metadata).toMatchObject({ client: null, vendedor: null })
  })

  it("retains exact fixed overrides, decimal inputs and unknown metadata", async () => {
    const db = repository()
    database.current = db.prisma
    const payload = buildEstimativePresupuestoPayload(form, form.items)
    payload.metadata = { ...payload.metadata, future: { nested: "keep" } }
    payload.items = [{ description: "Precision", quantity: "1.2345", unitPrice: "100.1234", discount: "0.1234", discountRate: "99", tax: "7.1234",
      metadata: { external: { line: "keep" } } }]
    const response = await POST(new Request("http://localhost/presupuestos", { method: "POST", body: JSON.stringify(payload) }), { params: Promise.resolve({ companyId: "company" }) })
    expect(response.status).toBe(201)
    let row: PresupuestoApiRow = (await response.json() as { data: PresupuestoApiRow }).data
    // gross 123.6023, fixed line discount .1234, general 12.3479; fixed tax wins.
    expect(row.total).toBe("118.2544")
    for (let i = 0; i < 2; i++) {
      row = await saveAndRead(row, { ...form, ...toPresupuestoEditFormData(row) })
      expect(row.total).toBe("118.2544")
      expect(row.items[0].tax).toBe("7.1234")
      expect(row.metadata).toMatchObject({ future: { nested: "keep" } })
      expect(row.items[0].metadata).toMatchObject({ external: { line: "keep" }, budgetLineInputs: { discount: "0.1234", tax: "7.1234" } })
    }
    row = await saveAndRead(row, { ...form, ...toPresupuestoEditFormData(row), descuento: 20 })
    expect(row.total).toBe("105.9065")
    expect(row.items[0].tax).toBe("7.1234")
  })

  it.each([-1, 101, "NaN", "Infinity"])("rejects general rate %s at API and direct service boundaries", async (rate) => {
    const db = repository()
    database.current = db.prisma
    const payload = { ...buildEstimativePresupuestoPayload(form, form.items), generalDiscountRate: rate }
    const response = await POST(new Request("http://localhost/presupuestos", { method: "POST", body: JSON.stringify(payload) }), { params: Promise.resolve({ companyId: "company" }) })
    expect(response.status).toBe(400)
    expect(db.tx.presupuesto.create).not.toHaveBeenCalled()
    expect(() => recalculatePresupuestoTotals(payload.items, rate)).toThrow()
  })

  it("keeps percentage precision when another amount changes and accepts the 100% boundary", async () => {
    const db = repository()
    database.current = db.prisma
    const payload = buildEstimativePresupuestoPayload(form, form.items)
    payload.generalDiscountRate = "10.123456789012345"
    payload.items[0].discountRate = "12.123456789012345"
    const response = await POST(new Request("http://localhost/presupuestos", { method: "POST", body: JSON.stringify(payload) }), { params: Promise.resolve({ companyId: "company" }) })
    expect(response.status).toBe(201)
    let row: PresupuestoApiRow = (await response.json() as { data: PresupuestoApiRow }).data
    const hydrated = { ...form, ...toPresupuestoEditFormData(row) }
    hydrated.items = hydrated.items.map((item) => ({ ...item, quantity: 3 }))
    row = await saveAndRead(row, hydrated)
    expect(row.generalDiscountRate).toBe(payload.generalDiscountRate)
    expect(row.items[0].discountRate).toBe(payload.items[0].discountRate)
    row = await saveAndRead(row, { ...form, ...toPresupuestoEditFormData(row), descuento: 100 })
    expect(row.total).toBe("0")
    expect(row.taxTotal).toBe("0")
  })

  it.each(["branchId", "clientContactId", "payerContactId"] as const)("rejects foreign %s, including metadata aliases, before writes", async (key) => {
    for (const metadataOnly of [false, true]) {
      const db = repository()
      database.current = db.prisma
      const payload = buildEstimativePresupuestoPayload(form, form.items)
      if (metadataOnly) payload.metadata = { ...payload.metadata, [key]: "foreign-or-inactive" }
      else payload[key] = "foreign-or-inactive"
      const response = await POST(new Request("http://localhost/presupuestos", { method: "POST", body: JSON.stringify(payload) }), { params: Promise.resolve({ companyId: "company" }) })
      expect(response.status).toBe(400)
      expect((await response.json() as { error: { code: string } }).error.code).toBe("invalid_presupuesto_reference")
      expect(db.tx.presupuesto.create).not.toHaveBeenCalled()
    }
  })

  it("rejects foreign update/revision metadata references without modifying the source", async () => {
    const { row, db } = await create(form)
    for (const handler of [PATCH, REVISE]) {
      const response = await handler(new Request("http://localhost/presupuestos", { method: handler === PATCH ? "PATCH" : "POST", body: JSON.stringify({
        expectedRevision: row.revision, items: buildEstimativePresupuestoPayload(form, form.items).items, metadata: { clientContactId: "foreign" },
      }) }), { params: Promise.resolve({ companyId: "company", presupuestoId: row.id }) })
      expect(response.status).toBe(400)
      expect(db.tx.presupuesto.update).not.toHaveBeenCalled()
      expect(db.tx.presupuestoItem.deleteMany).not.toHaveBeenCalled()
    }
  })

  it("retains an omitted general rate and ignores an unvalidated metadata rate override", async () => {
    const { row } = await create(form)
    const params = { params: Promise.resolve({ companyId: "company", presupuestoId: row.id }) }
    const response = await PATCH(new Request("http://localhost/presupuestos", { method: "PATCH", body: JSON.stringify({
      expectedRevision: row.revision, items: buildEstimativePresupuestoPayload(form, form.items).items,
      metadata: { generalDiscountRate: 101 },
    }) }), params)
    expect(response.status).toBe(200)
    const reread = (await (await GET(new Request("http://localhost/presupuestos"), params)).json() as { data: PresupuestoApiRow }).data
    expect(reread.generalDiscountRate).toBe("10")
    expect(reread.total).toBe("196.02")
  })

  it.each([0, 10])("recalculates legacy amounts after changing quantity with %s percent line discount", async (discountPercent) => {
    const { row } = await create({ ...form, descuento: 0, items: [{ ...form.items[0], quantity: 1, discountPercent }] })
    // Historical rows predate pricing-input provenance; persisted tax is not a deliberate override.
    row.items = row.items.map((item) => ({ ...item, metadata: { external: "legacy" } }))
    const reopened = { ...form, ...toPresupuestoEditFormData(row) }
    reopened.items = reopened.items.map((item) => ({ ...item, quantity: 2 }))
    const saved = await saveAndRead(row, reopened)
    expect(saved.total).toBe(discountPercent === 0 ? "242" : "217.8")
    expect(saved.items[0].discount).toBe(discountPercent === 0 ? "0" : "20")
    expect(saved.items[0].tax).toBe(discountPercent === 0 ? "42" : "37.8")
  })
})
