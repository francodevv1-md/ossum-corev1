import { z } from "zod";
import { badRequest } from "../api/errors";
import { normalizeRemitoLocator } from "../remito-identifiers";

export const remitoScanRequestSchema = z.object({
  locator: z.string(),
  selectedCompanyId: z.string().trim().min(1).optional(),
}).strict();

export function normalizeRemitoScanLocator(input: unknown): string {
  const parsed = remitoScanRequestSchema.safeParse(input);
  const locator = parsed.success ? normalizeRemitoLocator(parsed.data.locator) : null;
  if (!locator) throw badRequest("Invalid Remito code", "invalid_remito_locator");
  return locator;
}
