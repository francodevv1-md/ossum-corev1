import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { getBooleanParam, getNonNegativeIntegerParam, getStringParam } from "../../../../../lib/api/query";
import { badRequest } from "../../../../../lib/api/errors";
import { created, errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import { createContact, listContactsByCompany } from "../../../../../lib/services/contact.service";
import { createAuditEvent } from "../../../../../lib/audit";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

const CONTACT_MUTATION_ROLES = ["admin", "operator"] as const;

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const searchParams = new URL(request.url).searchParams;

    const contacts = await listContactsByCompany(prisma, ctx.companyId, {
      role: getStringParam(searchParams, "role"),
      contactType: getStringParam(searchParams, "contactType"),
      isActive: getBooleanParam(searchParams, "isActive"),
      search: getStringParam(searchParams, "search"),
      take: getNonNegativeIntegerParam(searchParams, "take"),
      skip: getNonNegativeIntegerParam(searchParams, "skip"),
    });

    return ok(contacts);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, CONTACT_MUTATION_ROLES);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : undefined;
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : undefined;
    const legalName = typeof body.legalName === "string" ? body.legalName.trim() : undefined;
    const isCompany = typeof body.isCompany === "boolean" ? body.isCompany : undefined;
    const email = typeof body.email === "string" ? body.email.trim() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const documentType = typeof body.documentType === "string" ? body.documentType.trim() : undefined;
    const documentNumber = typeof body.documentNumber === "string" ? body.documentNumber.trim() : undefined;
    const contactType = typeof body.contactType === "string" ? body.contactType.trim() : undefined;
    const role = typeof body.role === "string" ? body.role.trim() : undefined;

    // At least one identifiable field is required
    const hasIdentifiableField = firstName || lastName || legalName || email || phone || documentNumber;
    if (!hasIdentifiableField) {
      throw badRequest(
        "At least one identifiable field is required (firstName, lastName, legalName, email, phone, or documentNumber)",
        "missing_required_fields"
      );
    }

    const contact = await createContact(prisma, ctx.companyId, {
      firstName,
      lastName,
      legalName,
      isCompany: isCompany ?? (!firstName && !lastName && !!legalName),
      email,
      phone,
      documentType,
      documentNumber,
      contactType,
    }, role);

    await createAuditEvent({
      prisma,
      companyId: ctx.companyId,
      userId: ctx.actorUserId,
      entityType: "Contact",
      entityId: contact.id,
      action: "created",
      module: "contacts",
      detail: `Contact created: ${contact.firstName ?? contact.legalName ?? contact.id}`,
      newValue: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        legalName: contact.legalName,
        isCompany: contact.isCompany,
        email: contact.email,
        phone: contact.phone,
        documentType: contact.documentType,
        documentNumber: contact.documentNumber,
        contactType: contact.contactType,
      },
    });

    return created(contact);
  } catch (error) {
    return errorResponse(error);
  }
}
