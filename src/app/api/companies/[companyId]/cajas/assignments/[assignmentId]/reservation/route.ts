import { getApiAuthContext } from "@/lib/api/auth-context";
import { badRequest } from "@/lib/api/errors";
import { requireArticleMutationAccess } from "@/lib/permissions/article";
import { created, errorResponse, ok } from "@/lib/api/responses";
import prisma from "@/lib/prisma";
import { releaseAssignedBoxReservation, reserveAssignedBox } from "@/lib/services/stock-reservation.service";

type Context = { params: Promise<{ companyId: string; assignmentId: string }> };
export async function POST(request: Request, { params }: Context) { try { const { companyId, assignmentId } = await params; const ctx = await getApiAuthContext(request, companyId); requireArticleMutationAccess(ctx); return created(await reserveAssignedBox(prisma, ctx.companyId, assignmentId, ctx.actorUserId)); } catch (error) { return errorResponse(error); } }
export async function DELETE(request: Request, { params }: Context) { try { const { companyId, assignmentId } = await params; const ctx = await getApiAuthContext(request, companyId); requireArticleMutationAccess(ctx); const body = await request.json().catch(() => { throw badRequest("Invalid JSON body", "invalid_json_body"); }); return ok(await releaseAssignedBoxReservation(prisma, ctx.companyId, assignmentId, String((body as { cause?: unknown }).cause || ""), ctx.actorUserId)); } catch (error) { return errorResponse(error); } }
