import { describe, expect, it, vi } from "vitest";
import {
  issueFiscalInvoiceDev,
  handleTusFacturasWebhookDev,
} from "@/lib/services/fiscal-issuance.service";
import {
  mapInvoiceToTusFacturasRequest,
  sanitizeTusFacturasFiscalPayload,
  type TusFacturasDevConfig,
} from "@/lib/services/fiscal-tusfacturas.service";

describe("fiscal-issuance.service", () => {
  const dummyConfig: TusFacturasDevConfig = {
    apiKey: "api-key-secret",
    apiToken: "tok_abc",
    userToken: "user_xyz",
    puntoVenta: 1,
    apiUrl: "https://test.example.com",
  };

  it("throws fiscal_dev_config_missing (422) if config is missing", async () => {
    const prismaMock = {} as never;
    await expect(
      issueFiscalInvoiceDev(prismaMock, "comp-1", "inv-1", "user-1", { config: null as never }),
    ).rejects.toMatchObject({ code: "fiscal_dev_config_missing", status: 422 });
  });

  it("throws 404 when invoice does not exist", async () => {
    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as never;

    await expect(
      issueFiscalInvoiceDev(prismaMock, "comp-1", "inv-nonexistent", "user-1", { config: dummyConfig }),
    ).rejects.toMatchObject({ code: "invoice_not_found" });
  });

  it("blocks issuance if invoice is cancelled", async () => {
    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue({
          id: "inv-1",
          companyId: "comp-1",
          state: "Anulada",
          items: [],
        }),
      },
    } as never;

    await expect(
      issueFiscalInvoiceDev(prismaMock, "comp-1", "inv-1", "user-1", { config: dummyConfig }),
    ).rejects.toMatchObject({ code: "invoice_cancelled" });
  });

  it("blocks issuance if already authorized", async () => {
    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue({
          id: "inv-1",
          companyId: "comp-1",
          state: "Emitida",
          total: 100,
          items: [{ description: "Item", quantity: 1, unitPrice: 100 }],
        }),
      },
      fiscalDocument: {
        findFirst: vi.fn().mockResolvedValue({
          id: "fdoc-1",
          companyId: "comp-1",
          invoiceId: "inv-1",
          state: "AUTHORIZED",
          authorizedAt: new Date(),
          attempts: [],
        }),
      },
    } as never;

    await expect(
      issueFiscalInvoiceDev(prismaMock, "comp-1", "inv-1", "user-1", { config: dummyConfig }),
    ).rejects.toMatchObject({ code: "fiscal_already_authorized", status: 409 });
  });

  it("executes DEV issuance and records attempt and snapshot", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        error: "N",
        external_reference: "OSSUM-COMP1-inv1",
        comprobante_nro: "00001-00000010",
        comprobante_tipo: "FACTURA B",
        comprobante_pdf_url: "https://example.com/pdf/test.pdf",
      }),
    });

    const mockCreateDoc = vi.fn().mockResolvedValue({
      id: "fdoc-1",
      companyId: "comp-1",
      invoiceId: "inv-1",
      environment: "DEV_ONLY",
      state: "SUBMITTED",
      externalReference: "OSSUM-COMP1-inv1",
      snapshotHash: "hash123",
      createdAt: new Date(),
    });

    const mockCreateAttempt = vi.fn().mockResolvedValue({ id: "att-1" });
    const mockUpdateDoc = vi.fn().mockResolvedValue({ id: "fdoc-1" });

    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue({
          id: "inv-1",
          companyId: "comp-1",
          visibleNumber: 10,
          state: "Emitida",
          type: "FV",
          total: 500,
          items: [{ description: "Prótesis", quantity: 1, unitPrice: 500 }],
          surgery: { patient: { legalName: "Juan Pérez", documentNumber: "20123456789" } },
        }),
      },
      fiscalDocument: {
        findFirst: vi.fn().mockImplementation((args) => {
          if (args?.select) {
            return Promise.resolve({
              id: "fdoc-1",
              environment: "DEV_ONLY",
              state: "UNKNOWN",
              externalReference: "OSSUM-COMP1-inv1",
              snapshotHash: "a".repeat(64),
              createdAt: new Date("2026-09-28T12:00:00Z"),
              submittedAt: new Date("2026-09-28T12:00:00Z"),
              authorizedAt: null,
              attempts: [
                {
                  id: "att-1",
                  attemptNumber: 1,
                  state: "UNKNOWN",
                  externalReference: "OSSUM-COMP1-inv1",
                  errorCode: null,
                  responsePayload: {
                    issuance: {
                      response: {
                        error: "N",
                        external_reference: "OSSUM-COMP1-inv1",
                        comprobante_nro: "00001-00000010",
                        comprobante_pdf_url: "https://example.com/pdf/test.pdf",
                      },
                    },
                  },
                  createdAt: new Date("2026-09-28T12:00:00Z"),
                  updatedAt: new Date("2026-09-28T12:00:00Z"),
                },
              ],
            });
          }
          return Promise.resolve(null);
        }),
        create: mockCreateDoc,
        update: mockUpdateDoc,
      },
      fiscalIssuanceAttempt: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: mockCreateAttempt,
      },
    } as never;

    const evidence = await issueFiscalInvoiceDev(prismaMock, "comp-1", "inv-1", "user-1", {
      config: dummyConfig,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(mockCreateDoc).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        snapshot: expect.not.objectContaining({ apikey: expect.anything(), apitoken: expect.anything(), usertoken: expect.anything() }),
      }),
    }));
    expect(mockCreateAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attemptNumber: 1,
          state: "UNKNOWN",
        }),
      }),
    );
    expect(JSON.stringify(mockCreateAttempt.mock.calls[0][0].data)).not.toContain(dummyConfig.apiKey);
    expect(JSON.stringify(mockCreateAttempt.mock.calls[0][0].data)).not.toContain(dummyConfig.apiToken);
    expect(JSON.stringify(mockCreateAttempt.mock.calls[0][0].data)).not.toContain(dummyConfig.userToken);
    expect(evidence.document.displayState).toBe("SIMULATED");
    expect(evidence.attempts).toHaveLength(1);
  });

  it("rejects a changed invoice instead of overwriting an immutable snapshot", async () => {
    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue({
          id: "inv-1", companyId: "comp-1", visibleNumber: 10, state: "Emitida", type: "FV", total: 500,
          items: [{ description: "Prótesis", quantity: 1, unitPrice: 500 }], surgery: null,
        }),
      },
      fiscalDocument: {
        findFirst: vi.fn().mockResolvedValue({
          id: "fdoc-1", companyId: "comp-1", invoiceId: "inv-1", state: "UNKNOWN", authorizedAt: null,
          externalReference: "OSSUM-COMP1-inv1", snapshot: { comprobante: { external_reference: "OSSUM-COMP1-inv1", total: 999 } }, attempts: [],
        }),
        create: vi.fn(),
      },
    } as never;
    const fetchFn = vi.fn();

    await expect(issueFiscalInvoiceDev(prismaMock, "comp-1", "inv-1", "user-1", { config: dummyConfig, fetchFn: fetchFn as never }))
      .rejects.toMatchObject({ code: "fiscal_snapshot_mismatch", status: 409 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("handles concurrent creation conflicts (P2002) atomically by returning 409 fiscal_issuance_in_progress", async () => {
    const fetchFn = vi.fn();
    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue({
          id: "inv-1", companyId: "comp-1", visibleNumber: 10, state: "Emitida", type: "FV", total: 500,
          items: [{ description: "Prótesis", quantity: 1, unitPrice: 500 }], surgery: null,
        }),
      },
      fiscalDocument: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue({ code: "P2002", message: "Unique constraint failed on invoiceId" }),
      },
    } as never;

    await expect(
      issueFiscalInvoiceDev(prismaMock, "comp-1", "inv-1", "user-1", { config: dummyConfig, fetchFn: fetchFn as never }),
    ).rejects.toMatchObject({ code: "fiscal_issuance_in_progress", status: 409 });

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("reconciles existing UNKNOWN document and blocks new emission if not confirmed", async () => {
    const mockReconcileFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        error: "N",
        external_reference: "OSSUM-COMP1-inv1",
        comprobantes: [],
      }),
    });

    const invoiceData = {
      id: "inv-1",
      companyId: "comp-1",
      visibleNumber: 10,
      state: "Emitida",
      type: "FV",
      total: 500,
      items: [{ description: "Prótesis", quantity: 1, unitPrice: 500 }],
      surgery: null,
    };

    const matchingPayload = mapInvoiceToTusFacturasRequest({
      companyId: "comp-1",
      invoiceId: "inv-1",
      visibleNumber: 10,
      invoiceType: "FV",
      total: 500,
      items: [{ description: "Prótesis", quantity: 1, unitPrice: 500 }],
      config: dummyConfig,
    });
    const matchingSnapshot = sanitizeTusFacturasFiscalPayload(matchingPayload);

    const prismaMock = {
      invoice: {
        findFirst: vi.fn().mockResolvedValue(invoiceData),
      },
      fiscalDocument: {
        findFirst: vi.fn().mockResolvedValue({
          id: "fdoc-1",
          companyId: "comp-1",
          invoiceId: "inv-1",
          state: "UNKNOWN",
          authorizedAt: null,
          externalReference: "OSSUM-COMP1-inv1",
          snapshot: matchingSnapshot,
          attempts: [{ attemptNumber: 1 }],
        }),
      },
    } as never;

    await expect(
      issueFiscalInvoiceDev(prismaMock, "comp-1", "inv-1", "user-1", {
        config: dummyConfig,
        fetchFn: mockReconcileFetch as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "fiscal_issuance_in_progress", status: 409 });

    expect(mockReconcileFetch).toHaveBeenCalledTimes(1);
    expect(mockReconcileFetch.mock.calls[0][0]).toContain("consulta_avanzada");
  });

  it("handles webhook updates idempotently", async () => {
    const mockCreateAttempt = vi.fn().mockResolvedValue({ id: "att-2" });
    const mockUpdateDoc = vi.fn().mockResolvedValue({ id: "fdoc-1" });

    const prismaMock = {
      fiscalDocument: {
        findFirst: vi.fn().mockResolvedValue({
          id: "fdoc-1",
          companyId: "comp-1",
          externalReference: "OSSUM-REF-100",
          state: "PENDING",
          attempts: [{ attemptNumber: 1 }],
        }),
        update: mockUpdateDoc,
      },
      fiscalIssuanceAttempt: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: mockCreateAttempt,
      },
      invoice: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as never;

    const result = await handleTusFacturasWebhookDev(prismaMock, {
      evento: "emitido",
      external_reference: "OSSUM-REF-100",
      comprobante_nro: "00001-00000050",
      comprobante_tipo: "FACTURA B",
      cae: "74328912345678",
      vencimiento_cae: "2026-10-10",
    });

    expect(result).toEqual({ success: true, state: "AUTHORIZED" });
    expect(mockCreateAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attemptNumber: 2,
          state: "AUTHORIZED",
        }),
      }),
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          state: "AUTHORIZED",
        }),
      }),
    );
  });

  it("does not create another attempt or mutate state for a replayed webhook", async () => {
    const mockCreateAttempt = vi.fn();
    const mockUpdateDoc = vi.fn();
    const prismaMock = {
      fiscalDocument: {
        findFirst: vi.fn().mockResolvedValue({
          id: "fdoc-1", companyId: "comp-1", externalReference: "OSSUM-REF-100", state: "AUTHORIZED", attempts: [{ attemptNumber: 2 }],
        }),
        update: mockUpdateDoc,
      },
      fiscalIssuanceAttempt: {
        findFirst: vi.fn().mockResolvedValue({ id: "att-existing" }),
        create: mockCreateAttempt,
      },
    } as never;

    await expect(handleTusFacturasWebhookDev(prismaMock, {
      hook_id: "provider-hook-1", evento: "emitido", external_reference: "OSSUM-REF-100", cae: "74328912345678",
    })).resolves.toEqual({ ignored: true, reason: "duplicate_webhook" });
    expect(mockCreateAttempt).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});
