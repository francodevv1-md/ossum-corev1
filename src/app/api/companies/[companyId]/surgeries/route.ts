import { getApiAuthContext } from "../../../../../lib/api/auth-context";
import { requireCompanyMutationAccess, requireCompanyReadAccess } from "../../../../../lib/api/guards";
import { badRequest } from "../../../../../lib/api/errors";
import { getNonNegativeIntegerParam, getStringParam } from "../../../../../lib/api/query";
import { created, errorResponse, ok } from "../../../../../lib/api/responses";
import prisma from "../../../../../lib/prisma";
import type { FrontendContactSnapshot } from "../../../../../lib/services/contact.service";
import { resolveCompanyContactReference } from "../../../../../lib/services/contact.service";
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

function parseOptionalContactSnapshot(
  value: unknown,
  fieldName: string
): FrontendContactSnapshot | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value !== "object" || Array.isArray(value)) {
    throw badRequest(`${fieldName} must be an object`, "invalid_contact_snapshot");
  }

  const snapshot = value as Record<string, unknown>;
  const telefonosValue = snapshot.telefonos;

  return {
    id: typeof snapshot.id === "string" ? snapshot.id.trim() : "",
    nombre: typeof snapshot.nombre === "string" ? snapshot.nombre.trim() : "",
    tipoPersona:
      snapshot.tipoPersona === "juridica" || snapshot.tipoPersona === "fisica"
        ? snapshot.tipoPersona
        : "fisica",
    razonSocial: typeof snapshot.razonSocial === "string" ? snapshot.razonSocial.trim() : undefined,
    cuit: typeof snapshot.cuit === "string" ? snapshot.cuit.trim() : undefined,
    dni: typeof snapshot.dni === "string" ? snapshot.dni.trim() : undefined,
    email: typeof snapshot.email === "string" ? snapshot.email.trim() : undefined,
    telefonos: Array.isArray(telefonosValue)
      ? telefonosValue.filter((phone): phone is string => typeof phone === "string")
      : undefined,
    groups: Array.isArray(snapshot.groups)
      ? snapshot.groups.filter((group): group is string => typeof group === "string")
      : [],
  };
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
    const patientContact = parseOptionalContactSnapshot(body.patientContact, "patientContact");
    const doctorContact = parseOptionalContactSnapshot(body.doctorContact, "doctorContact");
    const institutionContact = parseOptionalContactSnapshot(body.institutionContact, "institutionContact");
    const payerContact = parseOptionalContactSnapshot(body.payerContact, "payerContact");

    const patientId = await resolveCompanyContactReference(prisma, {
      companyId: ctx.companyId,
      contactId: typeof body.patientId === "string" ? body.patientId.trim() : null,
      snapshot: patientContact,
      role: "patient",
      required: true,
      fieldLabel: "Patient",
    });
    const doctorId = await resolveCompanyContactReference(prisma, {
      companyId: ctx.companyId,
      contactId: parseOptionalString(body.doctorId),
      snapshot: doctorContact,
      role: "doctor",
      fieldLabel: "Doctor",
    });
    const institutionId = await resolveCompanyContactReference(prisma, {
      companyId: ctx.companyId,
      contactId: parseOptionalString(body.institutionId),
      snapshot: institutionContact,
      role: "institution",
      fieldLabel: "Institution",
    });
    const payerContactId = await resolveCompanyContactReference(prisma, {
      companyId: ctx.companyId,
      contactId: parseOptionalString(body.payerContactId),
      snapshot: payerContact,
      role: "payer",
      fieldLabel: "Payer",
    });

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
        patientId: patientId ?? "",
        doctorId,
        institutionId,
        payerContactId,
        coordinatorContactId: parseOptionalString(body.coordinatorContactId),
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
