import { z } from "zod";

export const cajasFormulaLineInputSchema = z.object({
  articleId: z.string().trim().min(1, "El ID del artículo componente es obligatorio"),
  expectedQuantity: z
    .number()
    .positive("La cantidad esperada debe ser mayor a 0"),
  unit: z.string().trim().min(1).default("u"),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type CajasFormulaLineInput = z.input<typeof cajasFormulaLineInputSchema>;

export const cajasFormulaCreateSchema = z.object({
  articleId: z.string().trim().min(1, "El ID del artículo compuesto (caja) es obligatorio"),
  lines: z
    .array(cajasFormulaLineInputSchema)
    .min(1, "La composición debe tener al menos un artículo componente"),
  cause: z.string().trim().max(500).nullable().optional(),
});

export type CajasFormulaCreateInput = z.input<typeof cajasFormulaCreateSchema>;

export const cajasFormulaVersionPublishSchema = z.object({
  lines: z
    .array(cajasFormulaLineInputSchema)
    .min(1, "La nueva versión debe tener al least un artículo componente"),
  cause: z.string().trim().max(500).nullable().optional(),
});

export type CajasFormulaVersionPublishInput = z.input<typeof cajasFormulaVersionPublishSchema>;
