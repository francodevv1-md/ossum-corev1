// OSSUM COR — Contact service
// Contact is global — linked to Company via ContactCompanyLink.
// Every operational read MUST go through ContactCompanyLink filtered by companyId.
// Services receive prisma as dependency injection.

import type { PrismaClient } from "@prisma/client";

import type { Contacto } from "@/types";

import { badRequest } from "../api/errors";

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

  const companyContacts = await listContactsByCompany(prisma, input.companyId, {
    isActive: true,
    take: 1000,
  });

  const matchedContact = companyContacts.find((candidate) =>
    matchesSnapshot(candidate, snapshot)
  );

  if (matchedContact) {
    return matchedContact.id;
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
  }
) {
  const where: Record<string, unknown> = {
    companyId,
    isActive: options?.isActive ?? true,
  };
  if (options?.role) where.role = options.role;

  const links = await prisma.contactCompanyLink.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.take ?? 50,
    skip: options?.skip,
    include: { contact: true },
  });

  // Filter by contactType on the contact level if provided
  let contacts = links.map((link) => ({
    ...link.contact,
    linkRole: link.role,
    linkIsActive: link.isActive,
  }));

  if (options?.contactType) {
    contacts = contacts.filter((c) => c.contactType === options.contactType);
  }

  // Simple text search across name/email fields
  if (options?.search) {
    const q = options.search.toLowerCase();
    contacts = contacts.filter(
      (c) =>
        (c.firstName?.toLowerCase().includes(q) ?? false) ||
        (c.lastName?.toLowerCase().includes(q) ?? false) ||
        (c.legalName?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
    );
  }

  return contacts;
}

/** Get a single contact by ID, verifying it belongs to the company. */
export async function getContactById(
  prisma: PrismaClient,
  companyId: string,
  contactId: string
) {
  const link = await prisma.contactCompanyLink.findUnique({
    where: { contactId_companyId: { contactId, companyId } },
    include: { contact: true },
  });
  if (!link) return null;
  return { ...link.contact, linkRole: link.role };
}

/** Create a new contact and optionally link to a company with a role. */
export async function createContact(
  prisma: PrismaClient,
  companyId: string,
  data: {
    firstName?: string;
    lastName?: string;
    legalName?: string;
    isCompany?: boolean;
    email?: string;
    phone?: string;
    documentType?: string;
    documentNumber?: string;
    contactType?: string;
  },
  role?: string
) {
  return prisma.$transaction(async (tx) => {
    const contact = await tx.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        legalName: data.legalName,
        isCompany: data.isCompany ?? false,
        email: data.email,
        phone: data.phone,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        contactType: data.contactType,
      },
    });
    await tx.contactCompanyLink.create({
      data: {
        contactId: contact.id,
        companyId,
        role: role ?? data.contactType,
        isActive: true,
      },
    });
    return contact;
  });
}

/** Update a contact's data. Verifies ownership via ContactCompanyLink. */
export async function updateContact(
  prisma: PrismaClient,
  companyId: string,
  contactId: string,
  data: {
    firstName?: string;
    lastName?: string;
    legalName?: string | null;
    isCompany?: boolean;
    email?: string | null;
    phone?: string | null;
    documentType?: string | null;
    documentNumber?: string | null;
    contactType?: string | null;
  }
) {
  const link = await prisma.contactCompanyLink.findUnique({
    where: { contactId_companyId: { contactId, companyId } },
  });
  if (!link) {
    throw new Error(
      `Contact ${contactId} does not belong to company ${companyId}`
    );
  }
  return prisma.contact.update({
    where: { id: contactId },
    data,
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
  return prisma.contactCompanyLink.upsert({
    where: { contactId_companyId: { contactId, companyId } },
    create: { contactId, companyId, role, isActive: true },
    update: { role: role ?? undefined, isActive: true },
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
  data: { name: string; description?: string }
) {
  return prisma.contactGroup.create({
    data: {
      companyId,
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
  return prisma.contactAddress.create({
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
}
