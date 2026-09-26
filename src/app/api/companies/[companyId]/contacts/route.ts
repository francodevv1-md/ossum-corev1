import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { badRequest } from "../../../../../lib/api/errors";
import { created, errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import { createContact, listContactsByCompany } from "../../../../../lib/services/contact.service";
import { createAuditEvent } from "../../../../../lib/audit";
import { contactCreateSchema, contactListQuerySchema } from "../../../../../lib/validators/contact";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

const CONTACT_MUTATION_ROLES = ["admin", "operator"] as const;

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const parsed = contactListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message, "invalid_contact_query");

    const contacts = await listContactsByCompany(prisma, ctx.companyId, {
      ...parsed.data,
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

    let body: unknown;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const parsed = contactCreateSchema.safeParse(body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message, "invalid_contact_payload");
    const input = parsed.data;
    const contact = await createContact(prisma, ctx.companyId, {
      ...input,
      isCompany: input.isCompany ?? (!input.firstName && !input.lastName && !!input.legalName),
    }, input.role ?? undefined, { userId: ctx.actorUserId, role: ctx.role });

    if (!input.mainAddress?.geo) await createAuditEvent({
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
        code: contact.code,
        roles: contact.roles,
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
