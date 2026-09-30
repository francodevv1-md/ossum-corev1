import { z } from "zod";

export const necesidadCompraOriginEnum = z.enum([
  "stock_bajo",
  "faltante_preparacion",
  "consumo",
  "diferencia_comparativa",
  "manual",
]);

export const necesidadCompraPriorityEnum = z.enum([
  "baja",
  "media",
  "alta",
  "critica",
]);

export const necesidadCompraStateEnum = z.enum([
  "Pendiente",
  "En_OC",
  "Enviada",
  "Recibida",
  "Cancelada",
]);

export const createNecesidadCompraSchema = z.object({
  articleId: z.string().nullish(),
  isArticuloZ: z.boolean().default(false),
  descripcionLibre: z.string().trim().nullish(),
  code: z.string().trim().nullish(),
  name: z.string().trim().min(1, "El nombre o descripción del artículo es obligatorio"),
  quantity: z.union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)]),
  priority: necesidadCompraPriorityEnum.default("media"),
  origin: necesidadCompraOriginEnum.default("manual"),
  originReference: z.string().trim().nullish(),
  suggestedSupplierId: z.string().trim().nullish(),
  suggestedSupplierName: z.string().trim().nullish(),
  surgeryId: z.string().trim().nullish(),
  observaciones: z.string().trim().nullish(),
  idempotencyKey: z.string().trim().nullish(),
});

export const updateNecesidadCompraSchema = z.object({
  articleId: z.string().nullish(),
  isArticuloZ: z.boolean().optional(),
  descripcionLibre: z.string().trim().nullish(),
  code: z.string().trim().nullish(),
  name: z.string().trim().min(1).optional(),
  quantity: z.union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)]).optional(),
  priority: necesidadCompraPriorityEnum.optional(),
  suggestedSupplierId: z.string().trim().nullish(),
  suggestedSupplierName: z.string().trim().nullish(),
  surgeryId: z.string().trim().nullish(),
  observaciones: z.string().trim().nullish(),
});

export const convertNecesidadesToOcSchema = z.object({
  necesidadIds: z.array(z.string().min(1)).min(1, "Debe seleccionar al menos una necesidad de compra"),
  proveedorId: z.string().min(1, "El proveedor es obligatorio para emitir la orden de compra"),
  proveedorName: z.string().min(1, "El nombre del proveedor es obligatorio"),
  observaciones: z.string().trim().nullish(),
});

export const listNecesidadesQuerySchema = z.object({
  state: necesidadCompraStateEnum.optional(),
  origin: necesidadCompraOriginEnum.optional(),
  surgeryId: z.string().optional(),
  suggestedSupplierId: z.string().optional(),
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});
