import { Prisma, type PrismaClient } from "@prisma/client";

import { FiscalError } from "./fiscal.service";
import { TUSFACTURAS_DEV_CREDENTIAL_NAMES, tusFacturasResponseSchema, type TusFacturasResponse } from "../validators/fiscal-tusfacturas";

const DEFAULT_BASE_URL = "https://www.tusfacturas.app/app/api/v2/facturacion";
const ISSUE_PATH = "nuevo";
const LOOKUP_PATH = "consulta_avanzada";
const REQUEST_TIMEOUT_MS = 30_000;
const SENSITIVE_RESPONSE_FIELD = /token|apikey|api_key|authorization|credentials|password|secret/i;

type Environment = Record<string, string | undefined>;
type Fetch = typeof fetch;
type FiscalRecord = {
  id: string;
  environment: string;
  state: "READY" | "SUBMITTED" | "PENDING" | "AUTHORIZED" | "REJECTED" | "UNKNOWN";
  externalReference: string;
  snapshotHash: string;
  snapshot: {
    environment: "DEV_ONLY";
    policy: { documentType: string; pointOfSale: string; recipient: { taxId: string; documentType?: "CUIT" | "DNI" | "PASAPORTE" | "OTRO" | "LE" | "LC"; legalName: string; vatCondition: string }; dueDate?: string };
    invoice: { currency: string };
    items: Array<{ description: string; quantity: string; unitPrice: string; discount: string; ivaRate: string }>;
    totals: { total: string };
  };
  attempts: Array<{ id: string; state: string; externalReference: string; responsePayload?: unknown; errorCode?: string | null; errorMessage?: string | null }>;
};

export type TusFacturasDevConfig = { baseUrl: string; usertoken: string; apitoken: string; apikey: string };
export type IssueTusFacturasDevInput = { companyId: string; fiscalDocumentId: string; explicitDevOnlyRequest: true; prisma: PrismaClient; fetchImpl?: Fetch; environment?: Environment };
export type ReconcileTusFacturasDevInput = Omit<IssueTusFacturasDevInput, "explicitDevOnlyRequest"> & { externalReference: string };

export function tusFacturasDevConfig(environment: Environment = process.env): TusFacturasDevConfig {
  const missing = TUSFACTURAS_DEV_CREDENTIAL_NAMES.filter((name) => !environment[name]?.trim());
  if (missing.length) throw new FiscalError("tusfacturas_dev_not_configured", `Missing TusFacturas DEV configuration: ${missing.join(", ")}`, 501);
  const baseUrl = environment.TUSFACTURAS_DEV_BASE_URL?.trim().replace(/\/$/, "") || DEFAULT_BASE_URL;
  if (new URL(baseUrl).protocol !== "https:") throw new FiscalError("tusfacturas_dev_insecure_endpoint", "TusFacturas DEV endpoint must use HTTPS", 500);
  return {
    baseUrl,
    usertoken: environment.TUSFACTURAS_DEV_USER_TOKEN!.trim(),
    apitoken: environment.TUSFACTURAS_DEV_API_TOKEN!.trim(),
    apikey: environment.TUSFACTURAS_DEV_API_KEY!.trim(),
  };
}

function dateForProvider(value: string | undefined) {
  if (!value) throw new FiscalError("tusfacturas_dev_fixture_incomplete", "DEV_ONLY fiscal fixture requires a due date", 422);
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function trimProviderValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function pointOfSaleForProvider(value: string) {
  if (!/^\d{1,5}$/.test(value)) throw new FiscalError("tusfacturas_invalid_point_of_sale", "TusFacturas point of sale must be a numeric integer of at most five digits", 422);
  return Number(value);
}

export function buildTusFacturasDevRequest(document: Pick<FiscalRecord, "environment" | "externalReference" | "snapshotHash" | "snapshot">) {
  if (document.environment !== "DEV_ONLY" || document.snapshot.environment !== "DEV_ONLY") {
    throw new FiscalError("tusfacturas_dev_only_required", "TusFacturas issuance requires a DEV_ONLY fiscal document", 422);
  }
  if (!/^[A-Za-z0-9_-]{1,255}$/.test(document.externalReference)) {
    throw new FiscalError("tusfacturas_invalid_external_reference", "TusFacturas external reference must contain only letters, numbers, underscores, or hyphens", 422);
  }
  const date = dateForProvider(document.snapshot.policy.dueDate);
  const customerCode = `DEV${document.snapshotHash.slice(0, 17)}`;
  return {
    cliente: {
      documento_tipo: document.snapshot.policy.recipient.documentType ?? "CUIT",
      documento_nro: document.snapshot.policy.recipient.taxId.replace(/\D/g, ""),
      razon_social: trimProviderValue(document.snapshot.policy.recipient.legalName),
      domicilio: "DEV_ONLY Address",
      provincia: "2",
      envia_por_mail: "N",
      condicion_pago: "214",
      condicion_pago_otra: "DEV_ONLY",
      condicion_iva: document.snapshot.policy.recipient.vatCondition,
      condicion_iva_operacion: document.snapshot.policy.recipient.vatCondition,
      codigo: customerCode,
      rg5329: "N",
      reclama_deuda: "N",
    },
    comprobante: {
      fecha: date,
      tipo: document.snapshot.policy.documentType,
      moneda: document.snapshot.invoice.currency === "ARS" ? "PES" : document.snapshot.invoice.currency,
      cotizacion: "1",
      operacion: "V",
      idioma: "1",
      punto_venta: pointOfSaleForProvider(document.snapshot.policy.pointOfSale),
      vencimiento: date,
      periodo_facturado_desde: date,
      periodo_facturado_hasta: date,
      rubro: "DEV_ONLY",
      rubro_grupo_contable: "DEV_ONLY",
      external_reference: document.externalReference,
      detalle: document.snapshot.items.map((item, index) => ({
        cantidad: item.quantity,
        afecta_stock: "N",
        bonificacion_porcentaje: item.discount === "0.0000" ? "0" : item.discount,
        producto: {
          descripcion: trimProviderValue(item.description),
          unidad_bulto: "1",
          lista_precios: "DEV_ONLY",
          codigo: `DEV${document.snapshotHash.slice(0, 14)}${index}`,
          precio_unitario_sin_iva: item.unitPrice,
          alicuota: item.ivaRate,
          unidad_medida: "7",
          actualiza_precio: "N",
          rg5329: "N",
        },
      })),
      total: document.snapshot.totals.total,
    },
  };
}

function credentials(config: TusFacturasDevConfig) {
  return { usertoken: config.usertoken, apitoken: config.apitoken, apikey: config.apikey };
}

async function post(config: TusFacturasDevConfig, path: string, body: object, fetchImpl: Fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${config.baseUrl}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
    const payload = tusFacturasResponseSchema.parse(await response.json());
    if (!response.ok) throw new FiscalError("tusfacturas_http_error", `TusFacturas returned HTTP ${response.status}`, 502);
    return payload;
  } catch (error) {
    if (error instanceof FiscalError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new FiscalError("tusfacturas_timeout", "TusFacturas request timed out", 504);
    throw new FiscalError("tusfacturas_transport_error", "TusFacturas request could not be completed", 502);
  } finally {
    clearTimeout(timeout);
  }
}

function providerError(response: TusFacturasResponse) {
  const details = response.error_details?.[0] as { code?: unknown; text?: unknown } | undefined;
  const code = typeof details?.code === "string" ? details.code : "tusfacturas_provider_error";
  const message = typeof details?.text === "string" ? details.text : response.errores?.map(String).join("; ") || "TusFacturas reported an error";
  return { code, message };
}

export type FiscalDisplayState = FiscalRecord["state"] | "SIMULATED";

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

export function deriveTusFacturasDevDisplayState(input: {
  environment: string;
  persistedState: FiscalRecord["state"] | string;
  externalReference: string;
  response: unknown;
}): FiscalDisplayState {
  if (input.persistedState !== "UNKNOWN" || input.environment !== "DEV_ONLY" || !input.response || typeof input.response !== "object") {
    return input.persistedState as FiscalDisplayState;
  }

  const response = input.response as Record<string, unknown>;
  if (
    response.error === "N"
    && response.external_reference === input.externalReference
    && nonEmptyString(response.comprobante_nro)
    && nonEmptyString(response.comprobante_pdf_url)
    && !nonEmptyString(response.cae)
  ) return "SIMULATED";

  return "UNKNOWN";
}

function classifySuccessfulProviderResponse(document: Pick<FiscalRecord, "environment" | "externalReference">, response: TusFacturasResponse) {
  if (response.cae?.trim() && response.external_reference === document.externalReference) return { state: "AUTHORIZED" as const };

  return {
    state: "UNKNOWN" as const,
    displayState: deriveTusFacturasDevDisplayState({ ...document, persistedState: "UNKNOWN", response }),
    error: response.external_reference !== document.externalReference
      ? { code: "tusfacturas_external_reference_mismatch", message: "TusFacturas returned a mismatched external reference" }
      : { code: "tusfacturas_missing_cae", message: "TusFacturas response is missing a CAE" },
  };
}

function sanitizeProviderResponse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeProviderResponse);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, nested]) => SENSITIVE_RESPONSE_FIELD.test(key) ? [] : [[key, sanitizeProviderResponse(nested)]]));
}

function isEvidence(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function preservedEvidence(existing: unknown, kind: "issuance" | "reconciliation", response: object, error?: { code?: string | null; message?: string | null }) {
  const previous = isEvidence(existing) ? existing : {};
  const legacy = previous.issuance || previous.reconciliation
    ? previous
    : previous.lookup
      ? { reconciliation: { response: previous.lookup } }
      : { issuance: { response: previous } };
  return {
    ...legacy,
    [kind]: { response: sanitizeProviderResponse(response), ...(error?.code ? { error } : {}) },
  };
}

async function updateAttempt(prisma: PrismaClient, attempt: FiscalRecord["attempts"][number], fiscalDocumentId: string, state: FiscalRecord["state"], data: { requestPayload?: object; evidence?: { kind: "issuance" | "reconciliation"; response: object; error?: { code?: string | null; message?: string | null } } }) {
  const evidence = data.evidence;
  await prisma.$transaction([
    prisma.fiscalIssuanceAttempt.update({ where: { id: attempt.id }, data: {
      state,
      requestPayload: data.requestPayload as Prisma.InputJsonValue | undefined,
      ...(evidence && {
        responsePayload: preservedEvidence(attempt.responsePayload, evidence.kind, evidence.response, evidence.error) as Prisma.InputJsonValue,
        ...(evidence.kind === "issuance" && { errorCode: evidence.error?.code ?? null, errorMessage: evidence.error?.message ?? null }),
      }),
    } }),
    prisma.fiscalDocument.update({ where: { id: fiscalDocumentId }, data: { state, submittedAt: state === "SUBMITTED" || state === "UNKNOWN" || state === "AUTHORIZED" ? new Date() : undefined, authorizedAt: state === "AUTHORIZED" ? new Date() : undefined } }),
  ]);
}

async function findDocument(prisma: PrismaClient, companyId: string, fiscalDocumentId: string) {
  const document = await prisma.fiscalDocument.findFirst({ where: { id: fiscalDocumentId, companyId }, include: { attempts: { orderBy: { attemptNumber: "desc" }, take: 1 } } });
  if (!document) throw new FiscalError("fiscal_document_not_found", `Fiscal document ${fiscalDocumentId} was not found`, 404);
  if (!document.attempts[0]) throw new FiscalError("fiscal_attempt_not_found", `Fiscal document ${fiscalDocumentId} has no issuance attempt`, 409);
  return document as unknown as FiscalRecord;
}

export async function issueTusFacturasDev(input: IssueTusFacturasDevInput) {
  if (input.explicitDevOnlyRequest !== true) throw new FiscalError("tusfacturas_explicit_request_required", "TusFacturas DEV issuance requires an explicit caller action", 422);
  const config = tusFacturasDevConfig(input.environment);
  const document = await findDocument(input.prisma, input.companyId, input.fiscalDocumentId);
  if (document.state !== "READY") throw new FiscalError("fiscal_document_not_ready", `Fiscal document ${document.id} is ${document.state}`, 409);
  const requestPayload = buildTusFacturasDevRequest(document);
  const attempt = document.attempts[0];
  await updateAttempt(input.prisma, attempt, document.id, "SUBMITTED", { requestPayload });
  try {
    const response = await post(config, ISSUE_PATH, { ...credentials(config), ...requestPayload }, input.fetchImpl ?? fetch);
    if (response.error === "N") {
      const outcome = classifySuccessfulProviderResponse(document, response);
      if (outcome.state === "UNKNOWN") {
        await updateAttempt(input.prisma, attempt, document.id, outcome.state, { requestPayload, evidence: { kind: "issuance", response, error: outcome.error } });
        return { state: outcome.state, displayState: outcome.displayState, externalReference: document.externalReference, response, error: outcome.error };
      }
      await updateAttempt(input.prisma, attempt, document.id, outcome.state, { requestPayload, evidence: { kind: "issuance", response } });
      return { state: outcome.state, externalReference: document.externalReference, response };
    }
    const error = providerError(response);
    await updateAttempt(input.prisma, attempt, document.id, "REJECTED", { requestPayload, evidence: { kind: "issuance", response, error } });
    return { state: "REJECTED" as const, externalReference: document.externalReference, response, error };
  } catch (error) {
    const fiscalError = error instanceof FiscalError ? error : new FiscalError("tusfacturas_transport_error", "TusFacturas request could not be completed", 502);
    await updateAttempt(input.prisma, attempt, document.id, "UNKNOWN", { requestPayload, evidence: { kind: "issuance", response: {}, error: { code: fiscalError.code, message: fiscalError.message } } });
    throw fiscalError;
  }
}

export async function reconcileTusFacturasDev(input: ReconcileTusFacturasDevInput) {
  const config = tusFacturasDevConfig(input.environment);
  const document = await findDocument(input.prisma, input.companyId, input.fiscalDocumentId);
  if (document.externalReference !== input.externalReference) throw new FiscalError("fiscal_external_reference_mismatch", "Fiscal document external reference does not match", 409);
  const requestPayload = { busqueda_tipo: "EXT_REF", pagina: 0, limite: 1, comprobante: { external_reference: input.externalReference, operacion: "V" } };
  const response = await post(config, LOOKUP_PATH, { ...credentials(config), ...requestPayload }, input.fetchImpl ?? fetch);
  if (response.error !== "N") {
    const error = providerError(response);
    await updateAttempt(input.prisma, document.attempts[0], document.id, "UNKNOWN", { evidence: { kind: "reconciliation", response, error } });
    return { state: "UNKNOWN" as const, externalReference: input.externalReference, response, error };
  }
  const found = response.comprobantes?.[0] as TusFacturasResponse | undefined;
  const reconciled = found && typeof found === "object" ? tusFacturasResponseSchema.parse(found) : undefined;
  const outcome = reconciled
    ? classifySuccessfulProviderResponse(document, reconciled)
    : { state: "UNKNOWN" as const };
  const error = "error" in outcome ? outcome.error : undefined;
  await updateAttempt(input.prisma, document.attempts[0], document.id, outcome.state, { evidence: { kind: "reconciliation", response, error } });
  return { state: outcome.state, externalReference: input.externalReference, response, ...(error && { error }) };
}
