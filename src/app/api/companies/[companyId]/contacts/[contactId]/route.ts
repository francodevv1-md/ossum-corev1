import { createAuditEvent } from "../../../../../../lib/audit";
import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { badRequest, notFound } from "../../../../../../lib/api/errors";
import { requireCompanyMutationAccess } from "../../../../../../lib/api/guards";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import { getContactCompanyLink, updateContact } from "../../../../../../lib/services/contact.service";
import { contactUpdateSchema } from "../../../../../../lib/validators/contact";

type RouteContext = {
  params: Promise<{ companyId: string; contactId: string }>;
};

const CONTACT_MUTATION_ROLES = ["admin", "operator"] as const;

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, contactId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, CONTACT_MUTATION_ROLES);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    const parsed = contactUpdateSchema.safeParse(body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message, "invalid_contact_payload");

    const existingLink = await getContactCompanyLink(prisma, ctx.companyId, contactId);
    if (!existingLink) {
      throw notFound(`Contact ${contactId} does not belong to company ${ctx.companyId}`, "contact_not_found");
    }

    const input = parsed.data;
    const result = await updateContact(prisma, ctx.companyId, contactId, input, { userId: ctx.actorUserId, role: ctx.role });
    const changedFields = Object.keys(input);
    const updatedFields = changedFields.filter((field) => field !== "isActive" && !(field === "mainAddress" && input.mainAddress?.geo));
    if (updatedFields.length > 0) {
      await createAuditEvent({
        prisma,
        companyId: ctx.companyId,
        userId: ctx.actorUserId,
        entityType: "Contact",
        entityId: contactId,
        action: "updated",
        module: "contacts",
        detail: `Contact updated: fields ${updatedFields.join(", ")}`,
        oldValue: { linkRole: existingLink.role, linkIsActive: existingLink.isActive },
        newValue: Object.fromEntries(Object.entries(input).filter(([field]) => field !== "isActive")),
      });
    }
    if (input.isActive !== undefined && input.isActive !== existingLink.isActive) {
      const action = input.isActive ? "reactivated" : "deactivated";
      await createAuditEvent({
        prisma,
        companyId: ctx.companyId,
        userId: ctx.actorUserId,
        entityType: "Contact",
        entityId: contactId,
        action,
        module: "contacts",
        detail: `Contact ${action}: field isActive`,
        oldValue: { linkIsActive: existingLink.isActive },
        newValue: { isActive: input.isActive },
      });
    }

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
