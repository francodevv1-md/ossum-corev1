import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  callTusFacturasReconcile,
  mapInvoiceToTusFacturasRequest,
  type TusFacturasDevConfig,
} from "@/lib/services/fiscal-tusfacturas.service";
import {
  validateFiscalMatrix,
  tusFacturasWebhookPayloadSchema,
} from "@/lib/validators/fiscal-tusfacturas";
import { handleTusFacturasWebhookDev } from "@/lib/services/fiscal-issuance.service";

const dummyConfig: TusFacturasDevConfig = {
  apiKey: "test-api-key",
  apiToken: "test-api-token",
  userToken: "test-user-token",
  puntoVenta: 1,
  apiUrl: "https://www.tusfacturas.app/app/api/v2",
};

describe("Fiscal Hardening & TusFacturas Integration Checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Reconcile response parsing (comprobantes[] vs comprobante)", () => {
    it("extracts CAE, comprobante_nro, and PDF URL from standard consulta_avanzada response (comprobantes[])", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          rta: "OK",
          error: "N",
          total: 1,
          errores: [],
          comprobantes: [
            {
              comprobante: {
                tipo: "FACTURA B",
                numero: 42,
                fecha: "28/09/2026",
                cae: "74392019482910 ",
                comprobante_pdf_url: "https://www.tusfacturas.app/pdf/42.pdf",
              },
            },
          ],
        }),
      });

      const result = await callTusFacturasReconcile("OSSUM-DEV-INV-123", dummyConfig, {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(result.found).toBe(true);
      expect(result.state).toBe("AUTHORIZED");
      expect(result.cae).toBe("74392019482910");
      expect(result.comprobanteNro).toBe("42");
      expect(result.pdfUrl).toBe("https://www.tusfacturas.app/pdf/42.pdf");
    });

    it("classifies simulated sandbox issuance (no CAE, with PDF/nro) as SIMULATED", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          rta: "OK",
          error: "N",
          total: 1,
          comprobantes: [
            {
              comprobante: {
                tipo: "FACTURA B",
                numero: 99,
                comprobante_pdf_url: "https://www.tusfacturas.app/pdf/preview.pdf",
              },
            },
          ],
        }),
      });

      const result = await callTusFacturasReconcile("OSSUM-DEV-INV-SIM", dummyConfig, {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(result.found).toBe(true);
      expect(result.state).toBe("SIMULATED");
      expect(result.cae).toBeNull();
      expect(result.comprobanteNro).toBe("99");
    });
  });

  describe("2. Pre-flight Fiscal Matrix Validation", () => {
    it("rejects Factura A when documentType is DNI", () => {
      const check = validateFiscalMatrix({
        invoiceType: "FACTURA A",
        documentType: "DNI",
        documentNumber: "30123456789",
        condicionIva: "RI",
      });
      expect(check.valid).toBe(false);
      expect(check.error).toContain("el tipo de documento debe ser CUIT");
    });

    it("rejects Factura A when CUIT does not have 11 digits", () => {
      const check = validateFiscalMatrix({
        invoiceType: "FACTURA A",
        documentType: "CUIT",
        documentNumber: "30123456",
        condicionIva: "RI",
      });
      expect(check.valid).toBe(false);
      expect(check.error).toContain("11 dígitos");
    });

    it("rejects Factura A when recipient condition is Consumidor Final (CF)", () => {
      const check = validateFiscalMatrix({
        invoiceType: "FACTURA A",
        documentType: "CUIT",
        documentNumber: "30712293841",
        condicionIva: "CF",
      });
      expect(check.valid).toBe(false);
      expect(check.error).toContain("Responsable Inscripto (RI) o Monotributo (MT)");
    });

    it("accepts valid Factura A with CUIT and RI", () => {
      const check = validateFiscalMatrix({
        invoiceType: "FACTURA A",
        documentType: "CUIT",
        documentNumber: "30712293841",
        condicionIva: "RI",
      });
      expect(check.valid).toBe(true);
    });

    it("accepts valid Factura B with DNI and CF", () => {
      const check = validateFiscalMatrix({
        invoiceType: "FACTURA B",
        documentType: "DNI",
        documentNumber: "35123456",
        condicionIva: "CF",
      });
      expect(check.valid).toBe(true);
    });
  });

  describe("3. Date Mapping and ARCA bounds", () => {
    it("formats issueDate as DD/MM/YYYY and keeps it within valid bounds", () => {
      const payload = mapInvoiceToTusFacturasRequest({
        companyId: "comp-1",
        invoiceId: "inv-1",
        invoiceType: "FB",
        issueDate: "2026-09-25",
        total: 1210,
        items: [{ description: "Clavo", quantity: 1, unitPrice: 1000 }],
        client: {
          name: "Juan Pérez",
          documentType: "DNI",
          documentNumber: "35123456",
          condicionIva: "CF",
        },
        config: dummyConfig,
      });

      expect(payload.comprobante.tipo).toBe("FACTURA B");
      expect(payload.comprobante.fecha).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(payload.cliente.documento_tipo).toBe("DNI");
    });
  });

  describe("4. Webhook Test Handshake Support", () => {
    it("validates webhook schema with evento test without requiring external_reference", () => {
      const parsed = tusFacturasWebhookPayloadSchema.safeParse({
        evento: "test",
        recurso: "test",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.evento).toBe("test");
      }
    });

    it("handles test webhook event gracefully returning success without DB search", async () => {
      const mockPrisma = {} as any;
      const result = await handleTusFacturasWebhookDev(mockPrisma, {
        evento: "test",
      });
      expect(result).toEqual({ success: true, test: true, received: true });
    });
  });
});
