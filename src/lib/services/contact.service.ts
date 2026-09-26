// OSSUM COR — Contact service
// Contact is global — linked to Company via ContactCompanyLink.
// Every operational read MUST go through ContactCompanyLink filtered by companyId.
// Services receive prisma as dependency injection.

import { Prisma, type PrismaClient } from "@prisma/client";

import type { Contacto } from "@/types";

import { badRequest, conflict } from "../api/errors";
import { assertContactGeoPolicy, type ContactCreateInput, type ContactUpdateInput } from "../validators/contact";
import { createAuditEvent } from "../audit";

type Db = PrismaClient | Prisma.TransactionClient;
type GeographyActor = { userId: string; role: string };

export type FrontendContactSnapshot = Pick<
  Contacto,
  | "id"
  | "nombre"
  | "tipoPersona"
  | "razonSocial"
  | "cuit"
  | "dni"
  | "email"
  | "telefonos"
  | "groups"
>;

type ResolveCompanyContactReferenceInput = {
  companyId: string;
  contactId?: string | null;
  snapshot?: FrontendContactSnapshot | null;
  role: string;
  required?: boolean;
  fieldLabel: string;
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function normalizeDigits(value: string | null | undefined): string {
  return value?.replace(/\D+/g, "") ?? "";
}

function buildComparableName(contact: {
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
}): string {
  const fullName = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
  return normalizeText(fullName || contact.legalName);
}

function isCompanySnapshot(snapshot: FrontendContactSnapshot): boolean {
  return (
    snapshot.tipoPersona === "juridica" ||
    Boolean(snapshot.razonSocial?.trim()) ||
    snapshot.groups?.includes("instituciones") === true
  );
}

function splitPersonName(fullName: string) {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return { firstName: undefined, lastName: undefined };
  }

  const [firstName, ...rest] = trimmed.split(" ");
  return {
    firstName,
    lastName: rest.length > 0 ? rest.join(" ") : undefined,
  };
}

function buildCreateContactData(snapshot: FrontendContactSnapshot) {
  const company = isCompanySnapshot(snapshot);
  const normalizedName = snapshot.nombre?.trim() ?? "";
  const personName = splitPersonName(normalizedName);

  return {
    isCompany: company,
    legalName: company ? snapshot.razonSocial?.trim() || normalizedName || undefined : undefined,
    firstName: company ? undefined : personName.firstName,
    lastName: company ? undefined : personName.lastName,
    email: snapshot.email?.trim() || undefined,
    phone: snapshot.telefonos?.find((value) => value?.trim())?.trim() || undefined,
    documentType: snapshot.cuit?.trim() ? "CUIT" : snapshot.dni?.trim() ? "DNI" : undefined,
    documentNumber: snapshot.cuit?.trim() || snapshot.dni?.trim() || undefined,
    contactType: undefined,
  };
}

function hasUsableSnapshot(snapshot: FrontendContactSnapshot | null | undefined): snapshot is FrontendContactSnapshot {
  if (!snapshot) return false;

  return Boolean(
    snapshot.nombre?.trim() ||
      snapshot.razonSocial?.trim() ||
      snapshot.email?.trim() ||
      snapshot.cuit?.trim() ||
      snapshot.dni?.trim()
  );
}

function matchesSnapshot(
  companyContact: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    legalName?: string | null;
    email?: string | null;
    documentNumber?: string | null;
    isCompany?: boolean | null;
  },
  snapshot: FrontendContactSnapshot
): boolean {
  const snapshotDocument = normalizeDigits(snapshot.cuit || snapshot.dni);
  const contactDocument = normalizeDigits(companyContact.documentNumber);

  if (snapshotDocument && contactDocument && snapshotDocument === contactDocument) {
    return true;
  }

  const snapshotEmail = normalizeText(snapshot.email);
  const contactEmail = normalizeText(companyContact.email);
  if (snapshotEmail && contactEmail && snapshotEmail === contactEmail) {
    return true;
  }

  const snapshotName = normalizeText(snapshot.razonSocial || snapshot.nombre);
  const contactName = buildComparableName(companyContact);
  if (snapshotName && contactName && snapshotName === contactName) {
    return true;
  }

  return false;
}

export async function resolveCompanyContactReference(
  prisma: PrismaClient,
  input: ResolveCompanyContactReferenceInput
): Promise<string | null> {
  const contactId = input.contactId?.trim() || input.snapshot?.id?.trim() || "";

  if (contactId) {
    const existingLink = await getContactCompanyLink(prisma, input.companyId, contactId);
    if (existingLink?.isActive) {
      return contactId;
    }
  }

  if (!hasUsableSnapshot(input.snapshot)) {
    if (input.required) {
      throw badRequest(
        `${input.fieldLabel} contact could not be resolved from the selected frontend contact`,
        `surgery_${input.role}_contact_resolution_failed`
      );
    }

    if (contactId) {
      throw badRequest(
        `${input.fieldLabel} contact is not linked to the active company and no usable snapshot was provided`,
        `surgery_${input.role}_contact_resolution_failed`
      );
    }

    return null;
  }

  const snapshot = input.snapshot;

  for (let skip = 0; ; skip += 500) {
    const companyContacts = await listContactsByCompany(prisma, input.companyId, {
      isActive: true,
      take: 500,
      skip,
    });
    const matchedContact = companyContacts.find((candidate) => matchesSnapshot(candidate, snapshot));
    if (matchedContact) return matchedContact.id;
    if (companyContacts.length < 500) break;
  }

  const createData = buildCreateContactData(snapshot);
  if (!createData.firstName && !createData.legalName) {
    throw badRequest(
      `${input.fieldLabel} contact snapshot is missing a usable name`,
      `surgery_${input.role}_contact_snapshot_invalid`
    );
  }

  const createdContact = await createContact(prisma, input.companyId, createData, input.role);
  return createdContact.id;
}

// ─── Contact base ─────────────────────────────────────────────────────

const contactInclude = (companyId: string) => ({
  contact: {
    include: {
      addresses: { where: { isMain: true }, orderBy: { createdAt: "asc" as const }, take: 1 },
      groupMemberships: {
        where: { group: { companyId } },
        include: { group: true },
      },
    },
  },
});

type ContactLinkWithDetails = Prisma.ContactCompanyLinkGetPayload<{
  include: {
    contact: {
      include: {
        addresses: true;
        groupMemberships: { include: { group: true } };
      };
    };
  };
}>;

function flattenContact(link: ContactLinkWithDetails) {
  const { addresses, groupMemberships, ...contact } = link.contact;
  return {
    ...contact,
    code: link.code,
    codigo: link.code,
    roles: link.roles,
    linkRole: link.role,
    linkIsActive: link.isActive,
    groupSlugs: groupMemberships.map(({ group }) => group.slug),
    mainAddress: addresses[0] ?? null,
    isPayer: link.isPayer,
    vatCondition: link.vatCondition,
    paymentTerms: link.paymentTerms,
    defaultPriceList: link.defaultPriceList,
    usualDiscount: link.usualDiscount === null ? null : Number(link.usualDiscount),
    doctorLicense: link.doctorLicense,
    specialty: link.specialty,
    deliveryNotes: link.deliveryNotes,
  };
}

function clean(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned || null;
}

function databaseGeographyStatus(status: string | null | undefined) {
  if (!status) return null;
  return ({ candidate: "CANDIDATE", missing: "MISSING", conflict: "CONFLICT", verified: "VERIFIED", manual_verified: "MANUAL_VERIFIED", deprecated: "DEPRECATED" } as const)[status as "candidate" | "missing" | "conflict" | "verified" | "manual_verified" | "deprecated"] ?? null;
}

function apiGeographyStatus(status: unknown) {
  return ({ CANDIDATE: "candidate", MISSING: "missing", CONFLICT: "conflict", VERIFIED: "verified", MANUAL_VERIFIED: "manual_verified", DEPRECATED: "deprecated" } as const)[String(status) as "CANDIDATE" | "MISSING" | "CONFLICT" | "VERIFIED" | "MANUAL_VERIFIED" | "DEPRECATED"] ?? null;
}

function generalRole(role: string | null | undefined): "cliente" | "proveedor" | "interno" | null {
  const normalized = role?.toLowerCase();
  if (normalized === "proveedor" || normalized === "supplier" || normalized === "instrumentador") return "proveedor";
  if (["interno", "admin", "operator", "coordinador", "vendedor"].includes(normalized ?? "")) return "interno";
  if (normalized) return "cliente";
  return null;
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code === "P2002"
    : Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002");
}

const canonicalGroupBySlug = {
  medicos: ["Médicos", "cliente"], pacientes: ["Pacientes", "cliente"], instituciones: ["Instituciones", "cliente"],
  obras_sociales: ["Obras Sociales", "cliente"], art: ["ART", "cliente"], particulares: ["Particulares", "cliente"],
  prepagas: ["Prepagas", "cliente"], otros_clientes: ["Otros clientes", "cliente"],
  instrumentadores: ["Instrumentadores", "proveedor"], prov_implantes: ["Proveedores de implantes", "proveedor"],
  prov_insumos: ["Proveedores de insumos quirúrgicos", "proveedor"], prov_descartables: ["Proveedores de descartables", "proveedor"],
  servicios_tecnicos: ["Servicios técnicos", "proveedor"], otros_proveedores: ["Otros proveedores", "proveedor"],
  coordinadores: ["Coordinadores", "interno"], vendedores: ["Vendedores", "interno"], deposito: ["Depósito", "interno"],
  administracion: ["Administración", "interno"], logistica: ["Logística", "interno"], direccion: ["Dirección", "interno"],
  otros_internos: ["Otros internos", "interno"],
} as const;

async function replaceGroups(
  tx: Prisma.TransactionClient,
  companyId: string,
  contactId: string,
  groupSlugs: ContactCreateInput["groupSlugs"]
) {
  if (groupSlugs === undefined) return;
  const uniqueSlugs = [...new Set(groupSlugs)];
  const groups = await tx.contactGroup.findMany({
    where: { companyId, slug: { in: uniqueSlugs }, isActive: true },
    select: { id: true, slug: true },
  });
  const found = new Set(groups.map((group) => group.slug));
  for (const slug of uniqueSlugs) {
    if (found.has(slug)) continue;
    const definition = canonicalGroupBySlug[slug as keyof typeof canonicalGroupBySlug];
    if (!definition) throw badRequest(`Unknown contact group: ${slug}`, "invalid_contact_group");
    const [name, role] = definition;
    const created = await tx.contactGroup.upsert({
      where: { companyId_slug: { companyId, slug } },
      create: { companyId, slug, role, name },
      update: { role, name, isActive: true },
      select: { id: true, slug: true },
    });
    groups.push(created);
  }
  await tx.contactGroupMembership.deleteMany({
    where: { contactId, group: { companyId } },
  });
  if (groups.length) {
    await tx.contactGroupMembership.createMany({
      data: groups.map((group) => ({ contactId, groupId: group.id })),
    });
  }
}

async function replaceMainAddress(
  tx: Prisma.TransactionClient,
  contactId: string,
  address: ContactCreateInput["mainAddress"],
  companyId: string,
  groupSlugs: readonly string[] | undefined,
  actor?: GeographyActor
) {
  if (address === undefined) return;
  const current = await tx.contactAddress.findFirst({ where: { contactId, isMain: true }, orderBy: { createdAt: "asc" } });
  if (!address) {
    if (current) await tx.contactAddress.update({ where: { id: current.id }, data: { isMain: false } });
    return;
  }
  const hasValue = Object.entries(address).some(([key, value]) => key !== "geo" && Boolean(value)) || Boolean(address.geo);
  if (!hasValue) {
    if (current) await tx.contactAddress.update({ where: { id: current.id }, data: { isMain: false } });
    return;
  }
  const street = clean(address.street);
  const preservesStructuredNumber = Boolean(current?.number && street === `${current.street ?? ""} ${current.number}`.trim());
  const data = {
    street: preservesStructuredNumber ? current?.street : street,
    number: address.number === undefined && preservesStructuredNumber ? current?.number : clean(address.number),
    city: clean(address.city),
    state: clean(address.state),
    zipCode: clean(address.zipCode),
    country: address.country ?? "AR",
    isMain: true,
    addressType: "main",
    georefId: address.geo === undefined ? undefined : clean(address.geo?.georefId),
    entityType: address.geo === undefined ? undefined : address.geo?.entityType ?? null,
    provinceGeorefId: address.geo === undefined ? undefined : clean(address.geo?.provinceGeorefId),
    provinceName: address.geo === undefined ? undefined : clean(address.geo?.provinceName),
    latitude: address.geo === undefined ? undefined : address.geo?.latitude ?? null,
    longitude: address.geo === undefined ? undefined : address.geo?.longitude ?? null,
    coordinateType: address.geo === undefined ? undefined : address.geo?.coordinateType ?? null,
    crs: address.geo === undefined ? undefined : address.geo?.crs === "EPSG:4326" ? "EPSG_4326" as const : null,
    source: address.geo === undefined ? undefined : address.geo?.source ?? null,
    sourceVersion: address.geo === undefined ? undefined : clean(address.geo?.sourceVersion),
    sourceRetrievedAt: address.geo === undefined ? undefined : address.geo?.sourceRetrievedAt ? new Date(address.geo.sourceRetrievedAt) : null,
    validationStatus: address.geo === undefined ? undefined : databaseGeographyStatus(address.geo?.validationStatus),
    validationNotes: address.geo === undefined ? undefined : clean(address.geo?.validationNotes),
  };
  if (address.geo) {
    assertContactGeoPolicy(address.geo, groupSlugs, actor?.role ?? "");
    const oldGeo = current ? geographySnapshot(current) : null;
    if (oldGeo?.validationStatus === "verified" || oldGeo?.validationStatus === "manual_verified") {
      if (!["verified", "manual_verified"].includes(address.geo.validationStatus ?? "")) {
        throw conflict("Validated geographic data requires explicit administrator resolution", "contact_geo_validated_data_protected");
      }
    }
  }
  const saved = current
    ? await tx.contactAddress.update({ where: { id: current.id }, data })
    : await tx.contactAddress.create({ data: { contactId, ...data } });
  if (address.geo && actor) {
    const oldGeo = current ? geographySnapshot(current) : null;
    const newGeo = geographySnapshot(saved);
    if (JSON.stringify(oldGeo) !== JSON.stringify(newGeo)) {
      const validationChanged = oldGeo?.validationStatus !== newGeo.validationStatus;
      await createAuditEvent({
        prisma: tx, companyId, userId: actor.userId, entityType: "ContactAddress", entityId: saved.id,
        action: validationChanged ? "geography_status_changed" : "geography_candidate_saved", module: "contacts",
        oldValue: { geo: oldGeo }, newValue: { geo: newGeo },
        metadata: { contactId, coordinateType: newGeo.coordinateType, validationStatus: newGeo.validationStatus, crs: newGeo.crs, source: newGeo.source, actorRole: actor.role },
      });
    }
  }
}

function geographySnapshot(address: Record<string, unknown>) {
  return {
    georefId: address.georefId ?? null, entityType: address.entityType ?? null, provinceGeorefId: address.provinceGeorefId ?? null,
    provinceName: address.provinceName ?? null, latitude: address.latitude == null ? null : Number(address.latitude), longitude: address.longitude == null ? null : Number(address.longitude),
    coordinateType: address.coordinateType ?? null, crs: address.crs === "EPSG_4326" ? "EPSG:4326" : address.crs ?? null, source: address.source ?? null, sourceVersion: address.sourceVersion ?? null,
    sourceRetrievedAt: address.sourceRetrievedAt instanceof Date ? address.sourceRetrievedAt.toISOString() : address.sourceRetrievedAt ?? null,
    validationStatus: apiGeographyStatus(address.validationStatus), validationNotes: address.validationNotes ?? null,
  };
}

async function getContactByIdFromDb(db: Db, companyId: string, contactId: string) {
  const link = await db.contactCompanyLink.findUnique({
    where: { contactId_companyId: { contactId, companyId } },
    include: contactInclude(companyId),
  });
  return link ? flattenContact(link as ContactLinkWithDetails) : null;
}

/** List contacts for a company via ContactCompanyLink. */
export async function listContactsByCompany(
  prisma: PrismaClient,
  companyId: string,
  options?: {
    role?: string;
    contactType?: string;
    isActive?: boolean;
    search?: string;
    take?: number;
    skip?: number;
    includeInactive?: boolean;
  }
) {
  const where: Prisma.ContactCompanyLinkWhereInput = {
    companyId,
  };
  if (options?.isActive !== undefined) where.isActive = options.isActive;
  else if (!options?.includeInactive) where.isActive = true;
  if (options?.role) where.OR = [{ roles: { has: options.role } }, { role: options.role }];
  if (options?.contactType) where.contact = { contactType: options.contactType };
  if (options?.search) {
    where.AND = [{ OR: [
      { code: { contains: options.search, mode: "insensitive" } },
      { contact: { OR: [
        { firstName: { contains: options.search, mode: "insensitive" } },
        { lastName: { contains: options.search, mode: "insensitive" } },
        { legalName: { contains: options.search, mode: "insensitive" } },
        { tradeName: { contains: options.search, mode: "insensitive" } },
        { email: { contains: options.search, mode: "insensitive" } },
        { phone: { contains: options.search, mode: "insensitive" } },
        { documentNumber: { contains: options.search, mode: "insensitive" } },
      ] } },
    ] }];
  }

  const links = await prisma.contactCompanyLink.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.min(options?.take ?? 50, 500),
    skip: options?.skip,
    include: contactInclude(companyId),
  });
  return links.map((link) => flattenContact(link as ContactLinkWithDetails));
}

/** Get a single contact by ID, verifying it belongs to the company. */
export async function getContactById(
  prisma: PrismaClient,
  companyId: string,
  contactId: string
) {
  return getContactByIdFromDb(prisma, companyId, contactId);
}

/** Create a new contact and optionally link to a company with a role. */
export async function createContact(
  prisma: PrismaClient,
  companyId: string,
  data: ContactCreateInput,
  role?: string,
  actor?: GeographyActor
) {
  const explicitCode = data.code ?? data.codigo;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const legacyRole = clean(role ?? data.role ?? data.contactType);
        const fallbackRole = generalRole(legacyRole);
        const roles = data.roles?.length ? [...new Set(data.roles)] : fallbackRole ? [fallbackRole] : [];
        const contact = await tx.contact.create({ data: {
          firstName: clean(data.firstName), lastName: clean(data.lastName), legalName: clean(data.legalName),
          tradeName: clean(data.tradeName), notes: clean(data.notes), isCompany: data.isCompany ?? false,
          email: clean(data.email), phone: clean(data.phone), documentType: clean(data.documentType),
          documentNumber: clean(data.documentNumber), contactType: clean(data.contactType),
        } });
        await tx.contactCompanyLink.create({ data: {
          contactId: contact.id, companyId, code: explicitCode, role: legacyRole, roles, isActive: true,
          isPayer: data.isPayer, vatCondition: clean(data.vatCondition), paymentTerms: clean(data.paymentTerms),
          defaultPriceList: clean(data.defaultPriceList), usualDiscount: data.usualDiscount,
          doctorLicense: clean(data.doctorLicense), specialty: clean(data.specialty), deliveryNotes: clean(data.deliveryNotes),
        } });
        await replaceGroups(tx, companyId, contact.id, data.groupSlugs);
        await replaceMainAddress(tx, contact.id, data.mainAddress, companyId, data.groupSlugs, actor);
        return (await getContactByIdFromDb(tx, companyId, contact.id))!;
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      if (explicitCode) throw conflict("Contact code already exists in this company", "contact_code_conflict");
      if (attempt === 4) throw conflict("Could not allocate a contact code", "contact_code_allocation_conflict");
    }
  }
  throw conflict("Could not allocate a contact code", "contact_code_allocation_conflict");
}

/** Update a contact's data. Verifies ownership via ContactCompanyLink. */
export async function updateContact(
  prisma: PrismaClient,
  companyId: string,
  contactId: string,
  data: ContactUpdateInput,
  actor?: GeographyActor
) {
  return prisma.$transaction(async (tx) => {
    const link = await tx.contactCompanyLink.findUnique({ where: { contactId_companyId: { contactId, companyId } } });
    if (!link) throw new Error(`Contact ${contactId} does not belong to company ${companyId}`);
    await tx.contact.update({ where: { id: contactId }, data: {
      firstName: data.firstName === undefined ? undefined : clean(data.firstName),
      lastName: data.lastName === undefined ? undefined : clean(data.lastName),
      legalName: data.legalName === undefined ? undefined : clean(data.legalName),
      tradeName: data.tradeName === undefined ? undefined : clean(data.tradeName),
      notes: data.notes === undefined ? undefined : clean(data.notes),
      isCompany: data.isCompany, email: data.email === undefined ? undefined : clean(data.email),
      phone: data.phone === undefined ? undefined : clean(data.phone),
      documentType: data.documentType === undefined ? undefined : clean(data.documentType),
      documentNumber: data.documentNumber === undefined ? undefined : clean(data.documentNumber),
      contactType: data.contactType === undefined ? undefined : clean(data.contactType),
    } });
    const legacyRole = data.role === undefined ? undefined : clean(data.role);
    await tx.contactCompanyLink.update({ where: { id: link.id }, data: {
      role: legacyRole, roles: data.roles ? [...new Set(data.roles)] : undefined, isActive: data.isActive,
      isPayer: data.isPayer, vatCondition: data.vatCondition === undefined ? undefined : clean(data.vatCondition),
      paymentTerms: data.paymentTerms === undefined ? undefined : clean(data.paymentTerms),
      defaultPriceList: data.defaultPriceList === undefined ? undefined : clean(data.defaultPriceList),
      usualDiscount: data.usualDiscount, doctorLicense: data.doctorLicense === undefined ? undefined : clean(data.doctorLicense),
      specialty: data.specialty === undefined ? undefined : clean(data.specialty),
      deliveryNotes: data.deliveryNotes === undefined ? undefined : clean(data.deliveryNotes),
    } });
    const existing = await getContactByIdFromDb(tx, companyId, contactId);
    await replaceGroups(tx, companyId, contactId, data.groupSlugs);
    await replaceMainAddress(tx, contactId, data.mainAddress, companyId, data.groupSlugs ?? existing?.groupSlugs, actor);
    return getContactByIdFromDb(tx, companyId, contactId);
  });
}

/**
 * Deactivate the link between a contact and a company.
 * Does NOT delete the global Contact — it may belong to other companies.
 */
export async function deactivateContactForCompany(
  prisma: PrismaClient,
  companyId: string,
  contactId: string
) {
  const link = await prisma.contactCompanyLink.findUnique({
    where: { contactId_companyId: { contactId, companyId } },
  });
  if (!link) {
    throw new Error(
      `Contact ${contactId} does not belong to company ${companyId}`
    );
  }
  return prisma.contactCompanyLink.update({
    where: { id: link.id },
    data: { isActive: false },
  });
}

// ─── Company link helpers ─────────────────────────────────────────────

/** Link a contact to a company with a role. Upserts if link already exists. */
export async function linkContactToCompany(
  prisma: PrismaClient,
  companyId: string,
  contactId: string,
  role?: string
) {
  const general = generalRole(role);
  return prisma.contactCompanyLink.upsert({
    where: { contactId_companyId: { contactId, companyId } },
    update: { role: role ?? undefined, roles: role === undefined ? undefined : general ? [general] : [], isActive: true },
    create: {
        contactId,
        companyId,
        role,
        roles: general ? [general] : [],
        isActive: true,
    },
  });
}

/** Get the link between a contact and a company. Returns null if not linked. */
export async function getContactCompanyLink(
  prisma: PrismaClient,
  companyId: string,
  contactId: string
) {
  return prisma.contactCompanyLink.findUnique({
    where: { contactId_companyId: { contactId, companyId } },
  });
}

/**
 * Assert that a contact belongs to a company (via active ContactCompanyLink).
 * Throws if not linked or inactive.
 */
export async function assertContactBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  contactId: string
): Promise<void> {
  const link = await prisma.contactCompanyLink.findUnique({
    where: { contactId_companyId: { contactId, companyId } },
  });
  if (!link || !link.isActive) {
    throw new Error(
      `Contact ${contactId} does not belong to company ${companyId}`
    );
  }
}

/**
 * Assert that multiple contacts all belong to a company.
 * Throws if any contact is not linked or inactive.
 */
export async function assertContactsBelongToCompany(
  prisma: PrismaClient,
  companyId: string,
  contactIds: string[]
): Promise<void> {
  if (contactIds.length === 0) return;

  const links = await prisma.contactCompanyLink.findMany({
    where: {
      companyId,
      contactId: { in: contactIds },
      isActive: true,
    },
    select: { contactId: true },
  });

  const linkedIds = new Set(links.map((l) => l.contactId));
  const missing = contactIds.filter((id) => !linkedIds.has(id));

  if (missing.length > 0) {
    throw new Error(
      `Contacts not linked to company ${companyId}: ${missing.join(", ")}`
    );
  }
}

// ─── Contact groups ───────────────────────────────────────────────────

/** List contact groups for a company. */
export async function listContactGroups(
  prisma: PrismaClient,
  companyId: string
) {
  return prisma.contactGroup.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });
}

/** Create a contact group within a company. */
export async function createContactGroup(
  prisma: PrismaClient,
  companyId: string,
  data: { name: string; description?: string; slug?: string; role?: string }
) {
  const slug = data.slug?.trim() || data.name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return prisma.contactGroup.create({
    data: {
      companyId,
      slug,
      role: data.role ?? "cliente",
      name: data.name,
      description: data.description,
    },
  });
}

/** Add a contact to a group. Validates contact belongs to the same company. */
export async function addContactToGroup(
  prisma: PrismaClient,
  companyId: string,
  groupId: string,
  contactId: string
) {
  // Validate group belongs to company
  const group = await prisma.contactGroup.findFirst({
    where: { id: groupId, companyId },
  });
  if (!group) {
    throw new Error(`Group ${groupId} not found in company ${companyId}`);
  }
  // Validate contact belongs to company
  await assertContactBelongsToCompany(prisma, companyId, contactId);

  return prisma.contactGroupMembership.upsert({
    where: { groupId_contactId: { groupId, contactId } },
    create: { groupId, contactId },
    update: {},
  });
}

/** Remove a contact from a group. */
export async function removeContactFromGroup(
  prisma: PrismaClient,
  companyId: string,
  groupId: string,
  contactId: string
) {
  // Validate group belongs to company
  const group = await prisma.contactGroup.findFirst({
    where: { id: groupId, companyId },
  });
  if (!group) {
    throw new Error(`Group ${groupId} not found in company ${companyId}`);
  }

  return prisma.contactGroupMembership.deleteMany({
    where: { groupId, contactId },
  });
}

// ─── Contact addresses ────────────────────────────────────────────────

/** List addresses for a contact. Validates contact belongs to company first. */
export async function listContactAddresses(
  prisma: PrismaClient,
  companyId: string,
  contactId: string
) {
  await assertContactBelongsToCompany(prisma, companyId, contactId);
  return prisma.contactAddress.findMany({
    where: { contactId },
    orderBy: { isMain: "desc" },
  });
}

/** Create an address for a contact. Validates contact belongs to company first. */
export async function createContactAddress(
  prisma: PrismaClient,
  companyId: string,
  contactId: string,
  data: {
    street?: string;
    number?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    isMain?: boolean;
    addressType?: string;
  }
) {
  await assertContactBelongsToCompany(prisma, companyId, contactId);
  return prisma.$transaction(async (tx) => {
    if (data.isMain) {
      await tx.contactAddress.updateMany({ where: { contactId, isMain: true }, data: { isMain: false } });
    }
    return tx.contactAddress.create({
      data: {
        contactId,
        street: data.street,
        number: data.number,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country ?? "AR",
        isMain: data.isMain ?? false,
        addressType: data.addressType,
      },
    });
  });
}
