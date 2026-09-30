import { z } from "zod";

export const ordenPagoImputacionInputSchema = z.object({
  facturaCompraId: z.string().min(1, "El ID de la factura de compra es obligatorio"),
  amount: z.union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)]),
});

export const createOrdenPagoSchema = z.object({
  proveedorId: z.string().min(1, "El proveedor es obligatorio"),
  proveedorName: z.string().min(1, "El nombre del proveedor es obligatorio"),
  total: z.union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)]),
  method: z.string().default("transfer"),
  paymentDate: z.string().or(z.date()).optional(),
  observaciones: z.string().trim().nullish(),
  imputaciones: z.array(ordenPagoImputacionInputSchema).default([]),
});

export const cancelOrdenPagoSchema = z.object({
  motivo: z.string().trim().nullish(),
});

export const listOrdenesPagoQuerySchema = z.object({
  state: z.enum(["Emitida", "Anulada"]).optional(),
  proveedorId: z.string().optional(),
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});
