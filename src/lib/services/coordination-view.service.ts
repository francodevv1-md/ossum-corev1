import type { PrismaClient } from "@prisma/client";

import type { ApiAuthContext } from "../api/auth-context";
import { forbidden } from "../api/errors";
import { listSurgeriesByCompany } from "./surgery.service";
import {
  requireCoordinationPreviewCapability,
  requirePreviewTarget,
  type CoordinationPreviewCapability,
} from "./coordination-preview-capability.service";
import {
  resolvePersonalCoordinatorForCompany,
  type CoordinatorSubject,
  type PersonalCoordinatorResolution,
} from "./personal-coordinator-resolver.service";
import type { CoordinationViewRequest } from "../validators/coordination-view.validator";
import { canAccessGlobalCoordination } from "../permissions/coordination";

type CoordinationSurgeryRead = Awaited<ReturnType<typeof listSurgeriesByCompany>>[number];

type CoordinationContactRead = CoordinationSurgeryRead["patient"] | null;

function mapCoordinationContact(contact: CoordinationContactRead) {
  if (!contact) return null;
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    legalName: contact.legalName,
  };
}

function mapCoordinationSurgery(surgery: CoordinationSurgeryRead) {
  const coordinatorAssignment = surgery.coordinatorAssignment.status === "resolved"
    ? {
        status: "resolved" as const,
        resolved: {
          contactId: surgery.coordinatorAssignment.resolved.contactId,
          label: surgery.coordinatorAssignment.resolved.label,
        },
      }
    : {
        status: surgery.coordinatorAssignment.status,
        resolved: null,
      };

  return {
    id: surgery.id,
    companyId: surgery.companyId,
    branchId: surgery.branchId,
    visibleNumber: surgery.visibleNumber,
    patientId: surgery.patientId,
    doctorId: surgery.doctorId,
    institutionId: surgery.institutionId,
    payerContactId: surgery.payerContactId,
    classification: surgery.classification,
    description: surgery.description,
    priority: surgery.priority,
    cxStatus: surgery.cxStatus,
    prepStatus: surgery.prepStatus,
    probableDate: surgery.probableDate,
    scheduledDate: surgery.scheduledDate,
    surgeryDate: surgery.surgeryDate,
    materialAvailabilityDate: surgery.materialAvailabilityDate,
    materialShippingDate: surgery.materialShippingDate,
    materialTransport: surgery.materialTransport,
    performedDate: surgery.performedDate,
    cancelledDate: surgery.cancelledDate,
    source: surgery.source,
    notes: surgery.notes,
    createdAt: surgery.createdAt,
    updatedAt: surgery.updatedAt,
    patient: mapCoordinationContact(surgery.patient),
    doctor: mapCoordinationContact(surgery.doctor),
    institution: mapCoordinationContact(surgery.institution),
    payer: mapCoordinationContact(surgery.payer),
    coordinatorAssignments: surgery.coordinatorAssignments.map((assignment) => ({
      assignmentId: assignment.assignmentId,
      contactId: assignment.contactId,
      label: assignment.label,
      isPrimary: assignment.isPrimary,
      createdAt: assignment.createdAt,
    })),
    coordinatorAssignment,
  };
}

export type CoordinationSurgeryRow = ReturnType<typeof mapCoordinationSurgery>;

export type CoordinationViewResponse = {
  context: {
    mode: "production" | "dev-preview";
    surface: "personal" | "global";
    readOnly: boolean;
    actor: { userId: string; label: string };
    personalResolution: PersonalCoordinatorResolution | null;
    viewSubject: CoordinatorSubject | null;
  };
  previewCapability?: CoordinationPreviewCapability;
  surgeries: CoordinationSurgeryRow[];
  pagination?: { take: number; skip: number; hasMore: boolean };
};

async function readCoordinationPage(input: {
  prisma: PrismaClient;
  companyId: string;
  take: number;
  skip: number;
  coordinatorContactId?: string;
}) {
  const rows = await listSurgeriesByCompany(input.prisma, input.companyId, {
    coordinatorContactId: input.coordinatorContactId,
    take: input.take + 1,
    skip: input.skip,
  });
  return {
    rows: rows.slice(0, input.take),
    pagination: {
      take: input.take,
      skip: input.skip,
      hasMore: rows.length > input.take,
    },
  };
}

function actorLabel(ctx: ApiAuthContext): string {
  return [ctx.user.firstName, ctx.user.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ") || ctx.user.email;
}

function filterPersonalSurgeries(
  surgeries: CoordinationSurgeryRead[],
  companyId: string,
  contactId: string
): CoordinationSurgeryRead[] {
  return surgeries.filter(
    (surgery) => surgery.companyId === companyId &&
      surgery.coordinatorAssignment.status === "resolved" &&
      surgery.coordinatorAssignment.resolved.contactId === contactId
  );
}

function mapCoordinationSurgeries(
  surgeries: CoordinationSurgeryRead[],
  companyId: string
): CoordinationSurgeryRow[] {
  return surgeries
    .filter((surgery) => surgery.companyId === companyId)
    .map(mapCoordinationSurgery);
}

export async function getCoordinationView(input: {
  prisma: PrismaClient;
  routeCompanyId: string;
  ctx: ApiAuthContext;
  request: CoordinationViewRequest;
  env?: NodeJS.ProcessEnv;
}): Promise<CoordinationViewResponse> {
  const { prisma, routeCompanyId, ctx, request, env } = input;
  if (routeCompanyId !== ctx.companyId || ctx.activeCompany.id !== ctx.companyId) {
    throw forbidden("Acceso a empresa denegado", "company_access_denied");
  }
  const actor = { userId: ctx.actorUserId, label: actorLabel(ctx) };
  const take = request.take ?? 50;
  const skip = request.skip ?? 0;

  if (request.mode === "production") {
    if (request.surface === "global") {
      if (!canAccessGlobalCoordination(ctx.role)) {
        throw forbidden(
          "Acceso global a Coordinación denegado",
          "coordination_global_access_denied"
        );
      }
      const page = await readCoordinationPage({
        prisma,
        companyId: ctx.companyId,
        take,
        skip,
      });
      return {
        context: {
          mode: "production",
          surface: "global",
          readOnly: false,
          actor,
          personalResolution: null,
          viewSubject: null,
        },
        surgeries: mapCoordinationSurgeries(
          page.rows,
          ctx.companyId
        ),
        pagination: page.pagination,
      };
    }

    const personalResolution = await resolvePersonalCoordinatorForCompany(
      prisma,
      ctx.companyId,
      ctx.user
    );
    if (personalResolution.status !== "resolved") {
      return {
        context: {
          mode: "production",
          surface: "personal",
          readOnly: false,
          actor,
          personalResolution,
          viewSubject: null,
        },
        surgeries: [],
        pagination: { take, skip, hasMore: false },
      };
    }

    const page = await readCoordinationPage({
      prisma,
      companyId: ctx.companyId,
      take,
      skip,
      coordinatorContactId: personalResolution.subject.contactId,
    });
    return {
      context: {
        mode: "production",
        surface: "personal",
        readOnly: false,
        actor,
        personalResolution,
        viewSubject: personalResolution.subject,
      },
      surgeries: mapCoordinationSurgeries(
        filterPersonalSurgeries(
          page.rows,
          ctx.companyId,
          personalResolution.subject.contactId
        ),
        ctx.companyId
      ),
      pagination: page.pagination,
    };
  }

  const previewCapability = await requireCoordinationPreviewCapability({
    prisma,
    routeCompanyId,
    ctx,
    env,
  });

  if (request.surface === "global") {
    const page = await readCoordinationPage({
      prisma,
      companyId: ctx.companyId,
      take,
      skip,
    });
    return {
      context: {
        mode: "dev-preview",
        surface: "global",
        readOnly: true,
        actor,
        personalResolution: null,
        viewSubject: null,
      },
      previewCapability,
      surgeries: mapCoordinationSurgeries(page.rows, ctx.companyId),
      pagination: page.pagination,
    };
  }

  const viewSubject = requirePreviewTarget(previewCapability, request.subjectContactId);
  const page = await readCoordinationPage({
    prisma,
    companyId: ctx.companyId,
    take,
    skip,
    coordinatorContactId: viewSubject.contactId,
  });
  return {
    context: {
      mode: "dev-preview",
      surface: "personal",
      readOnly: true,
      actor,
      personalResolution: { status: "resolved", subject: viewSubject },
      viewSubject,
    },
    previewCapability,
    surgeries: mapCoordinationSurgeries(
      filterPersonalSurgeries(
        page.rows,
        ctx.companyId,
        viewSubject.contactId
      ),
      ctx.companyId
    ),
    pagination: page.pagination,
  };
}
