import { z } from "zod";

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
