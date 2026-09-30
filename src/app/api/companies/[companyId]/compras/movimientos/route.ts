import { getApiAuthContext } from "@/lib/api/auth-context";
import { requireCompanyCapability } from "@/lib/api/guards";
import { errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { listComprasMovimientos } from "@/lib/services/compras-movimientos.service";

type Context = { params: Promise<{ companyId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyCapability(ctx, "purchases:read");

    const url = new URL(request.url);
    const articleId = url.searchParams.get("articleId") || undefined;
    const supplierId = url.searchParams.get("supplierId") || undefined;
    const receiptId = url.searchParams.get("receiptId") || undefined;
    const ordenCompraId = url.searchParams.get("ordenCompraId") || undefined;
    const take = url.searchParams.get("take")
      ? parseInt(url.searchParams.get("take")!, 10)
      : undefined;
    const skip = url.searchParams.get("skip")
      ? parseInt(url.searchParams.get("skip")!, 10)
      : undefined;

    const result = await listComprasMovimientos({
      prisma,
      companyId: ctx.companyId,
      articleId,
      supplierId,
      receiptId,
      ordenCompraId,
      take,
      skip,
    });

    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
