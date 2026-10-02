import { describe, it, expect, vi, beforeEach } from "vitest"
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
  recalculatePresupuestoTotals,
  PresupuestoError,
  serializePresupuestoRow,
} from "@/lib/services/presupuesto.service"
import {
  presupuestoCreateSchema,
  presupuestoUpdateDraftSchema,
  presupuestoStateTransitionSchema,
  presupuestoCreateVersionSchema,
} from "@/lib/validators/presupuesto"
import { derivePendingInvoiceCandidates } from "@/hooks/usePendingInvoiceSources"
import {
  buildEstimativePresupuestoPayload,
  toLegacyPresupuestoProjection,
  type PresupuestoApiRow,
} from "@/lib/api/presupuestos"

describe("PRESUPUESTOS-MVP-CLOSURE-DEV-001: Backend Authority & Commercial Contracts", () => {
  const companyId = "company-ossum-dev"
  const surgeryId = "surgery-cx-101"
  const actorUserId = "user-vendedor-1"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("1. Commercial Calculations & VAT Engine", () => {
    it("calculates line discount correctly from discountPercent / discountRate", () => {
      const items = [
        {
          sku: "STK-001",
          description: "Implante Titanio",
          quantity: 2,
          unitPrice: 10000,
          discountPercent: 10, // 10% on 20000 = 2000 discount, net = 18000
          vatTreatment: "GRAVADO",
          vatRate: 21, // 21% on 18000 = 3780
        },
      ]

      const totals = recalculatePresupuestoTotals(items)
      expect(totals.subtotal.toNumber()).toBe(20000)
      expect(totals.discountTotal.toNumber()).toBe(2000)
      expect(totals.taxTotal.toNumber()).toBe(3780)
      expect(totals.total.toNumber()).toBe(21780)
      expect(totals.items[0].discount.toNumber()).toBe(2000)
      expect(totals.items[0].tax.toNumber()).toBe(3780)
      expect(totals.items[0].total.toNumber()).toBe(21780)
    })

    it("accepts fixed discount amount and explicit tax", () => {
      const items = [
        {
          sku: "STK-002",
          description: "Prótesis Cadera",
          quantity: 1,
          unitPrice: 50000,
          discount: 5000, // Fixed 5000 discount
          vatTreatment: "GRAVADO",
          vatRate: 10.5,
        },
      ]

      const totals = recalculatePresupuestoTotals(items)
      expect(totals.subtotal.toNumber()).toBe(50000)
      expect(totals.discountTotal.toNumber()).toBe(5000)
      expect(totals.taxTotal.toNumber()).toBe(4725) // 10.5% of 45000
      expect(totals.total.toNumber()).toBe(49725)
    })

    it("handles EXENTO and 0% VAT treatments without false tax values", () => {
      const items = [
        {
          sku: "Z-LIBRE-1",
          description: "Honorario Quirúrgico",
          quantity: 1,
          unitPrice: 30000,
          vatTreatment: "EXENTO",
          vatRate: 0,
        },
      ]

      const totals = recalculatePresupuestoTotals(items)
      expect(totals.subtotal.toNumber()).toBe(30000)
      expect(totals.taxTotal.toNumber()).toBe(0)
      expect(totals.total.toNumber()).toBe(30000)
      expect(totals.breakdown.exento.toNumber()).toBe(30000)
    })

    it("rejects discounts exceeding line net amount", () => {
      expect(() =>
        recalculatePresupuestoTotals([
          {
            description: "Invalid Item",
            quantity: 1,
            unitPrice: 1000,
            discount: 1500,
          },
        ])
      ).toThrow()
    })
  })

  describe("2. Validator Schemas & Bidirectional Compatibility", () => {
    it("validates full creation payload with commercial identity fields", () => {
      const rawPayload = {
        surgeryId,
        branchId: "branch-central",
        clientContactId: "contact-osde",
        payerContactId: "contact-osde-fin",
        title: "Cotización Cirugía Rodilla",
        currency: "ARS",
        documentDate: "2026-10-02",
        paymentTerms: "30 días fecha factura",
        priceListCode: "LP-OSDE-2026-04",
        legend: "Presupuesto estimativo",
        notes: "Urgente",
        generalDiscountRate: "5",
        commercial: { pricingMode: "ESTIMATIVE" },
        items: [
          {
            sku: "IMP-01",
            description: "Clavo Intramedular",
            quantity: 1,
            unitPrice: 85000,
            discountPercent: 5,
            vatTreatment: "GRAVADO",
            vatRate: 21,
          },
        ],
      }

      const parsed = presupuestoCreateSchema.safeParse(rawPayload)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.branchId).toBe("branch-central")
        expect(parsed.data.priceListCode).toBe("LP-OSDE-2026-04")
      }
    })

    it("validates state transitions with command ('approve', 'reject', 'expire', 'annul')", () => {
      const commandPayload = {
        command: "approve",
        expectedRevision: 1,
      }
      const parsedCommand = presupuestoStateTransitionSchema.safeParse(commandPayload)
      expect(parsedCommand.success).toBe(true)

      const statePayload = {
        newState: "Aprobado",
        expectedRevision: 1,
      }
      const parsedState = presupuestoStateTransitionSchema.safeParse(statePayload)
      expect(parsedState.success).toBe(true)
    })

    it("validates draft updates with expectedRevision", () => {
      const updatePayload = {
        title: "Cotización actualizada",
        expectedRevision: 1,
        items: [
          {
            description: "Nuevo ítem",
            quantity: 2,
            unitPrice: 15000,
          },
        ],
      }
      const parsed = presupuestoUpdateDraftSchema.safeParse(updatePayload)
      expect(parsed.success).toBe(true)
    })
  })

  describe("3. Service Layer CRUD & Lifecycle", () => {
    it("creates a draft with initial versionNumber = 1 and calculates totals", async () => {
      const prismaMock = {
        surgery: {
          findFirst: vi.fn().mockResolvedValue({ id: surgeryId }),
        },
        $transaction: vi.fn().mockImplementation(async (callback) => {
          const tx = {
            presupuesto: {
              create: vi.fn().mockResolvedValue({
                id: "pres-1",
                visibleNumber: null,
                companyId,
                surgeryId,
                parentPresupuestoId: null,
                versionNumber: 1,
                state: "Borrador",
                title: "Presupuesto Test",
                currency: "ARS",
                subtotal: new Prisma.Decimal(20000),
                discountTotal: new Prisma.Decimal(2000),
                taxTotal: new Prisma.Decimal(3780),
                total: new Prisma.Decimal(21780),
                validUntil: null,
                issuedAt: null,
                approvedAt: null,
                rejectedAt: null,
                createdById: actorUserId,
                updatedById: null,
                metadata: {
                  branchId: "branch-1",
                  clientContactId: "contact-1",
                  priceListCode: "LP-01",
                },
                createdAt: new Date("2026-10-02T10:00:00Z"),
                updatedAt: new Date("2026-10-02T10:00:00Z"),
                items: [
                  {
                    id: "item-1",
                    sku: "STK-1",
                    description: "Item 1",
                    quantity: new Prisma.Decimal(2),
                    unit: "UN",
                    unitPrice: new Prisma.Decimal(10000),
                    discount: new Prisma.Decimal(2000),
                    tax: new Prisma.Decimal(3780),
                    total: new Prisma.Decimal(21780),
                    vatTreatment: "GRAVADO",
                    vatRate: new Prisma.Decimal(21),
                    metadata: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ],
              }),
            },
            auditEvent: {
              create: vi.fn().mockResolvedValue({ id: "audit-1" }),
            },
          }
          return callback(tx)
        }),
      } as unknown as import("@prisma/client").PrismaClient

      const result = await createPresupuesto({
        companyId,
        surgeryId,
        title: "Presupuesto Test",
        branchId: "branch-1",
        clientContactId: "contact-1",
        priceListCode: "LP-01",
        items: [
          {
            sku: "STK-1",
            description: "Item 1",
            quantity: 2,
            unitPrice: 10000,
            discountPercent: 10,
            vatTreatment: "GRAVADO",
            vatRate: 21,
          },
        ],
        createdById: actorUserId,
        prisma: prismaMock,
      })

      expect(result.id).toBe("pres-1")
      expect(result.state).toBe("Borrador")
      expect(result.slot).toBe("DRAFT")
      expect(result.versionNumber).toBe(1)
      expect(result.revision).toBe(1)
      expect(result.branchId).toBe("branch-1")
      expect(result.priceListCode).toBe("LP-01")
      expect(result.total).toBe("21780")
      expect(result.actions).toEqual(["edit", "delete", "emit", "annul"])
    })

    it("emits a draft and assigns transactional visibleNumber", async () => {
      const prismaMock = {
        $transaction: vi.fn().mockImplementation(async (callback) => {
          const tx = {
            $executeRaw: vi.fn().mockResolvedValue(1),
            $queryRaw: vi.fn().mockResolvedValue([{ next: 105 }]),
            presupuesto: {
              findFirst: vi.fn().mockResolvedValue({
                id: "pres-1",
                companyId,
                state: "Borrador",
                versionNumber: 1,
              }),
              update: vi.fn().mockResolvedValue({
                id: "pres-1",
                visibleNumber: 105,
                companyId,
                surgeryId,
                parentPresupuestoId: null,
                versionNumber: 1,
                state: "Emitido",
                title: "Presupuesto Test",
                currency: "ARS",
                subtotal: new Prisma.Decimal(20000),
                discountTotal: new Prisma.Decimal(2000),
                taxTotal: new Prisma.Decimal(3780),
                total: new Prisma.Decimal(21780),
                validUntil: null,
                issuedAt: new Date("2026-10-02T11:00:00Z"),
                approvedAt: null,
                rejectedAt: null,
                createdById: actorUserId,
                updatedById: actorUserId,
                metadata: {},
                createdAt: new Date("2026-10-02T10:00:00Z"),
                updatedAt: new Date("2026-10-02T11:00:00Z"),
                items: [],
              }),
            },
            auditEvent: {
              create: vi.fn().mockResolvedValue({ id: "audit-2" }),
            },
          }
          return callback(tx)
        }),
      } as unknown as import("@prisma/client").PrismaClient

      const result = await emitPresupuesto({
        companyId,
        presupuestoId: "pres-1",
        expectedRevision: 1,
        updatedById: actorUserId,
        prisma: prismaMock,
      })

      expect(result.visibleNumber).toBe(105)
      expect(result.state).toBe("Emitido")
      expect(result.slot).toBe("CURRENT")
      expect(result.actions).toEqual(["approve", "reject", "expire", "annul", "revise"])
    })

    it("approves an Emitido presupuesto via command 'approve'", async () => {
      const prismaMock = {
        presupuesto: {
          findFirst: vi.fn().mockResolvedValue({
            id: "pres-1",
            companyId,
            state: "Emitido",
            versionNumber: 1,
            metadata: { writeRevision: 1 },
          }),
        },
        $transaction: vi.fn().mockImplementation(async (callback) => {
          const tx = {
            presupuesto: {
              findFirst: vi.fn().mockResolvedValue({
                id: "pres-1",
                companyId,
                state: "Emitido",
                versionNumber: 1,
                metadata: { writeRevision: 1 },
              }),
              update: vi.fn().mockResolvedValue({
                id: "pres-1",
                visibleNumber: 105,
                companyId,
                surgeryId,
                parentPresupuestoId: null,
                versionNumber: 1,
                state: "Aprobado",
                title: "Presupuesto Test",
                currency: "ARS",
                subtotal: new Prisma.Decimal(20000),
                discountTotal: new Prisma.Decimal(2000),
                taxTotal: new Prisma.Decimal(3780),
                total: new Prisma.Decimal(21780),
                validUntil: null,
                issuedAt: new Date("2026-10-02T11:00:00Z"),
                approvedAt: new Date("2026-10-02T12:00:00Z"),
                rejectedAt: null,
                createdById: actorUserId,
                updatedById: actorUserId,
                metadata: { writeRevision: 2 },
                createdAt: new Date("2026-10-02T10:00:00Z"),
                updatedAt: new Date("2026-10-02T12:00:00Z"),
                items: [],
              }),
            },
            auditEvent: {
              create: vi.fn().mockResolvedValue({ id: "audit-3" }),
            },
          }
          return callback(tx)
        }),
      } as unknown as import("@prisma/client").PrismaClient

      const result = await updatePresupuestoState({
        companyId,
        presupuestoId: "pres-1",
        command: "approve",
        expectedRevision: 1,
        updatedById: actorUserId,
        prisma: prismaMock,
      })

      expect(result.state).toBe("Aprobado")
      expect(result.approvedAt).toBeTruthy()
      expect(result.slot).toBe("CURRENT")
      expect(result.actions).toEqual(["annul", "revise"])
    })

    it("rejects invalid state transition (e.g. Borrador -> Aprobado without emit)", async () => {
      const prismaMock = {
        presupuesto: {
          findFirst: vi.fn().mockResolvedValue({
            id: "pres-1",
            companyId,
            state: "Borrador",
            versionNumber: 1,
            metadata: { writeRevision: 1 },
          }),
        },
        $transaction: vi.fn().mockImplementation(async (callback) => {
          const tx = {
            presupuesto: {
              findFirst: vi.fn().mockResolvedValue({
                id: "pres-1",
                companyId,
                state: "Borrador",
                versionNumber: 1,
                metadata: { writeRevision: 1 },
              }),
            },
          }
          return callback(tx)
        }),
      } as unknown as import("@prisma/client").PrismaClient

      await expect(
        updatePresupuestoState({
          companyId,
          presupuestoId: "pres-1",
          newState: "Aprobado",
          expectedRevision: 1,
          prisma: prismaMock,
        })
      ).rejects.toThrow(PresupuestoError)
    })

    it("creates a new revision: marks previous as Reemplazado and creates Borrador v2", async () => {
      const prismaMock = {
        $transaction: vi.fn().mockImplementation(async (callback) => {
          const tx = {
            presupuesto: {
              findFirst: vi.fn().mockResolvedValue({
                id: "pres-1",
                companyId,
                surgeryId,
                parentPresupuestoId: null,
                versionNumber: 1,
                state: "Aprobado",
                title: "Presupuesto Test",
                currency: "ARS",
                validUntil: null,
                metadata: { branchId: "branch-1" },
                items: [
                  {
                    id: "item-1",
                    sku: "STK-1",
                    description: "Item 1",
                    quantity: new Prisma.Decimal(2),
                    unit: "UN",
                    unitPrice: new Prisma.Decimal(10000),
                    discount: new Prisma.Decimal(2000),
                    tax: new Prisma.Decimal(3780),
                    total: new Prisma.Decimal(21780),
                    vatTreatment: "GRAVADO",
                    vatRate: new Prisma.Decimal(21),
                    metadata: null,
                  },
                ],
              }),
              aggregate: vi.fn().mockResolvedValue({ _max: { versionNumber: 1 } }),
              update: vi.fn().mockResolvedValue({ id: "pres-1", state: "Reemplazado" }),
              create: vi.fn().mockResolvedValue({
                id: "pres-2",
                visibleNumber: null,
                companyId,
                surgeryId,
                parentPresupuestoId: "pres-1",
                versionNumber: 2,
                state: "Borrador",
                title: "Presupuesto Test",
                currency: "ARS",
                subtotal: new Prisma.Decimal(30000),
                discountTotal: new Prisma.Decimal(0),
                taxTotal: new Prisma.Decimal(6300),
                total: new Prisma.Decimal(36300),
                validUntil: null,
                issuedAt: null,
                approvedAt: null,
                rejectedAt: null,
                createdById: actorUserId,
                updatedById: null,
                metadata: { branchId: "branch-1" },
                createdAt: new Date("2026-10-02T14:00:00Z"),
                updatedAt: new Date("2026-10-02T14:00:00Z"),
                items: [],
              }),
            },
            auditEvent: {
              create: vi.fn().mockResolvedValue({ id: "audit-4" }),
            },
          }
          return callback(tx)
        }),
      } as unknown as import("@prisma/client").PrismaClient

      const result = await createPresupuestoVersion({
        companyId,
        sourcePresupuestoId: "pres-1",
        expectedRevision: 1,
        items: [
          {
            description: "Item modificado v2",
            quantity: 3,
            unitPrice: 10000,
            vatTreatment: "GRAVADO",
            vatRate: 21,
          },
        ],
        updatedById: actorUserId,
        prisma: prismaMock,
      })

      expect(result.id).toBe("pres-2")
      expect(result.versionNumber).toBe(2)
      expect(result.parentPresupuestoId).toBe("pres-1")
      expect(result.familyId).toBe("pres-1")
      expect(result.state).toBe("Borrador")
      expect(result.slot).toBe("DRAFT")
    })
  })

  describe("4. Pending Invoicing Integration with Real Backend Shapes", () => {
    it("recognizes approved budgets with slot === 'CURRENT' as eligible pending invoice candidates", () => {
      const budgets: PresupuestoApiRow[] = [
        {
          id: "pres-approved-current",
          visibleNumber: 101,
          companyId,
          familyId: "pres-approved-current",
          surgeryId: "surgery-101",
          branchId: "branch-1",
          clientContactId: "client-1",
          payerContactId: "payer-1",
          parentPresupuestoId: null,
          sourcePresupuestoId: null,
          versionNumber: 1,
          slot: "CURRENT",
          revision: 1,
          state: "Aprobado",
          title: "Presupuesto Cx 101",
          currency: "ARS",
          documentDate: "2026-10-01",
          paymentTerms: "Contado",
          priceListCode: "LP-01",
          legend: null,
          notes: null,
          generalDiscountRate: "0",
          commercialSnapshot: null,
          commercial: null,
          subtotal: "50000",
          discountTotal: "0",
          taxTotal: "10500",
          total: "60500",
          validUntil: "2026-11-01",
          issuedAt: "2026-10-01",
          approvedAt: "2026-10-01",
          rejectedAt: null,
          createdById: "user-1",
          updatedById: "user-1",
          metadata: null,
          createdAt: "2026-10-01T10:00:00Z",
          updatedAt: "2026-10-01T10:00:00Z",
          items: [],
          actions: ["revise", "annul"],
        },
        {
          id: "pres-history",
          visibleNumber: 100,
          companyId,
          familyId: "pres-history",
          surgeryId: "surgery-102",
          branchId: "branch-1",
          clientContactId: "client-1",
          payerContactId: "payer-1",
          parentPresupuestoId: null,
          sourcePresupuestoId: null,
          versionNumber: 1,
          slot: "HISTORY", // Replaced version
          revision: 1,
          state: "Reemplazado",
          title: null,
          currency: "ARS",
          documentDate: "2026-09-01",
          paymentTerms: null,
          priceListCode: null,
          legend: null,
          notes: null,
          generalDiscountRate: "0",
          commercialSnapshot: null,
          commercial: null,
          subtotal: "40000",
          discountTotal: "0",
          taxTotal: "8400",
          total: "48400",
          validUntil: null,
          issuedAt: "2026-09-01",
          approvedAt: null,
          rejectedAt: null,
          createdById: "user-1",
          updatedById: "user-1",
          metadata: null,
          createdAt: "2026-09-01T10:00:00Z",
          updatedAt: "2026-09-01T10:00:00Z",
          items: [],
          actions: [],
        },
      ]

      const candidates = derivePendingInvoiceCandidates(
        companyId,
        budgets,
        [], // no consumos
        []  // no existing invoices
      )

      expect(candidates).toHaveLength(1)
      expect(candidates[0].presupuestoId).toBe("pres-approved-current")
      expect(candidates[0].surgeryId).toBe("surgery-101")
      expect(candidates[0].kind).toBe("presupuesto")
      expect(candidates[0].amount).toBe("60500")
    })
  })

  describe("5. Client Adapters & Projections", () => {
    it("transforms form data to backend payload and back to legacy projection faithfully", () => {
      const formData = {
        branchId: "branch-1",
        clientContactId: "contact-1",
        payerContactId: "contact-2",
        client: "Hospital Italiano",
        obraSocial: "OSDE",
        financiador: "OSDE Binario",
        vendedor: "Juan Perez",
        patient: "Maria Gomez",
        institution: "Hospital Italiano",
        concepto: "Cirugía de Meniscos",
        fechaEmision: "2026-10-02",
        vigencia: "30 días",
        listaPrecios: "LP-OSDE-2026-04",
        condicionPago: "30 días",
        descuento: 5,
        iva: "21",
        items: [
          {
            code: "ART-01",
            name: "Sutura Meniscal",
            quantity: 2,
            unitPrice: 25000,
            discountPercent: 5,
            catalogItemId: "cat-1",
            isArticuloLibre: false,
            descripcionLibre: "",
            ivaKey: "21",
            codeResolved: true,
          },
        ],
        observaciones: "Entregar en quirófano 3",
      }

      const payload = buildEstimativePresupuestoPayload(formData, formData.items)
      expect(payload.branchId).toBe("branch-1")
      expect(payload.title).toBe("Cirugía de Meniscos")
      expect(payload.priceListCode).toBe("LP-OSDE-2026-04")
      expect(payload.items[0].sku).toBe("ART-01")
      expect(payload.items[0].description).toBe("Sutura Meniscal")
      expect(payload.items[0].quantity).toBe(2)
      expect(payload.items[0].unitPrice).toBe(25000)

      // Verify mock server response projection
      const serverRow: PresupuestoApiRow = {
        id: "pres-123",
        visibleNumber: 501,
        companyId,
        familyId: "pres-123",
        surgeryId: "surg-1",
        branchId: "branch-1",
        clientContactId: "contact-1",
        payerContactId: "contact-2",
        parentPresupuestoId: null,
        sourcePresupuestoId: null,
        versionNumber: 1,
        slot: "CURRENT",
        revision: 1,
        state: "Aprobado",
        title: "Cirugía de Meniscos",
        currency: "ARS",
        documentDate: "2026-10-02",
        paymentTerms: "30 días",
        priceListCode: "LP-OSDE-2026-04",
        legend: "Presupuesto estimativo",
        notes: "Entregar en quirófano 3",
        generalDiscountRate: "5",
        commercialSnapshot: null,
        commercial: null,
        client: "Hospital Italiano",
        financiador: "OSDE Binario",
        patient: "Maria Gomez",
        institution: "Hospital Italiano",
        vendedor: "Juan Perez",
        subtotal: "50000",
        discountTotal: "2500",
        taxTotal: "9975",
        total: "57475",
        validUntil: "2026-11-01",
        issuedAt: "2026-10-02",
        approvedAt: "2026-10-02",
        rejectedAt: null,
        createdById: "user-1",
        updatedById: "user-1",
        metadata: {
          client: "Hospital Italiano",
          patient: "Maria Gomez",
          institution: "Hospital Italiano",
          vendedor: "Juan Perez",
          vigencia: "30 días",
        },
        createdAt: "2026-10-02T10:00:00Z",
        updatedAt: "2026-10-02T10:00:00Z",
        items: [
          {
            id: "line-1",
            position: 1,
            sku: "ART-01",
            description: "Sutura Meniscal",
            quantity: "2",
            unit: "UN",
            unitPrice: "25000",
            discountRate: "5",
            discount: "2500",
            taxRate: "21",
            tax: "9975",
            total: "57475",
            metadata: null,
          },
        ],
        actions: ["annul", "revise"],
      }

      const legacy = toLegacyPresupuestoProjection(serverRow)
      expect(legacy.id).toBe("pres-123")
      expect(legacy.client).toBe("Hospital Italiano")
      expect(legacy.patient).toBe("Maria Gomez")
      expect(legacy.institution).toBe("Hospital Italiano")
      expect(legacy.vendedor).toBe("Juan Perez")
      expect(legacy.total).toBe(57475)
      expect(legacy.version).toBe(1)
      expect(legacy.versionStatus).toBe("aprobada")
    })
  })
})
