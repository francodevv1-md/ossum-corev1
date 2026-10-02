import { z } from "zod";

const nullableText = z.string().trim().min(1).max(120).nullable().optional();

export const stockPhysicalUnitCreateSchema = z.object({
  articleId: z.string().trim().min(1),
  unitCode: z.string().trim().min(1).max(120),
  serialNumber: nullableText,
  location: nullableText,
});

export const stockPhysicalUnitUpdateSchema = z.object({
  location: nullableText,
  status: z.enum(["ACTIVE", "RETIRED"]).optional(),
}).refine((value) => value.location !== undefined || value.status !== undefined, {
  message: "Debe indicar una actualización para la Caja identificada",
});

export type StockPhysicalUnitCreateInput = z.infer<typeof stockPhysicalUnitCreateSchema>;
export type StockPhysicalUnitUpdateInput = z.infer<typeof stockPhysicalUnitUpdateSchema>;
