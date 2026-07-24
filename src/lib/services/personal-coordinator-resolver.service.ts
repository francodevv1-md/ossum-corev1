import type { PrismaClient } from "@prisma/client";

export type CoordinatorIdentity = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type CoordinatorSubject = { contactId: string; label: string };

export type PersonalCoordinatorResolution =
  | { status: "resolved"; subject: CoordinatorSubject }
  | { status: "unresolved"; subject: null; reason: "identity_incomplete" | "no_match" }
  | { status: "ambiguous"; subject: null; reason: "multiple_matches" };

export type EligibleCoordinatorContact = CoordinatorSubject & {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  legalName: string | null;
};

export function normalizeCoordinatorIdentityText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("es-AR")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeCoordinatorIdentityEmail(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

function joinedName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].map((part) => part?.trim()).filter(Boolean).join(" ");
}

function contactLabel(contact: {
  legalName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  return contact.legalName?.trim() || joinedName(contact.firstName, contact.lastName);
}

export async function listEligibleCoordinatorContacts(
  prisma: PrismaClient,
  companyId: string
): Promise<EligibleCoordinatorContact[]> {
  const contacts = await prisma.contact.findMany({
    where: {
      isActive: true,
      isCompany: false,
      companyLinks: {
        some: {
          companyId,
          isActive: true,
          role: "coordinator",
          company: { isActive: true },
        },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      legalName: true,
    },
  });

  const deduped = new Map<string, EligibleCoordinatorContact>();
  for (const contact of contacts) {
    const label = contactLabel(contact);
    const email = contact.email?.trim() || null;
    if (!label && !email) continue;
    deduped.set(contact.id, { ...contact, contactId: contact.id, label });
  }

  return [...deduped.values()].sort((left, right) =>
    normalizeCoordinatorIdentityText(left.label).localeCompare(
      normalizeCoordinatorIdentityText(right.label),
      "es-AR"
    ) || left.contactId.localeCompare(right.contactId)
  );
}

export function resolvePersonalCoordinator(
  identity: CoordinatorIdentity,
  contacts: EligibleCoordinatorContact[]
): PersonalCoordinatorResolution {
  const email = identity.email ? normalizeCoordinatorIdentityEmail(identity.email) : "";
  const fullName = normalizeCoordinatorIdentityText(joinedName(identity.firstName, identity.lastName));

  if (!email && !fullName) {
    return { status: "unresolved", subject: null, reason: "identity_incomplete" };
  }

  const matches = new Map<string, CoordinatorSubject>();
  for (const contact of contacts) {
    const contactEmail = contact.email
      ? normalizeCoordinatorIdentityEmail(contact.email)
      : "";
    const contactName = normalizeCoordinatorIdentityText(contactLabel(contact));
    if ((email && contactEmail === email) || (fullName && contactName === fullName)) {
      matches.set(contact.contactId, {
        contactId: contact.contactId,
        label: contact.label,
      });
    }
  }

  if (matches.size === 0) {
    return { status: "unresolved", subject: null, reason: "no_match" };
  }
  if (matches.size > 1) {
    return { status: "ambiguous", subject: null, reason: "multiple_matches" };
  }
  return { status: "resolved", subject: [...matches.values()][0] };
}

export async function resolvePersonalCoordinatorForCompany(
  prisma: PrismaClient,
  companyId: string,
  identity: CoordinatorIdentity
): Promise<PersonalCoordinatorResolution> {
  return resolvePersonalCoordinator(
    identity,
    await listEligibleCoordinatorContacts(prisma, companyId)
  );
}
