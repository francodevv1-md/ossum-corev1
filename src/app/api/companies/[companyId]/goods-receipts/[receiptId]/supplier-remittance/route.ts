import prisma from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { errorResponse, ok } from "@/lib/api/responses";
import { requireCompanyMutationAccess } from "@/lib/api/guards";
import { linkGoodsReceiptToSupplierRemittance } from "@/lib/services/supplier-remittance.service";
import { manualSupplierRemittanceLinkSchema } from "@/lib/validators/supplier-remittance";
type Context = { params: Promise<{ companyId: string; receiptId: string }> };
const MUTATION_ROLES = ["admin", "operator"] as const;
export async function POST(request: Request, { params }: Context) { try { const { companyId, receiptId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyMutationAccess(ctx, MUTATION_ROLES); let body: unknown; try { body = await request.json(); } catch { throw badRequest("Invalid JSON body", "invalid_json_body"); } return ok(await linkGoodsReceiptToSupplierRemittance(prisma, ctx.companyId, receiptId, manualSupplierRemittanceLinkSchema.parse(body).supplierRemittanceId, ctx.actorUserId)); } catch (error) { return errorResponse(error); } }
