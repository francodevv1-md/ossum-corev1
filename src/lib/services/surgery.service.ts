// OSSUM COR — Surgery service
// Every operational query MUST filter by companyId.
// Contact references are global and MUST be validated through ContactCompanyLink.
// Services receive prisma as dependency injection.

import { Prisma } from "@prisma/client";
import type { PrismaClient, Surgery } from "@prisma/client";

import { assertContactsBelongToCompany } from "./contact.service";
import { serializeSurgeryCoordinatorReadModel } from "./surgery-coordinator-read-model";
import { createAuditEvent } from "../audit";
import { badRequest, conflict } from "../api/errors";
import { requireCompanyId } from "../tenant";
import {
  validateCreateSurgeryInput,
  validateCxStatusTransition,
  validatePrepStatus,
  validateUpdateSurgeryCxStatusInput,
  validateUpdateSurgeryInput,
  type CreateSurgeryInput,
  type UpdateSurgeryInput,
} from "../validators/surgery.validator";

export type SurgeryActorContext = {
  actorUserId: string;
  companyId: string;
  source?: string;
  module?: "surgery";
};

const SURGERY_MUTATION_ROLES = [
  "admin",
  "manager",
  "coordinator",
  "owner",
  "super_admin",
] as const;

const SURGERY_VISIBLE_NUMBER_PREFIX = "CX-";
const SURGERY_VISIBLE_NUMBER_PADDING = 4;
const CREATE_SURGERY_MAX_RETRIES = 3;

type ListSurgeriesOptions = {
  status?: string;
  cxStatus?: string;
  prepStatus?: string;
  payerContactId?: string;
  priority?: string;
  branchId?: string;
  patientId?: string;
  doctorId?: string;
  institutionId?: string;
  take?: number;
  skip?: number;
};

export type SurgeryDeletionRecommendedAction = "delete" | "archive" | "blocked";

export type SurgeryDeletionPreviewDependencyKey =
  | "presupuestos"
  | "remitos"
  | "consumos"
  | "devoluciones"
  | "invoices"
  | "payments"
  | "digitalReceipts"
  | "seguimientoEntries"
  | "internalNotifications";

export type SurgeryDeletionPreview = {
  surgery: {
    id: string;
    visibleNumber: string | null;
    patientName: string | null;
    institutionName: string | null;
  };
  dependencies: Record<SurgeryDeletionPreviewDependencyKey, number>;
  policy: {
    recommendedAction: SurgeryDeletionRecommendedAction;
    canDelete: boolean;
    canArchive: boolean;
    blockedReasons: string[];
    requiresHighPrivilege: boolean;
    hasFiscalDocuments: boolean;
    hasOperationalDocuments: boolean;
    confirmationText: "confirmo eliminar";
  };
};

export type ArchiveSurgeryInput = {
  confirmationText?: string;
  reason?: string;
};

function surgeryReadSelect(companyId: string) {
  return {
    id: true,
    companyId: true,
    branchId: true,
    visibleNumber: true,
    patientId: true,
    doctorId: true,
    institutionId: true,
    payerContactId: true,
    classification: true,
    description: true,
    priority: true,
    cxStatus: true,
    prepStatus: true,
    probableDate: true,
    scheduledDate: true,
    surgeryDate: true,
    performedDate: true,
    cancelledDate: true,
    source: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    patient: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        legalName: true,
      },
    },
    doctor: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        legalName: true,
      },
    },
    institution: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        legalName: true,
      },
    },
    payer: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        legalName: true,
      },
    },
    contactAssignments: {
      where: {
        role: "coordinator",
        contact: {
          isActive: true,
          isCompany: false,
          companyLinks: {
            some: {
              companyId,
              isActive: true,
              role: "coordinator",
            },
          },
        },
      },
      select: {
        id: true,
        contactId: true,
        role: true,
        isPrimary: true,
        createdAt: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            legalName: true,
            email: true,
            isCompany: true,
            isActive: true,
            companyLinks: {
              where: {
                companyId,
                isActive: true,
                role: "coordinator",
              },
              select: {
                companyId: true,
                role: true,
                isActive: true,
              },
            },
          },
        },
      },
    },
  } satisfies Prisma.SurgerySelect;
}

type SurgeryAuditShape = Pick<
  Surgery,
  | "id"
  | "companyId"
  | "branchId"
  | "visibleNumber"
  | "patientId"
  | "doctorId"
  | "institutionId"
  | "payerContactId"
  | "classification"
  | "description"
  | "priority"
  | "cxStatus"
  | "prepStatus"
  | "probableDate"
  | "scheduledDate"
  | "surgeryDate"
  | "performedDate"
  | "cancelledDate"
  | "source"
  | "notes"
  | "archivedAt"
  | "archivedById"
  | "archiveReason"
  | "archivePolicySnapshot"
  | "createdAt"
  | "updatedAt"
>;

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

async function assertBranchBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  branchId: string
): Promise<void> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId },
    select: { id: true },
  });

  if (!branch) {
    throw new Error(`Branch ${branchId} not found in company ${companyId}`);
  }
}

function validateActorContext(context: SurgeryActorContext): SurgeryActorContext {
  if (
    typeof context.actorUserId !== "string" ||
    context.actorUserId.trim().length === 0
  ) {
    throw new Error("actorUserId is required for surgery mutations");
  }

  return {
    ...context,
    companyId: requireCompanyId(context.companyId),
    module: context.module ?? "surgery",
  };
}

async function assertActorCanMutateSurgery(
  prisma: PrismaClient,
  context: SurgeryActorContext
): Promise<SurgeryActorContext> {
  const scopedContext = validateActorContext(context);

  const access = await prisma.userCompanyAccess.findFirst({
    where: {
      userId: scopedContext.actorUserId,
      companyId: scopedContext.companyId,
      isActive: true,
      role: { in: [...SURGERY_MUTATION_ROLES] },
    },
    select: { id: true },
  });

  if (!access) {
    throw new Error(
      `User ${scopedContext.actorUserId} is not allowed to mutate surgeries in company ${scopedContext.companyId}`
    );
  }

  return scopedContext;
}

function serializeSurgeryForAudit(surgery: SurgeryAuditShape | null) {
  if (!surgery) {
    return null;
  }

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
    probableDate: serializeDate(surgery.probableDate),
    scheduledDate: serializeDate(surgery.scheduledDate),
    surgeryDate: serializeDate(surgery.surgeryDate),
    performedDate: serializeDate(surgery.performedDate),
    cancelledDate: serializeDate(surgery.cancelledDate),
    source: surgery.source,
    notes: surgery.notes,
    archivedAt: serializeDate(surgery.archivedAt),
    archivedById: surgery.archivedById,
    archiveReason: surgery.archiveReason,
    archivePolicySnapshot: surgery.archivePolicySnapshot,
    createdAt: surgery.createdAt.toISOString(),
    updatedAt: surgery.updatedAt.toISOString(),
  };
}

function auditMetadata(context: SurgeryActorContext) {
  return {
    source: context.source,
  };
}

function contactDisplayName(
  contact: { firstName: string | null; lastName: string | null; legalName: string | null } | null
): string | null {
  if (!contact) {
    return null;
  }

  const legalName = contact.legalName?.trim();
  if (legalName) {
    return legalName;
  }

  const fullName = [contact.firstName, contact.lastName]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return fullName || null;
}

function shouldGenerateVisibleNumber(data: CreateSurgeryInput): boolean {
  if (data.visibleNumber == null) {
    return true;
  }

  return data.source?.startsWith("cirugias-ui:") ?? false;
}

async function getNextSurgeryVisibleNumber(
  tx: Prisma.TransactionClient,
  companyId: string
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ maxNumber: bigint | number | null }>>`
    SELECT MAX(CAST(SUBSTRING("visibleNumber" FROM ${SURGERY_VISIBLE_NUMBER_PREFIX.length + 1}) AS INTEGER)) AS "maxNumber"
    FROM "Surgery"
    WHERE "companyId" = ${companyId}
      AND "visibleNumber" ~ '^CX-[0-9]+$'
  `;

  const rawMaxNumber = rows[0]?.maxNumber;
  const maxNumber = rawMaxNumber == null ? 0 : Number(rawMaxNumber);
  const nextNumber = maxNumber + 1;

  return `${SURGERY_VISIBLE_NUMBER_PREFIX}${String(nextNumber).padStart(SURGERY_VISIBLE_NUMBER_PADDING, "0")}`;
}

async function assertSurgeryReferencesBelongToCompany(
  prisma: PrismaClient,
  companyId: string,
  data: {
    patientId?: string;
    doctorId?: string | null;
    institutionId?: string | null;
    payerContactId?: string | null;
    branchId?: string | null;
  }
): Promise<void> {
  const contactIds = [
    data.patientId,
    data.doctorId,
    data.institutionId,
    data.payerContactId,
  ].filter((value): value is string => Boolean(value));

  await assertContactsBelongToCompany(prisma, companyId, contactIds);

  if (data.branchId) {
    await assertBranchBelongsToCompany(prisma, companyId, data.branchId);
  }
}

/** List surgeries for a company with optional scoped filters. */
export async function listSurgeriesByCompany(
  prisma: PrismaClient,
  companyId: string,
  options?: ListSurgeriesOptions
) {
  const scopedCompanyId = requireCompanyId(companyId);

  const surgeries = await prisma.surgery.findMany({
    select: surgeryReadSelect(scopedCompanyId),
    where: {
      companyId: scopedCompanyId,
      cxStatus: options?.cxStatus ?? options?.status,
      prepStatus: options?.prepStatus,
      payerContactId: options?.payerContactId,
      priority: options?.priority,
      branchId: options?.branchId,
      patientId: options?.patientId,
      doctorId: options?.doctorId,
      institutionId: options?.institutionId,
      archivedAt: null,
    },
    orderBy: [{ surgeryDate: "desc" }, { createdAt: "desc" }],
    take: options?.take ?? 50,
    skip: options?.skip,
  });

  return surgeries.map(serializeSurgeryCoordinatorReadModel);
}

/** Get a single surgery by ID, scoped to a company. */
export async function getSurgeryById(
  prisma: PrismaClient,
  companyId: string,
  surgeryId: string
) {
  const scopedCompanyId = requireCompanyId(companyId);

  const surgery = await prisma.surgery.findFirst({
    select: surgeryReadSelect(scopedCompanyId),
    where: {
      id: surgeryId,
      companyId: scopedCompanyId,
      archivedAt: null,
    },
  });

  return surgery ? serializeSurgeryCoordinatorReadModel(surgery) : null;
}

/** Build a read-only deletion/archival preview for a surgery, scoped to a company. */
export async function getSurgeryDeletionPreview(
  prisma: PrismaClient,
  context: Pick<SurgeryActorContext, "companyId">,
  surgeryId: string
): Promise<SurgeryDeletionPreview | null> {
  const scopedCompanyId = requireCompanyId(context.companyId);

  const surgery = await prisma.surgery.findFirst({
    where: {
      id: surgeryId,
      companyId: scopedCompanyId,
    },
    select: {
      id: true,
      visibleNumber: true,
      archivedAt: true,
      patient: {
        select: {
          firstName: true,
          lastName: true,
          legalName: true,
        },
      },
      institution: {
        select: {
          firstName: true,
          lastName: true,
          legalName: true,
        },
      },
    },
  });

  if (!surgery) {
    return null;
  }

  const [
    presupuestos,
    remitos,
    consumos,
    devoluciones,
    invoices,
    payments,
    digitalReceipts,
    seguimientoEntries,
    internalNotifications,
  ] = await Promise.all([
    prisma.presupuesto.count({ where: { companyId: scopedCompanyId, surgeryId } }),
    prisma.remito.count({ where: { companyId: scopedCompanyId, surgeryId } }),
    prisma.consumo.count({ where: { companyId: scopedCompanyId, surgeryId } }),
    prisma.devolucion.count({ where: { companyId: scopedCompanyId, surgeryId } }),
    prisma.invoice.count({ where: { companyId: scopedCompanyId, surgeryId } }),
    prisma.payment.count({ where: { companyId: scopedCompanyId, surgeryId } }),
    prisma.digitalReceipt.count({ where: { companyId: scopedCompanyId, surgeryId } }),
    prisma.seguimientoEntry.count({ where: { companyId: scopedCompanyId, surgeryId } }),
    prisma.internalNotification.count({ where: { companyId: scopedCompanyId, surgeryId } }),
  ]);

  const dependencies: SurgeryDeletionPreview["dependencies"] = {
    presupuestos,
    remitos,
    consumos,
    devoluciones,
    invoices,
    payments,
    digitalReceipts,
    seguimientoEntries,
    internalNotifications,
  };

  const hasFiscalDocuments = invoices > 0 || payments > 0;
  const hasOperationalDocuments =
    presupuestos > 0 ||
    remitos > 0 ||
    consumos > 0 ||
    devoluciones > 0 ||
    digitalReceipts > 0 ||
    seguimientoEntries > 0 ||
    internalNotifications > 0;

  const blockedReasons: string[] = [];

  if (surgery.archivedAt) {
    blockedReasons.push("La cirugía ya está archivada.");
  }

  if (invoices > 0) {
    blockedReasons.push("La cirugía tiene facturas vinculadas.");
  }

  if (payments > 0) {
    blockedReasons.push("La cirugía tiene cobros vinculados.");
  }

  const recommendedAction: SurgeryDeletionRecommendedAction = surgery.archivedAt || hasFiscalDocuments
    ? "blocked"
    : hasOperationalDocuments
      ? "archive"
      : "delete";

  return {
    surgery: {
      id: surgery.id,
      visibleNumber: surgery.visibleNumber,
      patientName: contactDisplayName(surgery.patient),
      institutionName: contactDisplayName(surgery.institution),
    },
    dependencies,
    policy: {
      recommendedAction,
      canDelete: recommendedAction === "delete",
      canArchive: !surgery.archivedAt && !hasFiscalDocuments,
      blockedReasons,
      requiresHighPrivilege: hasFiscalDocuments,
      hasFiscalDocuments,
      hasOperationalDocuments,
      confirmationText: "confirmo eliminar",
    },
  };
}

/** Soft-archive a surgery after recalculating deletion policy server-side. Never hard-deletes. */
export async function archiveSurgery(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  surgeryId: string,
  input: ArchiveSurgeryInput
) {
  const scopedContext = await assertActorCanMutateSurgery(prisma, context);
  const scopedCompanyId = requireCompanyId(scopedContext.companyId);
  const confirmationText = input.confirmationText?.trim() ?? "";
  const reason = input.reason?.trim() ?? "";

  if (confirmationText !== "confirmo eliminar") {
    throw badRequest("La confirmación exacta es obligatoria.", "invalid_archive_confirmation");
  }

  if (!reason) {
    throw badRequest("El motivo de archivo es obligatorio.", "archive_reason_required");
  }

  const currentSurgery = await prisma.surgery.findFirst({
    where: { id: surgeryId, companyId: scopedCompanyId },
  });

  if (!currentSurgery) {
    throw badRequest(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`, "surgery_not_found");
  }

  if (currentSurgery.archivedAt) {
    throw conflict("La cirugía ya está archivada.", "surgery_already_archived");
  }

  const preview = await getSurgeryDeletionPreview(
    prisma,
    { companyId: scopedCompanyId },
    surgeryId
  );

  if (!preview) {
    throw badRequest(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`, "surgery_not_found");
  }

  if (preview.dependencies.invoices > 0 || preview.dependencies.payments > 0) {
    throw conflict(
      "La cirugía tiene facturas o cobros vinculados y no puede archivarse desde esta acción.",
      "surgery_archive_blocked_by_fiscal_documents"
    );
  }

  if (!preview.policy.canArchive) {
    throw conflict("La política actual no permite archivar esta cirugía.", "surgery_archive_blocked");
  }

  return prisma.$transaction(async (tx) => {
    const archivedAt = new Date();
    const result = await tx.surgery.updateMany({
      where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
      data: {
        archivedAt,
        archivedById: scopedContext.actorUserId,
        archiveReason: reason,
        archivePolicySnapshot: preview as unknown as Prisma.InputJsonValue,
      },
    });

    if (result.count !== 1) {
      throw conflict("La cirugía ya fue archivada o no está disponible.", "surgery_archive_race_conflict");
    }

    const archivedSurgery = await tx.surgery.findFirst({
      where: { id: surgeryId, companyId: scopedCompanyId },
    });

    await createAuditEvent({
      prisma: tx as unknown as PrismaClient,
      companyId: scopedCompanyId,
      userId: scopedContext.actorUserId,
      entityType: "Surgery",
      entityId: surgeryId,
      action: "surgery.archived",
      module: scopedContext.module ?? "surgery",
      detail: reason,
      oldValue: serializeSurgeryForAudit(currentSurgery),
      newValue: serializeSurgeryForAudit(archivedSurgery),
      metadata: {
        ...auditMetadata(scopedContext),
        policySnapshot: preview,
      },
    });

    return archivedSurgery;
  });
}

/** Create a surgery after validating all tenant-scoped references. */
export async function createSurgery(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  data: CreateSurgeryInput
) {
  const scopedContext = await assertActorCanMutateSurgery(prisma, context);
  const scopedCompanyId = requireCompanyId(scopedContext.companyId);
  const validatedData = validateCreateSurgeryInput(data);

  await assertSurgeryReferencesBelongToCompany(prisma, scopedCompanyId, {
    patientId: validatedData.patientId,
    doctorId: validatedData.doctorId,
    institutionId: validatedData.institutionId,
    payerContactId: validatedData.payerContactId,
    branchId: validatedData.branchId,
  });

  for (let attempt = 0; attempt < CREATE_SURGERY_MAX_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const visibleNumber = shouldGenerateVisibleNumber(validatedData)
          ? await getNextSurgeryVisibleNumber(tx, scopedCompanyId)
          : validatedData.visibleNumber ?? null;

        const surgery = await tx.surgery.create({
          data: {
            companyId: scopedCompanyId,
            createdById: scopedContext.actorUserId,
            branchId: validatedData.branchId ?? null,
            visibleNumber,
            patientId: validatedData.patientId,
            doctorId: validatedData.doctorId ?? null,
            institutionId: validatedData.institutionId ?? null,
            payerContactId: validatedData.payerContactId ?? null,
            classification: validatedData.classification ?? null,
            description: validatedData.description ?? null,
            priority: validatedData.priority ?? null,
            cxStatus: validatedData.cxStatus,
            prepStatus: validatedData.prepStatus ?? null,
            probableDate: validatedData.probableDate ?? null,
            scheduledDate: validatedData.scheduledDate ?? null,
            surgeryDate: validatedData.surgeryDate ?? null,
            performedDate: validatedData.performedDate ?? null,
            cancelledDate: validatedData.cancelledDate ?? null,
            source: validatedData.source ?? null,
            notes: validatedData.notes,
          },
        });

        await createAuditEvent({
          prisma: tx as unknown as PrismaClient,
          companyId: scopedCompanyId,
          userId: scopedContext.actorUserId,
          entityType: "Surgery",
          entityId: surgery.id,
          action: "surgery.created",
          module: scopedContext.module ?? "surgery",
          oldValue: null,
          newValue: serializeSurgeryForAudit(surgery),
          metadata: auditMetadata(scopedContext),
        });

        return surgery;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < CREATE_SURGERY_MAX_RETRIES - 1
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to create surgery after retrying transactional visible number allocation");
}

/** Update a surgery after validating company ownership and changed references. */
export async function updateSurgery(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  surgeryId: string,
  data: UpdateSurgeryInput
) {
  const scopedContext = await assertActorCanMutateSurgery(prisma, context);
  const scopedCompanyId = requireCompanyId(scopedContext.companyId);
  const validatedData = validateUpdateSurgeryInput(data);

  const currentSurgery = await prisma.surgery.findFirst({
    where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
  });

  if (!currentSurgery) {
    throw new Error(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`);
  }

  if (validatedData.cxStatus !== undefined) {
    validateCxStatusTransition(currentSurgery.cxStatus, validatedData.cxStatus);
  }

  await assertSurgeryReferencesBelongToCompany(prisma, scopedCompanyId, {
    patientId: validatedData.patientId,
    doctorId: validatedData.doctorId,
    institutionId: validatedData.institutionId,
    payerContactId: validatedData.payerContactId,
    branchId: validatedData.branchId,
  });

  return prisma.$transaction(async (tx) => {
    const result = await tx.surgery.updateMany({
      where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
      data: {
        branchId: validatedData.branchId,
        visibleNumber: validatedData.visibleNumber,
        patientId: validatedData.patientId,
        doctorId: validatedData.doctorId,
        institutionId: validatedData.institutionId,
        payerContactId: validatedData.payerContactId,
        classification: validatedData.classification,
        description: validatedData.description,
        priority: validatedData.priority,
        cxStatus: validatedData.cxStatus,
        prepStatus: validatedData.prepStatus,
        probableDate: validatedData.probableDate,
        scheduledDate: validatedData.scheduledDate,
        surgeryDate: validatedData.surgeryDate,
        performedDate: validatedData.performedDate,
        cancelledDate: validatedData.cancelledDate,
        source: validatedData.source,
        notes: validatedData.notes,
      },
    });

    if (result.count !== 1) {
      throw new Error(
        `Failed to update surgery ${surgeryId} in company ${scopedCompanyId}`
      );
    }

    const updatedSurgery = await tx.surgery.findFirst({
      where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
    });

    await createAuditEvent({
      prisma: tx as unknown as PrismaClient,
      companyId: scopedCompanyId,
      userId: scopedContext.actorUserId,
      entityType: "Surgery",
      entityId: surgeryId,
      action: "surgery.updated",
      module: scopedContext.module ?? "surgery",
      oldValue: serializeSurgeryForAudit(currentSurgery),
      newValue: serializeSurgeryForAudit(updatedSurgery),
      metadata: auditMetadata(scopedContext),
    });

    return updatedSurgery;
  });
}

/** Update only the CX status of a surgery after verifying tenant ownership. */
export async function updateSurgeryCxStatus(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  surgeryId: string,
  cxStatus: string
) {
  const scopedContext = await assertActorCanMutateSurgery(prisma, context);
  const scopedCompanyId = requireCompanyId(scopedContext.companyId);
  const validatedData = validateUpdateSurgeryCxStatusInput({ cxStatus });

  const currentSurgery = await prisma.surgery.findFirst({
    where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
  });

  if (!currentSurgery) {
    throw new Error(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`);
  }

  validateCxStatusTransition(currentSurgery.cxStatus, validatedData.cxStatus);

  return prisma.$transaction(async (tx) => {
    const result = await tx.surgery.updateMany({
      where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
      data: { cxStatus: validatedData.cxStatus },
    });

    if (result.count !== 1) {
      throw new Error(
        `Failed to update surgery cxStatus for ${surgeryId} in company ${scopedCompanyId}`
      );
    }

    const updatedSurgery = await tx.surgery.findFirst({
      where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
    });

    await createAuditEvent({
      prisma: tx as unknown as PrismaClient,
      companyId: scopedCompanyId,
      userId: scopedContext.actorUserId,
      entityType: "Surgery",
      entityId: surgeryId,
      action: "surgery.cx_status_changed",
      module: scopedContext.module ?? "surgery",
      oldValue: { cxStatus: currentSurgery.cxStatus },
      newValue: { cxStatus: validatedData.cxStatus },
      metadata: auditMetadata(scopedContext),
    });

    return updatedSurgery;
  });
}

/** Update only the preparation substatus without changing the CX lifecycle. */
export async function updateSurgeryPrepStatus(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  surgeryId: string,
  prepStatus: string
) {
  const scopedContext = await assertActorCanMutateSurgery(prisma, context);
  const scopedCompanyId = requireCompanyId(scopedContext.companyId);
  const validatedPrepStatus = validatePrepStatus(prepStatus);

  return prisma.$transaction(async (tx) => {
    const currentSurgery = await tx.surgery.findFirst({
      where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
    });

    if (!currentSurgery) {
      throw badRequest(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`, "surgery_not_found");
    }

    if (currentSurgery.prepStatus === validatedPrepStatus) {
      throw badRequest(
        `Surgery prepStatus is already ${validatedPrepStatus}`,
        "prep_status_unchanged"
      );
    }

    const result = await tx.surgery.updateMany({
      where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
      data: { prepStatus: validatedPrepStatus },
    });

    if (result.count !== 1) {
      throw conflict(
        "La preparación de la cirugía cambió; actualizá la lista e intentá nuevamente.",
        "surgery_prep_status_race_conflict"
      );
    }

    const updatedSurgery = await tx.surgery.findFirst({
      where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
    });

    await createAuditEvent({
      prisma: tx as unknown as PrismaClient,
      companyId: scopedCompanyId,
      userId: scopedContext.actorUserId,
      entityType: "Surgery",
      entityId: surgeryId,
      action: "surgery.prep_status_changed",
      module: scopedContext.module ?? "surgery",
      oldValue: { prepStatus: currentSurgery.prepStatus },
      newValue: { prepStatus: validatedPrepStatus },
      metadata: auditMetadata(scopedContext),
    });

    return updatedSurgery;
  });
}

/**
 * Execute a scheduled surgery. This intentionally is not a generic status
 * mutation: the delivered Remito prerequisite and execution timestamp are
 * enforced atomically on the server.
 */
export async function executeScheduledSurgery(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  surgeryId: string
) {
  const scopedContext = await assertActorCanMutateSurgery(prisma, context);
  const scopedCompanyId = requireCompanyId(scopedContext.companyId);

  return prisma.$transaction(async (tx) => {
    const currentSurgery = await tx.surgery.findFirst({
      where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
    });

    if (!currentSurgery) {
      throw badRequest(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`, "surgery_not_found");
    }

    if (currentSurgery.cxStatus !== "scheduled") {
      throw conflict(
        "Solo se puede ejecutar una cirugía programada.",
        "surgery_not_scheduled"
      );
    }

    const deliveredRemitos = await tx.remito.count({
      where: {
        companyId: scopedCompanyId,
        surgeryId,
        state: "Entregado",
      },
    });

    if (deliveredRemitos === 0) {
      throw conflict(
        "No se puede ejecutar la cirugía porque no tiene un Remito entregado.",
        "surgery_execution_requires_delivered_remito"
      );
    }

    const performedAt = new Date();
    const result = await tx.surgery.updateMany({
      where: {
        id: surgeryId,
        companyId: scopedCompanyId,
        archivedAt: null,
        cxStatus: "scheduled",
      },
      data: { cxStatus: "performed", performedDate: performedAt },
    });

    if (result.count !== 1) {
      throw conflict(
        "La cirugía ya cambió de estado; actualizá la lista e intentá nuevamente.",
        "surgery_execution_race_conflict"
      );
    }

    const performedSurgery = await tx.surgery.findFirst({
      where: { id: surgeryId, companyId: scopedCompanyId, archivedAt: null },
    });

    await createAuditEvent({
      prisma: tx as unknown as PrismaClient,
      companyId: scopedCompanyId,
      userId: scopedContext.actorUserId,
      entityType: "Surgery",
      entityId: surgeryId,
      action: "surgery.executed",
      module: scopedContext.module ?? "surgery",
      oldValue: serializeSurgeryForAudit(currentSurgery),
      newValue: serializeSurgeryForAudit(performedSurgery),
      metadata: {
        ...auditMetadata(scopedContext),
        performedAt: performedAt.toISOString(),
        deliveredRemitos,
      },
    });

    return performedSurgery;
  });
}

/** Compatibility wrapper for existing PATCH status route. */
export async function updateSurgeryStatus(
  prisma: PrismaClient,
  context: SurgeryActorContext,
  surgeryId: string,
  status: string
) {
  return updateSurgeryCxStatus(prisma, context, surgeryId, status);
}

/** Assert that a surgery belongs to a company. */
export async function assertSurgeryBelongsToCompany(
  prisma: PrismaClient,
  companyId: string,
  surgeryId: string
): Promise<void> {
  const scopedCompanyId = requireCompanyId(companyId);

  const surgery = await prisma.surgery.findFirst({
    where: {
      id: surgeryId,
      companyId: scopedCompanyId,
      archivedAt: null,
    },
    select: { id: true },
  });

  if (!surgery) {
    throw new Error(`Surgery ${surgeryId} not found in company ${scopedCompanyId}`);
  }
}
