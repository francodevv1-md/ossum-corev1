import { describe, expect, it, vi } from "vitest";

import { FiscalError } from "@/lib/services/fiscal.service";
import { buildTusFacturasDevRequest, deriveTusFacturasDevDisplayState, issueTusFacturasDev, reconcileTusFacturasDev, tusFacturasDevConfig } from "@/lib/services/fiscal-tusfacturas.service";

const environment = { TUSFACTURAS_DEV_USER_TOKEN: "user-secret", TUSFACTURAS_DEV_API_TOKEN: "api-secret", TUSFACTURAS_DEV_API_KEY: "key-secret" };
const document = (state = "READY") => ({
  id: "fiscal-1", environment: "DEV_ONLY", state, externalReference: "ossum-dev-company-1-invoice-1-1234567890abcdef", snapshotHash: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  snapshot: { environment: "DEV_ONLY", policy: { documentType: "FACTURA B", pointOfSale: "00004", recipient: { documentType: "OTRO" as const, taxId: "0", legalName: "Consumidor Final", vatCondition: "CF" }, dueDate: "2026-12-31" }, invoice: { currency: "ARS" }, items: [{ description: "DEV implant", quantity: "1.0000", unitPrice: "100.0000", discount: "0.0000", ivaRate: "21.0000" }], totals: { total: "121.0000" } },
  attempts: [{ id: "attempt-1", state: "READY", externalReference: "ossum-dev-company-1-invoice-1-1234567890abcdef" }],
});

function prisma(record = document()) {
  return {
    fiscalDocument: { findFirst: vi.fn().mockResolvedValue(record), update: vi.fn().mockResolvedValue({}) },
    fiscalIssuanceAttempt: { update: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn().mockResolvedValue([]),
  };
}

describe("TusFacturas DEV configuration", () => {
  it("reports missing variable names without values", () => {
    expect(() => tusFacturasDevConfig({})).toThrow("TUSFACTURAS_DEV_USER_TOKEN, TUSFACTURAS_DEV_API_TOKEN, TUSFACTURAS_DEV_API_KEY");
  });

  it("builds a DEV_ONLY request with stable external_reference and no credentials", () => {
    const payload = buildTusFacturasDevRequest(document() as Parameters<typeof buildTusFacturasDevRequest>[0]);
    expect(payload.comprobante.external_reference).toBe(document().externalReference);
    expect(payload).not.toHaveProperty("usertoken");
    expect(payload.comprobante).toMatchObject({ fecha: "31/12/2026", moneda: "PES", punto_venta: 4, periodo_facturado_desde: "31/12/2026", periodo_facturado_hasta: "31/12/2026", external_reference: document().externalReference });
    expect(payload.cliente).toMatchObject({ documento_tipo: "OTRO", documento_nro: "0", condicion_iva: "CF", condicion_iva_operacion: "CF" });
  });

  it.each([
    ["colon", "ossum:invalid"],
    ["period", "ossum.invalid"],
    ["slash", "ossum/invalid"],
    ["space", "ossum invalid"],
    ["percent", "ossum%invalid"],
    ["apostrophe", "ossum'invalid"],
    ["unicode dash", "ossum\u2014invalid"],
    ["empty value", ""],
    ["256 characters", "a".repeat(256)],
  ])("rejects a provider-invalid external_reference with %s before any request", (_case, externalReference) => {
    const invalid = document();
    invalid.externalReference = externalReference;

    expect(() => buildTusFacturasDevRequest(invalid as Parameters<typeof buildTusFacturasDevRequest>[0])).toThrow("external reference");
  });

  it.each([
    ["maximum length", "a".repeat(255)],
    ["underscores and hyphens", "___---"],
  ])("accepts a provider-valid external_reference with %s", (_case, externalReference) => {
    const valid = document();
    valid.externalReference = externalReference;

    expect(buildTusFacturasDevRequest(valid as Parameters<typeof buildTusFacturasDevRequest>[0]).comprobante.external_reference).toBe(externalReference);
  });
});

describe("TusFacturas DEV issuance and reconciliation", () => {
  it("posts credentials only to the provider and persists a redacted authorized response with its temporary PDF URL", async () => {
    const db = prisma();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", cae: "123", comprobante_pdf_url: "https://temporary.example/pdf", external_reference: document().externalReference }), { status: 200 }));

    await expect(issueTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", explicitDevOnlyRequest: true, prisma: db as never, fetchImpl, environment })).resolves.toMatchObject({ state: "AUTHORIZED" });
    expect(fetchImpl).toHaveBeenCalledWith("https://www.tusfacturas.app/app/api/v2/facturacion/nuevo", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ usertoken: "user-secret", apitoken: "api-secret", apikey: "key-secret", comprobante: { external_reference: document().externalReference } });
    const updates = db.fiscalIssuanceAttempt.update.mock.calls.map(([call]) => call as { data: { responsePayload?: { issuance?: { response?: { comprobante_pdf_url?: string } } } } });
    expect(updates.every((update) => !JSON.stringify(update).includes("user-secret"))).toBe(true);
    expect(updates.at(-1)?.data.responsePayload?.issuance?.response?.comprobante_pdf_url).toBe("https://temporary.example/pdf");
  });

  it("keeps an error=N issuance without a CAE UNKNOWN and persists sanitized evidence", async () => {
    const db = prisma();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", external_reference: document().externalReference, usertoken: "reflected-secret" }), { status: 200 }));

    await expect(issueTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", explicitDevOnlyRequest: true, prisma: db as never, fetchImpl, environment })).resolves.toMatchObject({ state: "UNKNOWN", displayState: "UNKNOWN", error: { code: "tusfacturas_missing_cae" } });

    expect(db.fiscalDocument.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "UNKNOWN" }) }));
    expect(JSON.stringify(db.fiscalIssuanceAttempt.update.mock.calls.at(-1)?.[0].data.responsePayload)).not.toContain("reflected-secret");
  });

  it("persists a complete DEV_ONLY no-CAE response as UNKNOWN while deriving SIMULATED", async () => {
    const db = prisma();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", external_reference: document().externalReference, comprobante_nro: "00004-00000012", comprobante_pdf_url: "https://temporary.example/pdf", apikey: "reflected-secret" }), { status: 200 }));

    await expect(issueTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", explicitDevOnlyRequest: true, prisma: db as never, fetchImpl, environment })).resolves.toMatchObject({ state: "UNKNOWN", displayState: "SIMULATED" });

    expect(db.fiscalDocument.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "UNKNOWN", authorizedAt: undefined }) }));
    expect(JSON.stringify(db.fiscalIssuanceAttempt.update.mock.calls.at(-1)?.[0].data.responsePayload)).not.toContain("reflected-secret");
  });

  it.each([
    ["PDF URL", { comprobante_nro: "00004-00000012" }],
    ["document number", { comprobante_pdf_url: "https://temporary.example/pdf" }],
  ])("keeps incomplete DEV_ONLY simulated evidence UNKNOWN when %s is missing", async (_missing, evidence) => {
    const db = prisma();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", external_reference: document().externalReference, ...evidence }), { status: 200 }));

    await expect(issueTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", explicitDevOnlyRequest: true, prisma: db as never, fetchImpl, environment })).resolves.toMatchObject({ state: "UNKNOWN", error: { code: "tusfacturas_missing_cae" } });
  });

  it("derives SIMULATED only from complete DEV_ONLY issuance evidence", () => {
    const response = { error: "N", external_reference: document().externalReference, comprobante_nro: "00004-00000012", comprobante_pdf_url: "https://temporary.example/pdf" };
    const input = { persistedState: "UNKNOWN", externalReference: document().externalReference, response };

    expect(deriveTusFacturasDevDisplayState({ ...input, environment: "DEV_ONLY" })).toBe("SIMULATED");
    expect(deriveTusFacturasDevDisplayState({ ...input, environment: "PRODUCTION" })).toBe("UNKNOWN");
    expect(deriveTusFacturasDevDisplayState({ ...input, environment: "DEV_ONLY", response: { ...response, comprobante_pdf_url: "" } })).toBe("UNKNOWN");
    expect(deriveTusFacturasDevDisplayState({ ...input, environment: "DEV_ONLY", response: { ...response, cae: "123" } })).toBe("UNKNOWN");
  });

  it("keeps an error=N issuance with a mismatched external reference UNKNOWN", async () => {
    const db = prisma();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", cae: "123", external_reference: "another-reference" }), { status: 200 }));

    await expect(issueTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", explicitDevOnlyRequest: true, prisma: db as never, fetchImpl, environment })).resolves.toMatchObject({ state: "UNKNOWN", error: { code: "tusfacturas_external_reference_mismatch" } });
    expect(db.fiscalDocument.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "UNKNOWN" }) }));
    expect(db.fiscalIssuanceAttempt.update.mock.calls.at(-1)?.[0].data.responsePayload).toMatchObject({ issuance: { response: { cae: "123", external_reference: "another-reference" }, error: { code: "tusfacturas_external_reference_mismatch" } } });
  });

  it("redacts reflected provider credentials, including nested variants, before persistence", async () => {
    const db = prisma();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", cae: "123", external_reference: document().externalReference, usertoken: "reflected-user", apitoken: "reflected-api", apikey: "reflected-key", nested: { user_token: "nested-user", api_token: "nested-api", api_key: "nested-key" } }), { status: 200 }));

    await issueTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", explicitDevOnlyRequest: true, prisma: db as never, fetchImpl, environment });

    const persisted = JSON.stringify(db.fiscalIssuanceAttempt.update.mock.calls.at(-1)?.[0].data.responsePayload);
    expect(persisted).not.toMatch(/reflected|nested-(user|api|key)/);
    expect(persisted).toContain('"cae":"123"');
    expect(persisted).toContain(`"external_reference":"${document().externalReference}"`);
  });

  it("persists a definitive provider rejection as REJECTED rather than UNKNOWN", async () => {
    const db = prisma();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "S", errores: ["Rejected"], error_details: [{ code: "TFC-8004", text: "Rejected" }] }), { status: 200 }));

    await expect(issueTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", explicitDevOnlyRequest: true, prisma: db as never, fetchImpl, environment })).resolves.toMatchObject({ state: "REJECTED", error: { code: "TFC-8004" } });
    expect(db.fiscalDocument.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "REJECTED" }) }));
    expect(db.fiscalIssuanceAttempt.update.mock.calls.at(-1)?.[0].data.responsePayload).toMatchObject({ issuance: { response: { error: "S" }, error: { code: "TFC-8004", message: "Rejected" } } });
  });

  it("leaves a timeout UNKNOWN and reconciles it by external_reference", async () => {
    const db = prisma();
    const timeout = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await expect(issueTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", explicitDevOnlyRequest: true, prisma: db as never, fetchImpl: timeout, environment })).rejects.toMatchObject({ code: "tusfacturas_timeout" } satisfies Partial<FiscalError>);

    const lookup = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", comprobantes: [{ cae: "456", external_reference: document().externalReference }] }), { status: 200 }));
    await expect(reconcileTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", externalReference: document().externalReference, prisma: db as never, fetchImpl: lookup, environment })).resolves.toMatchObject({ state: "AUTHORIZED" });
    expect(lookup).toHaveBeenCalledWith("https://www.tusfacturas.app/app/api/v2/facturacion/consulta_avanzada", expect.anything());
    expect(JSON.parse(lookup.mock.calls[0][1].body)).toMatchObject({ busqueda_tipo: "EXT_REF", comprobante: { external_reference: document().externalReference } });
  });

  it("keeps a mismatched lookup record UNKNOWN even when it has a CAE", async () => {
    const db = prisma();
    const lookup = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", comprobantes: [{ cae: "456", external_reference: "another-reference" }] }), { status: 200 }));

    await expect(reconcileTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", externalReference: document().externalReference, prisma: db as never, fetchImpl: lookup, environment })).resolves.toMatchObject({ state: "UNKNOWN", error: { code: "tusfacturas_external_reference_mismatch" } });
    expect(db.fiscalDocument.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "UNKNOWN" }) }));
  });

  it("preserves a provider lookup error as UNKNOWN", async () => {
    const db = prisma();
    const lookup = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "S", error_details: [{ code: "TFC-8002", text: "invalid external_reference characters" }] }), { status: 200 }));

    await expect(reconcileTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", externalReference: document().externalReference, prisma: db as never, fetchImpl: lookup, environment })).resolves.toMatchObject({ state: "UNKNOWN", error: { code: "TFC-8002" } });
  });

  it("preserves a successful zero-match lookup as UNKNOWN", async () => {
    const db = prisma();
    const lookup = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", total: 0, comprobantes: [] }), { status: 200 }));

    await expect(reconcileTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", externalReference: document().externalReference, prisma: db as never, fetchImpl: lookup, environment })).resolves.toMatchObject({ state: "UNKNOWN" });
    expect(db.fiscalDocument.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "UNKNOWN" }) }));
  });

  it("keeps issuance errors when reconciliation evidence is persisted", async () => {
    const record = document("UNKNOWN");
    record.attempts[0] = {
      ...record.attempts[0],
      responsePayload: { issuance: { response: { error: "S" }, error: { code: "TFC-8002", message: "Original issuance error" } } },
      errorCode: "TFC-8002",
      errorMessage: "Original issuance error",
    } as typeof record.attempts[number];
    const db = prisma(record);
    const lookup = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", total: 0, comprobantes: [] }), { status: 200 }));

    await reconcileTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", externalReference: record.externalReference, prisma: db as never, fetchImpl: lookup, environment });

    const lastUpdate = db.fiscalIssuanceAttempt.update.mock.calls.at(-1)?.[0].data;
    expect(lastUpdate.responsePayload).toMatchObject({ issuance: { error: { code: "TFC-8002", message: "Original issuance error" } }, reconciliation: { response: { error: "N", total: 0 } } });
    expect(lastUpdate).not.toHaveProperty("errorCode");
    expect(lastUpdate).not.toHaveProperty("errorMessage");
  });

  it("migrates legacy lookup evidence without mislabeling it as issuance", async () => {
    const record = document("UNKNOWN");
    record.attempts[0] = { ...record.attempts[0], responsePayload: { lookup: { error: "N", total: 0, comprobantes: [] } } } as typeof record.attempts[number];
    const db = prisma(record);
    const lookup = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "N", total: 0, comprobantes: [] }), { status: 200 }));

    await reconcileTusFacturasDev({ companyId: "company-1", fiscalDocumentId: "fiscal-1", externalReference: record.externalReference, prisma: db as never, fetchImpl: lookup, environment });

    const lastUpdate = db.fiscalIssuanceAttempt.update.mock.calls.at(-1)?.[0].data;
    expect(lastUpdate.responsePayload).toEqual({ reconciliation: { response: { error: "N", total: 0, comprobantes: [] } } });
  });
});
