import { z } from "zod";

export const ADJUSTMENT_TYPES = ["CREDITO", "DEBITO"] as const;
export type AdjustmentTypeEnum = (typeof ADJUSTMENT_TYPES)[number];

export const ADJUSTMENT_ORIGIN_TYPES = ["INTERNAL_INVOICE", "EXTERNAL_INVOICE", "PERIOD"] as const;
export type AdjustmentOriginTypeEnum = (typeof ADJUSTMENT_ORIGIN_TYPES)[number];

export const ADJUSTMENT_MODALITIES = ["TOTAL", "PARCIAL", "MANUAL"] as const;
export type AdjustmentModalityEnum = (typeof ADJUSTMENT_MODALITIES)[number];

export const ADJUSTMENT_STATES = ["Borrador", "Emitida", "Anulada"] as const;
export type AdjustmentStateEnum = (typeof ADJUSTMENT_STATES)[number];

export const adjustmentDocumentItemInputSchema = z.object({
  description: z.string().min(1, "La descripción del concepto es obligatoria"),
  quantity: z.number().positive("La cantidad debe ser mayor a 0").default(1),
  unitPrice: z.number().nonnegative("El precio unitario no puede ser negativo").default(0),
  discount: z.number().nonnegative().default(0),
  vatRate: z.number().default(21),
  vatTreatment: z.string().default("GRAVADO"),
  originalQuantity: z.number().positive().optional(),
  sourceItemId: z.string().optional(),
});

export const createAdjustmentDocumentSchema = z
  .object({
    type: z.enum(ADJUSTMENT_TYPES),
    originType: z.enum(ADJUSTMENT_ORIGIN_TYPES).default("INTERNAL_INVOICE"),

    // Origen 1: Factura Interna OSSUM
    internalInvoiceId: z.string().optional().nullable(),

    // Origen 2: Comprobante Externo Previo
    externalDocType: z.string().optional().nullable(),
    externalPtoVta: z.number().int().positive().max(99999).optional().nullable(),
    externalNumber: z.number().int().positive().max(99999999).optional().nullable(),
    externalIssueDate: z.string().optional().nullable(),
    externalIssuerCuit: z.string().optional().nullable(),
    externalCae: z.string().optional().nullable(),

    // Origen 3: Período
    periodFrom: z.string().optional().nullable(),
    periodTo: z.string().optional().nullable(),

    // Contexto opcional
    surgeryId: z.string().optional().nullable(),
    clientName: z.string().optional().nullable(),
    clientDocumentType: z.string().optional().nullable(),
    clientDocumentNumber: z.string().optional().nullable(),
    clientVatCondition: z.string().optional().nullable(),

    modalidad: z.enum(ADJUSTMENT_MODALITIES).default("TOTAL"),
    motivo: z.string().min(1, "El motivo del ajuste es obligatorio"),
    observaciones: z.string().optional().nullable(),

    currency: z.string().default("ARS"),
    items: z.array(adjustmentDocumentItemInputSchema).min(1, "Debe incluir al menos un concepto a ajustar"),
  })
  .superRefine((data, ctx) => {
    // Invariante Origen Interno
    if (data.originType === "INTERNAL_INVOICE") {
      if (!data.internalInvoiceId || data.internalInvoiceId.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debe seleccionar una factura origen emitida",
          path: ["internalInvoiceId"],
        });
      }
    }

    // Invariante Origen Externo
    if (data.originType === "EXTERNAL_INVOICE") {
      if (!data.externalDocType || data.externalDocType.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El tipo de comprobante externo es obligatorio",
          path: ["externalDocType"],
        });
      }
      if (!data.externalPtoVta) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El punto de venta del comprobante externo es obligatorio",
          path: ["externalPtoVta"],
        });
      }
      if (!data.externalNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El número del comprobante externo es obligatorio",
          path: ["externalNumber"],
        });
      }
      if (!data.externalIssueDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La fecha de emisión del comprobante externo es obligatoria",
          path: ["externalIssueDate"],
        });
      }
    }

    // Invariante Origen Período
    if (data.originType === "PERIOD") {
      if (!data.periodFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La fecha desde es obligatoria para ajuste por período",
          path: ["periodFrom"],
        });
      }
      if (!data.periodTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La fecha hasta es obligatoria para ajuste por período",
          path: ["periodTo"],
        });
      }
      if (data.periodFrom && data.periodTo && data.periodFrom > data.periodTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La fecha desde no puede ser posterior a la fecha hasta",
          path: ["periodFrom"],
        });
      }
    }
  });

export type CreateAdjustmentDocumentInput = z.infer<typeof createAdjustmentDocumentSchema>;

export const adjustmentDocumentFilterSchema = z.object({
  type: z.enum(ADJUSTMENT_TYPES).optional(),
  state: z.enum(ADJUSTMENT_STATES).optional(),
  originType: z.enum(ADJUSTMENT_ORIGIN_TYPES).optional(),
  search: z.string().optional(),
  issuedFrom: z.string().optional(),
  issuedTo: z.string().optional(),
  internalInvoiceId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type AdjustmentDocumentFilterInput = z.infer<typeof adjustmentDocumentFilterSchema>;
