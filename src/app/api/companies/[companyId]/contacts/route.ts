import { badRequest } from "../../../../../lib/api/errors";
import { errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import { listContactsByCompany } from "../../../../../lib/services/contact.service";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

function parseOptionalBoolean(value: string | null, name: string) {
  if (value === null) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;

  throw badRequest(`${name} must be true or false`);
}

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

    const contacts = await listContactsByCompany(prisma, companyId, {
      role: searchParams.get("role") ?? undefined,
      contactType: searchParams.get("contactType") ?? undefined,
      isActive: parseOptionalBoolean(searchParams.get("isActive"), "isActive"),
      search: searchParams.get("search") ?? undefined,
      take: parseOptionalNumber(searchParams.get("take"), "take"),
      skip: parseOptionalNumber(searchParams.get("skip"), "skip"),
    });

    return ok(contacts);
  } catch (error) {
    return errorResponse(error);
  }
}
