import { z } from "zod";

export const FISCAL_DEV_ONLY_ENVIRONMENT = "DEV_ONLY" as const;

const fiscalPartySchema = z.object({
  taxId: z.string().trim().min(1),
  documentType: z.enum(["CUIT", "DNI", "PASAPORTE", "OTRO", "LE", "LC"]).optional(),
  legalName: z.string().trim().min(1),
  vatCondition: z.string().trim().min(1),
}).strict();

export const fiscalDevOnlyPolicySchema = z.object({
  environment: z.literal(FISCAL_DEV_ONLY_ENVIRONMENT),
  version: z.literal("fiscal-dev-only-v1"),
  documentType: z.string().trim().min(1),
  pointOfSale: z.string().trim().min(1),
  issuer: fiscalPartySchema,
  recipient: fiscalPartySchema,
  ivaRate: z.string().trim().min(1),
  rounding: z.object({
    precision: z.literal(4),
    mode: z.literal("HALF_UP"),
  }).strict(),
  dueDate: z.string().date().optional(),
}).strict();

export type FiscalDevOnlyPolicy = z.infer<typeof fiscalDevOnlyPolicySchema>;
