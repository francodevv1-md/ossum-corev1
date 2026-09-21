import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { badRequest } from "../../../../../lib/api/errors";
import { getNonNegativeIntegerParam, getStringParam } from "../../../../../lib/api/query";
import { created, errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import { createSurgery, listSurgeriesByCompany } from "../../../../../lib/services/surgery.service";

type RouteContext = {
  params: Promise<{ companyId: string }>;
};

function perfNow(): number {
  return performance.now();
}

function logPerf(label: string, startedAt: number, outcome: string): void {
  console.info(label, {
    durationMs: Math.round((perfNow() - startedAt) * 10) / 10,
    outcome,
  });
}

const SURGERY_MUTATION_ROLES = [
  "admin",
  "manager",
  "coordinator",
  "owner",
  "super_admin",
] as const;

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw badRequest("Expected string field", "invalid_field");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalDate(value: unknown, fieldName: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw badRequest(`${fieldName} must be a valid ISO date string`, "invalid_date_field");
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(`${fieldName} must be a valid ISO date string`, "invalid_date_field");
  }

  return parsed;
}

async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw badRequest("Invalid JSON body", "invalid_json_body");
  }
}

function parseRequiredContactId(value: unknown, fieldName: string): string {
  const contactId = parseOptionalString(value);
  if (!contactId) {
    throw badRequest(`${fieldName} contact ID is required`, `missing_${fieldName.toLowerCase()}_contact_id`);
  }
  return contactId;
}

export async function GET(request: Request, { params }: RouteContext) {
  const totalStartedAt = perfNow();
  let totalOutcome = "error";

  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyReadAccess(ctx);

    const searchParams = new URL(request.url).searchParams;

    const listStartedAt = perfNow();
    let listOutcome = "error";
    const surgeries = await listSurgeriesByCompany(prisma, ctx.companyId, {
      status: getStringParam(searchParams, "status"),
      cxStatus: getStringParam(searchParams, "cxStatus"),
      prepStatus: getStringParam(searchParams, "prepStatus"),
      payerContactId: getStringParam(searchParams, "payerContactId"),
      priority: getStringParam(searchParams, "priority"),
      branchId: getStringParam(searchParams, "branchId"),
      patientId: getStringParam(searchParams, "patientId"),
      doctorId: getStringParam(searchParams, "doctorId"),
      institutionId: getStringParam(searchParams, "institutionId"),
      take: getNonNegativeIntegerParam(searchParams, "take"),
      skip: getNonNegativeIntegerParam(searchParams, "skip"),
    }).then((result) => {
      listOutcome = "success";
      return result;
    }).finally(() => {
      logPerf("[PERF][surgeries] listSurgeriesByCompany", listStartedAt, listOutcome);
    });

    totalOutcome = "success";
    return ok(surgeries);
  } catch (error) {
    totalOutcome = "error";
    return errorResponse(error);
  } finally {
    logPerf("[PERF][surgeries] total", totalStartedAt, totalOutcome);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId } = await params;
    const ctx = await getApiAuthContext(request, companyId);
    requireCompanyMutationAccess(ctx, SURGERY_MUTATION_ROLES);

    const body = await parseJsonBody(request);
    const patientId = parseRequiredContactId(body.patientId, "patient");
    const doctorId = parseRequiredContactId(body.doctorId, "doctor");
    const institutionId = parseRequiredContactId(body.institutionId, "institution");
    const payerContactId = parseRequiredContactId(body.payerContactId, "payer");

    const surgery = await createSurgery(
      prisma,
      {
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        source: typeof body.source === "string" ? body.source : undefined,
        module: "surgery",
      },
      {
        branchId: parseOptionalString(body.branchId),
        patientId,
        doctorId,
        institutionId,
        payerContactId,
        classification: parseOptionalString(body.classification),
        description: parseOptionalString(body.description),
        priority: parseOptionalString(body.priority),
        probableDate: parseOptionalDate(body.probableDate, "probableDate"),
        scheduledDate: parseOptionalDate(body.scheduledDate, "scheduledDate"),
        surgeryDate: parseOptionalDate(body.surgeryDate, "surgeryDate"),
        performedDate: parseOptionalDate(body.performedDate, "performedDate"),
        cancelledDate: parseOptionalDate(body.cancelledDate, "cancelledDate"),
        source: parseOptionalString(body.source),
        notes: parseOptionalString(body.notes),
      }
    );

    return created(surgery);
  } catch (error) {
    return errorResponse(error);
  }
}
