/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma transaction mocks use intentionally partial dynamic clients. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createAdjustmentDocument,
  emitAdjustmentDocument,
  voidAdjustmentDocument,
  listAdjustmentDocuments,
  getAdjustmentDocumentById,
} from "@/lib/services/adjustment-document.service";
import {
  mapAdjustmentDocumentToTusFacturasRequest,
  type BuildAdjustmentPayloadInput,
} from "@/lib/services/fiscal-tusfacturas.service";

describe("Adjustment Document Service & Fiscal Mapping", () => {
  const companyId = "cmp-test-123";
  const userId = "usr-admin-1";

  function buildMockInvoice(over: Record<string, any> = {}) {
    return {
      id: "inv-100",
      visibleNumber: 15,
      companyId,
      surgeryId: "cx-1",
      state: "Emitida",
      type: "FV",
      currency: "ARS",
      subtotal: new Prisma.Decimal(1000),
      discountTotal: new Prisma.Decimal(0),
      taxTotal: new Prisma.Decimal(210),
      total: new Prisma.Decimal(1210),
      paidTotal: new Prisma.Decimal(0),
      balance: new Prisma.Decimal(1210),
      issuedAt: new Date("2026-09-01T10:00:00Z"),
      metadata: { clientName: "Hospital Británico" },
      ...over,
    };
  }

  function buildMockAdjustmentDoc(over: Record<string, any> = {}) {
    return {
      id: "adj-1",
      visibleNumber: null,
      companyId,
      type: "CREDITO",
      state: "Borrador",
      originType: "INTERNAL_INVOICE",
      internalInvoiceId: "inv-100",
      externalDocType: null,
      externalPtoVta: null,
      externalNumber: null,
      externalIssueDate: null,
      externalIssuerCuit: null,
      externalCae: null,
      periodFrom: null,
      periodTo: null,
      surgeryId: "cx-1",
      clientName: "Hospital Británico",
      clientDocumentType: "CUIT",
      clientDocumentNumber: "30-12345678-9",
      clientVatCondition: "RI",
      modalidad: "TOTAL",
      motivo: "Devolución de material",
      observaciones: null,
      currency: "ARS",
      subtotal: new Prisma.Decimal(100),
      taxTotal: new Prisma.Decimal(21),
      total: new Prisma.Decimal(121),
      issuedAt: null,
      cancelledAt: null,
      createdById: userId,
      updatedById: null,
      createdAt: new Date("2026-09-29T10:00:00Z"),
      updatedAt: new Date("2026-09-29T10:00:00Z"),
      items: [],
      ...over,
    };
  }

  describe("createAdjustmentDocument", () => {
    it("crea un borrador de Nota de Crédito con origen Factura Interna Emitida", async () => {
      const mockInvoice = buildMockInvoice();
      const prismaMock: any = {
        invoice: {
          findFirst: vi.fn().mockResolvedValue(mockInvoice),
        },
        adjustmentDocument: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        $transaction: vi.fn(async (cb) => {
          const tx = {
            adjustmentDocument: {
              create: vi.fn().mockImplementation(({ data }) => ({
                id: "adj-new-1",
                ...data,
                items: data.items.create,
              })),
            },
          };
          return cb(tx);
        }),
      };

      const doc = await createAdjustmentDocument(
        prismaMock,
        companyId,
        {
          type: "CREDITO",
          originType: "INTERNAL_INVOICE",
          internalInvoiceId: "inv-100",
          modalidad: "TOTAL",
          motivo: "Devolución de instrumental",
          currency: "ARS",
          items: [
            {
              description: "Devolución set",
              quantity: 1,
              unitPrice: 100,
              discount: 0,
              vatRate: 21,
              vatTreatment: "GRAVADO",
            },
          ],
        },
        userId,
        "operaciones",
      );

      expect(doc).toBeDefined();
      expect(doc.type).toBe("CREDITO");
      expect(doc.state).toBe("Borrador");
      expect(doc.originType).toBe("INTERNAL_INVOICE");
      expect(doc.internalInvoiceId).toBe("inv-100");
      expect(doc.clientName).toBe("Hospital Británico");
      expect(Number(doc.total)).toBe(121);
    });

    it("rechaza origen interno si la factura origen está en estado Borrador", async () => {
      const draftInvoice = buildMockInvoice({ state: "Borrador" });
      const prismaMock: any = {
        invoice: {
          findFirst: vi.fn().mockResolvedValue(draftInvoice),
        },
      };

      await expect(
        createAdjustmentDocument(
          prismaMock,
          companyId,
          {
            type: "CREDITO",
            originType: "INTERNAL_INVOICE",
            internalInvoiceId: "inv-100",
            modalidad: "PARCIAL",
            currency: "ARS",
            motivo: "Ajuste",
            items: [{ description: "Item 1", quantity: 1, unitPrice: 50, discount: 0, vatRate: 21, vatTreatment: "GRAVADO" }],
          },
          userId,
          "operaciones",
        ),
      ).rejects.toThrow("La factura origen debe estar Emitida");
    });

    it("crea un borrador con origen Comprobante Externo persistiendo el snapshot", async () => {
      const prismaMock: any = {
        $transaction: vi.fn(async (cb) => {
          const tx = {
            adjustmentDocument: {
              create: vi.fn().mockImplementation(({ data }) => ({
                id: "adj-ext-1",
                ...data,
                items: data.items.create,
              })),
            },
          };
          return cb(tx);
        }),
      };

      const doc = await createAdjustmentDocument(
        prismaMock,
        companyId,
        {
          type: "CREDITO",
          originType: "EXTERNAL_INVOICE",
          externalDocType: "FACTURA B",
          externalPtoVta: 2,
          externalNumber: 4567,
          externalIssueDate: "2026-08-10T00:00:00Z",
          externalIssuerCuit: "30-99887766-5",
          externalCae: "74019283746501",
          modalidad: "MANUAL",
          currency: "ARS",
          motivo: "Ajuste saldo externo",
          items: [{ description: "Ajuste", quantity: 1, unitPrice: 500, discount: 0, vatRate: 21, vatTreatment: "GRAVADO" }],
        },
        userId,
        "operaciones",
      );

      expect(doc.originType).toBe("EXTERNAL_INVOICE");
      expect(doc.externalDocType).toBe("FACTURA B");
      expect(doc.externalPtoVta).toBe(2);
      expect(doc.externalNumber).toBe(4567);
      expect(doc.externalCae).toBe("74019283746501");
      expect(doc.internalInvoiceId).toBeNull();
    });

    it("bloquea origen Período para usuarios no admin", async () => {
      const prismaMock: any = {};

      await expect(
        createAdjustmentDocument(
          prismaMock,
          companyId,
          {
            type: "CREDITO",
            originType: "PERIOD",
            periodFrom: "2026-08-01T00:00:00Z",
            periodTo: "2026-08-31T00:00:00Z",
            modalidad: "MANUAL",
            currency: "ARS",
            motivo: "Ajuste global",
            items: [{ description: "Ajuste global", quantity: 1, unitPrice: 200, discount: 0, vatRate: 21, vatTreatment: "GRAVADO" }],
          },
          userId,
          "operaciones", // No admin
        ),
      ).rejects.toThrow("restringida exclusivamente a usuarios administradores");
    });

    it("rechaza una Nota de Crédito que supera el disponible para acreditar de la factura", async () => {
      const mockInvoice = buildMockInvoice({ total: new Prisma.Decimal(500), balance: new Prisma.Decimal(500) });
      const prismaMock: any = {
        invoice: {
          findFirst: vi.fn().mockResolvedValue(mockInvoice),
        },
        adjustmentDocument: {
          findMany: vi.fn().mockResolvedValue([
            { type: "CREDITO", total: new Prisma.Decimal(400) }, // Ya se acreditaron 400 de 500, quedan 100 disponibles
          ]),
        },
      };

      await expect(
        createAdjustmentDocument(
          prismaMock,
          companyId,
          {
            type: "CREDITO",
            originType: "INTERNAL_INVOICE",
            internalInvoiceId: "inv-100",
            modalidad: "PARCIAL",
            currency: "ARS",
            motivo: "Ajuste excesivo",
            items: [{ description: "Exceso", quantity: 1, unitPrice: 150, discount: 0, vatRate: 0, vatTreatment: "EXENTO" }],
          },
          userId,
          "operaciones",
        ),
      ).rejects.toThrow("supera el total disponible para acreditar");
    });
  });

  describe("emitAdjustmentDocument & Balance Rules", () => {
    it("emite Nota de Crédito interna y descuenta del balance de la factura origen", async () => {
      const initialBalance = new Prisma.Decimal(1210);
      const docTotal = new Prisma.Decimal(210);
      const mockDoc = buildMockAdjustmentDoc({
        type: "CREDITO",
        state: "Borrador",
        total: docTotal,
        internalInvoice: {
          id: "inv-100",
          balance: initialBalance,
        },
      });

      const updatedInvoiceSpy = vi.fn().mockResolvedValue({});
      const updatedDocSpy = vi.fn().mockImplementation(({ data }) => ({
        ...mockDoc,
        ...data,
      }));

      const prismaMock: any = {
        $transaction: vi.fn(async (cb) => {
          const tx = {
            adjustmentDocument: {
              findFirst: vi.fn().mockResolvedValue(mockDoc),
              findMany: vi.fn().mockResolvedValue([]),
              aggregate: vi.fn().mockResolvedValue({ _max: { visibleNumber: 4 } }),
              update: updatedDocSpy,
            },
            invoice: {
              findFirst: vi.fn().mockResolvedValue(buildMockInvoice({ total: new Prisma.Decimal(1210), balance: initialBalance })),
              update: updatedInvoiceSpy,
            },
          };
          return cb(tx);
        }),
      };

      const emitted = await emitAdjustmentDocument(prismaMock, companyId, "adj-1", userId);

      expect(emitted.state).toBe("Emitida");
      expect(emitted.visibleNumber).toBe(5);

      // Verificamos que se actualizó el balance de la factura restando 210: 1210 - 210 = 1000
      expect(updatedInvoiceSpy).toHaveBeenCalledWith({
        where: { id: "inv-100" },
        data: {
          balance: new Prisma.Decimal(1000),
          updatedById: userId,
        },
      });
    });

    it("emite Nota de Crédito externa SIN modificar balances internos", async () => {
      const mockDoc = buildMockAdjustmentDoc({
        type: "CREDITO",
        originType: "EXTERNAL_INVOICE",
        internalInvoiceId: null,
        internalInvoice: null,
        state: "Borrador",
        total: new Prisma.Decimal(500),
      });

      const updatedInvoiceSpy = vi.fn();
      const updatedDocSpy = vi.fn().mockImplementation(({ data }) => ({
        ...mockDoc,
        ...data,
      }));

      const prismaMock: any = {
        $transaction: vi.fn(async (cb) => {
          const tx = {
            adjustmentDocument: {
              findFirst: vi.fn().mockResolvedValue(mockDoc),
              aggregate: vi.fn().mockResolvedValue({ _max: { visibleNumber: 10 } }),
              update: updatedDocSpy,
            },
            invoice: {
              update: updatedInvoiceSpy,
            },
          };
          return cb(tx);
        }),
      };

      const emitted = await emitAdjustmentDocument(prismaMock, companyId, "adj-1", userId);

      expect(emitted.state).toBe("Emitida");
      expect(emitted.visibleNumber).toBe(11);
      // Invoice.balance NUNCA se modifica para origen externo
      expect(updatedInvoiceSpy).not.toHaveBeenCalled();
    });

    it("calcula crédito pendiente de resolución si los cobros superan el nuevo saldo neto de la factura", async () => {
      // Factura total: 1000, Cobrado: 800. Se emite NC por 600.
      // Nuevo total neto exigible = 1000 - 600 = 400.
      // Cobros (800) superan neto (400) en 400 -> Crédito pendiente = 400, nuevo saldo = 0 (nunca negativo).
      const mockInvoice = buildMockInvoice({
        total: new Prisma.Decimal(1000),
        paidTotal: new Prisma.Decimal(800),
        balance: new Prisma.Decimal(200),
      });

      const prismaMock: any = {
        invoice: {
          findFirst: vi.fn().mockResolvedValue(mockInvoice),
        },
        adjustmentDocument: {
          findMany: vi.fn().mockResolvedValue([
            { type: "CREDITO", total: new Prisma.Decimal(600) },
          ]),
        },
      };

      const { getInvoiceAdjustmentSummary } = await import("@/lib/services/adjustment-document.service");
      const summary = await getInvoiceAdjustmentSummary(prismaMock, companyId, "inv-100");

      expect(Number(summary.projectedNewBalance)).toBe(0);
      expect(Number(summary.pendingResolutionCredit)).toBe(400);
      expect(Number(summary.availableToCredit)).toBe(400);
    });
  });

  describe("voidAdjustmentDocument", () => {
    it("anula un documento y revierte el balance de la factura origen", async () => {
      const docTotal = new Prisma.Decimal(300);
      const currentBalance = new Prisma.Decimal(700);
      const mockDoc = buildMockAdjustmentDoc({
        type: "CREDITO",
        state: "Emitida",
        total: docTotal,
        internalInvoice: {
          id: "inv-100",
          balance: currentBalance,
        },
      });

      const updatedInvoiceSpy = vi.fn().mockResolvedValue({});
      const updatedDocSpy = vi.fn().mockImplementation(({ data }) => ({
        ...mockDoc,
        ...data,
      }));

      const prismaMock: any = {
        $transaction: vi.fn(async (cb) => {
          const tx = {
            adjustmentDocument: {
              findFirst: vi.fn().mockResolvedValue(mockDoc),
              update: updatedDocSpy,
            },
            invoice: {
              update: updatedInvoiceSpy,
            },
          };
          return cb(tx);
        }),
      };

      const voided = await voidAdjustmentDocument(prismaMock, companyId, "adj-1", userId);

      expect(voided.state).toBe("Anulada");
      // Al anular una NC emitida, el balance debe volver a sumar: 700 + 300 = 1000
      expect(updatedInvoiceSpy).toHaveBeenCalledWith({
        where: { id: "inv-100" },
        data: {
          balance: new Prisma.Decimal(1000),
          updatedById: userId,
        },
      });
    });
  });

  describe("Fiscal Adapter: mapAdjustmentDocumentToTusFacturasRequest", () => {
    const config = {
      apiKey: "test-api-key",
      apiToken: "test-api-token",
      userToken: "test-user-token",
      puntoVenta: 1,
      apiUrl: "https://www.tusfacturas.app/app/api/v2",
    };

    it("mapea NC con origen comprobante externo incluyendo comprobantes_asociados exactos", () => {
      const payloadInput: BuildAdjustmentPayloadInput = {
        companyId: "cmp-1",
        adjustmentId: "adj-999",
        type: "CREDITO",
        originType: "EXTERNAL_INVOICE",
        letter: "B",
        total: 1000,
        items: [
          {
            description: "Ajuste de precio",
            quantity: 1,
            unitPrice: 1000,
            vatRate: 21,
            vatTreatment: "GRAVADO",
          },
        ],
        externalInvoice: {
          docType: "FACTURA B",
          ptoVta: 3,
          number: 8841,
          issueDate: "2026-08-20",
          issuerCuit: "30-71649281-9",
        },
        config,
      };

      const req = mapAdjustmentDocumentToTusFacturasRequest(payloadInput);

      expect(req.comprobante.tipo).toBe("NOTA DE CREDITO B");
      expect(req.comprobante.comprobantes_asociados).toBeDefined();
      expect(req.comprobante.comprobantes_asociados?.length).toBe(1);
      expect(req.comprobante.comprobantes_asociados?.[0]).toEqual({
        tipo_comprobante: "FACTURA B",
        punto_venta: 3,
        numero: 8841,
        comprobante_fecha: "20/08/2026",
        cuit: 30716492819,
      });
    });

    it("mapea ajuste por período con comprobantes_asociados_periodo", () => {
      const payloadInput: BuildAdjustmentPayloadInput = {
        companyId: "cmp-1",
        adjustmentId: "adj-888",
        type: "DEBITO",
        originType: "PERIOD",
        letter: "A",
        total: 2500,
        items: [
          {
            description: "Intereses período",
            quantity: 1,
            unitPrice: 2500,
            vatRate: 21,
          },
        ],
        period: {
          from: "2026-08-01",
          to: "2026-08-31",
        },
        config,
      };

      const req = mapAdjustmentDocumentToTusFacturasRequest(payloadInput);

      expect(req.comprobante.tipo).toBe("NOTA DE DEBITO A");
      expect(req.comprobante.comprobantes_asociados_periodo).toEqual({
        fecha_desde: "01/08/2026",
        fecha_hasta: "31/08/2026",
      });
      expect(req.comprobante.comprobantes_asociados).toBeUndefined();
    });

    it("bloquea notas tipo E por período lanzando error de incompatibilidad fiscal", () => {
      const payloadInput: BuildAdjustmentPayloadInput = {
        companyId: "cmp-1",
        adjustmentId: "adj-777",
        type: "CREDITO",
        originType: "PERIOD",
        letter: "E", // Exportación
        total: 5000,
        items: [{ description: "Export adjustment", quantity: 1, unitPrice: 5000 }],
        period: {
          from: new Date("2026-08-01T00:00:00Z"),
          to: new Date("2026-08-31T00:00:00Z"),
        },
        config,
      };

      expect(() => mapAdjustmentDocumentToTusFacturasRequest(payloadInput)).toThrow(
        "ARCA prohíbe la emisión de Notas de Crédito/Débito tipo E por período",
      );
    });
  });
});
