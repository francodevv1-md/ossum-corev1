import { badRequest } from "../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import { listSurgeriesByCompany } from "../../../../../lib/services/surgery.service";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

function parseOptionalNumber(value: string | null, name: string) {
  if (value === null) return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw badRequest(`${name} must be a non-negative integer`);
  }

  return parsed;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const searchParams = new URL(request.url).searchParams;

    const surgeries = await listSurgeriesByCompany(prisma, companyId, {
      status: searchParams.get("status") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      patientId: searchParams.get("patientId") ?? undefined,
      doctorId: searchParams.get("doctorId") ?? undefined,
      institutionId: searchParams.get("institutionId") ?? undefined,
      take: parseOptionalNumber(searchParams.get("take"), "take"),
      skip: parseOptionalNumber(searchParams.get("skip"), "skip"),
    });

    return ok(surgeries);
  } catch (error) {
    return errorResponse(error);
  }
}
