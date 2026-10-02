import { describe, expect, it, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"
import {
  createPresupuesto,
  updatePresupuestoDraft,
  emitPresupuesto,
  updatePresupuestoState,
  createPresupuestoVersion,
  deletePresupuesto,
  getPresupuesto,
  listPresupuestos,
  PresupuestoError,
} from "@/lib/services/presupuesto.service"
import { derivePendingInvoiceCandidates } from "@/hooks/usePendingInvoiceSources"
import { createInvoiceFromSource } from "@/lib/services/invoice.service"

describe("PRESUPUESTOS: End-to-End Connected Journey Integration", () => {
  const companyId = "company-ossum-dev"
  const surgeryId = "surgery-cx-555"
  const actorUserId = "user-vendedor-1"

  let dbPresupuestos: any[] = []
  let dbInvoices: any[] = []
  let visibleNumberCounter = 1

  // Model Prisma rows, retaining Date/Decimal instances rather than HTTP JSON values.
  const cloneRow = (value: any): any => {
    if (value instanceof Date) return new Date(value)
    if (value instanceof Prisma.Decimal) return new Prisma.Decimal(value)
    if (Array.isArray(value)) return value.map(cloneRow)
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneRow(entry)]))
    return value
  }

  const makePrismaMock = () => {
    return {
      surgery: {
        findFirst: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id === surgeryId && where.companyId === companyId) {
            return { id: surgeryId, companyId }
          }
          return null
        }),
      },
      presupuesto: {
        findFirst: vi.fn().mockImplementation(async ({ where, include, select }) => {
          const match = dbPresupuestos.find(
            (p) =>
              p.companyId === where.companyId &&
              (!where.id || p.id === where.id) &&
              (!where.state || p.state === where.state)
          )
          if (!match) return null
           return cloneRow(match)
        }),
        findMany: vi.fn().mockImplementation(async ({ where }) => {
          let rows = dbPresupuestos.filter((p) => p.companyId === where.companyId)
          if (where.surgeryId) rows = rows.filter((p) => p.surgeryId === where.surgeryId)
          if (where.state) rows = rows.filter((p) => p.state === where.state)
           return cloneRow(rows)
        }),
        create: vi.fn().mockImplementation(async ({ data }) => {
          const newRow = {
            id: `pres-${dbPresupuestos.length + 1}`,
            visibleNumber: data.visibleNumber ?? null,
            companyId: data.companyId,
            surgeryId: data.surgeryId ?? null,
            parentPresupuestoId: data.parentPresupuestoId ?? null,
            versionNumber: data.versionNumber ?? 1,
            state: data.state ?? "Borrador",
            title: data.title ?? null,
            currency: data.currency ?? "ARS",
            subtotal: data.subtotal,
            discountTotal: data.discountTotal,
            taxTotal: data.taxTotal,
            total: data.total,
            validUntil: data.validUntil ?? null,
            issuedAt: data.issuedAt ?? null,
            approvedAt: data.approvedAt ?? null,
            rejectedAt: data.rejectedAt ?? null,
            createdById: data.createdById ?? null,
            updatedById: null,
            metadata: data.metadata ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            items: (data.items?.create ?? []).map((it: any, idx: number) => ({
              id: `item-${dbPresupuestos.length + 1}-${idx + 1}`,
              sku: it.sku ?? null,
              description: it.description,
              quantity: it.quantity,
              unit: it.unit ?? null,
              unitPrice: it.unitPrice,
              discount: it.discount,
              tax: it.tax,
              total: it.total,
              vatTreatment: it.vatTreatment,
              vatRate: it.vatRate,
              metadata: it.metadata ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          }
          dbPresupuestos.push(newRow)
           return cloneRow(newRow)
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const index = dbPresupuestos.findIndex((p) => p.id === where.id)
          if (index === -1) throw new Error("Not found")
          const existing = dbPresupuestos[index]
          const updated = {
            ...existing,
            ...data,
            items: data.items?.create
              ? data.items.create.map((it: any, idx: number) => ({
                  id: `item-${where.id}-${idx + 1}`,
                  sku: it.sku ?? null,
                  description: it.description,
                  quantity: it.quantity,
                  unit: it.unit ?? null,
                  unitPrice: it.unitPrice,
                  discount: it.discount,
                  tax: it.tax,
                  total: it.total,
                  vatTreatment: it.vatTreatment,
                  vatRate: it.vatRate,
                  metadata: it.metadata ?? null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }))
              : existing.items,
            updatedAt: new Date(),
          }
          dbPresupuestos[index] = updated
           return cloneRow(updated)
        }),
        delete: vi.fn().mockImplementation(async ({ where }) => {
          dbPresupuestos = dbPresupuestos.filter((p) => p.id !== where.id)
          return { id: where.id }
        }),
        aggregate: vi.fn().mockImplementation(async () => {
          const max = dbPresupuestos.reduce((acc, curr) => Math.max(acc, curr.versionNumber || 1), 1)
          return { _max: { versionNumber: max } }
        }),
      },
      presupuestoItem: {
        deleteMany: vi.fn().mockImplementation(async ({ where }) => {
          const target = dbPresupuestos.find((p) => p.id === where.presupuestoId)
          if (target) target.items = []
          return { count: 1 }
        }),
      },
      invoice: {
        findMany: vi.fn().mockImplementation(async ({ where }) => {
          return dbInvoices.filter((inv) => inv.companyId === where.companyId)
        }),
        findFirst: vi.fn().mockImplementation(async ({ where }) => {
          return dbInvoices.find((inv) => {
            if (where.companyId && inv.companyId !== where.companyId) return false
            if (where.id && inv.id !== where.id) return false
            if (where.presupuestoId && inv.presupuestoId !== where.presupuestoId) return false
            if (where.state && where.state.not && inv.state === where.state.not) return false
            if (where.OR && Array.isArray(where.OR)) {
              return where.OR.some((cond: any) => {
                if (cond.presupuestoId && inv.presupuestoId === cond.presupuestoId) return true
                if (cond.consumoId && inv.consumoId === cond.consumoId) return true
                return false
              })
            }
            return true
          }) || null
        }),
        create: vi.fn().mockImplementation(async ({ data }) => {
          const newInvoice = {
            id: `inv-${dbInvoices.length + 1}`,
            visibleNumber: null,
            companyId: data.companyId,
            surgeryId: data.surgeryId ?? null,
            presupuestoId: data.presupuestoId ?? null,
            consumoId: data.consumoId ?? null,
            base: data.base,
            state: "Borrador",
            type: "FV",
            currency: data.currency ?? "ARS",
            subtotal: data.subtotal,
            discountTotal: data.discountTotal,
            taxTotal: data.taxTotal,
            total: data.total,
            paidTotal: new Prisma.Decimal(0),
            balance: data.total,
            issuedAt: null,
            cancelledAt: null,
            createdById: data.createdById ?? null,
            updatedById: null,
            metadata: data.metadata ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            items: (data.items?.create ?? []).map((it: any, idx: number) => ({
              id: `inv-item-${idx + 1}`,
              sku: it.sku ?? null,
              description: it.description,
              quantity: it.quantity,
              unit: it.unit ?? null,
              unitPrice: it.unitPrice,
              discount: it.discount,
              tax: it.tax,
              total: it.total,
              vatTreatment: it.vatTreatment,
              vatRate: it.vatRate,
              sourceType: it.sourceType ?? null,
              sourceItemId: it.sourceItemId ?? null,
              metadata: it.metadata ?? null,
            })),
          }
          dbInvoices.push(newInvoice)
          return newInvoice
        }),
      },
      auditEvent: {
        create: vi.fn().mockResolvedValue({ id: "audit-x" }),
      },
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockImplementation(async (strings: any) => {
        const text = typeof strings === "object" && "strings" in strings ? strings.strings.join(" ") : String(strings)
        if (text.includes("visibleNumber")) {
          return [{ next: visibleNumberCounter++ }]
        }
        return [{ id: "locked" }]
      }),
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(prismaMock)
      }),
    } as any
  }

  let prismaMock: any

  beforeEach(() => {
    dbPresupuestos = []
    dbInvoices = []
    visibleNumberCounter = 1
    prismaMock = makePrismaMock()
  })

  it("executes the full active user journey from draft creation to operational invoice draft", async () => {
    // 1. Create draft budget linked to surgery
    const createdDraft = await createPresupuesto({
      companyId,
      surgeryId,
      title: "Presupuesto Inicial Cx 555",
      branchId: "branch-central",
      clientContactId: "contact-swiss-medical",
      payerContactId: "contact-swiss-medical",
      priceListCode: "LP-SM-2026-04",
      paymentTerms: "30 días",
      items: [
        {
          sku: "STK-PLACA",
          description: "Placa Bloqueada Fémur",
          quantity: 1,
          unitPrice: 150000,
          discountPercent: 10, // discount 15000, net 135000
          vatTreatment: "GRAVADO",
          vatRate: 21, // tax 28350, total 163350
        },
      ],
      createdById: actorUserId,
      prisma: prismaMock,
    })

    expect(createdDraft.state).toBe("Borrador")
    expect(createdDraft.slot).toBe("DRAFT")
    expect(createdDraft.versionNumber).toBe(1)
    expect(createdDraft.total).toBe("163350")

    // 2. Save and reload persisted draft (edit items and commercial info)
    const updatedDraft = await updatePresupuestoDraft({
      companyId,
      presupuestoId: createdDraft.id,
      expectedRevision: 1,
      title: "Presupuesto Inicial Cx 555 — Editado",
      paymentTerms: "60 días",
      items: [
        {
          sku: "STK-PLACA",
          description: "Placa Bloqueada Fémur",
          quantity: 1,
          unitPrice: 150000,
          discountPercent: 10,
          vatTreatment: "GRAVADO",
          vatRate: 21,
        },
        {
          sku: "STK-TORNILLO",
          description: "Tornillo Cortical 3.5mm",
          quantity: 4,
          unitPrice: 5000,
          discountPercent: 0,
          vatTreatment: "GRAVADO",
          vatRate: 21, // 4 * 5000 = 20000 + 4200 = 24200
        },
      ],
      updatedById: actorUserId,
      prisma: prismaMock,
    })

    expect(updatedDraft.title).toBe("Presupuesto Inicial Cx 555 — Editado")
    expect(updatedDraft.paymentTerms).toBe("60 días")
    expect(updatedDraft.items).toHaveLength(2)
    // 163350 + 24200 = 187550
    expect(updatedDraft.total).toBe("187550")

    // 3. Issue (Emitir) budget
    const emitted = await emitPresupuesto({
      companyId,
      presupuestoId: updatedDraft.id,
      expectedRevision: updatedDraft.revision,
      updatedById: actorUserId,
      prisma: prismaMock,
    })

    expect(emitted.state).toBe("Emitido")
    expect(emitted.slot).toBe("CURRENT")
    expect(emitted.visibleNumber).toBe(1)
    expect(emitted.issuedAt).toBeTruthy()

    // 4. Approve budget
    const approved = await updatePresupuestoState({
      companyId,
      presupuestoId: emitted.id,
      command: "approve",
      expectedRevision: emitted.revision,
      updatedById: actorUserId,
      prisma: prismaMock,
    })

    expect(approved.state).toBe("Aprobado")
    expect(approved.slot).toBe("CURRENT")
    expect(approved.approvedAt).toBeTruthy()

    // 5. Query linked surgery budgets: consistent information
    const surgeryBudgets = await listPresupuestos({
      companyId,
      surgeryId,
      prisma: prismaMock,
    })

    expect(surgeryBudgets).toHaveLength(1)
    expect(surgeryBudgets[0].id).toBe(createdDraft.id)
    expect(surgeryBudgets[0].state).toBe("Aprobado")
    expect(surgeryBudgets[0].slot).toBe("CURRENT")

    // 6. Check Pending Invoicing Candidate eligibility
    const pendingCandidates = derivePendingInvoiceCandidates(
      companyId,
      surgeryBudgets as any,
      [], // no consumos
      []  // no invoices yet
    )

    expect(pendingCandidates).toHaveLength(1)
    expect(pendingCandidates[0].kind).toBe("presupuesto")
    expect(pendingCandidates[0].presupuestoId).toBe(createdDraft.id)
    expect(pendingCandidates[0].surgeryId).toBe(surgeryId)
    expect(pendingCandidates[0].amount).toBe("187550")

    // 7. Create Operational Invoice Draft from the eligible approved budget
    const invoiceDraft = await createInvoiceFromSource({
      companyId,
      presupuestoId: approved.id,
      createdById: actorUserId,
      prisma: prismaMock,
    })

    expect(invoiceDraft.base).toBe("presupuesto")
    expect(invoiceDraft.presupuestoId).toBe(approved.id)
    expect(invoiceDraft.surgeryId).toBe(surgeryId)
    expect(toDecimal(invoiceDraft.total).toString()).toBe("187550")
    expect(invoiceDraft.items).toHaveLength(2)

    // 8. Pending Invoicing Candidate is now consumed / not duplicate
    const updatedCandidates = derivePendingInvoiceCandidates(
      companyId,
      surgeryBudgets as any,
      [],
      [invoiceDraft as any]
    )
    expect(updatedCandidates).toHaveLength(0)

    // 9. Re-invoicing the same budget is rejected by duplicate source protection
    await expect(
      createInvoiceFromSource({
        companyId,
        presupuestoId: approved.id,
        createdById: actorUserId,
        prisma: prismaMock,
      })
    ).rejects.toThrow()
  })

  function toDecimal(val: any) {
    return val instanceof Prisma.Decimal ? val : new Prisma.Decimal(val)
  }
})
