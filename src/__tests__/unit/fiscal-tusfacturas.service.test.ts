import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildDeterministicExternalReference,
  calculateFiscalSnapshotHash,
  mapInvoiceToTusFacturasRequest,
  callTusFacturasNewInvoice,
  callTusFacturasReconcile,
  getTusFacturasDevConfig,
  isTusFacturasDevConfigured,
  sanitizeTusFacturasFiscalPayload,
  validateAndFormatIssueDate,
  formatDateToAr,
  type TusFacturasDevConfig,
} from "@/lib/services/fiscal-tusfacturas.service";

describe("fiscal-tusfacturas.service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("detects DEV configuration correctly", () => {
    delete process.env.TUSFACTURAS_API_KEY;
    delete process.env.TUSFACTURAS_API_TOKEN;
    delete process.env.TUSFACTURAS_USER_TOKEN;

    expect(isTusFacturasDevConfigured()).toBe(false);
    expect(getTusFacturasDevConfig()).toBeNull();

    process.env.TUSFACTURAS_API_KEY = "12345";
    process.env.TUSFACTURAS_API_TOKEN = "tok_abc123";
    process.env.TUSFACTURAS_USER_TOKEN = "user_xyz789";
    process.env.TUSFACTURAS_PUNTO_VENTA = "3";

    expect(isTusFacturasDevConfigured()).toBe(true);
    expect(getTusFacturasDevConfig()).toEqual({
      apiKey: "12345",
      apiToken: "tok_abc123",
      userToken: "user_xyz789",
      puntoVenta: 3,
      apiUrl: "https://www.tusfacturas.app/app/api/v2",
    });
  });

  it("generates deterministic external reference and snapshot hash", () => {
    const ref1 = buildDeterministicExternalReference("comp-1234-xyz", "inv-9988");
    const ref2 = buildDeterministicExternalReference("comp-1234-xyz", "inv-9988");
    expect(ref1).toBe(ref2);
    expect(ref1).toBe("OSSUM-COMP1234-inv9988");

    const hash1 = calculateFiscalSnapshotHash({ a: 1, b: "test" });
    const hash2 = calculateFiscalSnapshotHash({ b: "test", a: 1 });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("sanitizes credentials before fiscal evidence is hashed or persisted", () => {
    const sanitized = sanitizeTusFacturasFiscalPayload({
      apikey: "api-key-secret",
      apitoken: "api-token-secret",
      usertoken: "user-token-secret",
      comprobante: { external_reference: "OSSUM-DEV-1" },
      nested: { authorization: "Bearer secret", safe: "value" },
    });

    expect(JSON.stringify(sanitized)).not.toContain("secret");
    expect(sanitized).toMatchObject({ comprobante: { external_reference: "OSSUM-DEV-1" }, nested: { safe: "value" } });
    expect(calculateFiscalSnapshotHash(sanitized)).not.toBe(calculateFiscalSnapshotHash({ ...sanitized, apikey: "api-key-secret" }));
  });

  it("maps invoice data to TusFacturas request payload for Factura B", () => {
    const dummyConfig: TusFacturasDevConfig = {
      apiKey: "12345",
      apiToken: "tok_abc",
      userToken: "user_xyz",
      puntoVenta: 2,
      apiUrl: "https://www.tusfacturas.app/app/api/v2",
    };

    const payload = mapInvoiceToTusFacturasRequest({
      companyId: "company-test",
      invoiceId: "invoice-42",
      visibleNumber: 42,
      invoiceType: "FV",
      total: 15000,
      items: [
        { description: "Prótesis de cadera", quantity: 1, unitPrice: 15000, sku: "PR-01" },
      ],
      client: {
        legalName: "Juan Pérez",
        documentType: "DNI",
        documentNumber: "30546741",
        email: "juan@example.com",
        condicionIva: "CF",
      },
      config: dummyConfig,
    });

    expect(payload.apikey).toBe("12345");
    expect(payload.apitoken).toBe("tok_abc");
    expect(payload.usertoken).toBe("user_xyz");
    expect(payload.cliente.documento_nro).toBe("30546741");
    expect(payload.cliente.razon_social).toBe("Juan Pérez");
    expect(payload.comprobante.punto_venta).toBe(2);
    expect(payload.comprobante.tipo).toBe("FACTURA B");
    expect(payload.comprobante.total).toBe(18150);
    expect(payload.comprobante.detalle).toHaveLength(1);
    expect(payload.comprobante.detalle[0].producto.descripcion).toBe("Prótesis de cadera");
    expect(payload.comprobante.external_reference).toBe("OSSUM-COMPANYT-invoice42");
  });

  it("maps invoice data to TusFacturas request payload for Factura A", () => {
    const dummyConfig: TusFacturasDevConfig = {
      apiKey: "12345",
      apiToken: "tok_abc",
      userToken: "user_xyz",
      puntoVenta: 1,
      apiUrl: "https://www.tusfacturas.app/app/api/v2",
    };

    const payload = mapInvoiceToTusFacturasRequest({
      companyId: "company-test",
      invoiceId: "invoice-99",
      visibleNumber: 99,
      invoiceType: "FA",
      total: 10000,
      items: [
        { description: "Material Quirúrgico", quantity: 1, unitPrice: 10000 },
      ],
      client: {
        legalName: "OSDE 310",
        documentType: "CUIT",
        documentNumber: "30-54674125-3",
        email: "facturacion@osde.com.ar",
        condicionIva: "RI",
      },
      config: dummyConfig,
    });

    expect(payload.cliente.documento_tipo).toBe("CUIT");
    expect(payload.cliente.documento_nro).toBe("30546741253");
    expect(payload.comprobante.tipo).toBe("FACTURA A");
    expect(payload.cliente.condicion_iva).toBe("RI");
  });

  it("validates and formats issue dates correctly with ARCA bounds", () => {
    const now = new Date();
    const todayFormatted = formatDateToAr(now);

    // Default to today when undefined or null
    expect(validateAndFormatIssueDate(undefined)).toBe(todayFormatted);
    expect(validateAndFormatIssueDate(null)).toBe(todayFormatted);

    // Valid date within 10 days
    const validPastDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(validateAndFormatIssueDate(validPastDate)).toBe(formatDateToAr(validPastDate));

    // Invalid date format throws
    expect(() => validateAndFormatIssueDate("not-a-valid-date")).toThrowError(/Fecha de emisión inválida/);

    // Date > 10 days in past throws
    const tooOldDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    expect(() => validateAndFormatIssueDate(tooOldDate)).toThrowError(/ARCA no admite comprobantes con fecha anterior a 10 días/);

    // Future date throws
    const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    expect(() => validateAndFormatIssueDate(futureDate)).toThrowError(/la fecha de comprobante no puede ser futura/);
  });

  it("handles successful SIMULATED response from TusFacturas DEV endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        error: "N",
        errores: [],
        external_reference: "OSSUM-DEV-1",
        comprobante_nro: "00002-00000042",
        comprobante_tipo: "FACTURA B",
        comprobante_pdf_url: "https://www.tusfacturas.app/pdf/temp123.pdf",
        rta: "Comprobante de prueba guardado",
      }),
    });

    const dummyConfig: TusFacturasDevConfig = {
      apiKey: "12345",
      apiToken: "tok_abc",
      userToken: "user_xyz",
      puntoVenta: 1,
      apiUrl: "https://test.example.com",
    };

    const payload = mapInvoiceToTusFacturasRequest({
      companyId: "c1",
      invoiceId: "i1",
      total: 100,
      items: [{ description: "Item 1", quantity: 1, unitPrice: 100 }],
      config: dummyConfig,
    });

    const response = await callTusFacturasNewInvoice(payload, {
      apiUrl: dummyConfig.apiUrl,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(response.error).toBe("N");
    expect(response.comprobante_nro).toBe("00002-00000042");
    expect(response.comprobante_pdf_url).toBe("https://www.tusfacturas.app/pdf/temp123.pdf");
    expect(response.cae).toBeFalsy();
  });

  it("handles rejection and network timeout errors cleanly", async () => {
    const mockTimeoutFetch = vi.fn().mockRejectedValue(new DOMException("The operation was aborted", "AbortError"));

    const dummyConfig: TusFacturasDevConfig = {
      apiKey: "12345",
      apiToken: "tok_abc",
      userToken: "user_xyz",
      puntoVenta: 1,
      apiUrl: "https://test.example.com",
    };

    const payload = mapInvoiceToTusFacturasRequest({
      companyId: "c1",
      invoiceId: "i1",
      total: 100,
      items: [{ description: "Item 1", quantity: 1, unitPrice: 100 }],
      config: dummyConfig,
    });

    const timeoutResponse = await callTusFacturasNewInvoice(payload, {
      apiUrl: dummyConfig.apiUrl,
      fetchFn: mockTimeoutFetch as unknown as typeof fetch,
      timeoutMs: 100,
    });

    expect(timeoutResponse.error).toBe("S");
    expect(timeoutResponse.error_cod).toContain("TIMEOUT");
  });

  it("reconciles invoice state via external reference search", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        error: "N",
        external_reference: "OSSUM-DEV-1",
        comprobante_nro: "00002-00000042",
        comprobante_tipo: "FACTURA B",
        comprobante_pdf_url: "https://www.tusfacturas.app/pdf/temp123.pdf",
      }),
    });

    const dummyConfig: TusFacturasDevConfig = {
      apiKey: "12345",
      apiToken: "tok_abc",
      userToken: "user_xyz",
      puntoVenta: 1,
      apiUrl: "https://test.example.com",
    };

    const result = await callTusFacturasReconcile("OSSUM-DEV-1", dummyConfig, {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.found).toBe(true);
    expect(result.state).toBe("SIMULATED");
    expect(result.comprobanteNro).toBe("00002-00000042");
    expect(result.pdfUrl).toBe("https://www.tusfacturas.app/pdf/temp123.pdf");
  });
});
