import prisma from "@/lib/prisma";
import { getApiIdentity } from "@/lib/api/identity-context";
import { getActiveCompanyMemberships, requireSelectedCompanyMembership } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import { resolveRemitoScan } from "@/lib/services/remito-scan.service";
import { normalizeRemitoScanLocator } from "@/lib/validators/remito-scan";
import { getRemitoActivationGate } from "@/lib/remito-verification/activation";

export async function POST(request: Request) {
  try {
    const identity = await getApiIdentity(request);
    const body: unknown = await request.json();
    const selectedCompanyId = body && typeof body === "object" && "selectedCompanyId" in body
      && typeof body.selectedCompanyId === "string" ? body.selectedCompanyId : undefined;
    const memberships = await getActiveCompanyMemberships(identity);
    const membership = requireSelectedCompanyMembership(memberships, selectedCompanyId);
    if (!(await getRemitoActivationGate()).flags.remitoInternalScanRead) {
      throw new Error("Remito internal scan is not activated");
    }
    const locator = normalizeRemitoScanLocator(body);
    const projection = await resolveRemitoScan({
      companyId: membership.companyId,
      role: membership.role,
      locator,
      prisma,
    });
    return ok(projection);
  } catch (error) {
    return errorResponse(error);
  }
}
