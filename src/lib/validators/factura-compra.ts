import { z } from "zod";
import { FACTURA_COMPRA_STATES, type FacturaCompraState } from "../services/factura-compra.service";
export { FACTURA_COMPRA_STATES };
export const FACTURA_COMPRA_TRANSITIONS: Record<FacturaCompraState, FacturaCompraState[]> = { Pendiente: ["Pagada", "Anulada"], Pagada: [], Anulada: [] };
const decimal = z.union([z.number(), z.string()]).transform(String);
const item = z.object({ stockItemId: z.string().trim().min(1), name: z.string().trim().min(1), code: z.string().trim().min(1), quantity: decimal.refine((v) => Number(v) > 0), unitPrice: decimal.refine((v) => Number(v) >= 0), descripcionLibre: z.string().trim().optional() });
export const facturaCompraCreateSchema = z.object({ proveedorId: z.string().trim().min(1), proveedorName: z.string().trim().min(1), number: z.string().trim().min(1), date: z.string().trim().min(1), items: z.array(item).min(1), ordenCompraId: z.string().trim().optional(), observaciones: z.string().trim().nullable().optional() });
export const facturaCompraUpdateSchema = z.object({ number: z.string().trim().min(1).optional(), date: z.string().trim().min(1).optional(), items: z.array(item).min(1).optional(), ordenCompraId: z.string().trim().nullable().optional(), observaciones: z.string().trim().nullable().optional() }).strict();
export const facturaCompraListQuerySchema = z.object({ state: z.enum(FACTURA_COMPRA_STATES).optional(), proveedorId: z.string().trim().optional(), ordenCompraId: z.string().trim().optional(), take: z.coerce.number().int().nonnegative().optional(), skip: z.coerce.number().int().nonnegative().optional() }).partial();
