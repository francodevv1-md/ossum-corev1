import { getApiIdentity } from "@/lib/api/identity-context";
import { getActiveCompanyMemberships } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";

export async function GET(request: Request) {
  try {
    const identity = await getApiIdentity(request);
    const memberships = await getActiveCompanyMemberships(identity);
    const companies = memberships.map(({ company }) => ({ id: company.id, name: company.name }));
    return ok({ companies, singleCompanyId: companies.length === 1 ? companies[0].id : null });
  } catch (error) {
    return errorResponse(error);
  }
}
