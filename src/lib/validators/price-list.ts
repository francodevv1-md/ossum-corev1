import { z } from "zod";

export const priceListCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "El código de lista es obligatorio")
    .max(50, "El código no puede exceder 50 caracteres")
    .transform((v) => v.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(1, "El nombre de la lista es obligatorio")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  description: z.string().trim().max(500).nullable().optional(),
  currency: z.literal("ARS").default("ARS"),
});

export type PriceListCreateInput = z.infer<typeof priceListCreateSchema>;

export const priceListUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type PriceListUpdateInput = z.infer<typeof priceListUpdateSchema>;

export const articlePriceVersionCreateSchema = z.object({
  priceListId: z.string().trim().min(1, "El ID de lista de precios es obligatorio"),
  price: z.number().min(0, "El precio no puede ser negativo"),
  currency: z.literal("ARS").default("ARS"),
  effectiveAt: z
    .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.date()])
    .optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type ArticlePriceVersionCreateInput = z.infer<typeof articlePriceVersionCreateSchema>;

export const priceLookupQuerySchema = z.object({
  priceListId: z.string().trim().optional(),
  at: z.string().optional(),
});

export type PriceLookupQuery = z.infer<typeof priceLookupQuerySchema>;
