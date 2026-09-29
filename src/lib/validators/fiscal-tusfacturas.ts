import { z } from "zod";

export const tusFacturasProductoSchema = z.object({
  descripcion: z.string().min(1, "La descripción del producto es obligatoria"),
  codigo: z.union([z.string(), z.number()]).optional(),
  alicuota: z.number().default(21),
  precio_unitario_sin_iva: z.number().nonnegative().optional(),
  precio_unitario: z.number().nonnegative().optional(),
  unidad_bulto: z.number().default(1),
  actualiza_precio: z.enum(["S", "N"]).default("N"),
  rg5329: z.enum(["S", "N"]).default("N"),
});

export const tusFacturasItemSchema = z.object({
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  afecta_stock: z.enum(["S", "N"]).default("N"),
  actualiza_precio: z.enum(["S", "N"]).default("N"),
  bonificacion_porcentaje: z.number().nonnegative().default(0),
  producto: tusFacturasProductoSchema,
});

export const tusFacturasClienteSchema = z.object({
  codigo: z.string().max(20).optional(),
  documento_tipo: z.enum(["CUIT", "CUIL", "CDI", "DNI", "PASAPORTE", "CI", "OTRO"]).default("CUIT"),
  documento_nro: z.string().min(1, "El número de documento es obligatorio"),
  razon_social: z.string().min(1, "La razón social o nombre es obligatoria"),
  email: z.string().email().optional().or(z.literal("")),
  domicilio: z.string().optional().default(""),
  provincia: z.union([z.number(), z.string()]).default(2), // 2 = CABA / BsAs
  condicion_iva: z.enum(["RI", "RNI", "EX", "CF", "MT", "CDEX", "NR"]).default("CF"),
  condicion_pago: z.string().optional().default("201"), // 201 = Contado / Cuenta Corriente
  envia_por_mail: z.enum(["S", "N"]).default("N"),
  reclama_deuda: z.enum(["S", "N"]).default("N"),
  rg5329: z.enum(["S", "N"]).default("N"),
});

export const tusFacturasComprobanteAsociadoSchema = z.object({
  tipo_comprobante: z.string().min(1, "tipo_comprobante es obligatorio"),
  punto_venta: z.number().int().positive().max(99999),
  numero: z.number().int().positive().max(99999999),
  comprobante_fecha: z.string().min(8), // DD/MM/YYYY
  cuit: z.number().int().positive(),
});

export const tusFacturasComprobanteAsociadoPeriodoSchema = z.object({
  fecha_desde: z.string().min(8), // DD/MM/YYYY
  fecha_hasta: z.string().min(8), // DD/MM/YYYY
});

export const tusFacturasComprobanteSchema = z.object({
  punto_venta: z.number().int().positive().default(1),
  tipo: z.string().min(1).default("FACTURA B"),
  numero: z.number().int().optional(),
  fecha: z.string().min(8), // DD/MM/YYYY
  vencimiento: z.string().optional(),
  operacion: z.enum(["V", "C"]).default("V"), // V = Venta
  moneda: z.string().default("PES"),
  cotizacion: z.number().positive().default(1),
  rubro: z.string().optional().default("Servicios Quirúrgicos"),
  rubro_grupo_contable: z.string().optional().default("Servicios"),
  total: z.number().nonnegative(),
  observaciones: z.string().optional(),
  external_reference: z.string().min(1, "external_reference es obligatoria para trazabilidad e idempotencia"),
  detalle: z.array(tusFacturasItemSchema).min(1, "Debe incluir al menos un ítem"),
  comprobantes_asociados: z.array(tusFacturasComprobanteAsociadoSchema).max(10, "Máximo 10 comprobantes asociados permitidos").optional(),
  comprobantes_asociados_periodo: tusFacturasComprobanteAsociadoPeriodoSchema.optional(),
});

export const tusFacturasNewInvoiceRequestSchema = z.object({
  usertoken: z.string().min(1, "usertoken es requerido"),
  apikey: z.union([z.string(), z.number()]).refine((val) => Boolean(String(val).trim()), "apikey es requerida"),
  apitoken: z.string().min(1, "apitoken es requerido"),
  cliente: tusFacturasClienteSchema,
  comprobante: tusFacturasComprobanteSchema,
});

export type TusFacturasNewInvoiceRequest = z.infer<typeof tusFacturasNewInvoiceRequestSchema>;

const trimStringPreprocess = (val: unknown) => (typeof val === "string" ? val.trim() : val);

export const tusFacturasIssuanceResponseSchema = z.object({
  error: z.enum(["S", "N", "s", "n"]).transform((val) => val.toUpperCase() as "S" | "N"),
  errores: z
    .array(z.union([z.string(), z.record(z.string(), z.unknown()), z.any()]))
    .optional()
    .default([])
    .transform((arr) => arr.map((item) => (typeof item === "string" ? item : JSON.stringify(item)))),
  error_cod: z.array(z.union([z.string(), z.number()])).optional().default([]),
  error_details: z
    .array(z.union([z.string(), z.record(z.string(), z.unknown()), z.any()]))
    .optional()
    .default([])
    .transform((arr) => arr.map((item) => (typeof item === "string" ? item : JSON.stringify(item)))),
  external_reference: z.string().optional(),
  requiere_fec: z.string().optional(),
  observaciones: z.string().optional(),
  rta: z.string().optional(),
  cae: z.preprocess(trimStringPreprocess, z.string().optional().nullable()),
  vencimiento_cae: z.string().optional().nullable(),
  vencimiento_pago: z.string().optional().nullable(),
  comprobante_nro: z.preprocess(trimStringPreprocess, z.string().optional().nullable()),
  comprobante_tipo: z.string().optional().nullable(),
  afip_codigo_barras: z.string().optional().nullable(),
  afip_qr: z.preprocess(trimStringPreprocess, z.string().optional().nullable()),
  comprobante_pdf_url: z.string().optional().nullable(),
  micrositios: z
    .object({
      descarga: z.string().optional(),
      cliente: z.string().optional(),
    })
    .optional()
    .nullable(),
  envio_x_mail: z.string().optional(),
});

export type TusFacturasIssuanceResponse = z.infer<typeof tusFacturasIssuanceResponseSchema>;

export const tusFacturasReconcileRequestSchema = z.object({
  usertoken: z.string().min(1),
  apikey: z.union([z.string(), z.number()]),
  apitoken: z.string().min(1),
  busqueda_tipo: z.literal("EXT_REF").default("EXT_REF"),
  pagina: z.number().int().default(0),
  limite: z.number().int().default(10),
  comprobante: z.object({
    external_reference: z.string().min(1),
    operacion: z.literal("V").default("V"),
  }),
});

export type TusFacturasReconcileRequest = z.infer<typeof tusFacturasReconcileRequestSchema>;

export const tusFacturasWebhookPayloadSchema = z.object({
  hook_id: z.string().min(1).optional(),
  evento: z.enum(["encolado", "emitido", "error", "test", "eliminado", "cambio_fecha"]).or(z.string()),
  external_reference: z.string().optional().nullable(),
  comprobante_nro: z.preprocess(trimStringPreprocess, z.string().optional().nullable()),
  comprobante_tipo: z.string().optional().nullable(),
  cae: z.preprocess(trimStringPreprocess, z.string().optional().nullable()),
  vencimiento_cae: z.string().optional().nullable(),
  comprobante_pdf_url: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  mensaje: z.string().optional().nullable(),
  datos: z.record(z.string(), z.unknown()).optional(),
});

export type TusFacturasWebhookPayload = z.infer<typeof tusFacturasWebhookPayloadSchema>;

/**
 * Validates fiscal compatibility between invoice type, recipient document, and VAT condition
 * before dispatching to TusFacturas / ARCA.
 */
export function validateFiscalMatrix(input: {
  invoiceType: string;
  documentType: string;
  documentNumber: string;
  condicionIva?: string | null;
}): { valid: boolean; error?: string } {
  const invType = input.invoiceType.toUpperCase();
  const docType = input.documentType.toUpperCase();
  const cleanDocNumber = input.documentNumber.replace(/\D/g, "");
  const iva = input.condicionIva?.toUpperCase();

  // Factura A rules
  if (invType.includes("FACTURA A") || invType === "FA" || invType.endsWith(" A")) {
    if (docType !== "CUIT") {
      return { valid: false, error: "Para emitir comprobantes clase 'A' el tipo de documento debe ser CUIT." };
    }
    if (cleanDocNumber.length !== 11) {
      return { valid: false, error: "El CUIT debe contener exactamente 11 dígitos numéricos para comprobantes clase 'A'." };
    }
    if (!iva) {
      return { valid: false, error: "Para Factura A debe informarse la condición de IVA del receptor (Responsable Inscripto o Monotributo)." };
    }
    if (iva !== "RI" && iva !== "MT") {
      return { valid: false, error: "Para emitir comprobantes clase 'A' el receptor debe ser Responsable Inscripto (RI) o Monotributo (MT)." };
    }
  }

  // Factura B rules
  if (invType.includes("FACTURA B") || invType === "FB" || invType.endsWith(" B")) {
    if (docType === "DNI" && (cleanDocNumber.length < 7 || cleanDocNumber.length > 8)) {
      return { valid: false, error: "El DNI debe contener 7 u 8 dígitos para comprobantes clase 'B'." };
    }
    if (iva === "RI") {
      return { valid: false, error: "Para receptores Responsables Inscriptos debe emitirse Factura A, no Factura B." };
    }
  }

  return { valid: true };
}
