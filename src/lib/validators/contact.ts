import { z } from "zod";
import { badRequest } from "../api/errors";

export const CONTACT_ROLES = ["cliente", "proveedor", "interno"] as const;
export const CONTACT_GROUPS = [
  "medicos",
  "pacientes",
  "instituciones",
  "obras_sociales",
  "art",
  "particulares",
  "prepagas",
  "otros_clientes",
  "instrumentadores",
  "prov_implantes",
  "prov_insumos",
  "prov_descartables",
  "servicios_tecnicos",
  "otros_proveedores",
  "coordinadores",
  "vendedores",
  "deposito",
  "administracion",
  "logistica",
  "direccion",
  "otros_internos",
] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const codeSchema = z.string().trim().toUpperCase().regex(/^C-\d{4,}$/, "code must use C-0001 format");

export const contactAddressGeoSchema = z.object({
  georefId: optionalText(120), entityType: z.enum(["ADDRESS", "LOCALITY"]).optional().nullable(),
  provinceGeorefId: optionalText(120), provinceName: optionalText(120),
  latitude: z.number().finite().min(-90).max(90).optional().nullable(), longitude: z.number().finite().min(-180).max(180).optional().nullable(),
  coordinateType: z.enum(["ADDRESS", "CENTROID", "MANUAL"]).optional().nullable(), crs: z.literal("EPSG:4326").optional().nullable(), source: z.enum(["Georef Argentina", "Manual"]).optional().nullable(),
  sourceVersion: optionalText(120), sourceRetrievedAt: z.string().datetime().optional().nullable(), validationStatus: z.enum(["candidate", "missing", "conflict", "verified", "manual_verified", "deprecated"]).optional().nullable(), validationNotes: optionalText(2000),
}).strict().superRefine((geo, ctx) => {
  const coordinatesProvided = geo.latitude != null || geo.longitude != null;
  const metadataProvided = geo.coordinateType || geo.crs || geo.source || geo.validationStatus;
  if (metadataProvided && !coordinatesProvided) ctx.addIssue({ code: "custom", message: "Geographic status and provenance require a coordinate pair" });
  if (coordinatesProvided && (geo.latitude == null || geo.longitude == null || !geo.coordinateType || !geo.crs || !geo.source || !geo.validationStatus)) ctx.addIssue({ code: "custom", message: "Complete geographic coordinates require type, CRS, source, and status" });
  if (geo.coordinateType === "ADDRESS" && geo.source !== "Georef Argentina") ctx.addIssue({ code: "custom", message: "ADDRESS coordinates require Georef Argentina" });
  if (geo.coordinateType === "CENTROID" && (!geo.georefId || geo.entityType !== "LOCALITY")) ctx.addIssue({ code: "custom", message: "CENTROID coordinates require a locality Georef id" });
  if (geo.coordinateType === "MANUAL" && geo.source !== "Manual") ctx.addIssue({ code: "custom", message: "MANUAL coordinates require Manual source" });
  if (geo.coordinateType === "MANUAL" && geo.validationStatus === "verified") ctx.addIssue({ code: "custom", message: "MANUAL coordinates require manual_verified status" });
  if (geo.coordinateType !== "MANUAL" && geo.validationStatus === "manual_verified") ctx.addIssue({ code: "custom", message: "manual_verified status requires MANUAL coordinates" });
});
export const contactGeorefLookupSchema = z.object({ street: z.string().trim().min(1).max(240), number: optionalText(30), city: optionalText(120), state: optionalText(120), country: z.literal("AR").optional() }).strict();
export type ContactAddressGeoInput = z.infer<typeof contactAddressGeoSchema>;
export function assertContactGeoPolicy(geo: ContactAddressGeoInput | undefined | null, groupSlugs: readonly string[] | undefined, actorRole: string) {
  if (!geo) return;
  if (!groupSlugs?.includes("instituciones")) throw badRequest("Geography is available only for institution contacts", "contact_geo_institution_required");
  if (["verified", "manual_verified"].includes(geo.validationStatus ?? "") && actorRole !== "admin") throw badRequest("Only administrators can validate geography", "contact_geo_admin_validation_required");
}

const contactFields = {
  code: codeSchema.optional(),
  codigo: codeSchema.optional(),
  firstName: optionalText(120),
  lastName: optionalText(120),
  legalName: optionalText(240),
  tradeName: optionalText(240),
  isCompany: z.boolean().optional(),
  email: z.string().trim().email().max(320).optional().nullable().or(z.literal("")),
  phone: optionalText(80),
  documentType: optionalText(30),
  documentNumber: optionalText(50),
  contactType: optionalText(50),
  notes: optionalText(5000),
  roles: z.array(z.enum(CONTACT_ROLES)).max(CONTACT_ROLES.length).optional(),
  role: optionalText(50),
  groupSlugs: z.array(z.string().trim().min(1).max(120).regex(/^[a-z0-9_-]+$/)).max(100)
    .refine((slugs) => new Set(slugs).size === slugs.length, "group slugs must be unique").optional(),
  mainAddress: z.object({
    street: optionalText(240),
    number: optionalText(30),
    city: optionalText(120),
    state: optionalText(120),
    zipCode: optionalText(30),
    country: z.string().trim().length(2).toUpperCase().optional(),
    geo: contactAddressGeoSchema.optional().nullable(),
  }).strict().optional().nullable(),
  isPayer: z.boolean().optional().nullable(),
  vatCondition: optionalText(80),
  paymentTerms: optionalText(160),
  defaultPriceList: optionalText(120),
  usualDiscount: z.number().finite().min(0).max(100).optional().nullable(),
  doctorLicense: optionalText(120),
  specialty: optionalText(160),
  deliveryNotes: optionalText(2000),
} as const;

function hasIdentity(value: Record<string, unknown>) {
  return [value.firstName, value.lastName, value.legalName, value.email, value.phone, value.documentNumber]
    .some((field) => typeof field === "string" && field.trim().length > 0);
}

export const contactCreateSchema = z.object(contactFields).strict().refine(hasIdentity, {
  message: "At least one identifiable field is required (firstName, lastName, legalName, email, phone, or documentNumber)",
});

export const contactUpdateSchema = z.object({
  ...contactFields,
  code: z.never().optional(),
  codigo: z.never().optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "No valid fields provided for update");

export const contactListQuerySchema = z.object({
  role: z.string().trim().min(1).optional(),
  contactType: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  includeInactive: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  take: z.coerce.number().int().min(1).max(500).default(50),
  skip: z.coerce.number().int().min(0).default(0),
}).strict();

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
