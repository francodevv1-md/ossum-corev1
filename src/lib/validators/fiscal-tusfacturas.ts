import { z } from "zod";

export const TUSFACTURAS_DEV_CREDENTIAL_NAMES = [
  "TUSFACTURAS_DEV_USER_TOKEN",
  "TUSFACTURAS_DEV_API_TOKEN",
  "TUSFACTURAS_DEV_API_KEY",
] as const;

export const tusFacturasResponseSchema = z.object({
  error: z.string().optional(),
  errores: z.array(z.unknown()).optional(),
  error_cod: z.array(z.unknown()).optional(),
  error_details: z.array(z.unknown()).optional(),
  cae: z.string().optional(),
  comprobante_pdf_url: z.string().optional(),
  external_reference: z.string().optional(),
  comprobante_nro: z.string().optional(),
  comprobante_tipo: z.string().optional(),
  comprobantes: z.array(z.unknown()).optional(),
}).passthrough();

export type TusFacturasResponse = z.infer<typeof tusFacturasResponseSchema>;
