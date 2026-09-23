import prisma from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireCompanyReadAccess } from "@/lib/api/guards";
import { getSupplierRemittance } from "@/lib/services/supplier-remittance.service";
type Context = { params: Promise<{ companyId: string; remittanceId: string }> };
export async function GET(request: Request, { params }: Context) { try { const { companyId, remittanceId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyReadAccess(ctx); return ok(await getSupplierRemittance(prisma, ctx.companyId, remittanceId)); } catch (error) { return errorResponse(error); } }
