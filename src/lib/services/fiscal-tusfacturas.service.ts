import crypto from "crypto";
import { Prisma } from "@prisma/client";
import {
  type TusFacturasNewInvoiceRequest,
  type TusFacturasIssuanceResponse,
  tusFacturasNewInvoiceRequestSchema,
  tusFacturasIssuanceResponseSchema,
  tusFacturasReconcileRequestSchema,
  validateFiscalMatrix,
} from "../validators/fiscal-tusfacturas";
import { mapVatToTusFacturasAlicuota } from "../commercial/vat";

export type TusFacturasDevConfig = {
  apiKey: string;
  apiToken: string;
  userToken: string;
  puntoVenta: number;
  apiUrl: string;
};

export function getTusFacturasDevConfig(): TusFacturasDevConfig | null {
  const apiKey = (process.env.TUSFACTURAS_DEV_API_KEY || process.env.TUSFACTURAS_API_KEY)?.trim();
  const apiToken = (process.env.TUSFACTURAS_DEV_API_TOKEN || process.env.TUSFACTURAS_API_TOKEN)?.trim();
  const userToken = (process.env.TUSFACTURAS_DEV_USER_TOKEN || process.env.TUSFACTURAS_USER_TOKEN)?.trim();
  const puntoVentaRaw = (process.env.TUSFACTURAS_DEV_PUNTO_VENTA || process.env.TUSFACTURAS_PUNTO_VENTA)?.trim();
  const apiUrl = (process.env.TUSFACTURAS_DEV_API_URL || process.env.TUSFACTURAS_API_URL)?.trim() || "https://www.tusfacturas.app/app/api/v2";

  if (!apiKey || !apiToken || !userToken) {
    return null;
  }

  const puntoVenta = Number(puntoVentaRaw) || 1;

  return {
    apiKey,
    apiToken,
    userToken,
    puntoVenta: puntoVenta > 0 ? puntoVenta : 1,
    apiUrl: apiUrl.replace(/\/+$/, ""),
  };
}

export function isTusFacturasDevConfigured(): boolean {
  return getTusFacturasDevConfig() !== null;
}

export function buildDeterministicExternalReference(companyId: string, invoiceId: string): string {
  const cleanCompany = companyId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "DEV";
  const cleanInvoice = invoiceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return `OSSUM-${cleanCompany}-${cleanInvoice}`;
}

export function calculateFiscalSnapshotHash(payload: unknown): string {
  const serialized = stableJson(payload);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

const SENSITIVE_FISCAL_FIELD = /^(?:api_?key|api_?token|user_?token|authorization|webhook_?secret|secret|token)$/i;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sanitizeFiscalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeFiscalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nested]) => (SENSITIVE_FISCAL_FIELD.test(key) ? [] : [[key, sanitizeFiscalValue(nested)]])),
  );
}

export function sanitizeTusFacturasFiscalPayload(payload: object): Omit<TusFacturasNewInvoiceRequest, "apikey" | "apitoken" | "usertoken"> {
  return sanitizeFiscalValue(payload) as Omit<TusFacturasNewInvoiceRequest, "apikey" | "apitoken" | "usertoken">;
}

export function withTusFacturasDevCredentials(
  payload: Omit<TusFacturasNewInvoiceRequest, "apikey" | "apitoken" | "usertoken">,
  config: TusFacturasDevConfig,
): TusFacturasNewInvoiceRequest {
  return tusFacturasNewInvoiceRequestSchema.parse({
    ...payload,
    apikey: config.apiKey,
    apitoken: config.apiToken,
    usertoken: config.userToken,
  });
}

export function formatDateToAr(date: Date | string = new Date()): string {
  if (typeof date === "string") {
    const clean = date.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const [year, month, day] = clean.slice(0, 10).split("-");
      return `${day}/${month}/${year}`;
    }
  }
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function validateAndFormatIssueDate(issueDate?: string | Date | null): string {
  const now = new Date();
  if (issueDate === undefined || issueDate === null) {
    return formatDateToAr(now);
  }

  const d = typeof issueDate === "string" ? new Date(issueDate.includes("T") ? issueDate : `${issueDate}T00:00:00`) : issueDate;
  if (isNaN(d.getTime())) {
    throw new Error("Fecha de emisión inválida: debe tener un formato de fecha válido.");
  }

  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((nowDateOnly.getTime() - targetDateOnly.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    throw new Error("Fecha de emisión fuera de rango: la fecha de comprobante no puede ser futura.");
  }
  if (diffDays > 10) {
    throw new Error("Fecha de emisión fuera de rango: ARCA no admite comprobantes con fecha anterior a 10 días.");
  }

  return formatDateToAr(d);
}

export interface BuildPayloadInput {
  companyId: string;
  invoiceId: string;
  visibleNumber?: number | null;
  invoiceType?: string; // "FV", "A", "B", etc.
  issueDate?: string | Date | null;
  total: number;
  items: Array<{
    description: string;
    quantity: number | string | Prisma.Decimal;
    unitPrice: number | string | Prisma.Decimal;
    discount?: number | string | Prisma.Decimal;
    tax?: number | string | Prisma.Decimal;
    vatTreatment?: string | null;
    vatRate?: number | string | Prisma.Decimal | null;
    sku?: string | null;
  }>;
  client?: {
    id?: string | null;
    name?: string | null;
    legalName?: string | null;
    documentType?: string | null;
    documentNumber?: string | null;
    email?: string | null;
    address?: string | null;
    condicionIva?: string | null;
  } | null;
  config?: TusFacturasDevConfig;
}

export function mapInvoiceToTusFacturasRequest(input: BuildPayloadInput): TusFacturasNewInvoiceRequest {
  const config = input.config ?? getTusFacturasDevConfig();
  if (!config) {
    throw new Error("TusFacturas DEV config is missing");
  }

  const externalReference = buildDeterministicExternalReference(input.companyId, input.invoiceId);
  const docType = input.client?.documentType?.toUpperCase() === "DNI" ? "DNI" : input.client?.documentNumber ? "CUIT" : "DNI";
  const docNumber = input.client?.documentNumber?.replace(/\D/g, "") || (docType === "DNI" ? "11111111" : "30712293841");
  const razonSocial = input.client?.legalName?.trim() || input.client?.name?.trim() || "CONSUMIDOR FINAL (DEV)";

  // Mapeo tipo comprobante
  let tipoComprobante = "FACTURA B";
  const rawType = (input.invoiceType || "").toUpperCase();
  if (rawType.includes("A") || rawType === "FA") {
    tipoComprobante = "FACTURA A";
  } else if (rawType.includes("C") || rawType === "FC") {
    tipoComprobante = "FACTURA C";
  } else if (rawType.includes("B") || rawType === "FB") {
    tipoComprobante = "FACTURA B";
  }

  // Pre-flight fiscal matrix check
  const matrixCheck = validateFiscalMatrix({
    invoiceType: tipoComprobante,
    documentType: docType,
    documentNumber: docNumber,
    condicionIva: input.client?.condicionIva,
  });
  if (!matrixCheck.valid) {
    throw new Error(`Incompatibilidad fiscal: ${matrixCheck.error}`);
  }

  let computedTotal = 0;
  const rawItems =
    input.items.length > 0
      ? input.items
      : [
          {
            description: `Facturación quirúrgica DEV (${input.visibleNumber ? `FV-${input.visibleNumber}` : input.invoiceId})`,
            quantity: 1,
            unitPrice: Number(input.total) >= 0 ? Number(input.total) : 0,
            discount: 0,
            vatTreatment: "GRAVADO",
            vatRate: 21,
            sku: undefined,
          },
        ];

  const detalle = rawItems.map((item) => {
    const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
    const netUnit = Number(item.unitPrice) >= 0 ? Number(item.unitPrice) : 0;
    const disc = Number(item.discount) || 0;
    const alicuota = mapVatToTusFacturasAlicuota({
      vatTreatment: item.vatTreatment,
      vatRate: item.vatRate,
    });
    const itemSubtotal = qty * netUnit * (1 - disc / 100);
    const itemTax = (alicuota === -1 || alicuota === -2 || alicuota === 0)
      ? 0
      : itemSubtotal * (alicuota / 100);
    const itemTotal = itemSubtotal + itemTax;
    computedTotal += itemTotal;

    const unitPriceWithIva = (alicuota === -1 || alicuota === -2 || alicuota === 0)
      ? netUnit
      : Number((netUnit * (1 + alicuota / 100)).toFixed(2));

    return {
      cantidad: qty,
      afecta_stock: "N" as const,
      actualiza_precio: "N" as const,
      bonificacion_porcentaje: disc,
      producto: {
        descripcion: item.description.trim() || "Item quirúrgico",
        codigo: item.sku || undefined,
        alicuota,
        precio_unitario_sin_iva: netUnit,
        precio_unitario: unitPriceWithIva,
        unidad_bulto: 1,
        actualiza_precio: "N" as const,
        rg5329: "N" as const,
      },
    };
  });

  const finalTotal = Number(computedTotal.toFixed(2));

  const issueDateFormatted = validateAndFormatIssueDate(input.issueDate);
  const now = new Date();
  const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const payload: TusFacturasNewInvoiceRequest = {
    usertoken: config.userToken,
    apikey: config.apiKey,
    apitoken: config.apiToken,
    cliente: {
      codigo: input.client?.id?.slice(0, 20) || undefined,
      documento_tipo: docType,
      documento_nro: docNumber,
      razon_social: razonSocial,
      email: input.client?.email || "dev@ossum.example.com",
      domicilio: input.client?.address || "9 de Julio 1251",
      provincia: 2,
      condicion_iva: (input.client?.condicionIva as "RI" | "CF" | "MT" | "EX" | "RNI" | "CDEX" | "NR") || "CF",
      condicion_pago: "201",
      envia_por_mail: "N",
      reclama_deuda: "N",
      rg5329: "N",
    },
    comprobante: {
      punto_venta: config.puntoVenta,
      tipo: tipoComprobante,
      fecha: issueDateFormatted,
      vencimiento: formatDateToAr(dueDate),
      operacion: "V",
      moneda: "PES",
      cotizacion: 1,
      rubro: "Servicios Quirúrgicos",
      rubro_grupo_contable: "Servicios",
      total: finalTotal,
      external_reference: externalReference,
      detalle,
    },
  };

  return tusFacturasNewInvoiceRequestSchema.parse(payload);
}

export async function callTusFacturasNewInvoice(
  payload: TusFacturasNewInvoiceRequest,
  options: {
    apiUrl?: string;
    timeoutMs?: number;
    fetchFn?: typeof fetch;
  } = {},
): Promise<TusFacturasIssuanceResponse> {
  const apiUrl = options.apiUrl || process.env.TUSFACTURAS_API_URL?.trim() || "https://www.tusfacturas.app/app/api/v2";
  const endpoint = `${apiUrl.replace(/\/+$/, "")}/facturacion/nuevo`;
  const timeoutMs = options.timeoutMs ?? 15000;
  const customFetch = options.fetchFn ?? fetch;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await customFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: "S",
        errores: [`HTTP Error ${response.status}: ${errorText}`],
        error_cod: [response.status],
        error_details: [errorText],
        external_reference: payload.comprobante.external_reference,
      };
    }

    const data = await response.json();
    return tusFacturasIssuanceResponseSchema.parse(data);
  } catch (err: unknown) {
    const isAbort =
      (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError" || /abort/i.test(err.message))) ||
      (typeof err === "object" && err !== null && (err as { name?: string }).name === "AbortError");
    return {
      error: "S",
      errores: [isAbort ? `Timeout de red tras ${timeoutMs}ms al conectar con TusFacturas` : `Error de conexión: ${(err as Error).message}`],
      error_cod: [isAbort ? "TIMEOUT" : "NETWORK_ERROR"],
      error_details: [(err as Error).stack || String(err)],
      external_reference: payload.comprobante.external_reference,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractComprobanteRecord(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;

  // Check if root has comprobantes array
  if (Array.isArray(root.comprobantes) && root.comprobantes.length > 0) {
    const first = root.comprobantes[0];
    if (first && typeof first === "object") {
      const firstRec = first as Record<string, unknown>;
      if (firstRec.comprobante && typeof firstRec.comprobante === "object") {
        return firstRec.comprobante as Record<string, unknown>;
      }
      return firstRec;
    }
  }

  // Check if root is array
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (first && typeof first === "object") {
      const firstRec = first as Record<string, unknown>;
      if (firstRec.comprobante && typeof firstRec.comprobante === "object") {
        return firstRec.comprobante as Record<string, unknown>;
      }
      return firstRec;
    }
  }

  // Check if root.comprobante is an object
  if (root.comprobante && typeof root.comprobante === "object") {
    return root.comprobante as Record<string, unknown>;
  }

  return root;
}

export async function callTusFacturasReconcile(
  externalReference: string,
  config: TusFacturasDevConfig,
  options: {
    timeoutMs?: number;
    fetchFn?: typeof fetch;
  } = {},
): Promise<{
  found: boolean;
  rawResponse: unknown;
  comprobanteNro?: string | null;
  comprobanteTipo?: string | null;
  cae?: string | null;
  pdfUrl?: string | null;
  state: "AUTHORIZED" | "SIMULATED" | "REJECTED" | "UNKNOWN" | "PENDING";
  error?: string | null;
}> {
  const endpoint = `${config.apiUrl}/facturacion/consulta_avanzada`;
  const timeoutMs = options.timeoutMs ?? 15000;
  const customFetch = options.fetchFn ?? fetch;

  const requestBody = tusFacturasReconcileRequestSchema.parse({
    usertoken: config.userToken,
    apikey: config.apiKey,
    apitoken: config.apiToken,
    busqueda_tipo: "EXT_REF",
    pagina: 0,
    limite: 10,
    comprobante: {
      external_reference: externalReference,
      operacion: "V",
    },
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await customFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        found: false,
        rawResponse: await response.text(),
        state: "UNKNOWN",
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    if (!data || typeof data !== "object") {
      return { found: false, rawResponse: data, state: "UNKNOWN" };
    }

    const root = data as Record<string, unknown>;
    const rec = extractComprobanteRecord(data);
    if (!rec) {
      return { found: false, rawResponse: data, state: "UNKNOWN" };
    }

    const comprobanteNro = (rec.comprobante_nro || rec.numero || root.comprobante_nro)?.toString().trim();
    const comprobanteTipo = (rec.comprobante_tipo || rec.tipo || root.comprobante_tipo)?.toString().trim();
    const cae = (rec.cae || root.cae)?.toString().trim();
    const pdfUrl = (rec.comprobante_pdf_url || rec.pdf_url || root.comprobante_pdf_url)?.toString().trim();

    let state: "AUTHORIZED" | "SIMULATED" | "REJECTED" | "UNKNOWN" = "UNKNOWN";
    if (rec.error === "S" || root.error === "S") {
      state = "REJECTED";
    } else if (cae && cae.length > 0) {
      state = "AUTHORIZED";
    } else if (comprobanteNro && pdfUrl) {
      state = "SIMULATED";
    }

    const hasAnyContent = Boolean(cae || comprobanteNro || pdfUrl || rec.error === "S" || root.error === "S");

    return {
      found: hasAnyContent,
      rawResponse: data,
      comprobanteNro: comprobanteNro || null,
      comprobanteTipo: comprobanteTipo || null,
      cae: cae || null,
      pdfUrl: pdfUrl || null,
      state,
    };
  } catch (err: unknown) {
    return {
      found: false,
      rawResponse: null,
      state: "UNKNOWN",
      error: (err as Error).message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export interface BuildAdjustmentPayloadInput {
  companyId: string;
  adjustmentId: string;
  visibleNumber?: number | null;
  type: "CREDITO" | "DEBITO";
  originType: "INTERNAL_INVOICE" | "EXTERNAL_INVOICE" | "PERIOD";
  letter?: "A" | "B" | "C" | "E" | null;
  issueDate?: string | Date | null;
  total: number;
  items: Array<{
    description: string;
    quantity: number | string | Prisma.Decimal;
    unitPrice: number | string | Prisma.Decimal;
    discount?: number | string | Prisma.Decimal;
    vatRate?: number | string | Prisma.Decimal | null;
    vatTreatment?: string | null;
    sku?: string | null;
  }>;
  client?: {
    id?: string | null;
    name?: string | null;
    legalName?: string | null;
    documentType?: string | null;
    documentNumber?: string | null;
    email?: string | null;
    address?: string | null;
    condicionIva?: string | null;
  } | null;
  // Origen Interno
  internalInvoice?: {
    id: string;
    visibleNumber?: number | null;
    invoiceType?: string | null;
    issuedAt?: Date | string | null;
    currency?: string | null;
  } | null;
  // Origen Externo
  externalInvoice?: {
    docType: string;
    ptoVta: number;
    number: number;
    issueDate: Date | string;
    issuerCuit?: string | null;
    cae?: string | null;
  } | null;
  // Origen Período
  period?: {
    from: Date | string;
    to: Date | string;
  } | null;
  companyCuit?: number | string | null;
  config?: TusFacturasDevConfig;
}

export function mapAdjustmentDocumentToTusFacturasRequest(input: BuildAdjustmentPayloadInput): TusFacturasNewInvoiceRequest {
  const config = input.config ?? getTusFacturasDevConfig();
  if (!config) {
    throw new Error("TusFacturas DEV config is missing");
  }

  const prefix = input.type === "CREDITO" ? "NOTA DE CREDITO" : "NOTA DE DEBITO";
  let letter = input.letter || "B";
  if (input.client?.condicionIva === "RI" || input.client?.documentType?.toUpperCase() === "CUIT") {
    letter = input.letter || "A";
  }

  // Invariante E: Prohibido notas E por período
  if (letter === "E" && input.originType === "PERIOD") {
    throw new Error("Incompatibilidad fiscal: ARCA prohíbe la emisión de Notas de Crédito/Débito tipo E por período.");
  }

  const tipoComprobante = `${prefix} ${letter}`.trim();
  const externalReference = `OSSUM-ADJ-${input.companyId.slice(0, 6).toUpperCase()}-${input.adjustmentId.slice(0, 14)}`;

  const docType = input.client?.documentType?.toUpperCase() === "DNI" ? "DNI" : input.client?.documentNumber ? "CUIT" : "DNI";
  const docNumber = input.client?.documentNumber?.replace(/\D/g, "") || (docType === "DNI" ? "11111111" : "30712293841");
  const razonSocial = input.client?.legalName?.trim() || input.client?.name?.trim() || "CONSUMIDOR FINAL (DEV)";

  // Validar comprobantes asociados
  const comprobantesAsociados: TusFacturasNewInvoiceRequest["comprobante"]["comprobantes_asociados"] = [];
  let comprobantesPeriodo: TusFacturasNewInvoiceRequest["comprobante"]["comprobantes_asociados_periodo"] | undefined;

  const defaultIssuerCuit = Number(String(input.companyCuit || "30712293841").replace(/\D/g, "")) || 30712293841;

  if (input.originType === "INTERNAL_INVOICE" && input.internalInvoice) {
    const rawInvType = (input.internalInvoice.invoiceType || "FACTURA B").toUpperCase();
    const invTipo = rawInvType.startsWith("FACTURA") ? rawInvType : `FACTURA ${rawInvType.slice(-1) || "B"}`;
    const invDate = input.internalInvoice.issuedAt ? new Date(input.internalInvoice.issuedAt) : new Date();

    comprobantesAsociados.push({
      tipo_comprobante: invTipo,
      punto_venta: config.puntoVenta,
      numero: input.internalInvoice.visibleNumber || 1,
      comprobante_fecha: formatDateToAr(invDate),
      cuit: defaultIssuerCuit,
    });
  } else if (input.originType === "EXTERNAL_INVOICE" && input.externalInvoice) {
    const extCuit = input.externalInvoice.issuerCuit
      ? Number(input.externalInvoice.issuerCuit.replace(/\D/g, "")) || defaultIssuerCuit
      : defaultIssuerCuit;

    comprobantesAsociados.push({
      tipo_comprobante: input.externalInvoice.docType,
      punto_venta: input.externalInvoice.ptoVta,
      numero: input.externalInvoice.number,
      comprobante_fecha: formatDateToAr(input.externalInvoice.issueDate),
      cuit: extCuit,
    });
  } else if (input.originType === "PERIOD" && input.period) {
    comprobantesPeriodo = {
      fecha_desde: formatDateToAr(input.period.from),
      fecha_hasta: formatDateToAr(input.period.to),
    };
  }

  let computedTotal = 0;
  const rawItems =
    input.items.length > 0
      ? input.items
      : [
          {
            description: `Ajuste comercial DEV (${tipoComprobante} #${input.visibleNumber || input.adjustmentId})`,
            quantity: 1,
            unitPrice: Number(input.total) >= 0 ? Number(input.total) : 0,
            discount: 0,
            vatTreatment: "GRAVADO",
            vatRate: 21,
            sku: undefined,
          },
        ];

  const detalle = rawItems.map((item) => {
    const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
    const netUnit = Number(item.unitPrice) >= 0 ? Number(item.unitPrice) : 0;
    const disc = Number(item.discount) || 0;
    const alicuota = mapVatToTusFacturasAlicuota({
      vatTreatment: item.vatTreatment,
      vatRate: item.vatRate,
    });
    const itemSubtotal = qty * netUnit * (1 - disc / 100);
    const itemTax = (alicuota === -1 || alicuota === -2 || alicuota === 0)
      ? 0
      : itemSubtotal * (alicuota / 100);
    const itemTotal = itemSubtotal + itemTax;
    computedTotal += itemTotal;

    const unitPriceWithIva = (alicuota === -1 || alicuota === -2 || alicuota === 0)
      ? netUnit
      : Number((netUnit * (1 + alicuota / 100)).toFixed(2));

    return {
      cantidad: qty,
      afecta_stock: "N" as const,
      actualiza_precio: "N" as const,
      bonificacion_porcentaje: disc,
      producto: {
        descripcion: item.description.trim() || "Concepto de ajuste",
        codigo: item.sku || undefined,
        alicuota,
        precio_unitario_sin_iva: netUnit,
        precio_unitario: unitPriceWithIva,
        unidad_bulto: 1,
        actualiza_precio: "N" as const,
        rg5329: "N" as const,
      },
    };
  });

  const finalTotal = Number(computedTotal.toFixed(2));
  const issueDateFormatted = validateAndFormatIssueDate(input.issueDate);

  const payload: TusFacturasNewInvoiceRequest = {
    usertoken: config.userToken,
    apikey: config.apiKey,
    apitoken: config.apiToken,
    cliente: {
      codigo: input.client?.id?.slice(0, 20) || undefined,
      documento_tipo: docType,
      documento_nro: docNumber,
      razon_social: razonSocial,
      email: input.client?.email || "dev@ossum.example.com",
      domicilio: input.client?.address || "9 de Julio 1251",
      provincia: 2,
      condicion_iva: (input.client?.condicionIva as "RI" | "CF" | "MT" | "EX" | "RNI" | "CDEX" | "NR") || "CF",
      condicion_pago: "201",
      envia_por_mail: "N",
      reclama_deuda: "N",
      rg5329: "N",
    },
    comprobante: {
      punto_venta: config.puntoVenta,
      tipo: tipoComprobante,
      fecha: issueDateFormatted,
      vencimiento: formatDateToAr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      operacion: "V",
      moneda: "PES",
      cotizacion: 1,
      rubro: "Ajustes Comerciales",
      rubro_grupo_contable: "Servicios",
      total: finalTotal,
      external_reference: externalReference,
      detalle,
      comprobantes_asociados: comprobantesAsociados.length > 0 ? comprobantesAsociados : undefined,
      comprobantes_asociados_periodo: comprobantesPeriodo,
    },
  };

  return tusFacturasNewInvoiceRequestSchema.parse(payload);
}
