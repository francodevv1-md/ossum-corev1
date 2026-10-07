// OSSUM COR — Validator schemas for the CUIT lookup MVP.
//
// Request: 11-digit CUIT string.
// Response: subset mapped to existing Contactos fields plus an
// `extra` payload carrying apoc / actividad / constancia data that is
// purely informational and MUST NEVER be persisted by the route.

import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const cuitLookupRequestSchema = z.object({
  cuit: z.string().regex(/^\d{11}$/, "cuit must be exactly 11 digits"),
}).strict();

export const cuitLookupSourceSchema = z.enum(["stub", "tusfacturas"]);

export const cuitLookupVatConditionSchema = z.enum([
  "Responsable Inscripto",
  "Monotributo",
  "Exento",
  "Consumidor Final",
]);

export const cuitLookupMainAddressSchema = z.object({
  street: optionalText(240),
  city: optionalText(120),
  state: optionalText(120),
  zipCode: optionalText(30),
  country: z.string().trim().length(2).toUpperCase().optional(),
}).strict();

export const cuitLookupExtraSchema = z.object({
  apocExiste: z.boolean().optional(),
  apocInfo: z.string().optional().nullable(),
  actividad: z.unknown().optional(),
  constanciaFullDatos: z.unknown().optional(),
}).strict().optional();

// Subset mapped to existing Contactos fields (strict, plus extra optional).
export const contactLookupResultSchema = z.object({
  source: cuitLookupSourceSchema,
  found: z.boolean(),
  legalName: optionalText(240),
  vatCondition: cuitLookupVatConditionSchema.optional(),
  mainAddress: cuitLookupMainAddressSchema.optional().nullable(),
  estado: z.string().optional(),
  extra: cuitLookupExtraSchema,
}).strict();

export type CuitLookupRequest = z.infer<typeof cuitLookupRequestSchema>;
export type ContactLookupResult = z.infer<typeof contactLookupResultSchema>;