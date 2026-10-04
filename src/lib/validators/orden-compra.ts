import { z } from "zod";
import { ORDEN_COMPRA_STATES, normalizeOrdenCompraReceipt } from "../services/orden-compra.service";
export { ORDEN_COMPRA_STATES };
const decimal = z.union([z.number(), z.string()]).transform(String);
const item = z.object({ stockItemId: z.string().trim().min(1), name: z.string().trim().min(1), code: z.string().trim().min(1), quantity: decimal.refine((v) => Number(v) > 0), unitPrice: decimal.refine((v) => Number(v) >= 0), isArticuloZ: z.boolean().optional(), descripcionLibre: z.string().trim().optional() });
export const ordenCompraCreateSchema = z.object({ proveedorId: z.string().trim().min(1), proveedorName: z.string().trim().min(1), items: z.array(item).min(1), observaciones: z.string().trim().nullable().optional(), necesidadCompraIds: z.array(z.string().trim().min(1)).optional() });
export const ordenCompraUpdateSchema = z.object({ items: z.array(item).min(1).optional(), observaciones: z.string().trim().nullable().optional(), necesidadCompraIds: z.array(z.string().trim().min(1)).optional() }).strict();
const allocation = z.object({ quantity: z.union([z.number(), z.string()]), lotCode: z.string().optional(), serialNumber: z.string().optional(), expirationDate: z.string().optional() }).strict();
export const ordenCompraReceiveSchema = z.object({ location: z.string().trim().min(1), operationKey: z.string().trim().min(1), receivedByItem: z.array(z.object({ itemId: z.string().trim().min(1), received: z.union([z.number(), z.string()]), allocations: z.array(allocation).max(1000).optional() }).strict()).min(1).max(1000) }).strict().superRefine((input, ctx) => {
  try { normalizeOrdenCompraReceipt(input); } catch { ctx.addIssue({ code: "custom", message: "Invalid receipt quantities, trace allocations or duplicate item IDs" }); }
});
export const ordenCompraCancelSchema = z.object({ motivo: z.string().trim().min(1).optional() }).strict();
export const ordenCompraListQuerySchema = z.object({ state: z.enum(ORDEN_COMPRA_STATES).optional(), proveedorId: z.string().trim().optional(), take: z.coerce.number().int().nonnegative().optional(), skip: z.coerce.number().int().nonnegative().optional() }).partial();
