import prisma from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "@/lib/api/guards";
import { createSupplierRemittance } from "@/lib/services/supplier-remittance.service";
import { supplierRemittanceCreateSchema } from "@/lib/validators/supplier-remittance";

type Context = { params: Promise<{ companyId: string }> };
const MUTATION_ROLES = ["admin", "operator"] as const;

export async function GET(request: Request, { params }: Context) {
  try { const { companyId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyReadAccess(ctx); return ok(await prisma.supplierRemittance.findMany({ where: { companyId: ctx.companyId }, include: { lines: true, supplier: { include: { contact: true } }, goodsReceipt: { select: { id: true, status: true } } }, orderBy: { documentDate: "desc" } })); } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: Context) {
  try { const { companyId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyMutationAccess(ctx, MUTATION_ROLES); let body: unknown; try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); } return created(await createSupplierRemittance(prisma, ctx.companyId, ctx.actorUserId, supplierRemittanceCreateSchema.parse(body))); } catch (error) { return errorResponse(error); }
}
