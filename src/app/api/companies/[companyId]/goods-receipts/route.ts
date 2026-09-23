import prisma from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { created, errorResponse, ok } from "@/lib/api/responses";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "@/lib/api/guards";
import { createGoodsReceipt } from "@/lib/services/goods-receipt.service";
import { goodsReceiptCreateSchema } from "@/lib/validators/goods-receipt";

type Context = { params: Promise<{ companyId: string }> };
const MUTATION_ROLES = ["admin", "operator"] as const;

export async function GET(request: Request, { params }: Context) {
  try { const { companyId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyReadAccess(ctx); if (new URL(request.url).searchParams.get("catalog") === "1") return ok({ suppliers: await prisma.contactCompanyLink.findMany({ where: { companyId: ctx.companyId, isActive: true, OR: [{ roles: { has: "proveedor" } }, { role: "proveedor" }] }, include: { contact: true }, orderBy: { contact: { legalName: "asc" } } }), deposits: await prisma.stockDeposit.findMany({ where: { companyId: ctx.companyId, active: true }, orderBy: { name: "asc" } }), articles: await prisma.stockArticleEligibility.findMany({ where: { companyId: ctx.companyId, currentPolicyVersion: { is: { eligible: true, traceMode: { not: "IDENTIFIED_UNIT" } } } }, include: { article: { select: { id: true, sku: true, description: true } }, currentPolicyVersion: true }, orderBy: { article: { description: "asc" } } }) }); return ok(await prisma.goodsReceipt.findMany({ where: { companyId: ctx.companyId }, include: { lines: true }, orderBy: { createdAt: "desc" }, take: 100 })); } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: Context) {
  try { const { companyId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyMutationAccess(ctx, MUTATION_ROLES); let body: unknown; try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); } return created(await createGoodsReceipt(prisma, ctx.companyId, ctx.actorUserId, goodsReceiptCreateSchema.parse(body))); } catch (error) { return errorResponse(error); }
}
