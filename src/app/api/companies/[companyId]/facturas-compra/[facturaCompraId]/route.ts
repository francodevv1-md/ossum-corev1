import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { FACTURA_COMPRA_MUTATION_ROLES, getFacturaCompra, updateFacturaCompra } from "@/lib/services/factura-compra.service";
import { facturaCompraUpdateSchema } from "@/lib/validators/factura-compra";
type Context = { params: Promise<{ companyId: string; facturaCompraId: string }> };
export async function GET(request: Request, { params }: Context) { try { const { companyId, facturaCompraId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyReadAccess(ctx); return ok(await getFacturaCompra({ companyId: ctx.companyId, facturaCompraId, prisma })); } catch (error) { return errorResponse(error); } }
export async function PATCH(request: Request, { params }: Context) { try { const { companyId, facturaCompraId } = await params; const ctx = await getApiAuthContext(request, companyId); requireCompanyMutationAccess(ctx, FACTURA_COMPRA_MUTATION_ROLES); const input = facturaCompraUpdateSchema.parse(await request.json()); return ok(await updateFacturaCompra({ companyId: ctx.companyId, facturaCompraId, prisma, updatedById: ctx.actorUserId, ...input })); } catch (error) { return errorResponse(error); } }
