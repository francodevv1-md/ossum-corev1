import { getApiAuthContext } from "../../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess } from "../../../../../../lib/api/guards";
import { badRequest, notFound } from "../../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../../lib/api/responses";
import prisma from "../../../../../../lib/prisma";
import {
  updateContact,
  deactivateContactForCompany,
  linkContactToCompany,
  getContactCompanyLink,
} from "../../../../../../lib/services/contact.service";
import { createAuditEvent } from "../../../../../../lib/audit";

type RouteContext = {
  params: Promise<{ companyId: string; contactId: string }>;
};

const CONTACT_MUTATION_ROLES = ["admin", "operator"] as const;

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { companyId, contactId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, CONTACT_MUTATION_ROLES);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw badRequest("Invalid JSON body", "invalid_json_body");
    }

    // Verify the contact belongs to this company
    const existingLink = await getContactCompanyLink(prisma, ctx.companyId, contactId);
    if (!existingLink) {
      throw notFound(
        `Contact ${contactId} does not belong to company ${ctx.companyId}`,
        "contact_not_found"
      );
    }

    // Build update data from request body (only allow known fields)
    const updateData: Record<string, unknown> = {};
    const updatableFields = [
      "firstName",
      "lastName",
      "legalName",
      "isCompany",
      "email",
      "phone",
      "documentType",
      "documentNumber",
      "contactType",
    ] as const;

    for (const field of updatableFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const hasUpdateFields = Object.keys(updateData).length > 0;
    const hasIsActive = "isActive" in body;

    let result: unknown = null;
    const auditActions: string[] = [];

    // Handle isActive toggle
    if (hasIsActive) {
      const isActive = Boolean(body.isActive);

      if (isActive) {
        // Re-activate the link
        result = await linkContactToCompany(prisma, ctx.companyId, contactId);
        auditActions.push("reactivated");
      } else {
        // Deactivate the link
        result = await deactivateContactForCompany(prisma, ctx.companyId, contactId);
        auditActions.push("deactivated");
      }
    }

    // Handle regular field updates
    if (hasUpdateFields) {
      const updatedContact = await updateContact(prisma, ctx.companyId, contactId, updateData as {
        firstName?: string;
        lastName?: string;
        legalName?: string | null;
        isCompany?: boolean;
        email?: string | null;
        phone?: string | null;
        documentType?: string | null;
        documentNumber?: string | null;
        contactType?: string | null;
      });

      // If there was also an isActive change, return the contact (not the link)
      if (!hasIsActive || result === null) {
        result = updatedContact;
      }
      auditActions.push("updated");
    }

    // If nothing was changed
    if (!hasIsActive && !hasUpdateFields) {
      throw badRequest("No valid fields provided for update", "no_fields");
    }

    // Audit all actions that were performed
    for (const action of auditActions) {
      const detail =
        action === "updated"
          ? `Contact updated: fields ${Object.keys(updateData).join(", ")}`
          : action === "deactivated"
            ? `Contact deactivated in company ${ctx.companyId}`
            : `Contact reactivated in company ${ctx.companyId}`;

      await createAuditEvent({
        prisma,
        companyId: ctx.companyId,
        userId: ctx.actorUserId,
        entityType: "Contact",
        entityId: contactId,
        action,
        module: "contacts",
        detail,
        oldValue: action === "updated" ? { linkRole: existingLink.role, linkIsActive: existingLink.isActive } : undefined,
        newValue: action === "updated" ? updateData : { isActive: action === "reactivated" },
      });
    }

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
