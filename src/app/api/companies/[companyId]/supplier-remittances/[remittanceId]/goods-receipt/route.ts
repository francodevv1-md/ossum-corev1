import prisma from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireCompanyMutationAccess } from "@/lib/api/guards";
import { openSupplierRemittanceGoodsReceipt } from "@/lib/services/supplier-remittance.service";
type Context = { params: Promise<{ companyId: string; remittanceId: string }> };
const MUTATION_ROLES = ["admin", "operator"] as const;
export async function POST(request: Request, { params }: Context) { try { const { companyId, remittanceId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyMutationAccess(ctx, MUTATION_ROLES); return ok(await openSupplierRemittanceGoodsReceipt(prisma, ctx.companyId, remittanceId, ctx.actorUserId)); } catch (error) { return errorResponse(error); } }
